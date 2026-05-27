using api.Application.DTOs.Responses;
using api.Domain.Entities;

namespace api.Application.Mappings;

public static class PersonMappings
{
    public static PersonResponse ToResponse(this Person person) => new(
        person.Id,
        person.Name,
        person.Initials,
        person.Color,
        person.Email,
        person.PhotoUrl,
        person.Scoring.ToResponse());

    public static ScoringSettingsResponse ToResponse(this ScoringSettings scoring) => new(
        scoring.IncludeDaily,
        scoring.IncludeWeekly,
        scoring.IncludeMonthly,
        scoring.IncludeQuarterly,
        scoring.IncludeOnce,
        scoring.StreakThreshold);
}
