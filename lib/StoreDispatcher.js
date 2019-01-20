'use strict';

const SerialWrapper = require('./SerialWrapper');
const moduleHelper = require('./helpers/moduleHelper');
const propertyHelper = require('./helpers/propertyHelper');

const DEFAULT_LIFETIME = 60000;

class StoreDispatcher {
  /**
   * Creates a new instance of the store dispatcher.
   * @param {ServiceLocator} locator Locator for resolving dependencies.
   */
  constructor(locator) {
    /**
     * Current service locator.
     * @type {ServiceLocator}
     * @private
     */
    this._serviceLocator = locator;

    /**
     * Current store loader.
     * @type {StoreLoader}
     * @private
     */
    this._storeLoader = locator.resolve('storeLoader');

    /**
     * Current event bus.
     * @type {EventEmitter}
     * @private
     */
    this._eventBus = locator.resolve('eventBus');

    /**
     * Current map of all store instances by id.
     * @type {null}
     * @private
     */
    this._storeInstancesById = Object.create(null);

    /**
     * Current map of last data for each store.
     * @type {Object}
     * @private
     */
    this._lastData = Object.create(null);

    /**
     * Current map of last state of store dispatcher.
     * @type {Object}
     * @private
     */
    this._lastState = null;

    /**
     * Current set of store dependency graph.
     * @type {Object}
     * @private
     */
    this._dependants = Object.create(null);

    /**
     * Current serial wrapper.
     * @type {SerialWrapper}
     * @private
     */
    this._serialWrapper = new SerialWrapper();

    /**
     * Current basic context for all store contexts.
     * @type {Object}
     * @private
     */
    this._currentBasicContext = null;
  }

  /**
   * Gets store data and creates a store instance if required.
   * @param {string} storeName Name of store.
   * @param {object} storeParams Params of store.
   * @return {Object} Store's data.
   */
  getStoreData(storeName, storeParams = {}) {
    if (!this._lastState) {
      return this._errorState();
    }

    if (typeof (storeName) !== 'string') {
      return Promise.resolve(null);
    }

    const storeInstanceId = moduleHelper.getStoreInstanceId(storeName, storeParams);
    if (storeInstanceId in this._lastData) {
      const lastData = this._lastData[storeInstanceId];
      const existTime = Date.now() - lastData.createdAt;

      if (existTime <= lastData.lifetime) {
        return Promise.resolve(lastData.data);
      }

      delete this._lastData[storeInstanceId];
    }

    this._eventBus.emit('storeDataLoad', {
      name: storeName,
      params: storeParams,
    });

    const store = this.getStore(storeName, storeParams);
    if (!store) {
      return this._errorStoreNotFound(storeName);
    }

    const lifetime = typeof (store.$lifetime) === 'number' ? store.$lifetime : DEFAULT_LIFETIME;

    return this._serialWrapper.invoke(storeInstanceId)
      .then((data) => {
        this._lastData[storeInstanceId] = {
          data,
          lifetime,
          createdAt: Date.now(),
        };

        this._eventBus.emit('storeDataLoaded', {
          name: storeName,
          storeParams,
          data,
          lifetime,
        });

        return data;
      });
  }

  /**
   * Sends an action to every store's instance that has a "handle" method for such action.
   *
   * @param {string} storeName Name of the store.
   * @param {string} actionName Name of the action.
   * @param {Object} args Action arguments.
   * @return {Promise<Array<*>>} Promise for the action handling result.
   */
  sendBroadcastAction(storeName, actionName, args) {
    if (!this._lastState) {
      return this._errorState();
    }

    const actionDetails = {
      storeName,
      actionName,
      args,
    };

    const store = this.getStore(storeName); // TODO: отправлять ли во все инстансы?!
    if (!store) {
      return this._errorStoreNotFound(storeName);
    }

    const handleMethod = moduleHelper.getMethodToInvoke(store, 'handle', actionName);
    return moduleHelper.getSafePromise(() => handleMethod(args))
      .then((result) => {
        this._eventBus.emit('actionSent', actionDetails);
        return result;
      });
  }

