/**
 * @typedef {import('./typedefs').Weather} Weather
 */

/**
 * @type {Object<string, Weather>}
 */
const weathers = {
  harshsunlight: {
    id: 'harshsunlight',
    name: 'Harsh Sunlight',
    hooks: {
      onActive: null,
      onBeforeDamageCalculation: (state, _entity, opts) => {
        if (opts.move.type === 'fire') {
          opts.power *= 1.5;
        }
        if (opts.move.type === 'water') {
          opts.power *= 0.5;
        }
      },
      onBeforeDamageApplication: null,
      onAfterAttack: null,
    }
  },
};

module.exports = weathers;
