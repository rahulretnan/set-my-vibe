import assert from 'node:assert/strict';
import {tools,skills,profiles,recipes,plan,context} from '../lib/core.mjs';
for(const collection of [tools,skills,recipes])assert.equal(new Set(collection.map(x=>x.id)).size,collection.length,'duplicate IDs');
for(const t of tools){
 assert.match(t.id,/^[a-z0-9-]+$/);assert.match(t.docs,/^https:\/\//);
 assert.ok(t.platforms.every(p=>['darwin','linux'].includes(p)));
 assert.equal(new Set(t.steps.map(s=>s.id)).size,t.steps.length);
 for(const i of Object.values(t.install)){
  assert.equal(['npm','brew','cask','script'].filter(k=>i[k]).length,1);
  if(i.script)assert.match(i.script,/^https:\/\//);
  if(i.npm)assert.match(i.npm,/^(@[a-z0-9-]+\/)?[a-z0-9-]+$/);
  if(i.brew||i.cask)assert.match(i.brew||i.cask,/^[a-z0-9@/.-]+$/);
 }
}
for(const p of ['darwin','linux'])for(const a of ['arm64','x64'])for(const ids of Object.values(profiles))plan(ids,context({platform:p,arch:a}));
for(const s of skills){assert.match(s.source,/^[\w.-]+\/[\w.-]+$/);assert.match(s.skill,/^[a-z0-9-]+$/);}
for(const r of recipes){assert.equal(r.command[0],'bunx');assert.ok(r.tools.every(id=>tools.some(t=>t.id===id)));}
console.log(`Validated ${tools.length} tools, ${skills.length} skills, ${Object.keys(profiles).length} profiles and ${recipes.length} recipes.`);
