# todo

## Project structure

```
apps/api/
├── src/
│   ├── Domain/          # Entities, repository interfaces, domain exceptions — no external dependencies
│   ├── Application/     # DTOs, FluentValidation validators, DI registration
│   └── Infrastructure/  # EF Core, Npgsql, Redis, Hangfire — implements Domain interfaces
├── Controllers/         # ASP.NET Core controllers
└── Program.cs           # Host bootstrap, calls AddApplication() + AddInfrastructure()
```

Dependencies flow inward: `Api → Application → Domain ← Infrastructure`

---

## Guides

- [Adding a new entity](docs/adding-entities.md)
- [Adding new endpoints](docs/adding-endpoints.md)

---

## Running locally

```bash
# Start Postgres, Redis, and Seq
docker compose -f infra/docker-compose.dev.yml up -d

# Run the API
cd apps/api
dotnet run
```

- Swagger UI: `https://localhost:7191/swagger`
- Hangfire dashboard: `https://localhost:7191/hangfire`
- Seq logs: `http://localhost:5341`
