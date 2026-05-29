using api.Domain.Enums;

namespace api.Application.DTOs.Responses;

public record TodoResponse(
    int Id,
    string Title,
    Cadence Cadence,
    bool Done,
    Priority Priority,
    string Due,
    DateOnly? DueOn,
    DateOnly? Date,
    string Notes,
    int Streak,
    PersonResponse Owner,
    PersonResponse? Assignee,
    DateTime CreatedAt,
    IReadOnlyList<string> Tags,
    IReadOnlyList<SubtaskResponse> Subtasks);
