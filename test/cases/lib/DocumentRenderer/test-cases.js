const actualTemplates = require('./test-actual-templates.js');
const expectedTemplates = require('./test-expected-templates.js');

module.exports = {
  render: [
    {
      name: 'should render nothing if no such component',
      config: {
        isRelease: true,
      },
      components: {
        document: {
          name: 'document',
          constructor: 'AsyncComponent',
          templateFunc: (component) => actualTemplates.document(component.$context.name),
        },
      },
      expectedHTML: expectedTemplates.noComponents,
    },
    {
      name: 'should ignore second head and document tags',
      config: {
        isRelease: true,
      },
      components: {
        document: {
          name: 'document',
          constructor: 'AsyncComponent',
          templateFunc: (component) => actualTemplates.redundantHeadDocument(component.$context.name),
        },
      },
      expectedHTML: expectedTemplates.redundantHeadDocument,
    },
    {
      name: 'should properly render components without stores',
      config: {
        isRelease: true,
      },
      components: {
        'document': {
          name: 'document',
          constructor: 'AsyncComponent',
          templateFunc: (component) => actualTemplates.documentWithHead(component.$context.name),
        },
        'head': {
          name: 'head',
          constructor: 'AsyncComponent',
          templateFunc: (component) => actualTemplates.head(component.$context.name),
        },
        'comp': {
          name: 'comp',
          constructor: 'SyncComponent',
          templateFunc: (component) => actualTemplates.component(component.$context.name),
        },
        'async-comp': {
          name: 'async-comp',
          constructor: 'AsyncComponent',
          templateFunc: (component) => actualTemplates.component(component.$context.name),
        },
      },
      expectedHTML: expectedTemplates.componentsWithoutStores,
    },
    {
      name: 'should properly render components with stores',
      config: {
        isRelease: true,
      },
      components: {
        'document': {
          name: 'document',
          constructor: 'StoreComponent',
          templateFunc: (component) => actualTemplates.documentWithHeadAndStores(component.$context.attributes['cat-store']),
        },
        'head': {
          name: 'head',
          constructor: 'StoreComponent',
          templateFunc: (component) => actualTemplates.head(component.$context.attributes['cat-store']),
        },
        'comp': {
          name: 'comp',
          constructor: 'StoreComponent',
          templateFunc: (component) => actualTemplates.component(component.$context.attributes['cat-store']),
        },
        'async-comp': {
          name: 'async-comp',
          constructor: 'StoreComponent',
          templateFunc: (component) => actualTemplates.component(component.$context.attributes['cat-store']),
        },
      },
      stores: {
        'store1': {
          name: 'store1',
          constructor: 'SyncDataStore',
        },
        'folder/store2': {
          name: 'folder/store2',
          constructor: 'AsyncDataStore',
        },
      },
      expectedHTML: expectedTemplates.componentsWithStores,
    },
    /*  {
      name: 'should render errors in stores',
      config: {
        isRelease: true
      },
      components: {
        document: {
          name: 'document',
          constructor: 'AsyncComponent',
          templateFunc: component => actualTemplates.documentWithHeadAndStores
        },
        head: {
          name: 'head',
          constructor: 'StoreComponent',
          templateFunc: 'head.html',
          errortemplateFunc: 'error.html'
        },
        comp: {
          name: 'comp',
          constructor: 'StoreComponent',
          templateFunc: 'component.html',
          errortemplateFunc: 'error.html'
        },
        'async-comp': {
          name: 'async-comp',
          constructor: 'StoreComponent',
          templateFunc: 'component.html',
          errortemplateFunc: 'error.html'
        }
      },
      stores: {
        store1: {
          name: 'store1',
          constructor: 'SyncErrorStore'
        },
        'folder/store2': {
          name: 'folder/store2',
          constructor: 'AsyncErrorStore'
        }
      },
      expectedHTML: 'components-with-stores-errors.html'
    },
    {
      name: 'should render errors if stores are not found',
      config: {
        isRelease: true
      },
      components: {
        document: {
          name: 'document',
          constructor: 'AsyncComponent',
          templateFunc: 'document-with-head-and-stores.html'
        },
        head: {
          name: 'head',
          constructor: 'StoreComponent',
          templateFunc: 'head.html',
          errortemplateFunc: 'error.html'
        },
        comp: {
          name: 'comp',
          constructor: 'StoreComponent',
          templateFunc: 'component.html',
          errortemplateFunc: 'error.html'
        },
        'async-comp': {
          name: 'async-comp',
          constructor: 'StoreComponent',
          templateFunc: 'component.html',
          errortemplateFunc: 'error.html'
        }
      },
      expectedHTML: 'components-with-wrong-stores.html'
    },
    {
      name: 'should properly render errors in components',
      config: {
        isRelease: true
      },
      components: {
        document: {
          name: 'document',
          constructor: 'AsyncComponent',
          templateFunc: 'document-with-head.html'
        },
        head: {
          name: 'head',
          constructor: 'AsyncErrorComponent',
          templateFunc: 'head.html',
          errortemplateFunc: 'error.html'
        },
        comp: {
          name: 'comp',
          constructor: 'SyncErrorComponent',
          templateFunc: 'component.html',
          errortemplateFunc: 'error.html'
        },
        'async-comp': {
          name: 'async-comp',
          constructor: 'AsyncErrorComponent',
          templateFunc: 'component.html',
          errortemplateFunc: 'error.html'
        }
      },
      expectedHTML: 'components-with-errors.html'
    },
    {
      name: 'should properly render errors in components\' constructors',
      config: {
        isRelease: true
      },
      components: {
        document: {
          name: 'document',
          constructor: 'AsyncComponent',
          templateFunc: 'document-with-head.html'
        },
        head: {
          name: 'head',
          constructor: 'ConstructorErrorComponent',
          templateFunc: 'head.html',
          errortemplateFunc: 'error.html'
        },
        comp: {
          name: 'comp',
          constructor: 'ConstructorErrorComponent',
          templateFunc: 'component.html',
          errortemplateFunc: 'error.html'
        },
        'async-comp': {
          name: 'async-comp',
          constructor: 'ConstructorErrorComponent',
          templateFunc: 'component.html',
          errortemplateFunc: 'error.html'
        }
      },
      expectedHTML: 'components-with-errors.html'
    },
    {
      name: 'should render nothing if an error template throws an exception',
      config: {
        isRelease: true
      },
      components: {
        document: {
          name: 'document',
          constructor: 'AsyncComponent',
          templateFunc: 'document-with-head.html'
        },
        head: {
          name: 'head',
          constructor: 'AsyncErrorComponent',
          templateFunc: 'head.html',
          errortemplateFunc: 'throw-error.html'
        },
        comp: {
          name: 'comp',
          constructor: 'SyncErrorComponent',
          templateFunc: 'component.html',
          errortemplateFunc: 'throw-error.html'
        },
        'async-comp': {
          name: 'async-comp',
          constructor: 'AsyncErrorComponent',
          templateFunc: 'component.html',
          errortemplateFunc: 'throw-error.html'
        }
      },
      expectedHTML: 'components-with-template-errors.html'
    },
    {
      name: 'should render nothing if document component returns an error',
      config: {
        isRelease: true
      },
      components: {
        document: {
          name: 'document',
          constructor: 'ErrorAsyncComponent',
          templateFunc: 'document-with-head.html'
        },
        head: {
          name: 'head',
          constructor: 'AsyncComponent',
          templateFunc: 'head.html'
        },
        comp: {
          name: 'comp',
          constructor: 'SyncComponent',
          templateFunc: 'component.html'
        },
        'async-comp': {
          name: 'async-comp',
          constructor: 'AsyncComponent',
          templateFunc: 'component.html'
        }
      },
      expectedHTML: ''
    },
    {
      name: 'should render nothing if document component\'s constructor throws an error',
      config: {
        isRelease: true
      },
      components: {
        document: {
          name: 'document',
          constructor: 'ConstructorErrorComponent',
          templateFunc: 'document-with-head.html'
        },
        head: {
          name: 'head',
          constructor: 'AsyncComponent',
          templateFunc: 'head.html'
        },
        comp: {
          name: 'comp',
          constructor: 'SyncComponent',
          templateFunc: 'component.html'
        },
        'async-comp': {
          name: 'async-comp',
          constructor: 'AsyncComponent',
          templateFunc: 'component.html'
        }
      },
      expectedHTML: ''
    },*/

    {
      name: 'should properly render nested components',
      config: {
        isRelease: true,
      },
      components: {
        'document': {
          name: 'document',
          constructor: 'AsyncComponent',
          templateFunc: (component) => actualTemplates.documentWithHead(component.$context.name),
        },
        'head': {
          name: 'head',
          constructor: 'AsyncComponent',
          templateFunc: (component) => actualTemplates.head(component.$context.name),
        },
        'comp': {
          name: 'comp',
          constructor: 'SyncComponent',
          templateFunc: (component) => actualTemplates.componentWithNested(component.$context.name),
        },
        'async-comp': {
          name: 'async-comp',
          constructor: 'AsyncComponent',
          templateFunc: (component) => actualTemplates.componentWithNested(component.$context.name),
        },
        'nested': {
          name: 'nested',
          constructor: 'SyncComponent',
          templateFunc: (component) => actualTemplates.component(component.$context.name),
        },
        'async-nested': {
          name: 'async-nested',
          constructor: 'AsyncComponent',
          templateFunc: (component) => actualTemplates.component(component.$context.name),
        },
      },
      expectedHTML: expectedTemplates.nestedComponents,
    },
  ],
};
