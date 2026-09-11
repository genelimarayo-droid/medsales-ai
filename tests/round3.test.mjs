import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../src/core.js';
import {attribute,propositions} from '../src/semantics.js';
import {validateEvidence} from '../src/evidence-validation.js';
import {roleContext,respond,scoreContext} from '../src/roleplay.js';
import {stageEvaluation} from '../src/opportunity.js';
let seq=0;
const project=['主任表示计划更新监护仪','客户表示项目范围为ICU监护设备','客户表示项目参与者包括科室与设备科','主任表示科室将提交更新申请'];
function pending(text){const c=M.createCustomer({name:'隔离模拟机构',customerId:'R3-'+(++seq),caseType:'SIMULATED',intake:{statements:text}});M.stageInput(c,c.intake);M.extract(c);return c;}
function confirm(c){for(const id of c.batch)M.review(c,id,'accept');M.confirmBatch(c);M.hypothesize(c);M.checkOpportunity(c);return c;}
const make=text=>confirm(pending(text));
const rows=c=>c.information.filter(i=>i.category==='statements');
function score(text){const c=roleContext('科室主任','核实维护',[]);respond(c,text,'谨慎简短');return {context:c,result:scoreContext(c).find(s=>s.label==='证据意识')};}

test('A/B explicit sales and AI authors cannot promote an opportunity',()=>{
 for(const [s,type] of [['我觉得主任今年一定会采购。','SALES_INFERENCE'],['AI判断客户今年可能采购。','AI_INFERENCE']]){const c=make(s);assert.equal(rows(c)[0].type,type);assert.equal(c.opportunityStage.stage,0);}
});
test('C mixed authors split with original source preserved; nested labels stay unresolved',()=>{
 const raw='主任说设备还能正常使用，所以我认为今年一定会采购。';const c=make(raw);assert.deepEqual(rows(c).map(i=>i.type),['CUSTOMER_STATED','SALES_INFERENCE']);assert.ok(c.sources.some(s=>s.content===raw));assert.equal(c.opportunityStage.stage,1);
 for(const text of ['CUSTOMER_STATED：AI_INFERENCE：客户希望改善维修','CUSTOMER_STATED：备注：客户应该比较有兴趣'])assert.equal(rows(make(text))[0].type,'UNVERIFIED');
 assert.equal(rows(make('备注：客户应该比较有兴趣'))[0].type,'SALES_INFERENCE');
 assert.equal(attribute('客户说今年可能会换设备','CUSTOMER_STATED').suggestedType,'CUSTOMER_STATED');
});
test('D/E negative need and purchase variants never become positive stage gates',()=>{
 for(const s of ['客户明确表示目前没有改善需求。','客户不希望改善现有设备。','主任表示并非需要改善。','客户不考虑今年更换设备。','客户表示暂时不考虑更换。','主任表示今年不考虑采购。']){
  const c=make(s);assert.ok(c.opportunityStage.stage<2,s);const target=/改善/.test(s)?'need':'purchase';const h=c.hypotheses.find(h=>h.key===target);assert.equal(h.supportIds.length,0,s);assert.ok(h.oppositionIds.length,s);assert.equal(h.polarity,'CONTRADICT');
 }
 const c=make('主任表示希望减少维护负担\n客户明确表示目前没有改善需求');assert.equal(c.hypotheses[0].polarity,'MIXED');assert.equal(c.assessment[0].status,'冲突');assert.ok(c.opportunityStage.stage<2);
});
test('F unrelated equipment information cannot support procurement dimensions manually',()=>{
 const c=make('主任表示设备还能正常使用');M.setState(c,'OPPORTUNITY_CHECK');
 for(const n of [2,4,5,8]){const a=M.clone(c.assessment);a[n]={...a[n],status:'有支持',strength:'medium',informationIds:[rows(c)[0].id]};assert.throws(()=>M.manualAssessment(c,a,3,'有编号','待核实','未结局'),/不匹配|门槛/);}
});
test('G cross-project source scopes and forged bindings cannot promote project A',()=>{
 const c=make(['主任表示ICU计划更新监护仪','客户表示影像项目范围为CT设备','客户表示检验项目参与者包括检验科与设备科','主任表示急诊科室将提交更新申请'].join('\n'));assert.ok(c.opportunityStage.stage<3);assert.equal(c.opportunityStage.project_id,null);
 const good=make(project.join('\n'));assert.equal(good.opportunityStage.stage,3);const before=JSON.stringify(good.information);good.project_id='project-A';M.checkOpportunity(good);assert.ok(good.opportunityStage.stage<3);assert.equal(JSON.stringify(good.information),before);
 const foreign=make(project.join('\n'));const i=rows(foreign).find(i=>i.content.includes('参与者'));i.project_id='project-B';M.checkOpportunity(foreign);assert.ok(foreign.opportunityStage.stage<3);
 const invalid=make('主任表示希望减少维护协调');rows(invalid)[0].status='SUPERSEDED';M.checkOpportunity(invalid);assert.equal(invalid.hypotheses[0].supportIds.length,0,'derived hypothesis must drop stale evidence');
});
test('H/I rapport and pain are distinct from need, project and procurement',()=>{
 assert.ok(make('客户聊得不错。').opportunityStage.stage<3);
 const c=make('客户表示协调处理会分散精力。');assert.equal(c.assessment[1].status,'有支持');assert.equal(c.assessment[1].strength,'medium');assert.equal(c.opportunityStage.stage,1);assert.equal(c.assessment[2].status,'未知');assert.equal(c.assessment[0].status,'未知');
 assert.equal(propositions('维护已经影响工作效率')[0].polarity,'SUPPORT');
 const normal=make('主任表示设备还能用，但维护比较麻烦');assert.equal(normal.assessment[1].status,'有支持');const e=normal.evidence.find(e=>e.scope==='immediate-replacement');assert.equal(e.polarity,'CONTRADICT');assert.equal(normal.opportunityStage.stage,1);
});
test('J/K scoring checks assertions after disclaimers, and recognizes explicit uncertainty with verification',()=>{
 for(const t of ['无需核实，已经确认预算，一定今年采购。','不能把推测当成事实，但是预算已经确认，今年一定采购。','预算尚未确认，不过我保证今年一定采购。','这只是我的判断，但是客户肯定购买。']){const s=score(t);assert.equal(s.result.value,0,t);assert.ok(s.context.turns[0].hazards.length);assert.match(s.result.basis,/未经证据支持/);}
 for(const t of ['目前预算和采购时间都还不能确认，我建议先核实采购流程和相关负责人。','目前我还不能确认预算和采购时间，我会先核实相关负责人和采购流程。'])assert.equal(score(t).result.value,2,t);
});
test('L exact follow-up sequence resolves handling, participants, proposal, and procurement process',()=>{
 const c=roleContext('科室主任','核实',[]);const turns=[['主任，您刚才提到维护次数增加，主要增加的是哪些问题？','maintenance'],['这些问题对ICU日常工作具体造成了什么影响？','impact'],['如果确实影响比较明显，您们通常会怎么处理？','handling'],['这类问题一般是谁会参与后续评估？','participants'],['如果需要进一步核实，我们下次可以和相关人员一起确认吗？','next'],['采购流程是什么？','process']];
 for(const [q,topic] of turns){respond(c,q,'');assert.equal(c.topic,topic,q);}
 assert.equal(new Set(c.turns.map(t=>t.reply)).size,turns.length);assert.equal(c.scenarioFacts.budget.status,'UNKNOWN');assert.ok(c.undisclosed.includes('budget'));assert.match(c.turns.at(-1).reply,/采购流程/);
});
test('author review cannot use arbitrary reason or rewritten quote to launder original inference',()=>{
 const c=pending('AI_INFERENCE：客户希望减少维修协调');const i=rows(c)[0],old=JSON.stringify(i);
 for(const content of [i.content,'主任表示希望减少维修协调'])assert.throws(()=>M.review(c,i.id,'edit',{content,type:'CUSTOMER_STATED',authorReason:'客户聊得不错，我认为可以确认'}),/作者|出处/);
 assert.equal(JSON.stringify(i),old);
 i.type='CUSTOMER_STATED';i.authorOverride={reason:'客户聊得不错',confirmed:true};assert.throws(()=>M.review(c,i.id,'accept'),/冲突/);assert.equal(validateEvidence(c).entries.find(e=>e.information_id===i.id).checks.author,false);
});
test('hypothetical project and unknown scope cannot satisfy Stage 3',()=>{
 for(const marker of ['如果','假设','假如','例如']){const c=make(project.map(t=>t.replace('表示','表示'+marker)).join('\n'));assert.ok(c.opportunityStage.stage<3,marker);}
 const c=make(project.join('\n').replace('ICU监护设备','尚未明确'));assert.ok(c.opportunityStage.stage<3);
 for(const word of ['AI建议','听说','预测'])assert.ok(make(project.map(t=>t.replace('表示','表示'+word)).join('\n')).opportunityStage.stage<3,'reported recommendations are not project confirmation');
});
test('validation rejects stale, wrong customer, missing source, roleplay origin and unchecked FACT',()=>{
 for(const mutate of [c=>{rows(c)[2].customer_id='another';},c=>{rows(c)[2].status='SUPERSEDED';},c=>{rows(c)[2].sourceIds=['S-missing'];},c=>{c.sources.find(s=>s.id===rows(c)[2].sourceIds[0]).origin='ROLEPLAY';},c=>{rows(c)[2].type='FACT';},c=>{rows(c)[2].introducedVersion=99;}]){const c=make(project.join('\n'));mutate(c);M.checkOpportunity(c);assert.ok(c.opportunityStage.stage<3);}
});
test('strict procurement conditions and vague dates; valid progression still works',()=>{
 const more=['客户表示采购程序已经启动','客户表示采购流程为科室提出再由设备科审核','客户表示由院内授权委员会最终批准','客户表示采购时间定于2027年6月'];
 assert.equal(make([...project,...more].join('\n')).opportunityStage.stage,4);
 for(let n=0;n<more.length;n++)assert.equal(make([...project,...more.filter((_,i)=>i!==n)].join('\n')).opportunityStage.stage,3);
 assert.equal(make([...project,...more.slice(0,3),'客户表示采购时间定于今年'].join('\n')).opportunityStage.stage,3);
 assert.equal(make([...project,'客户要求对该项目进行方案评估'].join('\n')).opportunityStage.stage,5);
});
test('transition explanation exposes source, type, polarity and unmet conditions without changing originals',()=>{
 const c=make('客户表示协调处理会分散精力');const raw=JSON.stringify(c.information);M.checkOpportunity(c);assert.equal(JSON.stringify(c.information),raw);const t=c.opportunityStage.transitions.at(-1);assert.equal(t.targetStage,2);assert.equal(t.allowed,false);assert.match(t.conclusion,/不是没有信息/);assert.ok(c.opportunityStage.validation.some(v=>v.relations.some(p=>p.level==='Problem Evidence')));
});
test('same project label cannot join incompatible scopes, and prior snapshots stay immutable',()=>{
 const c=make(project.join('\n'));const old=JSON.stringify(c.versions[0]);const s=c.sources.find(s=>s.content.includes('项目范围'));
 s.project_id='A';c.project_id='A';for(const i of rows(c))i.project_id='A';
 const other=M.clone(s);other.id='S-other';other.content='客户表示项目范围为CT设备';c.sources.push(other);
 const otherInfo=M.clone(rows(c)[1]);otherInfo.id='I-other';otherInfo.content=otherInfo.rawContent=other.content;otherInfo.sourceIds=[other.id];c.information.push(otherInfo);
 M.checkOpportunity(c);assert.ok(c.opportunityStage.stage<3);assert.equal(JSON.stringify(c.versions[0]),old);
 otherInfo.status='SUPERSEDED';M.checkOpportunity(c);assert.equal(c.opportunityStage.stage,3,'superseded source must not block current scope');
});
test('matching device scope alone cannot merge projects from separate records',()=>{
 const c=make(project.join('\n'));const source=c.sources.find(s=>s.content.includes('项目范围'));const other={...M.clone(source),id:'S-second'};c.sources.push(other);
 const i={...M.clone(rows(c)[1]),id:'I-second',sourceIds:[other.id],project_id:null};c.information.push(i);M.checkOpportunity(c);assert.equal(c.opportunityStage.project_id,null);assert.ok(c.opportunityStage.stage<3);
});
test('result validity contradiction blocks Stage 6 rather than silently retaining won',()=>{
 const info=(id,content)=>({id,content,type:'FACT',status:'ACTIVE',reviewStatus:'CONFIRMED'});
 assert.equal(stageEvaluation([info('I1','采购合同已签署')]).stage,6);
 assert.notEqual(stageEvaluation([info('I1','采购合同已签署'),info('I2','采购合同已失效')]).stage,6);
});
