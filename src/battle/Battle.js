/**
 * @typedef {import('./BattleStateController').Action} Action
 * @typedef {import('./BattleStateController').Phase} Phase
 * @typedef {import('./BattleStateController').Position} Position
 * @typedef {import('./BattleStateController').BattleState} BattleState
 * @typedef {import('./BattleStateController').Format} Format
 * @typedef {import('./PokemonStateController').PokemonState} PokemonState
 */

/**
 * FIXME: keep like an event log that details all events that happen and
 * use a hook to report them to players. This will be useful when building
 * an information model.
 */

const seedrandom = require('seedrandom');
const { produce, setAutoFreeze } = require('immer');
const BattleStateController = require('./BattleStateController');
const HooksController = require('./HooksController');
const PlayerStateController = require('./PlayerStateController');
const PokemonStateController = require('./PokemonStateController');
const moveData = require('../data/moves');
const pokemonData = require('../data/pokemon');
const typechartData = require('../data/typechart');
const getBoostedValue = require('../utils/getBoostedValue');

// Setting to avoid mistakes during development and testing.
setAutoFreeze(process.env.NODE_ENV !== 'production');

class Battle {
  constructor({ hooks = [], state = null, format = 'doubles' } = {}) {
    // attributes
    /** @private */
    this.hooks = hooks;
    this.state = state || BattleStateController.create(format);

    // methods
    for (const key in Object.keys(this)) {
      if (typeof this[key] === 'function') {
        this[key] = this[key].bind(this);
      }
    }
  }

  /**
   * Runs a state-altering action.
   * @private
   * @param {string} type
   * @param  {...any} args
   */
  dispatch(type, ...args) {
    const prevState = this.state;
    const state = produce(prevState, state => {
      this.reducer(state, type, ...args);
    });
    this.state = state;
    this.triggerSideEffects(state, prevState);
  }

  /**
   * In charge of managing all updates to the state.
   * @private
   * @param {BattleState} state
   * @param {string} type
   * @param  {...any} args
   */
  reducer(state, type, ...args) {
    if (type === 'setPlayer') {
      // @ts-ignore
      this.onSetPlayer(state, ...args);
    } else if (type === 'start') {
      this.onStart(state);
    } else if (type === 'select') {
      // @ts-ignore
      this.onSelect(state, ...args);
    } else if (type === 'beginBattle') {
      // @ts-ignore
      this.onBeginBattle(state, ...args);
    } else if (type === 'setAction') {
      // @ts-ignore
      this.onSetAction(state, ...args);
    } else if (type === 'beginRun') {
      state.phase = 'run';
    } else if (type === 'executeAction') {
      this.setOrder(state);
      // @ts-ignore
      this.onExecuteAction(state);
    } else if (type === 'startNextTurn') {
      this.setNextTurn(state);
    } else if (type === 'setForcedSwitches') {
      const [forcedSwitches] = args;
      for (const id of BattleStateController.getIds(state)) {
        state.players[id - 1].forcedSwitches = forcedSwitches[id - 1];
      }
    } else if (type === 'executeForcedSwitches') {
      const [id] = args;
      this.onExecuteForcedSwitches(state, id);
    }
  }

  /**
   * Reponds to the execute forced switches event.
   * @private
   * @param {BattleState} state
   * @param {number} id
   */
  onExecuteForcedSwitches(state, id) {
    const shouldExecuteForcedSwitches = state.players[id - 1]
      .forcedSwitches
      .every(pos => {
        const action = this.getAction(state, id, pos);
        return !!action && action.type === 'switch';
      });
    if (shouldExecuteForcedSwitches) {
      for (const pos of state.players[id - 1].forcedSwitches) {
        const action = this.getAction(state, id, pos);
        // @ts-ignore
        this.executeSwitch(state, id, pos, action.passive);
      }
      this.sortPassive(state, id);
    }
  }

