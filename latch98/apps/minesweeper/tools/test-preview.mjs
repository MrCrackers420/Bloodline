import assert from 'node:assert/strict';
import { Minefield } from '../web/engine-fallback.js';
const snap = game => JSON.parse(game.snapshot_json());
{
  const game = new Minefield(9, 9, 10, 12345);
  assert.equal(snap(game).status, 0);
  game.tick(); assert.equal(snap(game).seconds, 0);
  game.mark(1, 1); assert.equal(snap(game).cells[10], 1);
  game.mark(1, 1); assert.equal(snap(game).cells[10], 2);
  game.mark(1, 1); assert.equal(snap(game).cells[10], 0);
  game.reveal(4, 4);
  assert.equal(snap(game).status, 1);
  assert.equal(game.cells.filter(c => c.mine).length, 10);
  assert(!game.cells[40].mine);
  assert(game.neighbors(40).every(i => !game.cells[i].mine));
  game.tick(); assert.equal(snap(game).seconds, 1);
}
{
  const game = new Minefield(2, 2, 3, 1);
  game.reveal(0, 0);
  assert.equal(snap(game).status, 2);
  assert.equal(snap(game).remaining, 0);
}
{
  const game = new Minefield(9, 9, 10, 12345);
  game.reveal(0, 0);
  const mine = game.cells.findIndex(c => c.mine);
  game.reveal(mine % 9, Math.floor(mine / 9));
  assert.equal(snap(game).status, 3);
  assert.equal(snap(game).cells[mine], 13);
  game.tick(); assert.equal(snap(game).seconds, 0);
  game.reset(111);
  assert.equal(snap(game).status, 0);
}
{
  const game = new Minefield(16, 16, 40, 12345);
  game.reveal(0, 0);
  for(let i=0; i<game.cells.length; i++) if(!game.cells[i].mine) game.reveal(i%16,Math.floor(i/16));
  assert.equal(snap(game).status, 2);
  assert.equal(snap(game).remaining, 0);
  assert.equal(snap(game).cells.filter(x => x===1).length, 40);
}
{
  const game = new Minefield(9, 9, 10, 12345);
  game.reveal(0, 0);
  const c=game.cells.findIndex((cell,i)=>cell.revealed && cell.adj>0 && game.neighbors(i).some(j=>!game.cells[j].mine && !game.cells[j].revealed));
  assert(c >= 0, 'an exposed numbered tile should be on reveal boundary');
  for (const i of game.neighbors(c)) if(game.cells[i].mine) game.mark(i%9, Math.floor(i/9));
  const count=game.opened;
  game.chord(c%9, Math.floor(c/9));
  assert(game.opened > count);
}
console.log('All six preview engine checks passed.');
