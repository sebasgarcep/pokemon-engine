/**
 * @typedef {import('./PokemonStateFactory').PokemonBuild} PokemonBuild
 * @typedef {import('./PokemonStateFactory').PokemonState} PokemonState
 */

/**
 * FIXME: keep like an event log that details all events that happen and
 * use a hook to report them to players. This will be useful when building
 * an information model.
 */

/**
 * FIXME: perhaps a more centralized event listener will be better for the architecture.
 */

const seedrandom = require('seedrandom');
const range = require('lodash.range');
const { produce, setAutoFreeze } = require('immer');
const PokemonStateFactory = require('./PokemonStateFactory');
const abilityData = require('../data/abilities');
const itemData = require('../data/items');
const moveData = require('../data/moves');
const pokemonData = require('../data/pokemon');
const typechartData = require('../data/typechart');
const getBoostedValue = require('../utils/getBoostedValue');

// Setting to avoid mistakes during development and testing.
setAutoFreeze(process.env.NODE_ENV !== 'production');

/**
 * @typedef {'setplayers' | 'teampreview' | 'choice' | 'run' | 'switch' | 'end'} Phase
 */

/**
 * @typedef {{ type: 'pass' }} PassAction
 * @typedef {{ type: 'switch', passive: number }} SwitchAction
 * @typedef {{ type: 'move', move: number, target: number }} MoveAction
 * @typedef {PassAction | SwitchAction | MoveAction} Action
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

/**
 * @typedef {Object} FieldState
 */

/**
 * @typedef {Object} Position
 * @property {number} id
 * @property {number} pos
 */

/**
 * @typedef {Object} State
 * @property {Phase} phase
 * @property {number} turn
 * @property {PlayerState[]} players
 * @property {FieldState} field
 * @property {Position[]} order
 * @property {any} seed
 */

/** @type {State} */
const initalState = {
  phase: 'setplayers',
  turn: 0,
  players: [],
  field: null,
  order: [],
  seed: null,
};

class Battle {
  constructor({ hooks = [], state = initalState, format = 'doubles' } = {}) {
    // attributes
    this.hooks = hooks;
    /** @type {State} */
    this.state = state;
    if (format === 'doubles') {
      this.format = { id: format, active: 2, total: 4 };
    } else if (format === 'singles') {
      this.format = { id: format, active: 1, total: 3 };
    } else {
      throw new Error('Format must be either doubles or singles.');
    }

    // methods
    for (const key in Object.keys(this)) {
      if (typeof this[key] === 'function') {
        this[key] = this[key].bind(this);
      }
    }
  }

  /**
   * Updates the current game state and returns it.
   * @param {(state: State) => void} callback
   */
  updateState(callback) {
    this.state = produce(this.state, callback);
    return this.state;
  }

  setPlayer(builds, onTeamPreview, onMove, onForceSwitch, onEnd) {
    const numPlayers = this.state.players.length;
    if (numPlayers >= 2) { throw new Error('Cannot set more than two players.'); }

    const id = numPlayers + 1;
    const opts = {
      onTeamPreview: (...args) => onTeamPreview(this.select.bind(this, id), ...args),
      onMove: (...args) => onMove(this.move.bind(this, id), this.switch.bind(this, id), ...args),
      onForceSwitch: (...args) => onForceSwitch(this.switch.bind(this, id), ...args),
      onEnd,
    };

    this.hooks.push(opts);

    this.updateState(state => {
      state.players.push({
        id,
        builds,
        active: null,
        passive: null,
        actions: null,
        forcedSwitches: null,
      });
    });
  }

  seedRandom() {
    const rng = seedrandom('test_seed', { state: true });
    const seed = rng.state();
    this.updateState(state => {
      state.seed = seed;
    });
  }

  /**
   * Gets a random integer in the range [min, max].
   * @param {State} state
   * @param {number} min
   * @param {number} max
   * @returns {number}
   */
  getRandom(state, min, max) {
    const { seed } = state;
    if (seed === null) { throw new Error('Seed has not been initialized,'); }
    const rng = seedrandom('', { state:seed });
    const value = rng();
    const range = max - min + 1;
    state.seed = seed;
    return Math.floor(range * value) + min;
  }

