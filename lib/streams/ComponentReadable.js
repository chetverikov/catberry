'use strict';

const stream = require('stream');
const moduleHelper = require('../helpers/moduleHelper');
const hrTimeHelper = require('../helpers/hrTimeHelper');
const errorHelper = require('../helpers/errorHelper');
const Template = require('../Template');

const BODY_TAG = 'body';
const CONTENT_TYPE = 'text/html; charset=utf-8';
const POWERED_BY = 'Catberry';
const IS_CAT_COMPONENT_NAME = /^(head|body|cat-)/i;

class ComponentReadable extends stream.Readable {
  /**
   * Creates a new instance of the parser duplex stream.
   * @param {Object} context Rendering parameters.
   * @param {Object?} options Stream options.
   */
  constructor(context, options) {
    super(options);

    /**
     * Current rendering context.
     * @type {Object}
     * @private
     */
    this._context = context;

    /**
     * Current queue of found tags.
     * @type {Array}
     * @private
     */
    this._templatePartsQueue = [];

    /**
     * Current promise if tag is processing asynchronously.
     * @type {Promise}
     * @private
     */
    this._processingFoundTagPromise = null;

    /**
     * Current HTML delayed for response.
     * @type {string}
     * @private
     */
    this._delayedHTML = '';

    /**
     * Is delayed HTML flushed to the response.
     * @type {boolean}
     * @private
     */
    this._isFlushed = false;

    /**
     * Is rendering process canceled.
     * @type {boolean}
     * @private
     */
    this._isCanceled = false;
  }

  /**
   * Handles the HTML from found tag handler.
   * @param {Template} template Instance of Template
   */
  renderTemplate(template) {
    if (template) {
      this._templatePartsQueue = template.getParts().concat(this._templatePartsQueue);
      this._processingFoundTagPromise = null;
    }

    this.read(0);
  }

  /**
   * Starts rendering the document template.
   */
  renderDocument() {
    // if we did not render anything then start from root template
    if (this._isCanceled || this._context.isDocumentRendered) {
      return;
    }
    this._processingFoundTagPromise = this._foundComponentHandler({
      name: moduleHelper.DOCUMENT_COMPONENT_NAME,
      attributes: Object.create(null),
    });

    if (this._processingFoundTagPromise) {
      this._processingFoundTagPromise = this._processingFoundTagPromise
        .then((template) => this.renderTemplate(template));
    }
  }

  /**
   * Handles found component tags.
   * @param {Object} tagDetails Object with tag details.
   * @returns {Promise<string>|null} Replacement stream of HTML.
   * @private
   */

  /* eslint complexity: 0 */
  _foundComponentHandler(tagDetails) {
    if (this._isCanceled) {
      return null;
    }

    if (tagDetails.name === BODY_TAG) {
      const inlineScript = this._context.routingContext.getInlineScript();

      if (inlineScript) {
        return Promise.resolve(new Template([inlineScript], []));
      }

      return null;
    }

    const componentName = moduleHelper.getOriginalComponentName(tagDetails.name);
    const isDocument = moduleHelper.isDocumentComponent(tagDetails.name);
    const isHead = moduleHelper.isHeadComponent(tagDetails.name);

    if (isDocument) {
      if (this._context.isDocumentRendered) {
        return null;
      }
      this._context.isDocumentRendered = true;
    } else if (isHead) {
      if (this._context.isHeadRendered || !this._context.components[componentName]) {
        return null;
      }
      this._context.isHeadRendered = true;
    }

    const component = this._context.components[componentName];
    if (!component) {
      return null;
    }

    const componentContext = Object.create(this._context);

    componentContext.currentComponent = component;
    componentContext.currentAttributes = tagDetails.attributes;

    return this._renderComponent(componentContext)
      .then((template) => {
        if (!isDocument) {
          this._initializeResponse();
        }
        return template;
      });
  }

  /**
   * Reads the next chunk of data from this stream.
   * @private
   */

