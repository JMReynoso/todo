using api.Domain.Enums;

namespace api.Application.DTOs.Requests;

// Cadence is set at creation only (no domain setter), so it's not editable here.
public record UpdateTodoRequest(
    string Title,
    Priority Priority,
    string Due,
    DateOnly? DueOn,
    DateOnly? Date,
    string Notes,
    int? AssigneeId,
    bool Done,
    IReadOnlyList<string> Tags);
