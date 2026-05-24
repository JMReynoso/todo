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