  /* jshint maxcomplexity:false */
  _read() {
    if (this._processingFoundTagPromise) {
      this.push('');
      return;
    }

    if (this._templatePartsQueue.length === 0 || this._isCanceled) {
      this.push(null);
      return;
    }

    let toPush = '';
    while (this._templatePartsQueue.length > 0) {
      const templatePart = this._templatePartsQueue.shift();

      if (!isComponentPart(templatePart)) {
        toPush += templatePart.compile();
        continue;
      }

      const tagDetails = Object.create(null);
      tagDetails.name = templatePart.getTagName();
      tagDetails.attributes = templatePart.getAttributes();
      tagDetails.isSelfClosed = templatePart.isSelfClosedTag();

      const processingPromise = this._foundComponentHandler(tagDetails);

      if (!processingPromise) {
        toPush += templatePart.compile();
        continue;
      }

      let compiledHTML = templatePart.compile();

      // we should open self-closed component tags
      // to set content into them
      if (tagDetails.isSelfClosed) {
        compiledHTML = compiledHTML.replace(/\s*\/\w*>$/, '>');
        const part = new Template.Part();

        part.setState(Template.PART_STATES.CONTENT);
        part.addString(`</${tagDetails.name}>`);

        this._templatePartsQueue.unshift(part);
      }


      toPush += compiledHTML;

      this._processingFoundTagPromise = processingPromise.then((template) => this.renderTemplate(template));
      break;
    }

    if (this._isFlushed) {
      this.push(toPush);
      return;
    }

    this._delayedHTML += toPush;

    if (!this._processingFoundTagPromise && this._templatePartsQueue.length === 0) {
      this._initializeResponse();
    }
  }

  /**
   * Renders the component.
   * @param {Object} context Component's rendering context.
   * @return {Promise<Template>} Template
   * @private
   */
  _renderComponent(context) {
    const locator = context.routingContext.locator;
    const component = context.currentComponent;

    if (typeof (component.constructor) !== 'function') {
      return Promise.resolve('');
    }

    component.constructor.prototype.$context = this._getComponentContext(context);

    try {
      context.instance = new component.constructor(locator);
    } catch (e) {
      return moduleHelper.getSafePromise(() => this._handleComponentError(context, e));
    }

    context.instance.$context = component.constructor.prototype.$context;

    const startTime = hrTimeHelper.get();
    const eventArgs = {
      name: component.name,
      context: context.instance.$context,
    };

    const renderMethod = moduleHelper.getMethodToInvoke(context.instance, 'render');
    const isDocument = moduleHelper.isDocumentComponent(component.name);
    const isHead = moduleHelper.isHeadComponent(component.name);

    this._context.eventBus.emit('componentRender', eventArgs);

    return moduleHelper.getSafePromise(renderMethod)
    // if template has been rendered
    // component has been successfully rendered then return html
      .then((template) => {
        if (typeof (template) === 'string') {
          template = new Template([template], []);
        }

        if (typeof (template) !== 'string' && !(template instanceof Template)) {
          template = new Template([''], []);
        }

        eventArgs.hrTime = hrTimeHelper.get(startTime);
        eventArgs.time = hrTimeHelper.toMilliseconds(eventArgs.hrTime);

        this._context.eventBus.emit('componentRendered', eventArgs);

        // TODO: add it to Template as part
        if (!isDocument && !isHead) {
          const inlineScript = context.instance.$context.getInlineScript();
          const part = new Template.Part();

          part.setState(Template.PART_STATES.content);
          part.addString(inlineScript);

          template.parts.unshift(part);
        }

        return template;
      })
      .catch((reason) => this._handleComponentError(context, reason));
  }

