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

Run the EF Core migration from `apps/api/`:
```bash
dotnet ef migrations add AddTodoList --project src/Infrastructure --startup-project .
dotnet ef database update --project src/Infrastructure --startup-project .
```

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
