class StoreComponent {
  render() {
    return this.$context.getStoreData()
      .then((data) => this.template || `<span>${data}</span>`);
  }
}

module.exports = StoreComponent;
