'use strict';

const fs = require('fs');

const templateCache = Object.create(null);
const templateSourcesCache = Object.create(null);
const HTMLCache = Object.create(null);

const testUtils = {
	wait: milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds)),
	click: (element, options) => {
		const event = new options.view.MouseEvent('click', options);
		element.dispatchEvent(event);
	},

	removeSpacesFromHTML(html) {
		if (typeof html !== 'string') {
			throw new TypeError('html is not a string');
		}

		return html.replace(/[\n\r\t]+/g, '').trim();
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
		if (templateSourcesCache[templateFilename]) {
			return templateSourcesCache[templateFilename];
		}

		/* eslint no-sync: 0 */
		const templateSource = fs.readFileSync(templateFilename).toString();

		return data => /%%throw%%/i.test(templateSource) ?
			Promise.reject(new Error('Template Error')) :
			Promise.resolve(
				templateSource
					.replace(/%%value%%/gi, typeof (data) === 'string' ? data : 'null')
					.replace(/%%error\.message%%/gi, data instanceof Error ? data.message : 'null')
			);
	},

	prepareComponents: (templatesDir, components) => {
		const componentMocks = require('./mocks/components');
		const preparedComponents = {};

		Object.keys(components).forEach(componentName => {
			const component = components[componentName];
			const preparedComponent = Object.create(component);
			let template = null;

			if (preparedComponent.templateFilename) {
				const templateFilename = `${templatesDir}${preparedComponent.templateFilename}`;
				template = fs.readFileSync(templateFilename).toString();
			} else {
				template = preparedComponent.template;
			}

			preparedComponent.constructor = class extends componentMocks[preparedComponent.constructor] {
				render() {
					if (typeof preparedComponent.templateFunc === 'function') {
						return preparedComponent.templateFunc(this);
					}

					return template;
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
