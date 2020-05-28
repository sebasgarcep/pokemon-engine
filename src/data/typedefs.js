/**
 * @typedef {import('../battle/BattleStateController').BattleState} BattleState
 * @typedef {import('../battle/PokemonStateController').PokemonState} PokemonState
 */

/**
 * @callback HookFunction
 * @param {BattleState} state
 * @param {PokemonState} entity
 * @param {...any} [other]
 */

/**
 * @typedef {Object} Hooks
 * @property {HookFunction} [onActive]
 * @property {HookFunction} [onBeforeSpeedCalculation]
 * @property {HookFunction} [onBeforeDamageCalculation]
 * @property {HookFunction} [onBeforeDamageApplication]
 * @property {HookFunction} [onAfterAttack]
 */

/**
 * @typedef {Object} Item
 * @property {string} id
 * @property {string} name
 * @property {number} num
 * @property {string} desc
 * @property {Hooks} hooks
 */

/**
  * @typedef {Object} Move
  * @property {string} id
  * @property {string} name
  * @property {number} num
  * @property {number | true} accuracy
  * @property {number} basePower
  * @property {'physical' | 'special' | 'status'} category
  * @property {string} desc
  * @property {string} target
  * @property {Type} type
  * @property {number} priority
  * @property {string | null} [status]
  * @property {string | null} [volatile]
  * @property {SecondaryEffects | null} [secondary]
  * @property {{ boosts: Boosts } | null} [self]
  * @property {string | null} [effect]
  * @property {MoveFlags} flags
  */

/**
 * @typedef {Object} MoveFlags
 * @property {number} [authentic]
 * @property {number} [bullet]
 * @property {number} [charge]
 * @property {number} [contact]
 * @property {number} [defrost]
 * @property {number} [heal]
 * @property {number} [mirror]
 * @property {number} [mystery]
 * @property {number} [nonsky]
 * @property {number} [powder]
 * @property {number} [protect]
 * @property {number} [punch]
 * @property {number} [reflectable]
 * @property {number} [sound]
 */

/**
 * @typedef {Object} SecondaryEffects
 * @property {Boosts | null} [boosts]
 * @property {number} chance
 * @property {string | null} [status]
 * @property {string | null} [volatile]
 */

/**
 * @typedef {Object} Pokemon
 * @property {string} id
 * @property {string} name
 * @property {number} num
 * @property {string[]} types
 * @property {Spread} baseStats
 * @property {number} height
 * @property {number} weight
 * @property {boolean} canEvolve
 */

/**
 * @typedef {Object} Nature
 * @property {string} id
 * @property {string} name
 * @property {string | null} plus
 * @property {string | null} minus
 */

/**
 * @typedef {Object} Spread
 * @property {number} hp
 * @property {number} atk
 * @property {number} def
 * @property {number} spa
 * @property {number} spd
 * @property {number} spe
 */

/**
 * @typedef {Object} Boosts
 * @property {number} atk
 * @property {number} def
 * @property {number} spa
 * @property {number} spd
 * @property {number} spe
 * @property {number} accuracy
 * @property {number} evasion
 */

/**
 * @typedef {Object} Ability
 * @property {string} id
 * @property {string} name
 * @property {number} num
 * @property {string} desc
 * @property {Hooks} hooks
 */

/**
 * @typedef {Object} Weather
 * @property {string} id
 * @property {string} name
 * @property {Hooks} hooks
 */

/**
 * @typedef {'bug' | 'dark' | 'dragon' | 'electric' | 'fairy' | 'fighting' | 'fire' | 'flying' | 'ghost' | 'grass' | 'ground' | 'ice' | 'normal' | 'poison' | 'psychic' | 'rock' | 'steel' | 'water'} Type
 */

/**
 * @typedef {Object<Type, -1 | 0 | 1 | null>} TypeChart
 */

module.exports = null;