  getIds() {
    return range(1, this.state.players.length + 1);
  }

  /**
   * Gets the rival's id for a given player id.
   * @param {number} id
   * @returns {number}
   */
  getRivalId(id) {
    return this.state.players.length - id + 1;
  }

  getAllyPosition(pos) {
    return this.format.active - pos + 1;
  }

  /**
   * Gets a battle's current turn.
   * @param {State} state
   * @returns {number}
   */
  getTurn(state) {
    state = state || this.state;
    return state.turn;
  }

  /**
   * Gets a battle's current phase.
   * @param {State} state
   * @returns {Phase}
   */
  getPhase(state) {
    state = state || this.state;
    return state.phase;
  }

  /**
   * Gets player's battle state.
   */
  getCompletePlayerState(playerId) {
    const player = {
      id: playerId,
      active: this.state.players[playerId - 1].active,
      passive: this.state.players[playerId - 1].passive,
    };
    const rivalId = this.getRivalId(playerId);
    const rival = {
      id: rivalId,
      active: this.state.players[rivalId - 1].active
        .map(item => item && { ...item, hp: Math.ceil( item.hp * 48 / item.maxhp ), maxhp: 48 }),
      passive: [], // FIXME: Only show Pokemon that have come out, otherwise set to null or something else.
    };
    const field = this.state.field;
    return { player, rival, field };
  }

  start() {
    if (this.state.players.length < 2) { throw new Error('Both players must be set for the battle to begin.'); }
    this.updateState(state => {
      state.phase = 'teampreview';
    });
    for (const playerId of this.getIds()) {
      const player = {
        id: playerId,
        team: this.state.players[playerId - 1].builds,
      };
      const rivalId = this.getRivalId(playerId);
      const rival = {
        id: rivalId,
        team: this.state.players[rivalId - 1].builds
          .map(item => ({ species: item.species, gender: item.gender })),
      };
      this.hooks[playerId - 1].onTeamPreview(player, rival);
    }
  }

  select(id, choices) {
    choices = choices.filter(item => 1 <= item && item <= 6);
    if (choices.length !== this.format.total) {
      throw new Error(`You must select exactly ${this.format.total} pokemon.`);
    }
    const builds = this.state.players[id - 1].builds;
    const team = choices.map(index => PokemonStateFactory.create(id, builds[index - 1]));
    const active = team.slice(0, this.format.active);
    const passive = [
      ...team.slice(this.format.active, this.format.total),
      ...range(this.format.active).map(() => null),
    ];
    this.updateState(state => {
      state.players[id - 1].active = active;
      state.players[id - 1].passive = passive;
      state.players[id - 1].actions = active.map(() => null);
      state.players[id - 1].forcedSwitches = [];
    });
    // Check for Team Preview end
    const ids = this.getIds();
    if (ids.every(playerId => !!this.state.players[playerId - 1].active)) {
      this.beginBattle();
    }
  }

  /**
   * Initializes and begins current battle.
   */
  beginBattle() {
    this.seedRandom();
    this.initializeField();
    this.triggerOnMove();
  }

  initializeField() {
    this.updateState(state => {
      state.field = {
        global: {},
        sides: this.getIds().map(() => ({})),
      };
    });
  }

  /**
   * Triggers onMove hooks.
   */
  triggerOnMove() {
    this.updateState(state => {
      state.phase = 'choice';
      state.turn += 1;
    });
    const ids = this.getIds();
    for (const playerId of ids) {
      const { player, rival, field } = this.getCompletePlayerState(playerId);
      this.hooks[playerId - 1].onMove(player, rival, field);
    }
  }

