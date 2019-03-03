
class TemplateCompiler {
  constructor(template, values = []) {
    this.template = template;
    this.values = values;
  }

  getPartsWithValues() {
    return this.template.getPartsWithValues(this.values);
  }

  templateIsEmpty() {
    return this.template.isEmpty();
  }

  setValues(values) {
    this.values = values;
  }

  toString() {
    return this.compile();
  }

  compile() {
    return this.template.compile(this.values);
  }
}

module.exports = TemplateCompiler;
