/**
 * @typedef {import('./BattleStateController').Action} Action
 * @typedef {import('./PokemonStateController').PokemonBuild} PokemonBuild
 * @typedef {import('./PokemonStateController').PokemonState} PokemonState
 */

/**
 * @typedef {Object} PlayerState
 * @property {number} id
 * @property {PokemonBuild[]} builds
 * @property {PokemonState[]} active
 * @property {PokemonState[]} passive
 * @property {(Action | null)[]} actions
 * @property {number[]} forcedSwitches
 */

class PlayerStateController {
  /**
   * Creates a player state.
   * @param {number} id
   * @param {PokemonBuild[]} builds
   * @returns {PlayerState}
   */
  static create(id, builds) {
    return {
      id,
      builds,
      active: null,
      passive: null,
      actions: null,
      forcedSwitches: null,
    };
  }
}

module.exports = PlayerStateController;
