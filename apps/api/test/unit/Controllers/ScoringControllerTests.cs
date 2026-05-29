using api.Application.Scoring;
using api.Controllers;
using api.Domain.Entities;
using api.Domain.Interfaces;
using Api.UnitTests.TestSupport;
using Microsoft.AspNetCore.Mvc;

namespace Api.UnitTests.Controllers;

/// <summary>
/// HTTP result-mapping tests for <see cref="ScoringController"/>. Real
/// <see cref="ScoringService"/> backed by mocked repositories and score cache.
/// </summary>
[TestFixture]
public class ScoringControllerTests
{
    private Mock<IPersonRepository> _persons = null!;
    private Mock<ITodoRepository> _todos = null!;
    private Mock<IScoreCache> _cache = null!;
    private ScoringController _controller = null!;

    [SetUp]
    public void SetUp()
    {
        _persons = new Mock<IPersonRepository>();
        _todos = new Mock<ITodoRepository>();
        _cache = new Mock<IScoreCache>();
        _controller = new ScoringController(new ScoringService(_persons.Object, _todos.Object, _cache.Object));
    }

    [Test]
    public async Task GetScore_ReturnsOkWithScore()
    {
        var person = Person.Create("Alice", "AC", "#fff", "a@x.com").WithId(1);
        _persons.Setup(p => p.GetByIdAsync(1, It.IsAny<CancellationToken>())).ReturnsAsync(person);
        _cache.Setup(c => c.GetAsync(1, It.IsAny<CancellationToken>())).ReturnsAsync(42); // cache hit

        var result = await _controller.GetScore(1, default);

        Assert.That(result.Result, Is.InstanceOf<OkObjectResult>());
        var ok = (OkObjectResult)result.Result!;
        var body = (api.Application.DTOs.Responses.PersonScoreResponse)ok.Value!;
        Assert.That(body.Score, Is.EqualTo(42));
    }
}
