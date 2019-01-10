'use strict';

const fs = require('fs');
const assert = require('assert');
const events = require('events');
const {JSDOM} = require('jsdom');

const StoreDispatcher = require('../../lib/StoreDispatcher');
const ContextFactory = require('../../lib/ContextFactory');
const ModuleApiProvider = require('../../lib/providers/ModuleApiProvider');
const CookieWrapper = require('../../browser/CookieWrapper');
const DocumentRenderer = require('../../browser/DocumentRenderer');
const ServiceLocator = require('catberry-locator');

const storeMocks = require('../mocks/stores');
const componentMocks = require('../mocks/components');

const testUtils = require('../utils');
const testCases = require('../cases/browser/DocumentRenderer/test-cases.js');
const testActualTemplates = require('../cases/browser/DocumentRenderer/test-actual-templates.js');
const testExpectedTemplates = require('../cases/browser/DocumentRenderer/test-expected-templates.js');

const TEMPLATES_DIR = `${__dirname}/../cases/browser/DocumentRenderer/templates/`;
const EXPECTED_DIR = `${__dirname}/../cases/browser/DocumentRenderer/expected/`;

const stubHtml = testActualTemplates.stub();

/* eslint prefer-arrow-callback:0 */
/* eslint max-nested-callbacks:0 */
/* eslint require-jsdoc:0 */
describe('browser/DocumentRenderer', function() {

	function prepareTestCase(testCase) {
		const preparedTestCase = Object.create(testCase);
		preparedTestCase.components = {};
		preparedTestCase.stores = {};

		if (testCase.components) {
			preparedTestCase.components = testUtils.prepareComponents(TEMPLATES_DIR, testCase.components);
		}

		if (testCase.stores) {
			preparedTestCase.stores = testUtils.prepareStores(testCase.stores);
		}

		if (preparedTestCase.elementHTML) {
			preparedTestCase.elementHTML = testCase.elementHTML;
		}

		if (testCase.expectedBodyContent) {
			if (/\.html$/.test(testCase.expectedBodyContent)) {
				preparedTestCase.expectedBodyContent = testUtils.getHTML(`${EXPECTED_DIR}${testCase.expectedBodyContent}`);
			} else {
				preparedTestCase.expectedBodyContent = testCase.expectedBodyContent;
			}
		}

		if (testCase.expectedElementContent) {
			if (/\.html$/.test(testCase.expectedElementContent)) {
				preparedTestCase.expectedElementContent = testUtils.getHTML(`${EXPECTED_DIR}${testCase.expectedElementContent}`);
			} else {
				preparedTestCase.expectedElementContent = testCase.expectedElementContent;
			}
		}

		return preparedTestCase;
	}

	describe('#initWithState', function() {
		it('should init and bind all components in right order', function() {

			/* eslint no-sync: 0 */
			const html = testActualTemplates.documentManyNested();
			const bindCalls = [];
			class NestComponent {
				bind() {
					const id = this.$context.attributes.id ? `-${this.$context.attributes.id}` : '';

					bindCalls.push(this.$context.name + id);
				}
			}

			const components = {
				comp: {
					name: 'comp',
					constructor: NestComponent
				},
				head: {
					name: 'head',
					constructor: NestComponent
				},
				document: {
					name: 'document',
					constructor: NestComponent
				}
			};

			const locator = createLocator({}, components, {});

			const expected = [
				'comp-1',
				'comp-2',
				'comp-3',
				'comp-4',
				'comp-5',
				'comp-6',
				'comp-7',
				'comp-8',
				'comp-9',
				'comp-10',
				'comp-11',
				'comp-12',
				'comp-13',
				'comp-14',
				'comp-15',
				'comp-16',
				'comp-17',
				'comp-18',
				'head',
				'document'
			];

			const {window} = new JSDOM(html);

			locator.registerInstance('window', window);
			const renderer = new DocumentRenderer(locator);

			return renderer.initWithState({}, {})
				.then(() => assert.deepEqual(bindCalls, expected));
		});
	});

	describe('#renderComponent', function() {
		testCases.renderComponent.forEach(testCase => {
			const method = testCase.only ? it.only : it;
			method(testCase.name, function() {
				const preparedTestCase = prepareTestCase(testCase);
				const locator = createLocator(
					preparedTestCase.config || {}, preparedTestCase.components, preparedTestCase.stores
				);

				const {window} = new JSDOM(preparedTestCase.html);

				const element = window.document.querySelector(preparedTestCase.tagName) ||
					window.document.createElement(preparedTestCase.tagName);

				if (preparedTestCase.elementHTML) {
					element.innerHTML = preparedTestCase.elementHTML;
				}

				if (preparedTestCase.tagAttributes) {
					Object.keys(preparedTestCase.tagAttributes)
						.forEach(name => element.setAttribute(name, preparedTestCase.tagAttributes[name]));
				}

				locator.registerInstance('window', window);

				const renderer = new DocumentRenderer(locator);

				return renderer.renderComponent(element)
					.then(() => assert.strictEqual(
						testUtils.removeSpacesFromHTML(element.innerHTML),
						testUtils.removeSpacesFromHTML(preparedTestCase.expectedElementContent)
					))
					.catch(error => {
						if (error instanceof assert.AssertionError) {
							throw error;
						}
						if (preparedTestCase.errorMessage) {
							assert.strictEqual(error.message, preparedTestCase.errorMessage);
						} else {
							throw error;
						}
					});
			});
		});

		// TODO: Need add a debug output when exists error in component
		it.skip('should render debug output instead the content when error in debug mode', function(done) {
			const components = {
				test: {
					name: 'test',
					constructor: class extends componentMocks.SyncErrorComponent {
						render() {
							return Promise.resolve(super.render())
								.then(data => testUtils.getRenderFunc(`${TEMPLATES_DIR}simple-component.html`)(data));
						}
					}
				}
			};

			const locator = createLocator({}, components, {});

			const check = /Error: test/;

			jsdom.env({
				html: testUtils.getHTML(`${TEMPLATES_DIR}stub.html`),
				done: (errors, window) => {
					locator.registerInstance('window', window);
					const renderer = new DocumentRenderer(locator);
					const element = window.document.createElement('cat-test');
					element.setAttribute('id', 'unique');
					renderer.renderComponent(element)
						.catch(error => {
							assert.strictEqual(error.message, 'test');
							assert.strictEqual(check.test(element.innerHTML), true);
						})
						.then(done)
						.catch(done);
				}
			});
		});

		it('should bind all events from bind method', function() {
			class TestComponent {
				render() {
					if (this.$context.name === 'test1') {
						return testActualTemplates.clickable1(this.$context.name);
					}

					return testActualTemplates.clickable2(this.$context.name);
				}

				bind() {
					return {
						click: {
							'a.clickable': event => {
								event.target.innerHTML += `inner:${this.$context.name}`;
							}
						}
					};
				}
			}

			const components = {
				test1: {
					name: 'test1',
					constructor: TestComponent
				},
				test2: {
					name: 'test2',
					constructor: TestComponent
				}
			};

			const locator = createLocator({}, components, {});
			const expected = testExpectedTemplates.clickable;
			const {window} = new JSDOM(stubHtml);

			locator.registerInstance('window', window);

			const renderer = new DocumentRenderer(locator);
			const element = window.document.createElement('cat-test1');

			return renderer.renderComponent(element)
				.then(() => {
					const links = element.querySelectorAll('a.clickable');
					for (let i = 0; i < links.length; i++) {
						testUtils.click(links[i], {
							view: window,
							bubbles: true,
							cancelable: true,
							button: 0
						});
					}

					return testUtils.wait(1);
				})
				.then(() => assert.strictEqual(
					testUtils.removeSpacesFromHTML(element.innerHTML),
					testUtils.removeSpacesFromHTML(expected)
				));
		});

		it('should handle dispatched events', function() {
			class Component1 {
				render() {
					return testActualTemplates.clickable3(this.$context.name);
				}

				bind() {
					return {
						click: {
							'a.clickable': event => {
								event.target.parentNode.innerHTML += 'Component1';
								event.currentTarget.parentNode.innerHTML += 'Component1';
							}
						}
					};
				}
			}

			const components = {
				test1: {
					name: 'test1',
					constructor: Component1
				}
			};

			const locator = createLocator({}, components, {});
			const expected = testExpectedTemplates.dispatchedEvent;

			const {window} = new JSDOM(' ');

			locator.registerInstance('window', window);

			const renderer = new DocumentRenderer(locator);
			const element = window.document.createElement('cat-test1');

			element.setAttribute('id', 'unique');
			return renderer.renderComponent(element)
				.then(() => {
					const toClick = element.querySelectorAll('div.toclick');
					for (let i = 0; i < toClick.length; i++) {
						testUtils.click(toClick[i], {
							view: window,
							bubbles: true,
							cancelable: true,
							button: 0
						});
					}
					return testUtils.wait(1);
				})
				.then(() => assert.strictEqual(
					testUtils.removeSpacesFromHTML(element.innerHTML),
					testUtils.removeSpacesFromHTML(expected)
				));
		});

		it('should do nothing if event selector does not match', function() {
			class Component1 {
				render() {
					return testActualTemplates.clickable3(this.$context.name);
				}

				bind() {
					return {
						click: {
							'a.non-clickable': event => {
								event.target.parentNode.innerHTML += 'Component1';
								event.currentTarget.parentNode.innerHTML += 'Component1';
							}
						}
					};
				}
			}

			const components = {
				test1: {
					name: 'test1',
					constructor: Component1
				}
			};

			const locator = createLocator({}, components, {});
			const expected = testExpectedTemplates.notDispatchedEvent;

			const {window} = new JSDOM(' ');

			locator.registerInstance('window', window);

			const renderer = new DocumentRenderer(locator);
			const element = window.document.createElement('cat-test1');

			element.setAttribute('id', 'unique');

			return renderer.renderComponent(element)
				.then(() => {
					const toClick = element.querySelectorAll('div.toclick');
					for (let i = 0; i < toClick.length; i++) {
						testUtils.click(toClick[i], {
							view: window,
							bubbles: true,
							cancelable: true,
							button: 0
						});
					}
					return testUtils.wait(1);
				})
				.then(() => assert.strictEqual(
					testUtils.removeSpacesFromHTML(element.innerHTML),
					testUtils.removeSpacesFromHTML(expected)
				));
		});

		it('should do nothing if event handler is not a function', function() {
			class Component1 {
				render() {
					return `${this.$context.name}<div><a class="clickable"><span><div class="toclick"></div></span></a></div>`;
				}

				bind() {
					return {
						click: {
							'a.non-clickable': 'wrong handler'
						}
					};
				}
			}

			const components = {
				test1: {
					name: 'test1',
					constructor: Component1
				}
			};

			const locator = createLocator({}, components, {});
			const expected = testExpectedTemplates.notDispatchedEvent;

			const {window} = new JSDOM(' ');

			locator.registerInstance('window', window);

			const renderer = new DocumentRenderer(locator);
			const element = window.document.createElement('cat-test1');

			element.setAttribute('id', 'unique');

			return renderer.renderComponent(element)
				.then(() => {
					const toClick = element.querySelectorAll('div.toclick');
					for (let i = 0; i < toClick.length; i++) {
						testUtils.click(toClick[i], {
							view: window,
							bubbles: true,
							cancelable: true,
							button: 0
						});
					}
					return testUtils.wait(1);
				})
				.then(() => assert.strictEqual(
					testUtils.removeSpacesFromHTML(element.innerHTML),
					testUtils.removeSpacesFromHTML(expected)
				));
		});

		it('should unbind all events and call unbind', function() {
			const binds = [];
			const unbinds = [];
			const clicks = [];

			class TestComponent {
				render() {
					if (this.$context.name === 'test1') {
						return `${this.$context.name}<div><a class="clickable"></a></div><cat-test2></cat-test2>`;
					}

					return `${this.$context.name}<span><a class="clickable"></a></span>`;
				}

				bind() {
					binds.push(this.$context.name);

					return {
						click: {
							'a.clickable': e => this.onClick(e)
						}
					};
				}

				unbind() {
					unbinds.push(this.$context.name);
				}

				onClick(e) {
					e.stopPropagation();
					clicks.push(this.$context.name);
				}
			}

			const components = {
				test1: {
					name: 'test1',
					constructor: TestComponent
				},
				test2: {
					name: 'test2',
					constructor: TestComponent
				}
			};

			const locator = createLocator({}, components, {});

			const {window} = new JSDOM(' ');

			locator.registerInstance('window', window);

			const renderer = new DocumentRenderer(locator);
			const element = window.document.createElement('cat-test1');

			return renderer.renderComponent(element)
				.then(() => {
					const toClick = element.querySelectorAll('a.clickable');
					for (let i = 0; i < toClick.length; i++) {
						testUtils.click(toClick[i], {
							view: window,
							bubbles: true,
							cancelable: true,
							button: 0
						});
					}

					return testUtils.wait(1);
				})
				.then(() => renderer.collectGarbage())
				.then(() => {
					const toClick = element.querySelectorAll('a.clickable');
					for (let i = 0; i < toClick.length; i++) {
						testUtils.click(toClick[i], {
							view: window,
							bubbles: true,
							cancelable: true,
							button: 0
						});
					}
					return testUtils.wait(1);
				})
				.then(() => {
					assert.deepEqual(binds, [
						'test2',
						'test1'
					]);
					assert.deepEqual(unbinds, [
						'test2',
						'test1'
					]);
					assert.deepEqual(clicks, [
						'test1',
						'test2'
					]);
				});
		});

		it('should use the same component instance if it\'s element recreated after rendering', function() {
			const instances = {
				first: [],
				second: [],
				third: []
			};

			class Component1 {
				constructor() {
					instances.first.push(this);
				}

				render() {
					return `
						<div>Hello from ${this.$context.name}</div>
						<cat-test2></cat-test2>
						<cat-test3></cat-test3>
					`;
				}
			}

			class Component2 {
				constructor() {
					instances.second.push(this);
				}

				render() {
					return `
						<span>Hello from ${this.$context.name}
							<cat-test3></cat-test3>
						</span>
					`;
				}
			}

			class Component3 {
				constructor() {
					instances.third.push(this);
				}

				render() {
					return testCases.simpleRender(this);
				}
			}

			const components = {
				test1: {
					name: 'test1',
					constructor: Component1
				},
				test2: {
					name: 'test2',
					constructor: Component2
				},
				test3: {
					name: 'test3',
					constructor: Component3
				}
			};

			const locator = createLocator({}, components, {});

			const {window} = new JSDOM(' ');

			locator.registerInstance('window', window);

			const renderer = new DocumentRenderer(locator);
			const element = window.document.createElement('cat-test1');

			element.setAttribute('id', 'unique');

			return renderer.renderComponent(element)
				.then(() => renderer.renderComponent(element))
				.then(() => renderer.renderComponent(element))
				.then(() => {
					assert.strictEqual(instances.first.length, 1);
					assert.strictEqual(instances.second.length, 1);
					assert.strictEqual(instances.third.length, 2);
				});
		});

		// why is he hanging out?
		it.skip('should use new component instance if it\'s element removed after rendering', function(done) {
			const instances = {
				first: [],
				second: [],
				third: []
			};

			let shouldRender = true;

			class Component1 {
				constructor() {
					instances.first.push(this);
				}

				render() {
					if (!shouldRender) {
						return '';
					}

					return `
						<div>Hello from ${this.$context.name}</div>
						<cat-test2></cat-test2>
						<cat-test3></cat-test3>
					`;
				}
			}

			class Component2 {
				constructor() {
					instances.second.push(this);
				}

				render() {
					if (!shouldRender) {
						return '';
					}

					return `
						<span>Hello from ${this.$context.name}
							<cat-test3></cat-test3>
						</span>
					`;
				}
			}

			class Component3 {
				constructor() {
					instances.third.push(this);
				}

				render() {
					if (!shouldRender) {
						return '';
					}

					return testCases.simpleRender(this);
				}
			}

			const components = {
				test1: {
					name: 'test1',
					constructor: Component1
				},
				test2: {
					name: 'test2',
					constructor: Component2
				},
				test3: {
					name: 'test3',
					constructor: Component3
				}
			};

			const locator = createLocator({}, components, {});

			const {window} = new JSDOM(' ');

			locator.registerInstance('window', window);

			const renderer = new DocumentRenderer(locator);
			const element = window.document.createElement('cat-test1');

			element.setAttribute('id', 'unique');

			return renderer.renderComponent(element)
				.then(() => {
					shouldRender = false;
					return renderer.renderComponent(element);
				})
				.then(() => {
					shouldRender = true;
					return renderer.renderComponent(element);
				})
				.then(() => {
					assert.strictEqual(instances.first.length, 1);
					assert.strictEqual(instances.second.length, 2);
					assert.strictEqual(instances.third.length, 4);
				});
		});
	});

	describe('#render', function() {
		let renders, unbinds, binds, locator, components, stores;
		const html = testActualTemplates.renderTestPage();
		const map = {
			test1: testActualTemplates.renderTestComp1,
			test2: testActualTemplates.renderTestComp2,
			test3: testActualTemplates.renderTestComp3,
			test4: testActualTemplates.renderTestComp4,
			test5: testActualTemplates.simpleComponent
		};

		class TestComponent {
			render() {
				renders.push(this.$context.attributes.id);

				return map[this.$context.name](this.$context.name);
			}
			bind() {
				binds.push(this.$context.attributes.id);
			}
			unbind() {
				unbinds.push(this.$context.attributes.id);
			}
		}

		beforeEach(function() {
			renders = [];
			binds = [];
			unbinds = [];

			components = {
				test1: {
					name: 'test1',
					constructor: TestComponent
				},
				test2: {
					name: 'test2',
					constructor: TestComponent
				},
				test3: {
					name: 'test3',
					constructor: TestComponent
				},
				test4: {
					name: 'test4',
					constructor: TestComponent
				},
				test5: {
					name: 'test5',
					constructor: TestComponent
				}
			};
			stores = {
				store1: {
					name: 'store1',
					constructor: storeMocks.AsyncDataStore
				},
				store2: {
					name: 'store2',
					constructor: storeMocks.AsyncDataStore
				},
				store3: {
					name: 'store3',
					constructor: storeMocks.AsyncDataStore
				}
			};

			locator = createLocator({}, components, stores);
		});

		it('should update all components that depend on changed stores', function() {
			const {window} = new JSDOM(html);

			locator.registerInstance('window', window);

			const renderer = new DocumentRenderer(locator);

			return renderer.initWithState({}, {})
				.then(() => binds.push('==separator=='))
				.then(() => renderer.render({
					store1: {},
					store2: {},
					store3: {}
				}, {}))
				.then(() => {
					assert.deepEqual(renders, [
						'in-test1-2',
						'in-test1-1',
						'in-test4-1',
						'in-test2-1',
						'in-test3-1'
					]);

					assert.deepEqual(binds, [
						'in-test3-1',
						'in-test4-1',
						'in-test2-1',
						'in-test1-2',
						'in-test1-1',
						'root',
						'==separator==',
						'in-test4-1',
						'in-test1-2',
						'in-test3-1',
						'in-test2-1',
						'in-test1-1'
					]);

					assert.deepEqual(unbinds, [
						'in-test3-1',
						'in-test4-1',
						'in-test2-1',
						'in-test1-2',
						'in-test1-1'
					]);
				});
		});

		it('should update all components that depend on changed store by .changed() method', function() {
			class ActionComponent extends TestComponent {
				constructor() {
					super();
					this.$context.sendAction('test');
				}
			}
			class TimerStore {
				handleTest() {
					testUtils.wait(5)
						.then(() => this.$context.changed());
				}
			}

			components.test2.constructor = ActionComponent;
			stores.store2.constructor = TimerStore;

			const {window} = new JSDOM(html);

			locator.registerInstance('window', window);

			const renderer = new DocumentRenderer(locator);

			return renderer.initWithState({
				store1: {},
				store2: {},
				store3: {}
			}, {})
				.then(() => binds.push('==separator=='))
				.then(() => testUtils.wait(10))
				.then(() => {
					assert.deepEqual(renders, [
						'in-test4-1',
						'in-test1-1',
						'in-test2-1',
						'in-test3-1'
					]);

					assert.deepEqual(binds, [
						'in-test3-1',
						'in-test4-1',
						'in-test2-1',
						'in-test1-2',
						'in-test1-1',
						'root',
						'==separator==',
						'in-test4-1',
						'in-test3-1',
						'in-test2-1',
						'in-test1-1'
					]);

					assert.deepEqual(unbinds, [
						'in-test3-1',
						'in-test2-1',
						'in-test1-1'
					]);
				});
		});

		it('should do nothing if nothing changes', function() {
			const {window} = new JSDOM(html);

			locator.registerInstance('window', window);

			const renderer = new DocumentRenderer(locator);

			return renderer.initWithState({
				store1: {},
				store2: {},
				store3: {}
			}, {})
				.then(() => binds.push('==separator=='))
				.then(() => renderer.render({
					store1: {},
					store2: {},
					store3: {}
				}, {}))
				.then(() => {
					assert.strictEqual(renders.length, 0);
					assert.strictEqual(unbinds.length, 0);
					assert.strictEqual(binds[binds.length - 1], '==separator==');
				});
		});

		it('should not do rendering concurrently', function() {
			const {window} = new JSDOM(html);

			locator.registerInstance('window', window);

			const renderer = new DocumentRenderer(locator);

			renderer.initWithState({}, {})
				.then(() => binds.push('==separator=='))
				.then(() => Promise.all([
					renderer.render({
						store1: {}
					}, {}),
					renderer.render({
						store1: {},
						store2: {}
					}, {}),
					renderer.render({
						store1: {},
						store2: {},
						store3: {}
					}, {})
				]))
				.then(() => {
					assert.deepEqual(renders, [
						'in-test1-2',
						'in-test1-1',
						'in-test4-1',
						'in-test2-1',
						'in-test3-1'
					]);

					assert.deepEqual(binds, [
						'in-test3-1',
						'in-test4-1',
						'in-test2-1',
						'in-test1-2',
						'in-test1-1',
						'root',
						'==separator==',
						'in-test4-1',
						'in-test1-2',
						'in-test3-1',
						'in-test2-1',
						'in-test1-1'
					]);

					assert.deepEqual(unbinds, [
						'in-test3-1',
						'in-test4-1',
						'in-test2-1',
						'in-test1-2',
						'in-test1-1'
					]);
				});
		});
	});

	describe('#createComponent', function() {
		testCases.renderComponent.forEach(testCase => {
			it(testCase.name, function() {
				const preparedTestCase = prepareTestCase(testCase);
				const locator = createLocator(
					preparedTestCase.config || {}, preparedTestCase.components, preparedTestCase.stores
				);

				const {window} = new JSDOM(preparedTestCase.html);

				locator.registerInstance('window', window);
				let element = null;
				const renderer = new DocumentRenderer(locator);
				return renderer.createComponent(preparedTestCase.tagName, preparedTestCase.tagAttributes)
					.then(el => {
						element = el;
						assert.strictEqual(
							testUtils.removeSpacesFromHTML(element.innerHTML),
							testUtils.removeSpacesFromHTML(preparedTestCase.expectedElementContent)
						);
					})
					// in case of error it should not return an element
					.catch(() => assert.strictEqual(element, null));
			});
		});

		it('should reject promise if wrong component', function() {
			const locator = createLocator({}, {});

			const {window} = new JSDOM(' ');
			locator.registerInstance('window', window);
			const renderer = new DocumentRenderer(locator);

			return renderer.createComponent('cat-wrong', {
				id: 'unique'
			})
				.then(() => assert.fail('Should fail'))
				.catch(reason =>
					assert.strictEqual(reason.message, 'Component for tag "cat-wrong" not found'));
		});

		it('should reject promise if tag name is not a string', function() {
			const locator = createLocator({}, {});

			const {window} = new JSDOM(' ');
			locator.registerInstance('window', window);
			const renderer = new DocumentRenderer(locator);

			return renderer.createComponent(100500, {
				id: 'some'
			})
				.then(() => assert.fail('Should fail'))
				.catch(reason =>
					assert.strictEqual(
						reason.message,
						'The tag name must be a string')
				);
		});
	});

	describe('#collectGarbage', function() {
		it('should unlink component if it is not in DOM', function() {

			const unbinds = [];
			class TestComponent extends componentMocks.AsyncComponent {
				render() {
					return Promise.resolve().then(() => {
						switch (this.$context.name) {
							case 'test1':
								return testActualTemplates.nested1(this.$context.name);
							case 'test2':
							case 'test3':
								return testActualTemplates.simpleComponent(this.$context.name);
						}

						return null;
					});
				}

				unbind() {
					unbinds.push(this.$context.name);
				}
			}

			const components = {
				test1: {
					name: 'test1',
					constructor: TestComponent
				},
				test2: {
					name: 'test2',
					constructor: TestComponent
				},
				test3: {
					name: 'test3',
					constructor: TestComponent
				}
			};

			const locator = createLocator({}, components, {});

			const {window} = new JSDOM(' ');

			locator.registerInstance('window', window);
			const renderer = new DocumentRenderer(locator);
			let componentElements = null;

			return Promise.all([
				renderer.createComponent('cat-test1'),
				renderer.createComponent('cat-test2'),
				renderer.createComponent('cat-test3')
			])
				.then(elements => {
					componentElements = elements;
					window.document.body.appendChild(elements[1]);
					const areInstances = elements.every(el => {
						const instance = renderer.getComponentByElement(el);
						return instance instanceof componentMocks.AsyncComponent;
					});
					assert.strictEqual(areInstances, true);
					return renderer.collectGarbage();
				})
				.then(() => {
					const instance1 = renderer.getComponentByElement(componentElements[0]);
					const instance2 = renderer.getComponentByElement(componentElements[1]);
					const instance3 = renderer.getComponentByElement(componentElements[2]);

					assert.strictEqual(instance1, null);
					assert.strictEqual(instance2 instanceof TestComponent, true);
					assert.strictEqual(instance3, null);

					assert.deepEqual(unbinds, [
						'test3',
						'test3',
						'test2',
						'test1'
					]);
				});
		});
	});

	describe('search methods', function() {

		describe('#getComponentByElement', function() {

			it('should find a component by element', function() {
				let element = null;
				let found = null;
				class Component1 {
					render() {
						return testActualTemplates.simpleComponent(this.$context.name);
					}
					bind() {
						found = this.$context.getComponentByElement(element);
					}
				}
				class Component2 {
					render() {
						return testActualTemplates.simpleComponent(this.$context.name);
					}
				}

				const components = {
					test1: {
						name: 'test1',
						constructor: Component1
					},
					test2: {
						name: 'test2',
						constructor: Component2
					}
				};

				const locator = createLocator({}, components, {});
				const html = `
<html>
<body>
	<cat-test1></cat-test1>
	<cat-test2 id="to-find"></cat-test2>
</body>
</html>`;

				const {window} = new JSDOM(html);

				locator.registerInstance('window', window);
				element = window.document.getElementById('to-find');

				const renderer = new DocumentRenderer(locator);

				return renderer.initWithState({}, {})
					.then(() => assert.strictEqual(found instanceof Component2, true));
			});

			it('should return null if the component is not found by element', function() {
				let element = null;
				let found = undefined;
				class Component1 {
					render() {
						return testActualTemplates.simpleComponent(this.$context.name);
					}

					bind() {
						found = this.$context.getComponentByElement(element);
					}
				}

				const components = {
					test1: {
						name: 'test1',
						constructor: Component1
					}
				};

				const locator = createLocator({}, components, {});
				const html = `
<html>
<body>
	<cat-test1></cat-test1>
	<cat-test2 id="wrong"></cat-test2>
</body>
</html>`;

				const {window} = new JSDOM(html);

				locator.registerInstance('window', window);
				element = window.document.getElementById('to-find');

				const renderer = new DocumentRenderer(locator);
				renderer.initWithState({}, {})
					.then(() => assert.strictEqual(found, null));
			});
		});

		describe('#getComponentById', function() {

			it('should find a component by ID', function() {
				const id = 'uniqueId';
				let found = null;
				class Component1 {
					render() {
						return testActualTemplates.simpleComponent(this.$context.name);
					}
					bind() {
						found = this.$context.getComponentById(id);
					}
				}
				class Component2 {
					render() {
						return testActualTemplates.simpleComponent(this.$context.name);
					}
				}

				const components = {
					test1: {
						name: 'test1',
						constructor: Component1
					},
					test2: {
						name: 'test2',
						constructor: Component2
					}
				};

				const locator = createLocator({}, components, {});
				const html = `
<html>
<body>
	<cat-test1></cat-test1>
	<cat-test2 id="${id}"></cat-test2>
</body>
</html>`;

				const {window} = new JSDOM(html);
				locator.registerInstance('window', window);
				const renderer = new DocumentRenderer(locator);

				return renderer.initWithState({}, {})
					.then(() => assert.strictEqual(found instanceof Component2, true));
			});

			it('should return null if the component is not found by ID', function() {
				const id = 'uniqueId';
				let found = undefined;
				class Component1 {
					render() {
						return testActualTemplates.simpleComponent(this.$context.name);
					}
					bind() {
						found = this.$context.getComponentById(id);
					}
				}
				class Component2 {
					render() {
						return testActualTemplates.simpleComponent(this.$context.name);
					}
				}

				const components = {
					test1: {
						name: 'test1',
						constructor: Component1
					},
					test2: {
						name: 'test2',
						constructor: Component2
					}
				};

				const locator = createLocator({}, components, {});
				const html = `
<html>
<body>
	<cat-test1></cat-test1>
	<cat-test2 id="wrong"></cat-test2>
</body>
</html>`;

				const {window} = new JSDOM(html);
				locator.registerInstance('window', window);
				const renderer = new DocumentRenderer(locator);
				return renderer.initWithState({}, {})
					.then(() => assert.strictEqual(found, null));
			});

			it('should return null if the element found by ID is not a component', function() {
				const id = 'to-find';
				let found = undefined;
				class Component1 {
					render() {
						return testActualTemplates.simpleComponent(this.$context.name);
					}
					bind() {
						found = this.$context.getComponentById(id);
					}
				}

				const components = {
					test1: {
						name: 'test1',
						constructor: Component1
					}
				};

				const locator = createLocator({}, components, {});
				const html = `
<html>
<body>
	<cat-test1></cat-test1>
	<cat-test3 id="${id}"></cat-test3>
</body>
</html>`;

				const {window} = new JSDOM(html);
				locator.registerInstance('window', window);
				const renderer = new DocumentRenderer(locator);
				return renderer.initWithState({}, {})
					.then(() => assert.strictEqual(found, null));
			});

		});

		describe('#getComponentsByTagName', function() {
			it('should find components by a tag name', function() {
				const tagName = 'cat-test2';
				let found = null;
				class Component1 {
					render() {
						return testActualTemplates.simpleComponent(this.$context.name);
					}
					bind() {
						found = this.$context.getComponentsByTagName(tagName);
					}
				}
				class Component2 {
					render() {
						return testActualTemplates.simpleComponent(this.$context.name);
					}
				}

				const components = {
					test1: {
						name: 'test1',
						constructor: Component1
					},
					test2: {
						name: 'test2',
						constructor: Component2
					}
				};

				const locator = createLocator({}, components, {});
				const html = `
<html>
<body>
	<cat-test1></cat-test1>

	<cat-test2></cat-test2>
	<cat-test2></cat-test2>
	<cat-test2></cat-test2>
	<cat-test2></cat-test2>
</body>
</html>`;

				const {window} = new JSDOM(html);
				locator.registerInstance('window', window);
				const renderer = new DocumentRenderer(locator);
				return renderer.initWithState({}, {})
					.then(() => {
						assert.strictEqual(found instanceof Array, true);
						assert.strictEqual(found.length, 4);
						assert.strictEqual(found.every(item => item instanceof Component2), true);
					});
			});

			it('should find components by a tag name in a parent', function() {
				const tagName = 'cat-test2';
				let found = null;
				class Component1 {
					render() {
						return testActualTemplates.simpleComponent(this.$context.name);
					}
					bind() {
						found = this.$context.getComponentsByTagName(tagName, this);
					}
				}
				class Component2 {
					render() {
						return testActualTemplates.simpleComponent(this.$context.name);
					}
				}

				const components = {
					test1: {
						name: 'test1',
						constructor: Component1
					},
					test2: {
						name: 'test2',
						constructor: Component2
					}
				};

				const locator = createLocator({}, components, {});
				const html = `
<html>
<body>
	<cat-test1>
		<cat-test2 class="nested"></cat-test2>
		<cat-test2 class="nested"></cat-test2>
	</cat-test1>

	<cat-test2></cat-test2>
	<cat-test2></cat-test2>
</body>
</html>`;

				const {window} = new JSDOM(html);
				locator.registerInstance('window', window);
				const renderer = new DocumentRenderer(locator);
				return renderer.initWithState({}, {})
					.then(() => {
						assert.strictEqual(found instanceof Array, true);
						assert.strictEqual(found.length, 2);
						assert.strictEqual(found.every(item =>
							item instanceof Component2 && item.$context.element.className === 'nested'
						), true);
					});
			});

			it('should filter elements which are not components', function() {
				const tagName = 'cat-test2';
				let found = null;
				class Component1 {
					render() {
						return testActualTemplates.simpleComponent(this.$context.name);
					}
					bind() {
						found = this.$context.getComponentsByTagName(tagName);
					}
				}

				const components = {
					test1: {
						name: 'test1',
						constructor: Component1
					}
				};

				const locator = createLocator({}, components, {});
				const html = `
<html>
<body>
	<cat-test1></cat-test1>

	<cat-test2></cat-test2>
	<cat-test2></cat-test2>
	<cat-test2></cat-test2>
	<cat-test2></cat-test2>
</body>
</html>`;

				const {window} = new JSDOM(html);
				locator.registerInstance('window', window);
				const renderer = new DocumentRenderer(locator);
				return renderer.initWithState({}, {})
					.then(() => {
						assert.strictEqual(found instanceof Array, true);
						assert.strictEqual(found.length, 0);
					});
			});
		});

		describe('#getComponentsByClassName', function() {
			it('should find components by a class name', function() {
				const className = 'to-find';
				let found = null;
				class Component1 {
					render() {
						return testActualTemplates.simpleComponent(this.$context.name);
					}
					bind() {
						found = this.$context.getComponentsByClassName(className);
					}
				}
				class Component2 {
					render() {
						return testActualTemplates.simpleComponent(this.$context.name);
					}
				}

				const components = {
					test1: {
						name: 'test1',
						constructor: Component1
					},
					test2: {
						name: 'test2',
						constructor: Component2
					}
				};

				const locator = createLocator({}, components, {});
				const html = `
<html>
<body>
	<cat-test1></cat-test1>

	<cat-test2 class="${className}"></cat-test2>
	<cat-test2 class="${className}"></cat-test2>
	<cat-test2 class="${className}"></cat-test2>
	<cat-test2 class="${className}"></cat-test2>
</body>
</html>`;

				const {window} = new JSDOM(html);
				locator.registerInstance('window', window);
				const renderer = new DocumentRenderer(locator);
				return renderer.initWithState({}, {})
					.then(() => {
						assert.strictEqual(found instanceof Array, true);
						assert.strictEqual(found.length, 4);
						assert.strictEqual(found.every(
							item => item instanceof Component2 && item.$context.element.className === 'to-find'
						), true);
					});
			});

			it('should find components by a class name in a parent', function() {
				const className = 'to-find';
				let found = null;
				class Component1 {
					render() {
						return testActualTemplates.simpleComponent(this.$context.name);
					}
					bind() {
						found = this.$context.getComponentsByClassName(className, this);
					}
				}
				class Component2 {
					render() {
						return testActualTemplates.simpleComponent(this.$context.name);
					}
				}

				const components = {
					test1: {
						name: 'test1',
						constructor: Component1
					},
					test2: {
						name: 'test2',
						constructor: Component2
					}
				};

				const locator = createLocator({}, components, {});
				const html = `
<html>
<body>
	<cat-test1>
		<cat-test2 class="${className} nested"></cat-test2>
		<cat-test2 class="${className} nested"></cat-test2>
	</cat-test1>

	<cat-test2 class="${className}"></cat-test2>
	<cat-test2 class="${className}"></cat-test2>
</body>
</html>`;

				const {window} = new JSDOM(html);
				locator.registerInstance('window', window);
				const renderer = new DocumentRenderer(locator);
				return renderer.initWithState({}, {})
					.then(() => {
						assert.strictEqual(found instanceof Array, true);
						assert.strictEqual(found.length, 2);
						assert.strictEqual(found.every(item =>
							item instanceof Component2 && item.$context.element.className === `${className} nested`
						), true);
					});
			});

			it('should filter elements which are not components', function() {
				const className = 'to-find';
				let found = null;
				class Component1 {
					render() {
						return testActualTemplates.simpleComponent(this.$context.name);
					}
					bind() {
						found = this.$context.getComponentsByClassName(className);
					}
				}
				class Component2 {
					render() {
						return testActualTemplates.simpleComponent(this.$context.name);
					}
				}

				const components = {
					test1: {
						name: 'test1',
						constructor: Component1
					},
					test2: {
						name: 'test2',
						constructor: Component2
					}
				};

				const locator = createLocator({}, components, {});
				const html = `
<html>
<body>
	<cat-test1></cat-test1>

	<cat-test2 class="${className}"></cat-test2>
	<cat-test2 class="${className}"></cat-test2>
	<cat-test3 class="${className}"></cat-test3>
	<cat-test3 class="${className}"></cat-test3>
</body>
</html>`;

				const {window} = new JSDOM(html);
				locator.registerInstance('window', window);
				const renderer = new DocumentRenderer(locator);
				return renderer.initWithState({}, {})
					.then(() => {
						assert.strictEqual(found instanceof Array, true);
						assert.strictEqual(found.length, 2);
						assert.strictEqual(found.every(item =>
							item instanceof Component2 && item.$context.name === 'test2'
						), true);
					});
			});
		});

		describe('#queryComponentSelector', function() {
			it('should find a component by a selector', function() {
				const selector = '#to-find';
				let found = null;
				class Component1 {
					render() {
						return testActualTemplates.simpleComponent(this.$context.name);
					}
					bind() {
						found = this.$context.queryComponentSelector(selector);
					}
				}
				class Component2 {
					render() {
						return testActualTemplates.simpleComponent(this.$context.name);
					}
				}

				const components = {
					test1: {
						name: 'test1',
						constructor: Component1
					},
					test2: {
						name: 'test2',
						constructor: Component2
					}
				};

				const locator = createLocator({}, components, {});
				const html = `
<html>
<body>
	<cat-test1></cat-test1>

	<cat-test2 id="some"></cat-test2>
	<cat-test2 id="to-find"></cat-test2>
</body>
</html>`;

				const {window} = new JSDOM(html);
				locator.registerInstance('window', window);
				const renderer = new DocumentRenderer(locator);
				return renderer.initWithState({}, {})
					.then(() => {
						assert.strictEqual(found instanceof Component2, true);
						assert.strictEqual(found.$context.element.id, 'to-find');
					});
			});

			it('should find a component by a selector in a parent', function() {
				const selector = '#to-find';
				let found = null;
				class Component1 {
					render() {
						return testActualTemplates.simpleComponent(this.$context.name);
					}
					bind() {
						found = this.$context.queryComponentSelector(selector, this);
					}
				}
				class Component2 {
					render() {
						return testActualTemplates.simpleComponent(this.$context.name);
					}
				}

				const components = {
					test1: {
						name: 'test1',
						constructor: Component1
					},
					test2: {
						name: 'test2',
						constructor: Component2
					}
				};

				const locator = createLocator({}, components, {});
				const html = `
<html>
<body>
	<cat-test1>
		<cat-test2 id="to-find" class="nested"></cat-test2>
		<cat-test2></cat-test2>
	</cat-test1>

	<cat-test2 id="to-find"></cat-test2>
	<cat-test2></cat-test2>
</body>
</html>`;

				const {window} = new JSDOM(html);
				locator.registerInstance('window', window);
				const renderer = new DocumentRenderer(locator);
				return renderer.initWithState({}, {})
					.then(() => {
						assert.strictEqual(found instanceof Component2, true);
						assert.strictEqual(found.$context.element.className, 'nested');
					});
			});

			it('should return null if the element found by class is not a component', function() {
				const selector = '.to-find';
				let found = undefined;
				class Component1 {
					render() {
						return testActualTemplates.simpleComponent(this.$context.name);
					}
					bind() {
						found = this.$context.queryComponentSelector(selector);
					}
				}

				const components = {
					test1: {
						name: 'test1',
						constructor: Component1
					}
				};

				const locator = createLocator({}, components, {});
				const html = `
<html>
<body>
	<cat-test1></cat-test1>
	<cat-test3 class="to-find"></cat-test3>
</body>
</html>`;

				const {window} = new JSDOM(html);
				locator.registerInstance('window', window);
				const renderer = new DocumentRenderer(locator);
				return renderer.initWithState({}, {})
					.then(() => assert.strictEqual(found, null));
			});
		});

		describe('#queryComponentSelectorAll', function() {
			it('should find components by a selector', function() {
				const className = 'to-find';
				let found = null;
				class Component1 {
					render() {
						return testActualTemplates.simpleComponent(this.$context.name);
					}
					bind() {
						found = this.$context.queryComponentSelectorAll(`.${className}`);
					}
				}
				class Component2 {
					render() {
						return testActualTemplates.simpleComponent(this.$context.name);
					}
				}

				const components = {
					test1: {
						name: 'test1',
						constructor: Component1
					},
					test2: {
						name: 'test2',
						constructor: Component2
					}
				};

				const locator = createLocator({}, components, {});
				const html = `
<html>
<body>
	<cat-test1></cat-test1>

	<cat-test2 class="${className}"></cat-test2>
	<cat-test2 class="${className}"></cat-test2>
	<cat-test2 class="${className}"></cat-test2>
	<cat-test2 class="${className}"></cat-test2>
</body>
</html>`;

				const {window} = new JSDOM(html);
				locator.registerInstance('window', window);
				const renderer = new DocumentRenderer(locator);
				return renderer.initWithState({}, {})
					.then(() => {
						assert.strictEqual(found instanceof Array, true);
						assert.strictEqual(found.length, 4);
						assert.strictEqual(found.every(
							item => item instanceof Component2 && item.$context.element.className === 'to-find'
						), true);
					});
			});

			it('should find components by a selector in a parent', function() {
				const className = 'to-find';
				let found = null;
				class Component1 {
					render() {
						return testActualTemplates.simpleComponent(this.$context.name);
					}
					bind() {
						found = this.$context.queryComponentSelectorAll(`.${className}`, this);
					}
				}
				class Component2 {
					render() {
						return testActualTemplates.simpleComponent(this.$context.name);
					}
				}

				const components = {
					test1: {
						name: 'test1',
						constructor: Component1
					},
					test2: {
						name: 'test2',
						constructor: Component2
					}
				};

				const locator = createLocator({}, components, {});
				const html = `
<html>
<body>
	<cat-test1>
		<cat-test2 class="${className} nested"></cat-test2>
		<cat-test2 class="${className} nested"></cat-test2>
	</cat-test1>

	<cat-test2 class="${className}"></cat-test2>
	<cat-test2 class="${className}"></cat-test2>
</body>
</html>`;

				const {window} = new JSDOM(html);
				locator.registerInstance('window', window);
				const renderer = new DocumentRenderer(locator);
				return renderer.initWithState({}, {})
					.then(() => {
						assert.strictEqual(found instanceof Array, true);
						assert.strictEqual(found.length, 2);
						assert.strictEqual(found.every(item =>
							item instanceof Component2 && item.$context.element.className === `${className} nested`
						), true);
					});
			});

			it('should filter elements which are not components', function() {
				const className = 'to-find';
				let found = null;
				class Component1 {
					render() {
						return testActualTemplates.simpleComponent(this.$context.name);
					}
					bind() {
						found = this.$context.queryComponentSelectorAll(`.${className}`);
					}
				}
				class Component2 {
					render() {
						return testActualTemplates.simpleComponent(this.$context.name);
					}
				}

				const components = {
					test1: {
						name: 'test1',
						constructor: Component1
					},
					test2: {
						name: 'test2',
						constructor: Component2
					}
				};

				const locator = createLocator({}, components, {});
				const html = `
<html>
<body>
	<cat-test1></cat-test1>

	<cat-test2 class="${className}"></cat-test2>
	<cat-test2 class="${className}"></cat-test2>
	<cat-test3 class="${className}"></cat-test3>
	<cat-test3 class="${className}"></cat-test3>
</body>
</html>`;

				const {window} = new JSDOM(html);
				locator.registerInstance('window', window);
				const renderer = new DocumentRenderer(locator);
				return renderer.initWithState({}, {})
					.then(() => {
						assert.strictEqual(found instanceof Array, true);
						assert.strictEqual(found.length, 2);
						assert.strictEqual(found.every(item =>
							item instanceof Component2 && item.$context.name === 'test2'
						), true);
					});
			});
		});
	});
});

function createLocator(config, components, stores) {
	const locator = new ServiceLocator();

	locator.registerInstance('componentLoader', {
		load: () => Promise.resolve(),
		getComponentsByNames: () => components
	});
	locator.registerInstance('storeLoader', {
		load: () => Promise.resolve(),
		getStoresByNames: () => stores
	});

	locator.register('contextFactory', ContextFactory, true);
	locator.register('moduleApiProvider', ModuleApiProvider);
	locator.register('cookieWrapper', CookieWrapper);
	locator.register('storeDispatcher', StoreDispatcher);
	locator.registerInstance('serviceLocator', locator);
	locator.registerInstance('config', config);
	const eventBus = new events.EventEmitter();
	eventBus.on('error', () => {});
	locator.registerInstance('eventBus', eventBus);

	return locator;
}
