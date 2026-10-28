import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import { context, tools, skills, profiles, plan, commands, resolveSelection, applyPlan, loadState, saveState, probeStatus, status, skillCommand, lock, executeInstall, root } from '../lib/core.mjs';
import {configureShell} from '../lib/shell.mjs';
import {projectPlan,executeProject,projectCheck} from '../lib/project.mjs';
function fixture(t,platform='linux') {
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'vibe-test-'));t.after(()=>fs.rmSync(home,{recursive:true,force:true}));
 const ctx=context({home,data:path.join(home,'data'),platform,arch:'arm64'});ctx.env.PATH=path.join(home,'bin');fs.mkdirSync(ctx.env.PATH);return ctx;
}
function bin(ctx,name,body='exit 0') {const f=path.join(ctx.home,'bin',name);fs.writeFileSync(f,`#!/bin/sh\n${body}\n`,{mode:0o755});return f;}
function cli(ctx,...args) {return spawnSync(process.execPath,[path.join(root,'bin/set-my-vibe.mjs'),...args],{env:{...process.env,HOME:ctx.home,SET_MY_VIBE_HOME:ctx.data},encoding:'utf8'});}
test('catalog IDs, profiles, public skill sources and dependencies are valid',()=>{
 assert.equal(new Set(tools.map(t=>t.id)).size,tools.length);
 for(const t of tools){assert.match(t.id,/^[a-z0-9-]+$/);assert.match(t.docs,/^https:\/\//);for(const d of t.dependencies||[])assert.ok(tools.some(t=>t.id===d));}
 for(const p of Object.values(profiles))assert.doesNotThrow(()=>resolveSelection(p));
 for(const s of skills){assert.match(s.source,/^[\w.-]+\/[\w.-]+$/);assert.ok(!/superdev/i.test(JSON.stringify(s)));}
});
test('dependencies are ordered and shared dependencies deduplicated',t=>{
 const ctx=fixture(t);const p=plan(['envx','gh','go'],ctx);assert.equal(p.filter(i=>i.id==='homebrew').length,1);assert.ok(p.findIndex(i=>i.id==='gnupg')<p.findIndex(i=>i.id==='envx'));assert.equal(p[0].id,'homebrew');
});
test('existing tools skip installation and do not bootstrap brew unnecessarily',t=>{const ctx=fixture(t);bin(ctx,'go');assert.deepEqual(plan(['go'],ctx).map(i=>[i.id,i.state]),[['go','installed']]);});
test('macOS-only tools are unsupported on Linux and Intel T3 CLI is explicit',t=>{const ctx=fixture(t);assert.equal(plan(['xcode'],ctx)[0].state,'unsupported');ctx.platform='darwin';ctx.arch='x64';assert.equal(plan(['t3'],ctx)[0].state,'unsupported');});
test('failed dependencies block dependents and resume succeeds without reinstalling successes',t=>{
 const ctx=fixture(t);const state=loadState(ctx);const have=new Set();const calls=[];let fail=true;
 const opts={detect:t=>have.has(t.id),execute:i=>{calls.push(i.id);if(i.id==='homebrew'&&fail)return false;have.add(i.id);return true;},log:()=>{}};
 assert.equal(applyPlan(plan(['envx'],ctx),ctx,state,opts),3);assert.equal(state.results.envx,'blocked');assert.deepEqual(calls,['homebrew']);fail=false;
 assert.equal(applyPlan(plan(['envx'],ctx),ctx,state,opts),0);const count=calls.length;applyPlan(plan(['envx'],ctx),ctx,state,opts);assert.equal(calls.length,count);assert.equal(loadState(ctx).results.envx,'installed');
});
test('success without executable detection stays needs-path, never installed',t=>{const ctx=fixture(t),s=loadState(ctx);applyPlan(plan(['bun'],ctx),ctx,s,{execute:()=>true,detect:()=>false,log:()=>{}});assert.equal(s.results.bun,'needs-path');});
test('state is private, atomic and corrupt state is not overwritten',t=>{const ctx=fixture(t);saveState(ctx,loadState(ctx));assert.equal(fs.statSync(path.join(ctx.data,'state.json')).mode&0o777,0o600);fs.writeFileSync(path.join(ctx.data,'state.json'),'bad');assert.throws(()=>loadState(ctx),/Invalid state/);});
test('operation lock excludes concurrent mutations',t=>{const ctx=fixture(t);const release=lock(ctx);assert.throws(()=>lock(ctx),/Another operation/);release();lock(ctx)();});
test('status defaults to no subprocess and user confirmation is not verification',t=>{const ctx=fixture(t);bin(ctx,'gh');const s=loadState(ctx);s.acknowledged['gh:login']=true;let calls=0;const rows=status(['gh'],ctx,s,{runner:()=>{calls++;}});assert.equal(calls,0);assert.equal(rows[0].steps[0].state,'user-confirmed');});
test('auth probe discards secret/account output and handles timeout, bad JSON and failure',t=>{
 const ctx=fixture(t);const secret='fixture-account-value';const p={argv:['gh','auth','status'],success:'exit'};
 assert.equal(probeStatus(p,ctx,()=>({status:0,stdout:secret})),'verified');
 assert.equal(probeStatus(p,ctx,()=>({status:1,stderr:secret})),'pending');
 assert.equal(probeStatus(p,ctx,()=>({status:null,error:Error('timeout')})),'unknown');
 assert.equal(probeStatus({...p,success:'json',field:'loggedIn'},ctx,()=>({status:0,stdout:'invalid'})),'unknown');
 assert.equal(probeStatus({...p,success:'json',field:'loggedIn'},ctx,()=>({status:0,stdout:'{"loggedIn":false}'})),'pending');
 assert.equal(probeStatus({...p,success:'json',field:'loggedIn'},ctx,()=>({status:0,stdout:'{"loggedIn":true}'})),'verified');
});
test('dry-run CLI produces a plan without writing state or shell files',t=>{const ctx=fixture(t);const r=cli(ctx,'install','bun','--dry-run','--json');assert.equal(r.status,0,r.stderr);assert.ok(JSON.parse(r.stdout).some(x=>x.id==='bun'));assert.equal(fs.existsSync(ctx.data),false);assert.equal(fs.existsSync(path.join(ctx.home,'.zshrc')),false);});
test('unknown flags, tools, profiles and malicious manifest values are rejected',t=>{const ctx=fixture(t);for(const args of [['plan','bun','--oops'],['plan','unknown-tool'],['plan','--profile','nope'],['project','next','../../bad']])assert.notEqual(cli(ctx,...args).status,0);const f=path.join(ctx.home,'intent.json');fs.writeFileSync(f,JSON.stringify({version:1,tools:['bun'],script:'bad'}));assert.match(cli(ctx,'install','--from',f,'--dry-run').stderr,/Invalid intent/);});
test('shell setup preserves unrelated bytes, is repeatable and quotes unusual paths',t=>{
 const ctx=fixture(t);ctx.data=path.join(ctx.home,"a b'c$()");const f=path.join(ctx.home,'.zshrc');const original='export PRIVATE_PLACEHOLDER=do-not-read\n';fs.writeFileSync(f,original);configureShell(ctx);const once=fs.readFileSync(f,'utf8');configureShell(ctx);assert.equal(fs.readFileSync(f,'utf8'),once);assert.ok(once.startsWith(original));assert.equal(spawnSync('bash',['-n',path.join(ctx.data,'shell.sh')]).status,0);
});
test('shell dry run is write-free and shell symlinks are rejected',t=>{const ctx=fixture(t);configureShell(ctx,{dryRun:true});assert.equal(fs.existsSync(ctx.data),false);fs.writeFileSync(path.join(ctx.home,'target'),'original');fs.symlinkSync(path.join(ctx.home,'target'),path.join(ctx.home,'.zshrc'));assert.throws(()=>configureShell(ctx),/symlink/);assert.equal(fs.readFileSync(path.join(ctx.home,'target'),'utf8'),'original');});
test('skills select explicit names and agents, never wildcard all agents',()=>{const argv=skillCommand(skills[0],['codex','claude-code']);assert.ok(argv.includes('--skill'));assert.ok(!argv.includes('*'));assert.throws(()=>skillCommand(skills[0],['untrusted;command']),/Choose agents/);});
test('project planner rejects existing targets, traversal and shell metacharacters',t=>{const ctx=fixture(t);for(const name of ['../oops','--help','x;touch','a b','$(id)','/tmp/app'])assert.throws(()=>projectPlan('next',name,ctx.home));fs.mkdirSync(path.join(ctx.home,'existing'));assert.throws(()=>projectPlan('next','existing',ctx.home),/already exists/);});
test('project preview runs no generator; Cloudflare disables initial deploy',t=>{const ctx=fixture(t);const p=projectPlan('cloudflare','my-app',ctx.home);assert.ok(p.argv.includes('--no-deploy'));assert.equal(fs.existsSync(p.target),false);});
test('project executes argv safely and only writes guide after success',t=>{const ctx=fixture(t);bin(ctx,'bun');bin(ctx,'bunx');const p=projectPlan('neon','my-app',ctx.home);executeProject(p,ctx,(argv,c,options)=>{assert.equal(options.cwd,ctx.home);assert.deepEqual(argv,p.argv);fs.mkdirSync(p.target);return {status:0};});assert.match(fs.readFileSync(path.join(p.target,'VIBE-SETUP.md'),'utf8'),/not evidence of production readiness/);const bad=projectPlan('next','failed',ctx.home);assert.throws(()=>executeProject(bad,ctx,()=>({status:1})),/Generator failed/);assert.equal(fs.existsSync(bad.target),false);});
test('shadcn requires existing package.json, project check does not claim tests pass',t=>{const ctx=fixture(t);assert.throws(()=>projectPlan('shadcn',null,ctx.home));fs.writeFileSync(path.join(ctx.home,'package.json'),JSON.stringify({scripts:{test:'echo test'}}));assert.equal(projectPlan('shadcn',null,ctx.home).argv[2],'init');assert.equal(projectCheck(ctx.home)[0].state,'script-present-not-run');});
test('script download failure never executes partial content and temp is cleaned',t=>{const ctx=fixture(t);const calls=[];const item=plan(['bun'],ctx)[0];assert.equal(executeInstall(item,ctx,argv=>{calls.push(argv);return {status:22};}),false);assert.equal(calls.length,1);assert.equal(fs.existsSync(calls[0].at(-1)),false);});
test('npm prefix is passed as one literal argument without shell evaluation',t=>{const ctx=fixture(t);ctx.data=path.join(ctx.home,'path with spaces $(id)');const cmd=commands(plan(['codex'],ctx)[0],ctx)[0];assert.equal(cmd[4],path.join(ctx.data,'npm'));});
test('CLI works through a symlink as installed package binaries do',t=>{const ctx=fixture(t);const f=path.join(ctx.home,'set-my-vibe');fs.symlinkSync(path.join(root,'bin/set-my-vibe.mjs'),f);const r=spawnSync(process.execPath,[f,'--version'],{encoding:'utf8'});assert.equal(r.status,0);assert.equal(r.stdout,'0.1.1\n');});