  /**
   * Sets a move action.
   * @param {string} id
   * @param {number} activePos
   * @param {number} movePos
   * @param {number} targetPos - 0 = No Target, Positive = Foe Target, Negative = Ally Target
   */
  // FIXME: missing more checks
  move(id, activePos, movePos, targetPos) {
    if (
      activePos < 1
      || activePos > this.format.active
      || movePos < 1
      || movePos > 4
      || targetPos < -this.format.active
      || targetPos > this.format.active
    ) {
      throw new Error('Invalid move input.');
    }
    this.updateState(state => {
      // Move is Valid checks
      const moveState = this.getMove(state, id, 'active', activePos, movePos);
      const move = moveData[moveState.id];
      if (!moveState) { throw new Error('There is no move in this slot.'); }
      if (moveState.disabled) { throw new Error('This move has been disabled.'); }
      if (moveState.pp === 0) { throw new Error('There is no PP left in this move.'); }
      // FIXME: Add Target types valid check
      if (move.target === 'normal') {
        if (targetPos <= 0) { throw new Error('You must choose a foe\'s position.'); }
      } else if (move.target === 'allAdjacentFoes') {
        targetPos = 0;
      } else {
        throw new Error(`Unrecognized target type: ${move.target}.`);
      }
      /** @type {MoveAction} */
      const action = { type: 'move', move: movePos, target: targetPos };
      this.setAction(state, id, activePos, action);
    });
    this.commit();
  }

  // FIXME: missing more checks
  switch(id, activePos, passivePos) {
    if (
      activePos < 1
      || activePos > this.format.active
      || passivePos < 1
      || passivePos > this.format.total) {
      throw new Error('Invalid switch input.');
    }
    this.updateState(state => {
      const passive = this.getPokemon(state, id, 'passive', passivePos);
      if (!passive) { throw new Error('There is not Pokemon in this slot.'); }
      if (passive.hp === 0) { throw new Error('Cannot switch into a fainted Pokemon.'); }
      if (state.phase === 'choice') {
        /** @type {SwitchAction} */
        const action = { type: 'switch', passive: passivePos };
        this.setAction(state, id, activePos, action);
      } else if (state.phase === 'run' || state.phase === 'switch') {
        let { forcedSwitches } = this.state.players[id - 1];
        if (!forcedSwitches.includes(activePos)) { throw new Error('This Pokemon cannot be switched out.'); }
        forcedSwitches = forcedSwitches.filter(item => item !== activePos);
        this.executeSwitch(state, id, activePos, passivePos);
        state.players[id - 1].forcedSwitches = forcedSwitches;
      }
    });
    if (this.state.phase === 'choice') { this.commit(); }
    if (this.state.phase === 'switch') { this.finishForcedSwitches(); }
  }

  clone(opts) {
    return new Battle({
      state: this.state,
      format: this.format.id,
      ...opts,
    });
  }

  /**
   * Gets a Pokemon from a certain slot.
   * @param {State} state
   * @param {number} id
   * @param {'active' | 'passive'} location
   * @param {number} pos
   */
  getPokemon(state, id, location, pos) {
    state = state || this.state;
    return state.players[id - 1][location][pos - 1];
  }

  /**
   * Gets a Pokemon from a certain slot.
   * @param {State} state
   * @param {number} id
   * @param {'active' | 'passive'} location
   * @param {number} pos
   * @param {any} data
   */
  setPokemon(state, id, location, pos, data) {
    state.players[id - 1][location][pos - 1] = data;
  }

  /**
   * Returns a move at a particular location.
   * @param {number} id
   * @param {'active' | 'passive'} location
   * @param {number} pokemonPos
   * @param {number} movePos
   */
  getMove(state, id, location, pokemonPos, movePos) {
    state = state || this.state;
    return this.state.players[id - 1][location][pokemonPos - 1].moves[movePos - 1];
  }

  /**
   * Gets the action associated with a player and an active position.
   * @param {State} state
   * @param {number} id
   * @param {number} pos
   */
  getAction(state, id, pos) {
    state = state || this.state;
    return this.state.players[id - 1].actions[pos - 1];
  }

  /**
   * Sets an action in place.
   * @param {State} state
   * @param {number} id
   * @param {number} pos
   * @param {Action} action
   */
  setAction(state, id, pos, action) {
    state.players[id - 1].actions[pos - 1] = action;
  }

  /**
   * Clears an action slot.
   * @param {State} state
   * @param {number} id
   * @param {number} pos
   */
  clearAction(state, id, pos) {
    state.players[id - 1].actions[pos - 1] = null;
  }

  /**
   * Gets all active positions.
   * @returns {Position[]}
   */
  getActivePositions() {
    const ids = this.getIds();
    const activeIds = [];
    for (const id of ids) {
      for (const pos of range(1, this.format.active + 1)) {
        activeIds.push({ id, pos });
      }
    }
    return activeIds;
  }

