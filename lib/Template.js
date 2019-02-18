'use strict';

// const entities = require('entities');
const escapeHelper = require('./helpers/escapeHelper');
const templateHelper = require('./helpers/templateHelper');
const HTMLTokenizer = require('./tokenizers/HTMLTokenizer');
const templateCache = new Map();
const TOKENIZER_STATES = HTMLTokenizer.STATES;
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

    this.lastAttributeObj = null;

    /**
     * Tag options
     * @type {{name: String, isSelfClosed: Boolean, useExternalValue: Boolean}}
     */
    this.tagOptions = Object.create(null);

    /**
     * Attributes options
     *
     * {
     *   attributeName: {
     *     name: 'attributeName',
     *     value: 'true',
     *     quote: null,
     *     positionStart: 2,
     *     positionEnd: 3
     *   }
     * }
     *
     * @type {Object}
     */
    this.attributesOptions = Object.create(null);
    this.attributesNames = []; // order of names
  }

  addString(string) {
    if (string) {
      const stringIndex = this.strings.length - 1;
      this.strings[stringIndex] = this.strings[stringIndex] + string;
      this.index += string.length - 1;
    }
  }

  isContent() {
    return this.state === PART_STATES.CONTENT;
  }

  isTag() {
    return this.state === PART_STATES.TAG;
  }

  isSelfClosedTag() {
    return this.tagOptions.isSelfClosed || false;
  }

  setState(state) {
    this.state = state;

    this.attributesOptions = Object.create(null);
    this.tagOptions = Object.create(null);
  }

  setTagOption(name, value) {
    this.tagOptions[name] = value;
  }

  getTagName() {
    return this.tagOptions.name.toLowerCase();
  }

  getAttributes() {
    const attributes = Object.create(null);
    const options = Object.values(this.attributesOptions);
    let i = options.length;

    while (i--) {
      attributes[options[i].name.toLowerCase()] = options[i].value;
    }

    return attributes;
  }

  initAttribute() {
    this.lastAttributeObj = Object.create(null);

    this.lastAttributeObj.stringIndex = this.strings.length - 1;
    this.lastAttributeObj.startPosition = this.strings[this.lastAttributeObj.stringIndex].length - 1;
  }

  setAttributeOption(name, value) {
    if (this.lastAttributeObj) {
      this.lastAttributeObj[name] = value;
    }

    if (name === 'name') {
      this.attributesOptions[value] = this.lastAttributeObj;
      this.attributesNames.push(value);
    }
  }

  _prepareValue(value) {
    if (value === undefined || value === null || value === false) {
      return null;
    }

    if (value.constructor.name === 'Template') {
      return value.compile();
    }

    return escapeHelper(value);
  }

  addValue(value) {
    this.values.push(value);
    this.strings.push('');
  }

  compile() {
    const values = this.values;
    const strings = this.strings;
    let valueIndex = 0;

    if (!values.length) {
      return strings.join('');
    }

    if (this.isTag()) {
      const isSelfClosed = this.tagOptions.isSelfClosed;
      const attributes = [];
      const tagName = this.tagOptions.useExternalValue ?
        templateHelper.prepareNodeValue(values[valueIndex++]) :
        this.tagOptions.name;

      if (this.attributesNames.length) {
        let nameIndex = -1;

        while (nameIndex++ < this.attributesNames.length) {
          const attributeOptions = this.attributesOptions[this.attributesNames[nameIndex]];

          if (attributeOptions) {
            const {useExternalValue} = attributeOptions;
            const value = useExternalValue ?
              templateHelper.prepareAttributeValue(values[valueIndex++]) :
              attributeOptions.value;

            if (useExternalValue && value === null) {
              continue;
            }

            const {name, before = ' ', beforeValue = '', quote = '', afterName = ''} = attributeOptions;

            attributes.push(`${before}${name}${afterName}${beforeValue}${value}${quote}`);
          }
        }
      }

      return `<${tagName}${attributes.join('')}${isSelfClosed ? '/' : ''}>`;
    }

    return strings
      .map((string, index) => `${string}${templateHelper.prepareNodeValue(values[index])}`)
      .join('');
  }
}

class Template {
  /**
   * Constructor
   *
   * @param {String[]} strings Strings from a literal tag
   * @param {*[]} values Values from a literal tag
   */
  constructor(strings, values) {
    this.isCompiled = false;
    this.isParsed = false;

    this.strings = strings;
    this.values = values;

    this.parts = [];

    this.parse();
  }

  setValues(values) {
    this.values = values;
  }

  getParts() {
    return this.parts;
  }

