# DataNest AI Architecture

## Authority

DataNest is the durable intelligence authority. Its identity and organizational knowledge must not depend on a specific model, workstation, inference host, or backup provider.

## Critical path

1. DataNest web application
2. Supabase authentication and governed project data
3. Certified DataNest memory and learning/certification pipeline
4. DataNest AI Edge Function and policy controls
5. An approved OpenAI-compatible inference endpoint when generative inference is required

If no external inference endpoint is available, DataNest remains operational and fails safely to its existing embedded capabilities.

## Optional infrastructure

### Ealiophin

Ealiophin is an optional sovereign compute node. It may provide local inference, media processing, private workloads, development services, or failover capacity. It is never required for DataNest availability.

### Dropbox

Dropbox is a backup and evidence mirror. It may represent snapshots produced by Ealiophin or other nodes, but it does not become source authority, runtime authority, or an inference dependency.

## Portability rule

The shared AI configuration is endpoint-based rather than machine-based. A compatible inference endpoint can move between Ealiophin, another local node, a private GPU server, or approved hosted infrastructure without changing DataNest memory or user identity.

## Learning rule

User interactions are provisional. Cross-user knowledge becomes reusable only after the governed DataNest validation and certification process promotes it into certified memory.


## Bootstrap inference profile

As of 2026-09-28, the preferred zero-dedicated-GPU bootstrap route is Cloudflare Workers AI through its OpenAI-compatible Chat Completions API.

- Bootstrap model: `@cf/nvidia/nemotron-3-120b-a12b`
- Provider host: `api.cloudflare.com`
- Provider type inside DataNest: `openai_compatible`
- DataNest identity and certified memory remain independent of this provider and model.
- The provider may be replaced when a stronger, cheaper, more private, or more sovereign approved endpoint is available.
- No Cloudflare account identifier or credential is committed to source control.
- High-sensitivity and local-only workloads should remain on an appropriately approved private/local route rather than being assumed safe for hosted inference.

The production provider-domain allowlist includes `api.cloudflare.com`; activation still requires a valid account-specific endpoint and server-side credential.

## Collective Memory and Verified Memory

DataNest separates collective learning from trusted operational memory.

- **Collective Knowledge Pool** is the governed discovery layer formed from eligible human, AI companion, and document evidence. Trends and learning candidates may emerge here, but collective repetition alone is not authority.
- **Verified/Certified Memory** is the operational trust layer. Only knowledge that passes the required evidence, validation, stress, authority, and promotion gates becomes reusable project memory.
- **ILM-1** consumes Certified Memory; it does not treat raw collective evidence as authoritative memory.

Certified Memory retrieval uses the `verified-memory-ranked-v1` strategy. The runtime ranks applicable active memory using task relevance, certification confidence, applicability specificity, and verification freshness instead of relying only on promotion recency.

Certified Memory may declare applicability for product scopes, purposes, jurisdictions, and visibility classes, plus validity and review dates. Existing memories with no applicability metadata remain project-wide for backwards compatibility.

Before a newly certified candidate is promoted, DataNest compares it with active Certified Memory in the same category. Near-duplicates are held back to prevent memory pollution, while deterministic contradiction hints require explicit Owner supersession. Supersession creates a durable memory relationship rather than deleting history.

