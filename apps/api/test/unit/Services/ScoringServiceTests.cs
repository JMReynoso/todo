using api.Application.Scoring;
using api.Domain.Entities;
using api.Domain.Enums;
using api.Domain.Exceptions;
using api.Domain.Interfaces;
using Api.UnitTests.TestSupport;

namespace Api.UnitTests.Services;

[TestFixture]
public class ScoringServiceTests
{
    private Mock<IPersonRepository> _persons = null!;
    private Mock<ITodoRepository> _todos = null!;
    private Mock<IScoreCache> _cache = null!;
    private ScoringService _service = null!;

    [SetUp]
    public void SetUp()
    {
        _persons = new Mock<IPersonRepository>();
        _todos = new Mock<ITodoRepository>();
        _cache = new Mock<IScoreCache>();
        _service = new ScoringService(_persons.Object, _todos.Object, _cache.Object);
    }

    private static Todo AssignedDoneDaily(int assigneeId)
    {
        var todo = Todo.Create("task", Cadence.Daily, ownerId: assigneeId);
        todo.SetPriority(Priority.High); // base 1 * 2.0 = 2 under default settings
        todo.Complete();
        todo.AssignTo(assigneeId);
        return todo;
    }

    [Test]
    public void CalculateScoreAsync_PersonNotFound_Throws()
    {
        _persons.Setup(p => p.GetByIdAsync(99, It.IsAny<CancellationToken>()))
            .ReturnsAsync((Person?)null);

        Assert.ThrowsAsync<DomainException>(() => _service.CalculateScoreAsync(99));
    }

    [Test]
    public async Task CalculateScoreAsync_CacheHit_ReturnsCachedScoreWithoutComputing()
    {
        var person = Person.Create("Alice", "AC", "#fff", "a@x.com").WithId(1);
        _persons.Setup(p => p.GetByIdAsync(1, It.IsAny<CancellationToken>())).ReturnsAsync(person);
        _cache.Setup(c => c.GetAsync(1, It.IsAny<CancellationToken>())).ReturnsAsync(42);

        var result = await _service.CalculateScoreAsync(1);

        Assert.Multiple(() =>
        {
            Assert.That(result.PersonId, Is.EqualTo(1));
            Assert.That(result.Name, Is.EqualTo("Alice"));
            Assert.That(result.Score, Is.EqualTo(42));
        });
        // Cache hit must not touch the todo store or recompute/recache.
        _todos.Verify(t => t.GetAllAsync(It.IsAny<CancellationToken>()), Times.Never);
        _cache.Verify(c => c.SetAsync(It.IsAny<int>(), It.IsAny<int>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Test]
    public async Task CalculateScoreAsync_CacheMiss_ComputesFromAssignedTodosAndCaches()
    {
        var person = Person.Create("Alice", "AC", "#fff", "a@x.com").WithId(1);
        _persons.Setup(p => p.GetByIdAsync(1, It.IsAny<CancellationToken>())).ReturnsAsync(person);
        _cache.Setup(c => c.GetAsync(1, It.IsAny<CancellationToken>())).ReturnsAsync((int?)null);
        _todos.Setup(t => t.GetAllAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[]
            {
                AssignedDoneDaily(1), // counted: score 2
                AssignedDoneDaily(2), // belongs to someone else, filtered out
            });

        var result = await _service.CalculateScoreAsync(1);

        Assert.That(result.Score, Is.EqualTo(2));
        _cache.Verify(c => c.SetAsync(1, 2, It.IsAny<CancellationToken>()), Times.Once);
    }
}