  /**
   * Parse HTML from specified parts and values
   *
   * @return {Part[]} List of parts for compile
   */
  parse() {
    const values = this.values;
    const htmlTokenizer = new HTMLTokenizer();
    const steps = [];
    const stringsLength = this.strings.length;

    let stringsIndex = 0;
    let string = this.strings[stringsIndex];
    let state = 0;
    let start = 0;
    let end = 0;
    let part = null;

    htmlTokenizer.setHTMLString(string);

    while (stringsLength > stringsIndex++) {
      while (state !== HTMLTokenizer.STATES.END) {
        ({state, start, end} = htmlTokenizer.next());
        const value = htmlTokenizer.getValue(start, end);

        if (state !== TOKENIZER_STATES.CONTENT &&
            state !== TOKENIZER_STATES.TAG_OPEN &&
            state !== TOKENIZER_STATES.END) {
          part.addString(value);
        }

        switch (state) {
        case TOKENIZER_STATES.CONTENT:
          if (!part || !part.isContent()) {
            part = new Part();

            this.parts.push(part);

            part.setState(PART_STATES.CONTENT);
          }
          part.addString(value);
          break;
        case TOKENIZER_STATES.TAG_OPEN:
          part = new Part();

          this.parts.push(part);

          part.setState(PART_STATES.TAG);
          part.addString(value);
          break;
        case TOKENIZER_STATES.TAG_NAME:
          part.setTagOption('name', value);
          break;
        case TOKENIZER_STATES.SELF_CLOSING_START_TAG_STATE:
          part.setTagOption('isSelfClosed', true);
          break;
        case TOKENIZER_STATES.TAG_CLOSE:
          part = new Part();
          this.parts.push(part);
          part.setState(PART_STATES.CONTENT);
          break;
        case TOKENIZER_STATES.BEFORE_ATTRIBUTE_NAME:
          part.initAttribute();
          part.setAttributeOption('before', value);
          break;
        case TOKENIZER_STATES.AFTER_ATTRIBUTE_NAME:
          part.setAttributeOption('afterName', value);
          break;
        case TOKENIZER_STATES.BEFORE_ATTRIBUTE_VALUE:
          part.setAttributeOption('beforeValue', value);
          break;
        case TOKENIZER_STATES.ATTRIBUTE_NAME:
          part.setAttributeOption('name', value);
          break;

          // TODO: need add to somewhere
          //  const HTML_ENTITY_REFERENCE_REGEXP = /\&#?\w+;/ig;
          //  currentString = tagString
          //    .substring(current.start, current.end)
          //    .replace(HTML_ENTITY_REFERENCE_REGEXP, entities.decode);

        case TOKENIZER_STATES.ATTRIBUTE_VALUE_DOUBLE_QUOTED:
          part.setAttributeOption('quote', '"');
          part.setAttributeOption('value', value);
          break;
        case TOKENIZER_STATES.ATTRIBUTE_VALUE_SINGLE_QUOTED:
          part.setAttributeOption('quote', '\'');
          part.setAttributeOption('value', value);
          break;
        case TOKENIZER_STATES.ATTRIBUTE_VALUE_UNQUOTED:
          part.setAttributeOption('value', value);
          break;
        }

        steps.push({state, start, end});
      }

      string = this.strings[stringsIndex];

      if (string) {
        const valueIndex = stringsIndex - 1;

        part.addValue(values[valueIndex]);

        htmlTokenizer.setHTMLString(`${string}`);

        start = 0;
        end = 0;

        if (Array.isArray(steps) && steps.length > 1) {
          const step = steps[steps.length - 2];

          steps.length = steps.length - 2; // skip end/illegal state and last state

          htmlTokenizer.setState(step.state);
          htmlTokenizer._currentIndex = -1;

          if (step.state === TOKENIZER_STATES.ATTRIBUTE_VALUE_DOUBLE_QUOTED ||
              step.state === TOKENIZER_STATES.ATTRIBUTE_VALUE_SINGLE_QUOTED ||
              step.state === TOKENIZER_STATES.ATTRIBUTE_VALUE_UNQUOTED) {
            part.setAttributeOption('useExternalValue', true);
          }

          if (step.state === TOKENIZER_STATES.TAG_NAME) {
            part.setTagOption('useExternalValue', true);
          }

          state = step.state;
        }
      }
    }

    this.isParsed = true;

    return this.parts;
  }

  /**
   * Compile HTML from specified parts and values
   *
   * @return {String} Return compiled HTML
   */
  compile() {
    if (!this.isParsed) {
      this.parse();
    }

    const chunks = [];
    let i = 0;
    const partsCount = this.parts.length;
    while (partsCount > i) {
      const part = this.parts[i];

      chunks.push(part.compile());

      i++;
    }

    this.isCompiled = true;

    return chunks.join('');
  }

  toString() {
    return this.compile();
  }

  /**
   * String template tag
   *
   * @param {String[]} strings Parts of template
   * @param {*[]} values Values for template
   *
   * @return {Template} Return instance of Template
   */
  static html(strings, ...values) {
    let instance = templateCache.get(strings);

    if (instance) {
      instance.setValues(values);

      return instance;
    }

    instance = new Template(strings, values);

    templateCache.set(strings, instance);

    return instance;
  }

  static get Part() {
    return Part;
  }

  static get PART_STATES() {
    return PART_STATES;
  }
}

module.exports = Template;

