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

    private static Todo DoneTodo(Cadence cadence, Priority priority = Priority.High, int streak = 0)
    {
        var todo = Todo.Create("task", cadence, ownerId: 1);
        todo.SetPriority(priority);
        todo.Complete();
        for (var i = 0; i < streak; i++) todo.IncrementStreak();
        return todo;
    }

    [Test]
    public void Compute_NoTodos_ReturnsZero()
    {
        var score = ScoringCalculator.Compute(DefaultSettings(), []);

        Assert.That(score, Is.Zero);
    }

    [Test]
    public void Compute_IgnoresTodosThatAreNotDone()
    {
        var open = Todo.Create("task", Cadence.Daily, ownerId: 1);
        open.SetPriority(Priority.High); // not completed

        var score = ScoringCalculator.Compute(DefaultSettings(), [open]);

        Assert.That(score, Is.Zero);
    }

    [Test]
    public void Compute_DailyDoneHigh_NoStreak_ScoresBaseTimesMultiplier()
    {
        // (base 1 + streak 0) * High 2.0 = 2
        var score = ScoringCalculator.Compute(DefaultSettings(), [DoneTodo(Cadence.Daily)]);

        Assert.That(score, Is.EqualTo(2));
    }

    [Test]
    public void Compute_ExcludedCadence_IsNotCounted()
    {
        // Default settings exclude Quarterly, so a completed quarterly contributes nothing.
        var score = ScoringCalculator.Compute(DefaultSettings(), [DoneTodo(Cadence.Quarterly)]);

        Assert.That(score, Is.Zero);
    }

    [Test]
    public void Compute_StreakAtThreshold_AddsBonus()
    {
        // streak (3) >= threshold (3): (base 1 + bonus 1) * High 2.0 = 4
        var score = ScoringCalculator.Compute(DefaultSettings(), [DoneTodo(Cadence.Daily, streak: 3)]);

        Assert.That(score, Is.EqualTo(4));
    }

    [Test]
    public void Compute_StreakBelowThreshold_NoBonus()
    {
        // streak (2) < threshold (3): (base 1 + bonus 0) * High 2.0 = 2
        var score = ScoringCalculator.Compute(DefaultSettings(), [DoneTodo(Cadence.Daily, streak: 2)]);

        Assert.That(score, Is.EqualTo(2));
    }

    [Test]
    public void Compute_SumsAllIncludedTodos()
    {
        // Daily High (1*2=2) + Weekly High (3*2=6) = 8, both included by default.
        var score = ScoringCalculator.Compute(
            DefaultSettings(),
            [DoneTodo(Cadence.Daily), DoneTodo(Cadence.Weekly)]);

        Assert.That(score, Is.EqualTo(8));
    }

    [Test]
    public void Compute_AppliesPriorityMultiplier()
    {
        // Quarterly Med, no streak bonus (threshold high): (base 10) * Med 1.5 = 15
        var score = ScoringCalculator.Compute(
            AllCadences(streakThreshold: 100),
            [DoneTodo(Cadence.Quarterly, Priority.Med)]);

        Assert.That(score, Is.EqualTo(15));
    }
}
