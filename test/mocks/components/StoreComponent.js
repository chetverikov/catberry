class StoreComponent {
	render() {
		return this.$context.getStoreData()
			.then(data => `<pre>
				${JSON.stringify(data)}
			</pre>`);
	}
}

module.exports = StoreComponent;
