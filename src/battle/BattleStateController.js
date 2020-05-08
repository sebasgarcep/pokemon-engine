/**
 * @typedef {import('./FieldStateController').FieldState} FieldState
 * @typedef {import('./PlayerStateController').PlayerState} PlayerState
 */

const range = require('lodash.range');
const FieldStateController = require('./FieldStateController');

/**
 * @typedef {'setplayers' | 'teampreview' | 'choice' | 'run' | 'end'} Phase
 */

/**
 * @typedef {Object} Format
 * @property {string} id
 * @property {number} active
 * @property {number} total
 */

/**
 * @typedef {{ type: 'pass' }} PassAction
 * @typedef {{ type: 'switch', passive: number }} SwitchAction
 * @typedef {{ type: 'move', move: number, target: number }} MoveAction
 * @typedef {PassAction | SwitchAction | MoveAction} Action
 */

/**
 * @typedef {Object} Position
 * @property {number} id
 * @property {number} pos
 */

/**
 * @typedef {Object} BattleState
 * @property {Format} format
 * @property {Phase} phase
 * @property {number} turn
 * @property {PlayerState[]} players
 * @property {FieldState} field
 * @property {{ id: number, pos: number, speed: number, randomFactor: number }[]} order
 * @property {any} seed
 */

class BattleStateController {
  /**
   * Creates a battle state.
   * @param {string} formatId
   * @returns {BattleState}
   */
  static create(formatId) {
    let format;
    if (formatId === 'doubles') {
      format = { id: format, active: 2, total: 4 };
    } else if (formatId === 'singles') {
      format = { id: format, active: 1, total: 3 };
    } else {
      throw new Error('Format must be either doubles or singles.');
    }
    return {
      format,
      phase: 'setplayers',
      turn: 0,
      players: [],
      field: FieldStateController.create(),
      order: [],
      seed: null,
    };
  }

  /**
   * Gets a Pokemon from a certain slot.
   * @param {BattleState} state
   * @param {number} id
   * @param {'active' | 'passive'} location
   * @param {number} pos
   */
  static getPokemon(state, id, location, pos) {
    return state.players[id - 1][location][pos - 1];
  }

  /**
   * Gets all player ids.
   * @param {BattleState} state
   * @returns {number[]}
   */
  static getIds(state) {
    return range(1, state.players.length + 1);
  }

  /**
   * Gets all active pos.
   * @param {BattleState} state
   * @returns {number[]}
   */
  static getPos(state) {
    return range(1, state.format.active + 1);
  }

  /**
   * Gets all active pos.
   * @param {BattleState} state
   * @returns {number[]}
   */
  static getTotalPos(state) {
    return range(1, state.format.total + 1);
  }

  /**
   * Gets all active positions.
   * @param {BattleState} state
   * @returns {Position[]}
   */
  static getActivePositions(state) {
    const activeIds = [];
    for (const id of BattleStateController.getIds(state)) {
      for (const pos of BattleStateController.getPos(state)) {
        activeIds.push({ id, pos });
      }
    }
    return activeIds;
  }
}

module.exports = BattleStateController;
