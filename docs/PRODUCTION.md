# From generated project to a production app

A generator supplies a starting structure. Tool installation, a successful build, or this checklist alone cannot establish production readiness.

For the actual product, record the required behavior, the evidence that demonstrates it, and what remains unresolved. Choose a stack from real constraints: user journeys, data ownership, permissions, background work, latency, recovery, team experience and operating cost.

- Persistence: validate schemas, constraints, migrations, concurrency, idempotency and rollback. Test with a production-like database.
- Identity and authorization: verify server-side permissions and tenant boundaries, including denied access, account recovery and privileged workflows.
- Secrets: keep runtime secrets out of client bundles, Git, logs and generated documentation. Use separate development/preview/production scopes and a rotation process.
- Reliability: cover timeouts, partial failures, retries, duplicate events, offline behavior and recoverability. Test backups by restoring them.
- Verification: run relevant automated checks and real desktop/mobile or device journeys. Record limits where hardware or external integrations were unavailable.
- Operations: configure structured logs without sensitive values, error reporting, health checks, alerts, spend limits and dependency updates.
- Deployment: review DNS, TLS, bindings, environment variables, preview access, migration ordering and rollback before publishing.
- Product obligations: review accessibility, privacy, retention, account deletion, billing boundaries, rate limits and abuse prevention where applicable.

For Cloudflare, verify runtime/library compatibility, binding scopes, secret separation and retry behavior. For Neon, verify pooling, region, role permissions, migration URLs and branch isolation. For Upstash, verify service-specific tokens, tenant-aware keys, TTLs, signed callbacks and message idempotency.

`set-my-vibe project check` reports whether familiar script names and a workflow directory exist. It does not run those scripts, inspect provider configuration or certify any of the above. The optional AI skill helps an agent gather the missing evidence within the user's scope.
