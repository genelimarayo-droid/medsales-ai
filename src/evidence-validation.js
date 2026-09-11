import {collect} from './semantics.js';
import {resolveEvidence,direction} from './evidence.js';

export const PROJECT_TARGETS=new Set(['purchase','scope','participants','internalAction','budget','procurementTime','decision','process','competition','procurementStarted','solutionRequested','won','lost']);
export function validateEvidence(customer){
 const resolved=resolveEvidence(customer),objects=resolved.objects;
 const candidates=[...new Set(objects.filter(e=>e.validity==='VALID'&&e.target==='scope'&&e.polarity==='SUPPORT').map(e=>e.project_id).filter(Boolean))];
 const projectId=resolved.project_id||(candidates.length===1?candidates[0]:null);
 const entries=customer.information.map(info=>{
  const evidence=objects.filter(e=>e.information_id===info.id&&e.revision===info.revision);
  const project=evidence[0]?.project_id||null;
  const scopes=[...new Set(objects.filter(e=>e.validity==='VALID'&&e.project_id===project&&e.target==='scope'&&e.polarity==='SUPPORT').map(e=>e.scopeValue).filter(Boolean))];
  const checks={...(evidence[0]?.checks||{}),project:!!projectId&&project===projectId&&scopes.length===1};
  const baseValid=evidence.some(e=>['VALID','INVALIDATED'].includes(e.validity));
  const foreign=!!project&&!!projectId&&project!==projectId;
  return {information_id:info.id,customer_id:customer.customerId,project_id:project,source_id:info.sourceIds[0]||null,sourceIds:info.sourceIds,information_type:info.type,author:evidence[0]?.author||'UNKNOWN',time:info.time,checks,baseValid,issues:Object.entries(checks).filter(([,ok])=>!ok).map(([k])=>k),relations:evidence.map(e=>({...e,direction:direction(e.polarity),span:e.content,usable:e.validity==='VALID'&&!foreign&&(!PROJECT_TARGETS.has(e.target)||checks.project||(!project&&e.polarity!=='SUPPORT')),verificationStatus:e.validity==='INVALIDATED'?'CONTRADICTED':e.validity!=='VALID'?'UNVERIFIED':e.polarity==='CONTRADICT'?'CURRENT_COUNTEREVIDENCE':'CURRENT',contradictedBy:(e.invalidated_by||[]).map(id=>{const o=objects.find(o=>o.evidence_id===id);return {evidence_id:id,informationId:o?.information_id,time:o?.time};})}))};
 });
 const byId=new Map(entries.map(e=>[e.information_id,e]));
 const available=customer.information.filter(i=>byId.get(i.id).baseValid).map(i=>({...i,validatedProjectId:byId.get(i.id).project_id,validatedRelations:byId.get(i.id).relations,validationContext:{customer_id:customer.customerId,project_id:projectId}}));
 return {project_id:projectId,customer_id:customer.customerId,entries,available,objects};
}

export function transitionExplanation(validation,evaluation,currentStage,targetStage,required,labels){
 const conditions=required.map(target=>{
  const r=collect(validation.available,target);
  const met=target==='verifiedOutcome'?evaluation.met.verifiedOutcome:target==='contact'?evaluation.met.contact:r.support.length>0&&!r.oppose.length;
  const ids=target==='contact'?validation.available.filter(i=>i.type==='CUSTOMER_STATED').map(i=>i.id):target==='verifiedOutcome'?evaluation.supportIds:[...r.support,...r.oppose,...r.uncertain].map(i=>i.id);
  const triggerIds=met?(target==='contact'?ids:target==='verifiedOutcome'?evaluation.supportIds:r.support.map(i=>i.id)):[];
  return {target,label:labels[target],met,informationIds:[...new Set(ids)],triggerIds:[...new Set(triggerIds)],evidenceIds:validation.objects.filter(e=>ids.includes(e.information_id)&&e.target===target).map(e=>e.evidence_id),oppositionIds:r.oppose.map(i=>i.id)};
 });
 const evidence=validation.entries.filter(e=>e.relations.some(p=>required.includes(p.target)||required.includes('verifiedOutcome')&&['won','lost'].includes(p.target))).map(e=>({...e,issues:e.issues.filter(k=>k!=='project'||required.some(t=>PROJECT_TARGETS.has(t)||t==='verifiedOutcome')),relations:e.relations}));
 const triggerIds=[...new Set(conditions.flatMap(k=>k.triggerIds))];
 return {at:new Date().toISOString(),currentStage,targetStage,project_id:validation.project_id,conditions,triggerIds,decision:!evaluation.eligible[targetStage]?'DENY':targetStage<currentStage?'DOWNGRADE':'ALLOW',allowed:!!evaluation.eligible[targetStage],conclusion:evaluation.eligible[targetStage]?'允许按当前有效证据确定该阶段':'不允许升级：不是没有信息，而是当前信息不足以满足该阶段的业务门槛。',evidence:evidence.map(e=>({...e,trigger:triggerIds.includes(e.information_id),relations:e.relations.filter(p=>required.includes(p.target)||required.includes('verifiedOutcome')&&['won','lost'].includes(p.target))}))};
}
