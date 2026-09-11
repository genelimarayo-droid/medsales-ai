// Bounded local language adapter. Unrecognized or ambiguous clauses produce no
// positive evidence; business gates consume typed propositions, never field names.
export const SEMANTIC_VERSION='1.1-r5-structured';
import {maintenanceFrames} from './maintenance-frames.js';
const CUSTOMER=/^(?:(?:客户|主任|医生|采购人员|设备科(?:人员)?|院方|科室|三方|双方|C\d+)[：:，\s]*(?:明确)?(?:说|表示|称|提出|希望|要求|确认|同意|介绍|决定|计划|已|目前|想|：|:)|客户[：:])/;
const PERSONAL='我(?:猜|认为|判断|觉得|感觉|估计|预计)';
const SALES=new RegExp('^(?:销售(?:人员)?(?:判断|认为|估计|表示|备注|总结)?[：:]?|人工备注[：:]?|备注[：:]?|'+PERSONAL+')');
const AI=/^(?:AI|系统)(?:判断|推测|认为|生成|建议|总结)/i;
const AUTHOR_SWITCH=new RegExp('(?:[，,]\\s*(?:所以|因此)?\\s*|(?:所以|因此)\\s*)(?=(?:'+PERSONAL+'|销售(?:判断|认为|备注|总结)|人工备注|AI(?:判断|推测|总结)|系统(?:判断|推测|总结)|备注[：:]|(?:客户|主任)(?:表示|说|暂时|不考虑)|应该|可能|看起来))');
const UNCERTAINTY=/可能|应该|估计|预计|猜测|推测|我觉得|我认为|一定会采购/;
export function attribute(content,fieldType,context={}){
 const text=content.trim();const explicit=text.match(/^(AI_INFERENCE|SALES_INFERENCE|CUSTOMER_STATED|UNVERIFIED)(?:\s*[：:/-]|\s+)/)?.[1];
 const body=explicit?text.replace(/^[A-Z_]+\s*[：:/-]?\s*/,''):text;
 const labels=text.match(/(?:AI_INFERENCE|SALES_INFERENCE|CUSTOMER_STATED|UNVERIFIED)(?=\s*[：:/-])/g)||[];
 const mixed=body.split(AUTHOR_SWITCH).length>1;
 const conflict= new Set(labels).size>1 || mixed || (explicit==='CUSTOMER_STATED'&&(/^(?:AI|销售|备注|总结|建议|假设)[：:\s判断推测认为]*|^我(?:猜|认为|判断|觉得)/.test(body)||!CUSTOMER.test(body)));
 if(conflict)return {suggestedType:'UNVERIFIED',reason:'作者、标签或混合叙述冲突，须拆分原始出处',conflict:'作者冲突：不能用标签或人工备注替代客户原话',author:'UNKNOWN',semantic_role:'MIXED_OR_CONFLICTED'};
 let type,reason='';
 if(explicit){type=explicit;reason=`原文声明 ${explicit}，不得被录入栏位覆盖`;}
 else if(AI.test(text)){type='AI_INFERENCE';reason='原文明确归属于AI或系统';}
 else if(SALES.test(text)||/^备注[：:]/.test(text)){type='SALES_INFERENCE';reason='销售判断或备注，不是客户表达';}
 else if(CUSTOMER.test(text)||/^(?:客户|主任)(?:觉得|感觉|不希望|不考虑|不需要|不打算|暂时不)/.test(text)){type='CUSTOMER_STATED';reason='有明确客户归属；表达内容的真实性和确定性另行判断';}
 else if(fieldType==='FACT'){type='FACT';reason='原始模拟设定；仅在模拟案例内成立';}
 else if(['AI_INFERENCE','SALES_INFERENCE'].includes(fieldType)){type=fieldType;reason='输入明确处于判断栏，保留判断作者';}
 else if(context.declaredAuthor==='CUSTOMER'&&!UNCERTAINTY.test(text)){type='CUSTOMER_STATED';reason='原始录入明确为客户表达；归属来自上下文，语义命题仍须审核';}
 else {type='UNVERIFIED';reason=UNCERTAINTY.test(text)?'含不确定判断且作者不明，请确认谁说的':'无法确认表达作者或客观真实性，请人工核实';}
 if(explicit==='CUSTOMER_STATED'&&SALES.test(text.replace(/^CUSTOMER_STATED\s*[：:]\s*/,''))){type='UNVERIFIED';reason='客户标签与第一人称销售判断冲突，需要澄清作者';}
 return {suggestedType:type,reason,conflict:type!==fieldType?`录入栏建议 ${fieldType}，原文归属建议 ${type}。${reason}`:'',author:type==='CUSTOMER_STATED'?'CUSTOMER':type==='SALES_INFERENCE'?'SALES':type==='AI_INFERENCE'?'AI':'UNKNOWN',semantic_role:type==='CUSTOMER_STATED'?'REPORTED_CUSTOMER_SPEECH':type==='FACT'?'CASE_FACT':type!=='UNVERIFIED'||/^(?:应该|可能|看起来|估计|感觉)/.test(body)?'INFERENCE':'UNATTRIBUTED_STATEMENT'};
}

