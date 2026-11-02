/* LatchNet 98 — pages hosted within the Latch Browser. */
(()=>{'use strict';
const HOME='http://www.latchnet.l98/';
const sites={
 latchnet:{host:'www.latchnet.l98',title:'LatchNet — Your Starting Point',icon:'🌐',desc:'Search and explore the LatchNet directory.',tags:'search homepage directory portal internet'},
 pixelshelf:{host:'www.pixelshelf.l98',title:'PixelShelf Software Library',icon:'💾',desc:'Downloads, games, freeware reviews and utilities.',tags:'downloads minesweeper games software'},
 norn:{host:'www.nornobserver.l98',title:'The Norn Observer',icon:'🥚',desc:'Rumors and investigations surrounding a closed research facility.',tags:'norn creatures laboratory rumors closed facility genetics'},
 grain:{host:'www.grainexchange.l98',title:'The Grain Exchange',icon:'🌾',desc:'A local farm bulletin board and seed-trading notices.',tags:'farm wheat corn bread seeds harvest market'},
 bloodline:{host:'www.ironwire.l98',title:'Ironwire Bulletin',icon:'⚙️',desc:'Unsolved reports from the borderlands.',tags:'bloodline rumors underground mystery steel blood'},
 postbox:{host:'www.postbox.l98',title:'Postbox WebMail',icon:'✉️',desc:'Electronic mail, letters and your outbox.',tags:'email mail messages correspondence'},
 town:{host:'www.townwire.l98',title:'TownWire — Local News',icon:'📰',desc:'Local news, classifieds and community updates.',tags:'news town newspaper classifieds'},
 guestbook:{host:'www.asterpage.l98',title:"Aster's World Wide Web Page",icon:'⭐',desc:'Personal homepage, favorite links and a working guestbook.',tags:'personal homepage guestbook visitors'},
 dialup:{host:'www.dialupcommons.l98',title:'Dial-Up Commons — Forum Archive',icon:'📟',desc:'Archived discussions, message threads and repair tips.',tags:'forums message boards dial-up radio archives'},
 savepoint:{host:'www.savepoint.l98',title:'SavePoint — Game Reviews',icon:'🎮',desc:'Letters, reviews and reader scores for local computer games.',tags:'review games bloodline minesweeper solitaire'},
 lantern:{host:'www.lanternhouse.l98',title:'Lantern House — Personal Homepage',icon:'🏠',desc:'A retired sound engineer collects recordings and signal maps.',tags:'homepages personal radio music signals tapes broadcast'},
 relic:{host:'www.relicmirror.l98',title:'RelicMirror — Old Link Index',icon:'🔗',desc:'Dead links, captured site listings and archived web fragments.',tags:'obsolete links mirror 404 archive history'}
};
const siteUrl=id=>'http://'+sites[id].host+'/';
const pageUrl=(id,path='')=>siteUrl(id)+String(path).replace(/^\/+/, '');
const pageLink=(id,path,label)=>`<a href="${esc(pageUrl(id,path))}" data-ln-url="${esc(pageUrl(id,path))}">${esc(label)}</a>`;
const link=(id,label)=>`<a href="${siteUrl(id)}" data-ln-url="${siteUrl(id)}">${label||sites[id].title}</a>`;
const foot=(id)=>`<div class="ln-site-foot">© 2003 ${sites[id].title.replace(/ — .*/, '')}<br>${link('latchnet','Return to the LatchNet directory')}</div>`;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// The Latch 98 story takes place in October 2003, not the host computer's year.
const nowDate=()=> 'Oct 16, 2003';
const storeRead=(key,fallback)=>{try{const raw=localStorage.getItem('latchnet.'+key);if(!raw||raw.length>100000)return fallback;const v=JSON.parse(raw);return v??fallback;}catch{return fallback;}};
const storeWrite=(key,value)=>{try{localStorage.setItem('latchnet.'+key,JSON.stringify(value));return true;}catch{return false;}};
const clip=(s,n)=>String(s??'').slice(0,n);
const safeRecords=(key,max=30)=>{const raw=storeRead(key,[]);if(!Array.isArray(raw))return [];return raw.slice(0,max).filter(v=>v&&typeof v==='object').map(v=>({name:clip(v.name,30),message:clip(v.message,250),when:clip(v.when,32),to:clip(v.to,80),subject:clip(v.subject,100),body:clip(v.body,2000)}));};
const safeFavorites=(items)=>Array.isArray(items)?[...new Set(items.slice(0,80).filter(x=>typeof x==='string').map(x=>normalize(x)).filter(x=>parse(x).id&&x!==HOME+'favorites'))].slice(0,32):[];
const listings=(ids)=>ids.map(id=>`<tr><td style="text-align:center">${sites[id].icon}</td><td>${link(id,esc(sites[id].title))}<br><span class="ln-small">${esc(sites[id].desc)}</span></td></tr>`).join('');
function portal(query=''){
 const needle=query.trim().toLowerCase();
 const matched=Object.keys(sites).filter(id=>id!=='latchnet'&&(!needle||(`${sites[id].title} ${sites[id].desc} ${sites[id].tags}`).toLowerCase().includes(needle)));
 return `<div class="ln-page">
 <div class="ln-banner"><h1>🌐 LatchNet</h1><div>Your starting point on the World Wide Web</div></div>
 <div style="text-align:center;font:12px Arial;margin:9px 0">Home | ${link('town','News')} | ${link('pixelshelf','Downloads')} | ${link('postbox','Mail')} | ${link('guestbook','Personal Pages')}</div>
 <div class="ln-panel" style="text-align:center;background:#edf6ff"><b>Find a website</b><form id="ln-search-form" class="ln-form-row" style="justify-content:center"><input name="query" aria-label="Search websites" maxlength="80" value="${esc(query)}" placeholder="Search LatchNet..." style="width:min(260px,100%)"><button type="submit">Search!</button></form><span class="ln-tiny-text">Search by title or subject. Browse the directory below.</span></div>
 <div class="ln-columns"><div><h2>${needle?'Search results':'Featured websites'} <span class="ln-small">(${matched.length})</span></h2>
 ${matched.length?`<table class="ln-retro-table"><tbody>${listings(matched)}</tbody></table>`:'<p>No listings found. Try <a href="http://www.latchnet.l98/" data-ln-url="http://www.latchnet.l98/">showing all websites</a>.</p>'}
 </div><aside><div class="ln-panel"><b>Site of the Week</b><hr>${link('dialup','📟 Dial-Up Commons')}<p class="ln-small">October's surviving messages, indexed by subject.</p></div><div class="ln-note"><b>New!</b> Browse the software shelves for a free copy of Minesweeper. ${link('pixelshelf','Browse now')}.</div><p class="ln-small">Visitors online: <span class="ln-counter">000042</span></p></aside></div>
 ${foot('latchnet')}</div>`;
}
function pixelShelf(){return `<div class="ln-page">
 <div class="ln-site-head"><div><strong>💾 PixelShelf</strong><br><span class="ln-small">Shareware, freeware, and useful things since 2001</span></div><span style="font:12px monospace">56K FRIENDLY!</span></div>
 <div class="ln-nav">Home | <a href="#games" data-ln-anchor="games">Games</a> | <a href="#utilities" data-ln-anchor="utilities">Utilities</a> | ${pageLink('pixelshelf','archive/2001','2001 Archive')} | ${link('savepoint','Game Reviews')} | ${link('latchnet','Directory')}</div>
 <h2>Latest downloads</h2><p>Welcome to the shelf. We test the software so you don't have to.</p>
 <h3 id="games">Games</h3><table class="ln-retro-table"><tr><th>Title</th><th>Rating</th><th>Get it</th></tr>
 <tr><td><b>Minesweeper for Latch 98</b><br><span class="ln-small">A timeless test of luck and logic. Beginner, Intermediate, Expert.</span></td><td>★★★★★<br>Freeware</td><td><button type="button" data-ln-app="minesweeper">▶ Play installed copy</button></td></tr>
 <tr><td><b>Solitaire for Latch 98</b><br><span class="ln-small">Klondike cards with Windows-style scoring, Draw One / Draw Three, and Undo.</span></td><td>★★★★★<br>Freeware</td><td><button type="button" data-ln-app="solitaire">▶ Play installed copy</button></td></tr>
 <tr><td><b>Harvest Days</b><br><span class="ln-small">Rumored farming sim with bread, water pumps, and some very industrious cats.</span></td><td>Preview</td><td><span class="ln-small">Not yet released</span></td></tr>
 <tr><td><b>Bloodline</b><br><span class="ln-small">The borderlands don't stay quiet for long.</span></td><td>Rumor</td><td>${link('bloodline','Read dossier')}</td></tr></table>
 <h3 id="utilities">Utilities</h3><div class="ln-card"><b>Notepad</b> — Your dependable writing machine. <button type="button" data-ln-app="notepad">Open installed app</button></div>
 <p class="ln-note">Please do not download mystery files from strangers. We once installed a dancing toaster and the computer hasn't been the same since.</p>
 <p class="ln-small">Need a driver from a dead mirror? Check ${pageLink('pixelshelf','archive/2001','our historical catalogue')} before following any old links.</p><div style="font:12px Arial">Editors' picks: ${link('norn','Norn Observer')} • ${link('grain','Grain Exchange')}</div>${foot('pixelshelf')}</div>`;}
function nornObserver(){return `<div class="ln-page ln-green"><div class="ln-site-head"><div><strong>🥚 The Norn Observer</strong><br>Independent reporting on unusual animal research</div><span>EST. 1999</span></div>
 <div class="ln-nav">Reports | <a href="#facility" data-ln-anchor="facility">The Facility</a> | <a href="#letters" data-ln-anchor="letters">Letters</a> | ${link('town','TownWire')}</div>
 <h2>What was happening at the old research facility?</h2><p class="ln-sign">Posted October 7, 2003 · Editorial Desk</p><p>A fenced research site outside town has remained closed since last winter. Former contractors have described unusual behavioral experiments and computer equipment being moved out after dark. None of the accounts have been independently confirmed.</p>
 <div class="ln-panel" style="background:#f6fff1"><h3 id="facility">The unanswered questions</h3><p>Were the laboratory subjects ordinary animals, or something bred for experiments in learning and recognition? An anonymous source mentioned the project name <b>NORN</b>, but no public records list a program under that name.</p><p>Calls to the facility's old number have gone unanswered.</p></div>
 <h3 id="letters">Letters from readers</h3><p><b>From “FenceLine”:</b> “Did anybody else see the crates being moved out on the night of the power failure?”</p><p><b>Editor's reply:</b> “We have received similar accounts, but we cannot verify what was in the cases.”</p><p class="ln-note">Laboratory archive link missing: <a href="http://www.nornobserver.l98/archive/entry-13" data-ln-url="http://www.nornobserver.l98/archive/entry-13">entry 13</a>. The editor says it was taken down.</p>
 <p>Other curiosities: ${link('bloodline','Ironwire investigations')} • ${link('guestbook',"Aster's homepage")} • ${pageLink('dialup','threads/relay','Relay discussion')}</p>${foot('norn')}</div>`;}
function grainExchange(){return `<div class="ln-page ln-paper"><div class="ln-banner"><h1>🌾 The Grain Exchange</h1><div>Buy • Trade • Harvest • Share</div></div><div class="ln-nav">Market Board | ${link('town','Town News')} | ${link('latchnet','Directory')}</div>
 <h2>Community bulletin board</h2><p>For the small farms, mills and bakeries around our town.</p>
 <table class="ln-retro-table"><tr><th>Posted</th><th>Notice</th></tr>
 <tr><td>10/11/03</td><td><b>WANTED: Corn</b> — The bakery is testing a new recipe. Ask at the stone counter.</td></tr>
 <tr><td>10/10/03</td><td><b>PUMP OUT OF ORDER?</b> — Check your water levels before sowing again.</td></tr>
 <tr><td>10/06/03</td><td><b>LOOKING FOR WORK</b> — Reliable farmhands, cats preferred. Experience with harvesting a plus.</td></tr></table>
 <h3>Post a local notice</h3><p class="ln-small">Farmers, millers and neighbors: leave your notice here.</p>
 <form id="ln-market-form"><div class="ln-form-row"><label>Your name <input name="name" maxlength="28" required placeholder="Farm name"></label><label>Notice <input name="message" maxlength="160" required placeholder="Trade or request..." style="width:min(340px,90vw)"></label><button type="submit">Pin notice</button></div></form>
 <div id="ln-market-list">${localPosts('market')}</div>${foot('grain')}</div>`;}
function ironwire(){return `<div class="ln-page ln-dark"><div style="text-align:center;border:1px solid #557765;padding:16px"><h1>IRONWIRE</h1><div>// FIELD REPORTS FROM THE BORDERLANDS //</div><div style="font-size:10px">NO PROMISES. NO REDEMPTION.</div></div>
 <div class="ln-nav">ARCHIVE | <a href="#dispatch" data-ln-anchor="dispatch">DISPATCHES</a> | <a href="#transcript" data-ln-anchor="transcript">TRANSCRIPT</a> | ${link('latchnet','EXIT')}</div>
 <h2 id="dispatch">Report 014 — Strange lights at the bridge</h2><p>[10.09.03 23:14] Two witnesses report something moving beneath the bridge. One heard scraping metal. The other swears it was breathing.</p>
 <p>[10.10.03 02:36] A courier brought in a message containing only the words <b>“Offer Redemption?”</b> The sender was not identified.</p>
 <div class="ln-panel"><h3 id="transcript">Recovered transmission</h3><p>FREQUENCY: UNKNOWN<br>RECIPIENT: UNKNOWN<br>STATUS: INCOMPLETE</p><p>"Steel isn't enough. It remembers the blood."</p></div>
 <p>The official bulletin lists this station as abandoned. A newer listing may be hiding in plain sight.</p>
 <p>${link('norn','Adjacent research')} · ${link('town','Local coverage')}</p>${foot('bloodline')}</div>`;}
const inbox={
 lab:{from:'m.vale@relay.l98',subject:'that program I told you about',date:'Oct 15, 2003',body:`I finally got the thing running.\n\nRemember the lab outside town? The one that closed and never explained what was in those buildings? Somebody took a stack of equipment before the inventory was finished. One of the workstations had a program on it called Norn World Lab.\n\nIt's insane. The little creatures in there aren't following a normal script. I watched one struggle to walk, get back up, and try something different. They seem to remember people and each other. I have no idea who built it or what they were doing with it.\n\nI made a disc image of what was left on the machine. It's too large to attach here, so I'm sending the SwarmWire torrent. Keep the disc together; the installer expects the full image.\n\nDon't go looking for this on the software sites. You won't find it. And please don't tell anyone where you got it.\n\n— M.`,attachment:'NWLAB03.torrent'},
 welcome:{from:'admin@latchnet.l98',subject:'Welcome to your new LatchNet account!',date:'Oct 12, 2003',body:'Your Postbox mailbox has been created. Save this address for your records. The LatchNet directory has links to local websites and services.'},
 bulletin:{from:'bulletin@townwire.l98',subject:'New community notice board',date:'Oct 10, 2003',body:'TownWire now has a community notice board and classifieds. Drop by the site for recent announcements.'},
 hatch:{from:'unknown@ironwire.l98',subject:"Don't open the hatch",date:'Oct 08, 2003',body:'I saw the light again. The hatch is still warm. Leave it alone.'}
};
// All four original private/public messages are immutable bundled mail. User content is separate.
function postbox(message=null,query='',folder='inbox',outId=null){
 const out=safeRecords('outbox');
 const q=clip(query,80).trim().toLowerCase();
 const matches=(m)=>!q||[m.from,m.to,m.subject,m.body,m.date,m.when].some(v=>String(v||'').toLowerCase().includes(q));
 const entries=Object.entries(inbox).filter(([,m])=>matches(m));
 const saved=out.map((m,i)=>({...m,index:i})).filter(matches);
 const validOut=outId!==null&&Number.isSafeInteger(Number(outId))&&String(Number(outId))===String(outId)&&Number(outId)>=0&&Number(outId)<out.length;
 const m=message&&Object.prototype.hasOwnProperty.call(inbox,message)?inbox[message]:null;
 const letter=m?`<div class="ln-panel ln-message"><p><button type="button" data-ln-mail-back="1">◀ Back to Inbox</button></p><table class="ln-retro-table"><tr><td><b>From:</b></td><td>${esc(m.from)}</td></tr><tr><td><b>Date:</b></td><td>${esc(m.date)}</td></tr><tr><td><b>Subject:</b></td><td>${esc(m.subject)}</td></tr></table><div class="ln-mail-body">${esc(m.body).replace(/\n/g,'<br>')}</div>${m.attachment?`<div class="ln-panel ln-attachment"><b>Attachment:</b> 📎 ${esc(m.attachment)}<br><span class="ln-small">SwarmWire torrent file · 1.5 KB</span><p><button type="button" data-ln-attachment="save">Save Attachment...</button> <button type="button" data-ln-attachment="open">Open</button></p><p class="ln-small">Save or Open will call the system file handler. The message alone will never start a transfer or install a program.</p></div>`:''}</div>`:'';
 const selected=validOut?out[Number(outId)]:null;
 const sentLetter=selected?`<div class="ln-panel ln-message"><p><button type="button" data-ln-mail-folder="outbox">◀ Back to Outbox</button></p><p><b>To:</b> ${esc(selected.to)}<br><b>Subject:</b> ${esc(selected.subject)}<br><b>Saved:</b> ${esc(selected.when)}</p><div class="ln-mail-body">${esc(selected.body).replace(/\n/g,'<br>')}</div></div>`:'';
 const isOut=folder==='outbox'||Boolean(selected);
 return `<div class="ln-page"><div class="ln-site-head ln-mail-banner"><div><strong>✉ Postbox WebMail</strong><br><span class="ln-small">Local mailbox • Oct 2003</span></div><b>YOU'VE GOT MAIL!</b></div>
 <div class="ln-nav">${pageLink('postbox','?folder=inbox','Inbox')} | ${pageLink('postbox','?folder=outbox','Outbox')} | <a href="#compose" data-ln-anchor="compose">Compose</a> | ${link('latchnet','Directory')}</div>
 <form id="ln-mail-search" class="ln-form-row ln-mail-search"><label>Find mail <input name="query" maxlength="80" value="${esc(query)}" placeholder="From, subject or message..."></label><input type="hidden" name="folder" value="${isOut?'outbox':'inbox'}"><button type="submit">Find</button>${q?pageLink('postbox',isOut?'?folder=outbox':'?folder=inbox','Clear search'):''}</form>
 ${letter||sentLetter}
 ${isOut?`<h2 id="sent">Outbox (${saved.length}${q?' matching':''})</h2><p class="ln-small">Messages here are saved locally; they are not sent to a real address.</p>${saved.length?`<table class="ln-retro-table ln-mail-table"><tr><th>To</th><th>Subject</th><th>Saved</th></tr>${saved.map(x=>`<tr><td>${esc(x.to)}</td><td>${pageLink('postbox','?folder=outbox&out='+x.index,clip(x.subject,100)||'(no subject)')}</td><td>${esc(x.when)}</td></tr>`).join('')}</table>`:'<p>No saved messages match this folder/search.</p>'}`:
 `<h2 id="inbox">Inbox (${entries.length}${q?' matching':' messages'})</h2><p class="ln-small">Browse by sender or subject, or open a letter to read it. Paperclip indicates an attachment.</p>${entries.length?`<table class="ln-retro-table ln-mail-table"><tr><th>From</th><th>Subject</th><th>Date</th></tr>${entries.map(([id,x])=>`<tr><td>${esc(x.from)}</td><td>${pageLink('postbox','?message='+encodeURIComponent(id),x.subject)} ${x.attachment?'📎':''}</td><td>${esc(x.date)}</td></tr>`).join('')}</table>`:`<p>No inbox messages match this search. ${pageLink('postbox','','Show all messages')}.</p>`}`}
 <details id="compose" class="ln-compose" ${folder==='compose'?'open':''}><summary><b>Compose a message</b> (save to Outbox)</summary><form id="ln-mail-form"><div class="ln-form-row"><label>To: <input name="to" maxlength="80" required placeholder="friend@postbox.l98" style="width:240px"></label></div><div class="ln-form-row"><label>Subject: <input name="subject" maxlength="100" required style="width:300px"></label></div><textarea name="body" rows="5" maxlength="2000" style="width:min(500px,100%)" aria-label="Message body" required></textarea><p><button type="submit">Save to Outbox</button> <span class="ln-small">Nothing is transmitted over the internet.</span></p></form></details>
 ${foot('postbox')}</div>`;
}
function townWire(){return `<div class="ln-page ln-paper"><div style="text-align:center;border-top:5px double #444;border-bottom:5px double #444;padding:7px"><div class="ln-small">Serving Latch County since 1974</div><h1 style="font-family:Georgia,serif;margin:3px">THE TOWNWIRE</h1><div class="ln-small">VOL. 29 • OCTOBER 2003 • YOUR DAILY INTERNET EDITION</div></div>
 <div class="ln-nav">Headlines | ${pageLink('town','classifieds','Classifieds & Reference Numbers')} | ${link('grain','Farm Notices')} | ${link('latchnet','Home')}</div>
 <h2>County library connects to the web</h2><p class="ln-sign">Town Desk, October 12, 2003</p><p>The town's new public terminal is now available at the library. Visitors may browse the LatchNet directory, read local announcements and leave messages in a community guestbook.</p>
 <h3>Mysterious signal interrupts late-night broadcast</h3><p>Listeners reported hearing an unusual signal followed by a burst of static. Officials have no explanation. ${link('bloodline','Read the unofficial report')}.</p>
 <h3>Records sought after laboratory closure</h3><p>County officials have not commented on reports that equipment disappeared from a private animal-research facility. A former employee says the site had been closed to visitors for years. ${link('norn','Read more')}.</p>
 <h3 id="classifieds">Classifieds</h3><p class="ln-small">${pageLink('town','classifieds','Open the full classified board')} for contact instructions and reference numbers.</p><ul><li><b>FOR SALE:</b> Barely used 56k modem. Works most days.</li><li><b>WANTED:</b> Three bags of seed. Preferably not wet. ${link('grain','Farm board')}</li><li><b>LOST:</b> Silver latch pin, somewhere near the old bridge.</li></ul>${foot('town')}</div>`;}
function localPosts(key){const fallback=key==='guestbook'?[{name:'aster',message:'hello!! thanks for visiting my page :)',when:'Oct 2003'},{name:'modemkid',message:'your website is totally rad',when:'Oct 2003'}]:[];
 const raw=storeRead(key,fallback);const items=(Array.isArray(raw)?raw:fallback).slice(0,30).filter(item=>item&&typeof item==='object');return items.map(item=>`<div class="ln-card"><b>${esc(clip(item.name,30))}</b> <small class="ln-dim">${esc(clip(item.when,32))}</small><p>${esc(clip(item.message,250))}</p></div>`).join('')||'<p class="ln-small">Nothing posted yet. Be the first!</p>';}
function aster(){return `<div class="ln-page ln-purple" style="text-align:center"><div style="border:6px ridge #ffb2e3;background:#ffe9ff;padding:10px"><h1 style="color:#ab008a;margin:2px">★ Aster's Home Page ★</h1><b>WELCOME TO MY LITTLE CORNER OF THE INTERNET</b><p>under construction 🚧 🚧 🚧</p></div>
 <p><span style="font-size:23px">⭐ 🌸 🖥️ 🐣 🌸 ⭐</span></p><p>Hi! I'm Aster. I like strange animals, weird websites, and computers that make funny noises. Sign the guestbook so I know you were here!</p>
 <div class="ln-panel" style="background:#fff9b7"><b>COOL LINKS</b><p>${link('norn','My favorite creature research page')}<br>${link('pixelshelf','Free games!!')}<br>${link('town','What is happening in town?')}<br>${link('lantern','Another personal home page')}<br>${link('bloodline','A strange website I found')}</p></div>
 <h2 id="guestbook">★ Guestbook ★</h2><form id="ln-guestbook-form"><div class="ln-form-row" style="justify-content:center"><label>Name <input name="name" maxlength="30" required placeholder="Your name"></label></div><div class="ln-form-row" style="justify-content:center"><label>Message <input name="message" maxlength="250" required style="width:min(350px,90vw)" placeholder="Your message"></label><button type="submit">Sign!</button></div></form>
 <div id="ln-guestbook-list" style="text-align:left;max-width:540px;margin:auto">${localPosts('guestbook')}</div><hr><span class="ln-small">This page has been visited <span class="ln-counter">001337</span> times. Best viewed on a computer.</span>${foot('guestbook')}</div>`;}
// A small, fully local web directory. Every link is a LatchNet route: no fetches or CDNs.
function pixelArchive(){return `<div class="ln-page"><div class="ln-site-head"><strong>💾 PixelShelf / Archive / 2001</strong><span class="ln-small">Catalogue scanned 10/04/03</span></div><div class="ln-nav">${link('pixelshelf','Current Shelf')} | ${link('savepoint','Reviews')} | ${link('relic','Old Links')}</div>
<h2>Software rescued from floppy disks</h2><p>These are historical catalogue cards, not active downloads. The original servers went away. Installed Latch 98 programs can still be opened from the current shelf.</p>
<table class="ln-retro-table"><tr><th>Catalogue ID</th><th>Program / notes</th><th>Status</th></tr>
<tr><td>PS-001</td><td><b>Modem Doctor 2.0</b> — keeps a paper log of disconnect codes. The old support number was later reassigned. ${pageLink('dialup','threads/modem','Read the owner notes')}.</td><td>Archive only</td></tr>
<tr><td>PS-006</td><td><b>Sound Splice '01</b> — freeware wave editor. License preserved; executable not mirrored.</td><td>Lost disk</td></tr>
<tr><td>PS-013</td><td><b>Relay Status Checker</b> — a serial-port test utility; last listing recorded a connection at 03:17.</td><td>${pageLink('relic','captures/relay','Capture')} available</td></tr>
<tr><td>PS-019</td><td><b>HatchCam Viewer</b> — camera monitor mentioned in a buyer's letter; no surviving publisher contact.</td><td>Unverified</td></tr></table>
<p class="ln-note">Looking for current games? ${link('pixelshelf','The main shelf')} and ${link('savepoint','SavePoint reviews')} are still open.</p>${foot('pixelshelf')}</div>`;}
function classifieds(detail=''){const ads={
 '314':{title:'USED 56K MODEM',posted:'Oct 12, 2003',text:'External modem, box included, one loose power cord. Caller reports it disconnects on rainy nights. Leave a note for "Red" at the library desk. Mention classified 314.'},
 '418':{title:'LOST SILVER LATCH PIN',posted:'Oct 11, 2003',text:'Small latch-shaped pin near Old Bridge. Finder please place it in an envelope addressed to E. Harlow at the newspaper office. Last seen after the night of the broadcast static.'},
 '512':{title:'RELAY ROOM STORAGE WANTED',posted:'Oct 9, 2003',text:'Seeking dry storage for two tape reels and a boxed frequency counter. No collection after sunset. Ask for the old radio crew at the market. This notice has not been renewed.'}
 };if(detail&&ads[detail]){const a=ads[detail];return `<div class="ln-page ln-paper"><h1>TownWire Classified #${detail}</h1><p class="ln-sign">${a.posted} • Paper notice, as received</p><h2>${a.title}</h2><div class="ln-panel">${esc(a.text)}</div><p>No online reply: contact instructions are printed in the listing.</p>${pageLink('town','classifieds','◀ All classifieds')}${foot('town')}</div>`;}
 return `<div class="ln-page ln-paper"><div class="ln-site-head"><strong>📰 TownWire Classified Desk</strong><span class="ln-small">Updated Oct 12, 2003</span></div><div class="ln-nav">${link('town','News')} | ${link('grain','Farm Notices')} | ${link('lantern','Local Homepage')}</div><h2>Paper notices now online</h2><p>Choose a reference number for the full notice and contact instructions. Classifieds expire after thirty days.</p><table class="ln-retro-table"><tr><th>Ref.</th><th>Category</th><th>Notice</th></tr>${Object.entries(ads).map(([n,a])=>`<tr><td>${pageLink('town','classifieds/'+n,'#'+n)}</td><td>${n==='314'?'Equipment':n==='418'?'Lost & Found':'Storage'}</td><td>${esc(a.title)}<br><span class="ln-small">${esc(a.posted)}</span></td></tr>`).join('')}</table><div class="ln-note">Public posting is handled on ${link('grain','the Grain Exchange board')}; replies to these paper advertisements are not emailed.</div>${foot('town')}</div>`;}
function dialup(thread=''){const topics={
 modem:{title:'RE: Modem keeps dropping at night',date:'Oct 11, 2003',posts:[['bitrot99','The 56K keeps disconnecting at exactly the same minute. I changed phone leads and the wall jack.'],['retrored','Try writing the time on paper. A nearby pump controller used to kick our line off whenever it switched on.'],['ast3r','A useful list of error codes is on the old PixelShelf archive.']]},
 relay:{title:'Was anyone on the old relay channel?',date:'Oct 13, 2003',posts:[['copperfox','I recorded a voice in the static at 03:17. It sounded like someone repeating a room number, but the tape skips.'],['robbie-r','The station near Old Bridge was disconnected last winter. Why would anybody transmit there?'],['copperfox','The copy of the tape I mailed is gone. The radio engineer at Lantern House might know the frequency.']]},
 bridge:{title:'Bridge road / county lights',date:'Oct 14, 2003',posts:[['fenceline','The road to the old facilities is blocked. I went for a photo, not to trespass.'],['libraryclerk','Please do not post private addresses or directions to restricted facilities. Old reports are on the Observer, nothing more.'],['fenceline','Understood. Leaving the note here only for the newspaper records.']]}
 };if(thread&&topics[thread]){const t=topics[thread];return `<div class="ln-page"><div class="ln-site-head"><strong>📟 Dial-Up Commons</strong><b>READ-ONLY ARCHIVE</b></div><div class="ln-nav">${link('dialup','All Threads')} | ${link('relic','Old Index')} | ${link('latchnet','Directory')}</div><h2>${esc(t.title)}</h2><p class="ln-sign">${t.date} • Replies preserved as submitted</p>${t.posts.map((post,i)=>`<div class="ln-forum-post"><div><b>#${i+1} ${esc(post[0])}</b> <span class="ln-small">${esc(t.date)}</span></div><p>${esc(post[1])}</p></div>`).join('')}<p class="ln-note">This board was frozen on Oct 15, 2003 following a relay outage. It does not accept new posts.</p>${pageLink('dialup','','◀ Topic index')}${foot('dialup')}</div>`;}
 return `<div class="ln-page"><div class="ln-site-head"><strong>📟 Dial-Up Commons</strong><span>Archive only — Oct 2003</span></div><div class="ln-nav">${link('latchnet','Directory')} | ${link('lantern','Radio Notes')} | ${link('norn','The Observer')}</div><h2>Computer Help &amp; The Outside World</h2><p>Welcome back. Registration was disabled when the central relay closed. The last three discussions are mirrored here for reference.</p><table class="ln-retro-table"><tr><th>Topic</th><th>Replies</th><th>Last update</th></tr>${Object.entries(topics).map(([id,t])=>`<tr><td>${pageLink('dialup','threads/'+id,t.title)}</td><td>${t.posts.length}</td><td>${t.date}</td></tr>`).join('')}</table><p class="ln-small">Archive index provided courtesy of ${link('relic','RelicMirror')}.</p>${foot('dialup')}</div>`;}
function savepoint(review=''){const reviews={
 minesweeper:{title:'Minesweeper: An Office Classic',score:'9 / 10',body:'A square grid, a clock, and a reason to avoid clicking too quickly. No registration and no hidden menu needed. The installed Latch 98 edition remains our recommended copy.',app:'minesweeper'},
 solitaire:{title:'Solitaire: A Quiet Afternoon',score:'8 / 10',body:'Klondike rewards patience and punishes an impulsive Draw Three. The ability to undo a mistake changes the mood of a long afternoon.',app:'solitaire'},
 bloodline:{title:'Bloodline: Rumors From the Borderlands',score:'Unrated',body:'We received two contradictory descriptions of the same game. One calls it a deck battler; another says the towers can choose their own fate. The editors have not authenticated either review. Read the Ironwire report before believing a copy.',app:null}
 };if(review&&reviews[review]){const r=reviews[review];return `<div class="ln-page"><div class="ln-site-head"><strong>🎮 SavePoint Review Desk</strong><span>Oct 2003 Edition</span></div><div class="ln-nav">${link('savepoint','All Reviews')} | ${link('pixelshelf','Software Library')}</div><h2>${esc(r.title)}</h2><p><b>Editor's score:</b> ${esc(r.score)}</p><div class="ln-panel">${esc(r.body)}</div>${r.app?`<button type="button" data-ln-app="${r.app}">Open installed ${esc(r.app)} game</button>`:link('bloodline','Read Ironwire field report')}<p class="ln-small">No game is downloaded by opening this review.</p>${pageLink('savepoint','','◀ Back to reviews')}${foot('savepoint')}</div>`;}
 return `<div class="ln-page"><div class="ln-site-head"><strong>🎮 SavePoint</strong><span class="ln-small">The hobbyist games magazine on your computer</span></div><div class="ln-nav">${link('pixelshelf','Freeware')} | ${link('dialup','Forum')} | ${link('latchnet','Home')}</div><h2>October 2003 Issue: Games Worth Revisiting</h2><table class="ln-retro-table"><tr><th>Review</th><th>Verdict</th></tr>${Object.entries(reviews).map(([id,r])=>`<tr><td>${pageLink('savepoint','reviews/'+id,r.title)}</td><td>${esc(r.score)}</td></tr>`).join('')}</table><h3>Letters to the editor</h3><p><b>Postcard, no return address:</b> “Why does everyone call a game finished just because you can win it?”</p><p>Correction: Last month's printed 'Bloodline demo mirror' was a different program entirely. Please disregard the expired address.</p>${foot('savepoint')}</div>`;}
function lantern(log=false){return `<div class="ln-page ln-paper"><div class="ln-site-head"><strong>🏠 Lantern House</strong><span class="ln-small">E. Harlow's little web page</span></div><div class="ln-nav">${link('lantern','Welcome')} | ${pageLink('lantern','radio-log','Radio Log')} | ${link('guestbook','Aster')} | ${link('relic','Old Mirrors')}</div>${log?`<h2>My listening log, October '03</h2><table class="ln-retro-table"><tr><th>Date</th><th>Frequency note</th></tr><tr><td>10/09</td><td>Local station off air. Static from the old bridge repeater again.</td></tr><tr><td>10/12</td><td>Unidentified tone, then two syllables, then nothing at 03:17. Tape reel B still in its cardboard sleeve.</td></tr><tr><td>10/14</td><td>Advised copperfox on Dial-Up Commons to check the motor housing before assuming a voice is a voice.</td></tr></table><p>This is a listening journal, not a map of the old property. Nobody should trespass to check a broadcast rumor.</p><p>${pageLink('dialup','threads/relay','Read the forum discussion')}</p>`:`<h1>Welcome to my Home Page</h1><p>My name is E. Harlow. I fixed radios for thirty-two years. Now I collect odd noises, old broadcast schedules, and recipes that survived dial-up.</p><div class="ln-panel"><b>Latest:</b> ${pageLink('lantern','radio-log','the October listening log')} has three entries. The town newspaper also has an old lost-and-found listing with my name on it.</div><p>Links from my bookmarks: ${pageLink('town','classifieds/418','TownWire #418')} • ${pageLink('dialup','threads/relay','Relay thread')} • ${pageLink('relic','gone/old-tape-server','Old Tape Server (retired)')}</p>`}${foot('lantern')}</div>`;}
function relic(path=''){if(path==='gone/old-tape-server')return `<div class="ln-page"><h1>410 — This web page is gone</h1><p>The Old Tape Server closed in February 2002. Its address is preserved in the directory so old bookmarks have somewhere to land.</p><p>Some handwritten logs were independently transcribed at ${pageLink('lantern','radio-log','Lantern House')}.</p>${pageLink('relic','','Back to index')}${foot('relic')}</div>`;
 if(path==='captures/relay')return `<div class="ln-page"><h1>CAPTURE: Relay Status Checker</h1><p class="ln-sign">Archive card copied from PixelShelf on Aug 28, 2001</p><pre class="ln-terminal">CONNECT: COM2 / 9600 BAUD\nRELAY IDENTIFIER: R-09\nLAST EVENT: 03:17\nFILE LIST: NOT ARCHIVED</pre><p>No executable, installer, or full file copy exists on this mirror. The capture preserves only the original text listing.</p>${pageLink('pixelshelf','archive/2001','Return to software catalogue')}${foot('relic')}</div>`;
 return `<div class="ln-page"><div class="ln-site-head"><strong>🔗 RelicMirror</strong><span>INDEPENDENT LINK ROT INDEX</span></div><div class="ln-nav">${link('dialup','Forums')} | ${link('pixelshelf','PixelShelf')} | ${link('latchnet','Directory')}</div><h2>We remember pages, even when they vanish.</h2><p>These old addresses are not live downloads. Click to read the last known status or a surviving text capture.</p><table class="ln-retro-table"><tr><th>2001–2003 bookmark</th><th>Archive status</th></tr><tr><td>${pageLink('relic','gone/old-tape-server','Old Tape Server')}</td><td>410 — retired Feb 2002</td></tr><tr><td>${pageLink('relic','captures/relay','Relay Checker Capture')}</td><td>Text snapshot only</td></tr><tr><td>${pageLink('norn','archive/entry-13','Observer entry 13')}</td><td>Restored editorial fragment</td></tr></table><p>Found an obsolete link on a personal page? You can still use the ${link('latchnet','local directory')} to find surviving sites.</p>${foot('relic')}</div>`;}

function notFound(path){return `<div class="ln-page"><h1>404 — Page Not Found</h1><p>The page <code>${esc(path)}</code> couldn't be found on LatchNet.</p><p>Try ${link('latchnet','the directory')} or use Back.</p><div class="ln-note">The requested page is unavailable. Check the address and try again.</div></div>`;}
function secret(){return `<div class="ln-page ln-dark"><h2>ARCHIVE ENTRY 13 — RESTRICTED</h2><p>FILE RESTORED. <span style="color:#ffdc88">DO NOT MIRROR.</span></p><p>"At 03:17 the sleeping subject opened its eyes. The subject remained asleep. A second voice described a room that did not exist in this building."</p><p>One margin note reads: <i>When did the dream begin?</i></p>${link('norn','Return to field notes')}</div>`;}
function normalize(raw){
 let s=clip(raw,2048).trim();if(!s||/^(?:latch|home):/i.test(s))return HOME;
 if(!/^https?:\/\//i.test(s))s='http://'+s;
 try{const u=new URL(s);if(!['http:','https:'].includes(u.protocol))return s;return 'http://'+u.host.toLowerCase()+(u.pathname||'/')+u.search+u.hash;}
 catch{return s;}
}
function parse(url){
 const clean=normalize(url);
 try{const u=new URL(clean),entry=Object.entries(sites).find(([,site])=>site.host===u.hostname);
  if(!entry||u.port||!['http:','https:'].includes(u.protocol)||u.username||u.password)return {id:null,clean};
  const id=entry[0];return {id,clean:siteUrl(id).slice(0,-1)+u.pathname+u.search+u.hash,path:u.pathname,params:u.searchParams,hash:u.hash};
 }catch{return {id:null,clean};}
}
function favoriteList(){const raw=storeRead('favorites',[HOME,siteUrl('pixelshelf'),siteUrl('norn')]);return safeFavorites(raw);}
function favoritePage(){const favorites=favoriteList();return `<div class="ln-page"><h1>★ My Favorites</h1><p>Saved LatchNet addresses (up to 32).</p><ul>${favorites.map(f=>`<li><a href="${esc(f)}" data-ln-url="${esc(f)}">${esc(renderPage(f).title)}</a><div class="ln-small">${esc(f)} <button type="button" data-ln-removefavorite="${esc(f)}">Remove</button></div></li>`).join('')}</ul><p><button type="button" data-ln-savefavorite="1">Add the last page I visited</button></p>${link('latchnet','Home')}${foot('latchnet')}</div>`;}
function renderPage(url){
 const p=parse(url);if(!p.id)return {html:notFound(url),title:'Page not found',url:p.clean};
 const params=p.params||new URLSearchParams(),path=p.path||'/',sub=path.replace(/^\//,'');let html=null;
 switch(p.id){
  case 'latchnet':if(path==='/')html=portal(clip(params.get('q')||'',80));else if(path==='/favorites')html=favoritePage();break;
  case 'pixelshelf':if(path==='/')html=pixelShelf();else if(path==='/archive/2001')html=pixelArchive();break;
  case 'norn':if(path==='/')html=nornObserver();else if(path==='/archive/entry-13')html=secret();break;
  case 'grain':if(path==='/')html=grainExchange();break;
  case 'bloodline':if(path==='/')html=ironwire();break;
  case 'postbox':if(path==='/')html=postbox(params.get('message'),clip(params.get('q')||'',80),params.get('folder')||'inbox',params.get('out'));break;
  case 'town':if(path==='/')html=townWire();else if(path==='/classifieds')html=classifieds();else if(/^\/classifieds\/(314|418|512)$/.test(path))html=classifieds(path.split('/')[2]);break;
  case 'guestbook':if(path==='/')html=aster();break;
  case 'dialup':if(path==='/')html=dialup();else if(/^\/threads\/(modem|relay|bridge)$/.test(path))html=dialup(path.split('/')[2]);break;
  case 'savepoint':if(path==='/')html=savepoint();else if(/^\/reviews\/(minesweeper|solitaire|bloodline)$/.test(path))html=savepoint(path.split('/')[2]);break;
  case 'lantern':if(path==='/')html=lantern();else if(path==='/radio-log')html=lantern(true);break;
  case 'relic':if(path==='/')html=relic();else if(['gone/old-tape-server','captures/relay'].includes(sub))html=relic(sub);break;
 }
 return {html:html??notFound(p.clean),title:html?(p.id==='latchnet'&&path==='/favorites'?'Favorites — LatchNet':sites[p.id].title):'Page not found',url:p.clean,hash:p.hash};
}
function mount(host,{openApp=()=>{},saveAttachment=()=>{}}={}){
 const wrap=document.createElement('div');wrap.className='ln-shell';
 wrap.innerHTML=`<div class="ln-toolbar"><button type="button" class="ln-tool" data-ln-control="back" title="Back">◀ Back</button><button type="button" class="ln-tool" data-ln-control="forward" title="Forward">Forward ▶</button><button type="button" class="ln-tool" data-ln-control="stop" title="Stop">■ Stop</button><button type="button" class="ln-tool" data-ln-control="reload" title="Refresh">↻ Refresh</button><button type="button" class="ln-tool" data-ln-control="home" title="Home">⌂ Home</button><button type="button" class="ln-tool" data-ln-control="favorites" title="Favorites">★ Favorites</button></div><form class="ln-address"><label for="ln-location">Address</label><input id="ln-location" name="address" aria-label="Website address" spellcheck="false" autocomplete="off" maxlength="2048" value="${HOME}"><button type="submit">Go</button></form><div class="ln-viewport" aria-label="Website contents" tabindex="0"></div><div class="ln-status"><span data-ln-status>LatchNet — Ready</span><span>🌐 LatchNet</span></div>`;
 host.replaceChildren(wrap);
 const view=wrap.querySelector('.ln-viewport'),address=wrap.querySelector('[name="address"]'),status=wrap.querySelector('[data-ln-status]');
 let hist=[HOME],at=0,destroyed=false;
 function show(url,{record=true}={}){
  if(destroyed)return;
  const page=renderPage(url);
  if(record&&hist[at]!==page.url){hist=hist.slice(0,at+1);hist.push(page.url);at=hist.length-1;}
  address.value=page.url;view.innerHTML=page.html;view.scrollTop=0;
  status.textContent=`LatchNet — ${page.title}`;
  wrap.querySelector('[data-ln-control="back"]').disabled=at<=0;
  wrap.querySelector('[data-ln-control="forward"]').disabled=at>=hist.length-1;
  if(page.hash){try{const id=decodeURIComponent(page.hash.slice(1));const el=[...view.querySelectorAll('[id]')].find(x=>x.id===id);el?.scrollIntoView({block:'nearest'});}catch{ /* malformed fragment is harmless */ }}
 }
 function go(url){show(url);}
 function back(){if(at>0){at--;show(hist[at],{record:false});}}
 function forward(){if(at<hist.length-1){at++;show(hist[at],{record:false});}}
 function failure(message){status.textContent='Not saved — '+message+' (your text is still in the form)';}
 function onClick(e){const ctl=e.target.closest('[data-ln-control]');if(ctl){
  const action=ctl.dataset.lnControl;
  if(action==='back')back();else if(action==='forward')forward();else if(action==='reload')show(hist[at],{record:false});else if(action==='home')go(HOME);else if(action==='favorites')go(HOME+'favorites');else if(action==='stop')status.textContent='Stopped — all local pages are already loaded';return;
 }
 const add=e.target.closest('[data-ln-savefavorite]');if(add){const previous=hist.slice(0,at).reverse().find(x=>parse(x).id&&x!==HOME+'favorites');if(!previous){status.textContent='Visit a site first, then add it here';return;}const favorites=favoriteList();if(!favorites.includes(previous)){favorites.push(previous);if(!storeWrite('favorites',favorites.slice(0,32))){status.textContent='Not saved — Favorites storage is unavailable';return;}}show(hist[at],{record:false});return;}
 const remove=e.target.closest('[data-ln-removefavorite]');if(remove){const favorites=favoriteList().filter(f=>f!==remove.dataset.lnRemovefavorite);if(!storeWrite('favorites',favorites)){status.textContent='Could not remove favorite — storage unavailable';return;}show(hist[at],{record:false});return;}
 const backMail=e.target.closest('[data-ln-mail-back]');if(backMail){go(siteUrl('postbox'));return;}
 const mailFolder=e.target.closest('[data-ln-mail-folder]');if(mailFolder){go(pageUrl('postbox','?folder='+encodeURIComponent(mailFolder.dataset.lnMailFolder)));return;}
 const attachment=e.target.closest('[data-ln-attachment]');if(attachment){const action=attachment.dataset.lnAttachment;if(action==='save'||action==='open')saveAttachment(action);return;}
 const app=e.target.closest('[data-ln-app]');if(app){const allowed=['minesweeper','solitaire','notepad'];if(allowed.includes(app.dataset.lnApp))openApp(app.dataset.lnApp);return;}
 const anchor=e.target.closest('[data-ln-anchor]');if(anchor){e.preventDefault();const id=anchor.dataset.lnAnchor;const el=[...view.querySelectorAll('[id]')].find(n=>n.id===id);if(el){if(el.tagName==='DETAILS')el.open=true;el.scrollIntoView({block:'nearest'});}return;}
 const a=e.target.closest('a[data-ln-url]');if(a){e.preventDefault();go(a.dataset.lnUrl);return;}
 }
 function onSubmit(e){
  if(e.target.matches('.ln-address')){e.preventDefault();go(address.value);return;}
  if(e.target.id==='ln-search-form'){e.preventDefault();const q=clip(new FormData(e.target).get('query'),80);go(HOME+'?q='+encodeURIComponent(q));return;}
  if(e.target.id==='ln-mail-search'){e.preventDefault();const f=new FormData(e.target),q=clip(f.get('query'),80),folder=f.get('folder')==='outbox'?'outbox':'inbox';go(pageUrl('postbox','?folder='+folder+'&q='+encodeURIComponent(q)));return;}
  const map={'ln-guestbook-form':['guestbook','ln-guestbook-list'],'ln-market-form':['market','ln-market-list']};
  if(map[e.target.id]){
   e.preventDefault();const [key,containerId]=map[e.target.id],f=new FormData(e.target),name=clip(String(f.get('name')||'').trim(),key==='market'?28:30),message=clip(String(f.get('message')||'').trim(),key==='market'?160:250);
   if(!name||!message)return;
   const defaults=key==='guestbook'?[{name:'aster',message:'hello!! thanks for visiting my page :)',when:'Oct 2003'},{name:'modemkid',message:'your website is totally rad',when:'Oct 2003'}]:[];
   const old=storeRead(key,defaults),posts=(Array.isArray(old)?old:defaults).slice(0,29).filter(x=>x&&typeof x==='object');posts.unshift({name,message,when:nowDate()});
   if(!storeWrite(key,posts)){failure('post storage is unavailable');return;}
   const box=view.querySelector('#'+containerId);if(box)box.innerHTML=localPosts(key);e.target.reset();status.textContent='Entry saved to the local guestbook';return;
  }
  if(e.target.id==='ln-mail-form'){
   e.preventDefault();const f=new FormData(e.target),to=clip(String(f.get('to')||'').trim(),80),subject=clip(String(f.get('subject')||'').trim(),100),body=clip(String(f.get('body')||'').trim(),2000);
   if(!to||!subject||!body)return;
   const old=storeRead('outbox',[]),out=(Array.isArray(old)?old:[]).slice(0,29).filter(x=>x&&typeof x==='object');out.unshift({to,subject,body,when:nowDate()});
   if(!storeWrite('outbox',out)){failure('Outbox storage is unavailable');return;}
   go(pageUrl('postbox','?folder=outbox&out=0'));status.textContent='Saved to Outbox (not transmitted)';return;
  }
 }
 wrap.addEventListener('click',onClick);wrap.addEventListener('submit',onSubmit);
 wrap.addEventListener('keydown',e=>{if(e.altKey&&e.key==='ArrowLeft'){e.preventDefault();back();}else if(e.altKey&&e.key==='ArrowRight'){e.preventDefault();forward();}});
 show(HOME,{record:false});
 const instance={navigate:go,destroy(){destroyed=true;wrap.remove();if(window.LatchNet.active===instance)window.LatchNet.active=null;}};
 window.LatchNet.active=instance;return instance;
}
window.LatchNet={mount,active:null,addresses:Object.fromEntries(Object.keys(sites).map(id=>[id,siteUrl(id)])),home:HOME};
})();
