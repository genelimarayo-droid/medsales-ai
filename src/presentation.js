// Read-only projection: presentation must never invent customer evidence.
export function customerSummary(c) {
 const stage=c.opportunityStage;
 return {
  caseLabel:c.caseType==='SIMULATED'?'SIMULATION':'真实脱敏案例',
  project:c.project_id||c.intake?.project_id||'项目尚未确认',
  stage:stage?.stage??null,
  evidenceCount:(c.evidence||[]).filter(e=>e.evidence_id&&e.validity==='VALID'&&e.customer_id===c.customerId).length,
  openCount:(c.information||[]).filter(i=>i.status==='ACTIVE'&&(i.type==='UNVERIFIED'||i.reviewStatus!=='CONFIRMED')).length,
  insight:stage?.largestGap||stage?.nextGap||'尚未完成商机证据检查，当前缺口待核实。',
  next:(c.actions||[]).find(a=>a.round===c.draftVersion&&['DRAFT','MODIFIED','ACCEPTED'].includes(a.status))?.title||'完成当前步骤的人工审核。'
 };
}
