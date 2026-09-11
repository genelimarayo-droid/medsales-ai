// Explicit structured mock fixtures, not expectations of automatic NLP.
export const project=[
 {text:'客户表示计划更新监护仪',target:'purchase',polarity:'SUPPORT'},
 {text:'客户表示项目范围为ICU监护设备',target:'scope',polarity:'SUPPORT',scopeValue:'ICU监护设备'},
 {text:'客户表示项目参与者包括科室与设备科',target:'participants',polarity:'SUPPORT'},
 {text:'客户表示科室将提交更新申请',target:'internalAction',polarity:'SUPPORT'}
];
export const procurement=[
 {text:'采购流程已经启动。',target:'procurementStarted',polarity:'SUPPORT'},
 {text:'客户表示采购流程为科室提出再由设备科审核',target:'process',polarity:'SUPPORT'},
 {text:'客户表示由院内授权委员会最终批准',target:'decision',polarity:'SUPPORT'},
 {text:'客户表示采购时间定于2027年6月',target:'procurementTime',polarity:'SUPPORT'}
];
export const correction={text:'之前说采购已经启动是不准确的。',target:'procurementStarted',polarity:'CONTRADICT'};
export const clean=s=>s.replace(/[。；;]+$/,'');
