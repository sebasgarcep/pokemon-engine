/**
 * @typedef {Object} ItemState
 * @property {string} id
 * @property {number} uses
 */

class ItemStateFactory {
  /**
   * Creates an Item state.
   * @param {string} id
   * @returns {ItemState}
   */
  static create(id) {
    return { id, uses: 0 };
  }
}

module.exports = ItemStateFactory;