  commit() {
    // Check if commands are complete
    if (this.getSlotsMissingAction(null).length > 0) { return; }
    // Execute commands
    this.updateState(state => {
      state.phase = 'run';
    });
    this.runActions();
  }

  runActions() {
    this.performPassActions();
    this.performSwitchActions();
    this.performMoveActions();
    this.performForcedSwitches();
  }

  performPassActions() {
    const activePositions = this.getActivePositions();
    for (const { id, pos } of activePositions) {
      this.updateState(state => {
        const action = this.getAction(state, id, pos);
        if (action.type !== 'pass') { return; }
        // Ignore Pass actions
        this.clearAction(state, id, pos);
      });
    }
  }

  performSwitchActions() {
    const activePositions = this.getActivePositions();
    for (const { id, pos } of activePositions) {
      this.updateState(state => {
        const action = this.getAction(state, id, pos);
        if (action.type !== 'switch') { return; }
        this.executeSwitch(state, id, pos, action.passive);
        this.clearAction(state, id, pos);
      });
    }
  }

  /**
   * Switches two pokemon.
   * @param {State} state
   * @param {number} id
   * @param {number} activePos
   * @param {number} passivePos
   */
  executeSwitch(state, id, activePos, passivePos) {
    if (passivePos === 0) { passivePos = this.getFirstEmptyPassivePosition(state, id); }
    const active = this.getPokemon(state, id, 'active', activePos);
    const passive = this.getPokemon(state, id, 'passive', passivePos);
    // FIXME: do some cleanup like clear volatiles, boosts, etc.
    this.setPokemon(state, id, 'active', activePos, passive);
    this.setPokemon(state, id, 'passive', passivePos, active);
    state.players[id - 1].passive.sort((a, b) => {
      if ((a === null && b === null) || (a !== null && b !== null)) {
        return 0;
      } else if (a === null) {
        return 1;
      } else {
        return -1;
      }
    });
  }

  /**
   * Gets the number for the first unoccupied passive position.
   * @param {State} state
   * @param {number} id
   */
  getFirstEmptyPassivePosition(state, id) {
    state = state || this.state;
    for (const pos of range(1, this.format.total)) {
      if (state.players[id - 1].passive[pos - 1] === null) {
        return pos;
      }
    }
    return null;
  }

  /**
   * Gets a boost for a corresponding stat.
   * @param {State} state
   * @param {number} id
   * @param {number} pos
   * @param {'atk' | 'def' | 'spa' | 'spd' | 'spe' | 'accuracy' | 'evasion'} key
   */
  getBoost(state, id, pos, key) {
    state = state || this.state;
    return state.players[id - 1].active[pos - 1].boosts[key];
  }

  /**
   * Gets a stat taking into account boosts.
   * @param {State} state
   * @param {number} id
   * @param {number} pos
   * @param {'atk' | 'def' | 'spa' | 'spd' | 'spe'} key
   */
  getBoostedStat(state, id, pos, key) {
    state = state || this.state;
    const stat = state.players[id - 1].active[pos - 1].stats[key];
    const boost = this.getBoost(state, id, pos, key);
    return getBoostedValue(key, boost, stat);
  }

  performMoveActions() {
    while (this.getSlotsContainingAction(null).length > 0) {
      this.setOrder();
      const order = this.state.order;
      if (order.length === 0) { break; }
      const [{ id, pos }] = order;
      this.executeMoveAction(id, pos);
    }
  }

  performForcedSwitches() {
    this.updateState(state => {
      state.phase = 'switch';
      for (const id of this.getIds()) {
        const { active, passive } = state.players[id - 1];
        const forcedSwitches = [];
        for (let pos = 1; pos <= this.format.active; pos += 1) {
          if (active[pos - 1] === null) {
            forcedSwitches.push(pos);
          }
        }
        if (forcedSwitches.length === 0) { continue; }
        if (passive.find(item => item && item.hp > 0) === undefined) {
          continue;
        }
        state.players[id - 1].forcedSwitches = forcedSwitches;
      }
    });
    const ids = this.getIds().filter(id => this.state.players[id - 1].forcedSwitches.length > 0);
    if (ids.length === 0) {
      this.finishForcedSwitches();
    } else {
      for (const id of ids) {
        const { player, rival, field } = this.getCompletePlayerState(id);
        this.hooks[id - 1].onForceSwitch(player, rival, field, this.state.players[id - 1].forcedSwitches);
      }
    }
  }

