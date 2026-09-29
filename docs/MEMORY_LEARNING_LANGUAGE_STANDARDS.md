# Resonance DataNest memory, learning and language control baseline

Status: adopted engineering requirements; partial implementation, not assessed ISO conformity.
Version: memory-language-v1. Sources checked: 2026-09-29.

## Purpose and authority

Collective understanding means preserving and reconciling attributable interpretations across people, languages and domains. Agreement, fluency, repetition and lexical similarity are not proof of truth or comprehension. Collective evidence feeds discovery; verified candidates still require current certification before operational reuse. Adaptation must improve accessibility without changing the underlying claim or weakening scope boundaries.

The following mappings are DataNest design decisions based on publicly available scopes. They are not a clause-by-clause assessment. Obtain authorized full standards and applicable amendments for formal assessment; record edition, clause, control owner, implementation, evidence, exceptions and reviewer decision. Do not ingest copyrighted standards into learning corpora without appropriate rights. Internal Certified Memory must never be marketed as ISO certification.

## Standards register and control mapping

| Reference | Purpose in DataNest | Required evidence / current gap |
| --- | --- | --- |
| [ISO 30401:2018](https://www.iso.org/standard/68683.html), including applicable 2022 and 2024 amendments | Knowledge ownership, acquisition, sharing, retention, review and improvement | Existing memory lifecycle and provenance are partial technical support. Governance owner must establish organizational objectives, reviews and audit evidence. Monitor replacement draft; do not claim draft compliance. |
| [ISO/IEC 42001:2023](https://www.iso.org/standard/42001) | AI management accountability, change control and continual improvement | Owner-approved AI scope, responsibilities, impact assessment, incident handling and management review remain required. A passing software pipeline is insufficient. |
| [ISO/IEC 23894:2023](https://www.iso.org/standard/77304.html) | AI risk management | Maintain language-specific risk register covering mistranslation, false consensus, source dependency, cultural bias, poisoning and unsupported reuse; assign treatment and residual-risk owner. |
| [ISO/IEC 5259 series](https://www.iso.org/publication/PUB200525.html) | Data quality for analytics and ML | Measure provenance completeness, representativeness, ambiguity, duplication, label accuracy and drift by language/domain. Confirm applicable parts and editions before formal assessment. |
| [ISO 704:2022](https://www.iso.org/standard/79077.html) | Terminology and concept discipline | Separate concept identity, definition, preferred/alternate language labels, domain and scope. Qualified reviewers approve mappings; lexical matches cannot silently merge concepts. |
| [ISO/IEC 5338:2023](https://www.iso.org/standard/81118.html) | AI system lifecycle processes | Version datasets, models/providers, policies, evaluations and release evidence; record rollback and retirement decisions. |
| [NIST AI RMF 1.0 and GenAI Profile](https://www.nist.gov/itl/ai-risk-management-framework) | Govern, Map, Measure, Manage; generative-AI risk | Document context and harms, benchmark before release, monitor outcomes and remediate. This is a voluntary framework, not a product certification. |
| [BCP 47 / RFC 5646](https://www.rfc-editor.org/rfc/rfc5646) | Language identification | Store source/output language tags, uncertainty and code-switched segments; unknown language remains unknown. Language must not set jurisdiction or access rights. |
| [Unicode UAX #15](https://www.unicode.org/reports/tr15/) | Canonical text normalization | Preserve original evidence; derive NFC search text separately. Never strip accents or non-Latin scripts from the authoritative record; normalization is not translation. |
| [W3C SKOS](https://www.w3.org/TR/skos-reference/) | Multilingual concept labels and relationships | Distinguish exact, close, broader, narrower and related mappings. Retain scope notes; SKOS interchange is not yet implemented. |
| [W3C PROV-O](https://www.w3.org/TR/prov-o/) | Derivation and attribution | Link translated/paraphrased evidence to original entities, activities and agents. Existing trace IDs support provenance; full PROV export and derivation-family independence remain gaps. |
| [W3C DQV](https://www.w3.org/TR/vocab-dqv/) | Quality measurement descriptions | Store metric, method, dataset, time and assessor. DQV is a supporting W3C Note, not a certification standard. |

These references complement existing security, privacy, retention and authorization controls; they do not replace them. Formal information-security/privacy standards mapping requires a separate scoped assessment.

## Application requirements

1. Preserve original evidence, source trace, content hash, project, Job, session, author/provider and time. Derived normalization, translation and summaries must reference their original evidence and transformation version. Never overwrite originals to improve search.
2. Capture explicit language preference separately from detected language, confidence, dialect and jurisdiction. Use BCP 47 tags where applicable; support unknown/mixed language. User preference does not authorize cross-session learning.
3. Maintain concept IDs independently of words. Record definitions, domain, language labels, scope, mapping kind, reviewer, evidence and validity. Personal vocabulary remains personal until independently approved for shared use.
4. A translation is dependent evidence. Multiple models translating one source count as one source family, not independent corroboration. Human corrections add review evidence without erasing dissent or original provenance.
5. Filter by authorization, product, purpose, jurisdiction and validity before ranking. Language preference affects presentation/relevance, never authorization or certification confidence. A translation inherits source restrictions; a materially changed interpretation requires a new review.
6. Preserve negation, modal force (must/may), numbers, units, dates, names and uncertainty. Where terms are non-equivalent, keep the original, give scoped explanations and seek clarification if the decision depends on meaning.
7. Do not infer comprehension from fluency, user assent or popularity. For consequential ambiguity, provide a short paraphrase of the interpretation and allow correction. Avoid unnecessary comprehension quizzes in routine interactions.
8. High-impact claims and uncertain semantic equivalence require language-competent domain review before shared operational reuse. Legal Eagle matters remain excluded from automatic project learning.
9. Outcome evidence can trigger review, narrowing or supersession; frequency alone cannot increase truth status. Keep revocation, version history and reproducible memory usage receipts.
10. Re-run evaluations after model, prompt, tokenizer, translation, ontology or retrieval changes. Record provider/model, policy version, dataset version, language coverage and limitations with each release.

## Implementation and gap ledger

| Control | Evidence / implementation | Status |
| --- | --- | --- |
| Scope, validity, ranked selection | `20260929070000_optimize_collective_verified_memory.sql`; `20260929081500_fix_verified_memory_relevance_ranking.sql` | Existing database controls; relevance is lexical, not multilingual semantic understanding |
| Usage attribution | `20260929083000_add_certified_memory_usage_receipts.sql` | Existing receipts; does not establish comprehension |
| Language adaptation and truth boundaries | `_shared/memoryLanguagePolicy.ts`, included by all three prompt builders | Implemented model instructions in this change; probabilistic, not a deterministic enforcement gate |
| Preservation of required response schema | Shared policy localizes values, preserves keys | Integration tests in this change; live multilingual response quality still needs evaluation |
| Unicode and language-aware retrieval | Current SQL query cleanup uses ASCII; trend/risk/negation heuristics are English-oriented | Open: Unicode-safe search, language tagging and validated analyzers. Do not advertise multilingual retrieval parity |
| Translation/source-family lineage | Current traces and independence keys | Partial: enforce derivation families and reviewed semantic mappings in database and certification gateway |
| Concept registry and shared definitions | Standards and schema requirements in this baseline | Open: scoped registry, reviewed mapping lifecycle, SKOS export |
| Per-language comprehension evaluation | Release requirements below | Open: reviewed datasets, metrics and human assessment; prompt tests are not quality evidence |
| Formal standards conformity | Public scopes mapped above | Not assessed: full-text review, control owners, operational evidence and independent assessment as appropriate |

## Release evaluation protocol

The following are DataNest acceptance requirements, not thresholds specified by ISO.

Use consented or purpose-built evaluation material with qualified bilingual/domain reviewers. Keep all fixtures marked synthetic and excluded from production learning. Split train/tuning and held-out evaluation by source family to prevent translations of the same source leaking between splits.

Start coverage planning with English, isiZulu, isiXhosa, Afrikaans and Sesotho plus the actual languages requested by users. Include mixed-language input, accents, regional terminology, ambiguous dates, low-resource conditions and non-Latin scripts. This is a proposed evaluation scope, not a supported-language claim. Record sample counts and uncertainty; do not average away a failing language or domain.

Measure retrieval Recall@k/nDCG against reviewed relevance labels, claim/negation/quantity preservation, terminology accuracy, citation entailment, appropriate clarification/abstention, contradiction detection and reviewer agreement with adjudication. Also measure unauthorized-scope leakage and mistaken evidence independence. Retrieval metrics and lexical overlap cannot substitute for meaning preservation.

Release gates: zero observed scope leaks, zero automatic promotion of uncertified translations and zero missed seeded critical negation/quantity contradictions in the release fixtures. These are fixture gates, not claims of zero real-world risk. Owners must pre-register numeric per-language quality thresholds and sample requirements before collecting release results; unassessed or failing language/domain combinations remain experimental and cannot gain automatic shared-learning eligibility.

Record dataset/version, source rights, languages, reviewer qualifications, results by slice, confidence intervals where meaningful, unresolved disagreements, policy/model versions and release decision. Keep evaluation outputs separate from learned memory.

## Ownership and sequence

The project Owner assigns accountable roles before claiming assessed alignment: knowledge steward (concepts and review), language/domain reviewers (meaning), security/privacy owner (scope and rights), evaluation owner (datasets and metrics), release owner (gates and rollback). These are required roles, not appointments of specific people.

Next implementation order: preserve Unicode and language metadata; enforce derivation-family independence and reviewed mappings; add concept registry and scoped multilingual retrieval; establish per-language comprehension evaluations; assess the management-system controls against authorized standards. Each step requires its own tests and governed release. Review this register after incidents and relevant standards/model changes, and at least quarterly as a DataNest policy.
