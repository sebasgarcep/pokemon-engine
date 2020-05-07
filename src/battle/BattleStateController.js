/**
 * @typedef {import('./FieldStateController').FieldState} FieldState
 * @typedef {import('./PlayerStateController').PlayerState} PlayerState
 */

const FieldStateController = require('./FieldStateController');

/**
 * @typedef {'setplayers' | 'teampreview' | 'choice' | 'run' | 'end'} Phase
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
   * @returns {BattleState}
   */
  static create() {
    return {
      phase: 'setplayers',
      turn: 0,
      players: [],
      field: FieldStateController.create(),
      order: [],
      seed: null,
    };
  }
}

module.exports = BattleStateController;
