/**
 * @typedef {import('./Battle').State} State
 */

/**
 * @typedef {Object} FieldState
 * @property {GlobalFieldState} global
 * @property {SideFieldState[]} sides
 */

/**
 * @typedef {Object} GlobalFieldState
 * @property {WeatherState | null} weather
 * @property {Object} effects
 */

/**
 * @typedef {Object} WeatherState
 * @property {string} id
 * @property {number} turnsLeft
 */

/**
 * @typedef {Object} SideFieldState
 */

class FieldStateController {
  /**
   * Creates a field state.
   * @returns {FieldState}
   */
  static create() {
    return {
      global: {
        weather: null,
        effects: {},
      },
      sides: [],
    };
  }

  /**
   * Sets a weather effect.
   * @param {State} state
   * @param {string} weather
   * @param {number} turnsLeft
   */
  static setWeather(state, weather, turnsLeft) {
    state.field.global.weather = { id: weather, turnsLeft };
  }
}

module.exports = FieldStateController;
