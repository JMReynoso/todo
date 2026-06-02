using api.Application.Todos;
using api.Domain.Entities;
using api.Domain.Enums;
using api.Domain.Interfaces;
using Moq;

namespace Api.UnitTests.Application;

[TestFixture]
public class TodoResetJobTests
{
    private Mock<ITodoRepository> _todoRepo = null!;
    private Mock<IScoreCache> _scoreCache = null!;
    private TodoResetJob _job = null!;

    private static readonly DateOnly Today = DateOnly.FromDateTime(DateTime.UtcNow);

    [SetUp]
    public void SetUp()
    {
        _todoRepo = new Mock<ITodoRepository>();
        _scoreCache = new Mock<IScoreCache>();
        // Both queries default to empty; individual tests opt in via SetupTodos/SetupOnce.
        _todoRepo.Setup(r => r.GetDoneRecurringAsync(It.IsAny<CancellationToken>()))
                 .ReturnsAsync(Array.Empty<Todo>());
        _todoRepo.Setup(r => r.GetIncompleteOnceAsync(It.IsAny<CancellationToken>()))
                 .ReturnsAsync(Array.Empty<Todo>());
        _todoRepo.Setup(r => r.SaveChangesAsync(It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);
        _scoreCache.Setup(c => c.InvalidateAsync(It.IsAny<int>(), It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);
        _job = new TodoResetJob(_todoRepo.Object, _scoreCache.Object);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    // A done recurring task whose reopen is gated on DueOn. StartsOn defaults to
    // dueOn when unspecified; only DueOn drives the reset decision.
    private static Todo CompletedTodo(Cadence cadence, DateOnly dueOn, DateOnly? startsOn = null,
        int ownerId = 1)
    {
        var todo = Todo.Create("task", cadence, ownerId);
        todo.SetStartsOn(startsOn ?? dueOn);
        todo.SetDueOn(dueOn);
        todo.Complete();
        return todo;
    }

    private void SetupTodos(params Todo[] todos) =>
        _todoRepo.Setup(r => r.GetDoneRecurringAsync(It.IsAny<CancellationToken>()))
                 .ReturnsAsync(todos);

    // An open one-off task anchored on startsOn (DueOn mirrors StartsOn for Once).
    private static Todo IncompleteOnce(DateOnly startsOn, int ownerId = 1)
    {
        var todo = Todo.Create("task", Cadence.Once, ownerId);
        todo.SetStartsOn(startsOn);
        todo.SetDueOn(startsOn);
        return todo;
    }

    private void SetupOnce(params Todo[] todos) =>
        _todoRepo.Setup(r => r.GetIncompleteOnceAsync(It.IsAny<CancellationToken>()))
                 .ReturnsAsync(todos);

    // ── No-op when nothing to reset ───────────────────────────────────────────

    [Test]
    public async Task ExecuteAsync_NoTodos_SavesWithoutChanges()
    {
        SetupTodos();

        await _job.ExecuteAsync();

        _todoRepo.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
        _scoreCache.Verify(c => c.InvalidateAsync(It.IsAny<int>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    // ── Due-date gate ─────────────────────────────────────────────────────────

    [Test]
    public async Task ExecuteAsync_DueInThePast_ResetsTask()
    {
        var todo = CompletedTodo(Cadence.Daily, dueOn: Today.AddDays(-1));
        SetupTodos(todo);

        await _job.ExecuteAsync();

        Assert.That(todo.Done, Is.False);
    }

    [Test]
    public async Task ExecuteAsync_DueToday_ResetsTask()
    {
        // The due date has arrived (today >= DueOn), so the task reopens.
        var todo = CompletedTodo(Cadence.Weekly, dueOn: Today);
        SetupTodos(todo);

        await _job.ExecuteAsync();

        Assert.That(todo.Done, Is.False);
    }

    [Test]
    public async Task ExecuteAsync_DueInTheFuture_DoesNotReset()
    {
        var todo = CompletedTodo(Cadence.Weekly, dueOn: Today.AddDays(1));
        SetupTodos(todo);

        await _job.ExecuteAsync();

        Assert.That(todo.Done, Is.True);
    }

    [Test]
    public async Task ExecuteAsync_NullDueOn_DoesNotReset()
    {
        // Legacy row: Done=true but no DueOn — the job leaves it untouched.
        var todo = Todo.Create("task", Cadence.Daily, ownerId: 1);
        todo.Complete(); // DueOn stays null
        SetupTodos(todo);

        await _job.ExecuteAsync();

        Assert.That(todo.Done, Is.True); // unchanged
    }

    // ── Cycle roll-forward (StartsOn := DueOn, DueOn := StartsOn + period) ──────

    [Test]
    public async Task ExecuteAsync_DailyReset_RollsCycleForwardByOneDay()
    {
        var dueOn = Today.AddDays(-1);
        var todo = CompletedTodo(Cadence.Daily, dueOn: dueOn);
        SetupTodos(todo);

        await _job.ExecuteAsync();

        Assert.Multiple(() =>
        {
            Assert.That(todo.StartsOn, Is.EqualTo(dueOn));
            Assert.That(todo.DueOn, Is.EqualTo(dueOn.AddDays(1)));
        });
    }

    [Test]
    public async Task ExecuteAsync_WeeklyReset_RollsCycleForwardBySevenDays()
    {
        var dueOn = Today.AddDays(-7);
        var todo = CompletedTodo(Cadence.Weekly, dueOn: dueOn);
        SetupTodos(todo);

        await _job.ExecuteAsync();

        Assert.Multiple(() =>
        {
            Assert.That(todo.StartsOn, Is.EqualTo(dueOn));
            Assert.That(todo.DueOn, Is.EqualTo(dueOn.AddDays(7)));
        });
    }

    [Test]
    public async Task ExecuteAsync_MonthlyReset_RollsCycleForwardByOneMonth()
    {
        var dueOn = Today.AddMonths(-1);
        var todo = CompletedTodo(Cadence.Monthly, dueOn: dueOn);
        SetupTodos(todo);

        await _job.ExecuteAsync();

        Assert.That(todo.DueOn, Is.EqualTo(dueOn.AddMonths(1)));
    }

    [Test]
    public async Task ExecuteAsync_QuarterlyReset_RollsCycleForwardByThreeMonths()
    {
        var dueOn = Today.AddMonths(-3);
        var todo = CompletedTodo(Cadence.Quarterly, dueOn: dueOn);
        SetupTodos(todo);

        await _job.ExecuteAsync();

        Assert.That(todo.DueOn, Is.EqualTo(dueOn.AddMonths(3)));
    }

    // ── Streak ────────────────────────────────────────────────────────────────

    [Test]
    public async Task ExecuteAsync_DueRecurringReset_IncrementsStreak()
    {
        var todo = CompletedTodo(Cadence.Daily, dueOn: Today.AddDays(-1));
        todo.IncrementStreak();
        todo.IncrementStreak(); // streak = 2 going into the reset

        SetupTodos(todo);

        await _job.ExecuteAsync();

        Assert.That(todo.Streak, Is.EqualTo(3));
    }

    [Test]
    public async Task ExecuteAsync_DueInTheFuture_DoesNotIncrementStreak()
    {
        // Not yet rolled over, so the streak stays put.
        var todo = CompletedTodo(Cadence.Weekly, dueOn: Today.AddDays(1));
        SetupTodos(todo);

        await _job.ExecuteAsync();

        Assert.That(todo.Streak, Is.EqualTo(0));
    }

    // ── Subtask reset ─────────────────────────────────────────────────────────

    [Test]
    public async Task ExecuteAsync_ResetsAllSubtasks_WhenParentIsReset()
    {
        var todo = CompletedTodo(Cadence.Daily, dueOn: Today.AddDays(-1));
        var sub1 = Subtask.Create("step 1");
        var sub2 = Subtask.Create("step 2");
        sub1.Complete();
        sub2.Complete();
        todo.AddSubtask(sub1);
        todo.AddSubtask(sub2);
        SetupTodos(todo);

        await _job.ExecuteAsync();

        Assert.That(todo.Subtasks.All(s => !s.Done), Is.True);
    }

    [Test]
    public async Task ExecuteAsync_DoesNotResetSubtasks_WhenParentIsNotReset()
    {
        var todo = CompletedTodo(Cadence.Daily, dueOn: Today.AddDays(1));
        var sub = Subtask.Create("step");
        sub.Complete();
        todo.AddSubtask(sub);
        SetupTodos(todo);

        await _job.ExecuteAsync();

        Assert.That(sub.Done, Is.True);
    }

    // ── Cache invalidation ────────────────────────────────────────────────────

    [Test]
    public async Task ExecuteAsync_InvalidatesOwnerCache_ForEachResetTask()
    {
        var todo1 = CompletedTodo(Cadence.Daily, dueOn: Today.AddDays(-1), ownerId: 1);
        var todo2 = CompletedTodo(Cadence.Weekly, dueOn: Today.AddDays(-7), ownerId: 2);
        SetupTodos(todo1, todo2);

        await _job.ExecuteAsync();

        _scoreCache.Verify(c => c.InvalidateAsync(1, It.IsAny<CancellationToken>()), Times.Once);
        _scoreCache.Verify(c => c.InvalidateAsync(2, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Test]
    public async Task ExecuteAsync_DeduplicatesOwnerCacheInvalidation()
    {
        // Two tasks for the same owner — cache should only be invalidated once.
        var todo1 = CompletedTodo(Cadence.Daily, dueOn: Today.AddDays(-1), ownerId: 1);
        var todo2 = CompletedTodo(Cadence.Weekly, dueOn: Today.AddDays(-7), ownerId: 1);
        SetupTodos(todo1, todo2);

        await _job.ExecuteAsync();

        _scoreCache.Verify(c => c.InvalidateAsync(1, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Test]
    public async Task ExecuteAsync_NoTasksReset_NoCacheInvalidation()
    {
        var todo = CompletedTodo(Cadence.Daily, dueOn: Today.AddDays(1));
        SetupTodos(todo);

        await _job.ExecuteAsync();

        _scoreCache.Verify(c => c.InvalidateAsync(It.IsAny<int>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    // ── One-off roll-forward (open Once tasks follow the current day) ──────────

    [Test]
    public async Task ExecuteAsync_OpenOnceFromYesterday_RollsAnchorToToday()
    {
        var todo = IncompleteOnce(startsOn: Today.AddDays(-1));
        SetupOnce(todo);

        await _job.ExecuteAsync();

        Assert.Multiple(() =>
        {
            Assert.That(todo.StartsOn, Is.EqualTo(Today));
            Assert.That(todo.DueOn, Is.EqualTo(Today));
            Assert.That(todo.Done, Is.False);
        });
    }

    [Test]
    public async Task ExecuteAsync_OpenOnceOverdueByDays_RollsStraightToToday()
    {
        // Even if the job missed runs, the anchor catches up to today rather than
        // creeping forward one stale day at a time.
        var todo = IncompleteOnce(startsOn: Today.AddDays(-5));
        SetupOnce(todo);

        await _job.ExecuteAsync();

        Assert.That(todo.StartsOn, Is.EqualTo(Today));
    }

    [Test]
    public async Task ExecuteAsync_OpenOnceDueToday_StaysPut()
    {
        var todo = IncompleteOnce(startsOn: Today);
        SetupOnce(todo);

        await _job.ExecuteAsync();

        Assert.That(todo.StartsOn, Is.EqualTo(Today));
    }

    [Test]
    public async Task ExecuteAsync_OpenOnceDueInFuture_StaysPut()
    {
        var startsOn = Today.AddDays(3);
        var todo = IncompleteOnce(startsOn: startsOn);
        SetupOnce(todo);

        await _job.ExecuteAsync();

        Assert.That(todo.StartsOn, Is.EqualTo(startsOn));
    }

    [Test]
    public async Task ExecuteAsync_RollingOpenOnceForward_DoesNotInvalidateCache()
    {
        // Rolling an open one-off changes only its anchor, not its Done state, so
        // the owner's score is unaffected and the cache need not be cleared.
        var todo = IncompleteOnce(startsOn: Today.AddDays(-1));
        SetupOnce(todo);

        await _job.ExecuteAsync();

        _scoreCache.Verify(c => c.InvalidateAsync(It.IsAny<int>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Test]
    public async Task ExecuteAsync_RollsOpenOnce_AndResetsDueRecurring_InOneRun()
    {
        // The two loops coexist: a due recurring task reopens and rolls its cycle
        // while an open one-off has its anchor carried forward — both in one pass,
        // persisted by a single SaveChanges.
        var recurring = CompletedTodo(Cadence.Daily, dueOn: Today.AddDays(-1), ownerId: 1);
        var oneOff = IncompleteOnce(startsOn: Today.AddDays(-1), ownerId: 2);
        SetupTodos(recurring);
        SetupOnce(oneOff);

        await _job.ExecuteAsync();

        Assert.Multiple(() =>
        {
            Assert.That(recurring.Done, Is.False, "recurring task reopened");
            Assert.That(recurring.StartsOn, Is.EqualTo(Today.AddDays(-1)), "cycle rolled forward");
            Assert.That(oneOff.StartsOn, Is.EqualTo(Today), "one-off anchor moved to today");
            Assert.That(oneOff.Done, Is.False, "one-off stays open");
        });
        _todoRepo.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
        // Only the reopened recurring task's owner is invalidated, not the one-off's.
        _scoreCache.Verify(c => c.InvalidateAsync(1, It.IsAny<CancellationToken>()), Times.Once);
        _scoreCache.Verify(c => c.InvalidateAsync(2, It.IsAny<CancellationToken>()), Times.Never);
    }
}
