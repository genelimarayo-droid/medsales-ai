// Scripted scenario state, isolated from customer evidence. This is a local mock,
// not a general-purpose semantic model or a validated sales assessment engine.
import {evidenceObject,validBehavior} from './evidence.js';
import {maintenanceFrames} from './maintenance-frames.js';
export {maintenanceFrames};
const copy=x=>JSON.parse(JSON.stringify(x));
const maintenanceFacts={
 responseTime:{value:null,dimension:'maintenance_response_time',unit:'duration',detail:'从报修到维修人员响应需要多长时间，目前没有统计，需要核实报修和响应时间记录。',status:'UNKNOWN'},
 frequency:{value:null,dimension:'failure_frequency',unit:'count/period',detail:'我还没有统计，具体多久一次需要看维护记录，不能给出准确频率。',status:'UNKNOWN'}
};
export const BEHAVIORS={UNREVIEWED:'尚未结构化评价',VERIFY_GAP:'识别具体证据缺口并提出验证',DISTINGUISH:'明确区分判断与事实，保留不确定性',UNSUPPORTED_CERTAINTY:'无依据确定性断言 / 把判断当事实',UPDATE_JUDGMENT:'根据客户回答更新判断',NEED_EXPLORE:'探索需求与具体影响',OPEN_QUESTION:'开放式澄清问题',FOLLOW_UP:'依据上一回答继续追问',NEXT_STEP:'提出需客户确认的下一步',NEUTRAL:'无可评分行为'};
export function roleContext(role,goal,customerState){
 const facts={
  maintenance:{value:'维修响应与到场协调',detail:'主要是工程师到场时间和科室使用时间需要协调，并不是每次都能直接衔接。',status:'SIMULATED'},
  coordination:{value:'需要沟通到场与使用安排',detail:'最近讨论的主要环节是确认到场时间，再和科室的使用安排对齐；具体涉及人员我还没整理。',status:'SIMULATED'},
  handling:{value:'先核实问题并协调现有安排',detail:'目前先核实具体问题，再协调维修和使用安排。哪种处理方式更合适还要看记录，不能直接认定需要换设备。',status:'SIMULATED'},
  participants:{value:null,detail:'后续评估的参与人员还没有确认。可以先核实设备管理相关人员是否适合参加；这不等于已经确定采购决策人。',status:'UNKNOWN'},
  ...copy(maintenanceFacts),
  impact:{value:'协调占用精力',detail:'协调维修会分散一些精力，具体占用多少时间还没有统计。',status:'SIMULATED'},
  usage:{value:'需要核实使用安排',detail:'到场安排和使用时间对不上时，需要重新协调使用安排；有没有实际停机要核实记录。',status:'SIMULATED'},
  need:{value:'先澄清现有问题',detail:'我希望先把现在使用和维护上的问题弄清楚，再看合适的处理方式。',status:'SIMULATED'},
  purchase:{value:null,detail:'目前还没有确定更新计划，主要还是先解决现在使用和维护上的问题。',status:'UNKNOWN'},
  discussion:{value:null,detail:'是否已经有正式的内部项目讨论，我目前没有可以确认的信息。',status:'UNKNOWN'},
  budget:{value:null,detail:'预算尚未确认，我没有可以提供的金额或获批信息。',status:'UNKNOWN'},
  decision:{value:null,detail:'最终决策人和各自权限尚未确认，不能把我的科室岗位当作最终采购权限。',status:'UNKNOWN'},
  process:{value:null,detail:'这个事项对应的采购流程尚未核实，我不能把一般流程当作本项目流程。',status:'UNKNOWN'},
  timeline:{value:null,detail:'采购时间节点还没有确定，不能承诺今年更换。',status:'UNKNOWN'},
  competition:{value:null,detail:'有没有其他参评厂商，我没有确认过。',status:'UNKNOWN'},
  next:{value:'愿意先看核实清单',detail:'可以先把需要核实的事项列给我看，是否再安排讨论、谁参加和时间都需要另行确认。',status:'SIMULATED'}
 };
 return {role,goal,currentCustomerState:copy(customerState),topic:null,questions:[],disclosed:[],undisclosed:Object.keys(facts),scenarioFacts:facts,turns:[],scenarioType:'SIMULATED',mode:'MOCK_CONTEXT_V1.1'};
}

