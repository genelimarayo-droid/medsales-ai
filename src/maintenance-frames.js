// Unit and event-bound frames are ingestion/roleplay candidates, never customer evidence.
export function maintenanceFrames(text,previousTopic=null){
 return text.split(/[，,。；;\n]/).filter(Boolean).flatMap(span=>{
  const responseEvent=/(?:报修|维修人员|工程师|维修|维护).*(?:响应|到场|到达)|响应(?:时间|时长|需要)/.test(span);
  const failureEvent=/(?:故障|发生|频次|频率)/.test(span);
  const duration=span.match(/(\d+(?:\.\d+)?)\s*(小时|分钟|天)/);
  const count=span.match(/(\d+)\s*次/);
  const period=span.match(/(?:每|这个|本|一)(?:个)?(月|周|天)/)?.[1];
  const recurrence=/(?:频次|频率|几次|多少次|多久(?:发生)?一次|多长时间发生)/.test(span)||!!(count&&failureEvent);
  const elapsed=!!duration||/(?:多久|多长时间|时长|几小时|几分钟)/.test(span);
  const frames=[];
  if(recurrence&&(failureEvent||previousTopic==='frequency'||previousTopic==='maintenance'))frames.push({topic:'frequency',dimension:'failure_frequency',quantity:count?Number(count[1]):null,unit:'count',period:({月:'month',周:'week',天:'day'})[period]||null,span});
  if(elapsed&&!recurrence&&(responseEvent||previousTopic==='responseTime'))frames.push({topic:'responseTime',dimension:'maintenance_response_time',quantity:duration?Number(duration[1]):null,unit:({小时:'hours',分钟:'minutes',天:'days'})[duration?.[2]]||null,period:null,span});
  return frames;
 });
}
