'use strict';

const {html} = require('../template');

const ERROR_MESSAGE_REGEXP = /^(?:[\w$]+): (?:.+)\r?\n/i;

module.exports = {

  /**
   * Prints an error with pretty formatting.
   * @param {Error} error The error to print.
   * @param {string} userAgent The user agent information.
   * @return {Template} Template with a HTML text with all information about the error.
   */
  prettyPrint: (error, userAgent) => {
    if (!error || typeof (error) !== 'object') {
      return html``;
    }

    return html`
      <div style="background-color: white; font-size: 12pt;">
        ${(new Date()).toUTCString()};<br/>
        ${userAgent || 'Unknown browser'};<br/>
        Catberry@9.0.0 (
        <a href="https://github.com/catberry/catberry/issues" target="_blank">
          report an issue
        </a>)
        <br/><br/>
        <span style="color: red; font-size: 16pt; font-weight: bold;">
          ${escape(error.name)}: ${escape(error.message)}
        </span>
        <br/><br/>
        ${escape(error.stack).replace(ERROR_MESSAGE_REGEXP, '')}
      </div>
      `;
  },
};

/**
 * Escapes the error text.
 * @param {string} value The error text to escape.
 * @return {string} The escaped and formatted string.
 */
function escape(value) {
  value = String(value || '');
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/\'/g, '&#39;')
    .replace(/\r?\n/g, '<br/>');
}