// Intent frames combine question form, predicate and object; follow-up questions
// resolve against the last disclosed topic rather than hitting a keyword reply.
export function speechFrame(text,context){
 const clauses=text.split(/[。；;\n，,]|但是|不过|然而/).map(s=>s.trim()).filter(Boolean);
 const question=/[?？]|吗[，。\s]*$|(?:有没有|是否|能否|可否|是不是|哪些|哪类|哪一类|哪个|哪位|谁|何时|多久|多少|什么|怎样|如何|怎么)|(?:可以|方便).{0,30}(?:一起|下次|确认|核实)/.test(text);
 const proposal=/(?:能否|可否|可以|方便|是否愿意|我先|我们先).{0,30}(?:下次|再和|清单|一起核实|一起讨论|一起确认|安排.{0,8}讨论)/.test(text);
 const measurementTopics=[...new Set(maintenanceFrames(text,context.topic).map(f=>f.topic))];
 let topic=null;
 if(proposal)topic='next';
 else if(/(?:预算|经费|资金).{0,12}(?:确定|确认|批准|多少|安排|有|吗|？)|(?:有无|有没有).{0,8}(?:预算|经费)/.test(text))topic='budget';
 else if(/(?:采购|审批).{0,5}流程|(?:流程).{0,5}(?:如何|是什么|明确)/.test(text))topic='process';
 else if(/(?:谁|哪位).{0,20}(?:决策|批准|评估)|(?:决策人|审批人|权限).{0,12}(?:确认|确定|是|谁|吗)/.test(text))topic='decision';
 else if(/(?:采购|更新|更换).{0,12}(?:日期|时间|节点)|(?:今年|明年).{0,10}(?:更换|采购|更新)/.test(text))topic='timeline';
 else if(/(?:内部|项目).{0,10}(?:讨论|评估过)|(?:讨论过|立项)/.test(text))topic='discussion';
 else if(/(?:设备|监护仪).{0,6}(?:更新|更换|采购)计划|(?:更新|更换|采购).{0,10}(?:计划|需求|设备|监护仪)|(?:计划|准备|打算).{0,10}(?:更新|更换|采购)/.test(text))topic='purchase';
 else if(/(?:哪家|哪些|有没有|是否).{0,12}(?:厂商|品牌|竞争)|竞争对手/.test(text))topic='competition';
 else if(measurementTopics.length===1)topic=measurementTopics[0];
 else if(/(?:影响|衔接).{0,15}(?:使用|安排)|(?:使用安排|停机)/.test(text))topic='usage';
 else if(/(?:影响|负担|占用.{0,6}时间|分散精力)/.test(text))topic='impact';
 else if(/(?:希望|优先|最想).{0,12}(?:改善|解决|处理)|(?:需求).{0,8}(?:是什么|哪些)/.test(text))topic='need';
 else if(/(?:协调).{0,10}(?:谁|哪些人|环节|人员)|(?:最近一次|具体).{0,12}(?:协调|到场)/.test(text))topic='coordination';
 else if(/(?:哪类|哪一类|哪些|什么|主要|最近).{0,16}(?:维护|维修|问题)|(?:维护|维修).{0,16}(?:问题|情况|类型|哪些)/.test(text))topic='maintenance';
 else if(context.topic&&/(?:这种情况|这件事|具体|然后呢|还有呢|为什么)/.test(text))topic=context.topic;
 if(!proposal&&/(?:考虑|打算|准备).{0,12}(?:更新|更换|采购)/.test(text)&&!/(?:今年|明年|时间|日期|谁|流程)/.test(text))topic='purchase';
 if(!proposal&&/(?:谁|哪些人|哪些角色|哪个部门).{0,12}(?:参与|评估)|(?:参与|评估).{0,12}(?:谁|哪些人|哪个部门)/.test(text)&&!/(?:最终|决策|审批|批准|权限)/.test(text))topic='participants';
 if(!proposal&&/(?:怎么|如何).{0,8}(?:处理|解决|应对)|(?:处理|解决).{0,8}(?:方式|办法)/.test(text)&&!/(?:采购|审批)流程/.test(text))topic='handling';
 if(measurementTopics.length>1)topic=null;
 const hazards=[];
 for(const clause of clauses){
  const disavow=/(?:不能|不应|不要|避免|不可以|没有依据.{0,3})(?:.{0,6})(?:说|认为|断言|视为|当成|跳过|确认)|不能确定|尚未确认|未确认|还没确认|没有确认/.test(clause);
  const asks=/[?？]|是否|有没有|吗\s*$/.test(clause);
  const conditional=/^(?:如果|假如|假设|例如|反例)/.test(clause);
  if(disavow||conditional)continue;
  const skip=/(?:无需|不用|不必|不需要|别再|跳过).{0,4}(?:核实|验证|确认)/.test(clause);
  const budgetClaim=!asks&&/(?:预算|经费).{0,5}(?:已|已经).{0,3}(?:确认|获批|确定)|(?:已|已经)(?:确认|确定|批准).{0,5}(?:预算|经费)/.test(clause);
  const certainty=!asks&&/(?:一定|肯定|必然|保证|确定).{0,8}(?:采购|购买|更换|更新)|今年.{0,5}(?:一定|肯定).{0,5}(?:采购|购买)/.test(clause);
  const assumptionAsAction=!asks&&/(?:直接|可以|就).{0,10}(?:按|按照).{0,15}(?:采购|购买|更换).{0,8}(?:准备|执行|推进)|(?:应该|已经|已|确定).{0,6}(?:进入|处于).{0,6}(?:采购阶段|招采阶段|采购流程)/.test(clause);
  if(skip)hazards.push({kind:'skipVerification',span:clause,reason:'明确跳过验证，不能因出现“核实”一词得分。'});
  if(budgetClaim&&!context.disclosed.some(d=>d.topic==='budget'&&d.status!=='UNKNOWN'))hazards.push({kind:'unsupportedBudget',span:clause,reason:'未经证据支持，直接将预算视为已确认。'});
  if(certainty&&!context.disclosed.some(d=>d.topic==='purchase'&&d.status!=='UNKNOWN'))hazards.push({kind:'unsupportedPurchase',span:clause,reason:'未经证据支持，将采购意向或时间视为已确认，并使用确定性销售判断。'});
  if(assumptionAsAction&&!context.disclosed.some(d=>d.topic==='purchase'&&d.status!=='UNKNOWN'))hazards.push({kind:'inferenceAsFact',span:clause,reason:'将感觉、兴趣或未核实预算作为采购推进依据；销售判断不等于客户事实。'});
  if(!asks&&/(?:您|客户|主任).{0,6}(?:刚才说|已经说|已经确认|明确表示).{0,15}(?:采购|预算|更换)/.test(clause)&&(!context.disclosed.some(d=>['purchase','budget'].includes(d.topic)&&d.status!=='UNKNOWN')))hazards.push({kind:'inventedCustomerStatement',span:clause,reason:'把客户尚未披露的预算或采购结论归为客户表达。'});
 }
 const acknowledgedUnknown=/(?:预算|时间|计划|权限).{0,14}(?:不能确认|尚未确认|还没确认|未核实|未知)|(?:不能确认|尚未确认|还没确认).{0,12}(?:预算|时间|计划|权限|是否采购)/.test(text);
 const verificationPlan=/(?:先|会|建议|需要).{0,8}(?:核实|验证|确认).{0,20}(?:流程|负责人|预算|时间|权限|具体问题)/.test(text);
 const verifyBeforeConclusion=/(?:先|首先).{0,8}(?:确认|核实|验证).{0,22}(?:问题|情况|影响).{0,8}(?:再|然后).{0,8}(?:判断|确认).{0,15}(?:是否|有没有).{0,10}(?:需求|更新|采购)/.test(text);
 const distinction=acknowledgedUnknown&&verificationPlan||verifyBeforeConclusion||/(?:只是|属于|这是).{0,10}(?:判断|推测|假设)|(?:不能|不应|不要|避免).{0,8}(?:把|将).{0,16}(?:当成|视为)|(?:尚未|没有).{0,6}(?:确认|核实)/.test(text);
 const openQuestion=question&&/(?:什么|哪些|哪类|哪一类|如何|怎么|多久|多少|哪个|具体)/.test(text);
 const last=context.turns.at(-1);const followUp=question&&context.disclosed.length>0&&(context.topic===topic||(['coordination','frequency','impact','usage','need'].includes(topic)&&['maintenance','coordination','frequency','impact','usage','need'].includes(context.topic)))&&last?.text!==text;
 return {text,topic,question,openQuestion,proposal,followUp,distinction,hazards,recognized:!!topic};
}
export function respond(context,text,style,annotation={}){
 if(annotation.claim_type&&!Object.hasOwn(BEHAVIORS,annotation.claim_type))throw Error('无效行为类型');
 const frame=speechFrame(text,context);let reply;const oldTopic=context.topic;
 if(frame.hazards.length){reply='这些预算或采购结论我没有确认，请先把已知信息和您的判断分开，我们仍需要核实。';}
 else if(!frame.question&&!frame.proposal){reply='我听到了您的看法。您希望具体核实什么？我还不能确认采购方向。';}
 else if(!frame.topic){reply='我没确定您指的是维护、需求还是项目流程，能把要核实的事项再说具体一点吗？';}
 else {
  const fact=context.scenarioFacts[frame.topic]||maintenanceFacts[frame.topic];const prior=context.disclosed.find(d=>d.topic===frame.topic);
  reply=fact.detail;
  if(prior)reply=fact.status==='UNKNOWN'?'这项仍然未知，前面没有获得新的核实材料，不能补出结论。':`刚才提到的是${fact.value}。更具体的程度和范围尚未统计，需要核实记录。`;
  if(!prior){context.disclosed.push({topic:frame.topic,value:fact.value,status:fact.status,span:fact.detail,turn:context.turns.length+1});context.undisclosed=context.undisclosed.filter(t=>t!==frame.topic);}
  context.topic=frame.topic;
 }
 if(style==='追问依据'&&!frame.hazards.length&&frame.topic==='purchase')reply+=' 您为什么现在考虑更新这个方向？';
 if(['医生','设备科','采购','管理人员'].includes(context.role)&&frame.topic==='decision')reply+=' 我的岗位不等于最终决策权限。';
 if(frame.question)context.questions.push({text,topic:frame.topic});
 const claim=annotation.reviewed?annotation.claim_type||'UNREVIEWED':'UNREVIEWED';
 const evidence=evidenceObject('RP-E'+(context.turns.length+1),{content:text,author:'SALES',source:['TURN-'+(context.turns.length+1)],semantic_role:'SALES_INFERENCE',polarity:claim==='UNSUPPORTED_CERTAINTY'?'CONTRADICT':claim==='UNREVIEWED'?'UNKNOWN':claim==='NEUTRAL'?'NEUTRAL':'SUPPORT',validity:claim==='UNREVIEWED'?'UNVERIFIED':'VALID',strength:claim==='UNREVIEWED'?'unknown':'medium',claim_type:claim,scope:'ROLEPLAY_ONLY',annotationMode:'HUMAN_STRUCTURED_MOCK'});
 context.behaviorEvidence??=[];context.behaviorEvidence.push(evidence);
 context.turns.push({...frame,previousTopic:oldTopic,reply,evidence_id:evidence.evidence_id});return reply;
}
export function scoreContext(context){
 const all=context.behaviorEvidence||[],valid=all.filter(validBehavior);
 const has=t=>valid.some(e=>e.claim_type===t),bad=valid.filter(e=>e.claim_type==='UNSUPPORTED_CERTAINTY');
 const incomplete=all.length!==context.turns.length||valid.length!==all.length||!all.length;
 const dimensions={seekEvidence:has('VERIFY_GAP'),distinguishFact:has('DISTINGUISH'),inferenceAsFact:!!bad.length,respectUncertainty:has('DISTINGUISH')&&!bad.length,updateJudgment:has('UPDATE_JUDGMENT')};
 return [['需求探索','NEED_EXPLORE'],['提问质量（澄清）','OPEN_QUESTION'],['证据意识',null],['回应质量','FOLLOW_UP'],['下一步推进','NEXT_STEP']].map(([label,type])=>{
  let value=incomplete?null:has(type)?1:0;
  if(label==='证据意识')value=bad.length?0:incomplete?null:dimensions.seekEvidence&&dimensions.distinguishFact?2:dimensions.seekEvidence||dimensions.distinguishFact?1:0;
  if(label==='回应质量'&&!incomplete&&has('UPDATE_JUDGMENT')&&has('FOLLOW_UP'))value=2;
  if(label==='回应质量'&&bad.length)value=Math.min(value??0,1);
  const used=label==='证据意识'?valid:valid.filter(e=>e.claim_type===type||label==='回应质量'&&e.claim_type==='UPDATE_JUDGMENT');
  const basis=(incomplete?'存在未结构化确认的发言，完整行为无法评价。 ':'')+(bad.length&&label==='证据意识'?'未经证据支持的确定性断言，整轮证据意识为 0。 ':'')+used.map(e=>`${e.evidence_id}：${BEHAVIORS[e.claim_type]}`).join('；');
  return {label,value,basis:basis||'未观察到已确认的对应行为',evidenceIds:used.map(e=>e.evidence_id),dimensions,mode:'HUMAN_STRUCTURED_MOCK',eventCount:used.length};
 });
}
