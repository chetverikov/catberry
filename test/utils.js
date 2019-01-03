'use strict';

const fs = require('fs');

const templateCache = Object.create(null);
const HTMLCache = Object.create(null);

const testUtils = {
	wait: milliseconds => new Promise(fulfill => setTimeout(() => fulfill(), milliseconds)),
	click: (element, options) => {
		const event = new options.view.MouseEvent('click', options);
		element.dispatchEvent(event);
	},
	createTemplateObject: templateFilename => {
		if (!templateFilename) {
			return null;
		}
		if (templateFilename in templateCache) {
			return templateCache[templateFilename];
		}

		templateCache[templateFilename] = {
			render: testUtils.getRenderFunc(templateFilename)
		};

		return templateCache[templateFilename];
	},

	getRenderFunc(templateFilename) {
		/* eslint no-sync: 0 */
		const templateSource = fs.readFileSync(templateFilename).toString();

		return data => /%%throw%%/i.test(templateSource) ?
			Promise.reject(new Error('Template Error')) :
			Promise.resolve(
				templateSource
					.replace(/%%value%%/gi, typeof (data) === 'string' ? data : 'null')
					.replace(/%%error\.message%%/gi, data instanceof Error ? data.message : 'null')
			)
	},

	prepareComponents: (templatesDir, components) => {
		const componentMocks = require('./mocks/components');
		const preparedComponents = {};
		Object.keys(components).forEach(componentName => {
			const component = components[componentName];
			const preparedComponent = Object.create(component);
			const templateFilename = `${templatesDir}${preparedComponent.template}`;

			preparedComponent.template = testUtils.createTemplateObject(templateFilename);
			preparedComponent.constructor = class extends componentMocks[preparedComponent.constructor] {
				render() {
					return Promise.resolve(super.render())
						.then(data => testUtils.getRenderFunc(templateFilename)(data));
				}
			};

			preparedComponents[componentName] = preparedComponent;
		});
		return preparedComponents;
	},

	prepareStores: stores => {
		const storeMocks = require('./mocks/stores');
		const preparedStores = {};
		Object.keys(stores).forEach(storeName => {
			const store = stores[storeName];
			const preparedStore = Object.create(store);
			preparedStore.constructor = storeMocks[preparedStore.constructor];
			preparedStores[storeName] = preparedStore;
		});
		return preparedStores;
	},

	getHTML: documentName => {
		if (documentName in HTMLCache) {
			return HTMLCache[documentName];
		}

		/* eslint no-sync: 0 */
		HTMLCache[documentName] = documentName ? fs.readFileSync(documentName).toString() : '';
		return HTMLCache[documentName];
	}
};

module.exports = testUtils;
