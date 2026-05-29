# Adding a new entity

Work from the inside out: Domain → Infrastructure → Application → Api.

## 1. Domain — define the entity and repository contract

`apps/api/src/Domain/Entities/TodoList.cs`
```csharp
namespace api.Domain.Entities;

public class TodoList : Entity
{
    public string Name { get; private set; } = string.Empty;

    private TodoList() { }

    public static TodoList Create(string name)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name);
        return new TodoList { Name = name };
    }

    public void Rename(string name)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name);
        Name = name;
    }
}
```

`apps/api/src/Domain/Interfaces/ITodoListRepository.cs`
```csharp
namespace api.Domain.Interfaces;

public interface ITodoListRepository
{
    Task<TodoList?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<IReadOnlyList<TodoList>> GetAllAsync(CancellationToken ct = default);
    Task AddAsync(TodoList list, CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);
}
```

## 2. Infrastructure — EF Core configuration and repository implementation

`apps/api/src/Infrastructure/Persistence/Configurations/TodoListConfiguration.cs`
```csharp
using api.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace api.Infrastructure.Persistence.Configurations;

public class TodoListConfiguration : IEntityTypeConfiguration<TodoList>
{
    public void Configure(EntityTypeBuilder<TodoList> builder)
    {
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Name).IsRequired().HasMaxLength(200);
    }
}
```

> `AppDbContext` calls `ApplyConfigurationsFromAssembly` so this is picked up automatically — no changes to `AppDbContext` needed.

Add a `DbSet` to `AppDbContext`:

`apps/api/src/Infrastructure/Persistence/AppDbContext.cs`
```csharp
public DbSet<TodoList> TodoLists => Set<TodoList>();
```

`apps/api/src/Infrastructure/Repositories/TodoListRepository.cs`
```csharp
using api.Domain.Entities;
using api.Domain.Interfaces;
using api.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace api.Infrastructure.Repositories;

public class TodoListRepository(AppDbContext db) : ITodoListRepository
{
    public Task<TodoList?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        db.TodoLists.FirstOrDefaultAsync(x => x.Id == id, ct);

    public async Task<IReadOnlyList<TodoList>> GetAllAsync(CancellationToken ct = default) =>
        await db.TodoLists.ToListAsync(ct);

    public async Task AddAsync(TodoList list, CancellationToken ct = default) =>
        await db.TodoLists.AddAsync(list, ct);

    public Task SaveChangesAsync(CancellationToken ct = default) =>
        db.SaveChangesAsync(ct);
}
```

Register the repository in `Infrastructure/DependencyInjection.cs`:
```csharp
services.AddScoped<ITodoListRepository, TodoListRepository>();
```

### Add the migration

The EF CLI is a one-time install if you don't already have it:
```bash
dotnet tool install --global dotnet-ef
```

Generate the migration from `apps/api/`. `src/Infrastructure` holds the
`AppDbContext`; `.` (the `api` project) is the startup project that wires up DI:
```bash
dotnet ef migrations add AddTodoList --project src/Infrastructure --startup-project . --output-dir Persistence/Migrations --namespace api.Infrastructure.Persistence.Migrations
```

`--output-dir` is resolved relative to `--project`, so the files land in
`src/Infrastructure/Persistence/Migrations` (next to `Configurations`).
`--namespace` is set explicitly because the project has no `RootNamespace`
override — without it the generated classes would be `Infrastructure.Persistence.Migrations`
instead of matching the `api.Infrastructure.*` convention used everywhere else.

This only writes the migration files — it does **not** touch the database, so
Postgres doesn't need to be running. You do **not** run `dotnet ef database
update`: `Program.cs` calls `db.Database.MigrateAsync()` on startup, so the app
applies any pending migrations itself in every environment.

> **Commit the generated `Persistence/Migrations/` files.** This is required for
> production: `Dockerfile.prod` builds from source, so the migration must exist
> at build time to be compiled into the image — `MigrateAsync()` can only apply
> what's baked in. After adding a migration, rebuild the prod image
> (`docker compose -f infra/docker-compose.prod.yml up --build`), not just `up`,
> or the container runs stale code without the new migration.

## 3. Application — DTOs and validators

`apps/api/src/Application/Features/TodoLists/CreateTodoListRequest.cs`
```csharp
namespace api.Application.Features.TodoLists;

public record CreateTodoListRequest(string Name);
```

`apps/api/src/Application/Features/TodoLists/CreateTodoListRequestValidator.cs`
```csharp
using FluentValidation;

namespace api.Application.Features.TodoLists;

public class CreateTodoListRequestValidator : AbstractValidator<CreateTodoListRequest>
{
    public CreateTodoListRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
    }
}
```

> Validators are scanned automatically by `AddValidatorsFromAssembly` in `Application/DependencyInjection.cs` — no registration needed.
