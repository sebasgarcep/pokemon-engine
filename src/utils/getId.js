/**
 * Converts a string to an ID string.
 * @param {string} text
 */
function getId(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

module.exports.getId = getId;
