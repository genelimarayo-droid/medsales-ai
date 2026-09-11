const fs=require('node:fs');
const assert=require('node:assert/strict');
const {chromium}=require(require('node:path').join(process.env.MEDSALES_RUNTIME||require('node:path').join(process.cwd(),'node_modules'),'playwright'));
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||undefined});
 const result={at:new Date().toISOString(),isolation:'Fresh browser context / SIMULATED',states:[],errors:[]};
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});page.on('pageerror',e=>result.errors.push(e.message));await page.goto('http://127.0.0.1:4173');
  const read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('medsales-workbench-v1')).customers[0]);
  const click=a=>page.locator(`[data-action="${a}"]`).click();
  const mark=async()=>result.states.push((await read()).state);
  const approve=async()=>{while(await page.locator('[data-action="accept-info"]:not([disabled])').count())await page.locator('[data-action="accept-info"]:not([disabled])').first().click();await click('confirm-batch');await mark();};
  await mark();await page.locator('[name="privacy"]').check();await page.locator('#intake button[type="submit"]').click();await mark();await click('extract');await mark();
  assert.ok(await page.locator('[data-action="confirm-batch"]').isDisabled());
  const pending=await read(),inference=pending.information.find(i=>i.type==='SALES_INFERENCE');
  await page.locator(`[data-action="edit-info"][data-id="${inference.id}"]`).click();await page.locator('#edit-info [name="type"]').selectOption('CUSTOMER_STATED');await page.locator('#edit-info [name="authorReason"]').fill('客户聊得不错，我认为可以确认');await page.locator('#edit-info button.primary').click();assert.equal(await page.locator('dialog[open]').count(),1);assert.match(await page.locator('#toast').innerText(),/作者|出处/);await page.locator('#modal [data-action="close"]').click();result.authorOverrideBlocked=true;
  await approve();const base=await read();
  await click('advance');await mark();await click('advance');await mark();await page.locator('#plan button').click();await mark();await page.locator('#roleplay-start button.primary').click();
  const qs=['主任，您刚才提到维护次数增加，主要增加的是哪些问题？','这些问题对ICU日常工作具体造成了什么影响？','如果确实影响比较明显，您们通常会怎么处理？','这类问题一般是谁会参与后续评估？','如果需要进一步核实，我们下次可以和相关人员一起确认吗？','采购流程是什么？','不能把推测当成事实，但是预算已经确认，今年一定采购。'];
  for(const q of qs){await page.locator('#chat input').fill(q);await page.locator('#chat button').click();}
  const rp=await read();result.dialogue=rp.roleplays.at(-1);assert.deepEqual(rp.information,base.information);assert.deepEqual(rp.sources,base.sources);assert.equal(rp.visitRecords.length,0);result.roleplayIsolated=true;
  assert.deepEqual(rp.roleplays.at(-1).context.turns.slice(0,6).map(t=>t.topic),['maintenance','impact','handling','participants','next','process']);
  await page.screenshot({path:'outputs/round3-roleplay.png',fullPage:true});await click('end-role');await mark();result.score=(await read()).roleplays.at(-1).score;assert.equal(result.score.find(s=>s.label==='证据意识').value,0);
  const record={date:'2026-09-10',participants:'模拟主任、隔离测试销售',statements:'主任表示协调处理会分散精力\n主任表示目前设备还能用\n主任表示没有更新计划\n主任表示暂时没有预算\n主任表示今年不考虑采购\n主任说设备还能正常使用，所以我认为今年一定会采购。',needs:'主任表示我们目前没有改善需求',observations:'',objections:'',next:'',judgment:'销售判断：聊天顺利不能证明采购项目',unknown:'采购时间未知\n最终决策人未知\n采购流程未知'};
  const saveVisit=async()=>{for(const [k,v] of Object.entries(record))await page.locator(`#visit [name="${k}"]`).fill(v);await page.locator('#visit input[type="checkbox"]').check();await page.locator('#visit button.primary').click();await mark();await click('extract');await mark();assert.ok(await page.locator('[data-action="confirm-batch"]').isDisabled());await approve();};
  const finish=async(version)=>{
   const d=await read();result.debrief=d.debrief;assert.ok(d.debrief.newIds.length);
   await click('advance');await mark();const checked=await read();assert.equal(checked.opportunityStage.stage,1);assert.equal(checked.assessment[1].status,'有支持');assert.equal(checked.assessment[2].status,'明确否定');
   assert.ok(await page.locator('.transition-check').count());assert.match(await page.locator('.transition-check').last().innerText(),/不是没有信息/);result.opportunity=checked.opportunityStage;
   for(const tab of ['I','S','E','H']){await page.locator(`[data-ev="${tab}"]`).click();assert.ok(await page.locator('.evidence-item').count());}
   await page.locator('.surface [data-ref]').first().click();assert.ok(await page.locator('.evidence-item.focused').count());result.evidencePanel=true;
   if(version===2)await page.screenshot({path:'outputs/round3-opportunity.png',fullPage:true});
   await click('advance');await mark();assert.ok(await page.locator('[data-action="confirm-actions"]').isDisabled());await page.locator('[data-action="edit-action"]').first().click();await page.locator('#edit-action [name="title"]').fill('先核实维护影响，不以聊天态度推进采购');await page.locator('#edit-action button.primary').click();assert.ok(await page.locator('[data-action="confirm-actions"]').isDisabled());
   while(await page.locator('[data-action="accept-action"]:not([disabled])').count())await page.locator('[data-action="accept-action"]:not([disabled])').first().click();await click('confirm-actions');await mark();assert.equal((await read()).version,version-1);await click('save-version');await page.reload();assert.equal((await read()).version,version);
  };
  await saveVisit();await finish(2);const v2=await read();result.v2=v2.version;await page.locator('[data-view="history"]').click();assert.match(await page.locator('.surface').innerText(),/V1/);assert.match(await page.locator('.surface').innerText(),/V2/);await page.screenshot({path:'outputs/round3-history.png',fullPage:true});
  await page.locator('[data-view="workflow"]').click();await click('next-round');await click('advance');await click('advance');await page.locator('#plan button').click();await click('skip-role');await saveVisit();await finish(3);const final=await read();assert.deepEqual(final.versions[0],base.versions[0]);assert.deepEqual(final.versions[1],v2.versions[1]);assert.deepEqual(final.information.slice(0,base.information.length),base.information);assert.equal(final.visitRecords.every(v=>v.reviewStatus==='CONFIRMED'),true);
  result.v3=final.version;result.v1Unchanged=true;result.v2Unchanged=true;result.originalInformationUnchanged=true;result.reloadPersistence=true;result.informationGate=true;result.actionGate=true;
  assert.match(await page.locator('.workspace-title').innerText(),/模拟案例 \/ Demo Data/);await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:'outputs/round3-mobile.png',fullPage:true});assert.deepEqual(result.errors,[]);result.passed=true;
 }catch(e){result.failure=e.stack;result.passed=false;process.exitCode=1;}finally{fs.writeFileSync('outputs/round3-browser-results.json',JSON.stringify(result,null,2));await browser.close();}
 console.log(JSON.stringify({passed:result.passed,states:result.states,v2:result.v2,v3:result.v3,failure:result.failure,errors:result.errors},null,2));
})();
