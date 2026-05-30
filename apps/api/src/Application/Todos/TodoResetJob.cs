using api.Domain.Enums;
using api.Domain.Interfaces;

namespace api.Application.Todos;

/// <summary>
/// Hangfire job that resets recurring tasks whose cadence period has rolled
/// over since they were last completed. Runs daily at midnight UTC.
/// </summary>
public class TodoResetJob(ITodoRepository todos, IScoreCache scoreCache)
{
    public async Task ExecuteAsync(CancellationToken ct = default)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var tasks = await todos.GetDoneRecurringAsync(ct);
        var affected = new HashSet<int>();

        foreach (var task in tasks)
        {
            if (!IsPeriodExpired(task.Cadence, task.LastCompletedOn, today)) continue;
            task.Reopen();
            task.SetDueOn(AdvanceDueOn(task.DueOn, task.Cadence));
            foreach (var sub in task.Subtasks)
                sub.Reopen();
            affected.Add(task.OwnerId);
            if (task.AssigneeId is int aId) affected.Add(aId);
        }

        await todos.SaveChangesAsync(ct);

        foreach (var personId in affected)
            await scoreCache.InvalidateAsync(personId, ct);
    }

    private static bool IsPeriodExpired(Cadence cadence, DateOnly? lastCompletedOn, DateOnly today)
    {
        if (lastCompletedOn is not DateOnly completed) return false;
        return cadence switch
        {
            Cadence.Daily => completed < today,
            Cadence.Weekly => completed < StartOfWeek(today),
            Cadence.Monthly => completed < new DateOnly(today.Year, today.Month, 1),
            Cadence.Quarterly => completed < StartOfQuarter(today),
            _ => false,
        };
    }

    private static DateOnly? AdvanceDueOn(DateOnly? dueOn, Cadence cadence) =>
        dueOn is not DateOnly date ? null : cadence switch
        {
            Cadence.Daily => date.AddDays(1),
            Cadence.Weekly => date.AddDays(7),
            Cadence.Monthly => date.AddMonths(1),
            Cadence.Quarterly => date.AddMonths(3),
            _ => dueOn,
        };

    private static DateOnly StartOfWeek(DateOnly date) =>
        date.AddDays(-(int)date.DayOfWeek); // Sunday = 0

    private static DateOnly StartOfQuarter(DateOnly date)
    {
        var startMonth = ((date.Month - 1) / 3) * 3 + 1;
        return new DateOnly(date.Year, startMonth, 1);
    }
}
