# CONDUCTOR Tree

**CONDUCTOR** is the DataNest timing and process-synchronization tree. It observes workflow freshness and dependencies, coordinates pull/push and push/pull data-flow order, dispatches at most one due process per coordination cycle, and triggers SUGGESTER when the synchronized cycle is ready for optimization analysis.

CONDUCTOR does not merge, deploy production directly, rewrite Boundaries, or synchronize FREETREE. Cross-repository Mirror activity remains delegated to Mirror-owned consumers and maintenance.
