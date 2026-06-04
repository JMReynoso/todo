using api.Domain.Entities;
using api.Domain.Enums;

namespace Api.UnitTests.Domain;

[TestFixture]
public class TodoTests
{
    private static Todo NewTodo(Cadence cadence = Cadence.Daily) =>
        Todo.Create("task", cadence, ownerId: 1);

    [Test]
    public void Create_BlankTitle_Throws() =>
        Assert.Throws<ArgumentException>(() => Todo.Create(" ", Cadence.Daily, ownerId: 1));

    [TestCase(0)]
    [TestCase(-1)]
    public void Create_NonPositiveOwner_Throws(int ownerId) =>
        Assert.Throws<ArgumentOutOfRangeException>(() => Todo.Create("t", Cadence.Daily, ownerId));

    [Test]
    public void Create_Defaults_AreSane()
    {
        var todo = NewTodo();
        Assert.Multiple(() =>
        {
            Assert.That(todo.Done, Is.False);
            Assert.That(todo.Priority, Is.EqualTo(Priority.Med));
            Assert.That(todo.Streak, Is.EqualTo(0));
            Assert.That(todo.Tags, Is.Empty);
            Assert.That(todo.Subtasks, Is.Empty);
            Assert.That(todo.AssigneeId, Is.Null);
        });
    }

    [Test]
    public void Complete_DefaultDate_MarksDoneAndStampsToday()
    {
        var todo = NewTodo();
        todo.Complete();
        Assert.Multiple(() =>
        {
            Assert.That(todo.Done, Is.True);
            Assert.That(todo.LastCompletedOn, Is.EqualTo(DateOnly.FromDateTime(DateTime.UtcNow)));
        });
    }

    [Test]
    public void Complete_ExplicitDate_UsesProvidedDate()
    {
        var todo = NewTodo();
        var date = new DateOnly(2026, 1, 2);
        todo.Complete(date);
        Assert.That(todo.LastCompletedOn, Is.EqualTo(date));
    }

    [Test]
    public void Reopen_ClearsDone()
    {
        var todo = NewTodo();
        todo.Complete();
        todo.Reopen();
        Assert.That(todo.Done, Is.False);
    }

    [Test]
    public void Complete_RecordsTheDayInTheLedger()
    {
        var todo = NewTodo();
        var date = new DateOnly(2026, 6, 4);
        todo.Complete(date);
        Assert.That(todo.CompletedDates, Does.Contain(date));
    }

    [Test]
    public void Complete_SameDayTwice_DoesNotDuplicate()
    {
        var todo = NewTodo();
        var date = new DateOnly(2026, 6, 4);
        todo.Complete(date);
        todo.Reopen();
        todo.Complete(date);
        Assert.That(todo.CompletedDates.Count(d => d == date), Is.EqualTo(1));
    }

    [Test]
    public void Reopen_WithDate_RemovesThatDayFromLedger()
    {
        var todo = NewTodo();
        var date = new DateOnly(2026, 6, 4);
        todo.Complete(date);
        todo.Reopen(date);
        Assert.That(todo.CompletedDates, Does.Not.Contain(date));
    }

    [Test]
    public void Reopen_WithoutDate_KeepsLedger()
    {
        // The reset job reopens for a new cycle and must not erase history.
        var todo = NewTodo();
        var date = new DateOnly(2026, 6, 4);
        todo.Complete(date);
        todo.Reopen();
        Assert.That(todo.CompletedDates, Does.Contain(date));
    }

    [Test]
    public void AdvanceCycle_KeepsCompletedDates()
    {
        var todo = NewTodo(Cadence.Daily);
        var date = new DateOnly(2026, 6, 4);
        todo.SetStartsOn(date);
        todo.SetDueOn(date.AddDays(1));
        todo.Complete(date);
        todo.AdvanceCycle();
        Assert.That(todo.CompletedDates, Does.Contain(date));
    }

    [Test]
    public void PruneCompletedDatesBefore_DropsOldDates_KeepsRecentAndBoundary()
    {
        var todo = NewTodo();
        var cutoff = new DateOnly(2026, 1, 1);
        todo.Complete(new DateOnly(2024, 12, 31)); // before cutoff → pruned
        todo.Complete(cutoff);                     // on cutoff → kept
        todo.Complete(new DateOnly(2026, 6, 4));   // after cutoff → kept

        var removed = todo.PruneCompletedDatesBefore(cutoff);

        Assert.Multiple(() =>
        {
            Assert.That(removed, Is.True);
            Assert.That(todo.CompletedDates, Does.Not.Contain(new DateOnly(2024, 12, 31)));
            Assert.That(todo.CompletedDates, Does.Contain(cutoff));
            Assert.That(todo.CompletedDates, Does.Contain(new DateOnly(2026, 6, 4)));
        });
    }

    [Test]
    public void PruneCompletedDatesBefore_NothingOld_ReturnsFalse()
    {
        var todo = NewTodo();
        todo.Complete(new DateOnly(2026, 6, 4));
        Assert.That(todo.PruneCompletedDatesBefore(new DateOnly(2026, 1, 1)), Is.False);
    }

    [Test]
    public void SetTitle_Blank_Throws() =>
        Assert.Throws<ArgumentException>(() => NewTodo().SetTitle("  "));

