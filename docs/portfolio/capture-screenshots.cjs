const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const dir=path.join(__dirname,'screenshots');
const project='ICU-DEMO-A';
const initial=[{text:'客户表示目前设备还能正常使用',target:'equipment'},{text:'客户表示设备维护比较麻烦',target:'pain'}];
const visit=[{text:'客户表示希望减少维护负担',target:'need'},{text:'客户表示计划更新监护仪',target:'purchase'},{text:'客户表示项目范围为ICU监护设备',target:'scope',scopeValue:'ICU监护设备'},{text:'客户表示项目参与者包括科室与设备科',target:'participants'},{text:'客户表示科室将提交更新申请',target:'internalAction'},{text:'采购流程已经启动。',target:'procurementStarted'},{text:'客户表示采购流程为科室提出再由设备科审核',target:'process'},{text:'客户表示由院内授权委员会最终批准',target:'decision'},{text:'客户表示采购时间定于2027年6月',target:'procurementTime'}];
const correction=[{text:'之前说采购已经启动是不准确的。',target:'procurementStarted',polarity:'CONTRADICT'}];
const clean=s=>s.replace(/[。；;]+$/,'');
(async()=>{
 fs.mkdirSync(dir,{recursive:true});
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 const out={at:new Date().toISOString(),caseType:'SIMULATED',browser:browser.version(),screenshots:[],errors:[]};
 page.on('pageerror',e=>out.errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')out.errors.push({text:m.text(),location:m.location()});});
 page.on('requestfailed',r=>out.errors.push({url:r.url(),failure:r.failure()}));
 const click=a=>page.locator(`[data-action="${a}"]`).click();
 const read=()=>page.evaluate(()=>{const db=JSON.parse(localStorage.getItem('medsales-workbench-v1'));return db.customers.find(c=>c.customerId===db.selected);});
 async function shot(name,selector){await page.locator('#toast.visible').waitFor({state:'hidden'});if(selector)await page.locator(selector).first().evaluate(el=>el.scrollIntoView({block:'start'}));else await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:path.join(dir,name)});out.screenshots.push(name);}
 async function approve(rows){
  const c=await read();for(const id of c.batch){const i=c.information.find(i=>i.id===id),r=rows.find(r=>clean(r.text)===i.content);
   if(r){await page.locator(`[data-action="edit-info"][data-id="${id}"]`).click();const n=await page.locator('#edit-info [data-assertion]').count();for(let k=0;k<n;k++){await page.locator(`#edit-info [name="target${k}"]`).selectOption(k?'unknown':r.target);await page.locator(`#edit-info [name="polarity${k}"]`).selectOption(k?'UNKNOWN':r.polarity||'SUPPORT');if(!k)await page.locator('#edit-info [name="scope0"]').fill(r.scopeValue||'');}await page.locator('#edit-info [name="confirmSemantic"]').check();await page.locator('#edit-info button.primary').click();assert.equal(await page.locator('dialog[open]').count(),0);}
   await page.locator(`[data-action="accept-info"][data-id="${id}"]`).click();
  }await click('confirm-batch');
 }
 async function prep(){await click('advance');await click('advance');}
 async function record(rows,date){await page.locator('#visit [name="date"]').fill(date);await page.locator('#visit [name="participants"]').fill('模拟主任、演示销售');await page.locator('#visit [name="project_id"]').fill(project);await page.locator('#visit [name="statements"]').fill(rows.map(r=>r.text).join('\n'));await page.locator('#visit input[type="checkbox"]').check();await page.locator('#visit button.primary').click();await click('extract');await approve(rows);await click('advance');}
 async function save(){await click('advance');assert.ok(await page.locator('[data-action="confirm-actions"]').isDisabled());while(await page.locator('[data-action="accept-action"]:not([disabled])').count())await page.locator('[data-action="accept-action"]:not([disabled])').first().click();await click('confirm-actions');await click('save-version');}
 try{
  await page.goto(process.env.MEDSALES_URL||'http://127.0.0.1:4173');await click('new');
  await page.locator('#new-client [name="customerId"]').fill('PORTFOLIO-ICU-001');await page.locator('#new-client [name="name"]').fill('模拟 A 院 · ICU');await page.locator('#new-client button.primary').click();
  for(const [name,value] of Object.entries({institution:'模拟 A 院（仅模拟设定）',department:'ICU',role:'模拟科室主任（权限待核实）',date:'2026-09-10',project_id:project,statements:initial.map(r=>r.text).join('\n'),judgment:'我感觉客户可能会采购，但还没有客户采购表达支持',unknown:'是否希望改善未知\n采购计划未知\n预算未知\n决策流程未知'}))await page.locator(`#intake [name="${name}"]`).fill(value);
  await page.locator('#intake [name="privacy"]').check();await page.locator('#intake button[type="submit"]').click();await click('extract');await approve(initial);
  const v1=(await read()).versions[0];await shot('02-customer-understanding.png','.section-head');await prep();await shot('03-visit-preparation.png','#plan');await page.locator('#plan button').click();await page.locator('#roleplay-start button.primary').click();
  const before=await read();for(const [text,type] of [['最近维护协调主要是什么问题？','OPEN_QUESTION'],['维修响应需要多久？','FOLLOW_UP'],['预算是否已经确认？','VERIFY_GAP']]){await page.locator('#chat [name="text"]').fill(text);await page.locator('#chat [name="claim_type"]').selectOption(type);await page.locator('[name="behaviorReviewed"]').check();await page.locator('#chat button').click();}
  await shot('04-roleplay.png','.chat-log');await click('end-role');assert.deepEqual((await read()).evidence,before.evidence);
  await record(visit,'2026-09-11');assert.equal((await read()).opportunityStage.stage,4);await page.locator('[data-ev="E"]').click();await shot('05-evidence.png','.evidence-heading');await shot('06-opportunity-stage.png','.stage-band');await save();const v2=(await read()).versions[1];await shot('01-dashboard.png');
  await click('next-round');await prep();await page.locator('#plan button').click();await click('skip-role');await record(correction,'2026-09-12');assert.equal((await read()).opportunityStage.stage,3);await shot('08-contradiction-stage-change.png','.transition-check');await save();await page.reload();
  const c=await read();assert.equal(c.version,3);assert.equal(c.opportunityStage.stage,3);assert.deepEqual(c.versions[0],v1);assert.deepEqual(c.versions[1],v2);assert.ok(c.evidence.some(e=>e.target==='procurementStarted'&&e.validity==='INVALIDATED'));
  await page.locator('[data-view="history"]').click();await shot('07-version-history.png','.version-item');await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await shot('09-mobile.png');
  out.versionStages=c.versions.map(v=>({version:v.number,stage:v.snapshot.opportunityStage?.stage??null}));out.historyProtected=true;out.roleplayIsolated=true;out.mobileOverflow=false;assert.deepEqual(out.errors,[]);out.passed=true;
 }catch(e){out.passed=false;out.failure=e.stack;process.exitCode=1;}finally{fs.writeFileSync(path.join(dir,'capture-results.json'),JSON.stringify(out,null,2));await browser.close();}console.log(JSON.stringify(out,null,2));
})();
