const { expect, test } = require('@jest/globals');
const Battle = require('../../../src/battle/Battle');

test('Will initialize', () => {
  const battle = new Battle();
  expect(battle).toEqual(expect.anything());
});
