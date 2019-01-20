'use strict';

class SerialWrapper {
  /**
   * Creates a new instance of the serial wrapper for promises.
   */
  constructor() {
    /**
     * Current set of named methods to invoke.
     * @type {Object}
     * @private
     */
    this._toInvoke = Object.create(null);

    /**
     * Current set of flags if the method is in progress.
     * @type {Object}
     * @private
     */
    this._inProgress = Object.create(null);
  }

  /**
   * Adds a method to the set.
   * @param {string} name Method name.
   * @param {Function} toInvoke Function that returns promise.
   */
  add(name, toInvoke) {
    this._toInvoke[name] = toInvoke;
  }

  /**
   * Remove a method from the set.
   * @param {string} name Method name
   */
  remove(name) {
    delete this._toInvoke[name];
    delete this._inProgress[name];
  }

  /**
   * Returns true if the method with such name was registered to the set.
   * @param {string} name Name of method.
   * @return {boolean} True if method name is registered.
   */
  isRegistered(name) {
    return typeof (this._toInvoke[name]) === 'function';
  }

  /**
   * Invokes a method without concurrency.
   * @param {string} name Method name.
   * @return {Promise<Object>} Promise for result.
   */
  invoke(name) {
    if (!this.isRegistered(name)) {
      return Promise.reject(new Error('There is no such registered method'));
    }

    if (this._inProgress[name] instanceof Promise) {
      return this._inProgress[name];
    }

    this._inProgress[name] = this._toInvoke[name]()
      .then((result) => {
        this._inProgress[name] = null;

        return result;
      })
      .catch((reason) => {
        this._inProgress[name] = null;

        throw reason;
      });

    return this._inProgress[name];
  }
}

module.exports = SerialWrapper;
