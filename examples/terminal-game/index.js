const TerminalGame = require('./TerminalGame');
const team = require('./team');

const game = new TerminalGame(team, team);
game.start();
