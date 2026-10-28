import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {root,quote} from '../lib/core.mjs';
function fixture(t,{corrupt=false,platform='Linux'}={}){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'vibe-bootstrap-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const bin=path.join(dir,'fake-bin'),stage=path.join(dir,'stage'),prefix=path.join(dir,"install with space'quote"),home=path.join(dir,'home');
 for(const f of [bin,stage,home])fs.mkdirSync(f);
 const script=(name,body)=>{fs.writeFileSync(path.join(bin,name),'#!/bin/bash\n'+body,{mode:0o755});};
 script('id','echo 501\n');script('uname',`if [ "$1" = -s ]; then echo ${platform}; else echo x86_64; fi\n`);
 script('node','exit 1\n'); // Force bootstrap's no-Node path.
 const nodeName=`node-v24.1.0-${platform==='Linux'?'linux':'darwin'}-x64`;
 fs.mkdirSync(path.join(stage,nodeName,'bin'),{recursive:true});
 fs.writeFileSync(path.join(stage,nodeName,'bin/node'),`#!/bin/bash\nexec ${quote(process.execPath)} "$@"\n`,{mode:0o755});
 const archive=(name,folder)=>{const r=spawnSync('tar',['-czf',path.join(dir,name),'-C',stage,folder]);assert.equal(r.status,0);return crypto.createHash('sha256').update(fs.readFileSync(path.join(dir,name))).digest('hex');};
 const nodeHash=archive('node.tar.gz',nodeName);
 fs.writeFileSync(path.join(dir,'node-sums'),`${nodeHash}  ${nodeName}.tar.gz\n`);
 const app=path.join(stage,'set-my-vibe');fs.mkdirSync(app);
 for(const entry of ['bin','lib','catalog','package.json'])fs.cpSync(path.join(root,entry),path.join(app,entry),{recursive:true});
 const appHash=archive('app.tar.gz','set-my-vibe');
 fs.writeFileSync(path.join(dir,'app-sums'),`${corrupt?'0'.repeat(64):appHash}  set-my-vibe.tar.gz\n`);
 script('curl',`url=''; out=''
while [ "$#" -gt 0 ]; do
 case "$1" in https://*) url="$1"; shift;; -o) out="$2"; shift 2;; *) shift;; esac
done
case "$url" in
 *nodejs.org*SHASUMS256.txt) cp ${quote(path.join(dir,'node-sums'))} "$out";;
 *nodejs.org*.tar.gz) cp ${quote(path.join(dir,'node.tar.gz'))} "$out";;
 *set-my-vibe.tar.gz) cp ${quote(path.join(dir,'app.tar.gz'))} "$out";;
 *SHA256SUMS) cp ${quote(path.join(dir,'app-sums'))} "$out";;
 *) echo 'Unexpected network request' >&2; exit 1;;
esac\n`);
 const env={...process.env,PATH:bin+':'+process.env.PATH,HOME:home};delete env.SET_MY_VIBE_HOME;
 return {dir,prefix,env,run:()=>spawnSync('bash',[path.join(root,'install.sh'),'--prefix',prefix,'--no-setup'],{env,encoding:'utf8'})};
}
for(const platform of ['Linux','Darwin'])test(`bootstrap ${platform} no-Node path verifies artifacts and creates working quoted launcher`,t=>{
 const f=fixture(t,{platform});const r=f.run();assert.equal(r.status,0,r.stderr);const launcher=path.join(f.prefix,'bin/set-my-vibe');assert.ok(fs.existsSync(launcher));
 const version=spawnSync('bash',[launcher,'--version'],{env:f.env,encoding:'utf8'});assert.equal(version.status,0,version.stderr);assert.equal(version.stdout,'0.1.1\n');
 const alias=spawnSync('bash',[path.join(f.prefix,'bin/smv'),'--version'],{env:f.env,encoding:'utf8'});assert.equal(alias.status,0,alias.stderr);assert.equal(alias.stdout,version.stdout);
 assert.equal(fs.existsSync(path.join(f.prefix,'state.json')),false);assert.equal(fs.existsSync(path.join(f.prefix,'bootstrap.lock')),false);
 assert.equal(f.run().status,0,'bootstrap is repeatable');
});
test('bootstrap rejects corrupt release before exposing a launcher',t=>{const f=fixture(t,{corrupt:true});const r=f.run();assert.notEqual(r.status,0);assert.match(r.stderr,/Checksum mismatch/);assert.equal(fs.existsSync(path.join(f.prefix,'bin/set-my-vibe')),false);assert.equal(fs.existsSync(path.join(f.prefix,'bootstrap.lock')),false);});
test('bootstrap refuses unrelated executable overwrite',t=>{const f=fixture(t);fs.mkdirSync(path.join(f.prefix,'bin'),{recursive:true});const file=path.join(f.prefix,'bin/set-my-vibe');fs.writeFileSync(file,'unrelated');const r=f.run();assert.notEqual(r.status,0);assert.match(r.stderr,/unrelated/);assert.equal(fs.readFileSync(file,'utf8'),'unrelated');});

test('bootstrap preserves unrelated smv commands without switching the long launcher',t=>{const f=fixture(t);fs.mkdirSync(path.join(f.prefix,'bin'),{recursive:true});const file=path.join(f.prefix,'bin/smv');fs.writeFileSync(file,'unrelated');const r=f.run();assert.notEqual(r.status,0);assert.match(r.stderr,/unrelated smv/);assert.equal(fs.readFileSync(file,'utf8'),'unrelated');assert.equal(fs.existsSync(path.join(f.prefix,'bin/set-my-vibe')),false);});
