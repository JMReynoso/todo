using api.Application.DTOs.Requests;
using api.Application.Todos;
using api.Application.Validators;
using api.Domain.Entities;
using api.Domain.Enums;
using api.Domain.Exceptions;
using api.Domain.Interfaces;
using Api.UnitTests.TestSupport;
using FluentValidation;

namespace Api.UnitTests.Services;

[TestFixture]
public class TodoServiceTests
{
    private Mock<ITodoRepository> _todos = null!;
    private Mock<IPersonRepository> _persons = null!;
    private Mock<IScoreCache> _scoreCache = null!;
    private TodoService _service = null!;

    [SetUp]
    public void SetUp()
    {
        _todos = new Mock<ITodoRepository>();
        _persons = new Mock<IPersonRepository>();
        _scoreCache = new Mock<IScoreCache>();
        _scoreCache.Setup(c => c.InvalidateAsync(It.IsAny<int>(), It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);

        // Real validators — exercise the actual validation rules.
        _service = new TodoService(
            _todos.Object,
            _persons.Object,
            _scoreCache.Object,
            new CreateTodoRequestValidator(),
            new UpdateTodoRequestValidator(),
            new CreateSubtaskRequestValidator());
    }

    private static Person PersonWithId(int id) =>
        Person.Create($"P{id}", "PX", "#fff", $"p{id}@x.com").WithId(id);

    private static readonly DateOnly Today = DateOnly.FromDateTime(DateTime.UtcNow);

    private static UpdateTodoRequest UpdateRequest(
        string title = "t", Priority priority = Priority.Med,
        int? assigneeId = null, bool done = false) =>
        new(title, priority, Today, null, "", assigneeId, done, []);

    [Test]
    public void CreateAsync_InvalidRequest_ThrowsValidation()
    {
        var request = new CreateTodoRequest(Title: "", Cadence.Daily, StartsOn: Today);

        Assert.ThrowsAsync<ValidationException>(() => _service.CreateAsync(request, ownerId: 1));
    }

    [Test]
    public void CreateAsync_OwnerNotFound_Throws()
    {
        _persons.Setup(p => p.GetByIdAsync(1, It.IsAny<CancellationToken>())).ReturnsAsync((Person?)null);
        var request = new CreateTodoRequest("Write tests", Cadence.Daily, StartsOn: Today);

        Assert.ThrowsAsync<DomainException>(() => _service.CreateAsync(request, ownerId: 1));
    }

    [Test]
    public async Task CreateAsync_Valid_PersistsAndReturnsResponseWithOwner()
    {
        _persons.Setup(p => p.GetByIdAsync(1, It.IsAny<CancellationToken>())).ReturnsAsync(PersonWithId(1));
        var request = new CreateTodoRequest("Write tests", Cadence.Daily, StartsOn: Today);

        var result = await _service.CreateAsync(request, ownerId: 1);

        Assert.Multiple(() =>
        {
            Assert.That(result.Title, Is.EqualTo("Write tests"));
            Assert.That(result.Owner.Id, Is.EqualTo(1));
            Assert.That(result.Assignee, Is.Null);
        });
        _todos.Verify(t => t.AddAsync(It.IsAny<Todo>(), It.IsAny<CancellationToken>()), Times.Once);
        _todos.Verify(t => t.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Test]
    public async Task GetByIdAsync_NotFound_ReturnsNull()
    {
        _todos.Setup(t => t.GetByIdAsync(7, It.IsAny<CancellationToken>())).ReturnsAsync((Todo?)null);

        Assert.That(await _service.GetByIdAsync(7), Is.Null);
    }

    [Test]
    public async Task GetByIdAsync_ResolvesOwnerAndAssignee()
    {
        var todo = Todo.Create("task", Cadence.Daily, ownerId: 1).WithId(5);
        todo.AssignTo(2);
        _todos.Setup(t => t.GetByIdAsync(5, It.IsAny<CancellationToken>())).ReturnsAsync(todo);
        _persons.Setup(p => p.GetByIdAsync(1, It.IsAny<CancellationToken>())).ReturnsAsync(PersonWithId(1));
        _persons.Setup(p => p.GetByIdAsync(2, It.IsAny<CancellationToken>())).ReturnsAsync(PersonWithId(2));

        var result = await _service.GetByIdAsync(5);

        Assert.That(result, Is.Not.Null);
        Assert.Multiple(() =>
        {
            Assert.That(result!.Id, Is.EqualTo(5));
            Assert.That(result.Owner.Id, Is.EqualTo(1));
            Assert.That(result.Assignee!.Id, Is.EqualTo(2));
        });
    }

    [Test]
    public async Task GetAllAsync_ResolvesOwnersAndAssigneesFromBatch()
    {
        var todo = Todo.Create("task", Cadence.Daily, ownerId: 1).WithId(5);
        todo.AssignTo(2);
        _todos.Setup(t => t.GetAllForUserAsync(1, It.IsAny<CancellationToken>())).ReturnsAsync(new[] { todo });
        _persons.Setup(p => p.GetAllAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { PersonWithId(1), PersonWithId(2) });

        var result = await _service.GetAllAsync(userId: 1);

        Assert.That(result, Has.Count.EqualTo(1));
        Assert.Multiple(() =>
        {
            Assert.That(result[0].Owner.Id, Is.EqualTo(1));
            Assert.That(result[0].Assignee!.Id, Is.EqualTo(2));
        });
    }

    [Test]
    public async Task UpdateAsync_NotFound_ReturnsNull()
    {
        _todos.Setup(t => t.GetByIdAsync(5, It.IsAny<CancellationToken>())).ReturnsAsync((Todo?)null);

        Assert.That(await _service.UpdateAsync(5, UpdateRequest()), Is.Null);
    }

    [Test]
    public async Task UpdateAsync_WithAssigneeId_AssignsPerson()
    {
        var todo = Todo.Create("old", Cadence.Daily, ownerId: 1).WithId(5);
        _todos.Setup(t => t.GetByIdAsync(5, It.IsAny<CancellationToken>())).ReturnsAsync(todo);
        _persons.Setup(p => p.GetByIdAsync(1, It.IsAny<CancellationToken>())).ReturnsAsync(PersonWithId(1));
        _persons.Setup(p => p.GetByIdAsync(2, It.IsAny<CancellationToken>())).ReturnsAsync(PersonWithId(2));

        var result = await _service.UpdateAsync(5, UpdateRequest("new", Priority.High, assigneeId: 2));

        Assert.That(result, Is.Not.Null);
        Assert.Multiple(() =>
        {
            Assert.That(result!.Title, Is.EqualTo("new"));
            Assert.That(result.Assignee!.Id, Is.EqualTo(2));
        });
        _todos.Verify(t => t.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Test]
    public async Task UpdateAsync_WithNullAssigneeId_Unassigns()
    {
        var todo = Todo.Create("old", Cadence.Daily, ownerId: 1).WithId(5);
        todo.AssignTo(2);
        _todos.Setup(t => t.GetByIdAsync(5, It.IsAny<CancellationToken>())).ReturnsAsync(todo);
        _persons.Setup(p => p.GetByIdAsync(1, It.IsAny<CancellationToken>())).ReturnsAsync(PersonWithId(1));

        var result = await _service.UpdateAsync(5, UpdateRequest(assigneeId: null));

        Assert.That(result, Is.Not.Null);
        Assert.That(result!.Assignee, Is.Null);
    }

    [Test]
    public async Task RemoveAsync_WhenRemoved_SavesAndReturnsTrue()
    {
        _todos.Setup(t => t.RemoveAsync(5, It.IsAny<CancellationToken>())).ReturnsAsync(true);

        Assert.That(await _service.RemoveAsync(5), Is.True);
        _todos.Verify(t => t.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Test]
    public async Task RemoveAsync_WhenNotRemoved_DoesNotSaveAndReturnsFalse()
    {
        _todos.Setup(t => t.RemoveAsync(6, It.IsAny<CancellationToken>())).ReturnsAsync(false);

        Assert.That(await _service.RemoveAsync(6), Is.False);
        _todos.Verify(t => t.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
    }

    [Test]
    public async Task AddSubtaskAsync_NotFound_ReturnsNull()
    {
        _todos.Setup(t => t.GetByIdAsync(7, It.IsAny<CancellationToken>())).ReturnsAsync((Todo?)null);

        Assert.That(await _service.AddSubtaskAsync(7, new CreateSubtaskRequest("sub")), Is.Null);
    }

    [Test]
    public async Task AddSubtaskAsync_Found_AddsSubtask()
    {
        var todo = Todo.Create("task", Cadence.Daily, ownerId: 1).WithId(5);
        _todos.Setup(t => t.GetByIdAsync(5, It.IsAny<CancellationToken>())).ReturnsAsync(todo);
        _persons.Setup(p => p.GetByIdAsync(1, It.IsAny<CancellationToken>())).ReturnsAsync(PersonWithId(1));

        var result = await _service.AddSubtaskAsync(5, new CreateSubtaskRequest("sub"));

        Assert.That(result, Is.Not.Null);
        Assert.That(result!.Subtasks, Has.Count.EqualTo(1));
        Assert.That(result.Subtasks[0].Title, Is.EqualTo("sub"));
    }
}
