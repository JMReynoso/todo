namespace api.Domain.Entities;

/// <summary>
/// Per-user scoring configuration. Owned by <see cref="Person"/> — has no
/// identity of its own; EF Core stores it as columns alongside the parent.
/// </summary>
public class ScoringSettings
{
    public bool IncludeDaily { get; private set; }
    public bool IncludeWeekly { get; private set; }
    public bool IncludeMonthly { get; private set; }
    public bool IncludeQuarterly { get; private set; }
    public bool IncludeOnce { get; private set; }
    public int StreakThreshold { get; private set; }

    private ScoringSettings() { }

    public static ScoringSettings Create(
        bool includeDaily,
        bool includeWeekly,
        bool includeMonthly,
        bool includeQuarterly,
        bool includeOnce,
        int streakThreshold) =>
        new()
        {
            IncludeDaily = includeDaily,
            IncludeWeekly = includeWeekly,
            IncludeMonthly = includeMonthly,
            IncludeQuarterly = includeQuarterly,
            IncludeOnce = includeOnce,
            StreakThreshold = streakThreshold,
        };

    /// <summary>Sensible defaults for a newly created person.</summary>
    public static ScoringSettings Default() =>
        new()
        {
            IncludeDaily = true,
            IncludeWeekly = true,
            IncludeMonthly = false,
            IncludeQuarterly = false,
            IncludeOnce = false,
            StreakThreshold = 3,
        };

    public void UpdateIncludeDaily(bool includeDaily) => IncludeDaily = includeDaily;
    public void UpdateIncludeWeekly(bool includeWeekly) => IncludeWeekly = includeWeekly;
    public void UpdateIncludeMonthly(bool includeMonthly) => IncludeMonthly = includeMonthly;
    public void UpdateIncludeQuarterly(bool includeQuarterly) => IncludeQuarterly = includeQuarterly;
    public void UpdateIncludeOnce(bool includeOnce) => IncludeOnce = includeOnce;
    public void UpdateStreakThreshold(int streakThreshold) => StreakThreshold = streakThreshold;
}
