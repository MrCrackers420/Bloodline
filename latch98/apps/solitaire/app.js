/* Latch 98 Solitaire UI, with mouse, touch and keyboard controls. */
(()=>{'use strict';
const {Game,SUITS,red,code}=window.LatchSolitaire;
const $=id=>document.getElementById(id);
const topRow=$('top-row'),tableauRow=$('tableau-row'),board=$('board'),popup=$('popup');
let game=new Game(1),selection=null,message='Ready',drag=null,dragVisual=null,ignoreClickUntil=0,menuVisible=null,hintMark=null;
const rankName=['','A','2','3','4','5','6','7','8','9','10','J','Q','K'];
const safeStat=(name,value)=>{try{localStorage.setItem(name,String(value));}catch{}};
const readStat=name=>{try{return Number(localStorage.getItem(name))||0;}catch{return 0;}};
let gamesWon=readStat('l98.solitaire.wins'),completedThisDeal=false;
const desc=c=>c?`${rankName[c.rank]} of ${['spades','hearts','clubs','diamonds'][c.suit]}`:'';
function cardHtml(c,{zone,col,index,top=0,clickable=true}={}){
 const dat=`data-zone="${zone||''}" data-col="${col??''}" data-index="${index??''}"`;
 if(!c.up)return `<div class="sol-card facedown" ${dat} style="top:${top}" aria-label="Face-down card"><div class="card-back"><div class="back-crest">✥</div></div></div>`;
 const s=SUITS[c.suit],r=rankName[c.rank],court=c.rank>=11,ace=c.rank===1;
 const center=court?`<div class="center royal">${c.rank===11?'♞':c.rank===12?'♛':'♚'}<div style="font-size:.45em;margin-top:4px">${s}</div></div>`:ace?`<div class="center ace">${s}</div>`:`<div class="center pips">${Array.from({length:c.rank},()=>`<span>${s}</span>`).join('')}</div>`;
 return `<div tabindex="0" role="button" aria-label="${desc(c)}" ${dat} class="sol-card faceup ${red(c)?'red':''} ${selection&&selection.zone===zone&&selection.col===col&&selection.index===index?'selected':''}" style="top:${top}" draggable="false"><div class="corner">${r}<span class="suit">${s}</span></div>${center}<div class="corner bottom">${r}<span class="suit">${s}</span></div></div>`;
}
function slot(zone,col,sym=''){
 return `<div class="sol-pile" data-zone="${zone}" data-col="${col??''}"><div class="sol-slot" data-zone="${zone}" data-col="${col??''}">${sym}</div></div>`;
}
function render(){
 let stock=slot('stock',0,game.stock.length?'':'↶');let waste=slot('waste',0,'');
 if(game.stock.length)stock=stock.replace('</div></div>',`</div>${cardHtml({up:false},{zone:'stock',col:0,index:game.stock.length-1})}</div>`);
 if(game.waste.length){const list=game.waste.slice(-Math.min(game.draw,3));const offset=game.waste.length-list.length;
 waste=waste.replace('</div></div>',`</div>${list.map((c,i)=>cardHtml(c,{zone:'waste',col:0,index:offset+i,top:0,clickable:i===list.length-1}).replace('style="top:0"',`style="top:0;left:${Math.min(i,2)*6}px;z-index:${i+1};${i<list.length-1?'pointer-events:none;':''}"`)).join('')}</div>`);
 }
 topRow.innerHTML=stock+waste+slot('spacer',0,'')+game.foundations.map((pile,col)=>slot('foundation',col,SUITS[col]).replace('</div></div>',`</div>${pile.length?cardHtml(pile[pile.length-1],{zone:'foundation',col,index:pile.length-1}):''}</div>`)).join('');
 tableauRow.innerHTML=game.tableau.map((pile,col)=>{
 let hidden=pile.filter(c=>!c.up).length,shown=pile.length-hidden;
 let position=`<div class="sol-pile" data-zone="tableau" data-col="${col}" style="min-height:calc(var(--card-h) + ${hidden} * var(--down-step) + ${Math.max(0,shown-1)} * var(--up-step) + 18px)"><div class="sol-slot" data-zone="tableau" data-col="${col}">K</div>`;
 let down=0,up=0;pile.forEach((c,index)=>{const t=`calc(${down} * var(--down-step) + ${up} * var(--up-step))`;position+=cardHtml(c,{zone:'tableau',col,index,top:t});if(c.up)up++;else down++;});return position+'</div>';
 }).join('');
 $('score').textContent=`Score: ${game.score}`;
 $('timer').textContent=`Time: ${Math.floor(game.seconds/60)}:${String(game.seconds%60).padStart(2,'0')}`;
 $('deal').textContent=`Draw: ${game.draw}`;
 $('message').textContent=message;
 if(hintMark){for(const loc of [hintMark.src,hintMark.dest]){if(!loc||loc.zone==='stock')continue;const s=loc.zone==='tableau'?tableauRow:topRow;const p=s.querySelector(`.sol-pile[data-zone="${loc.zone}"][data-col="${loc.col??0}"]`);p?.classList.add('hinted');}}
}
function closeMenu(){menuVisible=null;popup.classList.remove('visible');document.querySelectorAll('[data-menu]').forEach(b=>b.setAttribute('aria-expanded','false'));}
function setMessage(t){message=t;render();}
function clearTransient(){selection=null;hintMark=null;}
function doMove(src,dest){const ok=game.move(src,dest);if(ok){clearTransient();message=game.won?'You won!':`Moved ${src.zone==='tableau'?'tableau card':'card'}.`;
 if(game.won){onWon();return true;}}
 render();return ok;
}
function readZone(el){const t=el?.closest('[data-zone]');if(!t)return null;return {zone:t.dataset.zone,col:t.dataset.col===''?0:+t.dataset.col,index:t.hasAttribute('data-index')&&t.dataset.index!==''?+t.dataset.index:undefined};}
function choose(target){
 if(!target)return;
 if(target.zone==='stock'){if(game.drawStock()){clearTransient();setMessage(game.stock.length?'Dealt from stock.':'Stock is empty — click again to recycle.');}return;}
 if(target.zone==='spacer')return;
 if(selection&&game.canMove(selection,target)){doMove(selection,target);return;}
 if(selection&&selection.zone===target.zone&&selection.col===target.col&&selection.index===target.index){selection=null;setMessage('Selection cleared.');return;}
 const pile=game.pile(target.zone,target.col),idx=target.index??(pile?.length||0)-1;
 if(target.zone==='foundation'||target.zone==='waste'||target.zone==='tableau'){
   if(pile?.length&&game.validSequence(pile,idx)&&!(target.zone==='foundation'&&selection)){
    selection={zone:target.zone,col:target.col,index:idx};setMessage(`Selected ${desc(pile[idx])}. Choose a destination.`);return;
   }
 }
 selection=null;setMessage('That move is not allowed.');
}
function onWon(){if(!completedThisDeal){completedThisDeal=true;gamesWon++;safeStat('l98.solitaire.wins',gamesWon);safeStat('l98.solitaire.best',Math.max(readStat('l98.solitaire.best'),game.score));}render();openModal('Congratulations!',`You won Solitaire!<br>Final score: <b>${game.score}</b><br>Wins on this computer: ${gamesWon}`);}
function newDeal(draw=game.draw){game=new Game(draw);completedThisDeal=false;clearTransient();message='New game — good luck!';closeMenu();closeModal();render();}
function doUndo(){if(game.undo()){clearTransient();setMessage('Undid last move.');}else setMessage('Nothing to undo.');}
function doHint(){const h=game.hint();hintMark=h;message=h.message;render();}
function openModal(title,content){closeModal();const layer=document.createElement('section');layer.id='sol-modal';layer.className='sol-toast';layer.setAttribute('role','dialog');layer.setAttribute('aria-modal','true');layer.innerHTML=`<h3>${title}</h3><p>${content}</p><button data-modal="close">OK</button>${title==='Congratulations!'?'<button data-modal="new">New Game</button>':''}`;board.append(layer);layer.querySelectorAll('[data-modal]').forEach(b=>b.addEventListener('click',()=>b.dataset.modal==='new'?newDeal():closeModal()));layer.querySelector('button')?.focus();}
function closeModal(){document.getElementById('sol-modal')?.remove();}
function showMenu(which,btn){if(menuVisible===which){closeMenu();return;}menuVisible=which;popup.classList.add('visible');popup.style.left=(btn.offsetLeft+2)+'px';btn.setAttribute('aria-expanded','true');document.querySelectorAll('[data-menu]').forEach(x=>{if(x!==btn)x.setAttribute('aria-expanded','false');});
 const item=(label,cmd,hotkey='',checked=false,disabled=false)=>`<button data-cmd="${cmd}" ${disabled?'class="disabled" disabled':''}><span><span class="sol-tick">${checked?'✓':''}</span>${label}</span><small>${hotkey}</small></button>`;
 popup.innerHTML=which==='game'?
 item('Deal','new','F2')+item('Undo','undo','Ctrl+Z',false,!game.history.length)+item('Hint','hint','H')+'<hr>'+item('Draw One','draw1','',game.draw===1)+item('Draw Three','draw3','',game.draw===3)+'<hr>'+item('Statistics','stats'):
 item('How to Play','rules')+item('Controls','controls')+'<hr>'+item('About Solitaire','about');
}
const instructions=`<div class="sol-help"><p>Build the four foundations from Ace to King, one suit in each pile.</p><p>On the seven columns, build downward in alternating red and black suits. A King can move into an empty column.</p><p>Move face-up sequences together. Select a face-up card and then its destination, or drag cards to their new pile. Double-click the top of a pile to send a card to a foundation.</p><p>Click the face-down stock to deal one or three cards. When empty, click again to turn the waste pile over.</p></div>`;
function command(cmd){closeMenu();switch(cmd){
 case 'new':newDeal();break;case 'undo':doUndo();break;case 'hint':doHint();break;
 case 'draw1':newDeal(1);break;case 'draw3':newDeal(3);break;
 case 'stats':openModal('Statistics',`Total wins: <b>${gamesWon}</b><br>Best score: <b>${readStat('l98.solitaire.best')}</b><br>Current moves: ${game.moves}`);break;
 case 'rules':openModal('How to Play',instructions);break;
 case 'controls':openModal('Controls','Mouse: drag or click to select and place.<br>Touch: tap a card, then tap its destination.<br>Double-click: move to foundation.<br>F2: new game · Ctrl+Z: undo · H: hint · D: deal.');break;
 case 'about':openModal('Latch 98 Solitaire','Classic Klondike with original card graphics.<br>Draw-one and draw-three games.<br>Part of Latch 98.');break;
 }}
document.querySelectorAll('[data-menu]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();showMenu(b.dataset.menu,b);}));
popup.addEventListener('click',e=>{const cmd=e.target.closest('[data-cmd]')?.dataset.cmd;if(cmd)command(cmd);});
document.addEventListener('pointerdown',e=>{if(menuVisible&&!e.target.closest('.sol-menubar'))closeMenu();});
// Pointer handling supports dragging a whole face-up sequence on touch and desktop.
function pointerCard(e){return readZone(e.target);}
function validSource(s){if(!s||s.zone==='stock'||s.zone==='spacer')return false;let p=game.pile(s.zone,s.col);return p?.length&&game.validSequence(p,s.index??p.length-1)&&!game.won;}
board.addEventListener('pointerdown',e=>{if(e.button!==0||e.target.closest('.sol-toast'))return;let s=pointerCard(e);if(!validSource(s))return;const from=e.target.closest('.sol-card');if(!from)return;
 drag={source:s,x:e.clientX,y:e.clientY,moved:false,pointer:e.pointerId};
 try{from.setPointerCapture(e.pointerId);}catch{}
});
board.addEventListener('pointermove',e=>{if(!drag||drag.pointer!==e.pointerId)return;if(!drag.moved&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>8){drag.moved=true;const s=drag.source,c=game.pile(s.zone,s.col)[s.index];dragVisual=document.createElement('div');dragVisual.className='sol-drag';dragVisual.textContent=`${code(c)}${s.zone==='tableau'?' +'+(game.pile('tableau',s.col).length-s.index-1):''}`.replace(' +0','');document.body.append(dragVisual);}if(!drag.moved)return;
 dragVisual.style.left=e.clientX+'px';dragVisual.style.top=e.clientY+'px';document.querySelectorAll('.sol-pile.drop-ok').forEach(p=>p.classList.remove('drop-ok'));
 const dest=readZone(document.elementFromPoint(e.clientX,e.clientY));if(dest&&game.canMove(drag.source,dest)){document.querySelector(`.sol-pile[data-zone="${dest.zone}"][data-col="${dest.col}"]`)?.classList.add('drop-ok');}
});
function drop(e){if(!drag||drag.pointer!==e.pointerId)return;const d=drag;drag=null;if(d.moved){ignoreClickUntil=Date.now()+280;dragVisual?.remove();dragVisual=null;document.querySelectorAll('.sol-pile.drop-ok').forEach(p=>p.classList.remove('drop-ok'));
 const dest=readZone(document.elementFromPoint(e.clientX,e.clientY));if(dest&&game.canMove(d.source,dest))doMove(d.source,dest);else setMessage('Choose a legal destination.');}
}
board.addEventListener('pointerup',drop);board.addEventListener('pointercancel',e=>{if(drag){drag=null;dragVisual?.remove();dragVisual=null;}});
board.addEventListener('click',e=>{if(Date.now()<ignoreClickUntil||e.target.closest('.sol-toast'))return;const s=readZone(e.target);if(s)choose(s);});
board.addEventListener('dblclick',e=>{const src=readZone(e.target);if(validSource(src)&&game.autoFoundation(src)){clearTransient();if(game.won)onWon();else setMessage('Moved to foundation.');}});
board.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('.sol-card[role="button"]')){e.preventDefault();choose(readZone(e.target));}});
document.addEventListener('keydown',e=>{if(e.target.matches('input,textarea'))return;if(e.key==='Escape'){closeMenu();closeModal();selection=null;render();}if(e.key==='F2'){e.preventDefault();newDeal();}if(e.ctrlKey&&e.key.toLowerCase()==='z'){e.preventDefault();doUndo();}if(!e.ctrlKey&&e.key.toLowerCase()==='h'){doHint();}if(!e.ctrlKey&&e.key.toLowerCase()==='d'){if(game.drawStock()){clearTransient();setMessage('Dealt cards.');}}});
setInterval(()=>{if(game.started&&!game.won){game.seconds++;$('timer').textContent=`Time: ${Math.floor(game.seconds/60)}:${String(game.seconds%60).padStart(2,'0')}`;}},1000);
render();
window.__solitaire={getState:()=>game.state(),newGame:newDeal,move:(s,d)=>doMove(s,d),deal:()=>{game.drawStock();render();},undo:doUndo,hint:doHint,engine:()=>game};
})();
