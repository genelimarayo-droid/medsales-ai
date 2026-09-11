// Natural language is confined to ingestion proposals. Only human-reviewed
// structured assertions enter this module; no downstream text classification.
export const TARGETS={contact:'客户沟通',equipment:'设备正常使用',maintenanceTrend:'维护频率增加',pain:'维护/使用痛点',need:'改善维护或使用负担的需求',purchase:'设备采购/更新意向',immediateReplacement:'立即更换必要性',scope:'项目范围',participants:'项目参与者',internalAction:'内部项目动作',procurementStarted:'采购程序实际启动',procurementTime:'采购时间节点',budget:'预算/资金',decision:'最终采购权限',process:'采购流程',competition:'竞争情况',next:'下一步约定',timeInvestment:'客户实际时间投入',solutionRequested:'正式方案/商务动作',won:'成交结果',lost:'失单结果',unknown:'尚未确定命题'};
export const POLARITIES=['SUPPORT','CONTRADICT','NEUTRAL','UNKNOWN'];
export const AUTHORS=['CUSTOMER','SALES','AI','SYSTEM','UNKNOWN'];
export const ROLES=['FACT','CUSTOMER_STATEMENT','SALES_INFERENCE','AI_INFERENCE','OBSERVATION','UNVERIFIED'];
export const VALIDITIES=['VALID','INVALIDATED','SUPERSEDED','UNVERIFIED'];
const clone=x=>JSON.parse(JSON.stringify(x));
export function evidenceObject(evidence_id,fields={}){
 return {id:evidence_id,evidence_id,content:'',author:'UNKNOWN',source:[],semantic_role:'UNVERIFIED',polarity:'UNKNOWN',validity:'UNVERIFIED',strength:'unknown',project_id:null,created_at:new Date().toISOString(),contradicts:[],supersedes:[],...fields};
}
export function validBehavior(e){return !!e.evidence_id&&e.author==='SALES'&&e.semantic_role==='SALES_INFERENCE'&&e.validity==='VALID'&&e.scope==='ROLEPLAY_ONLY'&&Array.isArray(e.source)&&e.source.length>0&&e.strength==='medium'&&Number.isFinite(Date.parse(e.created_at));}
const roleOf=i=>({FACT:'FACT',CUSTOMER_STATED:'CUSTOMER_STATEMENT',SALES_INFERENCE:'SALES_INFERENCE',AI_INFERENCE:'AI_INFERENCE'})[i.type]||(i.category==='observations'?'OBSERVATION':'UNVERIFIED');
export const direction=p=>({SUPPORT:'support',CONTRADICT:'oppose',NEUTRAL:'neutral',UNKNOWN:'unknown'})[p];
export function assertionsForReview(rows){
 if(!Array.isArray(rows)||!rows.length)throw Error('请明确命题方向；无法判断可选择 unknown / UNKNOWN');
 return rows.map(r=>{
  if(!Object.hasOwn(TARGETS,r.target)||!POLARITIES.includes(r.polarity))throw Error('无效结构化命题或方向');
  if(r.target==='unknown'&&r.polarity!=='UNKNOWN')throw Error('未知命题不能支持或否定业务判断');
  if(r.target==='scope'&&r.polarity==='SUPPORT'&&!String(r.scopeValue||'').trim())throw Error('请明确项目范围值');
  return {target:r.target,polarity:r.polarity,scopeValue:String(r.scopeValue||'').trim(),contradicts:[...new Set(r.contradicts||[])],supersedes:[...new Set(r.supersedes||[])]};
 });
}
export function syncEvidence(c){
 c.evidence??=[];
 // Legacy summaries have no authority. Preserve them for export/history only.
 for(const e of c.evidence)if(!e.evidence_id)e.legacySummary=true;
 for(const i of c.information){
  const assertions=i.semanticReviewed?i.assertions:[{target:'unknown',polarity:'UNKNOWN'}];
  const rows=[...(assertions||[]),...(i.type==='CUSTOMER_STATED'?[{target:'contact',polarity:'SUPPORT'}]:[])];
  rows.forEach((a,n)=>{
   const key=`${i.id}:${i.revision}:${n}`;let e=c.evidence.find(e=>e.objectKey===key);
   if(!e){c.idCounters.E=(c.idCounters.E||0)+1;const id='E'+String(c.idCounters.E).padStart(2,'0');e=evidenceObject(id,{objectKey:key});c.evidence.push(e);}
   Object.assign(e,{content:i.content,author:i.authorConfirmation?.author||i.attribution?.author||'UNKNOWN',source:[...i.sourceIds],semantic_role:roleOf(i),polarity:a.polarity,strength:i.type==='FACT'?'strong':i.type==='CUSTOMER_STATED'?'medium':'unknown',project_id:i.project_id||c.sources.find(s=>s.id===i.sourceIds[0])?.project_id||null,information_id:i.id,informationIds:[i.id],sourceIds:[...i.sourceIds],information_type:i.type,customer_id:c.customerId,revision:i.revision,time:i.time,target:a.target,scopeValue:a.scopeValue||'',contradicts:[...(a.contradicts||[])],supersedes:[...(a.supersedes||[])],declaredContradicts:[...(a.contradicts||[])],declaredSupersedes:[...(a.supersedes||[])],reviewed:!!i.semanticReviewed,authorshipReviewed:!!i.authorshipReviewed,level:a.target==='contact'?'Contact Evidence':a.target==='unknown'?'Unverified Evidence':['pain','equipment','maintenanceTrend','immediateReplacement'].includes(a.target)?'Problem Evidence':a.target==='need'?'Need Evidence':['purchase','scope','participants','internalAction'].includes(a.target)?'Project Evidence':'Procurement Evidence'});
  });
 }
 return c.evidence.filter(e=>e.evidence_id);
}
export function resolveEvidence(c){
 const objects=syncEvidence(c);const project=c.project_id||c.intake?.project_id||null;
 const resolved=objects.map(original=>{
  const e=clone(original),i=c.information.find(i=>i.id===e.information_id),sources=e.source.map(id=>c.sources.find(s=>s.id===id));
  if(e.semantic_role==='FACT')e.author='SYSTEM';
  delete e.invalidated_by;delete e.superseded_by;
  e.checks={author:!!i?.authorshipReviewed&&i.authorshipContent===e.content&&e.authorshipReviewed&&['CUSTOMER','SYSTEM'].includes(e.author),source:sources.length>0&&sources.every(s=>s&&s.caseType===c.caseType&&!['ROLEPLAY','AI_GENERATED','PRODUCT_MATERIAL'].includes(s.origin)&&s.content.includes(e.content)&&s.content.includes(i?.rawContent||e.content)),type:['FACT','CUSTOMER_STATEMENT'].includes(e.semantic_role),customer:e.customer_id===c.customerId&&i?.customer_id===c.customerId&&sources.every(s=>s&&s.customer_id===c.customerId),current:i?.status==='ACTIVE'&&i.reviewStatus==='CONFIRMED'&&!(i.conflicts||[]).length&&i.revision===e.revision&&i.content===e.content&&i.introducedVersion<=c.version+1,time:!!e.time&&Number.isFinite(Date.parse(e.time))&&sources.every(s=>s?.date===e.time),strength:['strong','medium'].includes(e.strength)&&(e.semantic_role!=='FACT'||sources.every(s=>s?.verification==='CONTENT_CHECKED')),semantic:e.target==='contact'||e.reviewed};
  e.validity=Object.values(e.checks).every(Boolean)?'VALID':i?.status==='SUPERSEDED'||i?.revision!==e.revision?'SUPERSEDED':i?.status==='RETRACTED'?'INVALIDATED':'UNVERIFIED';
  return e;
 });
 const candidates=resolved.filter(e=>e.validity==='VALID');
 for(const e of candidates)for(const o of candidates)if(o.evidence_id!==e.evidence_id&&o.customer_id===e.customer_id&&o.project_id===e.project_id&&o.target===e.target&&o.time>=e.time&&o.declaredSupersedes.includes(e.evidence_id)){e.validity='SUPERSEDED';e.superseded_by=[o.evidence_id];}
 const active=resolved.filter(e=>e.validity==='VALID');
 for(const e of resolved){
  if(e.validity!=='VALID')continue;
  const same=other=>other.customer_id===e.customer_id&&other.project_id===e.project_id&&other.target===e.target;
  // Procurement corrections remove support from the current set. Need opinions
  // coexist as MIXED unless the reviewer explicitly resolves an earlier claim.
  const opposites=active.filter(o=>o.polarity==='CONTRADICT'&&same(o)&&o.evidence_id!==e.evidence_id);
  if(e.polarity==='SUPPORT')for(const o of opposites){
   if(e.target==='procurementStarted'||o.declaredContradicts.includes(e.evidence_id)){
    o.contradicts=[...new Set([...o.contradicts,e.evidence_id])];e.validity='INVALIDATED';e.invalidated_by=[...new Set([...(e.invalidated_by||[]),o.evidence_id])];
   }
  }
 }
 for(const e of resolved)Object.assign(objects.find(o=>o.evidence_id===e.evidence_id),e);
 return {project_id:project,objects:resolved};
}
