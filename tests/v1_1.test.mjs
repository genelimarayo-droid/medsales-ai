import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../src/core.js';
import {attribute,collect,propositions} from '../src/semantics.js';
import {stageEvaluation} from '../src/opportunity.js';

function customer(statements='',needs='',extra={}){
 const c=M.createCustomer({name:'测试机构代号',customerId:'RULES-'+Math.random().toString(36).slice(2),caseType:'SIMULATED',intake:{institution:'模拟机构',statements,...extra}});
 M.stageInput(c,c.intake);M.extract(c);c.batch.forEach(i=>M.review(c,i,'accept'));M.confirmBatch(c);
 if(needs){M.advance(c);M.advance(c);M.confirmPlan(c,{goal:'验证实际需求'});M.endRoleplay(c,true);M.recordVisit(c,{...M.demoVisit,statements:'',needs,observations:'',objections:'',next:'',judgment:'',unknown:'',agreed:'unknown'});M.extract(c);c.batch.forEach(i=>M.review(c,i,'accept'));M.confirmBatch(c);}
 M.hypothesize(c);M.checkOpportunity(c);M.setState(c,'OPPORTUNITY_CHECK');return c;
}
function role(){const c=M.demoCustomer();M.stageInput(c,c.intake);M.extract(c);c.batch.forEach(i=>M.review(c,i,'accept'));M.confirmBatch(c);M.advance(c);M.advance(c);M.confirmPlan(c,{goal:'澄清维护影响，争取核实而非采购承诺'});M.startRoleplay(c,'科室主任','谨慎简短');return c;}
function information(c,text){return c.information.find(i=>i.content===text);}

test('TEST 1: attribution conflicts preserve explicit authors, ambiguity and human audit',()=>{
 for(const [text,type] of [['我猜主任今年一定会采购','SALES_INFERENCE'],['我认为客户应该更换设备','SALES_INFERENCE'],['AI_INFERENCE：客户今年可能准备采购','AI_INFERENCE'],['SALES_INFERENCE：估计客户今年采购','SALES_INFERENCE'],['估计今年采购','UNVERIFIED'],['应该采购','UNVERIFIED'],['客户说：我们可能明年考虑更新','CUSTOMER_STATED']]){
  const c=customer(text);const i=information(c,text);assert.equal(i.type,type,text);assert.equal(i.rawContent,text);assert.equal(i.suggestedType,type);assert.equal(i.finalType,type);if(type!=='CUSTOMER_STATED')assert.ok(i.conflictReason);assert.ok(c.opportunityStage.stage<2);
 }
 const c=customer('我猜主任今年一定会采购');const i=c.information.find(i=>i.type==='SALES_INFERENCE');M.correct(c,i.id);const before=M.clone(i);
 assert.throws(()=>M.review(c,i.id,'edit',{content:i.content,type:'CUSTOMER_STATED'}),/作者/);assert.deepEqual(i,before);
 M.review(c,i.id,'edit',{content:'主任表示希望减少维修协调',type:'CUSTOMER_STATED'});assert.equal(i.reviewStatus,'PENDING');assert.equal(i.rawContent,'我猜主任今年一定会采购');M.review(c,i.id,'accept');assert.equal(i.finalType,'CUSTOMER_STATED');assert.ok(c.changeLog.some(l=>l.kind==='信息审核'&&l.detail.before?.type==='SALES_INFERENCE'));
});

test('TEST 2: negative improvement demand opposes the hypothesis; purchase denial has limited scope',()=>{
 for(const text of ['客户：我们目前没有改善需求','主任表示不需要改善','客户明确表示没有改善需求']){
  const c=customer('',text);const h=c.hypotheses.find(h=>h.key==='need');assert.equal(h.supportIds.length,0,text);assert.equal(h.status,'已被否定',text);assert.equal(h.strength,'medium');assert.equal(c.assessment[0].status,'明确否定');assert.ok(c.opportunityStage.stage<2);
 }
 const c=customer('主任表示协调维修会分散精力\n主任表示希望减少维护协调','客户：我们目前没有更换需求');
 assert.equal(c.hypotheses.find(h=>h.key==='purchase').status,'已被否定');assert.equal(c.hypotheses.find(h=>h.key==='need').status,'有支持证据');assert.equal(c.assessment[1].status,'有支持');assert.equal(c.assessment[2].status,'明确否定');assert.equal(c.opportunityStage.stage,2);
 const mixed=customer('主任表示希望减少维护协调','客户明确表示没有改善需求');assert.equal(mixed.hypotheses[0].status,'支持与反证并存');assert.equal(mixed.assessment[0].status,'冲突');assert.ok(mixed.opportunityStage.stage<2);
 const noPlan=customer('客户表示没有更新计划');assert.equal(noPlan.hypotheses.find(h=>h.key==='purchase').status,'有反证','no plan does not prove no consideration or future need');
});

