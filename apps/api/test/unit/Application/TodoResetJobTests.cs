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
}
