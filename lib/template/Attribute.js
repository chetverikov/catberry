const templateHelper = require('../helpers/templateHelper');

class Attribute {
  constructor() {
    /**
     * Attribute name
     *
     * @type {string}
     */
    this.name = '';

    /**
     * Attribute options
     *
     * @type {{beforeName: string, afterName: string, beforeValue: string, quote: string|null}}
     */
    this.options = {
      beforeName: ' ',
      afterName: '',
      beforeValue: '',
      quote: '',
    };

    /**
     * @type {{isExternal: boolean, value: *}[]}
     */
    this.valueParts = [];

    this.breaks = 0;
  }

  addBreak() {
    this.breaks++;
    this.valueParts.push({isExternal: true});
  }

  getCountOfBreaks() {
    return this.breaks;
  }

  setName(name) {
    this.name = name;
  }

  setOption(name, value) {
    this.options[name] = value;
  }

  addParsedValue(value) {
    if (value) {
      this.valueParts.push({isExternal: false, value});
    }
  }

  getName() {
    return this.name;
  }

  getValue(externalValues = []) {
    let externalValueIndex = 0;

    return this.valueParts
      .map(({value, isExternal}) => isExternal ?
        templateHelper.prepareAttributeValue(externalValues[externalValueIndex++]) :
        value
      )
      .join('');
  }

  isSkipped(values) {
    const part = this.valueParts[0];
    const value = values[0];
    const isEmptyValue = !part || value === null || value === false || value === undefined;

    return this.valueParts.length === 1 && part.isExternal === true && isEmptyValue;
  }

  compile(values = []) {
    const value = this.getValue(values);

    const {beforeName = ' ', beforeValue = '', quote = '', afterName = ''} = this.options;
    const name = this.name;

    return `${beforeName}${name}${afterName}${beforeValue}${value}${quote}`;
  }
}

module.exports = Attribute;
