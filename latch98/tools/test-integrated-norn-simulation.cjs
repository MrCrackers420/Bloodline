// Integrator Thread 4 Norn simulation and Thread 2 bridge regression.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const html = fs.readFileSync('apps/norn-world-lab/index.html','utf8');
// Approved Norn Round 4 evaluates acoustic exposure from the physical ear,
// with a finite-coordinate guard, actual distance and terrain occlusion.
for (const listening of [
  'const ear=n.body.p?.[window.NornCore.HEAD_I]||n.body.p?.[1]',
  '!Number.isFinite(ear.x)||!Number.isFinite(ear.y)',
  'Math.hypot(ear.x-sx,ear.y-sy)<180',
  'world.clearBetween(sx,sy,ear.x,ear.y)'
]) assert(html.includes(listening), 'Physical Doozer hearing guard missing: '+listening);
assert(!html.includes('Math.abs((n.body?.x??n.x??0)-d.x)<180'), 'Doozer origin fallback has returned');
for (const marker of ['id="norn-disk-host"','id="norn-files"','NornDiskEmbedded','NornFiles','window.NornCore']) {
 assert(html.includes(marker), 'Norn host integration missing '+marker);
}
const disk = fs.readFileSync('web/filesystem.js','utf8');
const swarm = fs.readFileSync('web/swarmwire.js','utf8');
assert(disk.includes('nornTransfer,setNornTransfer'), 'No shared transfer-state API');
assert(!swarm.includes("localStorage.setItem(KEY"), 'SwarmWire reintroduced split localStorage saves');
assert(swarm.includes('fs.nornTransfer()'), 'SwarmWire not reading the mounted virtual disk');
console.log('PASS: physical/occlusion-aware Doozer hearing correction, Norn host bridge preserved, SwarmWire state stored in virtual disk');
