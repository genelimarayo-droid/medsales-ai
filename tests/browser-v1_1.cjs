const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const runtime=process.env.MEDSALES_RUNTIME||path.join(process.cwd(),'node_modules');
const {chromium}=require(path.join(runtime,'playwright'));
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||undefined});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4173');const read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('medsales-workbench-v1')).customers[0]);
  const click=a=>page.locator(`[data-action="${a}"]`).click();const states=[];const mark=async()=>states.push((await read()).state);
  const approve=async()=>{while(await page.locator('[data-action="accept-info"]:not([disabled])').count())await page.locator('[data-action="accept-info"]:not([disabled])').first().click();await click('confirm-batch');};
  await page.locator('[name="privacy"]').check();await page.locator('#intake button[type="submit"]').click();await click('extract');await approve();const base=await read();
  await click('advance');await click('advance');await page.locator('#plan button').click();await mark();await page.locator('#roleplay-start button.primary').click();
  const questions=['主要是哪类维护问题？','这种情况大概多久发生一次？','有没有影响ICU的设备使用安排？','对您的工作精力有什么影响？','目前最希望改善什么？','有没有设备更新计划？','预算确定了吗？','谁参与最终决策？','采购流程是什么？','采购时间节点明确了吗？','我先整理需要核实的问题，可以下次再和您确认吗？','无需核实，预算已经确认，今年一定采购。'];
  for(const text of questions){await page.locator('#chat input').fill(text);await page.locator('#chat button').click();}
  const rpData=await read();assert.deepEqual(rpData.information,base.information);assert.deepEqual(rpData.sources,base.sources);assert.equal(rpData.visitRecords.length,0);
  await page.screenshot({path:'outputs/v1_1-roleplay.png',fullPage:true});await click('end-role');await mark();const scored=await read();assert.equal(scored.roleplays.at(-1).score.find(s=>s.label==='证据意识').value,0);
  await page.locator('details.score summary').click();assert.match(await page.locator('details.score').innerText(),/未经证据支持/);
  const v={date:'2026-09-10',participants:'测试销售、模拟主任',statements:'主任表示协调维修会分散精力\n我猜主任今年一定会采购\nAI_INFERENCE：客户准备更新设备',needs:'主任表示希望先减少维护协调负担\n主任表示没有更换需求',observations:'',objections:'',next:'',judgment:'销售判断：没有证据支持采购项目',unknown:'预算未知\n采购时间未知\n最终决策人未知\n采购流程未知'};
  for(const [name,value] of Object.entries(v))await page.locator(`#visit [name="${name}"]`).fill(value);
  await page.locator('#visit input[type="checkbox"]').check();await page.locator('#visit button.primary').click();await mark();await click('extract');await mark();
  const extracted=await read();assert.equal(extracted.information.find(i=>i.content==='我猜主任今年一定会采购').type,'SALES_INFERENCE');assert.equal(extracted.information.find(i=>i.content.startsWith('AI_INFERENCE')).type,'AI_INFERENCE');
  const tableText=await page.locator('.info-table').innerText();for(const expected of ['原始内容','Mock AI 建议类型','冲突原因','最终人工确认类型'])assert.ok(tableText.includes(expected));
  assert.ok(await page.locator('[data-action="confirm-batch"]').isDisabled());await page.screenshot({path:'outputs/v1_1-attribution.png',fullPage:true});await approve();await mark();
  const deb=await read();assert.equal(deb.hypotheses.find(h=>h.key==='purchase').status,'已被否定');assert.ok((await page.locator('.surface').innerText()).includes('被否定假设'));
  await click('advance');await mark();const checked=await read();assert.equal(checked.assessment[1].status,'有支持');assert.equal(checked.assessment[2].status,'明确否定');assert.equal(checked.opportunityStage.stage,2);
  const normal=checked.information.find(i=>i.category==='current');await click('manual-assessment');await page.locator('#assessment [name="status4"]').selectOption('有支持');await page.locator('#assessment [name="strength4"]').selectOption('medium');await page.locator('#assessment [name="refs4"]').fill(normal.id);await page.locator('#assessment input[type="checkbox"]').check();await page.locator('#assessment button.primary').click();assert.equal(await page.locator('dialog[open]').count(),1);assert.match(await page.locator('#toast').innerText(),/不匹配/);await page.locator('#modal [data-action="close"]').click();
  await page.screenshot({path:'outputs/v1_1-opportunity.png',fullPage:true});
  for(const tab of ['I','S','E','H']){await page.locator(`[data-ev="${tab}"]`).click();assert.ok(await page.locator('.evidence-item').count()>0);}
  await page.locator('.surface [data-ref]').first().click();assert.ok(await page.locator('.evidence-item.focused').count()>0);
  await click('advance');await mark();assert.ok(await page.locator('[data-action="confirm-actions"]').isDisabled());
  await page.locator('[data-action="edit-action"]').first().click();await page.locator('#edit-action [name="title"]').fill('先核实维修协调占用的精力，不直接推进采购');await page.locator('#edit-action button.primary').click();assert.ok(await page.locator('[data-action="confirm-actions"]').isDisabled());
  while(await page.locator('[data-action="accept-action"]:not([disabled])').count())await page.locator('[data-action="accept-action"]:not([disabled])').first().click();await click('confirm-actions');await mark();assert.equal((await read()).version,1);await click('save-version');await page.reload();await mark();
  const saved=await read();assert.equal(saved.version,2);assert.deepEqual(saved.versions[0],base.versions[0]);assert.deepEqual(saved.information.slice(0,base.information.length),base.information);assert.equal(saved.visitRecords[0].reviewStatus,'CONFIRMED');
  await page.locator('[data-view="history"]').click();assert.match(await page.locator('.surface').innerText(),/V1/);assert.match(await page.locator('.surface').innerText(),/V2/);assert.match(await page.locator('.workspace-title').innerText(),/模拟案例 \/ Demo Data/);
  await page.screenshot({path:'outputs/v1_1-history.png',fullPage:true});await page.setViewportSize({width:390,height:844});await page.screenshot({path:'outputs/v1_1-mobile.png',fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
  const result={at:new Date().toISOString(),mode:'Independent browser / Mock AI',states,version:saved.version,originalFactsUnchanged:true,v1SnapshotUnchanged:true,localStorageReload:true,evidenceTabs:['I','S','E','H'],reviewGate:true,actionGate:true,manualRelevanceGate:true,dialogue:rpData.roleplays[0].messages,score:scored.roleplays[0].score,hypotheses:saved.hypotheses,opportunity:saved.opportunityStage,errors};fs.writeFileSync('outputs/v1_1-browser-results.json',JSON.stringify(result,null,2));
  console.log('V1.1 UI regression passed: attribution, contextual roleplay, scoring, evidence relevance, manual gates, V2, immutable V1, refresh, mobile.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
