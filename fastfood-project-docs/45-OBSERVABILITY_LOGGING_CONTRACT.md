# Observability and Logging Contract

## 1. Structured logging

Backend/worker use structured JSON logging through Pino-compatible Nest integration. Production code does not depend on free-form console output.

## 2. Required common fields

Where available:

- `timestamp`
- `level`
- `service`
- `environment`
- `requestId`
- `correlationId`
- `userId` or actor reference when safe
- `branchId` when operationally relevant
- `orderId` when relevant
- `paymentAttemptId` when relevant
- `jobId` for queue logs
- canonical error code

PII is minimized/redacted.

## 3. Request correlation

API accepts/generates a request ID and propagates correlation into:

- logs,
- audit metadata,
- queue jobs/events where useful,
- provider-operation diagnostic context.

## 4. Error reporting

Unexpected exceptions are captured by a configured error tracking/observability sink when credentials are supplied. Provider outages and expected domain validation errors are not all treated as application crashes.

## 5. Metrics

Minimum operational metrics:

- HTTP request rate/latency/error rate,
- queue depth/failures/retries,
- payment initialization/success/failure/pending counts,
- stale payment reconciliation count,
- orders by state,
- branch preparation SLA breaches,
- courier delivery SLA breaches,
- notification failure count.

## 6. Health

`/health/live` indicates process liveness.

`/health/ready` evaluates required dependencies for safe traffic handling, such as database connectivity and essential configuration. Redis degradation may have nuanced readiness behavior depending on endpoint/process role.

## 7. Queue dead-letter/failure visibility

Permanent job failures must remain inspectable with sanitized error data. Critical payment/loyalty jobs require explicit alerting or operational dashboard visibility.

## 8. Retention

Application log retention is infrastructure policy and must balance diagnostics with privacy. Raw courier GPS is not copied into general logs.

## 9. Business event logging

Do not rely on ordinary logs as the only audit trail. Order timeline and audit records are durable domain data.

## 10. Production troubleshooting

Given a customer-visible order number, authorized operations staff should be able to correlate order, payment attempt, state timeline, courier assignment, and relevant request/job IDs without exposing secrets.