test('TEST 3: existing equipment status cannot support demand, budget, plan or authority',()=>{
 const text='主任表示监护仪目前仍可正常使用';const c=customer(text);const ref=information(c,text).id;
 for(const dimension of [0,4,2,5]){
  const rows=M.clone(c.assessment);rows[dimension]={...rows[dimension],status:'有支持',strength:'medium',informationIds:[ref]};const before=JSON.stringify(c);
  assert.throws(()=>M.manualAssessment(c,rows,1,'只有设备状态','仍需核实','未结局'),/证据存在，但与当前维度不匹配/);assert.equal(JSON.stringify(c),before,'failed review is atomic');
 }
 const rows=M.clone(c.assessment);for(const n of [0,2,5,8])rows[n]={...rows[n],status:'有支持',strength:'medium',informationIds:[ref]};assert.throws(()=>M.manualAssessment(c,rows,3,'聊得不错','未知','未结局'),/不匹配/);
 assert.equal(c.hypotheses[0].strength,'unknown');assert.ok(c.hypotheses[0].neutralIds.includes(ref));
});

test('TEST 4: pain is retrieved from all valid records, without inventing severity or procurement',()=>{
 for(const text of ['客户：协调维修会分散精力','主任表示维护协调占用一定精力','客户表示等待维修影响工作安排']){
  const c=customer(text);assert.equal(c.assessment[1].status,'有支持',text);assert.equal(c.assessment[1].strength,'medium');assert.ok(c.assessment[1].informationIds.includes(information(c,text).id));assert.match(c.assessment[1].gap,/程度/);assert.equal(c.assessment[2].status,'未知');assert.ok(c.opportunityStage.stage<3);
 }
 const c=customer('客户表示协调维修不会分散精力');assert.notEqual(c.assessment[1].status,'有支持');
});

test('TEST 5: roleplay keeps context, incrementally discloses and switches topics without procurement fabrication',()=>{
 const c=role();const info=JSON.stringify(c.information),sources=JSON.stringify(c.sources),hypotheses=JSON.stringify(c.hypotheses);
 const ask=t=>M.chat(c,t).messages.at(-1).text;
 assert.match(ask('主要是哪类维护问题？'),/到场|响应/);
 ask('这种情况大概多久发生一次？');assert.equal(c.roleplays[0].context.topic,'frequency');
 ask('那这种情况有没有影响ICU的设备使用安排？');assert.equal(c.roleplays[0].context.topic,'usage');
 assert.match(ask('有没有设备更新计划？'),/更新计划/);assert.equal(c.roleplays[0].context.topic,'purchase');
 assert.match(ask('预算确定了吗？'),/尚未确认/);assert.equal(c.roleplays[0].context.topic,'budget');
 ask('采购流程是什么？');assert.equal(c.roleplays[0].context.topic,'process');
 ask('谁参与设备评估，最终决策人确认了吗？');assert.equal(c.roleplays[0].context.topic,'decision');
 ask('是不是准备今年更换监护仪？');assert.equal(c.roleplays[0].context.topic,'timeline');
 ask('我先整理需要核实的问题，可以下次再和您确认吗？');assert.equal(c.roleplays[0].context.topic,'next');
 const context=c.roleplays[0].context;assert.equal(context.questions.length,9);assert.ok(context.disclosed.length>=8);assert.ok(context.undisclosed.includes('competition'));for(const k of ['purchase','budget','decision','timeline','process','competition'])assert.equal(context.scenarioFacts[k].value,null);
 assert.equal(JSON.stringify(c.information),info);assert.equal(JSON.stringify(c.sources),sources);assert.equal(JSON.stringify(c.hypotheses),hypotheses);assert.equal(c.visitRecords.length,0);
 M.endRoleplay(c);assert.equal(c.state,'VISIT_RECORD');assert.equal(c.roleplays[0].context.goal,'澄清维护影响，争取核实而非采购承诺');
});

