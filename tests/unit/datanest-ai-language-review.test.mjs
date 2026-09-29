import test from "node:test";
import assert from "node:assert/strict";
import {
  canonicalizeReviewedLanguages,
  languageReviewRequirementFromEvidence,
  qualificationsCoverLanguages
} from "../../supabase/functions/_shared/datanestLanguageReview.ts";

test("language review requirement is derived only from governed evidence metadata",()=>{
  const requirement=languageReviewRequirementFromEvidence([
    {metadata:{
      source_language:"af",
      language_review_required:true,
      language_review_reasons:["declared_language_requires_review"]
    }},
    {metadata:{
      language_review_required:true,
      language_review_reasons:["non_ascii_letter_mark_or_number"]
    }},
    {metadata:{
      source_language:"en-ZA",
      language_review_required:false
    }}
  ]);
  assert.deepEqual(requirement,{
    required:true,
    declaredLanguageTags:["af"],
    unspecifiedLanguageEvidenceCount:1,
    reviewReasons:[
      "declared_language_requires_review",
      "non_ascii_letter_mark_or_number"
    ]
  });
});

test("reviewed languages are explicit BCP 47 declarations, never inferred",()=>{
  assert.deepEqual(canonicalizeReviewedLanguages(["af","en-za","af"]),["af","en-ZA"]);
  assert.deepEqual(canonicalizeReviewedLanguages(undefined),[]);
  assert.throws(()=>canonicalizeReviewedLanguages(["bad_tag"]),/valid BCP 47/);
});

test("qualification coverage requires active exact language registrations",()=>{
  const qualifications=[
    {id:"q1",language_tag:"af",qualification_scope:"source_language_review",active:true},
    {id:"q2",language_tag:"zu-ZA",qualification_scope:"semantic_equivalence",active:true},
    {id:"q3",language_tag:"xh",qualification_scope:"source_language_review",active:false}
  ];
  assert.deepEqual(
    qualificationsCoverLanguages(qualifications,["af","zu-ZA"]),
    {covered:true,qualificationIds:["q1","q2"],missingLanguageTags:[]}
  );
  assert.deepEqual(
    qualificationsCoverLanguages(qualifications,["af","xh"]),
    {covered:false,qualificationIds:["q1"],missingLanguageTags:["xh"]}
  );
});
