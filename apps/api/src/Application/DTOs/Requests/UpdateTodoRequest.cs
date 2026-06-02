using api.Domain.Enums;

namespace api.Application.DTOs.Requests;

public record UpdateTodoRequest(
    string Title,
    Cadence Cadence,
    Priority Priority,
    DateOnly StartsOn,
    DateOnly? DueOn,
    string Notes,
    int? AssigneeId,
    bool Done,
    IReadOnlyList<string> Tags);
