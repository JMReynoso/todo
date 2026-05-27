using api.Application.DTOs.Requests;
using api.Application.DTOs.Responses;
using api.Application.Mappings;
using api.Domain.Entities;
using api.Domain.Interfaces;
using FluentValidation;

namespace api.Application.Todos;

/// <summary>
/// Application service for Todo operations: validates incoming requests, drives
/// the domain via <see cref="ITodoRepository"/>, owns the unit-of-work boundary
/// (the repo only stages changes), and maps entities to response DTOs.
/// </summary>
public class TodoService(
    ITodoRepository todos,
    IValidator<CreateTodoRequest> createValidator,
    IValidator<UpdateTodoRequest> updateValidator,
    IValidator<CreateSubtaskRequest> subtaskValidator)
{
    public async Task<TodoResponse?> GetByIdAsync(int id, CancellationToken ct = default)
    {
        var todo = await todos.GetByIdAsync(id, ct);
        return todo?.ToResponse();
    }

    public async Task<IReadOnlyList<TodoResponse>> GetAllAsync(CancellationToken ct = default)
    {
        var all = await todos.GetAllAsync(ct);
        return all.Select(todo => todo.ToResponse()).ToList();
    }

    public async Task<TodoResponse> CreateAsync(CreateTodoRequest request, CancellationToken ct = default)
    {
        await createValidator.ValidateAndThrowAsync(request, ct);

        var todo = Todo.Create(request.Title, request.Cadence);
        await todos.AddAsync(todo, ct);
        await todos.SaveChangesAsync(ct);
        return todo.ToResponse();
    }

    public async Task<TodoResponse?> UpdateAsync(int id, UpdateTodoRequest request, CancellationToken ct = default)
    {
        await updateValidator.ValidateAndThrowAsync(request, ct);

        var todo = await todos.GetByIdAsync(id, ct);
        if (todo is null) return null;

        todo.SetTitle(request.Title);
        todo.SetPriority(request.Priority);
        todo.SetDue(request.Due);
        todo.SetDueOn(request.DueOn);
        todo.SetDate(request.Date);
        todo.SetNotes(request.Notes);
        todo.SetAssignee(request.Assignee);

        await todos.SaveChangesAsync(ct);
        return todo.ToResponse();
    }

    public async Task<TodoResponse?> AddSubtaskAsync(int todoId, CreateSubtaskRequest request, CancellationToken ct = default)
    {
        await subtaskValidator.ValidateAndThrowAsync(request, ct);

        var todo = await todos.GetByIdAsync(todoId, ct);
        if (todo is null) return null;

        todo.AddSubtask(Subtask.Create(request.Title));
        await todos.SaveChangesAsync(ct);
        return todo.ToResponse();
    }

    public async Task<bool> RemoveAsync(int id, CancellationToken ct = default)
    {
        var removed = await todos.RemoveAsync(id, ct);
        if (removed) await todos.SaveChangesAsync(ct);
        return removed;
    }
}
