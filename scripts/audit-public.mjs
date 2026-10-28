// Public artifact hygiene check. This complements, and does not replace, gitleaks.
import fs from 'node:fs';
import path from 'node:path';
const skip=new Set(['.git','node_modules','dist','coverage','.local']);
const patterns=[
 ['private-key',/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
 ['AWS-access-key',/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/],
 ['GitHub-token',/\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})\b/],
 ['provider-key',/\bsk-(?:proj-|ant-)?[a-zA-Z0-9_-]{32,}/],
 ['credential-URL',/\b(?:postgres(?:ql)?|mysql|redis|https?):\/\/[^\s/:]+:[^\s/@]+@/],
 ['source-machine-path',/\/(?:Users|home)\/[a-z][a-z0-9_-]+\/(?:\.claude|\.codex|Projects|Documents)/i]
];
let count=0,fail=false;
function visit(dir){for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
 if(skip.has(ent.name))continue;
 const file=path.join(dir,ent.name);
 if(ent.isSymbolicLink()){console.error(`Unexpected symlink: ${file}`);fail=true;continue;}
 if(ent.isDirectory()){visit(file);continue;}
 count++;
 if(/^(?:\.env(?:\..+)?|\.envrc)$/.test(ent.name)&&ent.name!=='.env.example'||/\.(?:pem|key|p12|mobileprovision)$/.test(ent.name)){console.error(`Disallowed public file: ${file}`);fail=true;}
 const text=fs.readFileSync(file,'utf8');
 for(const [name,re] of patterns)if(re.test(text)){console.error(`Potential ${name} in ${file} (value suppressed)`);fail=true;}
}}
visit('.');
if(fail)process.exitCode=1;else console.log(`Public artifact checks passed for ${count} files. No credential values printed.`);