  /**
   * Sends an action to the specified store and resolves promises in the serial mode.
   *
   * @param {string} instanceId Instance id of store.
   * @param {string} actionName Name of the action.
   * @param {Object} args Action arguments.
   * @return {Promise<*>} Promise for an action handling result.
   */
  sendAction(instanceId, actionName, args) {
    if (!this._lastState) {
      return this._errorState();
    }

    const actionDetails = {
      instanceId,
      actionName,
      args,
    };
    this._eventBus.emit('actionSend', actionDetails);

    const storeData = this._getStoreInstanceDataById(instanceId);
    if (!storeData) {
      return this._errorStoreNotFound(instanceId);
    }

    const handleMethod = moduleHelper.getMethodToInvoke(storeData.instance, 'handle', actionName);

    return moduleHelper.getSafePromise(() => handleMethod(args))
      .then((result) => {
        this._eventBus.emit('actionSent', actionDetails);

        return result;
      });
  }

  /**
   * Sets a new state to the store dispatcher and invokes the "changed" method for all stores which state has been changed.
   *
   * @param {Object} parameters Map of new parameters.
   * @param {Object} basicContext Basic context for all stores.
   *
   * @return {Array<string>} Names of stores that have been changed.
   */
  setState(parameters, basicContext) {
    parameters = parameters || Object.create(null);

    const stores = this._storeLoader.getStoresByNames();
    const parameterNames = Object.keys(parameters);
    parameterNames.forEach((storeName) => {
      if (!(storeName in stores)) {
        this._eventBus.emit('warn', `Store "${storeName}" does not exist (might be a typo in a route)`);
      }
    });

    if (!this._lastState) {
      this._currentBasicContext = basicContext;
      this._lastState = parameters;
      return [];
    }

    // some store's parameters can be removed since last time
    const changed = Object.create(null);

    Object.keys(this._lastState)
      .filter((storeName) => !(storeName in parameters))
      .forEach((name) => {
        changed[name] = true;
      });

    parameterNames
      .forEach((storeName) => {
        // new parameters were set for store
        if (!(storeName in this._lastState)) {
          changed[storeName] = true;
          return;
        }

        // new and last parameters has different values
        const lastParameterNames = Object.keys(this._lastState[storeName]);
        const currentParameterNames = Object.keys(parameters[storeName]);

        if (currentParameterNames.length !== lastParameterNames.length) {
          changed[storeName] = true;
          return;
        }

        currentParameterNames.every((parameterName) => {
          if (parameters[storeName][parameterName] !==
            this._lastState[storeName][parameterName]) {
            changed[storeName] = true;
            return false;
          }
          return true;
        });
      });

    this._lastState = parameters;
    if (this._currentBasicContext !== basicContext) {
      this._currentBasicContext = basicContext;
      Object
        .values(this._storeInstancesById)
        .forEach((storeData) => {
          storeData.instance.$context = this._getStoreContext(storeData.storeName, storeData.params);
        });
    }

    const changedStoreNames = Object.create(null);
    // TODO: тут надо решить, как же правильно обновлять store и его зависимости
    Object
      .keys(changed)
      .forEach((storeName) => {
        const store = this.getStore(storeName);
        if (store && store.instance) {
          store.instance.$context.changed()
            .forEach((name) => {
              changedStoreNames[name] = true;
            });
        }
      });

    this._eventBus.emit('stateChanged', {
      oldState: this._lastState,
      newState: parameters,
    });

    return Object.keys(changedStoreNames);
  }

