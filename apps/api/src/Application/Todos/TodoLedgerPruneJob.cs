using api.Domain.Interfaces;

namespace api.Application.Todos;

/// <summary>
/// Hangfire job that keeps each task's per-day completion ledger
/// (<see cref="Domain.Entities.Todo.CompletedDates"/>) bounded. Runs yearly and
/// drops any completed date older than the retention window, so the ledger can't
/// grow without limit while still leaving a full two years of history for the
/// calendar to draw on.
/// </summary>
public class TodoLedgerPruneJob(ITodoRepository todos)
{
    /// <summary>Completed dates older than this many months are pruned.</summary>
    public const int RetentionMonths = 24;

    public async Task ExecuteAsync(CancellationToken ct = default)
    {
        var cutoff = DateOnly.FromDateTime(DateTime.UtcNow).AddMonths(-RetentionMonths);

        var all = await todos.GetAllAsync(ct);

        var changed = false;
        foreach (var task in all)
            changed |= task.PruneCompletedDatesBefore(cutoff);

        // Only touch the database when something was actually trimmed.
        if (changed) await todos.SaveChangesAsync(ct);
    }
}
