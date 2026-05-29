namespace api.Application.DTOs.Requests;

public record UpdateScoringSettingsRequest(
    bool IncludeDaily,
    bool IncludeWeekly,
    bool IncludeMonthly,
    bool IncludeQuarterly,
    bool IncludeOnce,
    int StreakThreshold);
