import { canonicalizeDeclaredLanguage } from "./datanestLanguageMetadata.ts";

export type LanguageReviewRequirement={
  required:boolean;
  declaredLanguageTags:string[];
  unspecifiedLanguageEvidenceCount:number;
  reviewReasons:string[];
};

export type ReviewerQualification={
  id:string;
  language_tag:string;
  qualification_scope:string;
  active:boolean;
};

function stringArray(value:unknown):string[]{
  return Array.isArray(value)
    ?value.filter((item):item is string=>typeof item==="string"&&Boolean(item.trim())).map(item=>item.trim())
    :[];
}

export function languageReviewRequirementFromEvidence(
  evidence:Array<{metadata?:Record<string,unknown>|null}>
):LanguageReviewRequirement{
  const declared=new Set<string>();
  const reasons=new Set<string>();
  let unspecifiedLanguageEvidenceCount=0;

  for(const item of evidence){
    const metadata=item.metadata||{};
    if(metadata.language_review_required!==true)continue;

    const sourceLanguage=typeof metadata.source_language==="string"
      ?metadata.source_language.trim()
      :"";
    if(sourceLanguage){
      try{
        declared.add(canonicalizeDeclaredLanguage(sourceLanguage));
      }catch{
        reasons.add("invalid_stored_language_tag");
      }
    }else{
      unspecifiedLanguageEvidenceCount++;
    }
    for(const reason of stringArray(metadata.language_review_reasons)){
      reasons.add(reason);
    }
  }

  return {
    required:declared.size>0||unspecifiedLanguageEvidenceCount>0,
    declaredLanguageTags:[...declared].sort(),
    unspecifiedLanguageEvidenceCount,
    reviewReasons:[...reasons].sort()
  };
}

export function canonicalizeReviewedLanguages(values:unknown):string[]{
  if(!Array.isArray(values))return [];
  return [...new Set(values.map(value=>canonicalizeDeclaredLanguage(value)))].sort();
}

export function qualificationsCoverLanguages(
  qualifications:ReviewerQualification[],
  requiredLanguageTags:string[]
):{covered:boolean;qualificationIds:string[];missingLanguageTags:string[]}{
  const active=qualifications.filter(item=>item.active!==false);
  const byTag=new Map<string,string[]>();
  for(const qualification of active){
    let tag:string;
    try{
      tag=canonicalizeDeclaredLanguage(qualification.language_tag);
    }catch{
      continue;
    }
    const ids=byTag.get(tag)||[];
    ids.push(String(qualification.id));
    byTag.set(tag,ids);
  }
  const missingLanguageTags=requiredLanguageTags.filter(tag=>!byTag.has(tag));
  const qualificationIds=[...new Set(
    requiredLanguageTags.flatMap(tag=>byTag.get(tag)||[])
  )].sort();
  return {
    covered:missingLanguageTags.length===0,
    qualificationIds,
    missingLanguageTags
  };
}
