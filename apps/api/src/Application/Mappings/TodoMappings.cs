using api.Application.DTOs.Responses;
using api.Domain.Entities;

namespace api.Application.Mappings;

public static class TodoMappings
{
    // assignee is resolved and passed in by the caller (the service), since a
    // Todo only holds AssigneeId — loading the Person crosses the aggregate.
    public static TodoResponse ToResponse(this Todo todo, PersonResponse? assignee = null) => new(
        todo.Id,
        todo.Title,
        todo.Cadence,
        todo.Done,
        todo.Priority,
        todo.Due,
        todo.DueOn,
        todo.Date,
        todo.Notes,
        todo.Streak,
        assignee,
        todo.CreatedAt,
        todo.Tags,
        todo.Subtasks.Select(subtask => subtask.ToResponse()).ToList());

    public static SubtaskResponse ToResponse(this Subtask subtask) =>
        new(subtask.Id, subtask.Title, subtask.Done, subtask.TodoId);
}
