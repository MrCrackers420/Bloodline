const assert=require('node:assert/strict');
const {Game,deck}=require('../engine.js');
let g=new Game(1,()=>.4999);
assert.equal(g.stock.length,24);assert.deepEqual(g.tableau.map(p=>p.length),[1,2,3,4,5,6,7]);assert.ok(g.invariant());
assert.equal(g.tableau.reduce((n,p)=>n+p.filter(c=>c.up).length,0),7);
const snap=g.state();assert.ok(g.drawStock());assert.equal(g.waste.length,1);assert.equal(g.stock.length,23);assert.ok(g.invariant());assert.ok(g.undo());assert.deepEqual(g.state(),snap);
g=new Game(3,()=>.4999);g.drawStock();assert.equal(g.stock.length,21);assert.equal(g.waste.length,3);for(let k=0;k<7;k++)g.drawStock();assert.equal(g.stock.length,0);assert.equal(g.waste.length,24);assert.ok(g.drawStock());assert.equal(g.stock.length,24);assert.equal(g.waste.length,0);assert.ok(g.invariant());g.undo();assert.equal(g.stock.length,0);assert.equal(g.waste.length,24);
// Controlled layout with every card represented once.
function scenario(columns, foundations=[]){const gg=new Game();let cards=deck();for(let c of cards)c.up=false;const get=(suit,rank,up=true)=>{const i=cards.findIndex(c=>c.suit===suit&&c.rank===rank);assert.ok(i>=0);const c=cards.splice(i,1)[0];c.up=up;return c;};gg.tableau=Array.from({length:7},(_,i)=>(columns[i]||[]).map(spec=>get(...spec)));gg.foundations=Array.from({length:4},(_,i)=>(foundations[i]||[]).map(spec=>get(...spec)));gg.stock=cards;gg.waste=[];return gg;}
// ♥7 + ♣6 moves together to black ♣8, reveals ♦9 under ♥7.
g=scenario([[[3,9,false],[1,7],[2,6]],[[2,8]]]);assert.ok(g.canMove({zone:'tableau',col:0,index:1},{zone:'tableau',col:1}));
assert.equal(g.move({zone:'tableau',col:0,index:1},{zone:'tableau',col:1}),true);assert.equal(g.tableau[0][0].up,true);assert.equal(g.score,5);assert.equal(g.tableau[1].length,3);assert.ok(g.invariant());g.undo();assert.equal(g.tableau[0][0].up,false);assert.ok(g.invariant());
// Same color and incorrect ranks refused.
g=scenario([[[1,7]],[[3,8]]]);assert.equal(g.move({zone:'tableau',col:0},{zone:'tableau',col:1}),false);
// Aces can enter empty foundations, 2s follow their own suit only.
g=scenario([[[0,1]],[[0,2]],[[1,2]]]);assert.ok(g.autoFoundation({zone:'tableau',col:0}));assert.ok(g.autoFoundation({zone:'tableau',col:1}));assert.equal(g.autoFoundation({zone:'tableau',col:2}),false);assert.equal(g.foundations[0].length,2);assert.ok(g.invariant());
// Kings only on empty tableau. Foundation-to-tableau permitted with score deduction.
g=scenario([[[0,13]],[[1,12]]]);assert.equal(g.canMove({zone:'tableau',col:0},{zone:'tableau',col:2}),true);assert.equal(g.canMove({zone:'tableau',col:1},{zone:'tableau',col:2}),false);
// Win condition requires exactly 13 cards in each foundation.
g=new Game();g.foundations=[...Array(4)].map((_,s)=>Array.from({length:13},(_,r)=>({id:s*13+r,suit:s,rank:r+1,up:true})));assert.equal(g.checkWin(),true);assert.equal(g.won,true);assert.ok(g.score>0);
// Moving Aces between foundations must not be recommended or permitted.
g=scenario([[[0,2]]],[[[0,1]]]);
assert.equal(g.canMove({zone:'foundation',col:0},{zone:'foundation',col:1}),false);
assert.equal(g.hint().message,'Move 2♠ to a foundation.');
// In positions with no stock, ordinary hinting should offer a foundation retreat.
g=scenario([[[1,3]]],[[[0,1],[0,2]]]);
g.stock=[];g.waste=[];
assert.equal(g.hint().message,'Move 2♠ back to tableau 1.');
// CheckWin is idempotent: later renders or callers cannot grant win bonus again.
g=new Game();g.foundations=[...Array(4)].map((_,s)=>Array.from({length:13},(_,r)=>({id:s*13+r,suit:s,rank:r+1,up:true})));
assert.equal(g.checkWin(),true);const winScore=g.score;
assert.equal(g.checkWin(),true);assert.equal(g.score,winScore);
console.log('Solitaire rules tests passed.');
