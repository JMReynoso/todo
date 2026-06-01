# todo

## Project structure

### `apps/api` — .NET backend (clean architecture)

```
apps/api/
├── src/
│   ├── Domain/          # Entities, interfaces, domain services/exceptions — no external dependencies
│   ├── Application/     # Services, DTOs, FluentValidation validators, mappings, DI registration
│   ├── Controllers/     # ASP.NET Core controllers
│   └── Infrastructure/  # EF Core, Npgsql, Redis, Hangfire, photo storage — implements Domain interfaces
├── test/
│   ├── unit/            # NUnit + Moq unit tests (services, controllers, domain)
│   └── integration/     # Testcontainers (Postgres/Redis) integration tests
├── Program.cs           # Host bootstrap: AddApplication() + AddInfrastructure(), migrations, static files
└── todo.slnx            # Solution
```

Dependencies flow inward: `Api → Application → Domain ← Infrastructure`

### `apps/web` — Next.js (App Router) frontend

```
apps/web/
├── app/
│   ├── _components/     # UI components: atoms, composer, detail, rows, settings, views
│   ├── _context/        # React contexts (Todo, Settings, Mobile)
│   ├── _data/           # constants, seed data
│   ├── _hooks/          # custom hooks (useIsMobile, useResolvedPeople, …)
│   ├── _lib/            # helpers (dates, history, uid)
│   ├── _types.ts        # shared TypeScript types
│   ├── layout.tsx       # root layout
│   ├── page.tsx         # main view
│   ├── globals.css      # Tailwind styles
│   └── performance/     # /performance route
├── public/              # static assets
├── next.config.ts
├── tsconfig.json
└── package.json
```

---

## Documentation

- [Backend technologies & why](docs/backend-technologies.md)

**Testing**
- [Backend unit tests](docs/backend-unit-tests.md)
- [Backend integration tests](docs/backend-integration-tests.md)
- [Frontend unit tests](docs/frontend-unit-tests.md)

**Operations**
- [GitHub workflow (CI / Deploy)](docs/github-workflow.md) — production + demo instances

**Guides**
- [Adding a new entity](docs/adding-entities.md)
- [Adding new endpoints](docs/adding-endpoints.md)
- [Profile picture storage](docs/profile-picture-storage.md)

---

## Running locally

```bash
# Start infrastructure (Postgres, Redis, Seq)
docker compose -f infra/docker-compose.dev.yml up -d postgres redis seq

# Run the API
cd apps/api
dotnet run

# Run the web app (in another terminal)
cd apps/web
pnpm install
pnpm dev
```

- Swagger UI: `https://localhost:7191/swagger`
- Hangfire dashboard: `https://localhost:7191/hangfire`
- Seq logs: `http://localhost:5341`
- Frontend: `http://localhost:3000` (when run via the dev compose instead of `pnpm dev`, it's exposed at `http://localhost:3100`)
