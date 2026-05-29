using api.Application.DTOs.Requests;
using api.Application.Persons;
using api.Application.Validators;
using api.Domain.Entities;
using api.Domain.Interfaces;
using Api.UnitTests.TestSupport;
using FluentValidation;

namespace Api.UnitTests.Services;

[TestFixture]
public class PersonServiceTests
{
    private Mock<IPersonRepository> _persons = null!;
    private PersonService _service = null!;

    [SetUp]
    public void SetUp()
    {
        _persons = new Mock<IPersonRepository>();
        _service = new PersonService(
            _persons.Object,
            new CreatePersonRequestValidator(),
            new UpdatePersonRequestValidator(),
            new UpdateScoringSettingsRequestValidator());
    }

    private static Person PersonWithId(int id) =>
        Person.Create($"P{id}", "PX", "#fff", $"p{id}@x.com").WithId(id);

    [Test]
    public void CreateAsync_InvalidEmail_ThrowsValidation()
    {
        var request = new CreatePersonRequest("Alice", "AC", "#7C3AED", "not-an-email", null);

        Assert.ThrowsAsync<ValidationException>(() => _service.CreateAsync(request));
    }

    [Test]
    public async Task CreateAsync_Valid_PersistsAndReturnsResponse()
    {
        var request = new CreatePersonRequest("Alice", "AC", "#7C3AED", "alice@example.com", null);

        var result = await _service.CreateAsync(request);

        Assert.Multiple(() =>
        {
            Assert.That(result.Name, Is.EqualTo("Alice"));
            Assert.That(result.Email, Is.EqualTo("alice@example.com"));
        });
        _persons.Verify(p => p.AddAsync(It.IsAny<Person>(), It.IsAny<CancellationToken>()), Times.Once);
        _persons.Verify(p => p.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Test]
    public async Task GetByIdAsync_NotFound_ReturnsNull()
    {
        _persons.Setup(p => p.GetByIdAsync(9, It.IsAny<CancellationToken>())).ReturnsAsync((Person?)null);

        Assert.That(await _service.GetByIdAsync(9), Is.Null);
    }

    [Test]
    public async Task GetByIdAsync_Found_MapsResponse()
    {
        _persons.Setup(p => p.GetByIdAsync(1, It.IsAny<CancellationToken>())).ReturnsAsync(PersonWithId(1));

        var result = await _service.GetByIdAsync(1);

        Assert.That(result, Is.Not.Null);
        Assert.That(result!.Id, Is.EqualTo(1));
    }

    [Test]
    public async Task GetAllAsync_MapsAll()
    {
        _persons.Setup(p => p.GetAllAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { PersonWithId(1), PersonWithId(2) });

        var result = await _service.GetAllAsync();

        Assert.That(result, Has.Count.EqualTo(2));
    }

    [Test]
    public async Task UpdateAsync_NotFound_ReturnsNull()
    {
        _persons.Setup(p => p.GetByIdAsync(9, It.IsAny<CancellationToken>())).ReturnsAsync((Person?)null);
        var request = new UpdatePersonRequest("New", "NN", "#000", "new@x.com", null);

        Assert.That(await _service.UpdateAsync(9, request), Is.Null);
    }

    [Test]
    public async Task UpdateAsync_Found_UpdatesFields()
    {
        _persons.Setup(p => p.GetByIdAsync(1, It.IsAny<CancellationToken>())).ReturnsAsync(PersonWithId(1));
        var request = new UpdatePersonRequest("Renamed", "RN", "#123456", "renamed@x.com", "http://img");

        var result = await _service.UpdateAsync(1, request);

        Assert.That(result, Is.Not.Null);
        Assert.Multiple(() =>
        {
            Assert.That(result!.Name, Is.EqualTo("Renamed"));
            Assert.That(result.Email, Is.EqualTo("renamed@x.com"));
            Assert.That(result.PhotoUrl, Is.EqualTo("http://img"));
        });
        _persons.Verify(p => p.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Test]
    public async Task UpdateScoringAsync_Found_ReplacesScoring()
    {
        _persons.Setup(p => p.GetByIdAsync(1, It.IsAny<CancellationToken>())).ReturnsAsync(PersonWithId(1));
        var request = new UpdateScoringSettingsRequest(
            IncludeDaily: false,
            IncludeWeekly: true,
            IncludeMonthly: true,
            IncludeQuarterly: false,
            IncludeOnce: true,
            StreakThreshold: 7);

        var result = await _service.UpdateScoringAsync(1, request);

        Assert.That(result, Is.Not.Null);
        Assert.Multiple(() =>
        {
            Assert.That(result!.Scoring.IncludeDaily, Is.False);
            Assert.That(result.Scoring.IncludeWeekly, Is.True);
            Assert.That(result.Scoring.IncludeOnce, Is.True);
            Assert.That(result.Scoring.StreakThreshold, Is.EqualTo(7));
        });
    }

    [Test]
    public async Task RemoveAsync_WhenRemoved_SavesAndReturnsTrue()
    {
        _persons.Setup(p => p.RemoveAsync(1, It.IsAny<CancellationToken>())).ReturnsAsync(true);

        Assert.That(await _service.RemoveAsync(1), Is.True);
        _persons.Verify(p => p.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Test]
    public async Task RemoveAsync_WhenNotRemoved_DoesNotSaveAndReturnsFalse()
    {
        _persons.Setup(p => p.RemoveAsync(2, It.IsAny<CancellationToken>())).ReturnsAsync(false);

        Assert.That(await _service.RemoveAsync(2), Is.False);
        _persons.Verify(p => p.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
    }
}
