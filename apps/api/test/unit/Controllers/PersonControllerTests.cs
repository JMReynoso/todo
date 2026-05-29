using api.Application.DTOs.Requests;
using api.Application.Persons;
using api.Application.Validators;
using api.Controllers;
using api.Domain.Entities;
using api.Domain.Interfaces;
using Api.UnitTests.TestSupport;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Api.UnitTests.Controllers;

/// <summary>
/// HTTP result-mapping tests for <see cref="PersonController"/>. Real
/// <see cref="PersonService"/> backed by a mocked repository and photo storage.
/// </summary>
[TestFixture]
public class PersonControllerTests
{
    private Mock<IPersonRepository> _persons = null!;
    private Mock<IPhotoStorage> _photoStorage = null!;
    private PersonController _controller = null!;

    [SetUp]
    public void SetUp()
    {
        _persons = new Mock<IPersonRepository>();
        _photoStorage = new Mock<IPhotoStorage>();

        var service = new PersonService(
            _persons.Object,
            _photoStorage.Object,
            new CreatePersonRequestValidator(),
            new UpdatePersonRequestValidator(),
            new UpdateScoringSettingsRequestValidator());

        _controller = new PersonController(service);
    }

    private static IFormFile FileWith(byte[] bytes, string fileName) =>
        new FormFile(new MemoryStream(bytes), 0, bytes.Length, "file", fileName)
        {
            Headers = new HeaderDictionary(),
            ContentType = "application/octet-stream",
        };

    private static Person PersonWithId(int id) =>
        Person.Create($"P{id}", "PX", "#fff", $"p{id}@x.com").WithId(id);

    [Test]
    public async Task GetById_NotFound_ReturnsNotFound()
    {
        _persons.Setup(p => p.GetByIdAsync(9, It.IsAny<CancellationToken>())).ReturnsAsync((Person?)null);

        var result = await _controller.GetById(9, default);

        Assert.That(result.Result, Is.InstanceOf<NotFoundResult>());
    }

    [Test]
    public async Task GetById_Found_ReturnsOk()
    {
        _persons.Setup(p => p.GetByIdAsync(1, It.IsAny<CancellationToken>())).ReturnsAsync(PersonWithId(1));

        var result = await _controller.GetById(1, default);

        Assert.That(result.Result, Is.InstanceOf<OkObjectResult>());
    }

    [Test]
    public async Task GetAll_ReturnsOk()
    {
        _persons.Setup(p => p.GetAllAsync(It.IsAny<CancellationToken>())).ReturnsAsync([]);

        var result = await _controller.GetAll(default);

        Assert.That(result.Result, Is.InstanceOf<OkObjectResult>());
    }

    [Test]
    public async Task Create_ReturnsCreatedAtActionPointingAtGetById()
    {
        var request = new CreatePersonRequest("Alice", "AC", "#7C3AED", "alice@example.com", null);

        var result = await _controller.Create(request, default);

        Assert.That(result.Result, Is.InstanceOf<CreatedAtActionResult>());
        var created = (CreatedAtActionResult)result.Result!;
        Assert.That(created.ActionName, Is.EqualTo(nameof(PersonController.GetById)));
    }

    [Test]
    public async Task Update_NotFound_ReturnsNotFound()
    {
        _persons.Setup(p => p.GetByIdAsync(9, It.IsAny<CancellationToken>())).ReturnsAsync((Person?)null);
        var request = new UpdatePersonRequest("New", "NN", "#000", "new@x.com", null);

        var result = await _controller.Update(9, request, default);

        Assert.That(result.Result, Is.InstanceOf<NotFoundResult>());
    }

    [Test]
    public async Task UpdateScoring_NotFound_ReturnsNotFound()
    {
        _persons.Setup(p => p.GetByIdAsync(9, It.IsAny<CancellationToken>())).ReturnsAsync((Person?)null);
        var request = new UpdateScoringSettingsRequest(true, true, false, false, false, 3);

        var result = await _controller.UpdateScoring(9, request, default);

        Assert.That(result.Result, Is.InstanceOf<NotFoundResult>());
    }

    [Test]
    public async Task UpdateScoring_Found_ReturnsOk()
    {
        _persons.Setup(p => p.GetByIdAsync(1, It.IsAny<CancellationToken>())).ReturnsAsync(PersonWithId(1));
        var request = new UpdateScoringSettingsRequest(true, true, false, false, false, 3);

        var result = await _controller.UpdateScoring(1, request, default);

        Assert.That(result.Result, Is.InstanceOf<OkObjectResult>());
    }

    [Test]
    public async Task UploadPhoto_NoFile_ReturnsBadRequest()
    {
        var empty = FileWith([], "avatar.png");

        var result = await _controller.UploadPhoto(1, empty, default);

        Assert.That(result.Result, Is.InstanceOf<BadRequestObjectResult>());
    }

    [Test]
    public async Task UploadPhoto_UnsupportedExtension_ReturnsBadRequest()
    {
        var file = FileWith([1, 2, 3], "avatar.txt");

        var result = await _controller.UploadPhoto(1, file, default);

        Assert.That(result.Result, Is.InstanceOf<BadRequestObjectResult>());
    }

    [Test]
    public async Task UploadPhoto_Valid_ReturnsOk()
    {
        _persons.Setup(p => p.GetByIdAsync(1, It.IsAny<CancellationToken>())).ReturnsAsync(PersonWithId(1));
        _photoStorage
            .Setup(s => s.SaveAsync(1, It.IsAny<Stream>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync("/uploads/avatars/1-new.webp");
        var file = FileWith([1, 2, 3], "avatar.png");

        var result = await _controller.UploadPhoto(1, file, default);

        Assert.That(result.Result, Is.InstanceOf<OkObjectResult>());
    }

    [Test]
    public async Task UploadPhoto_PersonNotFound_ReturnsNotFound()
    {
        _persons.Setup(p => p.GetByIdAsync(9, It.IsAny<CancellationToken>())).ReturnsAsync((Person?)null);
        _photoStorage
            .Setup(s => s.SaveAsync(It.IsAny<int>(), It.IsAny<Stream>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync("/uploads/avatars/9-new.webp");
        var file = FileWith([1, 2, 3], "avatar.png");

        var result = await _controller.UploadPhoto(9, file, default);

        Assert.That(result.Result, Is.InstanceOf<NotFoundResult>());
    }

    [Test]
    public async Task Remove_WhenRemoved_ReturnsNoContent()
    {
        _persons.Setup(p => p.RemoveAsync(1, It.IsAny<CancellationToken>())).ReturnsAsync(true);

        var result = await _controller.Remove(1, default);

        Assert.That(result, Is.InstanceOf<NoContentResult>());
    }

    [Test]
    public async Task Remove_WhenNotRemoved_ReturnsNotFound()
    {
        _persons.Setup(p => p.RemoveAsync(2, It.IsAny<CancellationToken>())).ReturnsAsync(false);

        var result = await _controller.Remove(2, default);

        Assert.That(result, Is.InstanceOf<NotFoundResult>());
    }
}
