#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import { tools, skills, profiles, recipes, root, context, display, installed, supported, loadState, saveState, lock, resolveSelection, plan, commands, applyPlan, status, skillCommand, skillStatus, run, agentDirs } from '../lib/core.mjs';
import { configureShell } from '../lib/shell.mjs';
import { projectPlan, projectGuide, executeProject, projectCheck } from '../lib/project.mjs';

const help=`smv / set-my-vibe 0.1.1

  setup                              Interactive tool selection
  list [--group NAME] [--json]        Browse available tools
  profiles                           List curated tool profiles
  plan [IDs...] [--profile NAME]      Preview dependencies and commands
  install [IDs...] [--profile NAME]   Install selected tools; --yes for automation
  install --from FILE                Restore an exported intent manifest
  resume                             Retry the saved selection
  status [IDs...] [--all]             Installed tools and remaining setup
  status --verify                    Opt-in account/service checks (output suppressed)
  scan [--json]                      Local catalog inventory, no credential reads
  export [--detected]                 Export portable JSON intent (no credentials)
  configure shell [--dry-run]         Append Bash/Zsh hooks explicitly
  mark TOOL STEP [--undo]             Record/revoke a user-confirmed manual step
  skills list [--group NAME]          Browse public skill sources
  skills plan|install [IDs...]        Select skills (--all or --group supported)
  skills status                      Check saved skill targets
  project list                       Browse project recipes
  project RECIPE NAME [--run]         Preview or execute a new-project generator
  project shadcn --cwd DIR [--run]    Initialize shadcn in an existing project
  project check [--cwd DIR]           Report project check entry points, not readiness

Options: --json, --dry-run, --yes, --profile NAME, --all, --group NAME,
         --agents codex,claude-code,cursor,gemini-cli,antigravity
Read-only by default except setup/install/resume/configure/mark/skills install.
Project generators execute only with --run. No automatic cloud provisioning.
`;
const bools=new Set(['json','dry-run','yes','all','verify','detected','undo','run','help','version']);
const values=new Set(['profile','group','agents','cwd','from']);
export function parse(args) {
 const opts={},pos=[];
 for(let i=0;i<args.length;i++) {
  const a=args[i];
  if(!a.startsWith('--')) {if(a.startsWith('-')) throw Error(`Unknown flag: ${a}`);pos.push(a);continue;}
  const key=a.slice(2);
  if(bools.has(key)) opts[key]=true;
  else if(values.has(key)) {if(!args[i+1]||args[i+1].startsWith('--')) throw Error(`Missing value for ${a}`);opts[key]=args[++i];}
  else throw Error(`Unknown flag: ${a}`);
 }
 return {opts,pos};
}
function assertOptions(opts,allowed) { for(const k of Object.keys(opts)) if(!allowed.includes(k)) throw Error(`--${k} is not supported for this command.`); }
function print(data,json) { console.log(json?JSON.stringify(data,null,2):data); }
function assertMutable() {if(process.getuid?.()===0) throw Error('Run as your regular user, not root. Upstream installers request sudo only where needed.');}
async function prompt(question) {
 if(!process.stdin.isTTY || !process.stdout.isTTY) throw Error('Interactive terminal required. Select IDs or a profile and pass --yes, or preview with --dry-run.');
 const rl=readline.createInterface({input:process.stdin,output:process.stdout});
 try{return await rl.question(question);} finally{rl.close();}
}
async function confirm(opts) {if(!opts.yes && !/^y(es)?$/i.test((await prompt('Run these commands? [y/N] ')).trim())) throw Error('Cancelled. No installation started.');}
function showPlan(items,ctx,json=false) {
 const detailed=items.map(item=>({...item,commands:item.state==='install'?commands(item,ctx):[]}));
 if(json) return print(detailed,true);
 for(const i of detailed) {
  console.log(`${i.id.padEnd(21)} ${i.state}`);
  for(const c of i.commands) console.log(`  $ ${display(c)}`);
  if(i.installer?.env && Object.keys(i.installer.env).length) console.log(`  Installer environment: ${JSON.stringify(i.installer.env)}`);
  if(i.state==='manual'||i.state==='unsupported') console.log(`  ${i.note||'Follow platform requirements.'} ${i.docs}`);
 }
}
function selected(pos,opts,state) {
 let ids=opts.all?tools.map(t=>t.id):pos;
 if(opts.from) {
  if(ids.length||opts.profile)throw Error('--from cannot be combined with IDs, --all or --profile.');
  let m;try{m=JSON.parse(fs.readFileSync(opts.from,'utf8'));}catch{throw Error('Cannot parse intent manifest.');}
  if(m.version!==1||!Array.isArray(m.tools)||m.tools.some(x=>typeof x!=='string')||Object.keys(m).some(k=>!['version','tools','skills','agents'].includes(k)))throw Error('Invalid intent manifest. Only version, tools, skills and agents are allowed.');
  ids=m.tools;
 }
 const result=resolveSelection(ids,opts.profile);
 if(!result.length)throw Error('Select tool IDs, --profile, --all, or use setup.');
 return result;
}
async function main(args) {
 const {opts,pos}=parse(args);const cmd=pos.shift()||'help';
 if(opts.version||cmd==='version'){console.log('0.1.1');return;}
 if(cmd==='help'||opts.help){console.log(help);return;}
 const [major,minor]=process.versions.node.split('.').map(Number);
 if(major<22||(major===22&&minor<20))throw Error('Node.js 22.20+ required. Run install.sh to bootstrap a private runtime.');
 const ctx=context();
 if(!['darwin','linux'].includes(ctx.platform))throw Error('Supported platforms: macOS and Linux. Windows users can use a supported WSL2 Linux distribution.');
 const state=loadState(ctx);
 if(cmd==='list') {
  assertOptions(opts,['group','json']);
  const rows=tools.filter(t=>!opts.group||t.group===opts.group).map(t=>({id:t.id,name:t.name,group:t.group,supported:supported(t,ctx),docs:t.docs}));
  if(!rows.length)throw Error('Unknown or empty group.');
  print(opts.json?rows:rows.map(t=>`${t.id.padEnd(21)} ${t.group.padEnd(12)} ${t.name}${t.supported?'':' (unsupported here)'}`).join('\n'),opts.json);return;
 }
 if(cmd==='profiles'){assertOptions(opts,['json']);print(opts.json?profiles:Object.entries(profiles).map(([k,v])=>`${k}: ${v.join(', ')}`).join('\n'),opts.json);return;}
 if(['plan','install','resume','setup'].includes(cmd)) {
  assertOptions(opts,['profile','all','from','dry-run','yes','json']);
  let ids;
  if(cmd==='resume') {if(pos.length||opts.profile||opts.from||opts.all)throw Error('resume uses only saved selection.');ids=resolveSelection(state.selected);if(!ids.length)throw Error('No saved selection. Run setup first.');}
  else if(cmd==='setup'&&!pos.length&&!opts.profile&&!opts.all&&!opts.from) {
   console.log(tools.map((t,i)=>`${String(i+1).padStart(2)}. ${t.id.padEnd(21)} ${t.group}`).join('\n'));
   const answer=(await prompt('Choose tool numbers or IDs separated by commas (or a profile name): ')).trim();
   ids=Object.hasOwn(profiles,answer)?profiles[answer]:answer.split(/[\s,]+/).filter(Boolean).map(x=>/^\d+$/.test(x)?tools[Number(x)-1]?.id||x:x);
   ids=resolveSelection(ids);if(!ids.length)throw Error('No tools selected.');
  } else ids=selected(pos,opts,state);
  const items=plan(ids,ctx);showPlan(items,ctx,opts.json);
  if(cmd==='plan'||opts['dry-run'])return;
  if(opts.json)throw Error('--json is available only with plan or --dry-run for installs.');
  assertMutable();await confirm(opts);const release=lock(ctx);
  try {const current=loadState(ctx);const failures=applyPlan(items,ctx,current);if(failures)process.exitCode=1;}finally{release();}
  console.log('Run set-my-vibe status for remaining setup. Run configure shell explicitly for PATH/hooks.');return;
 }
 if(cmd==='scan'||cmd==='status') {
  assertOptions(opts,cmd==='scan'?['json']:['all','json','verify']);
  const ids=cmd==='scan'||opts.all?tools.map(t=>t.id):pos.length?resolveSelection(pos):state.selected.length?state.selected:tools.map(t=>t.id);
  const rows=status(ids,ctx,state,{verify:opts.verify});
  if(opts.json)print(rows,true);else for(const r of rows){console.log(`${r.id.padEnd(21)} ${r.installation}${r.lastAttempt?` (last: ${r.lastAttempt})`:''}`);if(cmd==='status')for(const s of r.steps)console.log(`  [${s.state}] ${s.id}: ${s.text}`);}
  return;
 }
 if(cmd==='export') {
  assertOptions(opts,['detected']);
  print({version:1,tools:opts.detected?tools.filter(t=>supported(t,ctx)&&installed(t,ctx)).map(t=>t.id):state.selected,skills:state.skills,agents:state.agents},true);return;
 }
 if(cmd==='configure') {
  assertOptions(opts,['dry-run','yes']);if(pos.length!==1||pos[0]!=='shell')throw Error('Usage: configure shell [--dry-run] [--yes]');
  const preview=configureShell(ctx,{dryRun:true});console.log(preview.content);console.log(`Append source hook to: ${preview.targets.join(', ')}`);
  if(opts['dry-run'])return;
  assertMutable();await confirm(opts);const release=lock(ctx);try{configureShell(ctx);}finally{release();}console.log('Shell hooks written. Open a new terminal.');return;
 }
 if(cmd==='mark') {
  assertOptions(opts,['undo']);const [id,step]=pos;const t=tools.find(t=>t.id===id);
  if(pos.length!==2||!t?.steps.some(s=>s.id===step))throw Error('Use mark TOOL STEP with IDs from status.');
  assertMutable();const release=lock(ctx);try {const current=loadState(ctx);if(opts.undo)delete current.acknowledged[`${id}:${step}`];else current.acknowledged[`${id}:${step}`]=true;saveState(ctx,current);}finally{release();}
  console.log(opts.undo?'Manual confirmation removed.':'Recorded as user-confirmed, not verified.');return;
 }
 if(cmd==='skills') {
  const sub=pos.shift()||'list';
  assertOptions(opts,['all','group','agents','json','dry-run','yes','from']);
  if(sub==='status'){const rows=skillStatus(state.skills,state.agents,ctx,state.skillTargets);print(opts.json?rows:rows.length?rows.map(r=>`${r.id}: ${r.agents.map(a=>`${a.agent}=${a.installed?'installed':'missing'}`).join(', ')}`).join('\n'):'No skills selected yet.',opts.json);return;}
  let manifestAgents;
  if(opts.from){
   if(pos.length||opts.all||opts.group)throw Error('--from cannot be combined with skill IDs, --all or --group.');
   const manifest=JSON.parse(fs.readFileSync(opts.from,'utf8'));
   if(manifest.version!==1||!Array.isArray(manifest.skills)||!Array.isArray(manifest.agents))throw Error('Invalid skill intent manifest.');
   pos.push(...manifest.skills);manifestAgents=manifest.agents;
  }
  let chosen=skills.filter(s=>(!opts.group||s.group===opts.group)&&(opts.all||opts.group||sub==='list'||pos.includes(s.id)));
  for(const id of pos)if(!skills.some(s=>s.id===id))throw Error(`Unknown skill: ${id}`);
  if(!chosen.length)throw Error('Select skill IDs, --group or --all.');
  if(sub==='list'){print(opts.json?chosen:chosen.map(s=>`${s.id.padEnd(30)} ${s.group.padEnd(9)} ${s.source}`).join('\n'),opts.json);return;}
  if(!['plan','install'].includes(sub))throw Error('Use skills list, plan, install or status.');
  const agents=opts.agents?opts.agents.split(','):manifestAgents||['codex','claude-code'];
  const entries=chosen.map(s=>({id:s.id,argv:skillCommand(s,agents)}));
  print(opts.json?entries:entries.map(e=>display(e.argv)).join('\n'),opts.json);
  if(sub==='plan'||opts['dry-run'])return;
  if(opts.json)throw Error('--json installs require --dry-run.');
  assertMutable();await confirm(opts);const release=lock(ctx);
  try {
   const current=loadState(ctx);current.skills=[...new Set([...current.skills,...chosen.map(s=>s.id)])];current.agents=[...new Set([...current.agents,...agents])];current.skillTargets ||= {};for(const entry of entries)current.skillTargets[entry.id]=[...new Set([...(current.skillTargets[entry.id]||[]),...agents])];saveState(ctx,current);
   for(const entry of entries){
    if(skillStatus([entry.id],agents,ctx)[0].agents.every(a=>a.installed)){console.log(`${entry.id}: already installed`);continue;}
    const r=run(entry.argv,ctx,{env:{DISABLE_TELEMETRY:'1'}});
    const okay=r.status===0&&skillStatus([entry.id],agents,ctx)[0].agents.every(a=>a.installed);
    console.log(`${entry.id}: ${okay?'installed':'failed or target not detected'}`);if(!okay)process.exitCode=1;
   }
  }finally{release();}return;
 }
 if(cmd==='project') {
  assertOptions(opts,['cwd','run','yes','json','dry-run']);
  const sub=pos.shift()||'list';const cwd=opts.cwd||process.cwd();
  if(sub==='list'){print(opts.json?recipes:recipes.map(r=>`${r.id.padEnd(18)} ${r.name}`).join('\n'),opts.json);return;}
  if(sub==='check'){const rows=projectCheck(cwd);print(opts.json?rows:rows.map(r=>`${r.id}: ${r.state}${r.guide?`\n  ${r.guide}`:''}`).join('\n'),opts.json);return;}
  if(pos.length>1)throw Error('One project name is allowed.');
  const p=projectPlan(sub,pos[0],cwd);
  print(opts.json?{...p,guide:projectGuide(p)}:`$ ${display(p.argv)}\nWorking directory: ${p.cwd}\nTools: ${p.recipe.tools.join(', ')}\n\n${projectGuide(p)}`,opts.json);
  if(!opts.run||opts['dry-run'])return;
  if(opts.json)throw Error('--json is for project previews only.');
  assertMutable();await confirm(opts);executeProject(p,ctx);console.log('Generator completed. Follow its README and VIBE-SETUP.md before deployment.');return;
 }
 throw Error(`Unknown command: ${cmd}. Run set-my-vibe help.`);
}
if(process.argv[1]&&fs.realpathSync(process.argv[1])===fileURLToPath(import.meta.url)) {
 main(process.argv.slice(2)).catch(e=>{console.error(`Error: ${e.message}`);process.exitCode=1;});
}
