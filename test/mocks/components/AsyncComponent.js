const testUtils = require('../../utils');

class AsyncComponent {
	render() {
		return testUtils.wait(1).then(() => `<span>${this.$context.name}</span>`);
	}
}

module.exports = AsyncComponent;
