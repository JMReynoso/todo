namespace api.Application.DTOs.Responses;

public record PersonResponse(
    int Id,
    string Name,
    string Initials,
    string Color,
    string Email,
    string? PhotoUrl,
    ScoringSettingsResponse Scoring);
