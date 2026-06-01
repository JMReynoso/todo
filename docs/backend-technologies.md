# Backend technologies & why

The API (`apps/api`) is a **.NET 10** ASP.NET Core service laid out in clean
architecture — `Domain → Application → Controllers` with `Infrastructure`
implementing the Domain's interfaces. Dependencies flow inward, so the core
domain has no knowledge of EF Core, Postgres, or the web framework.

This document lists the main technologies and the reason each was chosen.

## Web & API

| Tech | Role | Why |
|------|------|-----|
| **ASP.NET Core (.NET 10)** | HTTP API host, DI, routing | First-class, long-term-supported framework with built-in dependency injection, configuration, and a fast Kestrel server. |
| **Swagger / Swashbuckle** (`AddSwaggerGen`) | Interactive API docs at `/swagger` | Generates live, explorable documentation from the controllers so the contract is always in sync with the code. |
| **ProblemDetails + `GlobalExceptionHandler`** | Error shaping | Maps anticipated failures (validation, domain rule violations, bad uploads) to RFC-7807 `400` responses instead of leaking `500`s, giving the frontend a consistent error body. |

## Persistence

| Tech | Role | Why |
|------|------|-----|
| **PostgreSQL** | Primary datastore | Mature, reliable relational database; the same image is used in dev, tests (Testcontainers), and prod. |
| **Entity Framework Core 10** | ORM, migrations | Lets the Domain stay POCO-based while EF handles SQL, change tracking, and schema migrations. Migrations are applied on startup via `MigrateAsync()`, so every environment self-heals to the latest schema. |
| **Npgsql** (`Npgsql.EntityFrameworkCore.PostgreSQL`) | Postgres provider for EF | The standard, well-maintained Postgres driver for .NET. |
| **NodaTime** + **Npgsql.NodaTime** | Date/time modeling | Explicit, unambiguous date/time types (e.g. `DateOnly`-style anchors for cadence math) that map cleanly onto Postgres temporal columns and avoid `DateTime` Kind pitfalls. |

## Caching & background work

| Tech | Role | Why |
|------|------|-----|
| **Redis** (`StackExchange.Redis`) | Score cache (`IScoreCache` → `RedisScoreCache`) | Per-person scores are expensive to recompute, so they're cached with an end-of-day TTL and invalidated when a task's done-state changes. |
| **Hangfire** (`Hangfire.AspNetCore`, `Hangfire.PostgreSql`) | Recurring jobs + dashboard at `/hangfire` | Runs the daily `TodoResetJob` (rolls recurring tasks into their next cycle, reschedules incomplete one-offs). Postgres-backed storage means no extra infrastructure beyond the database we already run. |

## Auth & security

| Tech | Role | Why |
|------|------|-----|
| **JWT bearer auth** (`Microsoft.AspNetCore.Authentication.JwtBearer`, `System.IdentityModel.Tokens.Jwt`) | Stateless authentication | Tokens carry the person id as a claim, so protected endpoints don't need server-side session storage. |
| **BCrypt.Net-Next** | Password hashing | Adaptive, salted hashing designed for passwords — never store or compare plaintext. |

## Media

| Tech | Role | Why |
|------|------|-----|
| **SixLabors.ImageSharp** | Profile photo processing | Cross-platform, dependency-free image decoding/resizing for uploaded avatars (no native libgd/ImageMagick needed). See [profile-picture-storage.md](profile-picture-storage.md). |

## Validation & logging

| Tech | Role | Why |
|------|------|-----|
| **FluentValidation** | Request validation | Keeps validation rules in dedicated, testable classes (auto-registered via `AddValidatorsFromAssembly`) instead of scattering checks through controllers/services. |
| **Serilog** | Structured logging | Structured, sink-agnostic logging; writes to the console and to **Seq** in development for queryable logs. |

## Testing

| Tech | Role | Why |
|------|------|-----|
| **NUnit** | Test framework (unit + integration) | Standard, mature runner used across both test projects. |
| **Moq** | Mocking (unit tests) | Fakes repository/cache interfaces so services and controllers can be tested in isolation. |
| **Testcontainers** (`Testcontainers.PostgreSql`, `Testcontainers.Redis`) | Real infra for integration tests | Spins up throwaway Postgres/Redis containers matching the prod images, so the persistence layer is tested against the real engines rather than an in-memory fake. |
| **coverlet** | Coverage measurement | Produces Cobertura coverage and enforces the CI threshold on the unit tests. |

See also: [Backend unit tests](backend-unit-tests.md), [Backend integration
tests](backend-integration-tests.md), and the [GitHub workflow](github-workflow.md).
