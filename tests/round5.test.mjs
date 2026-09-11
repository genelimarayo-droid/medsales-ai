import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../src/core.js';
import {resolveEvidence} from '../src/evidence.js';
import {roleContext,respond,scoreContext} from '../src/roleplay.js';
import {project,procurement,correction,clean} from './round5-fixtures.mjs';
let serial=0;
function pending(rows,field='statements'){
 const c=M.createCustomer({name:'第五轮结构化模拟',customerId:'E5-'+(++serial),caseType:'SIMULATED',intake:{project_id:'A',[field]:rows.map(r=>r.text).join('\n')}});
 M.stageInput(c,c.intake);M.extract(c);return c;
}
function approve(c,rows){
 for(const id of c.batch){const i=c.information.find(i=>i.id===id),r=rows.find(r=>clean(r.text)===i.content);
  if(r){M.review(c,id,'edit',{content:i.content,type:r.authorConfirm?'CUSTOMER_STATED':i.type,confirmSpeaker:!!r.authorConfirm,speaker:r.authorConfirm?'模拟主任':'',confirmSemantic:true,assertions:[r]});}
  M.review(c,id,'accept');
 }
 M.confirmBatch(c);M.checkOpportunity(c);return c;
}
const make=rows=>approve(pending(rows),rows);
const current=(c,target)=>c.evidence.filter(e=>e.target===target&&e.validity==='VALID');
function prep(c){M.advance(c);M.advance(c);M.confirmPlan(c,{goal:'核实结构化证据'});M.endRoleplay(c,true);}
function visit(c,rows,date){M.recordVisit(c,{caseType:'SIMULATED',date,participants:'模拟主任',project_id:'A',statements:rows.map(r=>r.text).join('\n'),needs:'',observations:'',objections:'',next:'',judgment:'',unknown:'',agreed:'unknown'});M.extract(c);approve(c,rows);M.advance(c);}
function save(c){M.advance(c);assert.throws(()=>M.confirmActions(c));for(const a of c.actions.filter(a=>a.round===c.version+1))M.reviewAction(c,a.id,'accept');M.confirmActions(c);M.saveVersion(c);}
function evidenceScore(events){const c=roleContext('科室主任','验证',[]);for(const e of events)respond(c,e.text,'',{claim_type:e.claim_type,reviewed:!!e.claim_type});return {context:c,score:scoreContext(c).find(s=>s.label==='证据意识')};}

