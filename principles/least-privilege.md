# Least Privilege

Every user, service, process, token, and function gets the minimum access needed, for the minimum time.

## Rules for agents
- Scope credentials narrowly: specific actions on specific resources. Never wildcard permissions or admin roles for convenience.
- Default deny. Grant explicitly.
- Never hardcode secrets. Read from environment or a secret manager; keep them out of logs, errors, URLs, and version control.
- Separate credentials per environment and per service. No shared superuser account.
- Prefer short-lived tokens; support rotation from day one.
- Apply in code too: private by default, narrowest export surface, read-only handles where writes are not needed.
- Database users get only the tables and verbs they use. Application code rarely needs DDL.
- Validate authorisation on the server for every request. Client-side checks are UX, not security.

## Smells
`chmod 777`, `AdministratorAccess`, one API key used by everything, secrets in `.env` committed to the repo, a service account that can delete production.
