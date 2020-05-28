/**
 * @typedef {import('./BattleStateController').BattleState} BattleState
 */

const BattleStateController = require('./BattleStateController');
const abilityData = require('../data/abilities');
const itemData = require('../data/items');
const weatherData = require('../data/weathers');

class HooksController {
  /**
   * Triggers all hooks of a given type.
   * @param {string} hookName
   * @param {BattleState} state
   * @param  {any[]} args
   */
  static trigger(hookName, state, ...args) {
    // Field
    if (state.field.global.weather) {
      const weatherHook = weatherData[state.field.global.weather.id].hooks[hookName];
      if (weatherHook) { weatherHook(state, null, ...args); }
    }
    // FIXME: do this
    const activePositions = BattleStateController.getActivePositions(state);
    // FIXME: use speed order
    for (const { id, pos } of activePositions) {
      const entity = BattleStateController.getPokemon(state, id, 'active', pos);
      if (!entity) { continue; }
      // Abilities
      const abilityHook = abilityData[entity.ability].hooks[hookName];
      if (abilityHook) { abilityHook(state, entity, ...args); }
      // Items
      const itemHook = itemData[entity.item.id].hooks[hookName];
      if (itemHook) { itemHook(state, entity, ...args); }
      // Status Conditions
      // FIXME: implement this
      // Volatiles
      // FIXME: implement this
    }
  }
}

module.exports = HooksController;
