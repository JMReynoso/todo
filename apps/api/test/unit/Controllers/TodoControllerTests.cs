using api.Application.DTOs.Requests;
using api.Application.Todos;
using api.Application.Validators;
using api.Controllers;
using api.Domain.Entities;
using api.Domain.Enums;
using api.Domain.Interfaces;
using Api.UnitTests.TestSupport;
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
    private TodoController _controller = null!;

    [SetUp]
    public void SetUp()
    {
        _todos = new Mock<ITodoRepository>();
        _persons = new Mock<IPersonRepository>();

        var service = new TodoService(
            _todos.Object,
            _persons.Object,
            new CreateTodoRequestValidator(),
            new UpdateTodoRequestValidator(),
            new CreateSubtaskRequestValidator());

        _controller = new TodoController(service);
    }

    private static Person PersonWithId(int id) =>
        Person.Create($"P{id}", "PX", "#fff", $"p{id}@x.com").WithId(id);

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
        _todos.Setup(t => t.GetAllAsync(It.IsAny<CancellationToken>())).ReturnsAsync([]);
        _persons.Setup(p => p.GetAllAsync(It.IsAny<CancellationToken>())).ReturnsAsync([]);

        var result = await _controller.GetAll(default);

        Assert.That(result.Result, Is.InstanceOf<OkObjectResult>());
    }

    [Test]
    public async Task Create_ReturnsCreatedAtActionPointingAtGetById()
    {
        _persons.Setup(p => p.GetByIdAsync(1, It.IsAny<CancellationToken>())).ReturnsAsync(PersonWithId(1));
        var request = new CreateTodoRequest("Write tests", Cadence.Daily, OwnerId: 1);

        var result = await _controller.Create(request, default);

        Assert.That(result.Result, Is.InstanceOf<CreatedAtActionResult>());
        var created = (CreatedAtActionResult)result.Result!;
        Assert.That(created.ActionName, Is.EqualTo(nameof(TodoController.GetById)));
    }

    [Test]
    public async Task Update_NotFound_ReturnsNotFound()
    {
        _todos.Setup(t => t.GetByIdAsync(5, It.IsAny<CancellationToken>())).ReturnsAsync((Todo?)null);
        var request = new UpdateTodoRequest("t", Priority.Med, "", null, null, "", AssigneeId: null);

        var result = await _controller.Update(5, request, default);

        Assert.That(result.Result, Is.InstanceOf<NotFoundResult>());
    }

    [Test]
    public async Task Update_Found_ReturnsOk()
    {
        var todo = Todo.Create("old", Cadence.Daily, ownerId: 1).WithId(5);
        _todos.Setup(t => t.GetByIdAsync(5, It.IsAny<CancellationToken>())).ReturnsAsync(todo);
        _persons.Setup(p => p.GetByIdAsync(1, It.IsAny<CancellationToken>())).ReturnsAsync(PersonWithId(1));
        var request = new UpdateTodoRequest("new", Priority.High, "", null, null, "", AssigneeId: null);

        var result = await _controller.Update(5, request, default);

        Assert.That(result.Result, Is.InstanceOf<OkObjectResult>());
    }

    [Test]
    public async Task Remove_WhenRemoved_ReturnsNoContent()
    {
        _todos.Setup(t => t.RemoveAsync(5, It.IsAny<CancellationToken>())).ReturnsAsync(true);

        var result = await _controller.Remove(5, default);

        Assert.That(result, Is.InstanceOf<NoContentResult>());
    }

    [Test]
    public async Task Remove_WhenNotRemoved_ReturnsNotFound()
    {
        _todos.Setup(t => t.RemoveAsync(6, It.IsAny<CancellationToken>())).ReturnsAsync(false);

        var result = await _controller.Remove(6, default);

        Assert.That(result, Is.InstanceOf<NotFoundResult>());
    }
}
