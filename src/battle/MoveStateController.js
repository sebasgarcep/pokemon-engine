/**
 * @typedef {Object} MoveBuild
 * @property {string} id
 * @property {number} pp
 */

/**
 * @typedef {Object} MoveState
 * @property {string} id
 * @property {number} pp
 * @property {number} maxpp
 * @property {boolean} disabled
 */

class MoveStateController {
  /**
   * Creates a Move State.
   * @param {MoveBuild} build
   * @returns {MoveState}
   */
  static create(build) {
    return {
      id: build.id,
      pp: build.pp,
      maxpp: build.pp,
      disabled: false,
    };
  }
}

module.exports = MoveStateController;
