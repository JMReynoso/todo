using api.Domain.Entities;
using api.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace api.Infrastructure.Persistence;

/// <summary>
/// Idempotent dev seed. Bails if any Persons already exist, so it's safe to
/// call on every startup. Schema changes still belong in migrations.
/// </summary>
public static class Seeder
{
    public static async Task SeedAsync(AppDbContext db, CancellationToken ct = default)
    {
        if (await db.Persons.AnyAsync(ct)) return;

        // Wrap both saves so a mid-seed failure can't leave a half-populated
        // state that future runs would skip past via the AnyAsync gate.
        await using var tx = await db.Database.BeginTransactionAsync(ct);

        var (alice, bob) = SeedPersons(db);
        await db.SaveChangesAsync(ct); // assign IDs before todos reference them

        SeedTodos(db, alice.Id, bob.Id);
        await db.SaveChangesAsync(ct);

        await tx.CommitAsync(ct);
    }

    private static (Person alice, Person bob) SeedPersons(AppDbContext db)
    {
        var alice = Person.Create("Alice Chen", "AC", "#7C3AED", "alice@example.com");
        alice.SetPasswordHash(BCrypt.Net.BCrypt.HashPassword("alice123"));

        var bob = Person.Create("Bob Reyes", "BR", "#0EA5E9", "bob@example.com");
        bob.SetPasswordHash(BCrypt.Net.BCrypt.HashPassword("bob123"));
        bob.ReplaceScoring(ScoringSettings.Create(
            includeDaily: true,
            includeWeekly: true,
            includeMonthly: false,
            includeQuarterly: false,
            includeOnce: false,
            streakThreshold: 5));

        db.Persons.AddRange(alice, bob);
        return (alice, bob);
    }

    private static void SeedTodos(AppDbContext db, int aliceId, int bobId)
    {
        var once = Todo.Create("Renew passport", Cadence.Once, aliceId);
        once.SetDueOn(DateOnly.FromDateTime(DateTime.UtcNow.AddMonths(3)));
        once.SetPriority(Priority.High);
        once.AssignTo(aliceId);
        AddRandomSubtasks(once,
            "Locate current passport",
            "Print application",
            "Get photo taken",
            "Schedule appointment",
            "Pay processing fee");

        var daily = Todo.Create("Morning standup", Cadence.Daily, aliceId);
        daily.SetDue("9:00a");
        daily.AssignTo(aliceId);
        daily.IncrementStreak();
        daily.IncrementStreak();
        daily.IncrementStreak();
        AddRandomSubtasks(daily,
            "Review yesterday's work",
            "Surface blockers",
            "Check calendar");

        // Owned by Alice (she created it) but assigned to Bob — shows owner != assignee.
        var weekly = Todo.Create("Weekly groceries", Cadence.Weekly, aliceId);
        weekly.SetDue("Sat");
        weekly.SetPriority(Priority.Low);
        weekly.AssignTo(bobId);
        weekly.AddTag("errand");
        AddRandomSubtasks(weekly,
            "Produce",
            "Pantry",
            "Frozen",
            "Dairy",
            "Cleaning supplies");

        var monthly = Todo.Create("Pay rent", Cadence.Monthly, bobId);
        monthly.SetDue("1st");
        monthly.SetPriority(Priority.High);
        monthly.AssignTo(bobId);
        AddRandomSubtasks(monthly,
            "Transfer from savings",
            "Confirm landlord receipt",
            "Update budget sheet");

        var quarterly = Todo.Create("File quarterly taxes", Cadence.Quarterly, aliceId);
        quarterly.SetPriority(Priority.High);
        quarterly.SetNotes("Estimated payment due to IRS.");
        quarterly.AssignTo(aliceId);
        AddRandomSubtasks(quarterly,
            "Reconcile invoices",
            "Calculate estimated tax",
            "Submit Form 1040-ES",
            "File state estimate");

        db.Todos.AddRange(once, daily, weekly, monthly, quarterly);
    }

    // Picks 0-3 distinct subtasks from the supplied pool and adds them.
    private static void AddRandomSubtasks(Todo todo, params string[] pool)
    {
        var count = Random.Shared.Next(0, 4); // 0..3 inclusive
        if (count == 0) return;

        var picks = pool
            .OrderBy(_ => Random.Shared.Next())
            .Take(Math.Min(count, pool.Length));

        foreach (var title in picks)
            todo.AddSubtask(Subtask.Create(title));
    }
}
