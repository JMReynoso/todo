using api.Domain.Interfaces;

namespace api.Application.Todos;

/// <summary>
/// Hangfire job that resets recurring tasks once their due date has arrived.
/// Runs daily at midnight UTC. A done task reopens when today has reached its
/// <see cref="Domain.Entities.Todo.DueOn"/>, then rolls into its next cycle
/// (StartsOn := DueOn, DueOn := StartsOn + one cadence period).
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
            // Skip until the due date has arrived. Legacy rows without a DueOn
            // (DueOn is null) are left untouched rather than reset blindly.
            if (task.DueOn is not DateOnly dueOn || today < dueOn) continue;
            task.Reopen();
            task.AdvanceCycle();
            foreach (var sub in task.Subtasks)
                sub.Reopen();
            affected.Add(task.OwnerId);
        }

        await todos.SaveChangesAsync(ct);

        foreach (var personId in affected)
            await scoreCache.InvalidateAsync(personId, ct);
    }
}
