// Integrator Thread 4 Norn simulation and Thread 2 bridge regression.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const html = fs.readFileSync('apps/norn-world-lab/index.html','utf8');
const listening = 'n.body && Number.isFinite(window.NornCore.cxOf(n.body)) &&\n    Math.abs(window.NornCore.cxOf(n.body)-d.x)<180';
assert(html.includes(listening), 'Doozer hearing must use the physical body center and finite guard');
assert(!html.includes('Math.abs((n.body?.x??n.x??0)-d.x)<180'), 'Doozer origin fallback has returned');
for (const marker of ['id="norn-disk-host"','id="norn-files"','NornDiskEmbedded','NornFiles','window.NornCore']) {
 assert(html.includes(marker), 'Norn host integration missing '+marker);
}
const disk = fs.readFileSync('web/filesystem.js','utf8');
const swarm = fs.readFileSync('web/swarmwire.js','utf8');
assert(disk.includes('nornTransfer,setNornTransfer'), 'No shared transfer-state API');
assert(!swarm.includes("localStorage.setItem(KEY"), 'SwarmWire reintroduced split localStorage saves');
assert(swarm.includes('fs.nornTransfer()'), 'SwarmWire not reading the mounted virtual disk');
console.log('PASS: physical Doozer hearing correction, Norn host bridge preserved, SwarmWire state stored in virtual disk');
