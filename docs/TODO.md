# TaskGrid implementation TODO

## Recommendation ranking

- [ ] Replace `GET /discovery/recommended-workers` newest-active-worker ordering with the planned AI recommendation model. Inputs should be limited to relevant marketplace signals such as task category, verified skills, service area, availability, trust/completion history, and client needs. Keep a deterministic fallback and test ranking fairness.
- [ ] Replace `GET /discovery/recommended-tasks` newest-open-task ordering with the planned AI recommendation model. Consider the worker's verified primary skill, distance/service area, availability, task urgency, schedule, and safe trust signals. Keep the empty state and deterministic fallback.

Current temporary behaviour is intentionally explicit: clients receive at most the five most recently joined active workers, while workers receive at most the five newest tasks still open for applications (`POSTED` or `BID_RECEIVED`). The UI does not claim these results are AI-personalised yet.
