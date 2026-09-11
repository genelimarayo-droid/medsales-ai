import {test} from 'node:test';
import assert from 'node:assert/strict';
import {customerSummary} from '../src/presentation.js';
import * as M from '../src/core.js';
import {project,procurement,clean} from './round5-fixtures.mjs';
test('same customer project switch cannot borrow another project gates or snapshots',()=>{
 const c=M.createCustomer({customerId:'R9',name:'模拟多项目',caseType:'SIMULATED',intake:{project_id:'A',statements:[...project,...procurement].map(r=>r.text).join('\n')}});
 M.stageInput(c,c.intake);M.extract(c);
 for(const id of c.batch){const i=c.information.find(i=>i.id===id),r=[...project,...procurement].find(r=>clean(r.text)===i.content);if(r)M.review(c,id,'edit',{content:i.content,type:i.type,confirmSemantic:true,assertions:[r]});M.review(c,id,'accept');}
 M.confirmBatch(c);M.checkOpportunity(c);assert.equal(c.opportunityStage.stage,4);const history=M.clone(c.versions);
 M.advance(c);M.advance(c);M.confirmPlan(c,{goal:'独立核实 B'});M.endRoleplay(c,true);
 M.recordVisit(c,{caseType:'SIMULATED',date:'2026-09-12',project_id:'B',participants:'模拟主任',statements:'维护麻烦\n希望改善',agreed:'unknown'});M.extract(c);
 for(const [n,id] of c.batch.entries()){const i=c.information.find(i=>i.id===id);M.review(c,id,'edit',{content:i.content,type:i.type,confirmSemantic:true,assertions:[{target:n?'need':'pain',polarity:'SUPPORT'}]});M.review(c,id,'accept');}
 M.confirmBatch(c);c.intake.project_id='B';M.checkOpportunity(c);assert.equal(c.opportunityStage.stage,2);
 assert.ok(c.opportunityStage.supportIds.every(id=>c.evidence.some(e=>e.information_id===id&&e.project_id==='B'&&e.target==='need'&&e.validity==='VALID')));
 c.intake.project_id='A';M.checkOpportunity(c);assert.equal(c.opportunityStage.stage,4);assert.deepEqual(c.versions,history);
});
test('Hero does not fabricate a project, evaluated stage or procurement insight',()=>{
 const c={customerId:'demo',caseType:'SIMULATED',intake:{},information:[],evidence:[]};
 const before=JSON.stringify(c),s=customerSummary(c);
 assert.equal(s.stage,null);assert.equal(s.project,'项目尚未确认');assert.equal(s.evidenceCount,0);
 assert.match(s.insight,/尚未完成/);assert.equal(JSON.stringify(c),before);
});
test('Hero counts evidence objects and unresolved information independently',()=>{
 const c={customerId:'demo',caseType:'REAL_DEIDENTIFIED',draftVersion:3,project_id:'B',opportunityStage:{stage:3,largestGap:'采购启动证据失效'},actions:[{round:2,title:'旧行动'},{round:3,status:'DRAFT',title:'核实反证'}],information:[{status:'ACTIVE',type:'UNVERIFIED',reviewStatus:'CONFIRMED'},{status:'RETRACTED',type:'UNVERIFIED'}],evidence:[{evidence_id:'E1',customer_id:'demo',validity:'INVALIDATED'},{evidence_id:'E2',customer_id:'demo',validity:'VALID'},{evidence_id:'E3',customer_id:'other',validity:'VALID'}]};
  const s=customerSummary(c);assert.equal(s.evidenceCount,1);assert.equal(s.openCount,1);assert.equal(s.stage,3);assert.equal(s.next,'核实反证');assert.equal(s.insight,'采购启动证据失效');assert.equal(s.caseLabel,'真实脱敏案例');
  c.actions[1].status='REJECTED';assert.notEqual(customerSummary(c).next,'核实反证');
});
