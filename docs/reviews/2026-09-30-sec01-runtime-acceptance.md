# SEC-01 governance runtime acceptance handoff — 30 September 2026

## Scope

This handoff addresses the external-audit finding **SEC-01**: backend enforcement and cross-project isolation for the sovereign-governance surface.

The behavioral test is deliberately run only against the dedicated **DataNest AI Staging** project. Production is not mutated by the acceptance test.

## Production ↔ staging implementation parity observed before the test

A read-only inspection on 30 September 2026 compared `pg_get_functiondef` MD5 values for the governance and membership RPCs in:

- production: `sgqdmfgjbprsoqsmgigi` — DataNest Supository;
- staging: `qchttpcyqlqnhvahprhz` — DataNest AI Staging.

The function definitions matched exactly for all inspected RPCs:

| RPC | Definition MD5 |
| --- | --- |
| `cast_governance_vote_v1(uuid,text,text)` | `de29e478083c26c8913b89f97281f1ec` |
| `close_governance_proposal_v1(uuid,text)` | `6775aa8675f473a7868e9b7f2d0cfba4` |
| `create_governance_proposal_v1(uuid,text,text,text,text,uuid,timestamptz)` | `086ad02eb4845717c758d0ce332850b6` |
| `create_governance_protocol_draft_v1(uuid,text,text,text,text,jsonb)` | `3f6fcc2a26f447eb9e046c2944187fc4` |
| `file_governance_dispute_v1(uuid,text,uuid,text,text,text)` | `0e35aabfa34cdfbb1edf6942143184ed` |
| `get_governance_workspace_v1(uuid)` | `6ea967bbfd393f8f8bc28d2961a2919e` |
| `get_project_membership_workspace_v1(uuid)` | `3d699e266ed8797360a8a7cc455cb8f8` |
| `ratify_governance_protocol_v1(uuid,uuid)` | `608d9ac4e1e46c635dd9f0c2fc4ab67a` |
| `resolve_governance_dispute_v1(uuid,text,text,uuid)` | `7d758d7473d0c71ee2a89399312dc903` |
| `revoke_project_member_invite_v1(uuid,text)` | `84b48fac22774ed3ba8fa7729cc63082` |
| `withdraw_governance_proposal_v1(uuid,text)` | `be3bfdb1a791059e2208a5479a728fb1` |

Production grants those governance RPCs to `authenticated`; staging additionally grants `service_role` for governed test/fixture operations. The callable implementations themselves matched.

A separate read-only staging privilege check confirmed that `authenticated` has no INSERT/UPDATE/DELETE table privilege on either `project_members` or `governance_proposals`.

## Automated behavioral evidence

`tests/stress/datanest-governance-boundary-acceptance.mjs` creates isolated synthetic users and two temporary projects, then exercises:

- anonymous, viewer, operator, admin, owner and outsider identities;
- cross-project workspace and row isolation;
- role-gated protocol drafting, proposal closing and protocol ratification;
- direct project-member role-escalation denial;
- direct governance-history INSERT/UPDATE denial;
- proposer-only support producing a rejected decision because independent support is false;
- draft → proposal → proposer vote → independent vote → close → ratify;
- dispute filing → filer self-resolution denial → independent resolution;
- source decision/proposal/protocol preservation after dispute resolution;
- unchanged membership roles after the governance lifecycle.

The suite writes `certification-artifacts/datanest-governance-boundary-acceptance.json`, including the exact candidate commit, role matrix, results and cleanup outcome.

## Evidence boundary

A passing staging run plus the production/staging function-definition parity above establishes behavioral evidence for the deployed governance RPC implementation without writing production records.

It does **not** prove resistance to a privileged database administrator, nor does it replace exact production release attestation. REL-01 remains handled separately by the live database and Edge Function release-attestation gate.
