'use strict';

const helper = {
  ELEMENT_NODE_TYPE: 1,
  COMPONENT_TAG_PREFIX: 'CAT-',
  COMPONENT_ID: '$catberryId',
  COMPONENT_PREFIX_REGEXP: /^cat-/i,
  COMPONENT_ERROR_TEMPLATE_POSTFIX: '--error',
  DOCUMENT_COMPONENT_NAME: 'document',
  DOCUMENT_TAG_NAME: 'HTML',
  HEAD_TAG_NAME: 'HEAD',
  HEAD_COMPONENT_NAME: 'head',
  ATTRIBUTE_STORE: 'cat-store',
  ATTRIBUTE_STORE_PREFIX_REGEXP: /^cat-param-/i,
  DEFAULT_LOGIC_FILENAME: 'index.js',

  /**
   * Determines if the specified component name is a "document" component's name.
   * @param {string} componentName The name of the component.
   * @return {boolean} True if the specified component's name
   * is a "document" component's name.
   */
  isDocumentComponent: (componentName) =>
    componentName.toLowerCase() === helper.DOCUMENT_COMPONENT_NAME,

  /**
   * Determines if the specified component name is a "head" component name.
   * @param {string} componentName The name of the component.
   * @return {boolean} True if the specified component's name
   * is a "head" component's name.
   */
  isHeadComponent: (componentName) =>
    componentName.toLowerCase() === helper.HEAD_COMPONENT_NAME,

  /**
   * Determines if the DOM node is a component element.
   * @param {Node} node The DOM node.
   * @return {Boolean} True if the DOM node is a component element
   */
  isComponentNode: (node) =>
    node.nodeType === helper.ELEMENT_NODE_TYPE &&
    (
      helper.COMPONENT_PREFIX_REGEXP.test(node.nodeName) ||
      node.nodeName === helper.HEAD_TAG_NAME ||
      node.nodeName === helper.DOCUMENT_TAG_NAME
    ),

  /**
   * Gets a original component's name without a prefix.
   * @param {string} fullComponentName The full component's name (tag name).
   * @return {string} The original component's name without a prefix.
   */
  getOriginalComponentName: (fullComponentName) => {
    if (typeof (fullComponentName) !== 'string') {
      return '';
    }

    if (fullComponentName === helper.DOCUMENT_TAG_NAME) {
      return helper.DOCUMENT_COMPONENT_NAME;
    }

    if (fullComponentName === helper.HEAD_TAG_NAME) {
      return helper.HEAD_COMPONENT_NAME;
    }

    return fullComponentName
      .toLowerCase()
      .replace(helper.COMPONENT_PREFIX_REGEXP, '');
  },

  /**
   * Gets a valid tag name for a component.
   * @param {string} componentName The name of the component.
   * @return {string} The name of the tag.
   */
  getTagNameForComponentName: (componentName) => {
    if (typeof (componentName) !== 'string') {
      return '';
    }
    const upperComponentName = componentName.toUpperCase();
    if (componentName === helper.HEAD_COMPONENT_NAME) {
      return upperComponentName;
    }
    if (componentName === helper.DOCUMENT_COMPONENT_NAME) {
      return helper.DOCUMENT_TAG_NAME;
    }
    return helper.COMPONENT_TAG_PREFIX + upperComponentName;
  },

  /**
   * Gets a prefixed method of the module that can be invoked.
   *
   * @param {Object} module The module implementation.
   * @param {string} prefix The method prefix (i.e. handle).
   * @param {string?} name The name of the entity to invoke method for (will be converted to a camel case).
   *
   * @return {Function} The method to invoke.
   */
  getMethodToInvoke: (module, prefix, name) => {
    if (!module || typeof (module) !== 'object') {
      return defaultPromiseMethod;
    }
    const methodName = helper.getCamelCaseName(prefix, name);
    if (typeof (module[methodName]) === 'function') {
      return module[methodName].bind(module);
    }
    if (typeof (module[prefix]) === 'function') {
      return module[prefix].bind(module, name);
    }

    return defaultPromiseMethod;
  },

  /**
   * Gets a name in the camel case for anything.
   * @param {string} prefix The prefix for the name.
   * @param {string} name The name to convert.
   * @return {string} Name in the camel case.
   */
  getCamelCaseName: (prefix, name) => {
    if (!name) {
      return '';
    }
    if (prefix) {
      name = `${prefix}-${name}`;
    }
    return name
      .replace(/(?:[^a-z0-9]+)(\w)/gi, (space, letter) => letter.toUpperCase())
      .replace(/(^[^a-z0-9])|([^a-z0-9]$)/gi, '');
  },

  /**
   * Gets a safe promise resolved by the action.
   * @param {Function} action The action to wrap with a safe promise.
   * @return {Promise} The promise for the done action.
   */
  getSafePromise: (action) => {
    try {
      return Promise.resolve(action());
    } catch (e) {
      return Promise.reject(e);
    }
  },

  getStoreParamsFromAttributes(attributes = {}) {
    const storeParams = Object.create(null);

    Object.keys(attributes)
      .forEach((key) => {
        if (helper.ATTRIBUTE_STORE_PREFIX_REGEXP.test(key)) {
          storeParams[key.replace(helper.ATTRIBUTE_STORE_PREFIX_REGEXP, '')] = attributes[key];
        }
      });

    return storeParams;
  },

  getStoreInstanceId(storeName, params = {}) {
    const stringOfParams = Object.values(params)
      .map(String)
      .join('');

    return `${storeName}${stringOfParams}`;
  },
};

/**
 * Just returns a resolved promise.
 * @return {Promise} The promise for nothing.
 */
function defaultPromiseMethod() {
  return Promise.resolve();
}

module.exports = helper;
