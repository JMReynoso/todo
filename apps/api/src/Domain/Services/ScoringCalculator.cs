using api.Domain.Entities;
using api.Domain.Enums;

namespace api.Domain.Services;

public static class ScoringCalculator
{
    private static readonly Dictionary<Cadence, int> BasePoints = new()
    {
        [Cadence.Daily]     = 1,
        [Cadence.Weekly]    = 3,
        [Cadence.Monthly]   = 5,
        [Cadence.Quarterly] = 10,
        [Cadence.Once]      = 2,
    };

    private static readonly Dictionary<Priority, double> PriorityMultiplier = new()
    {
        [Priority.Low]  = 1.0,
        [Priority.Med]  = 1.5,
        [Priority.High] = 2.0,
    };

    public static int Compute(ScoringSettings settings, IEnumerable<Todo> todos)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var periodStart = GetPeriodStart(settings, today);
        var included = todos.Where(t => IsIncluded(settings, t.Cadence)).ToList();
        if (included.Count == 0) return 0;

        double earned = 0;
        double maxPossible = 0;

        foreach (var todo in included)
        {
            var basePoints = BasePoints[todo.Cadence];
            var multiplier = PriorityMultiplier[todo.Priority];
            maxPossible += (basePoints + 1) * multiplier;

            // Once tasks are either done or not — no period applies.
            // Recurring tasks only count if completed within the current window.
            var doneInPeriod = todo.Cadence == Cadence.Once
                ? todo.Done
                : todo.Done && todo.LastCompletedOn >= periodStart;

            if (!doneInPeriod) continue;
            var streakBonus = todo.Streak >= settings.StreakThreshold ? 1 : 0;
            earned += (basePoints + streakBonus) * multiplier;
        }

        return (int)Math.Round(earned / maxPossible * 100);
    }

    /// <summary>
    /// Returns the start of the scoring window based on the longest enabled cadence.
    /// Quarterly > Monthly > Weekly > Daily. Once tasks ignore this entirely.
    /// </summary>
    private static DateOnly GetPeriodStart(ScoringSettings settings, DateOnly today)
    {
        if (settings.IncludeQuarterly) return StartOfQuarter(today);
        if (settings.IncludeMonthly)   return new DateOnly(today.Year, today.Month, 1);
        if (settings.IncludeWeekly)    return StartOfWeek(today);
        return today; // Daily-only or Once-only — window is just today
    }

    private static bool IsIncluded(ScoringSettings settings, Cadence cadence) => cadence switch
    {
        Cadence.Daily     => settings.IncludeDaily,
        Cadence.Weekly    => settings.IncludeWeekly,
        Cadence.Monthly   => settings.IncludeMonthly,
        Cadence.Quarterly => settings.IncludeQuarterly,
        Cadence.Once      => settings.IncludeOnce,
        _                 => false,
    };

    private static DateOnly StartOfWeek(DateOnly date) =>
        date.AddDays(-(int)date.DayOfWeek); // Sunday = 0

    private static DateOnly StartOfQuarter(DateOnly date)
    {
        var startMonth = (date.Month - 1) / 3 * 3 + 1;
        return new DateOnly(date.Year, startMonth, 1);
    }
}
