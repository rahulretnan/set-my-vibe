import fs from 'node:fs';
import path from 'node:path';
import { root, run } from './core.mjs';

const releaseApi = 'https://api.github.com/repos/rahulretnan/set-my-vibe/releases/latest';
const tagPattern = /^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

export async function checkUpdate(current, fetchRelease = fetch) {
  const response = await fetchRelease(releaseApi, {
    headers: { Accept: 'application/vnd.github+json' },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw Error(`Release lookup failed (HTTP ${response.status}).`);
  const release = await response.json();
  const latest = release.tag_name;
  if (typeof latest !== 'string' || !tagPattern.test(latest) || release.draft || release.prerelease) {
    throw Error('GitHub did not return a stable release tag.');
  }
  const wanted = latest.slice(1).split('.').map(BigInt);
  const have = current.split('.').map(BigInt);
  const difference = wanted.findIndex((part, i) => part !== have[i]);
  return { current: `v${current}`, latest, available: difference !== -1 && wanted[difference] > have[difference] };
}

export function applyUpdate(latest, ctx, runner = run) {
  if (!tagPattern.test(latest)) throw Error('Invalid update tag.');
  const binDir = ctx.env.SMV_MANAGED_BIN_DIR;
  const managedRoot = binDir && fs.existsSync(ctx.data) ? fs.realpathSync(ctx.data) : null;
  if (!binDir || !path.isAbsolute(binDir) || !managedRoot || path.dirname(path.resolve(root)) !== path.join(managedRoot, 'releases')) {
    throw Error('Automatic updates require an SMV bootstrap install. Update this checkout or package using its original installation method.');
  }
  const result = runner(['bash', path.join(root, 'install.sh'), '--version', latest,
    '--prefix', ctx.data, '--bin-dir', binDir, '--no-setup'], ctx);
  if (result.status !== 0) throw Error('Update failed. Review the installer output and retry.');
}
