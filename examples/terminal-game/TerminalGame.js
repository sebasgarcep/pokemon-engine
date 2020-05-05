const readline = require('readline');
const { Battle } = require('../../src');
const moveData = require('../../src/data/moves');
const pokemonData = require('../../src/data/pokemon');

class TerminalGame {
  constructor(p1, p2) {
    this.queue = Promise.resolve();
    this.teams = { p1, p2 };
    this.battle = new Battle();
    this.rl = readline.createInterface({ input: process.stdin, output: process.stdout });

    // methods
    for (const key in Object.keys(this)) {
      if (typeof this[key] === 'function') {
        this[key] = this[key].bind(this);
      }
    }
  }

  start() {
    for (const id of ['p1', 'p2']) {
      this.battle.setPlayer(
        id,
        this.teams[id],
        this.onTeamPreview.bind(this),
        this.onMove.bind(this),
        this.onForceSwitch.bind(this),
        this.onEnd.bind(this),
      );
    }
    this.battle.start();
  }

  async prompt(message, callback) {
    const job = this.queue.then(async () => {
      let unfinished = true;
      while (unfinished) {
        try {
          const response = await new Promise((resolve) => this.rl.question(message.trim() + '\n> ', resolve));
          const result = await callback(response);
          unfinished = result || false;
        } catch (error) {
          console.log(error);
        }
      }
    });
    this.queue = job;
    return job;
  }

  onTeamPreview(select, player, rival) {
    let message = `${player.id} team: ${player.team.map(item => item.species).join(', ')}\n`;
    message += `rival: ${rival.team.map(item => item.species).join(', ')}\n`;
    return this.prompt(message, response => {
      const choices = response.replace(/\D/g, '').split('');
      select(choices);
    });
  }

  printLineBreak() {
    console.log('----------');
  }

  formatPokemonState(state, full = false) {
    if (state === null) { return 'fnt'; }
    let message = `${pokemonData[state.build.species].name}`;
    if (state.build.gender !== 'N') { message += ` (${state.build.gender})`; }
    message += ` ${state.hp}/${state.maxhp}`;
    if (full) {
      message += `\n${state.moves.map(item => this.formatMoveState(item)).join(' / ')}`;
    }
    return message;
  }

  formatMoveState(state, full = false) {
    if (!state) { return 'Empty'; }
    const data = moveData[state.id];
    let message = `${data.name}${state.disabled ? ' (disabled)' : ''} ${state.pp}/${state.maxpp}`;
    if (full) {
      message += `\nType: ${data.type} / Power: ${data.basePower}`;
      message += `\n${data.desc}`;
    }
    return message;
  }

  showMoves(input, active) {
    const target = Number.parseInt(input[1]);
    if (
      Number.isNaN(target) ||
      target < 1 ||
      target > this.battle.format.active
    ) {
      throw new Error('Invalid target to show moves.');
    }
    const { moves: moveState } = active[target - 1];
    for (const state of moveState) {
      console.log(this.formatMoveState(state, true));
      this.printLineBreak();
    }
  }

  showTeam(active, passive) {
    const team = [...active, ...passive.filter(item => item !== null)];
    for (const member of team) {
      console.log(this.formatPokemonState(member, true));
      this.printLineBreak();
    }
  }

  showHelp() {
    const message = [
      'Options:',
      '    move <active pokemon slot> <move slot> <target slot>   -- Chooses a move for an active Pokemon.',
      '    switch <active pokemon slot> <passive pokemon slot>    -- Chooses a switch for an active Pokemon.',
      '    show moves <active pokemon slot>                       -- Shows the state of all moves on an active Pokemon.',
      '    show team                                              -- Show the complete team of the current player.',
      '    show field                                             -- Shows the current state of the field.',
      '    show state <active pokemon slot>                       -- Shows the current complete state of an active Pokemon.',
      '    show pokemon                                           -- Show a preview for all Pokemon in the current game (both player and foe).',
      '    show help                                              -- Shows this information.'
    ].join('\n');
    console.log(message);
  }

  requestMove(move, input) {
    const values = input.map(item => Number.parseInt(item, 10));
    move(...values);
  }

  requestSwitch(change, input) {
    const values = input.map(item => Number.parseInt(item, 10));
    change(...values);
  }

  requestShow(player, rival, field, input) {
    const key = input[0];
    if (key === 'moves') {
      this.showMoves(input, player.active);
    } else if (key === 'team') {
      this.showTeam(player.active, player.passive);
    } else if (key === 'field') {
      throw new Error('Not implemented.');
    } else if (key === 'state') {
      throw new Error('Not implemented.');
    } else if (key === 'pokemon') {
      throw new Error('Not implemented.');
    } else if (key === 'help') {
      this.showHelp();
    } else {
      throw new Error('Only moves, team, field, state, pokemon and help are valid options to show.');
    }
  }

  onMove(move, change, player, rival, field) {
    const turn = this.battle.getTurn(null);
    const phase = this.battle.getPhase(null);
    const playerActiveMessage = player.active.map(item => this.formatPokemonState(item)).join(' / ');
    const rivalActiveMessage = rival.active.map(item => this.formatPokemonState(item)).join(' / ');
    let message = `${player.id} team: ${playerActiveMessage}\n`;
    message += `rival: ${rivalActiveMessage}\n`;
    return this.prompt(message, response => {
      const [type, ...input] = response.split(' ');
      if (type === 'move') {
        this.requestMove(move, input);
      } else if (type === 'switch') {
        this.requestSwitch(change, input);
      } else if (type === 'show') {
        this.requestShow(player, rival, field, input);
      } else {
        throw new Error('Only move, switch and show are recognized commands');
      }
      if (
        this.battle.getSlotsMissingAction(null).find(item => item.id === player.id) &&
        turn === this.battle.getTurn(null) &&
        phase === this.battle.getPhase(null)
      ) {
        return true;
      }
    });
  }

  onForceSwitch(change, player, rival, field, forcedSwitches) {
    let message = `${player.id} must switch out these positions: ${forcedSwitches.join(', ')}`;
    const playerPassiveMessage = player.passive
      .filter(state => state !== null)
      .map(state => this.formatPokemonState(state))
      .join(' / ');
    message += `\nTeam: ${playerPassiveMessage}`;
    return this.prompt(message, response => {
      const [type, ...input] = response.split(' ');
      if (type === 'switch') {
        this.requestSwitch(change, input);
      } else if (type === 'show') {
        this.requestShow(player, rival, field, input);
      } else {
        throw new Error('Only switch and show are recognized commands');
      }
      if (this.battle.hasForcedSwitchesLeft(player.id)) {
        return true;
      }
    });
  }

  onEnd() {
    return ;
  }
}

module.exports = TerminalGame;
