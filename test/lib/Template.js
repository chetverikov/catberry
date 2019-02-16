'use strict';

const assert = require('assert');
const Template = require('../../lib/Template');

describe('lib/Template', function() {
  it('should escape data', () => {
    const unsafeData = '"><script></script><p a="';
    const escapeData = '&quot;&gt;&lt;script&gt;&lt;/script&gt;&lt;p a=&quot;';
    const template = Template.html`
        <!-- Comment ${unsafeData} -->
        <p>${unsafeData}</p>
        <div class="${unsafeData}">
            ${unsafeData}
            <div>
              <div>
                  <div>${unsafeData}</div>
              </div>
            </div>
        </div>
    `;
    const expectedHTMLString = `
        <!-- Comment ${escapeData} -->
        <p>${escapeData}</p>
        <div class="${escapeData}">
            ${escapeData}
            <div>
              <div>
                  <div>${escapeData}</div>
              </div>
            </div>
        </div>
    `;

    assert.strictEqual(template.compile(), expectedHTMLString);
  });

  it('should compile a complex template correctly', function() {
    const id = 1;
    const value = '"><script></script><p a="';
    const content = 'I\'m component';
    const comment = 'I\'m comment';
    const tagName = 'cat-my-comp';
    const embeddedClass = 'wat';

    const embedded = Template.html`<h1>Awesome!</h1><div class="${embeddedClass}"></div>`;
    const template = Template.html`
      <!doctype html>
      <html lang="en">
      <head></head>
      <body>
        <p>Hello world</p>
        <!-- Comment ${comment} -->
        
        <div class="container">
          <cat-component
            single-quote-attribute='${id}'
            single-without-quote-attribute=${id}
            id="${id}" 
            value="${value}"
            i-will-be-stay="${true}"
            i-will-be-skipped="${undefined}"
            i-will-be-skipped-too="${false}">
                ${content}
          </cat-component>
          <cat-awesome>
            ${embedded}
          </cat-awesome>
          <${tagName}/>${comment}
          <${tagName}></${tagName}>
        </div>
      </body>
      </html>
    `;
    const expectedHTMLString = `
      <!doctype html>
      <html lang="en">
      <head></head>
      <body>
        <p>Hello world</p>
        <!-- Comment I&#x27;m comment -->
        
        <div class="container">
          <cat-component
            single-quote-attribute='1'
            single-without-quote-attribute=1
            id="1" 
            value="&quot;&gt;&lt;script&gt;&lt;/script&gt;&lt;p a=&quot;"
            i-will-be-stay="true">
                I&#x27;m component
          </cat-component>
          <cat-awesome>
            <h1>Awesome!</h1><div class="wat"></div>
          </cat-awesome>
          <cat-my-comp/>I&#x27;m comment
          <cat-my-comp></cat-my-comp>
        </div>
      </body>
      </html>
    `;

    const actualHTMLString = template.compile();

    assert.strictEqual(compactHTML(actualHTMLString), compactHTML(expectedHTMLString));
  });

  it('should the second compilation faster than the first', function() {
    const comment = 'I\'m comment';
    const id = 1;
    const value = '"><script></script><p a="';
    const content = 'I\'m component';
    const tagName = 'cat-my-comp';
    const embeddedClass = 'wat';
    const nulled = null;

    // TODO first: 0.127ms
    // TODO second: 0.036ms

    let firstCompilation = now();

    const embedded = Template.html`<h1>Awesome!</h1><div class="${embeddedClass}"></div>`;
    const template = Template.html`
      <!doctype html>
      <html lang="en">
      <head>${comment}</head>
      <body>
        <p>Hello world</p>
        <!-- Comment ${comment} -->
        
        <div class="embedded">${embedded}</div>
        
        <div class="container">
          <cat-component 
            id="${id}" 
            value="${value}" 
            i-will-be-skipped="${nulled}">
                ${content}
          </cat-component>
          <cat-awesome></cat-awesome>
          <${tagName} />
          <${tagName}></${tagName}>
        </div>
      </body>
      </html>
    `;

    template.compile();

    firstCompilation = now() - firstCompilation;

    template.setValues([
      'I\'m comment 2',
      'I\'m comment 2',
      embedded,
      2,
      'simpleValue',
      undefined,
      'I\'m component 2',
      'cat-my-comp2',
      'cat-my-comp2',
      'cat-my-comp2',
    ]);

    let secondCompilation = now();

    template.compile();

    secondCompilation = now() - secondCompilation;

    // console.log(`${(firstCompilation / 1000).toFixed(3)}ms > ${(secondCompilation / 1000).toFixed(3)}ms`);

    assert.ok(firstCompilation > secondCompilation);
  });
});

function now() {
  const hr = process.hrtime();
  return (hr[0] * 1e9 + hr[1]) / 1e3;
}

function compactHTML(html) {
  return html.replace(/[\n\t]+/, '');
}
