import {attribute,informationClauses,propositions,trustedPropositions,collect,DIMENSION_TARGETS,SEMANTIC_VERSION,speakerConfirmationEligible,confirmedSpeaker,projectBinding} from './semantics.js';
import {validateEvidence,transitionExplanation} from './evidence-validation.js';
import {roleContext,respond,scoreContext,BEHAVIORS} from './roleplay.js';
export {BEHAVIORS};
import {dimensionRelations,stageEvaluation,validateDimension,STAGE_RULES,CONDITION_LABELS} from './opportunity.js';
import {assertionsForReview,syncEvidence,resolveEvidence,TARGETS,POLARITIES} from './evidence.js';
export {TARGETS,POLARITIES};
export {SEMANTIC_VERSION};
export const TYPES=['FACT','CUSTOMER_STATED','SALES_INFERENCE','AI_INFERENCE','UNVERIFIED'];
export const STRENGTHS=['strong','medium','weak','unknown'];
export const STATES=['NEW','INTAKE','EXTRACTION','HUMAN_REVIEW','CUSTOMER_ANALYSIS','HYPOTHESIS','VISIT_PREP','ROLEPLAY','VISIT_RECORD','DEBRIEF','OPPORTUNITY_CHECK','ACTION_REVIEW','VERSION_SAVE'];
export const LABELS=['新建客户','客户录入','信息提取','人工确认','客户理解','需求假设','拜访准备','客户演练','拜访记录','AI 复盘','商机证据','行动确认','版本保存'];
export const DIMENSIONS=['明确需求','明确痛点','采购计划','时间节点','预算','决策人','采购流程','竞争对手','下一步行动','客户时间投入'];
export const STAGES=['lead only','initial contact','needs confirmed','project identified','procurement advancing','commercial/solution stage','won/lost'];
export const STAGE_ZH=['仅线索','初步接触','需求确认','项目识别','采购推进','商务 / 方案','成交 / 失单'];
export const clone=x=>JSON.parse(JSON.stringify(x));
export const now=()=>new Date().toISOString();
export const date=()=>new Date().toLocaleDateString('sv-SE');
function need(ok,msg){if(!ok)throw Error(msg);}
export function id(c,p){c.idCounters[p]=(c.idCounters[p]||0)+1;return p+String(c.idCounters[p]).padStart(2,'0');}
export function log(c,kind,detail){c.changeLog.push({id:id(c,'CL'),at:now(),kind,detail:clone(detail)});}
export function createCustomer(input){
  need(input.name?.trim() && input.customerId?.trim(),'填写客户名称和客户代号');
  need(['SIMULATED','REAL_DEIDENTIFIED'].includes(input.caseType),'请选择案例性质');
  return {schemaVersion:'MedSales AI Data Schema V1',customerId:input.customerId.trim(),name:input.name.trim(),caseType:input.caseType,demo:!!input.demo,version:0,draftVersion:1,state:'INTAKE',reviewContext:'INITIAL',resumeState:null,reviewRevision:0,idCounters:{},information:[],sources:[],evidence:[],hypotheses:[],customerUnderstanding:[],opportunityStage:null,visitPlans:[],visitRecords:[],roleplays:[],actions:[],changeLog:[],versions:[],batch:[],intake:{institution:input.name,department:'',role:'',current:'',statements:'',history:'',judgment:'',unknown:'',product:'',productSource:'',date:date(),...input.intake},visited:['INTAKE'],assessment:[],saved:false};
}
export function demoCustomer(){return createCustomer({name:'模拟 A 院 · ICU',customerId:'SIM-ICU-001',caseType:'SIMULATED',demo:true,intake:{institution:'模拟 A 院（三级医院，仅模拟设定）',department:'ICU',role:'C01 · 科室主任（采购权限未知）',current:'主任表示目前监护仪还能正常使用',statements:'主任表示最近维护次数比以前多',judgment:'我认为可能存在更新机会，但没有客户采购表达支持',unknown:'维护周期和次数未知\n维护影响未知\n采购计划未知\n预算未知\n决策流程未知',date:'2026-09-10'}});}
export function setState(c,s){need(STATES.includes(s),'无效状态');c.state=s;if(!c.visited.includes(s))c.visited.push(s);c.saved=false;}
function source(c,title,content,origin,checked=false){const s={id:id(c,'S'),title,content,origin,caseType:c.caseType,subject:'用户提供',date:c.intake.date,acquiredAt:now(),verification:checked?'CONTENT_CHECKED':'USER_REPORTED',checkedBy:checked?'用户模拟设定 / 待审核':'未核对客观真实性',scope:c.caseType==='SIMULATED'?'仅模拟案例':'用户提供内容，非客观真实性验证'};c.sources.push(s);return s;}
function addInfo(c,content,type,s,category,time){const ingestionContext={declaredAuthor:type==='CUSTOMER_STATED'?'CUSTOMER':type==='SALES_INFERENCE'?'SALES':'UNKNOWN'};const attribution=attribute(content,type,ingestionContext);const i={id:id(c,'I'),content,rawContent:content,type:attribution.suggestedType,suggestedType:attribution.suggestedType,conflictReason:attribution.conflict,attribution,ingestionContext,finalType:null,propositions:propositions(content),assertions:[],semanticReviewed:false,authorshipReviewed:false,semanticVersion:SEMANTIC_VERSION,sourceIds:[s.id],time:time||s.date,reviewStatus:'PENDING',status:'ACTIVE',conflicts:[],replaces:[],revision:1,category};c.information.push(i);c.batch.push(i.id);return i;}
function lines(s){return informationClauses(s);}
export function stageInput(c,input){need(c.state==='INTAKE','当前不是录入状态');need(Object.values(input).some(x=>String(x).trim()),'至少填写一项资料');c.intake={...c.intake,...input};setState(c,'EXTRACTION');}
export function extract(c){
 need(c.state==='EXTRACTION','必须先提交原始记录');c.batch=[];
 const post=c.reviewContext==='POST_VISIT';const raw=post?c.visitRecords.at(-1):c.intake;
 const fields=post?[['statements','客户明确表达','CUSTOMER_STATED'],['needs','客户明确需求','CUSTOMER_STATED'],['observations','现场观察','UNVERIFIED'],['objections','客户异议','CUSTOMER_STATED'],['next','下一步约定','CUSTOMER_STATED'],['judgment','销售判断','SALES_INFERENCE'],['unknown','待验证','UNVERIFIED']]:[['institution','机构','UNVERIFIED'],['department','科室','UNVERIFIED'],['role','客户角色','UNVERIFIED'],['current','当前设备','CUSTOMER_STATED'],['statements','客户表达','CUSTOMER_STATED'],['history','历史记录','UNVERIFIED'],['judgment','销售判断','SALES_INFERENCE'],['unknown','待验证','UNVERIFIED'],['product','产品资料','UNVERIFIED']];
 for(const [key,label,type] of fields){if(!raw[key]?.trim())continue;let t=type;
 const checked=!post&&c.caseType==='SIMULATED'&&['institution','department','role'].includes(key);if(checked)t='FACT';
 const s=source(c,label,raw[key],key==='product'?'PRODUCT_MATERIAL':post?'SIMULATED_VISIT':key==='judgment'?'USER_OBSERVATION':'CUSTOMER_RECORD',checked);
 if(post&&c.caseType==='REAL_DEIDENTIFIED')s.origin='CUSTOMER_RECORD';s.date=raw.date;s.location=key==='product'?(raw.productSource||'未提供来源'): '用户输入';if(key==='product'){s.verification='UNREAD';s.scope='未核实产品资料，不支持性能或适配结论';}
 s.customer_id=c.customerId;s.project_id=raw.project_id||null;
 for(const line of lines(raw[key])){const i=addInfo(c,line,t,s,key,raw.date);i.customer_id=c.customerId;i.project_id=projectBinding(s).id;i.introducedVersion=c.version+1;}
 }
 need(c.batch.length,'请提供有内容的记录');if(post)raw.informationIds=[...c.batch];syncEvidence(c);c.reviewRevision++;log(c,'提取草稿',{added:c.batch});setState(c,'HUMAN_REVIEW');
}
export function active(c){return c.information.filter(i=>i.reviewStatus==='CONFIRMED'&&i.status==='ACTIVE'&&i.type!=='UNVERIFIED');}
export function review(c,infoId,op,edit={}){
 need(c.state==='HUMAN_REVIEW','只能在人工审核状态更改信息');need(c.batch.includes(infoId),'不属于当前审核批次');const i=c.information.find(x=>x.id===infoId);need(i,'信息不存在');const before=clone(i);
 if(op==='edit'){
  need(edit.content?.trim(),'内容不能为空');need(TYPES.includes(edit.type),'类型无效');
  if(edit.type==='FACT')need(i.type==='FACT'&&edit.content===i.content,'新增或修改的事实须先保留待验证；本地原型未实现独立事实核验');
  const refs=edit.conflicts||[];need(refs.every(r=>r!==i.id&&c.information.some(x=>x.id===r)),'冲突编号无效');
  const replaces=edit.replaces||[];need(replaces.every(r=>r!==i.id&&c.information.some(x=>x.id===r)),'取代编号无效');
  const att=attribute(edit.content.trim(),edit.type,i.ingestionContext);const override=att.suggestedType!==edit.type&&edit.type==='CUSTOMER_STATED';
  const original=attribute(i.rawContent??i.content,i.type,i.ingestionContext);
  const speakerConfirmed=!!edit.confirmSpeaker&&!!edit.speaker?.trim()&&speakerConfirmationEligible(i)&&edit.content.trim()===i.content&&i.sourceIds.every(id=>{const s=c.sources.find(s=>s.id===id);return s&&['CUSTOMER_RECORD','SIMULATED_VISIT'].includes(s.origin)&&s.content.includes(i.content);});
  need(edit.type!=='CUSTOMER_STATED'||speakerConfirmed||confirmedSpeaker(i)&&edit.content.trim()===i.content||(!override&&original.suggestedType==='CUSTOMER_STATED'&&i.sourceIds.every(id=>c.sources.find(s=>s.id===id)?.content.includes(edit.content.trim()))),'作者/内容来源冲突：人工备注不能把判断变成客户表达，请通过新拜访记录补充独立客户出处');
  const assertions=edit.confirmSemantic?assertionsForReview(edit.assertions):[];
  for(const a of assertions)for(const eid of [...a.contradicts,...a.supersedes])need(c.evidence.some(e=>e.evidence_id===eid&&e.information_id!==i.id&&e.target===a.target&&e.project_id===(i.project_id||c.sources.find(s=>s.id===i.sourceIds[0])?.project_id||null)),'反证/取代必须引用同客户同项目同命题的独立 Evidence');
  need(!assertions.some(a=>a.contradicts.length&&a.polarity!=='CONTRADICT'),'反证关联必须使用 CONTRADICT');
  i.rawContent??=before.content;i.suggestedType??=attribute(before.content,before.type).suggestedType;
  i.content=edit.content.trim();i.type=edit.type;i.conflicts=refs;i.status=refs.length?'CONFLICTED':'ACTIVE';i.replaces=replaces;i.reviewStatus='PENDING';i.finalType=null;i.revision++;
  if(speakerConfirmed)i.authorConfirmation={author:'CUSTOMER',speaker:edit.speaker.trim(),quote:i.content,sourceIds:[...i.sourceIds],confirmed:true,at:now()};
  i.attribution=att;i.conflictReason=speakerConfirmed?'原文未署名；人已核实原始出处与表达者，仍需接受本条信息':att.conflict;i.propositions=propositions(i.content);i.semanticVersion=SEMANTIC_VERSION;i.authorOverride=null;i.assertions=assertions;i.semanticReviewed=!!edit.confirmSemantic;i.authorshipReviewed=false;
 }else if(op==='accept'){const att=attribute(i.content,i.type,i.ingestionContext),raw=attribute(i.rawContent??i.content,i.type,i.ingestionContext);need(i.type!=='CUSTOMER_STATED'||((confirmedSpeaker(i)||att.suggestedType===i.type&&raw.suggestedType===i.type)&&!i.authorOverride&&i.sourceIds.every(id=>c.sources.find(s=>s.id===id)?.content.includes(i.content))),'客户表达存在作者或原始出处冲突，请标记待验证或补充独立记录');i.reviewStatus='CONFIRMED';i.finalType=i.type;i.authorshipReviewed=true;i.authorshipContent=i.content;}
 else if(op==='unknown'){i.type='UNVERIFIED';i.finalType='UNVERIFIED';i.reviewStatus='CONFIRMED';i.authorOverride=null;i.revision++;}
 else if(op==='delete'){i.status='RETRACTED';i.reviewStatus='CONFIRMED';i.revision++;}
 else throw Error('未知审核操作');
 syncEvidence(c);c.reviewRevision++;log(c,'信息审核',{op,before,after:i});
}
function snapshot(c){const {versions,...data}=c;return clone(data);}
function save(c){c.version++;c.draftVersion=c.version+1;c.saved=true;log(c,'保存版本',{version:c.version});c.versions.push({number:c.version,at:now(),snapshot:snapshot(c)});}
export function confirmBatch(c){
 need(c.state==='HUMAN_REVIEW','当前不是信息审核');need(c.batch.every(r=>c.information.find(i=>i.id===r).reviewStatus==='CONFIRMED'),'仍有信息待审核');
 for(const i of c.information.filter(x=>c.batch.includes(x.id)))for(const ref of i.conflicts){const other=c.information.find(x=>x.id===ref);if(other.status==='ACTIVE'){other.status='CONFLICTED';other.conflicts=[...new Set([...other.conflicts,i.id])];log(c,'人工标记冲突',{ids:[i.id,other.id]});}}
 for(const i of c.information.filter(x=>c.batch.includes(x.id)&&x.status==='ACTIVE'))for(const ref of i.replaces){const old=c.information.find(x=>x.id===ref);old.status='SUPERSEDED';old.revision++;log(c,'人工确认取代',{old:ref,new:i.id});}
 resolveEvidence(c);
 if(c.reviewContext==='INITIAL'){save(c);setState(c,'CUSTOMER_ANALYSIS');}
 else if(c.reviewContext==='POST_VISIT'){c.visitRecords.at(-1).reviewStatus='CONFIRMED';setState(c,'DEBRIEF');}
 else {c.assessment=[]; c.actions.forEach(a=>{if(a.status==='ACCEPTED')a.status='DRAFT';});setState(c,'CUSTOMER_ANALYSIS');}
 analyze(c);if(c.state==='DEBRIEF'){hypothesize(c);debrief(c);}log(c,'批次确认',{context:c.reviewContext,batch:c.batch});
}
export function correct(c,infoId){need(!['ROLEPLAY','HUMAN_REVIEW','EXTRACTION'].includes(c.state),'先完成当前步骤');const i=c.information.find(x=>x.id===infoId);need(i,'无此信息');c.resumeState=c.state;c.reviewContext='CORRECTION';c.batch=[infoId];i.reviewStatus='PENDING';setState(c,'HUMAN_REVIEW');log(c,'启动人工纠错',{infoId});}
export function analyze(c){const a=validateEvidence(c).available;const categories=[['客户背景',['institution','department']],['客户角色 / 组织结构',['role']],['当前设备 / 方案',['current','product']],['现状与客户表达',['statements']],['显性需求',['needs']],['已知问题 / 异议',['objections']],['决策链',['decision']],['竞争情况',['competition']]];
 c.customerUnderstanding=categories.map(([label,keys])=>({label,items:keys.includes('needs')?collect(a,'need').support:keys.includes('objections')?collect(a,'pain').support:a.filter(i=>keys.includes(i.category)),unknown:'未知，需向相关角色核实'}));
}
function evidence(c,key,items,target,strength,direction='支持'){
 const claim=c.hypotheses.find(h=>h.id===target)?.key||DIMENSION_TARGETS[DIMENSIONS.indexOf(target)];
 const objectIds=items.flatMap(i=>(i.validatedRelations||[]).filter(p=>p.usable&&p.target===claim).map(p=>p.evidence_id));
 let e={id:objectIds[0]||'',key,evidenceIds:[...new Set(objectIds)]};
 const relations=items.flatMap(i=>{const ps=trustedPropositions(i).filter(p=>p.target===(key==='purchase-immediate'?'equipment':claim));return (ps.length?ps:[{target:claim,polarity:'NEUTRAL',direction:'neutral'}]).map(p=>({...p,informationId:i.id,hypothesis_id:target.startsWith('H')?target:null}));});
 Object.assign(e,{target,customer_id:c.customerId,project_id:items[0]?.validationContext?.project_id||null,source_id:items[0]?.sourceIds[0]||null,information_type:[...new Set(items.map(i=>i.type))],informationIds:[...new Set(items.map(i=>i.id))],sourceIds:[...new Set(items.flatMap(i=>i.sourceIds))],relations,polarity:direction==='支持'?'SUPPORT':direction==='反对'?'CONTRADICT':'UNKNOWN',strength,direction,directness:strength==='medium'?'直接客户表达':'范围待核实',independence:'同源不累计',scope:c.caseType,semanticVersion:SEMANTIC_VERSION,reason:items.length?'仅支持此项主张；未进行独立核验':'缺少可用证据'});return e;
}
export function hypothesize(c){
 const a=validateEvidence(c).available;const defs=[{key:'need',target:'need',title:'客户希望改善当前使用或维护负担',verify:'客户是否希望改善？具体问题、影响和优先级是什么？'},{key:'purchase',target:'purchase',title:'客户考虑以设备更新解决问题',verify:'是否考虑更新？范围、参与者和下一项内部项目动作是什么？'}];
 for(const d of defs){let h=c.hypotheses.find(x=>x.key===d.key);if(!h){h={id:id(c,'H'),key:d.key};c.hypotheses.push(h);}const r=collect(a,d.target),pain=collect(a,'pain');
  const indirect=d.target==='need'?[...pain.support,...collect(a,'maintenanceTrend').support]:[];
  const pos=r.support.length,neg=r.oppose.length;
  const directDenial=neg>0;
  const state=pos&&neg?'支持与反证并存':neg?(directDenial?'已被否定':'有反证'):pos?'有支持证据':r.uncertain.length||indirect.length?'待验证':'证据不足';
  const level=pos||neg?'medium':indirect.length?'weak':'unknown';
  const es=[evidence(c,d.key,r.support,h.id,pos?'medium':'unknown','支持'),evidence(c,d.key+'-opposition',r.oppose,h.id,neg?'medium':'unknown','反对')];
  es[0].polarity='SUPPORT';es[1].polarity='CONTRADICT';
  h.polarity=pos&&neg?'MIXED':neg?'CONTRADICT':pos?'SUPPORT':'UNKNOWN';
  const ids=rows=>[...new Set(rows.flatMap(i=>trustedPropositions(i).filter(p=>p.target===d.target).map(p=>p.evidence_id)))];
  Object.assign(h,{evidenceState:pos&&neg?'MIXED':neg?'CONTRADICTED':pos?'SUPPORTED':'UNVERIFIED',SUPPORTING_EVIDENCE:ids(r.support),CONTRADICTING_EVIDENCE:ids(r.oppose),NEUTRAL_EVIDENCE:ids(r.neutral),UNKNOWN_EVIDENCE:ids(r.uncertain)});
  if(d.target==='need')es.push(evidence(c,d.key+'-indirect',indirect,h.id,indirect.length?'weak':'unknown','间接线索：不证明改善意愿'));
  if(d.target==='need'){const e=es.at(-1);e.polarity='SUPPORT';e.level='Problem Evidence';e.scope='仅支持可能存在改善问题，不确认客户改善诉求';e.relations=indirect.map(i=>({informationId:i.id,hypothesis_id:h.id,target:'possibleImprovementProblem',polarity:'SUPPORT',strength:'weak',scope:e.scope}));}
  if(d.target==='purchase'){
   const operational=collect(a,'equipment').support;
   const e=evidence(c,'purchase-immediate',operational,h.id,operational.length?'weak':'unknown','仅反驳立即更换必要性，不否定一般更新计划');
   e.polarity='CONTRADICT';e.scope='immediate-replacement';e.level='Problem Evidence';e.relations=e.relations.map(p=>({...p,target:'immediateReplacement',polarity:'CONTRADICT',direction:'oppose',strength:'weak',scope:e.scope}));es.push(e);
  }
  const all=[...new Set([...r.support,...r.oppose,...r.uncertain])];
  Object.assign(h,{title:d.title,type:'AI_INFERENCE',informationIds:all.map(i=>i.id),supportIds:r.support.map(i=>i.id),oppositionIds:r.oppose.map(i=>i.id),uncertainIds:r.uncertain.map(i=>i.id),neutralIds:r.neutral.map(i=>i.id),evidenceIds:es.map(e=>e.id),sourceIds:[...new Set(all.flatMap(i=>i.sourceIds))],strength:level,status:state,verify:d.verify,counter:neg?'存在明确反向客户表达，仅在该需求范围内成立；不表示没有任何业务问题。':'暂无明确反证；痛点不等于改善意愿，改善意愿不等于采购项目。',problem:pain.support.length?'存在客户报告的负担；严重程度尚未知':'具体问题和影响需核实',impact:'未确认影响程度或采购必要性',semanticVersion:SEMANTIC_VERSION});
 }
}
export function prepare(c){const p={id:id(c,'VP'),goal:'核实当前问题、影响和客户优先事项',questions:['目前具体是什么情况？','能否举一个最近的事件？','对工作安排造成什么影响？','最希望先改善哪一部分？','谁适合共同核实、后续流程如何？','是否愿意约定下一次核实？'],avoid:'暂不讨论未经核实的产品参数、适配、报价与采购承诺。',objection:'可能认为设备仍可用、无需先谈更新（AI_INFERENCE）',success:'确认具体问题和优先事项，准确记录后续是否获得同意',next:'争取与相关角色共同核实；对象及时间待客户确认',status:'DRAFT',beforeHypotheses:clone(c.hypotheses),basisVersion:c.version};c.visitPlans.push(p);}
export function advance(c){switch(c.state){case 'CUSTOMER_ANALYSIS':hypothesize(c);setState(c,'HYPOTHESIS');break;case 'HYPOTHESIS':prepare(c);setState(c,'VISIT_PREP');break;case 'DEBRIEF':checkOpportunity(c);setState(c,'OPPORTUNITY_CHECK');break;case 'OPPORTUNITY_CHECK':makeActions(c);setState(c,'ACTION_REVIEW');break;default:throw Error('当前步骤需要明确人工操作');}}
export function confirmPlan(c,values){need(c.state==='VISIT_PREP','不在计划审核');need(values.goal?.trim(),'请填写拜访目标');Object.assign(c.visitPlans.at(-1),values,{status:'CONFIRMED'});setState(c,'ROLEPLAY');}
export function startRoleplay(c,role,style){need(c.state==='ROLEPLAY'&&!c.roleplays.at(-1)?.running,'当前不可开始演练');const rp={id:id(c,'RP'),role,style,stage:c.opportunityStage?.stage??null,messages:[],running:true,score:null,context:roleContext(role,c.visitPlans.at(-1)?.goal,c.customerUnderstanding)};c.roleplays.push(rp);return rp;}
function ensureRoleContext(c,rp){if(!rp.context){rp.context=roleContext(rp.role,c.visitPlans.at(-1)?.goal,c.customerUnderstanding);rp.context.legacyTranscript=true;}}
export function chat(c,text,annotation={}){need(c.state==='ROLEPLAY','不在演练');const rp=c.roleplays.at(-1);need(rp?.running,'先开始演练');need(text.trim(),'请输入发言');ensureRoleContext(c,rp);const reply=respond(rp.context,text,rp.style,annotation);rp.messages.push({role:'sales',text},{role:'customer',text:reply});return rp;}
export function endRoleplay(c,skip=false){need(c.state==='ROLEPLAY','不在演练');let rp=c.roleplays.at(-1);if(skip&&!rp?.running){rp={id:id(c,'RP'),messages:[],running:false,skipped:true};c.roleplays.push(rp);}else{need(rp?.running,'没有进行中的演练');ensureRoleContext(c,rp);rp.running=false;rp.score=scoreContext(rp.context);rp.scoreScope=rp.context.legacyTranscript?'仅评分V1.1上下文建立后的轮次，旧对话未重评':'本次V1.1演练轮次';}setState(c,'VISIT_RECORD');}
export const demoVisit={caseType:'SIMULATED',date:'2026-09-15',participants:'销售、C01主任、C02设备管理联络人',statements:'主任表示目前设备仍可使用\n主任称科室尚未提出更新申请',needs:'主任希望优先减少维护协调负担',observations:'用户提供的模拟汇总记载7月维护2次\n用户提供的模拟汇总记载8月维护4次',objections:'主任暂时不希望先谈型号和报价',next:'三方同意9月22日用20分钟核实维护类型与影响；C02准备记录',judgment:'目前不能认定明确更新项目',unknown:'维护类型和实际影响程度未知',agreed:'yes'};
export function recordVisit(c,v){need(c.state==='VISIT_RECORD','当前不可提交拜访');need(v.caseType===c.caseType,'拜访案例性质必须与客户一致');need(v.date&&v.participants.trim(),'填写日期和参与者');need(['statements','needs','observations','judgment','unknown'].some(k=>v[k]?.trim()),'至少记录一项沟通内容');const vr={...v,id:id(c,'VR'),reviewStatus:'PENDING',informationIds:[]};c.visitRecords.push(vr);c.reviewContext='POST_VISIT';setState(c,'EXTRACTION');}
export function debrief(c){const old=c.versions.at(-1)?.snapshot;const latest=c.visitRecords.at(-1);const before=c.visitPlans.at(-1)?.beforeHypotheses||[];c.debrief={newIds:c.information.filter(i=>!old?.information.some(o=>o.id===i.id)).map(i=>i.id),changed:c.information.filter(i=>{const o=old?.information.find(o=>o.id===i.id);return o&&(o.content!==i.content||o.status!==i.status||o.type!==i.type);}).map(i=>i.id),hypotheses:c.hypotheses.map(h=>({id:h.id,before:before.find(b=>b.id===h.id)?.strength||'unknown',after:h.strength,status:h.status})),needs:collect(validateEvidence(c).available,'need').support.map(i=>i.id),denied:c.hypotheses.filter(h=>h.status==='已被否定').map(h=>h.id),mixed:c.hypotheses.filter(h=>h.status==='支持与反证并存').map(h=>h.id),unknown:c.information.filter(i=>i.type==='UNVERIFIED'&&i.status==='ACTIVE').map(i=>i.id),relationship:latest?.agreed==='yes'?'记录中报告客户同意后续动作；不等于购买意向':'未获得明确后续同意记录',good:'已保留表达、判断和出处供逐项审核；不据此评价完整谈话表现。',problem:'具体影响、相关权限及项目动作仍需核实；简要记录不足以评价语气。',priority:'核实问题与实际影响，明确客户希望优先改善什么。'};}
function usableEvidence(c){return validateEvidence(c).available;}
function explainStages(c,validation,evaluation,previous){
 const actual=transitionExplanation(validation,evaluation,previous,evaluation.stage,STAGE_RULES[evaluation.stage].required,CONDITION_LABELS);
 actual.kind='RECALCULATION';actual.reason=evaluation.why;
 const prior=previous>evaluation.stage?transitionExplanation(validation,evaluation,previous,previous,STAGE_RULES[previous].required,CONDITION_LABELS):null;
 actual.failedPriorConditions=prior?.conditions.filter(k=>!k.met)||[];
 if(prior){const failed=new Set(actual.failedPriorConditions.map(k=>k.target));const lost=prior.evidence.filter(e=>e.relations.some(p=>failed.has(p.target)));actual.evidence=[...actual.evidence,...lost.filter(e=>!actual.evidence.some(a=>a.information_id===e.information_id))];actual.reason+=' 原阶段条件失效：'+actual.failedPriorConditions.map(k=>k.label).join('、')+'；按当前有效 Evidence 重新计算。';}
 const next=evaluation.stage<6?transitionExplanation(validation,evaluation,evaluation.stage,evaluation.stage+1,STAGE_RULES[evaluation.stage+1].required,CONDITION_LABELS):null;
 if(next)next.kind='NEXT_STAGE_CHECK';
 return [actual,...(next?[next]:[])];
}
export function checkOpportunity(c){
 hypothesize(c);
 const a=usableEvidence(c);c.assessment=dimensionRelations(a).map((r,n)=>{const items=[...new Set([...r.support,...r.oppose,...r.uncertain])];const e=evidence(c,'dimension'+n,items,DIMENSIONS[n],r.strength,r.status==='明确否定'?'反对':r.status==='冲突'?'混合':r.status==='未知'?'未知':'支持');e.reason=r.gap;e.relations=items.flatMap(i=>trustedPropositions(i).filter(p=>p.target===r.target).map(p=>({...p,informationId:i.id})));return {label:DIMENSIONS[n],status:r.status,informationIds:items.map(i=>i.id),supportIds:r.support.map(i=>i.id),oppositionIds:r.oppose.map(i=>i.id),evidenceId:e.id,strength:r.strength,gap:r.gap};});
 const validation=validateEvidence(c),evaluation=stageEvaluation(a),previous=c.opportunityStage?.stage??0;
 c.opportunityStage={...evaluation,customer_id:c.customerId,project_id:validation.project_id,validation:validation.entries,transitions:explainStages(c,validation,evaluation,previous),basisVersion:c.version,reviewRevision:c.reviewRevision,mode:'MOCK_VALIDATED_GATES',semanticVersion:SEMANTIC_VERSION};
 log(c,'阶段跳转审计',c.opportunityStage.transitions[0]);
}
export function makeActions(c){c.actions=c.actions.filter(a=>a.status!=='DRAFT');const refs=active(c).filter(i=>['needs','next','statements'].includes(i.category)).map(i=>i.id);for(const [title,purpose] of [['整理核实清单','确认问题类型、影响与优先级'],['争取与相关角色进一步讨论','核实处理方式与下一项内部动作']])c.actions.push({id:id(c,'A'),title,purpose,target:c.intake.role||'相关角色待确认',time:'待销售确定',timeType:'AI建议',basis:refs,expected:'明确一项信息缺口及后续是否获得同意',status:'DRAFT',round:c.version+1});}
export const STAGE_REQUIREMENTS=STAGE_RULES.map(r=>r.required.map(t=>DIMENSION_TARGETS.indexOf(t)).filter(n=>n>=0));
export function manualAssessment(c,rows,stage,why,nextGap,outcome){
 need(c.state==='OPPORTUNITY_CHECK','先进入商机证据检查');need(Number.isInteger(stage)&&stage>=0&&stage<=6,'阶段无效');need(why.trim()&&nextGap.trim(),'填写当前阶段依据与下一阶段缺口');
 const available=usableEvidence(c);
 need(rows.length===10,'必须检查十个维度');
 rows=clone(rows);
 for(let n=0;n<rows.length;n++){const r=rows[n];need(['有支持','明确否定','未知','冲突'].includes(r.status)&&STRENGTHS.includes(r.strength),'评级无效');need(r.informationIds.every(id=>available.some(i=>i.id===id)),'只能引用已审核有效的事实或客户表达');if(r.status==='有支持'||r.status==='明确否定')need(r.informationIds.length>0&&r.strength!=='unknown','支持或否定结论必须有证据与评级');if(r.status==='未知'){r.strength='unknown';need(r.informationIds.every(id=>trustedPropositions(available.find(i=>i.id===id)).some(p=>p.target===DIMENSION_TARGETS[n])),'证据存在，但与当前维度不匹配');}else validateDimension(available,r,n);}
 const evaluation=stageEvaluation(available);need(evaluation.eligible[stage],`${STAGE_ZH[stage]}门槛不满足：证据需要与项目范围、参与者、内部动作及当前阶段相关`);
 const requiredTargets=STAGE_RULES[stage].required;for(let n=0;n<rows.length;n++)if(requiredTargets.includes(DIMENSION_TARGETS[n]))need(rows[n].status==='有支持',`${DIMENSIONS[n]}尚未人工确认支持，不可用于该阶段`);
 if(stage===6)need(outcome===evaluation.outcome,'所选结局与已核验结果不一致');
 for(let n=0;n<rows.length;n++){const r=rows[n];const e=evidence(c,'dimension'+n,r.informationIds.map(id=>available.find(i=>i.id===id)),DIMENSIONS[n],r.strength,r.status==='明确否定'?'反对':'支持');r.evidenceId=e.id;r.label=DIMENSIONS[n];e.reason='销售人工复核：'+r.gap;}
 const selectedConditions=STAGE_RULES[stage].required;const selectedRefs=selectedConditions.flatMap(t=>t==='contact'?available.filter(i=>i.type==='CUSTOMER_STATED').map(i=>i.id):t==='verifiedOutcome'?evaluation.supportIds:collect(available,t).support.map(i=>i.id));
 const validation=validateEvidence(c);
 c.assessment=rows;c.opportunityStage={...evaluation,customer_id:c.customerId,project_id:validation.project_id,validation:validation.entries,transitions:explainStages(c,validation,{...evaluation,stage,why},c.opportunityStage?.stage??0),stage,why,nextGap,largestGap:nextGap,supportIds:[...new Set(selectedRefs)],strength:stage===0?'unknown':stage===6?'strong':'medium',outcome:stage===6?outcome:'未结局',mode:'HUMAN_REVIEW',semanticVersion:SEMANTIC_VERSION,basisVersion:c.version,reviewRevision:c.reviewRevision};log(c,'阶段跳转审计',c.opportunityStage.transitions[0]);log(c,'人工商机证据复核',{stage,why,rows});
}
export function reviewAction(c,aid,op,values){need(c.state==='ACTION_REVIEW','当前不在行动审核');const a=c.actions.find(a=>a.id===aid);need(a&&a.round===c.version+1,'不是本轮行动');if(op==='edit'){need(values.title?.trim(),'动作不能为空');Object.assign(a,values,{status:'MODIFIED'});}else a.status=op==='accept'?'ACCEPTED':'REJECTED';log(c,'行动审核',{id:aid,op,action:a});}
export function confirmActions(c){need(c.state==='ACTION_REVIEW','当前不是行动审核');need(c.actions.filter(a=>a.round===c.version+1).every(a=>['ACCEPTED','REJECTED'].includes(a.status)),'请逐项审核行动，修改后需再次接受');setState(c,'VERSION_SAVE');}
export function validate(c){need(!c.information.some(i=>i.reviewStatus==='PENDING'),'还有待审核信息');for(const i of c.information){need(TYPES.includes(i.type),'信息类型无效');need(i.sourceIds.every(r=>c.sources.some(s=>s.id===r&&!['ROLEPLAY','AI_GENERATED'].includes(s.origin))),'信息存在无效或演练来源');}for(const e of c.evidence){need(e.informationIds.every(r=>c.information.some(i=>i.id===r)),'证据信息引用丢失');need(e.sourceIds.every(r=>c.sources.some(s=>s.id===r)),'来源丢失');}return true;}
export function saveVersion(c){need(c.state==='VERSION_SAVE'&&!c.saved,'需完成行动审核，且当前版本未保存');need(c.opportunityStage?.semanticVersion===SEMANTIC_VERSION&&c.opportunityStage.reviewRevision===c.reviewRevision,'商机结论已过期；请从信息台账重新确认语义并完成商机检查');need(c.actions.filter(a=>a.round===c.version+1).every(a=>['ACCEPTED','REJECTED'].includes(a.status)),'行动尚未确认');resolveEvidence(c);validate(c);save(c);}
export function nextRound(c){need(c.state==='VERSION_SAVE'&&c.saved,'先保存当前版本');c.reviewContext='INITIAL';c.batch=[];setState(c,'CUSTOMER_ANALYSIS');analyze(c);}