  /**
   * Gets a context for a store using component's context as a prototype.
   * @param {string} storeName Name of the store.
   * @param {object} [params] Object of params from a attributes component (cat-params-*)
   * @return {Object} Store context.
   * @private
   */
  _getStoreContext(storeName, params = {}) {
    const storeInstanceId = moduleHelper.getStoreInstanceId(storeName, params);
    const storeContext = Object.create(this._currentBasicContext);

    propertyHelper.defineReadOnly(storeContext, 'name', storeName);
    propertyHelper.defineReadOnly(storeContext, 'params', params);
    propertyHelper.defineReadOnly(
      storeContext, 'state', this._lastState[storeName] || Object.create(null)
    );

    storeContext.changed = () => {
      const walked = Object.create(null);
      let toChange = [storeName];

      while (toChange.length > 0) {
        const current = toChange.shift();
        if (current in walked) {
          continue;
        }
        walked[current] = true;
        if (current in this._dependants) {
          toChange = toChange.concat(Object.keys(this._dependants[current]));
        }

        delete this._lastData[storeInstanceId];
        this._eventBus.emit('storeChanged', current);
      }

      return Object.keys(walked);
    };

    storeContext.getStoreData = (sourceStoreName) => sourceStoreName === storeName ?
      Promise.resolve(null) :
      this.getStoreData(sourceStoreName);

    storeContext.setDependency = (name) => {
      if (!(name in this._dependants)) {
        this._dependants[name] = Object.create(null);
      }
      this._dependants[name][storeName] = true; // todo: тут надо использовать instanceId имя
    };
    storeContext.unsetDependency = (name) => {
      if (!(name in this._dependants)) {
        return;
      }
      delete this._dependants[name][storeName]; // todo: тут надо использовать instanceId имя
    };
    storeContext.sendAction = (storeName, name, args) => this.sendBroadcastAction(storeName, name, args); // todo: sendAction ныне может отправлять данные только в

    return storeContext;
  }

  /**
   * Gets a store instance and creates it if required.
   * @param {string} storeName Name of the store.
   * @param {object} [params] Object of params from a attributes component (cat-params-*)
   * @return {Object} Store instance
   */
  getStore(storeName, params = {}) {
    if (!storeName) {
      return null;
    }

    const storeInstanceId = moduleHelper.getStoreInstanceId(storeName, params);
    const store = this._getStoreInstanceDataById(storeInstanceId);
    if (store) {
      return store;
    }

    const stores = this._storeLoader.getStoresByNames();

    if (!(storeName in stores)) {
      return null;
    }

    const StoreConstructor = stores[storeName].constructor;
    StoreConstructor.prototype.$context = this._getStoreContext(storeName, params);

    const storeInstance = new StoreConstructor(this._serviceLocator);
    storeInstance.$context = StoreConstructor.prototype.$context;

    this._setStoreInstanceDataById(storeInstanceId, storeName, params, storeInstance);

    this._serialWrapper.add(storeInstanceId, () =>
      moduleHelper.getSafePromise(
        moduleHelper.getMethodToInvoke(storeInstance, 'load')
      )
    );

    return storeInstance;
  }

  _getStoreInstanceDataById(instanceId) {
    return this._storeInstancesById[instanceId];
  }

  _getStoreInstancesDataByName(storeName) {
    return Object.values(this._storeInstancesById)
      .filter((data) => data.storeName === storeName);
  }

  _setStoreInstanceDataById(instanceId, storeName, params, instance) {
    this._storeInstancesById[instanceId] = {instance, params, storeName};
  }

  /**
   * Returns an error message about a not found store.
   * @param  {string} name The store name.
   * @return {Promise<Error>} The promise for the error.
   */
  _errorStoreNotFound(name) {
    return Promise.reject(new Error(`Store "${name}" not found`));
  }

  /**
   * Returns an error message about an uninitialized state.
   * @return {Promise<Error>} The promise for the error.
   */
  _errorState() {
    return Promise.reject(new Error('State should be set before any request'));
  }
}

module.exports = StoreDispatcher;
