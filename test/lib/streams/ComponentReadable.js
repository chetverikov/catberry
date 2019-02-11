'use strict';

const assert = require('assert');
const testCases = require('../../cases/lib/streams/ComponentReadable.json');
const ServerResponse = require('../../mocks/ServerResponse');
const ComponentReadable = require('../../../lib/streams/ComponentReadable');

/* eslint prefer-arrow-callback:0 */
/* eslint max-nested-callbacks:0 */
/* eslint require-jsdoc:0 */
describe('lib/streams/ComponentReadable', function() {
  describe('#foundComponentHandler', function() {
    testCases.cases.forEach(function(testCase) {
      it(testCase.name, function(done) {
        const parser = new ComponentReadable(
          createContext(),
          testCase.inputStreamOptions
        );

        /* eslint no-underscore-dangle: 0 */
        parser._isFlushed = true;
        parser._foundComponentHandler = (tagDetails) => {
          const id = tagDetails.attributes.id || '';
          return Promise.resolve(
            `content-${tagDetails.name}${id}`
          );
        };
        parser.renderHTML(testCase.input);

        let concat = '';
        parser
          .on('data', function(chunk) {
            concat += chunk;
          })
          .on('end', function() {
            assert.strictEqual(concat, testCase.expected, 'Wrong HTML content');
            done();
          });
      });
    });

    it('should add close tag for self closed component (deep)', function(done) {
      const template = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Some title</title>
        </head>
        <body>
          <div></div>
          <div>Super content here. Place for your advertisements.</div>
          <cat-tag1 id="1" />
        </body>
        </html>`;
      const expectedHTML = `
        <!DOCTYPE html>
        <html>
        <head>content-head
          <title>Some title</title>
        </head>
        <body>content-body
          <div></div>
          <div>Super content here. Place for your advertisements.</div>
          <cat-tag1 id="1"><cat-tag2 data-bind="test" id="2" class="test">content-cat-tag22</cat-tag2></cat-tag1>
        </body>
        </html>`;
      const parser = new ComponentReadable(
        createContext()
      );

      /* eslint no-underscore-dangle: 0 */
      parser._isFlushed = true;
      parser._foundComponentHandler = (tagDetails) => {
        const id = tagDetails.attributes.id || '';

        if (tagDetails.name === 'cat-tag1') {
          return Promise.resolve('<cat-tag2 data-bind="test" id="2" class="test" />');
        }

        return Promise.resolve(
          `content-${tagDetails.name}${id}`
        );
      };

      parser.renderHTML(template);

      let concat = '';
      parser
        .on('data', (chunk) => concat += chunk)
        .on('end', function() {
          assert.strictEqual(concat, expectedHTML, 'Wrong HTML content');
          done();
        });
    });
  });

  describe('#renderDocument', function() {
    it('renders nothing when there is no document', function(done) {
      const parser = new ComponentReadable(createContext());

      parser.renderDocument();

      let concat = '';
      parser
        .on('data', function(chunk) {
          concat += chunk;
        })
        .on('end', function() {
          assert.strictEqual(concat, '', 'Wrong HTML content');
          done();
        });
    });
  });
});

function createContext() {
  return {
    components: Object.create(null),
    routingContext: {
      middleware: {
        response: new ServerResponse(),
        next: () => undefined,
      },
    },
  };
}