test('TEST 6: scoring penalizes unsupported certainty and does not penalize caution or verification questions',()=>{
 for(const text of ['无需核实，预算已经确认，今年一定采购。','不用验证了，已经确认预算，客户肯定购买。','您刚才说已经确认预算，肯定会采购。']){
  const c=role();M.chat(c,text);M.endRoleplay(c);const score=c.roleplays[0].score.find(s=>s.label==='证据意识');assert.equal(score.value,0);assert.match(score.basis,/未经证据支持|尚未披露/);
 }
 const c=role();M.chat(c,'预算是否已经确认？');M.chat(c,'这只是我的判断，不能把推测当成事实，预算尚未确认。');M.chat(c,'我先整理需要核实的问题，可以下次再和您确认吗？');M.endRoleplay(c);assert.ok(c.roleplays[0].score.find(s=>s.label==='证据意识').value>0);assert.equal(c.roleplays[0].context.turns.flatMap(t=>t.hazards).length,0);assert.ok(c.roleplays[0].score.find(s=>s.label==='下一步推进').value>0);
 const d=role();M.chat(d,'谁参与决策？');M.chat(d,'采购时间确定了吗？');M.endRoleplay(d);assert.equal(d.roleplays[0].score.find(s=>s.label==='下一步推进').value,0);
});

test('stage 0-6 gates use distinct project conditions and directly relevant evidence',()=>{
 const make=text=>customer(text).opportunityStage;
 assert.equal(make('').stage,0);
 assert.equal(make('主任表示监护仪仍可正常使用').stage,1);
 assert.equal(make('主任表示希望减少维护协调').stage,2);
 const intent='主任表示计划更新监护仪';assert.ok(make(intent).stage<3);
 const project=[intent,'客户表示项目范围为ICU监护设备','客户表示项目参与者包括科室与设备科','主任表示科室将提交更新申请'].join('\n');
 assert.equal(make(project).stage,3);
 const progressing=[project,'客户表示采购程序已经启动','客户表示采购流程为科室提出再由设备科审核','客户表示由院内授权委员会最终批准','客户表示采购时间定于2027年6月'].join('\n');assert.equal(make(progressing).stage,4);
 const solution=project+'\n客户要求对该项目进行方案评估';assert.equal(make(solution).stage,5);
 const unsupported=project+'\n客户表示可能启动采购程序';assert.equal(make(unsupported).stage,3);
 const outcome={id:'I-result',content:'采购合同已签署',type:'CUSTOMER_STATED',reviewStatus:'CONFIRMED',status:'ACTIVE'};assert.notEqual(stageEvaluation([outcome]).stage,6);
 outcome.type='FACT';assert.equal(stageEvaluation([outcome]).stage,6);assert.equal(stageEvaluation([outcome]).outcome,'成交');
 outcome.content='落标通知已收到';assert.equal(stageEvaluation([outcome]).outcome,'失单');
});

test('negation and uncertainty scope: topic mentions, quoted predictions and meetings are not procurement evidence',()=>{
 assert.equal(attribute('主任说：我认为可能明年更新设备','CUSTOMER_STATED').suggestedType,'CUSTOMER_STATED');
 const c=customer('主任表示可能计划更新监护仪\n主任表示三方约定9月22日讨论维护问题\n客户表示预算尚未确认');
 assert.equal(c.assessment[2].status,'未知');assert.equal(c.assessment[3].status,'未知');assert.equal(c.assessment[4].status,'未知');
 assert.equal(propositions('客户询问是否已经确认预算？').find(p=>p.target==='budget')?.direction,'unknown');
 const pain=customer('客户表示协调维修会分散精力，但目前没有改善需求');assert.equal(pain.assessment[1].status,'有支持');assert.equal(pain.assessment[0].status,'明确否定');assert.equal(pain.opportunityStage.stage,1);
});

test('legacy snapshots remain unchanged; legacy unsupported authors are not accepted as evidence',()=>{
 const c=customer('主任表示希望减少维护协调');const old=JSON.stringify(c.versions[0]);const suspect=M.clone(c.information.find(i=>i.type==='CUSTOMER_STATED'));suspect.id='I-legacy';suspect.content='我猜今年一定采购';delete suspect.semanticVersion;delete suspect.attribution;c.information.push(suspect);
 M.hypothesize(c);M.checkOpportunity(c);assert.equal(JSON.stringify(c.versions[0]),old);assert.equal(c.information.at(-1).type,'CUSTOMER_STATED','never silently rewrites legacy fact');assert.ok(c.assessment.every(r=>!r.informationIds.includes('I-legacy')));
});
