'use strict';

const {Part} = require('./parts');
const HTMLTokenizer = require('../tokenizers/HTMLTokenizer');
const TOKENIZER_STATES = HTMLTokenizer.STATES;


class Template {
  /**
   * Constructor
   *
   * @param {String[]} strings Strings from a literal tag
   * @param {*[]} [values] Values from a literal tag
   */
  constructor(strings, values = []) {
    this.isCompiled = false;
    this.isParsed = false;

    this.strings = strings;
    this.values = values;

    this.parts = [];

    this.parse();
  }

  isEmpty() {
    return !this.strings.length && !this.values.length;
  }

  setValues(values) {
    this.values = values;

    let i = -1;
    let j = 0;
    const partsCount = this.parts.length;

    while (++i < partsCount) {
      const part = this.parts[i];
      const partValuesCount = part.values.length;

      if (part.values.length) {
        part.setValues(part.values.slice(j, partValuesCount));

        j += partValuesCount - 1;
      }
    }
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
    if (this.isEmpty()) {
      return this.parts;
    }

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
            part && part.isTag() && part.closeTag();
            part = Part.createContentPart();

            this.parts.push(part);
          }
          part.addString(value);
          break;
        case TOKENIZER_STATES.TAG_OPEN:
          part && part.isTag() && part.closeTag();
          part = Part.createTagPart();

          this.parts.push(part);

          part.addString(value);
          break;
        case TOKENIZER_STATES.TAG_NAME:
          part.setTagOption('name', value);
          break;
        case TOKENIZER_STATES.SELF_CLOSING_START_TAG_STATE:
          part.isTag() && part.closeTag(true);
          break;
        case TOKENIZER_STATES.TAG_CLOSE:
          part.isTag() && part.closeTag();
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
        part.addBreak();

        htmlTokenizer.setHTMLString(string);

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
            part.addBreakToAttribute();
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
   * Return prepared parts and values for its
   *
   * @param {*[]} values Values for parts
   *
   * @return {{part, value}[]}
   */
  getPartsWithValues(values = []) {
    if (this.isEmpty()) {
      return [];
    }

    if (!this.isParsed) {
      this.parse();
    }

    const parts = [];
    let i = 0;
    let valuesIndexStart = 0;
    let valuesIndexEnd = 0;
    const partsCount = this.parts.length;

    while (partsCount > i) {
      const part = this.parts[i];
      let slicedValues = [];

      if (part.breaks) {
        valuesIndexEnd = valuesIndexEnd + part.breaks;
        slicedValues = values.slice(valuesIndexStart, valuesIndexEnd);
      }

      parts.push({
        part,
        values: slicedValues,
      });

      valuesIndexStart = valuesIndexEnd;

      i++;
    }

    return parts;
  }

  /**
   * Compile HTML from specified parts and values
   *
   * @param {*[]} values Values for compile
   * @return {String} Return compiled HTML
   */
  compile(values = []) {
    if (this.isEmpty()) {
      return '';
    }

    if (!this.isParsed) {
      this.parse();
    }

    const chunks = [];
    let i = 0;
    let valuesIndexStart = 0;
    let valuesIndexEnd = 0;
    const partsCount = this.parts.length;

    while (partsCount > i) {
      const part = this.parts[i];
      let slicedValues = [];

      if (part.breaks) {
        valuesIndexEnd = valuesIndexEnd + part.breaks;
        slicedValues = values.slice(valuesIndexStart, valuesIndexEnd);
      }

      chunks.push(
        part.compile(slicedValues)
      );

      valuesIndexStart = valuesIndexEnd;

      i++;
    }

    this.isCompiled = true;

    return chunks.join('');
  }

  static get Part() {
    return Part;
  }
}

module.exports = Template;