    [Test]
    public void SetNotes_Null_BecomesEmpty()
    {
        var todo = NewTodo();
        todo.SetNotes(null!);
        Assert.That(todo.Notes, Is.EqualTo(string.Empty));
    }

    [Test]
    public void SetCadence_ChangesCadence()
    {
        var todo = NewTodo(Cadence.Once);
        todo.SetCadence(Cadence.Weekly);
        Assert.That(todo.Cadence, Is.EqualTo(Cadence.Weekly));
    }

    [TestCase(Cadence.Daily, "2026-01-02")]
    [TestCase(Cadence.Weekly, "2026-01-08")]
    [TestCase(Cadence.Monthly, "2026-02-01")]
    [TestCase(Cadence.Quarterly, "2026-04-01")]
    [TestCase(Cadence.Once, "2026-01-01")]
    public void AddPeriod_AdvancesByOneCadencePeriod(Cadence cadence, string expected)
    {
        var result = Todo.AddPeriod(new DateOnly(2026, 1, 1), cadence);
        Assert.That(result, Is.EqualTo(DateOnly.Parse(expected)));
    }

    [Test]
    public void AdvanceCycle_WithoutDueOn_IsNoOp()
    {
        var todo = NewTodo();
        var startsBefore = todo.StartsOn;
        todo.AdvanceCycle();
        Assert.Multiple(() =>
        {
            Assert.That(todo.DueOn, Is.Null);
            Assert.That(todo.StartsOn, Is.EqualTo(startsBefore));
        });
    }

    [Test]
    public void AdvanceCycle_RollsStartsOnToDueAndAdvancesDue()
    {
        var todo = NewTodo(Cadence.Weekly);
        todo.SetStartsOn(new DateOnly(2026, 1, 1));
        todo.SetDueOn(new DateOnly(2026, 1, 8));

        todo.AdvanceCycle();

        Assert.Multiple(() =>
        {
            Assert.That(todo.StartsOn, Is.EqualTo(new DateOnly(2026, 1, 8)));
            Assert.That(todo.DueOn, Is.EqualTo(new DateOnly(2026, 1, 15)));
        });
    }

    [Test]
    public void RescheduleTo_SetsBothStartsOnAndDueOn()
    {
        var todo = NewTodo(Cadence.Once);
        var date = new DateOnly(2026, 3, 9);
        todo.RescheduleTo(date);
        Assert.Multiple(() =>
        {
            Assert.That(todo.StartsOn, Is.EqualTo(date));
            Assert.That(todo.DueOn, Is.EqualTo(date));
        });
    }

    [Test]
    public void TransferOwnership_NonPositive_Throws() =>
        Assert.Throws<ArgumentOutOfRangeException>(() => NewTodo().TransferOwnership(0));

    [Test]
    public void TransferOwnership_Valid_UpdatesOwner()
    {
        var todo = NewTodo();
        todo.TransferOwnership(42);
        Assert.That(todo.OwnerId, Is.EqualTo(42));
    }

    [Test]
    public void AssignTo_ThenUnassign_TogglesAssignee()
    {
        var todo = NewTodo();
        todo.AssignTo(3);
        Assert.That(todo.AssigneeId, Is.EqualTo(3));
        todo.Unassign();
        Assert.That(todo.AssigneeId, Is.Null);
    }

    [Test]
    public void Streak_IncrementsAndResets()
    {
        var todo = NewTodo();
        todo.IncrementStreak();
        todo.IncrementStreak();
        Assert.That(todo.Streak, Is.EqualTo(2));
        todo.ResetStreak();
        Assert.That(todo.Streak, Is.EqualTo(0));
    }

    [Test]
    public void AddTag_Deduplicates()
    {
        var todo = NewTodo();
        todo.AddTag("home");
        todo.AddTag("home");
        Assert.That(todo.Tags, Is.EquivalentTo(new[] { "home" }));
    }

    [Test]
    public void AddTag_Blank_Throws() =>
        Assert.Throws<ArgumentException>(() => NewTodo().AddTag(" "));

    [Test]
    public void RemoveTag_ReturnsWhetherItExisted()
    {
        var todo = NewTodo();
        todo.AddTag("home");
        Assert.Multiple(() =>
        {
            Assert.That(todo.RemoveTag("home"), Is.True);
            Assert.That(todo.RemoveTag("missing"), Is.False);
        });
    }

    [Test]
    public void SetTags_ReplacesExistingTags()
    {
        var todo = NewTodo();
        todo.AddTag("old");
        todo.SetTags(new[] { "a", "b" });
        Assert.That(todo.Tags, Is.EquivalentTo(new[] { "a", "b" }));
    }

    [Test]
    public void AddSubtask_Null_Throws() =>
        Assert.Throws<ArgumentNullException>(() => NewTodo().AddSubtask(null!));

    [Test]
    public void RemoveSubtask_ReturnsWhetherItExisted()
    {
        var todo = NewTodo();
        var sub = Subtask.Create("s");
        todo.AddSubtask(sub);
        Assert.Multiple(() =>
        {
            Assert.That(todo.RemoveSubtask(sub), Is.True);
            Assert.That(todo.RemoveSubtask(Subtask.Create("other")), Is.False);
        });
    }
}
