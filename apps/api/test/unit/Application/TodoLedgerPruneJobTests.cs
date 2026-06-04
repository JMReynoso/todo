using api.Application.Todos;
using api.Domain.Entities;
using api.Domain.Enums;
using api.Domain.Interfaces;
using Moq;

namespace Api.UnitTests.Application;

[TestFixture]
public class TodoLedgerPruneJobTests
{
    private Mock<ITodoRepository> _todoRepo = null!;
    private TodoLedgerPruneJob _job = null!;

    private static readonly DateOnly Today = DateOnly.FromDateTime(DateTime.UtcNow);

    [SetUp]
    public void SetUp()
    {
        _todoRepo = new Mock<ITodoRepository>();
        _todoRepo.Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>()))
                 .ReturnsAsync(Array.Empty<Todo>());
        _todoRepo.Setup(r => r.SaveChangesAsync(It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);
        _job = new TodoLedgerPruneJob(_todoRepo.Object);
    }

    private static Todo TodoWith(params DateOnly[] completedOn)
    {
        var todo = Todo.Create("task", Cadence.Daily, ownerId: 1);
        foreach (var date in completedOn)
        {
            todo.Complete(date);
            todo.Reopen(); // clear Done without touching the ledger, ready for the next date
        }
        return todo;
    }

    private void SetupTodos(params Todo[] todos) =>
        _todoRepo.Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>())).ReturnsAsync(todos);

    [Test]
    public async Task ExecuteAsync_DropsDatesOlderThanRetention_KeepsRecent()
    {
        // Retention is 24 months; three years ago is well outside it.
        var old = Today.AddYears(-3);
        var todo = TodoWith(old, Today);
        SetupTodos(todo);

        await _job.ExecuteAsync();

        Assert.Multiple(() =>
        {
            Assert.That(todo.CompletedDates, Does.Not.Contain(old));
            Assert.That(todo.CompletedDates, Does.Contain(Today));
        });
        _todoRepo.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Test]
    public async Task ExecuteAsync_NothingToPrune_DoesNotSave()
    {
        var todo = TodoWith(Today, Today.AddMonths(-6));
        SetupTodos(todo);

        await _job.ExecuteAsync();

        Assert.That(todo.CompletedDates, Has.Count.EqualTo(2));
        _todoRepo.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
    }

    [Test]
    public async Task ExecuteAsync_NoTodos_DoesNotSave()
    {
        SetupTodos();

        await _job.ExecuteAsync();

        _todoRepo.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
    }
}