// Split only explicit author switches. Keep the complete original in Source.
export function informationClauses(text){
 return String(text||'').split(/[\n。；;]+/).flatMap(line=>line.split(AUTHOR_SWITCH)).flatMap(line=>{
  const parts=line.split(/[，,]/),frames=maintenanceFrames(line);
  // Preserve author scope; only separate independently quantified dimensions.
  if(attribute(line,'CUSTOMER_STATED',{declaredAuthor:'CUSTOMER'}).suggestedType==='CUSTOMER_STATED'&&parts.length===2&&frames.length===2&&frames.every(f=>f.quantity!==null)&&frames[0].dimension!==frames[1].dimension)return parts;
  return [line];
 }).map(s=>s.trim()).filter(Boolean);
}

// Each rule describes a subject/predicate relationship and its scope. Topics alone
// (e.g. a bare "预算") are deliberately not propositions.
const RULES=[
 {target:'equipment',predicate:'operational',positive:/(?:设备|监护仪|系统|机器).{0,12}(?:正常使用|仍可使用|还能用|可正常运行)/},
 {target:'maintenanceTrend',predicate:'maintenanceIncrease',positive:/(?:维护|维修)(?:次数|频率).{0,10}(?:增加|增多|上升|比以前多)/},
 {target:'need',dimension:0,predicate:'improvement',positive:/(?:希望|想要|需要|要求|优先|先)(?:.{0,8})(?:改善|减少|解决|降低|优化|弄清楚)(?:.{0,30})/,negative:/(?:没有|无|不需要|不想|暂无|不打算)(?:任何|明确|实际|当前|改善|解决|处理|.{0,3}){0,3}(?:改善需求|改善|解决需求|解决问题)|没有.{0,5}需求/,scope:'improvement'},
 {target:'pain',dimension:1,predicate:'burden',positive:/(?:协调|维修|维护|处理|等待|停机|安排).{0,18}(?:分散精力|占用.{0,6}(?:精力|时间)|耗费.{0,6}(?:精力|时间)|影响.{0,10}(?:工作|安排|使用)|增加.{0,5}负担)|(?:工程师|维修人员).{0,8}(?:不能|无法|未能)及时到|(?:响应|等待)时间.{0,6}(?:长|久)/,negative:/(?:没有|不会|并不|未).{0,4}(?:影响|占用|增加负担|分散精力)/},
 {target:'purchase',dimension:2,predicate:'purchaseIntent',positive:/(?:计划|准备|打算|决定|希望|需要|启动|拟)(?:.{0,8})(?:采购|购置|更换|更新)(?:.{0,16})(?:设备|监护仪|系统|项目)|(?:设备|监护仪).{0,5}(?:更新|采购)计划.{0,5}(?:确定|批准)/,negative:/(?:没有|暂无|无|不需要|不打算|未考虑|不准备).{0,7}(?:更换|采购|更新|购置)(?:.{0,5})(?:需求|计划|设备|监护仪)?/,scope:'purchase'},
 {target:'procurementTime',dimension:3,predicate:'procurementDate',positive:/(?:采购|交付|招标|购置|更新)(?:日期|时间|节点|安排)?(?:为|在|定于|确定为|计划于|于|是).{0,8}(?:\d{1,4}[年/月日]|今年|明年|季度)|(?:今年|明年|\d{1,4}月).{0,5}(?:完成采购|启动招标|交付)/},
 {target:'budget',dimension:4,predicate:'funding',positive:/(?:预算|经费|资金)(?:已|已经)?(?:批准|获批|落实|确认|安排|申请)|(?:预算|经费)(?:为|是|有|约|额度).{0,4}\d+|(?:已|已经)(?:确认|批准|申请).{0,5}(?:预算|经费)/,negative:/(?:预算|经费|资金).{0,5}(?:未批准|未获批|被否决)|(?:没有|无).{0,3}(?:预算|经费)/},
 {target:'decision',dimension:5,predicate:'authority',positive:/(?:由|交由).{1,14}(?:最终批准|最终决策|审批采购|批准采购)|(?:最终决策人|最终审批人|采购批准人)(?:是|为|：|:).{1,12}/},
 {target:'process',dimension:6,predicate:'procurementPath',positive:/(?:采购流程|审批流程)(?:是|为|包括|分为|：|:).{4,60}|采购.{0,5}(?:先|需经).{1,20}(?:再|然后|后).{1,20}/},
 {target:'competition',dimension:7,predicate:'competitor',positive:/(?:参评厂商|竞争对手|参与竞标的厂商)(?:是|为|有|包括|：|:).{1,25}/},
 {target:'next',dimension:8,predicate:'agreedAction',positive:/(?:同意|约定|确认).{0,35}(?:核实|讨论|会面|沟通|提供|准备|发送|安排)/,negative:/(?:不同意|拒绝|未同意).{0,20}(?:核实|讨论|会面|安排|提供)/},
 {target:'timeInvestment',dimension:9,predicate:'actualInvestment',positive:/(?:客户|主任|医生|院方).{0,8}(?:主动发起|主动安排|已参加|已经参加|已提供|已经提供|已准备).{1,30}/},
 {target:'scope',predicate:'projectScope',positive:/(?:项目范围|更新范围|采购范围|改善项目范围)(?:是|为|：|:|包括).{2,40}|(?:采购|更新|更换)\s*\d+\s*(?:台|套).{1,15}/},
 {target:'participants',predicate:'projectParticipants',positive:/(?:项目参与者|评估参与者|参与评估的人员)(?:是|为|包括|：|:).{2,40}|由.{1,20}(?:共同评估|参与评估)/},
 {target:'internalAction',predicate:'projectAction',positive:/(?:科室|院方|设备科|内部|项目组).{0,12}(?:已|已经|将|定于).{0,15}(?:提交更新申请|提交采购申请|召开评估会|评估更新方案|进行项目评估|安排项目评估)/},
 {target:'procurementStarted',predicate:'procedureStarted',positive:/(?:采购程序|招标程序|采购流程)(?:已经|已)(?:启动|开始)|(?:招标公告|采购公告)(?:已|已经)发布/,negative:/(?:采购程序|招标程序|采购流程|招采流程).{0,12}(?:尚未|还没|没有|未|没).{0,3}(?:启动|开始)|(?:招标公告|采购公告).{0,8}(?:尚未|未|没有).{0,3}发布/},
 {target:'solutionRequested',predicate:'projectSolution',positive:/(?:客户|主任|院方|采购人员).{0,12}(?:要求|邀请|已参与|已启动).{0,15}(?:该项目|本项目|已立项项目).{0,15}(?:方案评估|正式报价|商务讨论|方案讨论)/},
 {target:'won',predicate:'verifiedWin',positive:/(?:采购合同|订单)(?:已经|已)(?:签订|签署|生效)|(?:中标通知书)(?:已|已经)(?:收到|签发)/},
 {target:'lost',predicate:'verifiedLoss',positive:/(?:失单结果|落标通知)(?:已经|已)(?:确认|收到)|(?:客户|院方).{0,6}明确确认.{0,10}选择其他供应商/}
];
const MODAL=/可能|应该|预计|估计|也许|大概|建议|预测|推测|据说|听说|传闻|看起来|感觉|如果|假如|假设|假想|假定|例如|举例|倘若|一旦|尚未明确|尚未确认|尚未确定|还没确定|不确定|尚不清楚|未知|需要.{0,3}确认|需.{0,3}核实/;
const QUESTION=/[？?]|是否|有没有|能否|是不是|谁说|哪里说|何曾|吗\s*$/;
function polarity(clause,rule){
 if(/(?:说法|消息|结论|判断).{0,5}(?:未证实|未经证实|待核实)/.test(clause))return 'unknown';
 if(/(?:说法|消息|结论|判断).{0,5}(?:不属实|不实|不正确|错误|不成立)|(?:不觉得|不认为|谈不上|别再说|不要说|否认).{0,20}(?:需要|希望|计划|准备|已经|已启动)/.test(clause))return 'oppose';
 if(QUESTION.test(clause)||MODAL.test(clause)||/不是没有|并非没有|不能说没有|(?:没有|缺乏|尚无).{0,6}(?:证据|依据)|(?:没有|暂无|尚无).{0,3}(?:明确|确认).{0,8}(?:预算|计划)|没有.{0,5}(?:预算|计划).{0,4}(?:信息|资料)/.test(clause))return 'unknown';
 if(rule.negative?.test(clause))return 'oppose';
 if(rule.target==='need'&&/(?:不希望|不愿|并非需要|不考虑|不打算|不想).{0,12}(?:改善|减少|解决|优化)/.test(clause))return 'oppose';
 if(rule.target==='purchase'&&/(?:不考虑|不希望|不愿|不打算|不准备|不需要|并非计划).{0,12}(?:采购|更换|更新|购置)/.test(clause))return 'oppose';
 if(/(?:未|没有|尚未|还没|并不|不再).{0,6}(?:确认|批准|启动|准备|计划|同意|要求|希望|签署|发布|参加|提供)/.test(clause))return 'unknown';
 return 'support';
}
export function propositions(content){
 const clauses=String(content).split(/[。；;\n，,]|但是|不过|然而|但/).map(s=>s.trim()).filter(Boolean);const out=[];
 const conditional=/如果|假如|假设|假想|假定|例如|举例|倘若|一旦/.test(content);
 for(const clause of clauses){for(const rule of RULES){
  const deniedNeed=rule.target==='need'&&/(?:不希望|不愿|并非需要|不考虑|不打算|不想).{0,12}(?:改善|减少|解决|优化)/.test(clause);
  const deniedPurchase=rule.target==='purchase'&&/(?:不考虑|不希望|不愿|不打算|不准备|不需要|并非计划).{0,12}(?:采购|更换|更新|购置)/.test(clause);
  const burden=rule.target==='pain'&&/(?:维护|维修|协调).{0,12}(?:麻烦|影响.{0,5}(?:效率|工作))/.test(clause);
  const outcomeInvalid=['won','lost'].includes(rule.target)&&/(?:合同|订单|通知|结果).{0,8}(?:失效|撤销|作废|解除)/.test(clause);
  if(!rule.positive.test(clause)&&!rule.negative?.test(clause)&&!deniedNeed&&!deniedPurchase&&!burden&&!outcomeInvalid)continue;
  // Purchase denial is not a denial of all improvement needs or of a pain point.
  if(rule.target==='need'&&/(?:更换|采购|更新|购置)/.test(clause)&&!/(?:改善|减少|解决|降低|优化)/.test(clause))continue;
  let direction=conditional?'unknown':outcomeInvalid?'oppose':polarity(clause,rule);
  if(rule.target==='procurementTime'&&!/\d{1,4}[年/月日]|[一二三四1-4]季度/.test(clause))direction='unknown';
  out.push({target:rule.target,dimension:rule.dimension??null,predicate:rule.predicate,direction,polarity:{support:'SUPPORT',oppose:'CONTRADICT',unknown:'UNKNOWN'}[direction],certainty:direction==='unknown'?'UNRESOLVED':'ASSERTED',level:['pain','equipment','maintenanceTrend'].includes(rule.target)?'Problem Evidence':rule.target==='need'?'Need Evidence':['purchase','scope','participants','internalAction'].includes(rule.target)?'Project Evidence':'Procurement Evidence',span:clause,scope:rule.scope||rule.target,parserVersion:SEMANTIC_VERSION});
 }}
 return out;
}
export function attributionConsistent(info){
 if(info.reviewStatus!=='CONFIRMED'||info.status!=='ACTIVE'||!['FACT','CUSTOMER_STATED'].includes(info.type))return false;
 if(info.authorOverride)return false;
 return !!info.authorshipReviewed&&info.authorshipContent===info.content;
}
export function speakerConfirmationEligible(info){
 const raw=info.rawContent??info.content,att=attribute(raw,'UNVERIFIED');
 return info.content===raw&&att.suggestedType==='UNVERIFIED'&&att.semantic_role==='UNATTRIBUTED_STATEMENT'&&['statements','needs','current','objections','next','unknown','history'].includes(info.category);
}
export function confirmedSpeaker(info){
 const a=info.authorConfirmation;
 return !!(a?.confirmed&&a.author==='CUSTOMER'&&a.speaker?.trim()&&a.quote===info.content&&a.quote===(info.rawContent??info.content)&&JSON.stringify(a.sourceIds)===JSON.stringify(info.sourceIds)&&speakerConfirmationEligible(info));
}
export function trustedPropositions(info){
 return info.validatedRelations?.filter(p=>p.usable)||[];
}
export function relation(info,target){return trustedPropositions(info).filter(p=>p.target===target);}
export const DIMENSION_TARGETS=['need','pain','purchase','procurementTime','budget','decision','process','competition','next','timeInvestment'];
export function collect(information,target){
 const support=[],oppose=[],uncertain=[],neutral=[];
 for(const i of information){const all=trustedPropositions(i),p=all.filter(p=>p.target===target);if(p.some(x=>x.direction==='support'))support.push(i);if(p.some(x=>x.direction==='oppose'))oppose.push(i);if(p.some(x=>x.direction==='unknown'))uncertain.push(i);if(p.some(x=>x.direction==='neutral')||!p.length&&all.length)neutral.push(i);}
 return {support,oppose,uncertain,neutral};
}
export function relationState(r){return r.support.length&&r.oppose.length?'冲突':r.support.length?'有支持':r.oppose.length?'明确否定':'未知';}
export function relationStrength(r){return r.support.length||r.oppose.length?'medium':'unknown';}

