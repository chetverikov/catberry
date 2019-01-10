class SyncComponent {
  render() {
    return this.template || `<span>${this.$context.name}</span>`;
  }
}

module.exports = SyncComponent;
