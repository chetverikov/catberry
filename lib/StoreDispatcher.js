'use strict';

const SerialWrapper = require('./SerialWrapper');
const moduleHelper = require('./helpers/moduleHelper');
const propertyHelper = require('./helpers/propertyHelper');
const uuid = require('uuid');

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
		 * Current map of all store instances.
		 * @type {null}
		 * @private
		 */
		this._storeInstances = Object.create(null);

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
	 * @param {Object?} storeParams Params for store
	 *
	 * @returns {Object} Store's data.
	 */
	getStoreData(storeName, options = {}) {
		if (!this._lastState) {
			return this._errorState();
		}

		if (typeof (storeName) !== 'string') {
			return Promise.resolve(null);
		}

		let {instanceId, storeParams} = options;
		const isDynamicStore = moduleHelper.isDynamicStore(storeName);

		if (isDynamicStore && typeof (instanceId) !== 'string') {
			return Promise.reject(new TypeError(
				`Store "${storeName}" is dynamic. Option "storeInstanceId" is required for it`
			));
		}

		const cacheStoreName = moduleHelper.getStoreCacheKey(storeName, instanceId);
		if (cacheStoreName in this._lastData) {
			const existTime = Date.now() - this._lastData[cacheStoreName].createdAt;

			if (existTime <= this._lastData[cacheStoreName].lifetime) {
				return Promise.resolve(this._lastData[cacheStoreName].data);
			}

			delete this._lastData[cacheStoreName];
		}

		this._eventBus.emit('storeDataLoad', {
			name: storeName
		});

		const store = this.getStore(storeName, {storeParams});
		if (!store) {
			return this._errorStoreNotFound(storeName);
		}

		const lifetime = typeof (store.$lifetime) === 'number' ? store.$lifetime : DEFAULT_LIFETIME;

		instanceId = store.$context.instanceId;

		return this._serialWrapper.invoke(moduleHelper.getStoreCacheKey(storeName, instanceId))
			.then(data => {
				if (!storeParams) {
					this._lastData[cacheStoreName] = {
						data,
						lifetime,
						createdAt: Date.now()
					};
				}

				this._eventBus.emit('storeDataLoaded', {
					name: storeName,
					instanceId,
					data,
					lifetime
				});
				return data;
			});
	}

	/**
	 * Sends an action to the specified store and resolves promises in the serial mode.
	 * @param {string} storeName Name of the store.
	 * @param {string} actionName Name of the action.
	 * @param {Object} args Action arguments.
	 * @returns {Promise<*>} Promise for an action handling result.
	 */
	sendAction(storeName, actionName, args) {
		if (!this._lastState) {
			return this._errorState();
		}
		const actionDetails = {
			storeName,
			actionName,
			args
		};
		this._eventBus.emit('actionSend', actionDetails);

		const store = this.getStore(storeName);
		if (!store) {
			return this._errorStoreNotFound(storeName);
		}

		const handleMethod = moduleHelper.getMethodToInvoke(
			store, 'handle', actionName
		);
		return moduleHelper.getSafePromise(() => handleMethod(args))
			.then(result => {
				this._eventBus.emit('actionSent', actionDetails);
				return result;
			});
	}

	/**
	 * Sets a new state to the store dispatcher and invokes the "changed" method for all
	 * stores which state has been changed.
	 * @param {Object} parameters Map of new parameters.
	 * @param {Object} basicContext Basic context for all stores.
	 * @returns {Array<string>} Names of stores that have been changed.
	 */
	setState(parameters, basicContext) {
		parameters = parameters || Object.create(null);

		const stores = this._storeLoader.getStoresByNames();
		const parameterNames = Object.keys(parameters);
		parameterNames.forEach(storeName => {
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
			.filter(storeName => !(storeName in parameters))
			.forEach(name => {
				changed[name] = true;
			});

		parameterNames
			.forEach(storeName => {
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

				currentParameterNames.every(parameterName => {
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
			Object.keys(this._storeInstances)
				.forEach(storeName => {
					this._storeInstances[storeName].$context = this._getStoreContext(storeName);
				});
		}

		const changedStoreNames = Object.create(null);
		Object.keys(changed)
			.forEach(storeName => {
				const store = this.getStore(storeName);
				if (!store) {
					return;
				}
				store.$context.changed()
					.forEach(name => {
						changedStoreNames[name] = true;
					});
			});

		this._eventBus.emit('stateChanged', {
			oldState: this._lastState,
			newState: parameters
		});
		return Object.keys(changedStoreNames);
	}

	/**
	 * Gets a context for a store using component's context as a prototype.
	 * @param {string} storeName Name of the store.
	 * @param {Object?} properties Additional properties
	 * @returns {Object} Store context.
	 * @private
	 */
	_getStoreContext(storeName, properties) {
		const storeContext = Object.create(this._currentBasicContext);

		propertyHelper.defineReadOnly(storeContext, 'name', storeName);
		propertyHelper.defineReadOnly(
			storeContext, 'state', this._lastState[storeName] || Object.create(null)
		);

		if (typeof properties === 'object' && properties !== null) {
			Object.keys(properties).forEach(propName =>
				propertyHelper.defineReadOnly(storeContext, propName, properties[propName])
			);
		}

		storeContext.changed = () => {
			const walked = Object.create(null);
			var toChange = [storeName];

			while (toChange.length > 0) {
				const current = toChange.shift();
				if (current in walked) {
					continue;
				}
				walked[current] = true;
				if (current in this._dependants) {
					toChange = toChange.concat(Object.keys(this._dependants[current]));
				}
				delete this._lastData[current];
				this._eventBus.emit('storeChanged', current);
			}
			return Object.keys(walked);
		};

		storeContext.getStoreData = sourceStoreName => sourceStoreName === storeName ?
			Promise.resolve(null) :
			this.getStoreData(sourceStoreName);

		storeContext.setDependency = name => {
			if (!(name in this._dependants)) {
				this._dependants[name] = Object.create(null);
			}
			this._dependants[name][storeName] = true;
		};
		storeContext.unsetDependency = name => {
			if (!(name in this._dependants)) {
				return;
			}
			delete this._dependants[name][storeName];
		};
		storeContext.sendAction = (storeName, name, args) => this.sendAction(storeName, name, args);

		return storeContext;
	}

	/**
	 * Gets a store instance and creates it if required.
	 * @param {string} storeName Name of the store.
	 * @param {options} options Options
	 * @param {string?} storeInstanceId Store instance's id
	 * @param {Object?} storeParams Params for the store
	 * @returns {Promise<Object>} Promise for the store.
	 */
	getStore(storeName, options) {
		if (!storeName) {
			return null;
		}
		let {storeInstanceId, storeParams} = options || {};
		const isDynamicStore = moduleHelper.isDynamicStore(storeName);

		if (!storeInstanceId) {
			storeInstanceId = uuid.v4();
		}

		const instances = this._storeInstances[storeName];
		let store = instances && instances[storeInstanceId];

		if (!store && !isDynamicStore) {
			console.log(instances && Object.values(instances)[0]);
			store = instances && Object.values(instances)[0];
		}

		if (store) {
			return store;
		}

		const stores = this._storeLoader.getStoresByNames();
		if (!(storeName in stores)) {
			return null;
		}

		const StoreConstructor = stores[storeName].constructor;

		StoreConstructor.prototype.$context = this._getStoreContext(storeName, {
			instanceId: storeInstanceId,
			params: storeParams || {}
		});

		if (!this._storeInstances[storeName]) {
			this._storeInstances[storeName] = Object.create(null);
		}

		const instance = new StoreConstructor(this._serviceLocator);

		instance.$context = StoreConstructor.prototype.$context;

		this._storeInstances[storeName][storeInstanceId] = instance;

		this._serialWrapper.add(moduleHelper.getStoreCacheKey(storeName, storeInstanceId), () => {
			const loadMethod = moduleHelper.getMethodToInvoke(instance, 'load');

			return moduleHelper.getSafePromise(loadMethod);
		});

		return instance;
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
