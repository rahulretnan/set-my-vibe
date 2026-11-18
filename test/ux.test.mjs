import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PassThrough } from 'node:stream';
import { checkUpdate } from '../lib/update.mjs';
import { pick } from '../lib/picker.mjs';
import { planSkillUpdates, refreshSkill } from '../lib/skill-update.mjs';

test('release lookup compares numeric versions, rejects prereleases and never downgrades', async () => {
  const release = tag_name => async () => new Response(JSON.stringify({ tag_name }));
  assert.equal((await checkUpdate('0.1.9', release('v0.1.10'))).available, true);
  assert.equal((await checkUpdate('0.1.10', release('v0.1.9'))).available, false);
  await assert.rejects(checkUpdate('0.1.9', release('v0.2.0-rc.1')), /stable release/);
  await assert.rejects(checkUpdate('0.1.9', async () => new Response('', {status:403})), /HTTP 403/);
});

test('checkboxes retain choices through filtering and restore terminal input', async () => {
  const input=new PassThrough(), output=new PassThrough();
  input.isTTY=output.isTTY=true;
  input.setRawMode=raw=>{input.isRaw=raw;};
  const items=[{id:'git',label:'Git'},{id:'node',label:'Node languages'},{id:'ripgrep',label:'Ripgrep text'}];
  const selection=pick(items,{title:'Tools',initial:['git'],multiple:true,input,output});
  for(const [str,key] of [[' ',{name:'space'}],['/',{}],['t',{}],['e',{}],['x',{}],['t',{}],
    ['\r',{name:'return'}],[' ',{name:'space'}],['\r',{name:'return'}]]) input.emit('keypress',str,key);
  assert.deepEqual(await selection,['ripgrep']);
  assert.equal(input.isRaw,false);
  assert.equal(input.listenerCount('keypress'),0);
});

test('skill update is limited to verified globally installed SMV selections', t => {
  const home=fs.mkdtempSync(path.join(os.tmpdir(),'smv-skill-test-'));
  t.after(()=>fs.rmSync(home,{recursive:true,force:true}));
  const id='agent-browser', ctx={home,env:{}};
  const target=path.join(home,'.agents','skills',id);
  fs.mkdirSync(target,{recursive:true});
  fs.writeFileSync(path.join(target,'SKILL.md'),'fixture');
  const lock=path.join(home,'.agents','.skill-lock.json');
  const record={source:'vercel-labs/agent-browser',sourceType:'github',skillPath:'skills/agent-browser/SKILL.md',skillFolderHash:'fixture'};
  fs.writeFileSync(lock,JSON.stringify({skills:{[id]:record}}));
  const state={skills:[id,'agent-device'],agents:['codex']};
  const [entry]=planSkillUpdates([],state,ctx);
  assert.deepEqual(entry.argv,['npx','--yes','skills@latest','update',id,'--global','--yes']);
  assert.equal(refreshSkill(entry,ctx,()=>({status:0})),true);
  assert.equal(refreshSkill(entry,ctx,()=>({status:1})),false);
  assert.throws(()=>planSkillUpdates(['unmanaged'],state,ctx),/not tracked/);
  fs.writeFileSync(lock,JSON.stringify({skills:{[id]:{...record,source:'different/source'}}}));
  assert.match(planSkillUpdates([],state,ctx)[0].reason,/could not be verified/);
});
