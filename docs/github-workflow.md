# GitHub workflow (CI / Deploy)

A single workflow, [`.github/workflows/ci-deploy.yml`](../.github/workflows/ci-deploy.yml),
handles both continuous integration and deployment. It runs on a **self-hosted
macOS ARM64** runner.

**Triggers**
- `pull_request` → `main`: runs the **Build & Test** job (gate for merging).
- `push` → `main`: runs **Build & Test**, then **Deploy**.

```
PR to main ───────────────▶ Build & Test
push to main ─▶ Build & Test ─▶ Deploy (only on main)
```

## Job 1 — Build & Test

Runs on every PR and every push. Steps, in order:

1. **Install toolchains** — .NET SDK and `pnpm` (installed on the runner if missing).
2. **Restore & build the API** in `Release`.
3. **Unit tests** — runs `Api.UnitTests` with coverlet coverage and a coverage
   **threshold gate** (line / branch / method). The build fails if coverage
   drops below the configured percentage. See [Backend unit tests](backend-unit-tests.md).
4. **Integration tests** — exposes the Docker socket for Testcontainers, then
   runs `Api.IntegrationTests` against real Postgres/Redis containers. See
   [Backend integration tests](backend-integration-tests.md).
5. **Web** — `pnpm install`, **lint**, **unit tests with coverage** (75% gate),
   and **build**. See [Frontend unit tests](frontend-unit-tests.md).

If any step fails, the PR is red and the **Deploy** job never runs.

## Job 2 — Deploy (production **and** demo)

Runs **only on push to `main`**, after Build & Test passes. It writes
`infra/.env` from repository secrets, then brings the stack up with
`docker compose -f infra/docker-compose.prod.yml up --build -d` (after tearing
down the previous stack and clearing any stray containers on the published
ports).

Two separate web instances are built and deployed from the **same**
`apps/web` source:

| Instance | Service | Port | Backend | Built with |
|----------|---------|------|---------|------------|
| **Production** | `web` | `3100` | Talks to the real `api` (`5091`) → Postgres + Redis | normal build |
| **Demo** | `web-demo` | `3101` | **None** — runs entirely in the browser against an in-browser mock | `NEXT_PUBLIC_DEMO=true` build arg |

Supporting services deployed alongside: `api` (`5091`), `postgres`, and `redis`.
The **demo has no service dependencies** — it's a frontend-only build with no
API, database, or auth (see [demo mode in the web README](../apps/web/README.md#demo-mode)
and `apps/web/app/_lib/demo/`).

### Why both come from one repo

Because `web` and `web-demo` build from the same source and the same
`Dockerfile.prod` — differing only by the `NEXT_PUBLIC_DEMO` build arg — every
change merged to `main` is rebuilt into **both** instances on the next deploy.
Shared frontend changes (UI, components, client logic) therefore appear on
3100 and 3101 alike. The one thing to keep in sync by hand is the demo's mock
backend (`apps/web/app/_lib/demo/store.ts`): a change to the **API contract**
only affects production automatically; the mock must be updated to match, or
the demo will diverge for that feature.

### Cleanup

After deploy the workflow prunes unused images and removes the generated
`infra/.env`. Stray containers on ports `5091`, `3100`, and `3101` are
force-removed before the new stack comes up so the ports are free.