  hasForcedSwitchesLeft(id) {
    const forcedSwitches = this.state.players[id - 1].forcedSwitches;
    return forcedSwitches.length > 0;
  }

  finishForcedSwitches() {
    for (const id of this.getIds()) {
      if (this.hasForcedSwitchesLeft(id)) { return; }
    }
    this.finishRunActions();
  }

  finishRunActions() {
    // Clean up actions
    const activeIds = this.getActivePositions();
    for (const { id, pos } of activeIds) {
      this.updateState(state => {
        if (this.getPokemon(state, id, 'active', pos) === null) {
          this.setAction(state, id, pos, { type: 'pass' });
        } else {
          this.clearAction(state, id, pos);
        }
      });
    }
    // Start next turn
    this.triggerOnMove();
  }

  /**
   * Gets all target positions targeted by a move.
   * @param {State} state
   * @param {number} id
   * @param {string} target
   * @param {number} pos
   * @returns {Position[]}
   */
  getTargetPositions(state, id, target, pos) {
    const targetPositions = [];
    const rivalId = this.getRivalId(id);
    if (target === 'normal') {
      if (this.getPokemon(state, rivalId, 'active', pos)) {
        targetPositions.push({ id: rivalId, pos });
      } else {
        targetPositions.push({ id: rivalId, pos: this.getAllyPosition(pos) });
      }
    } else if (target === 'allAdjacentFoes') {
      for (const activePos of range(1, this.format.total + 1)) {
        if (this.getPokemon(state, rivalId, 'active', activePos)) {
          targetPositions.push({ id: rivalId, pos: activePos });
        }
      }
    }
    return targetPositions;
  }

  getAccuracy(state, id, pos, move, targetId, targetPos) {
    if (move.accuracy === true) {
      return 100;
    }
    const accuracyBoost = this.getBoost(state, id, pos, 'accuracy');
    const evasionBoost = this.getBoost(state, targetId, targetPos, 'evasion');
    const boost = Math.max(-6, Math.min(6, accuracyBoost - evasionBoost));
    const accuracy = getBoostedValue('accuracy', boost, move.accuracy);
    // FIXME: add accuracy modifications
    return accuracy;
  }

  getDamage(state, id, pos, active, move, targetId, targetPos, target) {
    if (move.category === 'status') {
      // FIXME: does not damage
      return null;
    }
    const level = active.build.level;
    /** @type {'atk' | 'spa'} */
    const offenseKey = move.category === 'physical' ? 'atk' : 'spa';
    /** @type {'def' | 'spd'} */
    const defenseKey = move.category === 'physical' ? 'def' : 'spd';
    const offenseStat = this.getBoostedStat(state, id, pos, offenseKey);
    const defenseStat = this.getBoostedStat(state, targetId, targetPos, defenseKey);
    // STAB
    const stabModifier = pokemonData[active.build.species].types.includes(move.type);
    /*
    FIXME: add these to damage calculation
    if (typeModifier === null) {
      return null;
    }
    */
    // Type Effectiveness
    const typeModifier = pokemonData[target.build.species].types.reduce((acc, type) => {
      const modifier = typechartData[type][move.type];
      if (acc == null || modifier === null) { return null; }
      return acc + modifier;
    }, 0);
    if (typeModifier === null) {
      // FIXME: Move is not effective.
      return null;
    }
    // Random Modifier
    const randomModifier = this.getRandom(state, 85, 100);
    const opts = {
      level,
      offenseKey,
      defenseKey,
      offenseStat,
      defenseStat,
      power: move.basePower,
      stabModifier,
      typeModifier,
      randomModifier,
      move,
      active,
      target,
      damage: null,
    };
    this.triggerHooks('onBeforeDamageCalculation', state, opts);
    opts.damage = (((2 * opts.level / 5 + 2) * opts.power * opts.offenseStat / opts.defenseStat) / 50 + 2);
    if (stabModifier) { opts.damage *= 1.5; }
    opts.damage *= Math.pow(2, opts.typeModifier);
    opts.damage *= opts.randomModifier / 100;
    opts.damage = Math.max(1, Math.floor(opts.damage));
    // FIXME: implement other modifiers (Crit, Hooks, etc.)
    return opts;
  }

