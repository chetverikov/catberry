const matchHtmlRegExp = /["'&<>]/;

/**
 * Escapes special characters and HTML entities in a given html string.
 *
 * @param  {string} string HTML string to escape for later insertion
 * @return {string}
 * @public
 */

function escapeHtml(string) {
  const str = String(string);
  const match = matchHtmlRegExp.exec(str);

  if (!match) {
    return str;
  }

  let escape;
  let html = '';
  let index = match.index;
  let lastIndex = 0;

  while (index < str.length) {
    switch (str.charCodeAt(index)) {
    case 34: // "
      escape = '&quot;';
      break;
    case 38: // &
      escape = '&amp;';
      break;
    case 39: // '
      escape = '&#x27;'; // modified from escape-html; used to be '&#39'
      break;
    case 60: // <
      escape = '&lt;';
      break;
    case 62: // >
      escape = '&gt;';
      break;
    default:
      index++;
      continue;
    }

    if (lastIndex !== index) {
      html += str.substring(lastIndex, index);
    }

    lastIndex = index + 1;
    html += escape;

    index++;
  }

  return lastIndex !== index ? html + str.substring(lastIndex, index) : html;
}
// end code copied and modified from escape-html

/**
 * Escapes text to prevent scripting attacks.
 *
 * @param {any} text Text value to escape.
 * @return {string} An escaped string.
 */
function escapeText(text) {
  if (typeof text === 'boolean' || typeof text === 'number') {
    return String(text);
  }

  if (typeof text !== 'string') {
    return text;
  }

  return escapeHtml(text);
}

module.exports = escapeText;
