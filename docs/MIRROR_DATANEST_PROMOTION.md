# Mirror-DataNest promotion contract

Canonical repository: `DataNest-Supository/DataNest`

R&D repository: `DataNest-Supository/Mirror-DataNest`

## Rule

Mirror-DataNest is intentionally ungated for research and development. Production governance is re-applied at the point where a candidate change is synchronized back to DataNest.

No mirror commit is production-approved by implication.

## Required promotion evidence

A promotion pull request should identify:

- mirror source commit SHA(s);
- experiment / optimization goal;
- affected projects, products or services;
- unit/type/security observations where applicable;
- R&D preview/deployment observations;
- known failures or regressions;
- data/backend implications;
- rollback or revert plan;
- human reviewer decision.

## Synchronization method

Create a fresh branch from current `DataNest/main`, then import only the selected mirror change set. Prefer curated cherry-picks or an equivalent reviewed patch over mirroring all experimental history.

Example:

```sh
git clone https://github.com/DataNest-Supository/DataNest.git
cd DataNest
git remote add mirror https://github.com/DataNest-Supository/Mirror-DataNest.git
git fetch mirror
git switch -c mirror-promotion/<candidate> origin/main
git cherry-pick <mirror-commit>...
git push -u origin mirror-promotion/<candidate>
```

Open a pull request against `DataNest/main`. The canonical production workflow and human-reviewer approval requirements apply there.

## Separation rule

The mirror should use isolated free-tier test infrastructure where stateful testing is required. It must not rely on privileged production secrets or use production writes as its default test mechanism.
