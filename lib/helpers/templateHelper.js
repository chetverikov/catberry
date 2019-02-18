'use strict';

const escapeHelper = require('./escapeHelper');

const templateHelpers = {

  prepareNodeValue(value) {
    switch (true) {
    case value === undefined:
    case value === null:
      return '';

    case typeof value === 'boolean':
    case typeof value === 'number':
    case typeof value === 'string':
      return escapeHelper(value);

    case Array.isArray(value):
      return value.map(templateHelpers.prepareNodeValue).join('');

    case templateHelpers.isIterator(value):
      let string = '';

      for (const item of value) {
        string += this.prepareNodeValue(item);
      }

      return string;

    case templateHelpers.isTemplate(value):
      return value.compile();
    default:
      throw new TypeError('Unknown type');
    }
  },

  prepareAttributeValue(value) {
    switch (true) {
    case value === undefined:
    case value === null:
    case value === false:
      return null;

    case typeof value === 'boolean':
    case typeof value === 'number':
    case typeof value === 'string':
      return escapeHelper(value);

    case Array.isArray(value):
      return value.map(templateHelpers.prepareNodeValue).join(',');

    case templateHelpers.isIterator(value):
      const strings = [];

      for (const item of value) {
        strings.push(this.prepareNodeValue(item));
      }

      return strings.join(',');

    case templateHelpers.isTemplate(value):
      return value.compile();
    default:
      throw new TypeError('Unknown type');
    }
  },

  /**
   * is iterator
   *
   * @param { IterableIterator } iterator All iterators without strings
   * @return { boolean }
   */
  isIterator(iterator) {
    return (
      iterator != null &&
      typeof iterator !== 'string' &&
      typeof iterator[Symbol.iterator] === 'function'
    );
  },

  isTemplate(value) {
    return value && value.constructor.name === 'Template';
  },
};

module.exports = templateHelpers;
