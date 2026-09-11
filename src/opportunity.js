import {collect,relationState,relationStrength,DIMENSION_TARGETS,trustedPropositions} from './semantics.js';
export const STAGE_RULES=[
 {label:'仅线索',required:[]},
 {label:'初步接触',required:['contact']},
 {label:'需求确认',required:['need']},
 {label:'项目识别',required:['purchase','scope','participants','internalAction']},
 {label:'采购推进',required:['purchase','scope','participants','internalAction','procurementStarted','process','decision','procurementTime']},
 {label:'商务 / 方案',required:['purchase','scope','participants','internalAction','solutionRequested']},
 {label:'成交 / 失单',required:['verifiedOutcome']}
];
export const CONDITION_LABELS={contact:'相关双向客户沟通',need:'客户明确改善诉求（无未解决反证）',purchase:'具体采购或更新意向',scope:'项目范围或明确采购对象',participants:'与项目相关的参与者',internalAction:'内部项目评估或申请动作',procurementStarted:'采购程序已实际启动',process:'本项目采购路径',decision:'相关采购权限与职责',procurementTime:'采购节点（不是会面日期）',solutionRequested:'与已识别项目相关的方案或商务动作',verifiedOutcome:'可核验成交或失单结果'};
export function dimensionRelations(information){return DIMENSION_TARGETS.map((target,n)=>{
 const r=collect(information,target),status=relationState(r);const strength=status==='冲突'?'unknown':relationStrength(r);
 const gap=n===1?'客户报告的问题不等于影响程度已确认；严重程度、采购必要性仍未知':n===3?'核实采购节点，会面时间不作为采购时间':n===9?'区分主动发起、预约与已经实际投入':status==='冲突'?'支持与反证并存，须人工澄清或明确取代旧信息':status==='明确否定'?'仅否定本维度；不推断其他业务问题不存在':status==='有支持'?'保留来源范围与时效；不向其他维度传递强度':'没有能直接支持此维度的已确认命题';
 return {target,...r,status,strength,gap};
});}
export function stageEvaluation(information){
 const relations={};for(const target of new Set(STAGE_RULES.flatMap(r=>r.required).filter(t=>!['contact','verifiedOutcome'].includes(t))))relations[target]=collect(information,target);
 const met={},refs={};
 const contacts=collect(information,'contact').support;met.contact=contacts.length>0;refs.contact=contacts.map(i=>i.id);
 for(const [target,r] of Object.entries(relations)){met[target]=r.support.length>0&&r.oppose.length===0;refs[target]=r.support.map(i=>i.id);}
 const wins=collect(information.filter(i=>i.type==='FACT'),'won'),losses=collect(information.filter(i=>i.type==='FACT'),'lost');
 met.verifiedOutcome=((wins.support.length>0)!==(losses.support.length>0))&&!wins.oppose.length&&!losses.oppose.length;refs.verifiedOutcome=[...wins.support,...losses.support].map(i=>i.id);
 const eligible=STAGE_RULES.map(r=>r.required.every(k=>met[k]));let stage=0;for(let n=1;n<=6;n++)if(eligible[n])stage=n;
 const conditions=STAGE_RULES[stage].required;const missing=stage===6?[]:STAGE_RULES[stage+1].required.filter(k=>!met[k]).map(k=>CONDITION_LABELS[k]);
 return {stage,outcome:stage===6?(wins.support.length?'成交':'失单'):'未结局',eligible,met,conditions:conditions.map(k=>({name:CONDITION_LABELS[k],informationIds:refs[k]})),supportIds:[...new Set(conditions.flatMap(k=>refs[k]))],strength:stage===0?'unknown':stage===6?'strong':'medium',why:stage===0?'只有线索，未得到可用于本轮判断的有效沟通命题':`已满足：${conditions.map(k=>CONDITION_LABELS[k]).join('、')}。`,missingConditions:missing,nextGap:stage===6?'已为结果阶段，下一阶段不适用':missing.length?`缺少：${missing.join('、')}。`:'下一阶段条件可供重新审核',largestGap:missing[0]||'结果适用范围及来源继续保留'};
}
export function validateDimension(information,row,n){
 const known=new Map(information.map(i=>[i.id,i]));const target=DIMENSION_TARGETS[n];
 const support=[],oppose=[];
 for(const ref of row.informationIds){const info=known.get(ref);if(!info)throw Error('只能引用已审核有效且来源一致的事实或客户表达');const props=trustedPropositions(info).filter(p=>p.target===target);
  if(info.validatedProjectId&&info.validationContext?.project_id&&info.validatedProjectId!==info.validationContext.project_id)throw Error(`${ref}：project_id 不一致（${info.validatedProjectId} → ${info.validationContext.project_id}），不能跨项目引用`);
  if(!props.some(p=>['support','oppose'].includes(p.direction)))throw Error(`${ref}：证据存在，但与当前维度不匹配，或确定性不足`);
  if(props.some(p=>p.direction==='support'))support.push(ref);if(props.some(p=>p.direction==='oppose'))oppose.push(ref);
 }
 const all=collect(information,target);if(row.status==='有支持'&&(!support.length||oppose.length||all.oppose.length))throw Error('支持证据不足或存在反证，不能确认该维度为有支持');
 if(row.status==='明确否定'&&(!oppose.length||support.length||all.support.length))throw Error('反证不足或与支持证据并存，须保留冲突');
 if(row.status==='冲突'&&!(all.support.length&&all.oppose.length))throw Error('尚未提供同维度的支持与反向证据');
 if(row.strength==='strong'&&row.informationIds.some(id=>known.get(id).type!=='FACT'))throw Error('客户转述不能仅靠手工选择提升为strong；需要对应已核验事实');
 return true;
}
