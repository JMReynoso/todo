using api.Application.DTOs.Requests;
using api.Application.DTOs.Responses;
using api.Application.Todos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace api.Controllers;

[ApiController]
[Route("api/todos")]
public class TodoController(TodoService todos) : ControllerBase
{
    [Authorize]
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<TodoResponse>>> GetAll(CancellationToken ct)
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        return Ok(await todos.GetAllAsync(userId, ct));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<TodoResponse>> GetById(int id, CancellationToken ct)
    {
        var todo = await todos.GetByIdAsync(id, ct);
        return todo is null ? NotFound() : Ok(todo);
    }

    [Authorize]
    [HttpPost]
    public async Task<ActionResult<TodoResponse>> Create(CreateTodoRequest request, CancellationToken ct)
    {
        var ownerId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        var created = await todos.CreateAsync(request, ownerId, ct);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<TodoResponse>> Update(int id, UpdateTodoRequest request, CancellationToken ct)
    {
        var updated = await todos.UpdateAsync(id, request, ct);
        return updated is null ? NotFound() : Ok(updated);
    }

    [HttpPost("{id:int}/subtasks")]
    public async Task<ActionResult<TodoResponse>> AddSubtask(int id, CreateSubtaskRequest request, CancellationToken ct)
    {
        var updated = await todos.AddSubtaskAsync(id, request, ct);
        return updated is null ? NotFound() : Ok(updated);
    }

    [HttpPatch("{id:int}/subtasks/{subId:int}")]
    public async Task<ActionResult<TodoResponse>> ToggleSubtask(int id, int subId, ToggleSubtaskRequest request, CancellationToken ct)
    {
        var updated = await todos.ToggleSubtaskAsync(id, subId, request.Done, ct);
        return updated is null ? NotFound() : Ok(updated);
    }

    [HttpDelete("{id:int}/subtasks/{subId:int}")]
    public async Task<IActionResult> RemoveSubtask(int id, int subId, CancellationToken ct)
    {
        var updated = await todos.RemoveSubtaskAsync(id, subId, ct);
        return updated is null ? NotFound() : NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Remove(int id, CancellationToken ct)
        => await todos.RemoveAsync(id, ct) ? NoContent() : NotFound();
}
