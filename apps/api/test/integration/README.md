# Integration tests

Reserved for integration tests that exercise the app against real dependencies
(PostgreSQL, Redis) rather than mocks — e.g. repositories against a throwaway
database, `RedisScoreCache` against a real Redis, or full HTTP round-trips via
`WebApplicationFactory`.

Nothing here yet. The unit tests live in [`../unit`](../unit).

Suggested setup when these are added:
- A separate `Api.IntegrationTests.csproj` project in this folder.
- [Testcontainers](https://dotnet.testcontainers.org/) to spin up disposable
  Postgres/Redis containers per test run.
- `Microsoft.AspNetCore.Mvc.Testing` (`WebApplicationFactory<Program>`) for
  end-to-end controller tests through the real pipeline.
