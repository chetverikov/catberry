'use strict';

const parts = require('./parts');
const Template = require('./Template');
const Attribute = require('./Attribute');
const TemplateCompiler = require('./Compiler');
const templateCache = new Map();

module.exports = {
  Template,
  TemplateCompiler,
  Attribute,
  Part: parts.Part,
  ContentPart: parts.ContentPart,
  TagPart: parts.TagPart,

  /**
   * String template tag
   *
   * @param {String[]} strings Parts of template
   * @param {*[]} values Values for template
   *
   * @return {TemplateCompiler} Return instance of TemplateCompiler
   */
  html(strings, ...values) {
    let instance = templateCache.get(strings);

    if (!instance) {
      instance = new Template(strings);

      templateCache.set(strings, instance);
    }

    return new TemplateCompiler(instance, values);
  },
};
