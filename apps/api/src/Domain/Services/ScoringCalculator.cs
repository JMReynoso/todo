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
        double total = 0;

        foreach (var todo in todos.Where(t => t.Done && IsIncluded(settings, t.Cadence)))
        {
            var basePoints = BasePoints[todo.Cadence];
            var multiplier = PriorityMultiplier[todo.Priority];
            var streakBonus = todo.Streak >= settings.StreakThreshold ? 1 : 0;

            total += (basePoints + streakBonus) * multiplier;
        }

        return (int)Math.Round(total);
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
}
