/* Latch 98 Solitaire rules — 1/3 card Klondike. Original implementation. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.LatchSolitaire=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const SUITS=['♠','♥','♣','♦'];
 const red=card=>card&&(card.suit===1||card.suit===3);
 const copy=x=>JSON.parse(JSON.stringify(x));
 const top=pile=>pile[pile.length-1];
 const code=c=>(['','A','2','3','4','5','6','7','8','9','10','J','Q','K'][c.rank]||'?')+SUITS[c.suit];
 function deck(){return Array.from({length:52},(_,i)=>({id:i,suit:Math.floor(i/13),rank:i%13+1,up:false}));}
 function shuffle(cards,rng=Math.random){for(let i=cards.length-1;i>0;i--){let j=Math.floor(rng()*(i+1));[cards[i],cards[j]]=[cards[j],cards[i]];}return cards;}
 class Game{
  constructor(draw=1,rng=Math.random){this.draw=draw===3?3:1;this.newGame(rng);}
  newGame(rng=Math.random){const cards=shuffle(deck(),rng);this.tableau=Array.from({length:7},()=>[]);this.foundations=Array.from({length:4},()=>[]);this.stock=[];this.waste=[];this.score=0;this.seconds=0;this.moves=0;this.started=false;this.won=false;this.recycles=0;this.history=[];
   for(let col=0;col<7;col++){for(let r=0;r<=col;r++){const c=cards.pop();c.up=r===col;this.tableau[col].push(c);}}this.stock=cards;return this;
  }
  state(){return copy({draw:this.draw,tableau:this.tableau,foundations:this.foundations,stock:this.stock,waste:this.waste,score:this.score,seconds:this.seconds,moves:this.moves,started:this.started,won:this.won,recycles:this.recycles});}
  restore(s){for(const [k,v] of Object.entries(s))this[k]=copy(v);return this;}
  record(){this.history.push(this.state());if(this.history.length>120)this.history.shift();}
  undo(){if(!this.history.length)return false;this.restore(this.history.pop());return true;}
  pile(zone,col){if(zone==='waste')return this.waste;if(zone==='tableau')return this.tableau[col];if(zone==='foundation')return this.foundations[col];return null;}
  validSequence(pile,index){if(!pile||index<0||index>=pile.length||!pile[index].up)return false;for(let i=index+1;i<pile.length;i++){if(!pile[i].up||pile[i-1].rank!==pile[i].rank+1||red(pile[i-1])===red(pile[i]))return false;}return true;}
  canMove(src,dest){const a=this.pile(src.zone,src.col),b=this.pile(dest.zone,dest.col);if(!a||!b||a===b||this.won||src.zone==='foundation'&&dest.zone==='foundation')return false;
   let ix=src.index??a.length-1;if(!this.validSequence(a,ix))return false;const chunk=a.slice(ix);
   if(src.zone!=='tableau'&&chunk.length!==1)return false;
   if(dest.zone==='foundation')return chunk.length===1&&(b.length===0?chunk[0].rank===1:top(b).suit===chunk[0].suit&&top(b).rank+1===chunk[0].rank);
   if(dest.zone==='tableau')return b.length===0?chunk[0].rank===13:top(b).up&&top(b).rank===chunk[0].rank+1&&red(top(b))!==red(chunk[0]);
   return false;
  }
  move(src,dest){if(!this.canMove(src,dest))return false;this.record();const a=this.pile(src.zone,src.col),b=this.pile(dest.zone,dest.col),ix=src.index??a.length-1;
   b.push(...a.splice(ix));
   if(src.zone==='tableau'&&a.length&&!top(a).up){top(a).up=true;this.score+=5;}
   if(dest.zone==='foundation')this.score+=10;
   else if(src.zone==='waste')this.score+=5;
   else if(src.zone==='foundation')this.score=Math.max(0,this.score-15);
   this.started=true;this.moves++;
   this.checkWin();return true;
  }
  drawStock(){if(this.won)return false;
   if(this.stock.length){this.record();for(let i=0;i<this.draw&&this.stock.length;i++){let c=this.stock.pop();c.up=true;this.waste.push(c);}this.moves++;this.started=true;return true;}
   if(this.waste.length){this.record();this.stock=this.waste.reverse();for(const c of this.stock)c.up=false;this.waste=[];this.recycles++;this.moves++;this.started=true;return true;}
   return false;
  }
  autoFoundation(src){const pile=this.pile(src.zone,src.col);if(!pile?.length)return false;const index=src.index??pile.length-1;if(index!==pile.length-1)return false;for(let col=0;col<4;col++)if(this.move(src,{zone:'foundation',col}))return true;return false;}
  checkWin(){if(this.won)return true;if(this.foundations.every(p=>p.length===13)){this.won=true;this.score+=Math.max(0,Math.floor(700000/Math.max(30,this.seconds||1)));return true;}return false;}
  hint(){// Favor foundations, then unveiling hidden cards, then ordinary tableau moves.
   const sources=[{zone:'waste'},...this.tableau.map((_,col)=>({zone:'tableau',col}))];
   for(const s of sources){const a=this.pile(s.zone,s.col);if(!a.length)continue;const src={...s,index:a.length-1};for(let col=0;col<4;col++){const dest={zone:'foundation',col};if(this.canMove(src,dest))return {src,dest,message:`Move ${code(a[src.index])} to a foundation.`};}}
   for(const s of sources){const a=this.pile(s.zone,s.col);if(!a.length||s.zone==='foundation')continue;for(let ix=s.zone==='tableau'?a.findIndex(c=>c.up):a.length-1;ix<a.length;ix++){if(ix<0)break;const src={...s,index:ix};for(let col=0;col<7;col++){const dest={zone:'tableau',col};if(this.canMove(src,dest)){
    if(a[ix].rank===13&&s.zone==='tableau'&&ix===0)continue; // avoid moving kings unnecessarily
    return {src,dest,message:`Move ${code(a[ix])} to tableau ${col+1}.`};
   }}}}
   if(this.stock.length||this.waste.length)return {src:{zone:'stock'},dest:null,message:this.stock.length?'Deal from the stock.':'Turn the waste pile over.'};
   // A foundation card can sometimes be brought back to the tableau to unblock a position.
   for(let s=0;s<4;s++){const a=this.foundations[s];if(!a.length)continue;const src={zone:'foundation',col:s,index:a.length-1};for(let col=0;col<7;col++){const dest={zone:'tableau',col};if(this.canMove(src,dest))return {src,dest,message:`Move ${code(a[src.index])} back to tableau ${col+1}.`};}}
   return {src:null,dest:null,message:'No available moves found. Try Undo or a new deal.'};
  }
  invariant(){const seen=new Set();let count=0;for(const pile of [...this.tableau,...this.foundations,this.stock,this.waste])for(const c of pile){if(seen.has(c.id))return false;seen.add(c.id);count++;}return count===52;}
 }
 return {Game,SUITS,red,code,deck,shuffle};
});