  /**
   * In charge of triggering side effects according to state changes.
   * @private
   * @param {BattleState} state
   * @param {BattleState} prevState
   */
  triggerSideEffects(state, prevState) {
    if (prevState.phase === 'setplayers' && state.phase === 'teampreview') {
      this.triggerOnTeamPreview();
    }
    if (state.phase === 'teampreview') {
      // Check for Team Preview end
      const ids = BattleStateController.getIds(state);
      if (ids.every(playerId => !!this.state.players[playerId - 1].active)) {
        this.beginBattle();
      }
    }
    if (prevState.turn !== state.turn) {
      this.triggerOnMove(state);
    }
    if (state.phase === 'choice') {
      this.commitActions(state);
    }
    if (state.phase === 'run') {
      const shouldTriggerForcedSwitches = !!this.state.players.find(item => item.forcedSwitches.length > 0);
      if (shouldTriggerForcedSwitches) {
        this.triggerOnForceSwitch(state, prevState);
      } else {
        const shouldExecuteAction = this.state.players.find(item => item.actions.find(action => !!action));
        if (shouldExecuteAction) {
          this.dispatch('executeAction');
        } else {
          this.startNextTurn();
        }
      }
    }
  }

  /**
   * Triggers onForceSwitch hook.
   * @private
   * @param {BattleState} state
   * @param {BattleState} prevState
   */
  triggerOnForceSwitch(state, prevState) {
    for (const id of BattleStateController.getIds(state)) {
      if (
        state.players[id - 1].forcedSwitches.length > 0 &&
        prevState.players[id - 1].forcedSwitches.length === 0
      ) {
        const { player, rival, field } = this.getCompletePlayerState(state, id);
        this.hooks[id - 1].onForceSwitch(player, rival, field, this.state.players[id - 1].forcedSwitches);
      }
    }
  }

  /**
   * Starts next turn, or sets up forced switches if cannot start due to fainted Pokemon.
   * @private
   */
  startNextTurn() {
    let shouldStartNextTurn = true;
    const forcedSwitches = this.state.players.map(() => []);
    for (const id of BattleStateController.getIds(this.state)) {
      const { active, passive } = this.state.players[id - 1];
      for (const pos of BattleStateController.getPos(this.state)) {
        if (active[pos - 1] === null) {
          forcedSwitches[id - 1].push(pos);
        }
      }
      if (forcedSwitches[id - 1].length === 0) { continue; }
      if (passive.find(item => item && item.hp > 0) === undefined) { continue; }
      shouldStartNextTurn = false;
    }
    if (shouldStartNextTurn) {
      this.dispatch('startNextTurn');
    } else {
      this.dispatch('setForcedSwitches', forcedSwitches);
    }
  }

