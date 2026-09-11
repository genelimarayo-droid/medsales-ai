import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../src/core.js';
import {roleContext,respond,scoreContext} from '../src/roleplay.js';
let seq=0;
const project=['主任表示计划更新监护仪','客户表示项目范围为ICU监护设备','客户表示项目参与者包括科室与设备科','主任表示科室将提交更新申请'];
const procurement=['客户明确说采购流程已经启动','客户表示采购流程为科室提出再由设备科审核','客户表示由院内授权委员会最终批准','客户表示采购时间定于2027年6月'];
function pending(text,projectId=''){const c=M.createCustomer({name:'第四轮隔离模拟',customerId:'R4-'+(++seq),caseType:'SIMULATED',intake:{role:'模拟主任',statements:text,project_id:projectId}});M.stageInput(c,c.intake);M.extract(c);return c;}
function confirm(c,speaker=false){for(const id of c.batch){const i=c.information.find(i=>i.id===id);if(speaker&&i.type==='UNVERIFIED'&&i.category==='statements')M.review(c,id,'edit',{content:i.content,type:'CUSTOMER_STATED',confirmSpeaker:true,speaker:'模拟主任'});M.review(c,id,'accept');}M.confirmBatch(c);M.checkOpportunity(c);return c;}
const make=(s,actor=false,p='')=>confirm(pending(s,p),actor);
const rows=c=>c.information.filter(i=>i.category==='statements');
function scores(texts){const c=roleContext('科室主任','核实需求',[]);for(const t of texts)respond(c,t,'');return {context:c,score:scoreContext(c).find(s=>s.label==='证据意识')};}
function prep(c){M.advance(c);M.advance(c);M.confirmPlan(c,{goal:'核实当前有效信息'});M.endRoleplay(c,true);}
function saveVisit(c,text){M.recordVisit(c,{...M.demoVisit,project_id:'A',statements:text,needs:'',observations:'',objections:'',next:'',judgment:'',unknown:'',agreed:'unknown'});M.extract(c);confirm(c,true);M.advance(c);M.advance(c);for(const a of c.actions.filter(a=>a.round===c.version+1))M.reviewAction(c,a.id,'accept');M.confirmActions(c);M.saveVersion(c);}

