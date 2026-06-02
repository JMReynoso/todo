using api.Application.DTOs.Requests;
using api.Application.DTOs.Responses;
using api.Application.Mappings;
using api.Domain.Entities;
using api.Domain.Exceptions;
using api.Domain.Interfaces;
using FluentValidation;

namespace api.Application.Todos;

/// <summary>
/// Application service for Todo operations: validates incoming requests, drives
/// the domain via <see cref="ITodoRepository"/>, owns the unit-of-work boundary
/// (the repo only stages changes), and maps entities to response DTOs. Resolves
/// the assigned <see cref="Person"/> (held by id on the Todo) via the person repo.
/// </summary>
public class TodoService(
    ITodoRepository todos,
    IPersonRepository persons,
    IScoreCache scoreCache,
    IValidator<CreateTodoRequest> createValidator,
    IValidator<UpdateTodoRequest> updateValidator,
    IValidator<CreateSubtaskRequest> subtaskValidator)
{
    public async Task<TodoResponse?> GetByIdAsync(int id, CancellationToken ct = default)
    {
        var todo = await todos.GetByIdAsync(id, ct);
        return todo is null ? null : await ToResponseAsync(todo, ct);
    }

    public async Task<IReadOnlyList<TodoResponse>> GetAllAsync(int userId, CancellationToken ct = default)
    {
        var all = await todos.GetAllForUserAsync(userId, ct);

        // Resolve owners and assignees in one batch to avoid an N+1 of per-todo lookups.
        var people = (await persons.GetAllAsync(ct)).ToDictionary(person => person.Id);

        return all.Select(todo =>
        {
            // Owner is a required FK, so the person is guaranteed to be present.
            var owner = people[todo.OwnerId].ToResponse();
            var assignee = todo.AssigneeId is int personId && people.TryGetValue(personId, out var person)
                ? person.ToResponse()
                : null;
            return todo.ToResponse(owner, assignee);
        }).ToList();
    }

    public async Task<TodoResponse> CreateAsync(CreateTodoRequest request, int ownerId, CancellationToken ct = default)
    {
        await createValidator.ValidateAndThrowAsync(request, ct);

        var owner = await persons.GetByIdAsync(ownerId, ct)
            ?? throw new DomainException($"Owner (person {ownerId}) not found.");

        var todo = Todo.Create(request.Title, request.Cadence, owner.Id);

        todo.SetPriority(request.Priority);
        todo.SetStartsOn(request.StartsOn);
        todo.SetDueOn(request.DueOn);
        todo.SetNotes(request.Notes);
        todo.SetTags(request.Tags ?? []);

        foreach (var title in request.Subtasks ?? [])
            if (!string.IsNullOrWhiteSpace(title))
                todo.AddSubtask(Subtask.Create(title));

        if (request.AssigneeId is int assigneeId)
            todo.AssignTo(assigneeId);

        await todos.AddAsync(todo, ct);
        await todos.SaveChangesAsync(ct);
        return await ToResponseAsync(todo, ct);
    }

    public async Task<TodoResponse?> UpdateAsync(int id, UpdateTodoRequest request, CancellationToken ct = default)
    {
        await updateValidator.ValidateAndThrowAsync(request, ct);

        var todo = await todos.GetByIdAsync(id, ct);
        if (todo is null) return null;

        todo.SetTitle(request.Title);
        todo.SetCadence(request.Cadence);
        todo.SetPriority(request.Priority);
        todo.SetStartsOn(request.StartsOn);
        todo.SetDueOn(request.DueOn);
        todo.SetNotes(request.Notes);
        todo.SetTags(request.Tags ?? []);

        var doneChanged = request.Done != todo.Done;
        if (request.Done) todo.Complete(); else todo.Reopen();

        if (request.AssigneeId is int assigneeId)
            todo.AssignTo(assigneeId);
        else
            todo.Unassign();

        await todos.SaveChangesAsync(ct);

        if (doneChanged)
            await scoreCache.InvalidateAsync(todo.OwnerId, ct);

        return await ToResponseAsync(todo, ct);
    }

    public async Task<TodoResponse?> AddSubtaskAsync(int todoId, CreateSubtaskRequest request, CancellationToken ct = default)
    {
        await subtaskValidator.ValidateAndThrowAsync(request, ct);

        var todo = await todos.GetByIdAsync(todoId, ct);
        if (todo is null) return null;

        todo.AddSubtask(Subtask.Create(request.Title));
        await todos.SaveChangesAsync(ct);
        return await ToResponseAsync(todo, ct);
    }

    public async Task<TodoResponse?> ToggleSubtaskAsync(int todoId, int subId, bool done, CancellationToken ct = default)
    {
        var todo = await todos.GetByIdAsync(todoId, ct);
        if (todo is null) return null;

        var sub = todo.Subtasks.FirstOrDefault(s => s.Id == subId);
        if (sub is null) return null;

        if (done) sub.Complete(); else sub.Reopen();
        await todos.SaveChangesAsync(ct);
        return await ToResponseAsync(todo, ct);
    }

    public async Task<TodoResponse?> RemoveSubtaskAsync(int todoId, int subId, CancellationToken ct = default)
    {
        var todo = await todos.GetByIdAsync(todoId, ct);
        if (todo is null) return null;

        var sub = todo.Subtasks.FirstOrDefault(s => s.Id == subId);
        if (sub is null) return null;

        todo.RemoveSubtask(sub);
        await todos.SaveChangesAsync(ct);
        return await ToResponseAsync(todo, ct);
    }

    public async Task<bool> RemoveAsync(int id, CancellationToken ct = default)
    {
        var removed = await todos.RemoveAsync(id, ct);
        if (removed) await todos.SaveChangesAsync(ct);
        return removed;
    }

    // Maps a single todo, resolving its owner and assignee Persons across the aggregate.
    private async Task<TodoResponse> ToResponseAsync(Todo todo, CancellationToken ct)
    {
        // Owner is a required FK, so the person is guaranteed to exist.
        var owner = (await persons.GetByIdAsync(todo.OwnerId, ct))!.ToResponse();

        PersonResponse? assignee = null;
        if (todo.AssigneeId is int personId)
        {
            var person = await persons.GetByIdAsync(personId, ct);
            assignee = person?.ToResponse();
        }
        return todo.ToResponse(owner, assignee);
    }
}
