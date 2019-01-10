const templates = require('./test-actual-templates');
const expectedTemplates = require('./test-expected-templates');

module.exports = {
  renderComponent: [
    {
      name: 'should render component into HTML element',
      tagName: 'cat-test',
      tagAttributes: {
        id: 'unique',
      },
      components: {
        test: {
          name: 'test',
          constructor: 'SyncComponent',
          templateFunc: (component) => templates.simpleComponent(component.$context.name),
        },
      },
      html: templates.stub(),
      expectedElementContent: 'test<br><div>Hello, World!</div>',
    },
    {
      name: 'should render component if the attributes are not specified',
      tagName: 'cat-test',
      components: {
        test: {
          name: 'test',
          constructor: 'SyncComponent',
          templateFunc: (component) => templates.simpleComponent(component.$context.name),
        },
      },
      html: templates.stub(),
      expectedElementContent: 'test<br><div>Hello, World!</div>',
    },
    {
      name: 'should render asynchronous component into HTML element',
      tagName: 'cat-test',
      tagAttributes: {
        id: 'unique',
      },
      components: {
        test: {
          name: 'test',
          constructor: 'AsyncComponent',
          templateFunc: (component) => Promise.resolve()
            .then(() => templates.simpleComponent(component.$context.name)),
        },
      },
      html: templates.stub(),
      expectedElementContent: 'test<br><div>Hello, World!</div>',
    },
    {
      name: 'should render nested components',
      tagName: 'cat-test1',
      tagAttributes: {
        id: 'unique',
      },
      components: {
        test1: {
          name: 'test1',
          constructor: 'AsyncComponent',
          templateFunc: (component) => Promise.resolve()
            .then(() => templates.nested1(component.$context.name)),
        },
        test2: {
          name: 'test2',
          constructor: 'SyncComponent',
          templateFunc: (component) => templates.nested2(component.$context.name),
        },
        test3: {
          name: 'test3',
          constructor: 'SyncComponent',
          templateFunc: (component) => templates.simpleComponent(component.$context.name),
        },
      },
      html: templates.stub(),
      expectedElementContent: `
        <div>Hello from test1</div>
        <cat-test2>
            <span>Hello from test2
              <cat-test3>
                test3<br><div>Hello, World!</div>
              </cat-test3>
            </span>
        </cat-test2>
        <cat-test3>
          test3<br><div>Hello, World!</div>
        </cat-test3>
      `,
    },
    {
      name: 'should merge HEAD component with new rendered HTML',
      config: {
        isRelease: true,
      },
      tagName: 'head',
      components: {
        head: {
          name: 'head',
          constructor: 'AsyncComponent',
          templateFunc: () => templates.complexHead2(),
        },
      },
      html: templates.stub(),
      elementHTML: templates.complexHead(),
      expectedElementContent: expectedTemplates.mergedHead,
    },
    {
      name: 'should not change HEAD component if new set of elements the same',
      config: {
        isRelease: true,
      },
      tagName: 'head',
      components: {
        head: {
          name: 'head',
          constructor: 'AsyncComponent',
          template: templates.complexHead3(),
        },
      },
      html: templates.stub(),
      elementHTML: templates.complexHead3(),
      expectedElementContent: expectedTemplates.mergedHead2,
    },
    {
      name: 'should render nothing if an error while rendering an error template in release mode',
      config: {
        isRelease: true,
      },
      tagName: 'cat-test',
      tagAttributes: {
        id: 'unique',
      },
      components: {
        test: {
          name: 'test',
          constructor: 'AsyncErrorComponent',
          templateFunc: () => Promise.resolve()
            .then(() => {
              throw new Error('content');
            }),
        },
      },
      html: templates.stub(),
      expectedElementContent: '',
    },
    {
      name: 'should render empty string instead the content when error in release mode',
      config: {
        isRelease: true,
      },
      tagName: 'cat-test',
      tagAttributes: {
        id: 'unique',
      },
      components: {
        test: {
          name: 'test',
          constructor: 'SyncErrorComponent',
          templateFunc: () => {
            throw new Error('some error');
          },
        },
      },
      html: templates.stub(),
      expectedElementContent: '',
    },
    {
      name: 'should do nothing with HEAD when error',
      config: {
        isRelease: true,
      },
      tagName: 'head',
      components: {
        head: {
          name: 'head',
          constructor: 'AsyncErrorComponent',
          templateFunc: () => {
            throw new Error('some error');
          },
        },
      },
      html: templates.stub(),
      elementHTML: templates.complexHead(),
      expectedElementContent: templates.complexHead(),
    },
    {
      name: 'should do nothing if there is no such component',
      config: {
        isRelease: true,
      },
      tagName: 'cat-test',
      tagAttributes: {
        id: 'unique',
      },
      html: templates.stub(),
      expectedElementContent: '',
    },
  ],
};
