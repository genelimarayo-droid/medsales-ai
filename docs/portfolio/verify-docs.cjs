const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..');
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);
const beforePath=path.join(__dirname,'protected-before.json');
const before=JSON.parse(fs.readFileSync(beforePath,'utf8').replace(/^\uFEFF/,''));
const baseline=before.map(f=>({path:f.path||path.relative(root,f.Path).replaceAll('\\','/'),sha256:f.sha256||f.Hash.toLowerCase()}));
const result={brokenLinks:[],secretPatternMatches:[],protectedFiles:baseline.length,changedProtectedFiles:[],screenshots:[]};
for(const f of baseline){const actual=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,f.path))).digest('hex');if(actual!==f.sha256)result.changedProtectedFiles.push(f.path);}
// Store relative paths only, so provenance does not expose developer home paths.
fs.writeFileSync(beforePath,JSON.stringify(baseline,null,2));
const files=[path.join(root,'README.md'),...walk(__dirname).filter(f=>f.endsWith('.md'))];
for(const file of files){const text=fs.readFileSync(file,'utf8');for(const m of text.matchAll(/\]\(([^)]+)\)/g)){const url=m[1];if(/^(https?:|#|mailto:)/.test(url))continue;const target=path.resolve(path.dirname(file),url.split('#')[0]);if(!fs.existsSync(target))result.brokenLinks.push({file:path.relative(root,file),url});}
 if(/sk-[A-Za-z0-9_-]{20,}|AIza[A-Za-z0-9_-]{30,}|-----BEGIN (?:RSA |OPENSSH )?PRIVATE KEY-----/.test(text))result.secretPatternMatches.push(path.relative(root,file));}
for(const file of walk(path.join(__dirname,'screenshots')).filter(f=>f.endsWith('.png'))){const b=fs.readFileSync(file);if(b.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw Error('Invalid PNG');result.screenshots.push({file:path.basename(file),width:b.readUInt32BE(16),height:b.readUInt32BE(20)});}
result.passed=!result.brokenLinks.length&&!result.secretPatternMatches.length&&!result.changedProtectedFiles.length&&result.screenshots.length===9;
fs.writeFileSync(path.join(__dirname,'documentation-checks.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));if(!result.passed)process.exitCode=1;