test('TEST 1 mixed-author vocabulary preserves semantic roles',()=>{
 for(const [s,type] of [['我感觉采购很快。','SALES_INFERENCE'],['系统推测客户准备采购。','AI_INFERENCE'],['销售总结：希望改善。','SALES_INFERENCE'],['人工备注：客户很有兴趣。','SALES_INFERENCE']]){const c=make(s);assert.equal(rows(c)[0].type,type);assert.equal(c.opportunityStage.stage,0);assert.ok(rows(c)[0].attribution.semantic_role);}
});
test('TEST 2 split customer speech and sales feelings; budget remains uncertain',()=>{
 for(const text of ['客户说设备维护麻烦，所以我感觉采购很快。','客户说预算应该已经有了，我感觉采购很快。']){const c=make(text);assert.deepEqual(rows(c).map(i=>i.type),['CUSTOMER_STATED','SALES_INFERENCE']);assert.ok(c.sources.some(s=>s.content===text));assert.equal(c.assessment[4].status,'未知');assert.ok(c.opportunityStage.stage<2);}
});
test('TEST 3 negated belief, denial and reported falsehood cannot confirm needs',()=>{
 for(const text of ['客户觉得目前不需要改善。','客户表示不觉得需要改善。','客户表示谈不上需要改善。','客户表示别再说我们希望改善了。']){const c=make(text);assert.equal(c.hypotheses[0].polarity,'CONTRADICT',text);assert.equal(c.hypotheses[0].supportIds.length,0);assert.ok(c.opportunityStage.stage<2);}
});
test('TEST 4 raw denial becomes customer counterevidence only after explicit source/speaker confirmation',()=>{
 const c=pending('目前没有更新计划。');const i=rows(c)[0];assert.equal(i.type,'UNVERIFIED');const source=JSON.stringify(c.sources);confirm(c,true);assert.equal(i.type,'CUSTOMER_STATED');assert.equal(i.rawContent,'目前没有更新计划');assert.equal(JSON.stringify(c.sources),source);assert.equal(c.hypotheses[1].polarity,'CONTRADICT');
});
test('TEST 5 raw maintenance burden is Problem, not Need Confirmed or Project',()=>{
 const c=make('维护比较麻烦。',true);assert.equal(c.assessment[1].status,'有支持');assert.equal(c.opportunityStage.stage,1);assert.equal(c.hypotheses[0].status,'待验证');assert.ok(c.evidence.some(e=>e.level==='Problem Evidence'));
});
test('TEST 6 raw improvement wish is Need, never a project by itself',()=>{
 const c=make('希望减少维护负担。',true);assert.equal(c.assessment[0].status,'有支持');assert.equal(c.opportunityStage.stage,2);
 const mixed=make('客户希望减少维护负担。\n客户觉得目前不需要改善。');assert.equal(mixed.hypotheses[0].polarity,'MIXED');assert.ok(mixed.opportunityStage.stage<2);
});
test('TEST 7 sales process inference cannot support Stage 4',()=>{
 const c=make([...project,...procurement.slice(1),'我觉得采购流程已经启动。'].join('\n'),false,'A');assert.equal(rows(c).at(-1).type,'SALES_INFERENCE');assert.equal(c.opportunityStage.stage,3);
});
test('TEST 8 explicit customer procurement speech is a candidate; full gates still required',()=>{
 const c=make('客户明确说采购流程已经启动。');assert.equal(rows(c)[0].type,'CUSTOMER_STATED');assert.ok(rows(c)[0].propositions.some(p=>p.target==='procurementStarted'&&p.polarity==='SUPPORT'));assert.ok(c.opportunityStage.stage<4);
 assert.equal(make([...project,...procurement].join('\n'),false,'A').opportunityStage.stage,4);
});
test('TEST 9 later customer correction invalidates procurement support without mutating historical facts',()=>{
 const c=make([...project,...procurement].join('\n'),false,'A'),v1=JSON.stringify(c.versions[0]);prep(c);saveVisit(c,'客户明确说采购流程已经启动。');assert.equal(c.version,2);assert.equal(c.opportunityStage.stage,4);const v2=JSON.stringify(c.versions[1]),old=JSON.stringify(c.information);
 M.nextRound(c);prep(c);saveVisit(c,'刚才说错了，采购流程其实还没启动。');assert.equal(c.version,3);assert.equal(c.opportunityStage.stage,3);assert.equal(JSON.stringify(c.versions[0]),v1);assert.equal(JSON.stringify(c.versions[1]),v2);assert.equal(JSON.stringify(c.information.slice(0,JSON.parse(old).length)),old);
 const invalid=c.opportunityStage.validation.flatMap(e=>e.relations).filter(p=>p.target==='procurementStarted'&&p.verificationStatus==='CONTRADICTED');assert.ok(invalid.length);assert.ok(invalid.every(p=>p.contradictedBy.length));assert.ok(c.changeLog.some(l=>l.kind==='阶段跳转审计'&&l.detail.currentStage===4&&l.detail.targetStage===3));
});
test('TEST 10 serious evidence violations cap the complete dialogue, including after good behaviour',()=>{
 const good='目前预算和采购时间都不能确认，我先核实采购流程和相关负责人。';
 for(const bad of ['我先核实预算，不过我感觉客户今年肯定会采购。','我感觉主任应该有预算，所以我可以直接按照今年采购来准备。','客户看起来很感兴趣，所以应该已经进入采购阶段。','我会核实预算，不过其实已经确认客户今年肯定采购。','无需核实，我已经确认预算，一定今年采购。']){const s=scores([good,bad]);assert.equal(s.score.value,0,bad);assert.ok(s.context.turns.at(-1).hazards.length);}
});
test('TEST 11 uncertainty and verification plans score well without inventing customer agreement',()=>{
 for(const s of ['我会先核实预算，目前还不能确认今年是否采购。','预算和采购时间目前都未知，我下一步先确认采购流程和相关负责人。','我先确认一下目前设备存在的具体问题，再判断是否有更新需求。'])assert.equal(scores([s]).score.value,2,s);
});
test('TEST 12 same-customer project B procurement cannot advance project A',()=>{
 const c=make(project.join('\n'),false,'A');prep(c);M.recordVisit(c,{...M.demoVisit,project_id:'B',statements:'客户表示项目范围为检验设备\n客户明确说采购流程已经启动',needs:'',observations:'',objections:'',next:'',judgment:'',unknown:''});M.extract(c);confirm(c);assert.equal(c.opportunityStage.stage,3);assert.ok(c.opportunityStage.validation.some(e=>e.project_id==='B'&&!e.checks.project));
});
test('exact stage audit references only participating conditions and retains timestamps, strength and author',()=>{
 const c=make('客户希望减少维护负担');assert.equal(c.opportunityStage.transitions[0].currentStage,0);assert.equal(c.opportunityStage.transitions[0].targetStage,2);
 const t=c.opportunityStage.transitions[0];assert.ok(t.at);assert.ok(t.conditions.every(k=>k.met&&k.triggerIds.length));assert.deepEqual(t.triggerIds,c.opportunityStage.supportIds);assert.ok(t.evidence.filter(e=>e.trigger).every(e=>e.author==='CUSTOMER'&&e.relations.some(p=>p.strength==='medium')));
 M.setState(c,'OPPORTUNITY_CHECK');M.manualAssessment(c,M.clone(c.assessment),1,'先保守维持接触','仍需进一步验证','未结局');assert.equal(c.opportunityStage.transitions[0].targetStage,1,'audit the chosen stage, not the highest automatically eligible stage');
});
test('rhetorical purchase and false procurement claims cannot satisfy gates',()=>{
 assert.ok(make(project.map((s,n)=>n===0?'客户表示谁说我们计划更新监护仪':s).join('\n')).opportunityStage.stage<3);
 for(const s of ['客户表示采购程序已经启动的说法不属实','客户明确说采购流程其实还没启动'])assert.equal(make([...project,...procurement.slice(1),s].join('\n'),false,'A').opportunityStage.stage,3);
});
test('speaker confirmation cannot launder an inference, ambiguous authors or changed raw text',()=>{
 for(const s of ['我感觉采购很快','AI判断客户希望改善','销售备注：希望改善','可能采购','CUSTOMER_STATED：AI_INFERENCE：客户希望改善']){const c=pending(s),i=rows(c)[0];assert.throws(()=>M.review(c,i.id,'edit',{content:i.content,type:'CUSTOMER_STATED',confirmSpeaker:true,speaker:'主任',authorReason:'已确认'}));}
 const c=pending('维护比较麻烦'),i=rows(c)[0];assert.throws(()=>M.review(c,i.id,'edit',{content:'希望改善',type:'CUSTOMER_STATED',confirmSpeaker:true,speaker:'主任'}));
});
test('real workflow recalculations audit 1 to 2, 2 to 3, and 3 to 4 with valid trigger references',()=>{
 const c=make('客户表示设备正常使用',false,'A');assert.equal(c.opportunityStage.stage,1);
 for(const [text,stage] of [['希望减少维护负担。',2],[project.join('\n'),3],[procurement.join('\n'),4]]){
  if(c.saved)M.nextRound(c);prep(c);saveVisit(c,text);assert.equal(c.opportunityStage.stage,stage);
  const audit=c.changeLog.findLast(l=>l.kind==='阶段跳转审计'&&l.detail.currentStage===stage-1&&l.detail.targetStage===stage)?.detail;
  assert.ok(audit);assert.ok(audit.conditions.every(k=>k.met&&k.triggerIds.length));assert.ok(audit.triggerIds.every(id=>audit.evidence.some(e=>e.information_id===id&&e.trigger)));
 }
});