  /**
   * Handles a rendering error.
   * @param {Object} context Rendering context.
   * @param {Error} error Rendering error.
   * @return {String} Error string
   *
   * @private
   */
  _handleComponentError(context, error) {
    // if application in debug mode then render
    // error text in component
    const isRelease = Boolean(context.config.isRelease);
    const component = context.currentComponent;

    if (!isRelease && error instanceof Error &&
      !moduleHelper.isDocumentComponent(component.name) &&
      !moduleHelper.isHeadComponent(component.name)) {
      this._context.eventBus.emit('error', error);
      try {
        return errorHelper.prettyPrint(error, context.routingContext.userAgent);
      } catch (e) {
        return '';
      }
    }

    this._context.eventBus.emit('error', error);
    return '';
  }

  /**
   * Gets the component's context using basic context.
   * @param {Object} context Rendering context.
   * @return {Object} Component context.
   * @private
   */
  _getComponentContext(context) {
    const attributes = context.currentAttributes;
    const storeName = attributes[moduleHelper.ATTRIBUTE_STORE];
    const componentContext = Object.create(context.routingContext);
    const storeParams = moduleHelper.getStoreParamsFromAttributes(attributes);
    const storeInstanceId = moduleHelper.getStoreInstanceId(storeName, storeParams);

    componentContext.element = null;
    componentContext.name = context.currentComponent.name;
    componentContext.attributes = attributes;
    componentContext.storeParams = storeParams;
    componentContext.storeInstanceId = storeInstanceId;

    // search methods
    componentContext.getComponentById = nullStub;
    componentContext.getComponentByElement = nullStub;
    componentContext.getComponentsByTagName = arrayStub;
    componentContext.getComponentsByClassName = arrayStub;
    componentContext.queryComponentSelector = nullStub;
    componentContext.queryComponentSelectorAll = arrayStub;

    // create/remove
    componentContext.createComponent = promiseStub;
    componentContext.collectGarbage = promiseStub;

    // store methods
    componentContext.getStoreData =
      () => context.storeDispatcher.getStoreData(storeName, storeParams);
    componentContext.sendAction =
      (name, args) => context.storeDispatcher.sendAction(storeInstanceId, name, args);

    return Object.freeze(componentContext);
  }

  /**
   * Initializes a HTTP response with the required code and headers.
   * @private
   */
  _initializeResponse() {
    if (this._isFlushed) {
      return;
    }
    this._isFlushed = true;

    const routingContext = this._context.routingContext;
    const response = routingContext.middleware.response;

    if (routingContext.actions.redirectedTo) {
      response.writeHead(routingContext.actions.redirectionStatusCode, {
        Location: routingContext.actions.redirectedTo,
      });
      routingContext.actions.redirectedTo = '';
      routingContext.actions.redirectionStatusCode = null;
      this._isCanceled = true;
      this.push(null);
      return;
    }

    if (routingContext.actions.isNotFoundCalled) {
      routingContext.actions.isNotFoundCalled = false;
      this._isCanceled = true;
      routingContext.middleware.next();
      return;
    }

    const headers = {
      'Content-Type': CONTENT_TYPE,
      'X-Powered-By': POWERED_BY,
    };
    if (routingContext.cookie.setCookie.length > 0) {
      headers['Set-Cookie'] = routingContext.cookie.setCookie;
    }
    response.writeHead(200, headers);
    routingContext.cookie.setCookie = [];

    if (this._delayedHTML) {
      this.push(this._delayedHTML);
      this._delayedHTML = '';
    }
  }
}

function isComponentPart(part) {
  return part.isTag() && IS_CAT_COMPONENT_NAME.test(part.tagOptions.name);
}

/**
 * Does nothing as a stub method.
 * @return {null} Always null.
 */
function nullStub() {
  return null;
}

/**
 * Does nothing as a stub method.
 * @return {Promise} Always a promise for null.
 */
function promiseStub() {
  return Promise.resolve(null);
}

/**
 * Does nothing as a stub method.
 * @return {Array} Always an empty array.
 */
function arrayStub() {
  return [];
}

module.exports = ComponentReadable;
