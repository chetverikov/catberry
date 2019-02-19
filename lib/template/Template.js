'use strict';

const {Part} = require('./parts');
const HTMLTokenizer = require('../tokenizers/HTMLTokenizer');
const templateCache = new Map();
const TOKENIZER_STATES = HTMLTokenizer.STATES;


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
            part = Part.createContentPart();

            this.parts.push(part);
          }
          part.addString(value);
          break;
        case TOKENIZER_STATES.TAG_OPEN:
          part = Part.createTagPart();

          this.parts.push(part);

          part.addString(value);
          break;
        case TOKENIZER_STATES.TAG_NAME:
          part.setTagOption('name', value);
          break;
        case TOKENIZER_STATES.SELF_CLOSING_START_TAG_STATE:
          part.setTagOption('isSelfClosed', true);
          break;
        case TOKENIZER_STATES.TAG_CLOSE:
          part = Part.createContentPart();
          this.parts.push(part);
          break;
        case TOKENIZER_STATES.BEFORE_ATTRIBUTE_NAME:
          part.initAttribute();
          part.setAttributeOption('beforeName', value);
          break;
        case TOKENIZER_STATES.AFTER_ATTRIBUTE_NAME:
          part.setAttributeOption('afterName', value);
          break;
        case TOKENIZER_STATES.BEFORE_ATTRIBUTE_VALUE:
          part.setAttributeOption('beforeValue', value);
          break;
        case TOKENIZER_STATES.ATTRIBUTE_NAME:
          part.setAttributeName(value);
          break;

          // TODO: need add to somewhere
          //  const HTML_ENTITY_REFERENCE_REGEXP = /\&#?\w+;/ig;
          //  currentString = tagString
          //    .substring(current.start, current.end)
          //    .replace(HTML_ENTITY_REFERENCE_REGEXP, entities.decode);

        case TOKENIZER_STATES.ATTRIBUTE_VALUE_DOUBLE_QUOTED:
          part.setAttributeOption('quote', '"');
          part.addParsedAttributeValue(value);
          break;
        case TOKENIZER_STATES.ATTRIBUTE_VALUE_SINGLE_QUOTED:
          part.setAttributeOption('quote', '\'');
          part.addParsedAttributeValue(value);
          break;
        case TOKENIZER_STATES.ATTRIBUTE_VALUE_UNQUOTED:
          part.addParsedAttributeValue(value);
          break;
        }

        steps.push({state, start, end});
      }

      string = this.strings[stringsIndex];

      if (string) {
        const valueIndex = stringsIndex - 1;
        const value = values[valueIndex];

        part.addValue(value);

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
            part.addExternalAttributeValue(value);
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


