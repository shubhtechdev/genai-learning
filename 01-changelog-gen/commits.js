export const sampleCommits = `
feat(auth): add JWT refresh token support
fix(api): handle null response from payment gateway
chore(deps): bump express from 4.18.1 to 4.18.2
feat(ui): add dark mode toggle to settings page
fix(db): connection pool exhaustion under high load
refactor(core): extract validation logic into separate module
feat(notifications): send email digest for weekly activity
fix(auth): session not invalidated on password change
docs: update API reference for v2 endpoints
perf(search): add index on user_id column, 3x query speedup
`.trim();