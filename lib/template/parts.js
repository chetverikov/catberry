// const entities = require('entities');
const templateHelper = require('../helpers/templateHelper');
const Attribute = require('./Attribute');

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
    this.breaks = 0;

    this.strings = [''];
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

  addBreak() {
    this.breaks++;
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

  closeTag(isSelfClosed = false) {
    if (isSelfClosed) {
      this.setTagOption('isSelfClosed', true);
    }

    if (this.lastAttribute && !this.lastAttribute.name) {
      this.lastAttribute = null;
      this.attributes.pop();
    }
  }

  addParsedAttributeValue(value) {
    if (this.lastAttribute) {
      this.lastAttribute.addParsedValue(value);
    }
  }

  addBreakToAttribute() {
    if (this.lastAttribute) {
      this.lastAttribute.addBreak();
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

  compile(values) {
    const strings = this.strings;
    let valueIndex = 0;

    if (!this.breaks) {
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
          const countOfBreaks = attribute.getCountOfBreaks();
          let isSkipped = false;
          let attributeExternalValues = null;

          if (countOfBreaks) {
            attributeExternalValues = values.slice(valueIndex, valueIndex + countOfBreaks);

            if (attributeExternalValues) {
              isSkipped = attribute.isSkipped(attributeExternalValues);
            }

            valueIndex += countOfBreaks;
          }

          if (!countOfBreaks || !isSkipped) {
            attributes.push(attribute.compile(attributeExternalValues));
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

  compile(values) {
    const strings = this.strings;

    if (!this.breaks) {
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
