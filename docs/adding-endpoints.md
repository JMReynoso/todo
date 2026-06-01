# Adding new endpoints

Add a controller under `apps/api/Controllers/`. Inject the repository interface — never reference EF Core or Infrastructure types directly from a controller.

`apps/api/Controllers/TodoListsController.cs`
```csharp
using api.Application.Features.TodoLists;
using api.Domain.Entities;
using api.Domain.Interfaces;
using FluentValidation;
using Microsoft.AspNetCore.Mvc;

namespace api.Controllers;

[ApiController]
[Route("[controller]")]
public class TodoListsController(
    ITodoListRepository repository,
    IValidator<CreateTodoListRequest> validator) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var lists = await repository.GetAllAsync(ct);
        return Ok(lists);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var list = await repository.GetByIdAsync(id, ct);
        return list is null ? NotFound() : Ok(list);
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateTodoListRequest request, CancellationToken ct)
    {
        var validation = await validator.ValidateAsync(request, ct);
        if (!validation.IsValid)
            return BadRequest(validation.Errors);

        var list = TodoList.Create(request.Name);
        await repository.AddAsync(list, ct);
        await repository.SaveChangesAsync(ct);

        return CreatedAtAction(nameof(GetById), new { id = list.Id }, list);
    }
}
```

## Test the endpoint

Adding an endpoint isn't done until it's tested. Add tests in the same change:

- **Controller unit test** (`apps/api/test/unit/Controllers/`) — assert the HTTP
  result mapping (`Ok` / `NotFound` / `Created` / `NoContent`). The controller
  takes the concrete service backed by **mocked repositories**, so no database is
  involved. See [Backend unit tests](backend-unit-tests.md).
- **Service unit test** (`apps/api/test/unit/Services/`) — if the endpoint adds
  application logic, cover the new branches with the repository/cache interfaces
  mocked and the real validators.
- **Integration test** (`apps/api/test/integration/`) — if the endpoint relies on
  new query/persistence behavior (filters, FK rules, cascades), prove it against
  the real Postgres/Redis stack. See [Backend integration tests](backend-integration-tests.md).

The CI **Build & Test** job runs all of these and enforces the coverage
threshold, so untested code will fail the PR — see the [GitHub workflow](github-workflow.md).
