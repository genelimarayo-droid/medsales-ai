import {test} from 'node:test';
import assert from 'node:assert/strict';
import {maintenanceFrames,roleContext,respond,scoreContext} from '../src/roleplay.js';
import * as M from '../src/core.js';
test('A response duration retains hours and never becomes a failure count',()=>{
 const frames=maintenanceFrames('维修人员通常需要 4 小时才能响应。');
 assert.equal(frames.length,1);assert.equal(frames[0].dimension,'maintenance_response_time');assert.equal(frames[0].quantity,4);assert.equal(frames[0].unit,'hours');assert.equal(frames[0].period,null);
});
test('B failure count retains its month denominator and never becomes hours',()=>{
 const frames=maintenanceFrames('这个月设备发生了 5 次故障。');
 assert.equal(frames.length,1);assert.equal(frames[0].dimension,'failure_frequency');assert.equal(frames[0].quantity,5);assert.equal(frames[0].unit,'count');assert.equal(frames[0].period,'month');
});
test('C compound statement keeps distinct spans, units and formal evidence objects',()=>{
 const text='设备一个月大概故障 5 次，每次维修人员通常 4 小时响应。';
 const frames=maintenanceFrames(text);assert.equal(frames.length,2);
 assert.deepEqual(frames.map(f=>[f.dimension,f.quantity,f.unit,f.period]),[['failure_frequency',5,'count','month'],['maintenance_response_time',4,'hours',null]]);
 const c=M.createCustomer({name:'模拟量纲核验',customerId:'R10',caseType:'SIMULATED',intake:{statements:text}});
 M.stageInput(c,c.intake);M.extract(c);
 const rows=c.information.filter(i=>i.category==='statements');assert.equal(rows.length,2);
 for(const i of rows){assert.equal(i.type,'CUSTOMER_STATED');assert.equal(i.semanticReviewed,false);}
 const evidence=rows.map(i=>c.evidence.find(e=>e.information_id===i.id));
 assert.notEqual(evidence[0].evidence_id,evidence[1].evidence_id);assert.match(evidence[0].content,/5 次/);assert.match(evidence[1].content,/4 小时/);
});
test('D response/frequency disclosure cannot mutate customer state or inflate score',()=>{
 const c=M.demoCustomer(),before=M.clone(c),rp=roleContext('科室主任','核实维护',c);
 respond(rp,'维修响应需要多久？','',{claim_type:'VERIFY_GAP',reviewed:true});
 assert.equal(rp.topic,'responseTime');assert.equal(rp.scenarioFacts.responseTime.value,null);assert.equal(rp.scenarioFacts.frequency.value,null);
 respond(rp,'设备每月发生几次故障？','',{claim_type:'VERIFY_GAP',reviewed:true});assert.equal(rp.topic,'frequency');
 respond(rp,'客户肯定会买','',{claim_type:'UNSUPPORTED_CERTAINTY',reviewed:true});respond(rp,'预算仍需核实吗？','',{claim_type:'VERIFY_GAP',reviewed:true});
 assert.equal(scoreContext(rp).find(s=>s.label==='证据意识').value,0);assert.deepEqual(c,before);
});
test('unit-aware routing supports context, ambiguity and old saved roleplay scenarios',()=>{
 const rp=roleContext('科室主任','核实',[]);
 respond(rp,'最近维护协调主要是什么问题？','');
 const reply=respond(rp,'维修响应需要多久？','');assert.equal(rp.topic,'responseTime');assert.match(reply,/报修和响应时间/);assert.doesNotMatch(reply,/频率/);
 respond(rp,'具体几小时？','');assert.equal(rp.topic,'responseTime');
 respond(rp,'故障多久一次？','');assert.equal(rp.topic,'frequency');
 assert.equal(maintenanceFrames('那要多久？','maintenance').length,0);
 const old=roleContext('科室主任','核实',[]);delete old.scenarioFacts.responseTime;
 assert.doesNotThrow(()=>respond(old,'报修后需要多久到场？',''));
 assert.deepEqual(maintenanceFrames('这个月故障 9 次，每次工程师 30 分钟到场').map(f=>[f.quantity,f.unit]),[[9,'count'],[30,'minutes']]);
});
