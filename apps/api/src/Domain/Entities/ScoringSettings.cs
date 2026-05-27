namespace Todo.Domain.Entities;

public class ScoringSettings: Entity
{
    public bool IncludeDaily { get; private set; }
    public bool IncludeWeekly { get; private set; }
    public bool IncludeMonthly { get; private set; }
    public bool IncludeQuarterly { get; private set; }
    public bool IncludeOnce { get; private set; }
    public int StreakThreshold { get; private set; }

    public static ScoringSettings Create(
        bool includeDaily,
        bool includeWeekly,
        bool includeMonthly,
        bool includeQuarterly,
        bool includeOnce,
        int streakThreshold)
    {
        IncludeDaily = includeDaily;
        IncludeWeekly = includeWeekly;
        IncludeMonthly = includeMonthly;
        IncludeQuarterly = includeQuarterly;
        IncludeOnce = includeOnce;
        StreakThreshold = streakThreshold;
    }

    public void UpdateIncludeDaily(bool includeDaily) => IncludeDaily = includeDaily;
    public void UpdateIncludeWeekly(bool includeWeekly) => IncludeWeekly = includeWeekly;
    public void UpdateIncludeMonthly(bool includeMonthly) => IncludeMonthly = includeMonthly;
    public void UpdateIncludeQuarterly(bool includeQuarterly) => IncludeQuarterly = includeQuarterly;
    public void UpdateIncludeOnce(bool includeOnce) => IncludeOnce = includeOnce;
    public void UpdateStreakThreshold(int streakThreshold) => StreakThreshold = streakThreshold;
}