# Knowledge Tree

The **Knowledge** tree is DataNest's repository-learning subsystem.

It ingests recent observable engineering history from:

- `DataNest-Supository/DataNest`
- `DataNest-Supository/Mirror-DataNest`

It categorizes repository learnings, detects repeated work themes, produces optimization candidates, and publishes target-specific feeds. Knowledge output is advisory evidence only: it cannot approve production, certify memory, bypass governance, or authorize deployment.

## Isolation

- FREETREE is excluded from ingestion and receives no Knowledge feed.
- Mirror consumes only the feed addressed to `mirror`.
- Canonical DataNest retains authority over classification and feed format.
- Generated feeds live on the isolated `automation/knowledge-feed` branch.
