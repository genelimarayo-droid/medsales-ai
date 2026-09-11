const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require(require('node:path').join(process.env.MEDSALES_RUNTIME||require('node:path').join(process.cwd(),'node_modules'),'playwright'));
(async()=>{
 const {project,procurement,correction,clean}=await import('./round5-fixtures.mjs');
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||undefined});
 const out={at:new Date().toISOString(),browser:browser.version(),mode:'SIMULATED / HUMAN_STRUCTURED_MOCK',checks:[],errors:[]};
 const page=await browser.newPage({viewport:{width:1440,height:1000}});page.on('pageerror',e=>out.errors.push(e.message));
 const click=a=>page.locator(`[data-action="${a}"]`).click();
 const read=()=>page.evaluate(()=>{const db=JSON.parse(localStorage.getItem('medsales-workbench-v1'));return db.customers.find(c=>c.customerId===db.selected);});
 async function approve(rows){
  const c=await read();
  for(const id of c.batch){const i=c.information.find(i=>i.id===id),r=rows.find(r=>clean(r.text)===i.content);
   if(r){await page.locator(`[data-action="edit-info"][data-id="${id}"]`).click();
    if(r.authorConfirm){await page.locator('#edit-info [name="type"]').selectOption('CUSTOMER_STATED');await page.locator('#edit-info [name="speaker"]').fill('模拟主任');await page.locator('#edit-info [name="confirmSpeaker"]').check();}
    const n=await page.locator('#edit-info [data-assertion]').count();
    for(let k=0;k<n;k++){await page.locator(`#edit-info [name="target${k}"]`).selectOption(k?'unknown':r.target);await page.locator(`#edit-info [name="polarity${k}"]`).selectOption(k?'UNKNOWN':r.polarity);if(!k)await page.locator('#edit-info [name="scope0"]').fill(r.scopeValue||'');}
    await page.locator('#edit-info [name="confirmSemantic"]').check();await page.locator('#edit-info button.primary').click();assert.equal(await page.locator('dialog[open]').count(),0);assert.equal((await read()).information.find(i=>i.id===id).reviewStatus,'PENDING');
   }
   await page.locator(`[data-action="accept-info"][data-id="${id}"]`).click();
  }
  await click('confirm-batch');
 }
 async function create(rows,field='statements'){
  await click('new');await page.locator('#new-client [name="customerId"]').fill('R5-UI-'+(out.checks.length+1));await page.locator('#new-client [name="name"]').fill('第五轮模拟 ICU');await page.locator('#new-client button.primary').click();
  await page.locator('#intake [name="project_id"]').fill('A');await page.locator('#intake [name="role"]').fill('模拟科室主任');await page.locator(`#intake [name="${field}"]`).fill(rows.map(r=>r.text).join('\n'));await page.locator('#intake [name="privacy"]').check();await page.locator('#intake button[type="submit"]').click();await click('extract');
 }
 async function prep(play=false){await click('advance');await click('advance');await page.locator('#plan button').click();if(!play){await click('skip-role');return;}await page.locator('#roleplay-start button.primary').click();for(const [text,type]of [['我会确认预算','VERIFY_GAP'],['客户肯定会买','UNSUPPORTED_CERTAINTY']]){await page.locator('#chat input[name="text"]').fill(text);await page.locator('#chat [name="claim_type"]').selectOption(type);await page.locator('[name="behaviorReviewed"]').check();await page.locator('#chat button').click();}await click('end-role');}
 async function visit(rows,date){await page.locator('#visit [name="date"]').fill(date);await page.locator('#visit [name="participants"]').fill('模拟主任、测试销售');await page.locator('#visit [name="project_id"]').fill('A');await page.locator('#visit [name="statements"]').fill(rows.map(r=>r.text).join('\n'));await page.locator('#visit input[type="checkbox"]').check();await page.locator('#visit button.primary').click();await click('extract');await approve(rows);await click('advance');}
 async function save(){await click('advance');assert.ok(await page.locator('[data-action="confirm-actions"]').isDisabled());while(await page.locator('[data-action="accept-action"]:not([disabled])').count())await page.locator('[data-action="accept-action"]:not([disabled])').first().click();await click('confirm-actions');await click('save-version');await page.reload();}
 try{
  await page.goto('http://127.0.0.1:4173');
  await create([...project,...procurement]);await approve([...project,...procurement]);const v1=(await read()).versions[0];await prep(true);assert.equal((await read()).roleplays.at(-1).score.find(s=>s.label==='证据意识').value,0);assert.equal((await read()).visitRecords.length,0);out.checks.push('structured roleplay score and isolation');
  await visit([procurement[0]],'2026-09-11');assert.equal((await read()).opportunityStage.stage,4);await save();const v2=await read();assert.equal(v2.version,2);assert.equal(v2.versions[1].snapshot.opportunityStage.stage,4);out.checks.push('full workflow, action gate, V2 persistence');
  await click('next-round');await prep();await visit([correction],'2026-09-12');let c=await read();assert.equal(c.opportunityStage.stage,3);assert.ok(c.evidence.some(e=>e.target==='procurementStarted'&&e.validity==='INVALIDATED'));const reverse=c.evidence.find(e=>e.target==='procurementStarted'&&e.validity==='VALID');assert.ok(reverse.contradicts.length);assert.match(await page.locator('.transition-check').first().innerText(),/Stage 4 → Stage 3/);out.audit=c.opportunityStage;
  await page.locator('[data-ev="E"]').click();const panel=await page.locator('.evidence').innerText();for(const label of ['CURRENT VALID EVIDENCE','HISTORICAL','Author','Source','Semantic Role','Polarity','Validity','Strength','Project','Created At','Contradicts','Supersedes'])assert.ok(panel.includes(label),label);
  await page.screenshot({path:'outputs/round5-browser-evidence.png',fullPage:true});out.checks.push('Stage 4 to 3, E links and evidence panel');
  await save();c=await read();assert.equal(c.version,3);assert.deepEqual(c.versions[0],v1);assert.deepEqual(c.versions[1],v2.versions[1]);assert.deepEqual(c.information.slice(0,v2.information.length),v2.information);out.versions=c.versions;
  await page.locator('[data-view="history"]').click();await page.locator('.version-item details summary').first().click();assert.match(await page.locator('.surface').innerText(),/Evidence Snapshot/);await page.locator('.version-item details summary').first().click();await page.screenshot({path:'outputs/round5-browser-history.png',fullPage:true});out.checks.push('V3 refresh, V1/V2 original information and evidence protection');
  const r={text:'我们希望减少维护负担',target:'need',polarity:'SUPPORT',authorConfirm:true};await create([r],'unknown');assert.equal((await read()).information.find(i=>i.category==='unknown').type,'UNVERIFIED');await approve([r]);await click('advance');c=await read();assert.equal(c.hypotheses[0].evidenceState,'SUPPORTED');assert.ok(c.evidence.some(e=>e.author==='CUSTOMER'&&e.target==='need'&&e.validity==='VALID'));out.checks.push('manual UNKNOWN to CUSTOMER changes downstream Evidence');
  const negative={text:'客户表示我们不需要减少维护负担',target:'need',polarity:'CONTRADICT'};await create([negative]);await approve([negative]);await prep();await visit([{text:'现有设备够用',target:'immediateReplacement',polarity:'CONTRADICT'}],'2026-09-13');c=await read();assert.equal(c.opportunityStage.stage,1);assert.equal(c.hypotheses[0].evidenceState,'CONTRADICTED');out.checks.push('reviewed negation does not confirm demand or project');
  await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:'outputs/round5-browser-mobile.png',fullPage:true});assert.deepEqual(out.errors,[]);out.passed=true;
 }catch(e){out.passed=false;out.failure=e.stack;process.exitCode=1;}finally{fs.writeFileSync('outputs/round5-browser-results.json',JSON.stringify(out,null,2));await browser.close();}console.log(JSON.stringify({passed:out.passed,checks:out.checks,errors:out.errors,failure:out.failure},null,2));
})();
