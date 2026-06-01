# Backend integration tests

Exercises the **real persistence stack** against throwaway **PostgreSQL** and
**Redis** containers (matching the prod images) via
[Testcontainers](https://dotnet.testcontainers.org/). Where the unit tests fake
the data layer, these prove that EF Core mappings, migrations, FK behavior, and
the Redis cache actually work end to end.

- **Project:** `apps/api/test/integration/Api.IntegrationTests.csproj`
- **Framework:** [NUnit](https://nunit.org/) + [Testcontainers](https://dotnet.testcontainers.org/) (Postgres + Redis)
- **References:** `Domain`, `Infrastructure` (the real repositories and `AppDbContext`)
- **Requires a running Docker daemon** — these tests start real containers.

> The Domain layer has no external dependencies, so it has no integration tests
> of its own; the domain entities are exercised here *through* the persistence
> layer.

## How it's wired

| File | Role |
|------|------|
| `IntegrationFixture.cs` | Assembly-wide `[SetUpFixture]`: starts the Postgres + Redis containers once, applies EF migrations, and hands out fresh `AppDbContext` / Redis connections (`NewDbContext()`, `NewRedis()`). |
| `DatabaseIntegrationTestBase.cs` | Base class that `TRUNCATE`s all tables before each DB test so cases stay isolated and identities restart. |
| `Infrastructure/` | The tests themselves. |

### Test coverage

| Test class | What it proves |
|------------|----------------|
| `PersonRepositoryIntegrationTests` | CRUD plus the owned `ScoringSettings` columns round-trip. |
| `TodoRepositoryIntegrationTests` | Tags/subtasks persistence, query filters (owned + assigned, done-recurring, incomplete one-offs), owner FK enforcement, cascade-on-owner-delete, set-null-on-assignee-delete, subtask ordering. |
| `RedisScoreCacheIntegrationTests` | Set / get / miss behavior and the end-of-day TTL. |
| `MigrationsIntegrationTests` | Migrations apply cleanly and none are left pending. |
| `SeederIntegrationTests` | The seeder runs and is idempotent. |

## Running

```bash
dotnet test apps/api/test/integration/Api.IntegrationTests.csproj
```

Testcontainers talks to Docker via the daemon socket. In CI the **Build & Test**
job exposes it explicitly before running these tests:

```bash
echo "DOCKER_HOST=$(docker context inspect --format '{{.Endpoints.docker.Host}}')" >> $GITHUB_ENV
```

See the [GitHub workflow](github-workflow.md) doc for how this fits into the
pipeline. Unit tests (which need no Docker) live in
[Backend unit tests](backend-unit-tests.md).

## Adding tests

New repositories or schema changes should come with integration coverage in the
same change — see [Adding a new entity](adding-entities.md), which folds this
into the workflow.
