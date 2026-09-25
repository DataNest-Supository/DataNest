const stopWords=new Set([
  "the","a","an","and","or","to","of","for","in","on","with","is","be","as"
]);

export function normalizeTrendTokens(value:string):string[] {
  return [...new Set(
    value.toLowerCase()
      .replace(/[^a-z0-9 ]+/g," ")
      .split(/\s+/)
      .filter(token=>token.length>2&&!stopWords.has(token))
  )].sort();
}

export function evidenceSimilarity(a:string[],b:string[]):number {
  const left=new Set(a);
  const right=new Set(b);
  const intersection=[...left].filter(token=>right.has(token)).length;
  const union=new Set([...left,...right]).size;
  return union===0?0:intersection/union;
}

export function trendKeyForTokens(tokens:string[]):string {
  return [...new Set(tokens)].sort().join("|").slice(0,512);
}

export function classifyLearningRisk(value:string):{
  category:string;
  riskClass:"low"|"normal"|"high";
} {
  const text=value.toLowerCase();
  if(/auth|authorization|rls|permission|role/.test(text)){
    return {category:"authorization",riskClass:"high"};
  }
  if(/security|secret|credential|encryption/.test(text)){
    return {category:"security",riskClass:"high"};
  }
  if(/architecture|schema|migration/.test(text)){
    return {category:"architecture",riskClass:"high"};
  }
  if(/delete|destroy|drop|purge/.test(text)){
    return {category:"destructive",riskClass:"high"};
  }
  if(/policy|governance|production/.test(text)){
    return {category:"governance",riskClass:"high"};
  }
  return {category:"workflow",riskClass:"low"};
}

export function candidateFromRepeatedEvidence(
  events:Array<{id:string;content:string}>
):{
  normalizedKnowledge:string;
  category:string;
  riskClass:"low"|"normal"|"high";
  lifecycleState:"INTAKE";
  evidenceIds:string[];
  trendKey:string;
}|null {
  if(events.length<2)return null;
  const anchor=events[0];
  const anchorTokens=normalizeTrendTokens(anchor.content);
  const similar=events.filter(event=>
    evidenceSimilarity(anchorTokens,normalizeTrendTokens(event.content))>=0.5
  );
  if(similar.length<2)return null;
  const risk=classifyLearningRisk(similar.map(item=>item.content).join(" "));
  return {
    normalizedKnowledge:anchor.content.trim(),
    category:risk.category,
    riskClass:risk.riskClass,
    lifecycleState:"INTAKE",
    evidenceIds:similar.map(item=>item.id),
    trendKey:trendKeyForTokens(anchorTokens)
  };
}


export function bestCandidateByEvidenceOverlap(
  links:Array<{candidateId:string;eventId:string}>,
  evidenceIds:string[],
  minimumOverlap=2
):string|null {
  const evidence=new Set(evidenceIds);
  const counts=new Map<string,number>();
  for(const link of links){
    if(!evidence.has(link.eventId))continue;
    counts.set(link.candidateId,(counts.get(link.candidateId)||0)+1);
  }
  const ranked=[...counts.entries()]
    .filter(([,count])=>count>=minimumOverlap)
    .sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));
  return ranked[0]?.[0]||null;
}
