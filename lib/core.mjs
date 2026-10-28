import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

export const root = fileURLToPath(new URL('../', import.meta.url));
export const readCatalog = name => JSON.parse(fs.readFileSync(path.join(root, 'catalog', `${name}.json`), 'utf8'));
export const tools = readCatalog('tools');
export const skills = readCatalog('skills');
export const profiles = readCatalog('profiles');
export const recipes = readCatalog('recipes');
export const quote = s => `'${String(s).replaceAll("'", "'\\''")}'`;
export const display = argv => argv.map(x => /^[a-zA-Z0-9_./:@=+,-]+$/.test(x) ? x : quote(x)).join(' ');
export function context(overrides = {}) {
  const home = overrides.home || os.homedir();
  const data = overrides.data || process.env.SET_MY_VIBE_HOME || path.join(home, '.local/share/set-my-vibe');
  const env = { ...process.env, HOME: home, ...overrides.env };
  const extra = [path.join(data, 'npm/bin'), path.join(data, 'runtime/bin'), path.join(home, '.local/bin'), path.join(home, '.bun/bin'), path.join(home, '.cargo/bin'), '/opt/homebrew/bin', '/usr/local/bin', '/home/linuxbrew/.linuxbrew/bin', ...['/opt/homebrew', '/usr/local', '/home/linuxbrew/.linuxbrew'].flatMap(p => ['node@24','postgresql@16','openjdk@17','python@3.13','ruby'].map(k => path.join(p,'opt',k,'bin'))), path.join(home,'Library/Android/sdk/platform-tools'), path.join(home,'Android/Sdk/platform-tools')];
  env.PATH = [...new Set([...(env.PATH || '').split(path.delimiter), ...extra])].filter(Boolean).join(path.delimiter);
  return { home, data, env, platform: process.platform, arch: process.arch, ...overrides, env };
}
export function executable(name, ctx) {
  for (const dir of (ctx.env.PATH || '').split(path.delimiter).filter(Boolean)) {
    const f = path.join(dir, name);
    try { fs.accessSync(f, fs.constants.X_OK); if (fs.statSync(f).isFile()) return f; } catch {}
  }
  return null;
}
export function supported(t, ctx) {
  return t.platforms.includes(ctx.platform) && !t.unsupportedArch?.[ctx.platform]?.includes(ctx.arch);
}
export function installed(t, ctx) {
  const d = t.detect;
  if (d.command) return !!executable(d.command, ctx);
  if (d.commands) return d.commands.every(c => executable(c, ctx));
  if (d.file) return fs.existsSync(path.join(ctx.home, d.file));
  if (d.app) return ctx.platform === 'darwin' && [path.join('/Applications', d.app), path.join(ctx.home, 'Applications', d.app)].some(f => fs.existsSync(f));
  return false;
}
export function loadState(ctx) {
  try {
    const s = JSON.parse(fs.readFileSync(path.join(ctx.data, 'state.json'), 'utf8'));
    if (s.version !== 1 || !Array.isArray(s.selected) || !Array.isArray(s.skills) || !s.results || !s.acknowledged) throw Error();
    return s;
  } catch (e) {
    if (e.code === 'ENOENT') return { version: 1, selected: [], skills: [], agents: [], results: {}, acknowledged: {} };
    throw Error('Invalid state.json. Back it up and repair or remove it; refusing to overwrite existing state.');
  }
}
export function saveState(ctx, state) {
  fs.mkdirSync(ctx.data, { recursive: true, mode: 0o700 });
  const file = path.join(ctx.data, 'state.json');
  const temp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temp, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600, flag: 'wx' });
  fs.renameSync(temp, file);
}
export function lock(ctx) {
  fs.mkdirSync(ctx.data, { recursive: true, mode: 0o700 });
  const dir = path.join(ctx.data, 'operation.lock');
  try { fs.mkdirSync(dir); } catch (e) {
    if (e.code === 'EEXIST') throw Error(`Another operation holds ${dir}. If a previous process crashed, confirm it has stopped before removing that directory.`);
    throw e;
  }
  return () => fs.rmdirSync(dir);
}
export function resolveSelection(ids, profile) {
  const wanted = [...(profile ? profiles[profile] || (() => { throw Error(`Unknown profile: ${profile}`); })() : []), ...ids];
  for (const id of wanted) if (!tools.some(t => t.id === id)) throw Error(`Unknown tool: ${id}`);
  return [...new Set(wanted)];
}
export function installer(t, ctx) { return t.install[ctx.platform] || t.install.all; }
export function plan(ids, ctx) {
  const result = [], seen = new Set(), visiting = new Set();
  function visit(id) {
    if (seen.has(id)) return;
    if (visiting.has(id)) throw Error(`Dependency cycle at ${id}`);
    visiting.add(id);
    const t = tools.find(t => t.id === id);
    if (!t) throw Error(`Unknown dependency: ${id}`);
    const i = installer(t, ctx);
    const deps = [...(t.dependencies || [])];
    if (supported(t, ctx) && !installed(t, ctx) && (i?.brew || i?.cask)) deps.push('homebrew');
    if (supported(t, ctx)) for (const dep of deps) visit(dep);
    result.push({ id, name: t.name, state: !supported(t, ctx) ? 'unsupported' : installed(t, ctx) ? 'installed' : i ? 'install' : 'manual', dependencies: deps, installer: i || null, docs: t.docs, note: t.manual || null });
    visiting.delete(id); seen.add(id);
  }
  ids.forEach(visit);
  return result;
}
export function commands(item, ctx) {
  const i = item.installer;
  if (!i) return [];
  if (i.npm) return [['npm', 'install', '--global', '--prefix', path.join(ctx.data, 'npm'), i.npm]];
  if (i.brew) return [['brew', 'install', i.brew]];
  if (i.cask) return [['brew', 'install', '--cask', i.cask]];
  return [['curl', '--fail', '--silent', '--show-error', '--location', '--proto', '=https', '--tlsv1.2', i.script, '-o', '<temporary-installer>'], ['bash', '<temporary-installer>', ...(i.args || [])]];
}
export function run(argv, ctx, { quiet = false, timeout, cwd, env = {} } = {}) {
  return spawnSync(argv[0], argv.slice(1), { env: { ...ctx.env, ...env }, cwd, stdio: quiet ? ['ignore','pipe','pipe'] : 'inherit', encoding: 'utf8', maxBuffer: 1024 * 1024, timeout: timeout || (quiet ? 12000 : undefined), shell: false });
}
export function executeInstall(item, ctx, runner = run) {
  const i = item.installer;
  if (!i) return false;
  if (!i.script) return runner(commands(item, ctx)[0], ctx).status === 0;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'set-my-vibe-'));
  const file = path.join(tmp, 'install.sh');
  try {
    const fetch = runner(['curl','--fail','--silent','--show-error','--location','--proto','=https','--tlsv1.2','--connect-timeout','15','--max-time','120',i.script,'-o',file], ctx);
    if (fetch.status !== 0) return false;
    return runner(['bash',file,...(i.args || [])],ctx,{env:i.env || {}}).status === 0;
  } finally { fs.rmSync(tmp,{recursive:true,force:true}); }
}
export function applyPlan(items, ctx, state, { execute = executeInstall, detect = installed, persist = saveState, log = console.log } = {}) {
  state.selected = [...new Set([...state.selected, ...items.map(x => x.id)])];
  persist(ctx,state);
  let failures = 0;
  for (const item of items) {
    const t = tools.find(t => t.id === item.id);
    let result;
    if (!supported(t,ctx)) result='unsupported';
    else if (detect(t,ctx)) result='installed';
    else if (item.dependencies.some(id => !detect(tools.find(t => t.id===id),ctx))) result='blocked';
    else if (!item.installer) result='manual';
    else {
      log(`Installing ${item.name}...`);
      result = execute(item,ctx) ? (detect(t,ctx) ? 'installed' : 'needs-path') : 'failed';
    }
    if (['failed','blocked','needs-path'].includes(result)) failures++;
    state.results[item.id] = result;
    persist(ctx,state);
    log(`${item.id}: ${result}${['manual','unsupported'].includes(result) ? ` (${item.docs})` : ''}`);
  }
  return failures;
}
export function probeStatus(probe,ctx,runner=run) {
  const r=runner(probe.argv,ctx,{quiet:true});
  if(r.error || r.signal) return 'unknown';
  if(r.status!==0) return 'pending';
  if(probe.success==='exit') return 'verified';
  if(probe.success==='json') {
    try { return JSON.parse(r.stdout)[probe.field] === true ? 'verified' : 'pending'; } catch { return 'unknown'; }
  }
  return 'unknown';
}
export function status(ids,ctx,state,{verify=false,runner=run}={}) {
  return ids.map(id=>{
    const t=tools.find(t=>t.id===id);
    if(!t) throw Error(`Unknown tool: ${id}`);
    const present=supported(t,ctx) && installed(t,ctx);
    return {id,name:t.name,installation:!supported(t,ctx)?'unsupported':present?'installed':'missing',lastAttempt:state.results[id]||null,steps:t.steps.map(s=>({id:s.id,text:s.text,state:!present?'blocked':verify&&s.probe?probeStatus(s.probe,ctx,runner):state.acknowledged[`${id}:${s.id}`]?'user-confirmed':'pending'}))};
  });
}
export const agentDirs = { 'claude-code': '.claude/skills', codex: '.codex/skills', cursor: '.cursor/skills', 'gemini-cli': '.gemini/skills', antigravity: '.gemini/antigravity/skills' };
export function skillCommand(skill,agents) {
  if (!agents.length || agents.some(a=>!Object.hasOwn(agentDirs,a))) throw Error(`Choose agents from: ${Object.keys(agentDirs).join(', ')}`);
  return ['npx','--yes','skills@latest','add',skill.source,'--skill',skill.skill,'--global','--agent',...agents,'--yes'];
}
export function skillStatus(selected,agents,ctx,targets={}) {
  return selected.map(id=>({id,agents:(targets[id] || agents).map(agent=>({agent,installed:!!agentDirs[agent]&&fs.existsSync(path.join(ctx.home,agentDirs[agent],id,'SKILL.md'))}))}));
}
