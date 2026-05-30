using api.Domain.Enums;

namespace api.Application.DTOs.Requests;

public record CreateTodoRequest(
    string Title,
    Cadence Cadence,
    Priority Priority = Priority.Med,
    string Due = "",
    DateOnly? DueOn = null,
    DateOnly? Date = null,
    string Notes = "",
    int? AssigneeId = null,
    IReadOnlyList<string>? Tags = null,
    IReadOnlyList<string>? Subtasks = null);
