# Spring Boot & Kotlin

The backend for real domains. Kotlin always — no Java for new code.

## Defaults
| Concern | Choice |
|---|---|
| Language | **Kotlin** |
| Framework | **Spring Boot** |
| Build | **Gradle**, Kotlin DSL, version catalog |
| Format | **ktfmt** (Java: google-java-format) via Spotless — see `formatting.md` |
| Persistence | **Spring Data JDBC** |
| Database | **PostgreSQL** |
| Migrations | **Flyway**, forward-only |
| Unit tests | **JUnit 5** + **MockK** |
| Integration tests | **Testcontainers** (real Postgres) |
| API contract | **OpenAPI spec, hand-written first** |
| Server stubs | **openapi-generator** (`kotlin-spring`, `interfaceOnly`) |

## Why Spring Data JDBC over JPA
No lazy loading, no dirty tracking, no session lifecycle, no N+1 surprises. Loads and saves whole aggregates explicitly, which maps directly onto `../patterns/domain-driven-design.md` and `../patterns/repository.md`. Choose JPA only for an existing codebase that already uses it.

## Rules for agents
- Model the aggregate, not the table. One repository per aggregate root.
- Use Kotlin properly: `val` by default, data classes for value objects, sealed classes for state and errors, non-nullable types. Never `!!`.
- Constructor injection only. No `@Autowired` on fields, no field injection.
- Run `./gradlew spotlessApply`; never hand-format. CI fails on `spotlessCheck` — `formatting.md`.
- Keep domain code free of Spring annotations. Controllers, config and adapters wear the framework; the domain does not. See `../patterns/hexagonal-architecture.md`.
- Controllers map DTOs to domain types and delegate. No business logic, and never expose domain entities directly as JSON.
- `@Transactional` at the use-case boundary, never on a repository method.
- Integration tests use Testcontainers against real Postgres. No H2 — it lies about behaviour your production database has.
- Migrations are forward-only and immutable once merged. Never edit an applied migration.
- Structured JSON logging with a correlation ID per request. Never log secrets, tokens or personal data.
- Configuration and secrets from the environment, validated at startup with `@ConfigurationProperties`. Fail to boot on anything missing — see `../principles/fail-fast.md`.
- **Contract first**: write `openapi.yaml`, generate the server interfaces, implement them. Never annotate controllers and let a spec fall out of the code. See `type-contracts.md`.

## Smells
`!!`, `lateinit var` outside tests, `@Autowired` fields, entities returned from controllers, an OpenAPI spec generated from annotations, H2 in tests, business logic in a `@Service` over an anemic model, an edited migration, `catch (e: Exception) {}`.
