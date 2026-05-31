using api.Application.DTOs.Responses;
using api.Domain.Entities;

namespace api.Application.Mappings;

public static class TodoMappings
{
    // owner and assignee are resolved and passed in by the caller (the service),
    // since a Todo only holds their ids — loading the Person crosses the aggregate.
    // owner is required; assignee is optional.
    public static TodoResponse ToResponse(this Todo todo, PersonResponse owner, PersonResponse? assignee = null) => new(
        todo.Id,
        todo.Title,
        todo.Cadence,
        todo.Done,
        todo.Priority,
        todo.StartsOn,
        todo.DueOn,
        todo.Notes,
        todo.Streak,
        owner,
        assignee,
        todo.CreatedAt,
        todo.Tags,
        todo.Subtasks.Select(subtask => subtask.ToResponse()).ToList());

    public static SubtaskResponse ToResponse(this Subtask subtask) =>
        new(subtask.Id, subtask.Title, subtask.Done, subtask.TodoId);
}
