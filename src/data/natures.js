/**
 * @typedef {import('./typedefs').Nature} Nature
 */

/**
 * @type {Object<string, Nature>}
 */
const natures = {
  adamant: { id: 'adamant', name: 'Adamant', plus: 'atk', minus: 'spa'},
  bashful: { id: 'bashful', name: 'Bashful', plus: null, minus: null },
  bold: { id: 'bold', name: 'Bold', plus: 'def', minus: 'atk'},
  brave: { id: 'brave', name: 'Brave', plus: 'atk', minus: 'spe'},
  calm: { id: 'calm', name: 'Calm', plus: 'spd', minus: 'atk'},
  careful: { id: 'careful', name: 'Careful', plus: 'spd', minus: 'spa'},
  docile: { id: 'docile', name: 'Docile', plus: null, minus: null },
  gentle: { id: 'gentle', name: 'Gentle', plus: 'spd', minus: 'def'},
  hardy: { id: 'hardy', name: 'Hardy', plus: null, minus: null },
  hasty: { id: 'hasty', name: 'Hasty', plus: 'spe', minus: 'def'},
  impish: { id: 'impish', name: 'Impish', plus: 'def', minus: 'spa'},
  jolly: { id: 'jolly', name: 'Jolly', plus: 'spe', minus: 'spa'},
  lax: { id: 'lax', name: 'Lax', plus: 'def', minus: 'spd'},
  lonely: { id: 'lonely', name: 'Lonely', plus: 'atk', minus: 'def'},
  mild: { id: 'mild', name: 'Mild', plus: 'spa', minus: 'def'},
  modest: { id: 'modest', name: 'Modest', plus: 'spa', minus: 'atk'},
  naive: { id: 'naive', name: 'Naive', plus: 'spe', minus: 'spd'},
  naughty: { id: 'naughty', name: 'Naughty', plus: 'atk', minus: 'spd'},
  quiet: { id: 'quiet', name: 'Quiet', plus: 'spa', minus: 'spe'},
  quirky: { id: 'quirky', name: 'Quirky', plus: null, minus: null },
  rash: { id: 'rash', name: 'Rash', plus: 'spa', minus: 'spd'},
  relaxed: { id: 'relaxed', name: 'Relaxed', plus: 'def', minus: 'spe'},
  sassy: { id: 'sassy', name: 'Sassy', plus: 'spd', minus: 'spe'},
  serious: { id: 'serious', name: 'Serious', plus: null, minus: null },
  timid: { id: 'timid', name: 'Timid', plus: 'spe', minus: 'atk'},
};

module.exports = natures;
