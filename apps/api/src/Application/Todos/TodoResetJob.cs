using api.Domain.Interfaces;

namespace api.Application.Todos;

/// <summary>
/// Hangfire job that keeps tasks current at each day boundary. Runs daily at
/// midnight UTC.
///
/// <para>Recurring tasks: a done task reopens once today has reached its
/// <see cref="Domain.Entities.Todo.DueOn"/>, then rolls into its next cycle
/// (StartsOn := DueOn, DueOn := StartsOn + one cadence period).</para>
///
/// <para>One-off (Once) tasks: a task left incomplete after its scheduled day
/// has passed is rolled forward onto today so it stays on the board instead of
/// receding into the past — its anchor follows the current day until it's done.</para>
/// </summary>
public class TodoResetJob(ITodoRepository todos, IScoreCache scoreCache)
{
    public async Task ExecuteAsync(CancellationToken ct = default)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var affected = new HashSet<int>();

        var recurring = await todos.GetDoneRecurringAsync(ct);
        foreach (var task in recurring)
        {
            // Skip until the due date has arrived. Legacy rows without a DueOn
            // (DueOn is null) are left untouched rather than reset blindly.
            if (task.DueOn is not DateOnly dueOn || today < dueOn) continue;
            task.Reopen();
            task.AdvanceCycle();
            foreach (var sub in task.Subtasks)
                sub.Reopen();
            affected.Add(task.OwnerId);
        }

        var oneOffs = await todos.GetIncompleteOnceAsync(ct);
        foreach (var task in oneOffs)
        {
            // Once its day has passed without completion, carry the open task
            // onto today. Still-current (or future-dated) one-offs stay put.
            if (task.StartsOn >= today) continue;
            task.RescheduleTo(today);
        }

        await todos.SaveChangesAsync(ct);

        foreach (var personId in affected)
            await scoreCache.InvalidateAsync(personId, ct);
    }
}