test('TEST-E01 declared customer context attributes first-person quote, not a pronoun heuristic',()=>{
 const rows=[{text:'我们目前没有明确更新计划',target:'purchase',polarity:'UNKNOWN'}],c=make(rows);
 assert.ok(current(c,'purchase').every(e=>e.author==='CUSTOMER'&&e.semantic_role==='CUSTOMER_STATEMENT'));
 const unknown=pending(rows,'unknown');assert.equal(unknown.information.find(i=>i.category==='unknown').type,'UNVERIFIED');
});
test('TEST-E02 sales context stays sales inference',()=>{
 const c=pending([{text:'我感觉采购很快'}],'judgment');for(const id of c.batch)M.review(c,id,'accept');M.confirmBatch(c);M.checkOpportunity(c);
 const e=c.evidence.find(e=>e.content==='我感觉采购很快');assert.equal(e.author,'SALES');assert.equal(e.semantic_role,'SALES_INFERENCE');assert.equal(c.opportunityStage.stage,0);
});
test('TEST-E03 UNKNOWN author confirmation changes authoritative evidence and downstream need',()=>{
 const r={text:'我们希望减少维护负担',target:'need',polarity:'SUPPORT',authorConfirm:true};const c=pending([r],'unknown');assert.equal(c.evidence.find(e=>e.content===r.text).author,'UNKNOWN');approve(c,[r]);
 assert.equal(current(c,'need')[0].author,'CUSTOMER');assert.equal(c.hypotheses[0].evidenceState,'SUPPORTED');assert.equal(c.opportunityStage.stage,2);
});
test('TEST-E04 reviewed negation is target-specific contradiction',()=>{
 for(const [text,target] of [['不需要减少维护负担','need'],['不觉得现在需要改善','need'],['暂时没有更换设备的计划','purchase'],['目前不考虑升级','purchase'],['现有设备够用','immediateReplacement'],['没有必要更换','immediateReplacement']]){
  const c=make([{text,target,polarity:'CONTRADICT'}]);assert.equal(current(c,target)[0].polarity,'CONTRADICT');assert.ok(c.opportunityStage.stage<2);
 }
});
test('TEST-E05 pain supports problem, never a purchase project',()=>{
 const c=make([{text:'设备维护很麻烦',target:'pain',polarity:'SUPPORT'}]);assert.equal(c.assessment[1].status,'有支持');assert.equal(c.opportunityStage.stage,1);assert.equal(c.hypotheses[1].evidenceState,'UNVERIFIED');
});
test('TEST-E06 support and contradiction coexist as MIXED for same hypothesis',()=>{
 const c=make([{text:'希望减少维护负担',target:'need',polarity:'SUPPORT'},{text:'不需要减少维护负担',target:'need',polarity:'CONTRADICT'}]);assert.equal(c.hypotheses[0].evidenceState,'MIXED');assert.ok(c.hypotheses[0].SUPPORTING_EVIDENCE.length);assert.ok(c.hypotheses[0].CONTRADICTING_EVIDENCE.length);assert.equal(c.opportunityStage.stage,1);
});
test('TEST-E07 procurement action is candidate; all stage gates remain necessary',()=>{
 assert.equal(make([procurement[0]]).opportunityStage.stage,1);assert.equal(make([...project,...procurement]).opportunityStage.stage,4);
});
test('TEST-E08 customer correction invalidates procurement support with E-to-E reference',()=>{
 const c=make([...project,...procurement]);const e1=current(c,'procurementStarted')[0];prep(c);visit(c,[correction],'2026-09-11');const e2=current(c,'procurementStarted')[0];assert.equal(e1.validity,'INVALIDATED');assert.ok(e2.contradicts.includes(e1.id));assert.ok(e1.invalidated_by.includes(e2.id));
});
test('TEST-E09 counterevidence recalculates Stage 4 to 3 and exposes evidence audit',()=>{
 const c=make([...project,...procurement]);prep(c);visit(c,[correction],'2026-09-11');assert.equal(c.opportunityStage.stage,3);assert.ok(c.changeLog.some(l=>l.kind==='阶段跳转审计'&&l.detail.currentStage===4&&l.detail.targetStage===3));assert.ok(c.opportunityStage.validation.flatMap(e=>e.relations).some(e=>e.validity==='INVALIDATED'));
});
test('TEST-E10 immutable V2 Stage 4 and current V3 Stage 3',()=>{
 const c=make([...project,...procurement]),v1=M.clone(c.versions[0]);prep(c);visit(c,[procurement[0]],'2026-09-11');save(c);const v2=M.clone(c.versions[1]),raw=M.clone(c.information);M.nextRound(c);prep(c);visit(c,[correction],'2026-09-12');save(c);assert.equal(c.version,3);assert.equal(c.opportunityStage.stage,3);assert.equal(v2.snapshot.opportunityStage.stage,4);assert.deepEqual(c.versions[0],v1);assert.deepEqual(c.versions[1],v2);assert.deepEqual(c.information.slice(0,raw.length),raw);
});
test('TEST-E11 full dialogue unsupported certainty blocks full score',()=>{
 const r=evidenceScore([{text:'我会确认预算',claim_type:'VERIFY_GAP'},{text:'客户肯定会买',claim_type:'UNSUPPORTED_CERTAINTY'}]);assert.equal(r.score.value,0);assert.ok(r.score.evidenceIds.length===2);
});
test('TEST-E12 budget keyword gives no automatic points',()=>{assert.equal(evidenceScore([{text:'预算'}]).score.value,null);});
test('TEST-E13 procurement keyword gives no automatic stage',()=>{const c=make([{text:'采购',target:'unknown',polarity:'UNKNOWN'}]);assert.equal(c.opportunityStage.stage,1);});
test('TEST-E14 shuffled structured evidence resolves consistently',()=>{
 const rows=[...project,...procurement,correction,{text:'设备维护很麻烦',target:'pain',polarity:'SUPPORT'}];for(const seq of [rows,[...rows].reverse(),[...rows.slice(4),...rows.slice(0,4)]])assert.equal(make(seq).opportunityStage.stage,3);
});
test('TEST-E15 mixed authors automatically split with full source retained',()=>{
 const c=pending([{text:'客户说目前没有更新计划，我感觉他们今年可能会采购。'}]);const rows=c.information.filter(i=>i.category==='statements');assert.deepEqual(rows.map(i=>i.type),['CUSTOMER_STATED','SALES_INFERENCE']);assert.equal(new Set(rows.flatMap(i=>i.sourceIds)).size,1);
});
test('TEST-E16 current correction and deletion cannot change historical evidence',()=>{
 const c=make([{text:'希望减少维护负担',target:'need',polarity:'SUPPORT'}]);const old=M.clone(c.versions[0]);const i=c.information.find(i=>i.category==='statements');M.correct(c,i.id);M.review(c,i.id,'delete');M.confirmBatch(c);M.checkOpportunity(c);assert.deepEqual(c.versions[0],old);assert.equal(c.opportunityStage.stage,0);assert.ok(c.evidence.some(e=>e.validity==='INVALIDATED'));
 const d=make([{text:'希望减少维护负担',target:'need',polarity:'SUPPORT'}]),snapshot=M.clone(d.versions[0]),row=d.information.find(i=>i.category==='statements');M.correct(d,row.id);M.review(d,row.id,'edit',{content:'待确认的新表达',type:'UNVERIFIED'});M.review(d,row.id,'accept');M.confirmBatch(d);M.checkOpportunity(d);assert.deepEqual(d.versions[0],snapshot);assert.equal(d.opportunityStage.stage,0);
});
test('unreviewed parser proposals cannot affect hypotheses or gates',()=>{
 const c=pending([{text:'客户表示我们不需要减少维护负担'}]);for(const id of c.batch)M.review(c,id,'accept');M.confirmBatch(c);c.information.forEach(i=>i.propositions=[{target:'need',polarity:'SUPPORT'}]);M.checkOpportunity(c);assert.equal(c.opportunityStage.stage,1);assert.equal(c.hypotheses[0].evidenceState,'UNVERIFIED');
});
test('source, author, scope and time controls reject ineligible evidence',()=>{
 for(const mutate of [c=>c.sources.at(-1).date='2020-01-01',c=>c.sources.at(-1).origin='ROLEPLAY',c=>c.sources.at(-1).customer_id='OTHER',c=>c.information.at(-1).authorshipReviewed=false]){const c=make([...project,...procurement]);mutate(c);M.checkOpportunity(c);assert.ok(c.opportunityStage.stage<4);}
 const c=make([...project,...procurement]);c.intake.project_id='B';M.checkOpportunity(c);assert.ok(c.opportunityStage.stage<3);
});
test('positive evidence awareness requires confirmed behavior dimensions, unknown turn blocks full score',()=>{
 const events=[{text:'预算未知，我先核实',claim_type:'VERIFY_GAP'},{text:'这只是判断，采购尚不确定',claim_type:'DISTINGUISH'}];assert.equal(evidenceScore(events).score.value,2);assert.equal(evidenceScore([...events,{text:'虽然客户没有确认，但我断定医院今年必定购置监护仪，接下来直接准备采购方案。'}]).score.value,null);
});
test('structured scoring does not read raw speechFrame or prior lexical hazards',()=>{
 const r=evidenceScore([{text:'预算',claim_type:'NEUTRAL'}]);r.context.turns[0].hazards=[{kind:'invented'}];r.context.turns[0].distinction=true;assert.equal(scoreContext(r.context).find(s=>s.label==='证据意识').value,0);
});
test('explicit later supersession resolves a counterclaim without rewriting snapshots',()=>{
 const c=make([...project,...procurement,correction]);assert.equal(c.opportunityStage.stage,3);const counter=current(c,'procurementStarted').find(e=>e.polarity==='CONTRADICT'),old=M.clone(c.versions[0]);
 prep(c);visit(c,[{...procurement[0],supersedes:[counter.id]}],'2026-09-12');assert.equal(c.opportunityStage.stage,4);assert.equal(c.evidence.find(e=>e.id===counter.id).validity,'SUPERSEDED');assert.deepEqual(c.versions[0],old);
});
test('legacy calculation cannot be saved as a new structured-evidence version',()=>{
 const c=make([...project,...procurement]);prep(c);visit(c,[procurement[0]],'2026-09-11');M.advance(c);for(const a of c.actions.filter(a=>a.round===c.version+1))M.reviewAction(c,a.id,'accept');M.confirmActions(c);c.opportunityStage.semanticVersion='1.1-r4';assert.throws(()=>M.saveVersion(c),/过期/);assert.equal(c.version,1);
});
