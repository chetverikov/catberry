/*
 * catberry
 *
 * Copyright (c) 2014 Denis Rechkunov and project contributors.
 *
 * catberry's license follows:
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge,
 * publish, distribute, sublicense, and/or sell copies of the Software,
 * and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 * This license applies to all parts of catberry that are not externally
 * maintained libraries.
 */

'use strict';

var assert = require('assert'),
	testCases = require('../../cases/lib/streams/ComponentReadable.json'),
	ServerResponse = require('../../mocks/ServerResponse'),
	ComponentReadable = require('../../../lib/streams/ComponentReadable');

describe('lib/streams/ComponentReadable', function () {
	describe('#foundComponentHandler', function () {
		testCases.cases.forEach(function (testCase) {
			it(testCase.name, function (done) {
				var concat = '',
					parser = new ComponentReadable(
						createContext(),
						testCase.inputStreamOptions
					);

				parser._isFlushed = true;
				parser._foundComponentHandler = function (tagDetails) {
					var id = tagDetails.attributes.id || '';
					return Promise.resolve(
						'content-' + tagDetails.name + id
					);
				};
				parser.renderHTML(testCase.input);

				parser
					.on('data', function (chunk) {
						concat += chunk;
					})
					.on('end', function () {
						assert.strictEqual(
							concat,
							testCase.expected,
							'Wrong HTML content');
						done();
					});
			});
		});
	});
});

function createContext() {
	return {
		routingContext: {
			middleware: {
				response: new ServerResponse(),
				next: function () {}
			}
		}
	};
}