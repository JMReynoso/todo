# Backend unit tests

Fast, isolated tests for the API's business logic. They run entirely
in-process with **no database, Redis, or network** — the data layer is faked —
so they're quick enough to run on every build.

- **Project:** `apps/api/test/unit/Api.UnitTests.csproj`
- **Framework:** [NUnit](https://nunit.org/) with [Moq](https://github.com/devlooped/moq) for mocking (both exposed via `GlobalUsings.cs`)
- **Coverage:** [coverlet](https://github.com/coverlet-coverage/coverlet) (`coverlet.msbuild`)
- **References:** `Domain`, `Application`, `Controllers` (no `Infrastructure` — the persistence layer is the seam that gets mocked)

## What's covered

| Folder | Subject under test | Approach |
|--------|--------------------|----------|
| `Domain/` | Entities (`Todo`, `Subtask`, `ScoringSettings`) and domain services (`ScoringCalculator`) | Pure construction/behavior — no mocks needed; assert invariants, guard clauses, and cadence math. |
| `Services/` | Application services (`TodoService`, `PersonService`, `ScoringService`, `AuthService`) | Mock the repository / cache interfaces (`ITodoRepository`, `IPersonRepository`, `IScoreCache`); use the **real** FluentValidation validators so validation rules are exercised. |
| `Controllers/` | ASP.NET controllers | The controller takes the concrete service backed by mocked repositories, so tests assert HTTP result mapping (`Ok` / `NotFound` / `Created` / `NoContent`). |
| `Application/` | Jobs such as `TodoResetJob` | Driven through mocked repositories. |
| `TestSupport/` | `EntityTestExtensions` | `.WithId(n)` sets the EF-managed identity via reflection (the entity exposes only a protected setter), so tests can simulate persisted rows. |

## Conventions

- **Mock at the repository boundary.** Services and controllers depend on Domain
  interfaces; tests supply Moq fakes for those. This keeps unit tests free of EF
  Core and databases — see [Backend integration tests](backend-integration-tests.md)
  for the tests that exercise the real persistence stack.
- **Use real validators.** Service tests construct the actual
  `AbstractValidator` implementations so a validation regression fails a test.
- **Arrange entities with factory methods** (`Todo.Create(...)`) plus `.WithId(n)`
  rather than reflection-heavy setup.

## Running

```bash
# Just the tests
dotnet test apps/api/test/unit/Api.UnitTests.csproj

# With coverage (Cobertura), as CI runs it
dotnet test apps/api/test/unit/Api.UnitTests.csproj \
  /p:CollectCoverage=true \
  /p:CoverletOutputFormat=cobertura \
  /p:Threshold=75 /p:ThresholdType=line%2cbranch%2cmethod /p:ThresholdStat=total
```

The `Threshold` switches fail the build if line, branch, or method coverage drops
below the configured percentage. The authoritative values live in the **Unit
tests** step of [`.github/workflows/ci-deploy.yml`](../.github/workflows/ci-deploy.yml);
see the [GitHub workflow](github-workflow.md) doc.

> The comma list in `ThresholdType` is URL-encoded as `%2c` because MSBuild
> otherwise splits it into separate switches.

## Adding tests

When you add an endpoint or entity, add matching unit tests in the same pass —
see [Adding new endpoints](adding-endpoints.md) and [Adding a new
entity](adding-entities.md), which now fold testing into the workflow.
