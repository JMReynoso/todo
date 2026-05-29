namespace api.Application.DTOs.Responses;

public record ScoringSettingsResponse(
    bool IncludeDaily,
    bool IncludeWeekly,
    bool IncludeMonthly,
    bool IncludeQuarterly,
    bool IncludeOnce,
    int StreakThreshold);
