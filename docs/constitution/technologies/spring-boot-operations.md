# Spring Boot — Operations

Making a service observable, resilient and safe to run. These are cheap at the start and expensive to retrofit.

## Observability
- **Actuator** with liveness and readiness probe groups. Readiness fails while dependencies are down, so traffic is not routed to a pod that cannot serve.
- **Micrometer** for metrics, **OpenTelemetry** for traces. Instrument before you need it — `../principles/measure-first.md` requires a number, and you cannot get one after the incident.
- Propagate a trace/correlation ID through every inbound and outbound call, and include it in every log line. An error you cannot correlate across services is an error you cannot diagnose.
- Structured JSON logs. Log the decision and its inputs, never secrets, tokens or personal data.
- Expose only `health` publicly; secure every other Actuator endpoint — `../principles/least-privilege.md`.

## Resilience
- **Every outbound call gets a connect and a read timeout.** Framework defaults are frequently infinite, and one hung dependency then exhausts the thread pool and takes the service down.
- Retry with exponential backoff and jitter, bounded attempts — and **only for idempotent operations**. A blind retry on a payment charges twice.
- Circuit-break calls to anything you do not control, with a defined fallback. Failing fast beats queueing work behind a dead dependency.
- Enable graceful shutdown with a drain period so in-flight requests finish during a deploy.
- Size the Hikari pool deliberately against the database's connection limit. The default is a guess, and pool exhaustion presents as unexplained latency.

## Security
- **OAuth2 resource server with JWT.** Validate signature, issuer, audience and expiry — all four. A token that is merely well-formed is not a token that is valid.
- Authorise at the use-case boundary (`@PreAuthorize` or an explicit check), not only in the controller, and **deny by default**.
- CORS as an explicit origin allowlist. Never `*` with credentials.
- Secrets from the environment, validated at startup. Never in `application.yml`, never in version control, never in a log line.

## Smells
No readiness probe, a `RestTemplate` with no timeout, a retry on a non-idempotent call, `@PreAuthorize` on nothing, `cors().allowedOrigins("*")` with credentials, metrics added during an incident, a trace ID that stops at the service boundary, secrets in `application.yml`.
