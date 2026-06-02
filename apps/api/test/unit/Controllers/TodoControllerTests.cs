using System.Security.Claims;
using api.Application.DTOs.Requests;
using api.Application.Todos;
using api.Application.Validators;
using api.Controllers;
using api.Domain.Entities;
using api.Domain.Enums;
using api.Domain.Interfaces;
using Api.UnitTests.TestSupport;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Api.UnitTests.Controllers;

/// <summary>
/// Controller tests focus on HTTP result mapping (Ok / NotFound / Created / NoContent).
/// The controller takes the concrete <see cref="TodoService"/> (no interface), so the
/// service is real but backed by mocked repositories — the data layer is the seam.
/// </summary>
[TestFixture]
public class TodoControllerTests
{
    private Mock<ITodoRepository> _todos = null!;
    private Mock<IPersonRepository> _persons = null!;
    private Mock<IScoreCache> _scoreCache = null!;
    private TodoController _controller = null!;

    [SetUp]
    public void SetUp()
    {
        _todos = new Mock<ITodoRepository>();
        _persons = new Mock<IPersonRepository>();
        _scoreCache = new Mock<IScoreCache>();
        _scoreCache.Setup(c => c.InvalidateAsync(It.IsAny<int>(), It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);

        var service = new TodoService(
            _todos.Object,
            _persons.Object,
            _scoreCache.Object,
            new CreateTodoRequestValidator(),
            new UpdateTodoRequestValidator(),
            new CreateSubtaskRequestValidator());

        _controller = new TodoController(service);
    }

    private static Person PersonWithId(int id) =>
        Person.Create($"P{id}", "PX", "#fff", $"p{id}@x.com").WithId(id);

    private static readonly DateOnly Today = DateOnly.FromDateTime(DateTime.UtcNow);

    private static UpdateTodoRequest UpdateRequest(
        string title = "t", Priority priority = Priority.Med,
        int? assigneeId = null, bool done = false, Cadence cadence = Cadence.Daily) =>
        new(title, cadence, priority, Today, null, "", assigneeId, done, []);

    private void SetUserClaim(int userId) =>
        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity(
                    [new Claim(ClaimTypes.NameIdentifier, userId.ToString())]))
            }
        };

    [Test]
    public async Task GetById_NotFound_ReturnsNotFound()
    {
        _todos.Setup(t => t.GetByIdAsync(7, It.IsAny<CancellationToken>())).ReturnsAsync((Todo?)null);

        var result = await _controller.GetById(7, default);

        Assert.That(result.Result, Is.InstanceOf<NotFoundResult>());
    }

    [Test]
    public async Task GetById_Found_ReturnsOk()
    {
        var todo = Todo.Create("task", Cadence.Daily, ownerId: 1).WithId(5);
        _todos.Setup(t => t.GetByIdAsync(5, It.IsAny<CancellationToken>())).ReturnsAsync(todo);
        _persons.Setup(p => p.GetByIdAsync(1, It.IsAny<CancellationToken>())).ReturnsAsync(PersonWithId(1));

        var result = await _controller.GetById(5, default);

        Assert.That(result.Result, Is.InstanceOf<OkObjectResult>());
    }

    [Test]
    public async Task GetAll_ReturnsOk()
    {
        SetUserClaim(1);
        _todos.Setup(t => t.GetAllForUserAsync(1, It.IsAny<CancellationToken>())).ReturnsAsync([]);
        _persons.Setup(p => p.GetAllAsync(It.IsAny<CancellationToken>())).ReturnsAsync([]);

        var result = await _controller.GetAll(default);

        Assert.That(result.Result, Is.InstanceOf<OkObjectResult>());
    }

    [Test]
    public async Task Create_ReturnsCreatedAtActionPointingAtGetById()
    {
        SetUserClaim(1);
        _persons.Setup(p => p.GetByIdAsync(1, It.IsAny<CancellationToken>())).ReturnsAsync(PersonWithId(1));

        var result = await _controller.Create(new CreateTodoRequest("Write tests", Cadence.Daily, StartsOn: Today), default);

        Assert.That(result.Result, Is.InstanceOf<CreatedAtActionResult>());
        Assert.That(((CreatedAtActionResult)result.Result!).ActionName, Is.EqualTo(nameof(TodoController.GetById)));
    }

    [Test]
    public async Task Update_NotFound_ReturnsNotFound()
    {
        _todos.Setup(t => t.GetByIdAsync(5, It.IsAny<CancellationToken>())).ReturnsAsync((Todo?)null);

        var result = await _controller.Update(5, UpdateRequest(), default);

        Assert.That(result.Result, Is.InstanceOf<NotFoundResult>());
    }

    [Test]
    public async Task Update_Found_ReturnsOk()
    {
        var todo = Todo.Create("old", Cadence.Daily, ownerId: 1).WithId(5);
        _todos.Setup(t => t.GetByIdAsync(5, It.IsAny<CancellationToken>())).ReturnsAsync(todo);
        _persons.Setup(p => p.GetByIdAsync(1, It.IsAny<CancellationToken>())).ReturnsAsync(PersonWithId(1));

        var result = await _controller.Update(5, UpdateRequest("new", Priority.High), default);

        Assert.That(result.Result, Is.InstanceOf<OkObjectResult>());
    }

    [Test]
    public async Task Remove_WhenRemoved_ReturnsNoContent()
    {
        _todos.Setup(t => t.RemoveAsync(5, It.IsAny<CancellationToken>())).ReturnsAsync(true);

        Assert.That(await _controller.Remove(5, default), Is.InstanceOf<NoContentResult>());
    }

    [Test]
    public async Task Remove_WhenNotRemoved_ReturnsNotFound()
    {
        _todos.Setup(t => t.RemoveAsync(6, It.IsAny<CancellationToken>())).ReturnsAsync(false);

        Assert.That(await _controller.Remove(6, default), Is.InstanceOf<NotFoundResult>());
    }

    [Test]
    public async Task AddSubtask_NotFound_ReturnsNotFound()
    {
        _todos.Setup(t => t.GetByIdAsync(7, It.IsAny<CancellationToken>())).ReturnsAsync((Todo?)null);

        var result = await _controller.AddSubtask(7, new CreateSubtaskRequest("sub"), default);

        Assert.That(result.Result, Is.InstanceOf<NotFoundResult>());
    }

    [Test]
    public async Task AddSubtask_Found_ReturnsOk()
    {
        var todo = Todo.Create("task", Cadence.Daily, ownerId: 1).WithId(5);
        _todos.Setup(t => t.GetByIdAsync(5, It.IsAny<CancellationToken>())).ReturnsAsync(todo);
        _persons.Setup(p => p.GetByIdAsync(1, It.IsAny<CancellationToken>())).ReturnsAsync(PersonWithId(1));

        var result = await _controller.AddSubtask(5, new CreateSubtaskRequest("sub"), default);

        Assert.That(result.Result, Is.InstanceOf<OkObjectResult>());
    }

    [Test]
    public async Task ToggleSubtask_NotFound_ReturnsNotFound()
    {
        _todos.Setup(t => t.GetByIdAsync(7, It.IsAny<CancellationToken>())).ReturnsAsync((Todo?)null);

        var result = await _controller.ToggleSubtask(7, subId: 1, new ToggleSubtaskRequest(true), default);

        Assert.That(result.Result, Is.InstanceOf<NotFoundResult>());
    }

    [Test]
    public async Task ToggleSubtask_Found_ReturnsOk()
    {
        var todo = Todo.Create("task", Cadence.Daily, ownerId: 1).WithId(5);
        todo.AddSubtask(Subtask.Create("sub").WithId(10));
        _todos.Setup(t => t.GetByIdAsync(5, It.IsAny<CancellationToken>())).ReturnsAsync(todo);
        _persons.Setup(p => p.GetByIdAsync(1, It.IsAny<CancellationToken>())).ReturnsAsync(PersonWithId(1));

        var result = await _controller.ToggleSubtask(5, subId: 10, new ToggleSubtaskRequest(true), default);

        Assert.That(result.Result, Is.InstanceOf<OkObjectResult>());
    }

    [Test]
    public async Task RemoveSubtask_NotFound_ReturnsNotFound()
    {
        _todos.Setup(t => t.GetByIdAsync(7, It.IsAny<CancellationToken>())).ReturnsAsync((Todo?)null);

        Assert.That(await _controller.RemoveSubtask(7, subId: 1, default), Is.InstanceOf<NotFoundResult>());
    }

    [Test]
    public async Task RemoveSubtask_Found_ReturnsNoContent()
    {
        var todo = Todo.Create("task", Cadence.Daily, ownerId: 1).WithId(5);
        todo.AddSubtask(Subtask.Create("sub").WithId(10));
        _todos.Setup(t => t.GetByIdAsync(5, It.IsAny<CancellationToken>())).ReturnsAsync(todo);
        _persons.Setup(p => p.GetByIdAsync(1, It.IsAny<CancellationToken>())).ReturnsAsync(PersonWithId(1));

        Assert.That(await _controller.RemoveSubtask(5, subId: 10, default), Is.InstanceOf<NoContentResult>());
    }
}
