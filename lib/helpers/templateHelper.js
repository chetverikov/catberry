'use strict';

const helper = {

	/**
	 * Registers templates into the component and template providers.
	 *
	 * @param {Object} component The component.
	 */
	registerTemplates: component => {
		component.template = {
			render: () => component.render()
		};
	}
};

module.exports = helper;
