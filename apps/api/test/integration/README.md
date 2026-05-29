# Integration tests

Exercises the real persistence stack against throwaway **PostgreSQL** and
**Redis** containers (matching the prod images) via
[Testcontainers](https://dotnet.testcontainers.org/). **Requires a running
Docker daemon** — these tests start real containers.

The Domain layer has no external dependencies, so it has no integration tests of
its own; the domain entities are exercised here *through* the persistence layer.

## Layout
- `IntegrationFixture.cs` — assembly-wide `[SetUpFixture]`: starts the Postgres +
  Redis containers, applies EF migrations once, and hands out fresh
  `AppDbContext` / Redis connections.
- `DatabaseIntegrationTestBase.cs` — truncates all tables before each DB test.
- `Infrastructure/` — the tests:
  - `PersonRepositoryIntegrationTests` — CRUD + owned `ScoringSettings` columns round-trip.
  - `TodoRepositoryIntegrationTests` — tags/subtasks persistence, owner FK enforcement,
    cascade-on-owner-delete, set-null-on-assignee-delete.
  - `RedisScoreCacheIntegrationTests` — set/get/miss + end-of-day TTL.
  - `MigrationsIntegrationTests` — migrations apply cleanly, none pending.
  - `SeederIntegrationTests` — seeds and is idempotent.

## Running
```bash
dotnet test apps/api/test/integration/Api.IntegrationTests.csproj
```
Unit tests live in [`../unit`](../unit).