  /**
   * @param {number} id
   * @param {number} pos
   */
  executeMoveAction(id, pos) {
    this.updateState(state => {
      /** @type {MoveAction} */
      // @ts-ignore
      const action = this.getAction(state, id, pos);
      // FIXME: check if can move, sleep, frozen, volatiles, etc.
      // FIXME: update PP
      // @ts-ignore
      const moveState = this.getMove(state, id, 'active', pos, action.move);
      const move = moveData[moveState.id];
      // Get Targets
      const targetPositions = this.getTargetPositions(state, id, move.target, action.target);
      // Execute each move
      const active = this.getPokemon(state, id, 'active', pos);
      for (const { id: targetId, pos: targetPos } of targetPositions) {
        const accuracy = this.getAccuracy(state, id, pos, move, targetId, targetPos);
        const hitValue = this.getRandom(state, 1, 100);
        if (hitValue > accuracy) {
          // FIXME: hit misses
          continue;
        }
        const target = this.getPokemon(state, targetId, 'active', targetPos);
        const damageOpts = this.getDamage(state, id, pos, active, move, targetId, targetPos, target);
        if (damageOpts !== null) {
          this.triggerHooks('onBeforeDamageApplication', state, damageOpts);
          target.hp = Math.max(0, target.hp - damageOpts.damage);
        }
        if (target.hp > 0) {
          // FIXME: trigger secondary effects
        } else {
          this.executeSwitch(state, targetId, targetPos, 0);
        }
        if (damageOpts !== null) {
          this.triggerHooks('onAfterAttack', state, damageOpts);
        }
      }
      this.clearAction(state, id, pos);
    });
  }

  /**
   * Gets all active slots containing an action.
   * @param {State} state
   * @returns {Position[]}
   */
  getSlotsContainingAction(state) {
    state = state || this.state;
    return this.getActivePositions()
      .filter(({ id, pos }) => {
        return this.getAction(state, id, pos) !== null;
      });
  }

  /**
   * Gets all active slots missing an action.
   * @param {State} state
   * @returns {Position[]}
   */
  getSlotsMissingAction(state) {
    state = state || this.state;
    return this.getActivePositions()
      .filter(({ id, pos }) => {
        return this.getAction(state, id, pos) === null;
      });
  }

  /**
   * Gets all active positions currently occupied.
   * @param {State} state
   */
  getOccupiedActivePositions(state) {
    state = state || this.state;
    return this.getActivePositions()
      .filter(({ id, pos }) => !!this.getPokemon(state, id, 'active', pos));
  }

  // FIXME: this should set the move order according to speed. Priority ties should be handled elsewhere. Speed ties should be handled randomly.
  /**
   * Sets a move order for the Pokemon left to move.
   */
  setOrder() {
    this.updateState(state => {
      const activeIds = this.getOccupiedActivePositions(state);
      const order = activeIds
        .map(item => {
          const action = this.getAction(state, item.id, item.pos);
          if (!action || action.type !== 'move') { return null; }
          const { id: moveId } = this.getMove(state, item.id, 'active', item.pos, action.move);
          const priority = moveData[moveId].priority;
          const speed = this.getBoostedStat(state, item.id, item.pos, 'spe');
          // FIXME: do some speed modifications here, like trick room
          return { ...item, priority, speed };
        })
        .filter(item => item !== null)
        .sort((a, b) => a.priority === b.priority ? b.speed - a.speed : b.priority - a.priority);
      state.order = order;
    });
  }

  /**
   * Triggers all hooks of a given type.
   * @param {string} hookName
   * @param {State} state
   * @param  {any[]} args
   */
  triggerHooks(hookName, state, ...args) {
    // Field
    // FIXME: do this
    const activePositions = this.getActivePositions();
    // FIXME: use speed order
    for (const { id, pos } of activePositions) {
      const entity = this.getPokemon(state, id, 'active', pos);
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

module.exports = Battle;
