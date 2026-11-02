#!/usr/bin/env python3
"""Headless browser experiment against actual Step 32 NornCore and Language Lab.

Usage:
  python tests/doozer_spatial_experiment.py \
     --baseline /path/to/Norn_World_Lab_Step32.html \
     --updated norn/Norn_World_Lab_Step32_Simulation_Updated.html \
     --out tests/results.json

Requires playwright (Python) and a Chromium executable. The only test-only
instrumentation exposes the existing socialStep closure; no production code is
modified by the experiment runner. Browser runs offline via page.set_content.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE_HASH = '38da534fdd76732caddff88539c6310aa07181a451d7bfb53b161752af9f13b1'
SCRIPT_HOOK = 'setInterval(()=>{socialStep();render();},650);render();'
EXPERIMENT_JS = r'''() => {
  const C=window.NornCore;
  if(!window.__thread4SocialStep || !C?.makeWorld) throw Error('Language Lab/NornCore missing');
  const original=Object.getOwnPropertyDescriptor(window.nornLab,'world');
  const originalRandom=Math.random;
  const scenarios=[
    {name:'teacher_beside_beta',doozerX:1600,expected:[0,1,0]},
    {name:'teacher_near_world_origin',doozerX:100,expected:[0,0,0]},
    {name:'teacher_far_from_all',doozerX:4500,expected:[0,0,0]},
  ];
  let trialId=0;
  const rows=[];
  // A deterministic draw stream is reset for every experimental replication.
  const randomFor=(seed)=>{
    let s=seed>>>0;
    return () => {s=(s+0x6D2B79F5)>>>0;let t=s;
      t=Math.imul(t^(t>>>15),t|1);
      t^=t+Math.imul(t^(t>>>7),t|61);
      return ((t^(t>>>14))>>>0)/4294967296;
    };
  };
  try {
    for(const scenario of scenarios){
      for(let seed=101;seed<=132;seed++){
        Math.random=randomFor(seed);
        const w=C.makeWorld(seed,null,{creatures:[
          {name:'A',x:800,pers:'hardy'},
          {name:'B',x:1600,pers:'hardy'},
          {name:'C',x:2400,pers:'hardy'},
        ], populationLimit:3});
        Object.defineProperty(window.nornLab,'world',{configurable:true,get:()=>w});
        window.nornLanguageBindWorld?.(w);
        if(!w.spawnDoozer(scenario.doozerX))throw Error('Doozer could not spawn');
        const d=w.doozers[0]; d.lessonAt=-1;
        const positions=w.norns.map(n=>({name:n.name,
          x:C.cxOf(n.body),bodyX:n.body.x??null,
          near:Math.abs(C.cxOf(n.body)-d.x)<180}));
        const starting=w.norns.map(n=>Object.values(window.nornLanguageDebug.vocabulary(n.name)).reduce((a,b)=>a+b,0));
        // All scenarios receive five scheduled teaching opportunities at
        // t=1, 11, 21, 31, 41 world seconds; identical seeds, no Norn movement.
        const offset=(++trialId)*100;
        for(const t of [1,11,21,31,41]) {w.time=offset+t;window.__thread4SocialStep();}
        const ending=w.norns.map(n=>Object.values(window.nornLanguageDebug.vocabulary(n.name)).reduce((a,b)=>a+b,0));
        rows.push({scenario:scenario.name,seed,positions,dojoX:d.x,
          lessonOpportunities:5,timeWindowSeconds:[1,41],
          wordGain:ending.map((v,i)=>+(v-starting[i]).toFixed(3)),
          heard:ending.map((v,i)=>v-starting[i]>.01)});
      }
    }
  } finally {
    Math.random=originalRandom;
    Object.defineProperty(window.nornLab,'world',original);
  }
  return rows;
}'''


def page_for(page, path):
    html=Path(path).read_text(encoding='utf-8')
    if html.count(SCRIPT_HOOK)!=1:
        raise ValueError('Could not locate exact socialStep site in '+path)
    html=html.replace(SCRIPT_HOOK,'window.__thread4SocialStep=socialStep;'+SCRIPT_HOOK)
    errors=[]
    page.on('pageerror',lambda err: errors.append(str(err)))
    page.set_content(html,wait_until='domcontentloaded',timeout=60000)
    d=page.evaluate('''() => ({core:!!window.NornCore,lab:!!window.nornLab,
      language:!!window.nornLanguageDebug,hook:typeof window.__thread4SocialStep,
      files:!!window.NornFiles,applet:!!document.getElementById('language-lab')})''')
    assert all([d['core'],d['lab'],d['language'],d['hook']=='function',d['files'],d['applet']]),d
    assert not errors,errors[:5]
    return errors


def reduce_data(rows):
    output={}
    for scenario in sorted({r['scenario'] for r in rows}):
        group=[r for r in rows if r['scenario']==scenario]
        assert len(group)==32
        output[scenario]={
            'replicates':len(group),
            'mean_word_gain_by_norn':[round(sum(r['wordGain'][i] for r in group)/len(group),3) for i in range(3)],
            'nonzero_hearing_trials_by_norn':[sum(bool(r['heard'][i]) for r in group) for i in range(3)],
            'anatomical_x_lookups':group[0]['positions'],
        }
    return output


def run(path,playwright):
    browser=playwright.chromium.launch(headless=True,executable_path=os.getenv('CHROMIUM_PATH','/usr/bin/chromium'),
        args=['--no-sandbox','--disable-dev-shm-usage','--disable-background-timer-throttling'])
    try:
        page=browser.new_page(viewport={'width':1366,'height':768},reduced_motion='reduce')
        errors=page_for(page,str(path))
        records=page.evaluate(EXPERIMENT_JS)
        # Check that browser playback continues in a real, non-instrumented family
        # preset on the main UI and that the 2D canvas is actually populated.
        page.evaluate("document.getElementById('family-preset').click()")
        start=page.evaluate('''() => ({time:window.nornLab.world.time,
          names:window.nornLab.world.norns.map(n=>n.name),
          controls:!!document.getElementById('reset') && !!document.getElementById('lang-hand-say'),
          applets:!!document.getElementById('brainmap-applet') && !!document.getElementById('diagnostic-recorder')})''')
        page.wait_for_timeout(500)
        end=page.evaluate('''() => ({time:window.nornLab.world.time,
          norns:window.nornLab.world.norns.length,
          renderError:window.nornRenderError||null,
          lastDraw:window.nornLastDrawAt||null,
          visibleCanvas:Array.from(document.querySelectorAll('canvas')).some(x=>x.width>100&&x.height>100),
          errors:window.NornPhysicsStatus?.state||null})''')
        smoke={'before':start,'after':end,'pageErrors':errors}
        grammar=page.evaluate(r'''() => ['Bram no slap Pip','No slap Pip, Bram'].map(text => {
          const parsed=window.nornLanguageDebug.interpret('Bram',text);
          const clause=parsed.clauses.find(c=>c.kind==='prohibition');
          return {text,kind:clause?.kind,actor:clause?.actor,object:clause?.object,predicate:clause?.predicate,
            polarity:clause?.polarity,confidence:clause?.confidence};
        })''')
        assert len(grammar)==2 and all(g['actor']=='Bram' and g['object']=='Pip' and g['predicate']=='slap' and g['polarity']==-1 and g['confidence']>.55 for g in grammar),grammar
        smoke['handGrammarRegression']=grammar
        assert start['names']==['Bram','Mira','Pip'],smoke
        assert start['controls'] and start['applets'],smoke
        assert end['norns']==3 and end['time']>start['time'] and end['visibleCanvas'] and not end['renderError'],smoke
        assert not errors,errors
        # In-memory mock of the existing LatchFS contract. This verifies the
        # unchanged adapter's actual Save As/Open dialog roundtrip, but does
        # not claim to test a full Latch 98 host installation.
        mock_bridge=page.evaluate(r'''async () => {
          const nodes={'C:':{kind:'dir',name:'C:',parent:null}};
          const canon=p=>String(p).replace(/\\/g,'/').replace(/\/+$/,'').toUpperCase();
          const fs={
            ready:Promise.resolve(),canonical:canon,
            parent:p=>{const q=canon(p);return q.includes('/')?q.slice(0,q.lastIndexOf('/')):'C:'},
            get:p=>nodes[canon(p)]||null,
            mkdir(parent,name){const key=canon(parent+'/'+name);nodes[key]={kind:'dir',name,parent:canon(parent),path:key};return nodes[key]},
            list:p=>Object.entries(nodes).filter(([key,n])=>n.parent===canon(p)).map(([key,n])=>({...n,path:key})),
            display:p=>p,
            export:()=>JSON.stringify({nodes}),
            read:p=>nodes[canon(p)]?.data,
            write(p,data){const key=canon(p);nodes[key]={kind:'text',name:key.split('/').at(-1),path:key,parent:this.parent(p),data};return key},
            writeImage(p,data){return this.write(p,data)},
            sync:async()=>{},error:()=>null
          };
          const old=window.LatchFS;window.LatchFS=fs;
          try {
            const test={format:'NornLab-Bridge-Test',version:1,preset:'Bram Mira Pip',norns:3};
            const save=window.NornFiles.saveJSON(test,'thread4-bridge-test.json','Research');
            await new Promise(r=>setTimeout(r,0));
            const pathField=document.querySelector('.nw-file-overlay .path');
            if(!pathField)throw Error('No Save As dialog');
            const path=pathField.value;
            document.querySelector('.nw-file-overlay .go').click();
            const saved=await save;
            if(!saved?.path)throw Error('Save did not complete');
            const load=window.NornFiles.openJSON('Research');
            await new Promise(r=>setTimeout(r,0));
            const field=document.querySelector('.nw-file-overlay .path');
            if(!field)throw Error('No Open dialog');
            field.value=path;
            document.querySelector('.nw-file-overlay .go').click();
            const loaded=await load;
            if(JSON.stringify(test)!==JSON.stringify(loaded))throw Error('Bridge roundtrip mismatch');
            return {ok:true,path,loaded,nodeCount:Object.keys(nodes).length};
          } finally {window.LatchFS=old;}
        }''')
        assert mock_bridge['ok'],mock_bridge
        smoke['mockLatchFSBridgeRoundtrip']=mock_bridge
        return {'summary':reduce_data(records),'raw':records,'smoke':smoke}
    finally:
        browser.close()


def main():
    a=argparse.ArgumentParser()
    a.add_argument('--baseline',required=True)
    a.add_argument('--updated',required=True)
    a.add_argument('--out',default='tests/results.json')
    opts=a.parse_args()
    baseline=Path(opts.baseline);updated=Path(opts.updated)
    assert hashlib.sha256(baseline.read_bytes()).hexdigest()==BASE_HASH,'Baseline SHA mismatch'
    result={'baseline_sha256':BASE_HASH,'updated_sha256':hashlib.sha256(updated.read_bytes()).hexdigest(),
      'hypothesis':'Doozer teaching uses unavailable body.x and erroneously computes Norn x=0',
      'design':'32 independent seeds (101..132), 3 spatial configurations, 3 fixed creature locations (800,1600,2400), 5 opportunities at 1..41 seconds; no creature motion, no external teaching. Uses actual NornCore + real Language Lab hear() and vocabulary API.',}
    with sync_playwright() as p:
        for key,path in [('control',baseline),('updated',updated)]:
            print('Running',key,flush=True)
            result[key]=run(path,p)
            print(json.dumps(result[key]['summary'],indent=2),flush=True)
    for side in ('control','updated'):
        data=result[side]['summary'];near=data['teacher_beside_beta'];false=data['teacher_near_world_origin'];none=data['teacher_far_from_all']
        assert sum(none['nonzero_hearing_trials_by_norn'])==0
        if side=='control':
            assert near['nonzero_hearing_trials_by_norn']==[0,0,0],near
            assert false['nonzero_hearing_trials_by_norn']==[32,32,32],false
        else:
            assert near['nonzero_hearing_trials_by_norn']==[0,32,0],near
            assert false['nonzero_hearing_trials_by_norn']==[0,0,0],false
    Path(opts.out).parent.mkdir(parents=True,exist_ok=True)
    Path(opts.out).write_text(json.dumps(result,indent=2))
    print('PASS: equivalent control vs updated spatial-listening tests and game smoke checks',flush=True)

if __name__=='__main__':main()
