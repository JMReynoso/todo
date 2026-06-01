using api.Domain.Entities;
using api.Domain.Enums;
using api.Domain.Services;

namespace Api.UnitTests.Domain;

[TestFixture]
public class ScoringCalculatorTests
{
    // Default(): IncludeDaily/Weekly = true, Monthly/Quarterly/Once = false, StreakThreshold = 3.
    private static ScoringSettings DefaultSettings() => ScoringSettings.Default();

    private static ScoringSettings AllCadences(int streakThreshold = 3) =>
        ScoringSettings.Create(
            includeDaily: true,
            includeWeekly: true,
            includeMonthly: true,
            includeQuarterly: true,
            includeOnce: true,
            streakThreshold: streakThreshold);

    private static Todo DoneTodo(Cadence cadence, Priority priority = Priority.High, int streak = 0,
        DateOnly? completedOn = null)
    {
        var todo = Todo.Create("task", cadence, ownerId: 1);
        todo.SetPriority(priority);
        todo.Complete(completedOn ?? DateOnly.FromDateTime(DateTime.UtcNow));
        for (var i = 0; i < streak; i++) todo.IncrementStreak();
        return todo;
    }

    private static Todo OpenTodo(Cadence cadence, Priority priority = Priority.High)
    {
        var todo = Todo.Create("task", cadence, ownerId: 1);
        todo.SetPriority(priority);
        return todo;
    }

    // ── Zero cases ────────────────────────────────────────────────────────────

    [Test]
    public void Compute_NoTodos_ReturnsZero()
    {
        Assert.That(ScoringCalculator.Compute(DefaultSettings(), []), Is.Zero);
    }

    [Test]
    public void Compute_NoIncludedCadences_ReturnsZero()
    {
        // Quarterly is excluded by DefaultSettings.
        Assert.That(ScoringCalculator.Compute(DefaultSettings(), [DoneTodo(Cadence.Quarterly)]), Is.Zero);
    }

    [Test]
    public void Compute_AllIncludedTasksOpen_ReturnsZero()
    {
        Assert.That(ScoringCalculator.Compute(DefaultSettings(), [OpenTodo(Cadence.Daily)]), Is.Zero);
    }

    // ── 100 when everything is done ───────────────────────────────────────────

    [Test]
    public void Compute_SingleTaskDone_Returns100()
    {
        Assert.That(ScoringCalculator.Compute(DefaultSettings(), [DoneTodo(Cadence.Daily)]), Is.EqualTo(100));
    }

    [Test]
    public void Compute_AllTasksDone_Returns100_RegardlessOfWeights()
    {
        // Different cadences and priorities — score is still 100 when everything is done.
        var todos = new[]
        {
            DoneTodo(Cadence.Daily, Priority.Low),
            DoneTodo(Cadence.Weekly, Priority.High),
        };

        Assert.That(ScoringCalculator.Compute(DefaultSettings(), todos), Is.EqualTo(100));
    }

    [Test]
    public void Compute_AllDoneWithStreak_Returns100_NotAbove()
    {
        // Streak adds bonus to earned but the score is capped at 100.
        var todo = DoneTodo(Cadence.Daily, Priority.High, streak: 5);

        Assert.That(ScoringCalculator.Compute(DefaultSettings(), [todo]), Is.EqualTo(100));
    }

    // ── Partial completion ────────────────────────────────────────────────────

    [Test]
    public void Compute_HalfDone_EqualWeights_Returns50()
    {
        // Two Daily High tasks, one done: earned = 1*2 = 2, max = 2*2 = 4 → 50%.
        var todos = new[]
        {
            DoneTodo(Cadence.Daily, Priority.High),
            OpenTodo(Cadence.Daily, Priority.High),
        };

        Assert.That(ScoringCalculator.Compute(DefaultSettings(), todos), Is.EqualTo(50));
    }

    [Test]
    public void Compute_StreakBelowThreshold_NoBonus_StillReaches100WhenDone()
    {
        // Streak of 2 < threshold 3: no bonus. But task is done, so score = 100.
        var todo = DoneTodo(Cadence.Daily, Priority.High, streak: 2);

        Assert.That(ScoringCalculator.Compute(DefaultSettings(), [todo]), Is.EqualTo(100));
    }

    // ── Period window ─────────────────────────────────────────────────────────

    [Test]
    public void Compute_DailyTaskCompletedYesterday_NotCountedToday()
    {
        // Daily-only settings: window = today only. Task done yesterday is outside.
        var dailyOnly = ScoringSettings.Create(
            includeDaily: true, includeWeekly: false, includeMonthly: false,
            includeQuarterly: false, includeOnce: false, streakThreshold: 3);
        var yesterday = DateOnly.FromDateTime(DateTime.UtcNow).AddDays(-1);
        var todo = DoneTodo(Cadence.Daily, completedOn: yesterday);

        Assert.That(ScoringCalculator.Compute(dailyOnly, [todo]), Is.Zero);
    }

    [Test]
    public void Compute_WeeklyTaskCompletedThisWeek_IsCounted()
    {
        // Completed today — within this week's window (weekly is the longest enabled cadence).
        var todo = DoneTodo(Cadence.Weekly);

        Assert.That(ScoringCalculator.Compute(DefaultSettings(), [todo]), Is.EqualTo(100));
    }

    [Test]
    public void Compute_WeeklyTaskCompletedLastWeek_NotCounted()
    {
        // Completed 8 days ago — outside the current weekly window.
        var lastWeek = DateOnly.FromDateTime(DateTime.UtcNow).AddDays(-8);
        var todo = DoneTodo(Cadence.Weekly, completedOn: lastWeek);

        Assert.That(ScoringCalculator.Compute(DefaultSettings(), [todo]), Is.Zero);
    }

    [Test]
    public void Compute_LongestEnabledCadenceDeterminesWindow()
    {
        // Monthly is enabled: window = this month. A daily task completed earlier
        // this month is still within the monthly window and should count — whereas
        // a daily-only window (just today) would exclude it. Anchored on the 1st so
        // the date never slips into the previous month when the run lands on the 1st.
        var settings = ScoringSettings.Create(
            includeDaily: true, includeWeekly: false, includeMonthly: true,
            includeQuarterly: false, includeOnce: false, streakThreshold: 3);

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var earlierThisMonth = new DateOnly(today.Year, today.Month, 1);
        var todo = DoneTodo(Cadence.Daily, completedOn: earlierThisMonth);

        Assert.That(ScoringCalculator.Compute(settings, [todo]), Is.EqualTo(100));
    }

    // ── Once cadence ──────────────────────────────────────────────────────────

    [Test]
    public void Compute_OnceDone_NoPeriodCheck_IsCounted()
    {
        // Once tasks bypass the period window — done is done regardless of when.
        var longAgo = DateOnly.FromDateTime(DateTime.UtcNow).AddDays(-30);
        var todo = DoneTodo(Cadence.Once, completedOn: longAgo);

        Assert.That(ScoringCalculator.Compute(AllCadences(), [todo]), Is.EqualTo(100));
    }
}
