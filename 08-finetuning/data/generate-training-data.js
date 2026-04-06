import { writeFileSync } from "fs";

// 20 diverse training examples covering all changelog categories
const examples = [
    {
        input: `feat(payments): add Stripe webhook signature verification
fix(cart): item count badge not updating on removal
perf(search): implement Redis caching for search results`,
        output: `## Features
- **Stripe webhook signature verification**: All incoming Stripe webhooks are now validated using HMAC-SHA256 signatures. Prevents replay attacks and spoofed webhook events.

## Bug Fixes
- **Cart item count badge not updating on removal** _(low)_: The badge in the navbar showed stale counts after removing items from the cart without a page refresh. Fixed with a reactive state update.

## Performance
- **Redis caching for search results**: Search queries are now cached for 5 minutes. Reduced database load by 60% and average search response time from 340ms to 45ms.`
    },
    {
        input: `feat(notifications): email digest for weekly activity
feat(api): add pagination to /users endpoint
fix(db): connection pool leak under sustained load
refactor(auth): extract token validation into middleware
docs: add OpenAPI spec for v2 endpoints`,
        output: `## Features
- **Weekly email digest**: Users now receive a summary of their weekly activity every Monday morning. Can be disabled from notification preferences.
- **Pagination on /users endpoint**: The endpoint now accepts \`page\` and \`limit\` query parameters. Default page size is 20, maximum is 100.

## Bug Fixes
- **Connection pool leak under sustained load** _(high)_: Database connections were not being released when requests timed out, eventually exhausting the pool. Connections are now released in a finally block.

## Refactoring
- **Token validation extracted to middleware**: JWT validation logic moved from individual route handlers into a reusable Express middleware. Eliminates code duplication across 12 routes.

## Documentation
- **OpenAPI spec for v2 endpoints**: Full OpenAPI 3.0 specification added for all v2 API endpoints. Available at /api/v2/docs.`
    },
    {
        input: `feat(auth): add multi-factor authentication via TOTP
security(api): rate limit login attempts per IP
fix(session): session not invalidated on logout`,
        output: `## Features
- **Multi-factor authentication (TOTP)**: Users can now enable MFA using authenticator apps like Google Authenticator. Adds an extra layer of account protection.

## Security
- **Rate limiting on login attempts**: Login endpoint now limits repeated attempts per IP address to prevent brute-force attacks.

## Bug Fixes
- **Session not invalidated on logout** _(high)_: Sessions remained active after logout, allowing reuse of tokens. Fixed by clearing session store and cookies.`
    },
    {
        input: `feat(ui): dark mode toggle
perf(images): lazy load product images
fix(ui): modal flickering on open`,
        output: `## Features
- **Dark mode toggle**: Users can switch between light and dark themes. Preference is persisted across sessions.

## Performance
- **Lazy loading product images**: Images now load only when visible in viewport, reducing initial page load time by ~40%.

## Bug Fixes
- **Modal flickering on open** _(low)_: UI modal briefly flickered due to double render. Fixed with conditional mount optimization.`
    },
    {
        input: `feat(search): add fuzzy search support
fix(search): incorrect ranking of results
perf(db): add index on orders.created_at`,
        output: `## Features
- **Fuzzy search support**: Search now tolerates typos and partial matches using trigram similarity.

## Bug Fixes
- **Incorrect ranking of results** _(medium)_: Results were not sorted by relevance score. Ranking algorithm corrected.

## Performance
- **Index on orders.created_at**: Added database index improving query speed for recent orders by ~70%.`
    },
    {
        input: `refactor(api): unify error response format
docs(api): document error codes
fix(api): inconsistent HTTP status codes`,
        output: `## Refactoring
- **Unified error response format**: All API errors now follow a consistent structure with code, message, and details fields.

## Documentation
- **Error codes documentation**: Comprehensive list of API error codes added with descriptions and examples.

## Bug Fixes
- **Inconsistent HTTP status codes** _(medium)_: Some endpoints returned incorrect status codes. Fixed to align with REST standards.`
    },
    {
        input: `feat(payments): support PayPal checkout
fix(payments): duplicate charge on retry
security(payments): validate webhook origin`,
        output: `## Features
- **PayPal checkout support**: Users can now complete payments using PayPal alongside existing methods.

## Bug Fixes
- **Duplicate charge on retry** _(high)_: Payment retries caused duplicate charges. Fixed using idempotency keys.

## Security
- **Webhook origin validation**: Payment webhooks are now validated against trusted sources to prevent spoofing.`
    },
    {
        input: `perf(api): compress JSON responses with gzip
fix(api): missing CORS headers
chore(deps): upgrade express to v5`,
        output: `## Performance
- **Gzip compression for responses**: API responses are now compressed, reducing payload size by up to 60%.

## Bug Fixes
- **Missing CORS headers** _(medium)_: Some endpoints blocked cross-origin requests. Headers now correctly applied.

## Chores
- **Upgrade Express to v5**: Updated framework dependency to latest version with improved performance and routing.`
    },
    {
        input: `feat(chat): real-time typing indicators
fix(chat): messages not ordered correctly
perf(chat): reduce websocket reconnects`,
        output: `## Features
- **Typing indicators**: Users can now see when others are typing in real time.

## Bug Fixes
- **Messages not ordered correctly** _(medium)_: Messages occasionally appeared out of order. Fixed using server timestamps.

## Performance
- **Reduced WebSocket reconnects**: Improved connection stability, reducing reconnect frequency by 50%.`
    },
    {
        input: `breaking(api): remove v1 endpoints
feat(api): introduce v2 versioning
docs(api): migration guide for v2`,
        output: `## Breaking Changes
- **Removed v1 API endpoints**: Legacy endpoints have been deprecated and removed. Clients must migrate to v2.

## Features
- **API versioning (v2)**: Introduced versioned API with improved structure and performance.

## Documentation
- **Migration guide for v2**: Step-by-step guide provided to help transition from v1 to v2 endpoints.`
    },
    {
        input: `feat(files): drag and drop upload
fix(files): upload progress stuck at 100%
perf(files): parallel uploads`,
        output: `## Features
- **Drag and drop upload**: Users can upload files by dragging them into the browser.

## Bug Fixes
- **Upload progress stuck at 100%** _(low)_: Progress bar did not complete properly. Fixed event handling logic.

## Performance
- **Parallel uploads**: Multiple files now upload simultaneously, reducing total upload time significantly.`
    },
    {
        input: `security(auth): enforce password complexity rules
fix(auth): password reset token reuse
feat(auth): remember me option`,
        output: `## Security
- **Password complexity enforcement**: Passwords must now meet minimum strength requirements.

## Bug Fixes
- **Password reset token reuse** _(high)_: Tokens could be reused multiple times. Fixed with one-time token invalidation.

## Features
- **Remember me option**: Users can stay logged in across sessions with persistent authentication tokens.`
    },
    {
        input: `feat(analytics): dashboard charts for revenue
perf(analytics): cache aggregation queries
fix(analytics): incorrect totals in reports`,
        output: `## Features
- **Revenue dashboard charts**: Visual charts added for tracking revenue trends over time.

## Performance
- **Cached aggregation queries**: Heavy analytics queries are now cached, reducing load times by 65%.

## Bug Fixes
- **Incorrect totals in reports** _(high)_: Aggregation bug caused inaccurate totals. Fixed calculation logic.`
    },
    {
        input: `refactor(code): migrate to TypeScript
chore(build): update webpack config
fix(build): sourcemaps not generated`,
        output: `## Refactoring
- **Migration to TypeScript**: Codebase converted to TypeScript for better type safety and maintainability.

## Chores
- **Updated Webpack config**: Improved build pipeline with optimized bundling.

## Bug Fixes
- **Sourcemaps not generated** _(low)_: Fixed configuration issue preventing sourcemap output.`
    },
    {
        input: `feat(email): transactional email templates
fix(email): emails sent twice
perf(email): queue email jobs`,
        output: `## Features
- **Transactional email templates**: Added reusable templates for common email types.

## Bug Fixes
- **Emails sent twice** _(high)_: Duplicate sends caused by retry logic. Fixed with idempotent job handling.

## Performance
- **Queued email jobs**: Emails are now processed asynchronously via job queue, improving reliability.`
    },
    {
        input: `feat(profile): user avatars upload
fix(profile): avatar not updating
perf(profile): optimize image resizing`,
        output: `## Features
- **User avatar uploads**: Users can upload profile pictures.

## Bug Fixes
- **Avatar not updating** _(low)_: Cache issue prevented updates from reflecting immediately.

## Performance
- **Optimized image resizing**: Reduced processing time by using streaming transformations.`
    },
    {
        input: `feat(i18n): add Spanish language support
fix(i18n): missing translations
refactor(i18n): centralize locale files`,
        output: `## Features
- **Spanish language support**: Application now supports Spanish localization.

## Bug Fixes
- **Missing translations** _(low)_: Some UI strings were not translated. Completed missing entries.

## Refactoring
- **Centralized locale files**: All translations moved into a single structured directory.`
    },
    {
        input: `feat(logging): structured JSON logs
perf(logging): async log writing
fix(logging): logs missing request id`,
        output: `## Features
- **Structured JSON logging**: Logs are now emitted in JSON format for better observability.

## Performance
- **Async log writing**: Logging is now non-blocking, improving request throughput.

## Bug Fixes
- **Missing request ID in logs** _(medium)_: Correlation IDs were not included. Fixed middleware injection.`
    },
    {
        input: `feat(cache): add Redis layer
fix(cache): stale cache invalidation
perf(cache): reduce cache misses`,
        output: `## Features
- **Redis caching layer**: Introduced Redis for caching frequently accessed data.

## Bug Fixes
- **Stale cache invalidation** _(medium)_: Cached data was not refreshed properly. Fixed invalidation strategy.

## Performance
- **Reduced cache misses**: Improved hit rate by refining cache keys and TTL policies.`
    },
    {
        input: `feat(cli): add interactive setup wizard
fix(cli): config not saved
docs(cli): usage instructions`,
        output: `## Features
- **Interactive setup wizard**: CLI now guides users through initial configuration.

## Bug Fixes
- **Config not saved** _(medium)_: Settings were not persisted correctly. Fixed file write logic.

## Documentation
- **CLI usage instructions**: Added detailed usage guide with examples.`
    },
    {
        input: `feat(webhooks): retry failed deliveries
fix(webhooks): incorrect payload format
security(webhooks): sign webhook payloads`,
        output: `## Features
- **Retry failed webhook deliveries**: Failed webhooks are retried with exponential backoff.

## Bug Fixes
- **Incorrect webhook payload format** _(high)_: Payload structure mismatched spec. Fixed serialization logic.

## Security
- **Signed webhook payloads**: All webhooks now include signatures for verification.`
    }
];

const lines = examples.map((e) =>
    JSON.stringify({ text_input: e.input, output: e.output })
);

// 80/20 train/validation split
const splitAt = Math.floor(lines.length * 0.8);
writeFileSync("data/training.jsonl", lines.slice(0, splitAt).join("\n"));
writeFileSync("data/validation.jsonl", lines.slice(splitAt).join("\n"));

console.log(`Training: ${splitAt} examples`);
console.log(`Validation: ${lines.length - splitAt} examples`);