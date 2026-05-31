using api.Domain.Enums;

namespace api.Application.DTOs.Requests;

public record CreateTodoRequest(
    string Title,
    Cadence Cadence,
    DateOnly StartsOn,
    Priority Priority = Priority.Med,
    DateOnly? DueOn = null,
    string Notes = "",
    int? AssigneeId = null,
    IReadOnlyList<string>? Tags = null,
    IReadOnlyList<string>? Subtasks = null);
