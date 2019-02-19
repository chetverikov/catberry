// const entities = require('entities');
const templateHelper = require('../helpers/templateHelper');

const PART_STATES = {
  ILLIGAL: -1,
  NO: 0,
  CONTENT: 1,
  TAG: 2,
  END: 3,
};

class Part {
  constructor() {
    this.index = 0;
    this.state = 0;

    this.strings = [''];
    this.values = [];
  }

  isContent() {
    return this.state === PART_STATES.CONTENT;
  }

  isTag() {
    return this.state === PART_STATES.TAG;
  }

  addString(string) {
    if (string) {
      const stringIndex = this.strings.length - 1;
      this.strings[stringIndex] = this.strings[stringIndex] + string;
      this.index += string.length - 1;
    }
  }

  addValue(value) {
    this.values.push(value);
    this.strings.push('');
  }

  static get STATES() {
    return PART_STATES;
  }

  static createTagPart() {
    return new TagPart();
  }

  static createContentPart() {
    return new ContentPart();
  }
}

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
    this.values = [];

    /**
     * Count of external values
     * @type {Number}
     */
    this.countOfExternalValues = 0;
  }

  getCountOfExternalValues() {
    return this.countOfExternalValues;
  }

  setName(name) {
    this.name = name;
  }

  setOption(name, value) {
    this.options[name] = value;
  }

  addParsedValue(value) {
    if (value) {
      this.values.push({isExternal: false, value});
    }
  }

  addExternalValue(value) {
    this.values.push({isExternal: true, value});
    this.countOfExternalValues++;
  }

  getName() {
    return this.name;
  }

  getValue() {
    return this.values
      .map(({value, isExternal}) => isExternal ? templateHelper.prepareAttributeValue(value) : value)
      .join('');
  }

  isSkipped() {
    const data = this.values[0];
    const isEmptyValue = !data || data.value === null || data.value === false || data.value === undefined;

    return this.values.length === 1 && data.isExternal === true && isEmptyValue;
  }

  compile() {
    const value = this.getValue();

    const {beforeName = ' ', beforeValue = '', quote = '', afterName = ''} = this.options;
    const name = this.name;

    return `${beforeName}${name}${afterName}${beforeValue}${value}${quote}`;
  }
}

class TagPart extends Part {
  constructor() {
    super();

    this.state = PART_STATES.TAG;

    /**
     * List of attributes
     *
     * @type {Attribute[]}
     */
    this.attributes = [];

    /**
     * Last instance of Attribute
     *
     * @type {null|Attribute}
     */
    this.lastAttribute = null;

    this.tagOptions = Object.create(null);
  }

  isSelfClosedTag() {
    return this.tagOptions.isSelfClosed || false;
  }

  setTagOption(name, value) {
    this.tagOptions[name] = value;
  }

  getTagName() {
    return this.tagOptions.name.toLowerCase();
  }

  getAttributes() {
    const attributes = Object.create(null);
    let i = this.attributes.length;

    while (i--) {
      const attribute = this.attributes[i];
      attributes[attribute.getName().toLowerCase()] = attribute.getValue();
    }

    return attributes;
  }

  initAttribute() {
    this.lastAttribute = new Attribute();
    this.attributes.push(this.lastAttribute);
  }

  addParsedAttributeValue(value) {
    if (this.lastAttribute) {
      this.lastAttribute.addParsedValue(value);
    }
  }

  addExternalAttributeValue(value) {
    if (this.lastAttribute) {
      this.lastAttribute.addExternalValue(value);
    }
  }

  setAttributeName(name) {
    if (this.lastAttribute) {
      this.lastAttribute.setName(name);
    }
  }

  setAttributeOption(name, value) {
    if (this.lastAttribute) {
      this.lastAttribute.setOption(name, value);
    }
  }

  compile() {
    const values = this.values;
    const strings = this.strings;
    let valueIndex = 0;

    if (!values.length) {
      return strings.join('');
    }

    const isSelfClosed = this.tagOptions.isSelfClosed;
    const attributes = [];
    const tagName = this.tagOptions.useExternalValue ?
      templateHelper.prepareNodeValue(values[valueIndex++]) :
      this.tagOptions.name;

    if (this.attributes.length) {
      let attributeIndex = -1;

      while (attributeIndex++ < this.attributes.length) {
        const attribute = this.attributes[attributeIndex];

        if (attribute) {
          const countOfExternalValues = attribute.getCountOfExternalValues();

          if (countOfExternalValues) {
            valueIndex += countOfExternalValues;
          }

          if (!attribute.isSkipped()) {
            attributes.push(attribute.compile());
          }
        }
      }
    }

    return `<${tagName}${attributes.join('')}${isSelfClosed ? '/' : ''}>`;
  }
}

class ContentPart extends Part {
  constructor() {
    super();

    this.state = PART_STATES.CONTENT;
  }

  compile() {
    const values = this.values;
    const strings = this.strings;

    if (!values.length) {
      return strings.join('');
    }

    return strings
      .map((string, index) => `${string}${templateHelper.prepareNodeValue(values[index])}`)
      .join('');
  }
}

module.exports = {
  Part,
  TagPart,
  ContentPart,
};