  /**
   * Trigger onMove hooks.
   * @private
   */
  triggerOnTeamPreview() {
    for (const playerId of BattleStateController.getIds(this.state)) {
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

  /**
   * Sets a player.
   * @public
   * @param {any} builds
   * @param {any} onTeamPreview
   * @param {any} onMove
   * @param {any} onForceSwitch
   * @param {any} onEnd
   */
  setPlayer(builds, onTeamPreview, onMove, onForceSwitch, onEnd) {
    this.dispatch('setPlayer', builds, onTeamPreview, onMove, onForceSwitch, onEnd);
  }

  /**
   * Responds to a set player event.
   * @private
   * @param {BattleState} state
   * @param {any} builds
   * @param {any} onTeamPreview
   * @param {any} onMove
   * @param {any} onForceSwitch
   * @param {any} onEnd
   */
  onSetPlayer(state, builds, onTeamPreview, onMove, onForceSwitch, onEnd) {
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
    state.players.push(PlayerStateController.create(id, builds));
    state.field.sides.push({});
  }

  /**
   * Gets a random integer in the range [min, max].
   * @private
   * @param {BattleState} state
   * @param {number} min
   * @param {number} max
   * @returns {number}
   */
  getRandom(state, min, max) {
    const { seed } = state;
    if (seed === null) { throw new Error('Seed has not been initialized,'); }
    const rng = seedrandom('', { state: seed });
    const value = rng();
    const range = max - min + 1;
    state.seed = rng.state();
    return Math.floor(range * value) + min;
  }

  /**
   * Gets the rival's id for a given player id.
   * @private
   * @param {number} id
   * @returns {number}
   */
  getRivalId(id) {
    return this.state.players.length - id + 1;
  }

  /**
   * Gets the position of the ally Pokemon, given the active Pokemon position.
   * @private
   * @param {BattleState} state
   * @param {number} pos
   * @returns {number}
   */
  getAllyPosition(state, pos) {
    return state.format.active - pos + 1;
  }

  /**
   * Gets a battle's current turn.
   * @public
   * @param {BattleState} [state]
   * @returns {number}
   */
  getTurn(state) {
    state = state || this.state;
    return state.turn;
  }

  /**
   * Gets a battle's current turn.
   * @public
   * @param {BattleState} [state]
   * @returns {Format}
   */
  getFormat(state) {
    state = state || this.state;
    return state.format;
  }

  /**
   * Gets a battle's current phase.
   * @public
   * @param {BattleState} [state]
   * @returns {Phase}
   */
  getPhase(state) {
    state = state || this.state;
    return state.phase;
  }

  /**
   * Gets player's battle state.
   * @private
   * @param {BattleState} state
   * @param {number} playerId
   */
  getCompletePlayerState(state, playerId) {
    const player = {
      id: playerId,
      active: state.players[playerId - 1].active,
      passive: state.players[playerId - 1].passive,
    };
    const rivalId = this.getRivalId(playerId);
    const rival = {
      id: rivalId,
      active: state.players[rivalId - 1].active
        .map(item => item && { ...item, hp: Math.ceil( item.hp * 48 / item.maxhp ), maxhp: 48 }),
      passive: [], // FIXME: Only show Pokemon that have come out, otherwise set to null or something else.
    };
    const field = state.field;
    return { player, rival, field };
  }

  /**
   * Starts the battle.
   * @public
   */
  start() {
    this.dispatch('start');
  }

  /**
   * Responds to the start event.
   * @private
   * @param {BattleState} state
   */
  onStart(state) {
    if (this.state.players.length < 2) { throw new Error('Both players must be set for the battle to begin.'); }
    state.phase = 'teampreview';
  }

  /**
   * Selects the subset of the team that will fight.
   * @private
   * @param {number} id
   * @param {number[]} choices
   */
  select(id, choices) {
    this.dispatch('select', id, choices);
  }

  /**
   * Responds to the select event.
   * @private
   * @param {BattleState} state
   * @param {number} id
   * @param {number[]} choices
   */
  onSelect(state, id, choices) {
    choices = choices.filter(item => 1 <= item && item <= 6);
    if (choices.length !== state.format.total) {
      throw new Error(`You must select exactly ${state.format.total} pokemon.`);
    }
    const positions = BattleStateController.getPos(state);
    const builds = this.state.players[id - 1].builds;
    const active = positions.map(() => null);
    const passive = choices.map(index => PokemonStateController.create(id, builds[index - 1]));
    state.players[id - 1].active = active;
    state.players[id - 1].passive = passive;
    state.players[id - 1].actions = positions.map(pos => ({ type: 'switch', passive: pos }));
    state.players[id - 1].forcedSwitches = positions;
  }

  /**
   * Initializes and begins current battle.
   * @private
   */
  beginBattle() {
    this.dispatch('beginBattle');
  }

  /**
   * Responds to the begin battle event.
   * @private
   * @param {BattleState} state
   */
  onBeginBattle(state) {
    // Seeds the RNG
    const rng = seedrandom('test_seed', { state: true });
    const seed = rng.state();
    state.seed = seed;
    // Bring out leading Pokemon
    for (const id of BattleStateController.getIds(state)) {
      this.onExecuteForcedSwitches(state, id);
    }
    // Start next turn
    this.setNextTurn(state);
  }

  /**
   * Sets the next turn's start.
   * @private
   * @param {BattleState} state
   */
  setNextTurn(state) {
    // Clean up actions
    const activeIds = BattleStateController.getActivePositions(state);
    for (const { id, pos } of activeIds) {
      if (BattleStateController.getPokemon(state, id, 'active', pos) === null) {
        this.onSetAction(state, id, pos, { type: 'pass' });
      } else {
        this.clearAction(state, id, pos);
      }
    }
    // Update turns left
    // FIXME: tick down turns left
    // FIXME: trigger on end turn
    // Update turn
    state.phase = 'choice';
    state.turn += 1;
  }

  /**
   * Triggers onMove hooks.
   * @private
   * @param {BattleState} state
   */
  triggerOnMove(state) {
    const ids = BattleStateController.getIds(state);
    for (const playerId of ids) {
      const { player, rival, field } = this.getCompletePlayerState(state, playerId);
      this.hooks[playerId - 1].onMove(player, rival, field);
    }
  }

  /**
   * Sets an action for an active position.
   * @private
   * @param {number} id
   * @param {number} pos
   * @param {Action} action
   */
  setAction(id, pos, action) {
    this.dispatch('setAction', id, pos, action);
  }

  /**
   * Sets a move action.
   * @private
   * @param {number} id
   * @param {number} activePos
   * @param {number} movePos
   * @param {number} targetPos - 0 = No Target, Positive = Foe Target, Negative = Ally Target
   */
  // FIXME: missing more checks
  move(id, activePos, movePos, targetPos) {
    if (
      activePos < 1
      || activePos > this.state.format.active
      || movePos < 1
      || movePos > 4
      || targetPos < -this.state.format.active
      || targetPos > this.state.format.active
    ) {
      throw new Error('Invalid move input.');
    }
    // Move is Valid checks
    const moveState = this.getMove(this.state, id, 'active', activePos, movePos);
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
    this.setAction(id, activePos, { type: 'move', move: movePos, target: targetPos });
  }

  // FIXME: missing more checks
  /**
   * Switches pokemon between active and passive slots.
   * @private
   * @param {number} id
   * @param {number} activePos
   * @param {number} passivePos
   */
  switch(id, activePos, passivePos) {
    if (
      activePos < 1
      || activePos > this.state.format.active
      || passivePos < 1
      || passivePos > this.state.format.total) {
      throw new Error('Invalid switch input.');
    }
    const passive = BattleStateController.getPokemon(this.state, id, 'passive', passivePos);
    if (!passive) { throw new Error('There is not Pokemon in this slot.'); }
    if (passive.hp === 0) { throw new Error('Cannot switch into a fainted Pokemon.'); }
    if (this.state.phase === 'run') {
      if (!this.state.players[id - 1].forcedSwitches.includes(activePos)) {
        throw new Error('This Pokemon cannot be switched out.');
      }
    }
    this.setAction(id, activePos, { type: 'switch', passive: passivePos });
    if (this.state.phase === 'run') { this.dispatch('executeForcedSwitches', id); }
  }

  // TODO: Solve this
  /**
   * Clones the current battle state.
   * @public
   * @param {any} opts
   */
  clone(opts) {
    return new Battle({
      state: this.state,
      format: this.state.format.id,
      ...opts,
    });
  }

  /**
   * Gets a Pokemon from a certain slot.
   * @private
   * @param {BattleState} state
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
   * @private
   * @param {BattleState} state
   * @param {number} id
   * @param {'active' | 'passive'} location
   * @param {number} pokemonPos
   * @param {number} movePos
   */
  getMove(state, id, location, pokemonPos, movePos) {
    return state.players[id - 1][location][pokemonPos - 1].moves[movePos - 1];
  }

  /**
   * Gets the action associated with a player and an active position.
   * @private
   * @param {BattleState} state
   * @param {number} id
   * @param {number} pos
   */
  getAction(state, id, pos) {
    return state.players[id - 1].actions[pos - 1];
  }

  /**
   * Sets an action in place.
   * @private
   * @param {BattleState} state
   * @param {number} id
   * @param {number} pos
   * @param {Action} action
   */
  onSetAction (state, id, pos, action) {
    state.players[id - 1].actions[pos - 1] = action;
  }

  /**
   * Clears an action slot.
   * @private
   * @param {BattleState} state
   * @param {number} id
   * @param {number} pos
   */
  clearAction(state, id, pos) {
    state.players[id - 1].actions[pos - 1] = null;
  }

  /**
   * Detects whether all actions have been set and responds accordingly.
   * @private
   * @param {BattleState} state
   */
  commitActions(state) {
    // Check if commands are complete
    if (this.getSlotsMissingAction(state).length > 0) { return; }
    // Execute commands
    this.dispatch('beginRun');
  }

  /**
   * Returns the next action to be executed for a given type.
   * @private
   * @param {BattleState} state
   */
  getNextActionPosition(state) {
    const activePositions = BattleStateController.getActivePositions(state)
      .sort((aPosition, bPosition) => {
        const aAction = this.getAction(state, aPosition.id, aPosition.pos);
        const bAction = this.getAction(state, bPosition.id, bPosition.pos);
        let aTier;
        if (!aAction) { aTier = 4; }
        else if (aAction.type === 'pass') { aTier = 1; }
        else if (aAction.type === 'switch') { aTier = 2; }
        else { aTier = 3; }
        let bTier;
        if (!bAction) { bTier = 4; }
        else if (bAction.type === 'pass') { bTier = 1; }
        else if (bAction.type === 'switch') { bTier = 2; }
        else { bTier = 3; }
        if (aTier !== bTier) { return aTier - bTier; }
        if (!aAction || !bAction || aAction.type !== 'move' || bAction.type !== 'move') { return 0; }
        const aMove = this.getMove(state, aPosition.id, 'active', aPosition.pos, aAction.move);
        const bMove = this.getMove(state, bPosition.id, 'active', bPosition.pos, bAction.move);
        const aPriority = moveData[aMove.id].priority;
        const bPriority = moveData[bMove.id].priority;
        if (aPriority !== bPriority) { return bPriority - aPriority; }
        const aItem = state.order.find(item => item.id === aPosition.id && item.pos === aPosition.pos);
        const bItem = state.order.find(item => item.id === bPosition.id && item.pos === bPosition.pos);
        if (aItem.speed !== bItem.speed) { return bItem.speed - aItem.speed; }
        return bItem.randomFactor - aItem.randomFactor;
      });
    return activePositions[0];
  }

  /**
   * Responds to the execute action event.
   * @private
   * @param {BattleState} state
   */
  onExecuteAction(state) {
    const position = this.getNextActionPosition(state);
    const { id, pos } = position;
    const action = this.getAction(state, id, pos);
    if (action.type === 'switch') {
      this.executeSwitch(state, id, pos, action.passive);
    } else if (action.type === 'move') {
      this.executeMove(state, id, pos, action.move, action.target);
    }
    this.clearAction(state, id, pos);
  }

  /**
   * Switches two pokemon.
   * @private
   * @param {BattleState} state
   * @param {number} id
   * @param {number} activePos
   * @param {number} passivePos
   */
  executeSwitch(state, id, activePos, passivePos) {
    let shouldSort = false;
    if (passivePos === 0) {
      shouldSort = true;
      passivePos = this.getFirstEmptyPassivePosition(state, id);
    }
    const active = BattleStateController.getPokemon(state, id, 'active', activePos);
    const passive = BattleStateController.getPokemon(state, id, 'passive', passivePos);
    // FIXME: do some cleanup like clear volatiles, boosts, etc.
    this.setPokemon(state, id, 'active', activePos, passive);
    this.setPokemon(state, id, 'passive', passivePos, active);
    state.players[id - 1].forcedSwitches = state.players[id - 1].forcedSwitches.filter(item => item !== activePos);
    state.players[id - 1].actions[activePos - 1] = null;
    if (shouldSort) { this.sortPassive(state, id); }
    HooksController.trigger('onActive', state, passive);
  }

  /**
   * Sorts the passive Pokemon of a player.
   * @private
   * @param {BattleState} state
   * @param {number} id
   */
  sortPassive(state, id) {
    state.players[id - 1].passive.sort((a, b) => {
      return Number(!!b) - Number(!!a);
    });
  }

  /**
   * Gets the number for the first unoccupied passive position.
   * @private
   * @param {BattleState} state
   * @param {number} id
   */
  getFirstEmptyPassivePosition(state, id) {
    for (const pos of BattleStateController.getTotalPos(state)) {
      if (BattleStateController.getPokemon(state, id, 'passive', pos) === null) {
        return pos;
      }
    }
    return null;
  }

  /**
   * Gets a boost for a corresponding stat.
   * @private
   * @param {BattleState} state
   * @param {number} id
   * @param {number} pos
   * @param {'atk' | 'def' | 'spa' | 'spd' | 'spe' | 'accuracy' | 'evasion'} key
   */
  getBoost(state, id, pos, key) {
    return state.players[id - 1].active[pos - 1].boosts[key];
  }

  /**
   * Gets a stat taking into account boosts.
   * @private
   * @param {BattleState} state
   * @param {number} id
   * @param {number} pos
   * @param {'atk' | 'def' | 'spa' | 'spd' | 'spe'} key
   */
  getBoostedStat(state, id, pos, key) {
    const stat = state.players[id - 1].active[pos - 1].stats[key];
    const boost = this.getBoost(state, id, pos, key);
    return getBoostedValue(key, boost, stat);
  }

  /**
   * Gets all target positions targeted by a move.
   * @private
   * @param {BattleState} state
   * @param {number} id
   * @param {string} target
   * @param {number} pos
   * @returns {Position[]}
   */
  getTargetPositions(state, id, target, pos) {
    const targetPositions = [];
    const rivalId = this.getRivalId(id);
    if (target === 'normal') {
      if (BattleStateController.getPokemon(state, rivalId, 'active', pos)) {
        targetPositions.push({ id: rivalId, pos });
      } else {
        targetPositions.push({ id: rivalId, pos: this.getAllyPosition(state, pos) });
      }
    } else if (target === 'allAdjacentFoes') {
      for (const activePos of BattleStateController.getPos(state)) {
        if (BattleStateController.getPokemon(state, rivalId, 'active', activePos)) {
          targetPositions.push({ id: rivalId, pos: activePos });
        }
      }
    }
    return targetPositions;
  }

  /**
   * Gets the accuracy for a move.
   * @private
   * @param {BattleState} state
   * @param {number} id
   * @param {number} pos
   * @param {any} move
   * @param {number} targetId
   * @param {number} targetPos
   */
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

  /**
   * Gets damage from a move.
   * @private
   * @param {BattleState} state
   * @param {number} id
   * @param {number} pos
   * @param {PokemonState} active
   * @param {any} move
   * @param {number} targetId
   * @param {number} targetPos
   * @param {PokemonState} target
   */
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
    HooksController.trigger('onBeforeDamageCalculation', state, opts);
    opts.damage = (((2 * opts.level / 5 + 2) * opts.power * opts.offenseStat / opts.defenseStat) / 50 + 2);
    if (stabModifier) { opts.damage *= 1.5; }
    opts.damage *= Math.pow(2, opts.typeModifier);
    opts.damage *= opts.randomModifier / 100;
    // FIXME: implement other modifiers (Crit, Hooks, etc.)
    return opts;
  }

  /**
   * Executes a move's efects.
   * @private
   * @param {BattleState} state
   * @param {number} id
   * @param {number} pos
   * @param {number} movePos
   * @param {number} targetPos
   */
  executeMove(state, id, pos, movePos, targetPos) {
    // FIXME: check if can move, sleep, frozen, volatiles, etc.
    // FIXME: update PP
    // @ts-ignore
    const moveState = this.getMove(state, id, 'active', pos, movePos);
    const move = moveData[moveState.id];
    // Get Targets
    const targetPositions = this.getTargetPositions(state, id, move.target, targetPos);
    // Execute each move
    const active = BattleStateController.getPokemon(state, id, 'active', pos);
    const attackOpts = { active, didDamage: false };
    for (const { id: targetId, pos: targetPos } of targetPositions) {
      const accuracy = this.getAccuracy(state, id, pos, move, targetId, targetPos);
      const hitValue = this.getRandom(state, 1, 100);
      if (hitValue > accuracy) {
        // FIXME: hit misses
        continue;
      }
      const target = BattleStateController.getPokemon(state, targetId, 'active', targetPos);
      const damageOpts = this.getDamage(state, id, pos, active, move, targetId, targetPos, target);
      if (damageOpts !== null) {
        HooksController.trigger('onBeforeDamageApplication', state, damageOpts);
        attackOpts.didDamage = true;
        PokemonStateController.subtractHp(target, damageOpts.damage);
      }
      if (target.hp > 0) {
        // FIXME: trigger secondary effects
      } else {
        this.executeSwitch(state, targetId, targetPos, 0);
      }
    }
    HooksController.trigger('onAfterAttack', state, attackOpts);
  }

  /**
   * Gets all active slots missing an action.
   * @public
   * @param {BattleState} [state]
   * @returns {Position[]}
   */
  getSlotsMissingAction(state) {
    state = state || this.state;
    return BattleStateController.getActivePositions(state)
      .filter(({ id, pos }) => {
        return this.getAction(state, id, pos) === null;
      });
  }

  /**
   * Gets all active positions currently occupied.
   * @private
   * @param {BattleState} state
   */
  getOccupiedActivePositions(state) {
    return BattleStateController.getActivePositions(state)
      .filter(({ id, pos }) => !!BattleStateController.getPokemon(state, id, 'active', pos));
  }

  /**
   * Sets a move order for the Pokemon left to move.
   * @private
   * @param {BattleState} state
   */
  setOrder(state) {
    const order = this.getOccupiedActivePositions(state)
      .map(item => {
        const speed = this.getBoostedStat(state, item.id, item.pos, 'spe');
        // FIXME: do some speed modifications here, like trick room
        const randomFactor = this.getRandom(state, 1, 1000);
        return { ...item, speed, randomFactor };
      })
      .filter(item => item !== null)
      .sort((a, b) => b.speed - a.speed || b.randomFactor - a.randomFactor);
    state.order = order;
  }

  /**
   * Gets whether a player still has forced switched left to make.
   * @public
   * @param {BattleState} state
   * @param {number} id
   */
  hasForcedSwitchesLeft(state, id) {
    state = state || this.state;
    return state.players[id - 1].forcedSwitches.length > 0;
  }
}

module.exports = Battle;