// Ingestion-only scope proposal. A downstream scope gate still requires a
// separate human-reviewed scope Evidence Object.
export function projectBinding(source){
 const departments=text=>[...new Set(text.match(/ICU|急诊|检验|影像|手术室|麻醉/gi)||[])].map(x=>x.toUpperCase());
 const products=text=>[...new Set((text.match(/监护仪|监护设备|CT设备|CT|超声|检验设备/gi)||[]).map(x=>/监护/.test(x)?'监护':x.toUpperCase()))];
 const clauses=informationClauses(source.content);
 const scopes=clauses.filter(t=>attribute(t,'CUSTOMER_STATED').suggestedType==='CUSTOMER_STATED'&&propositions(t).some(p=>p.target==='scope'&&p.direction==='support'));
 const values=[...new Set(scopes.map(t=>t.match(/(?:项目范围|更新范围|采购范围)(?:是|为|：|:|包括)\s*([^，,。；;]+)/)?.[1]?.trim()).filter(Boolean))];
 const ds=departments(source.content),ps=products(source.content);
 if(ds.length>1||ps.length>1||values.length!==1)return {id:null,reason:'来源缺少唯一明确项目范围，或包含不同科室/设备项目'};
 const scope=values[0];
 if(!departments(scope).length&&!products(scope).length)return {id:null,reason:'项目范围尚不能定位设备或科室'};
 return {id:source.project_id||'source:'+(source.customer_id||'legacy')+':'+source.id+':'+scope,scope,reason:'同一原始来源的明确项目范围；相同范围不自动合并不同来源的项目'};
}
