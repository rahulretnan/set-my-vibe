import fs from 'node:fs';
import path from 'node:path';
import { recipes, display, run, executable } from './core.mjs';
export function projectPlan(id,name,cwd) {
  const recipe=recipes.find(r=>r.id===id);
  if(!recipe) throw Error(`Unknown recipe: ${id}`);
  const base=path.resolve(cwd);
  if(!fs.statSync(base).isDirectory()) throw Error('Working directory must be a directory.');
  if(recipe.existing) {
    if(name) throw Error('shadcn uses an existing project: pass --cwd, not a new name.');
    if(!fs.existsSync(path.join(base,'package.json'))) throw Error('Existing project needs package.json.');
    return {recipe,cwd:base,target:base,argv:recipe.command};
  }
  if(!name || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(name)) throw Error('Project name must be 1-64 lowercase letters, digits or hyphens, starting with a letter or digit.');
  const target=path.join(base,name);
  try { fs.lstatSync(target); throw Error('Target already exists. Choose a new project name.'); } catch(e) { if(e.code!=='ENOENT') throw e; }
  return {recipe,cwd:base,target,argv:[...recipe.command,name,...(recipe.suffix || [])]};
}
export function projectGuide(p) {
  return `# Project setup\n\nGenerated from the ${p.recipe.id} recipe. This is a setup guide, not evidence of production readiness.\n\nSource: ${p.recipe.docs}\n\nCommand: \`${display(p.argv)}\`\n\n## Remaining setup\n\n${p.recipe.steps.map(s=>`- [ ] ${s}`).join('\n')}\n\n## Before production\n\n- [ ] Data persistence, migrations, tenant isolation and authorization are tested.\n- [ ] Secrets are server-side, absent from Git and logs, and scoped per environment.\n- [ ] Tests cover failure, retry, recovery and permission-denied paths.\n- [ ] Real browser/device journeys pass, including privileged operations.\n- [ ] CI runs lint, typecheck, tests, build and dependency/secret scanning.\n- [ ] Observability, alerts, backups, restore and rollback have been exercised.\n- [ ] Domains, TLS, CORS, rate limits, abuse controls and spend limits are configured.\n- [ ] Privacy, accessibility, retention and billing behavior have been reviewed.\n\nNo resources, credentials or deployments are created by this guide. Review upstream generator prompts, which may offer integrations.\n`;
}
export function executeProject(p,ctx,runner=run) {
  if(!executable('bun',ctx) || !executable('bunx',ctx)) throw Error('Install Bun first: set-my-vibe install bun');
  const r=runner(p.argv,ctx,{cwd:p.cwd});
  if(r.status!==0) throw Error('Generator failed or was interrupted. Inspect its partial output; no files were removed.');
  if(!p.recipe.existing) {
    if(!fs.existsSync(p.target) || fs.lstatSync(p.target).isSymbolicLink() || !fs.statSync(p.target).isDirectory()) throw Error('Generator did not create the expected project directory.');
    fs.writeFileSync(path.join(p.target,'VIBE-SETUP.md'),projectGuide(p),{flag:'wx'});
  }
}
export function projectCheck(cwd) {
  const base=path.resolve(cwd);
  let pkg;
  try {pkg=JSON.parse(fs.readFileSync(path.join(base,'package.json'),'utf8'));} catch {throw Error('Cannot read project package.json.');}
  const scripts=pkg.scripts||{};
  const checks=['test','lint','typecheck','build'].map(id=>({id,state:Object.hasOwn(scripts,id)?'script-present-not-run':'missing'}));
  checks.push({id:'ci',state:fs.existsSync(path.join(base,'.github/workflows'))?'present-not-verified':'missing'});
  checks.push({id:'production-review',state:'manual',guide:'Review VIBE-SETUP.md and docs/PRODUCTION.md. File presence cannot prove correctness.'});
  return checks;
}
