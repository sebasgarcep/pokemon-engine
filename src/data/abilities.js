/**
 * @typedef {import('./typedefs').Ability} Ability
 */

/**
 * @type {Object<string, Ability>}
 */

const abilities = {
  chlorophyll: {
    id: 'chlorophyll',
    name: 'Chlorophyll',
    num: 34,
    desc: 'If Sunny Day is active, this Pokemon\'s Speed is doubled.',
    hooks: {

    },
  },
  drought: {
    id: 'drought',
    name: 'Drought',
    num: 70,
    desc: 'On switch-in, this Pokemon summons Sunny Day.',
    hooks: {

    },
  },
  ironfist: {
    id: 'ironfist',
    name: 'Iron Fist',
    num: 89,
    desc: 'This Pokemon\'s punch-based attacks have their power multiplied by 1.2.',
    hooks: {

    },
  },
  magicbounce: {
    id: 'magicbounce',
    name: 'Magic Bounce',
    num: 156,
    desc: 'This Pokemon blocks certain status moves and instead uses the move against the original user.',
    hooks: {

    },
  },
  intimidate: {
    id: 'intimidate',
    name: 'Intimidate',
    num: 22,
    desc: 'On switch-in, this Pokemon lowers the Attack of adjacent opponents by 1 stage.',
    hooks: {

    },
  },
  frisk: {
    id: 'frisk',
    name: 'Frisk',
    num: 119,
    desc: 'On switch-in, this Pokemon identifies the held items of all opposing Pokemon.',
    hooks: {

    },
  },
};

module.exports = abilities;
