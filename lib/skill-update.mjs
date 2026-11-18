import fs from 'node:fs';
import path from 'node:path';
import { run, skills, skillStatus } from './core.mjs';

export function planSkillUpdates(ids, state, ctx) {
  const managed = new Set(state.skills);
  for (const id of ids) {
    if (!managed.has(id)) throw Error(`Skill is not tracked by SMV: ${id}`);
  }
  const rows = skillStatus([...new Set(ids.length ? ids : managed)], state.agents, ctx, state.skillTargets);
  const lockPath = ctx.env.XDG_STATE_HOME
    ? path.join(ctx.env.XDG_STATE_HOME, 'skills', '.skill-lock.json')
    : path.join(ctx.home, '.agents', '.skill-lock.json');
  let records = {};
  try { records = JSON.parse(fs.readFileSync(lockPath, 'utf8')).skills || {}; }
  catch (error) { if (error.code !== 'ENOENT') throw Error('Cannot read the global Skills CLI lock file.'); }

  return rows.flatMap(({ id, agents }) => {
    const targets = agents.filter(target => target.installed).map(target => target.agent);
    if (!targets.length) return ids.length ? [{ id, reason: 'No installed targets. Use smv skills install first.' }] : [];
    const skill = skills.find(entry => entry.id === id);
    const entry = records[id];
    if (!skill || !entry || entry.sourceType !== 'github' ||
        entry.source?.toLowerCase() !== skill.source.toLowerCase() || !entry.skillPath || !entry.skillFolderHash) {
      return [{ id, reason: 'Global skill source could not be verified against the SMV catalog.' }];
    }
    return [{ id, targets, argv: ['npx', '--yes', 'skills@latest', 'update', id, '--global', '--yes'] }];
  });
}

export function refreshSkill(entry, ctx, runner = run) {
  const result = runner(entry.argv, ctx, {
    quiet: true, timeout: 180000, env: { DISABLE_TELEMETRY: '1', NO_COLOR: '1' },
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  const output = `${result.stdout || ''}\n${result.stderr || ''}`.replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '');
  const targetsIntact = skillStatus([entry.id], entry.targets, ctx)[0].agents.every(target => target.installed);
  const ok = result.status === 0 && targetsIntact && !/✗|failed to|cannot update|skipped|could not/i.test(output);
  console.log(`${entry.id}: ${ok ? 'update check completed' : 'update failed or an installed target is missing'}`);
  return ok;
}
