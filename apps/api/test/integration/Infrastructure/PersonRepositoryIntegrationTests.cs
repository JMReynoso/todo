using api.Domain.Entities;
using api.Infrastructure.Repositories;

namespace Api.IntegrationTests.Infrastructure;

[TestFixture]
public class PersonRepositoryIntegrationTests : DatabaseIntegrationTestBase
{
    [Test]
    public async Task Add_then_GetById_roundtrips_including_owned_scoring_settings()
    {
        int id;
        await using (var db = IntegrationFixture.NewDbContext())
        {
            var repo = new PersonRepository(db);
            var person = Person.Create("Alice Chen", "AC", "#7C3AED", "alice@example.com", "http://img/a.png");
            person.ReplaceScoring(ScoringSettings.Create(
                includeDaily: true,
                includeWeekly: false,
                includeMonthly: true,
                includeQuarterly: false,
                includeOnce: true,
                streakThreshold: 9));
            await repo.AddAsync(person);
            await repo.SaveChangesAsync();
            id = person.Id;
        }

        Assert.That(id, Is.GreaterThan(0)); // identity assigned by Postgres

        await using (var db = IntegrationFixture.NewDbContext())
        {
            var loaded = await new PersonRepository(db).GetByIdAsync(id);

            Assert.That(loaded, Is.Not.Null);
            Assert.Multiple(() =>
            {
                Assert.That(loaded!.Name, Is.EqualTo("Alice Chen"));
                Assert.That(loaded.Email, Is.EqualTo("alice@example.com"));
                Assert.That(loaded.PhotoUrl, Is.EqualTo("http://img/a.png"));
                // Owned ScoringSettings is stored as Scoring_* columns and rehydrated.
                Assert.That(loaded.Scoring.IncludeDaily, Is.True);
                Assert.That(loaded.Scoring.IncludeWeekly, Is.False);
                Assert.That(loaded.Scoring.IncludeMonthly, Is.True);
                Assert.That(loaded.Scoring.IncludeQuarterly, Is.False);
                Assert.That(loaded.Scoring.IncludeOnce, Is.True);
                Assert.That(loaded.Scoring.StreakThreshold, Is.EqualTo(9));
            });
        }
    }

    [Test]
    public async Task GetAll_returns_all_inserted_people()
    {
        await using (var db = IntegrationFixture.NewDbContext())
        {
            var repo = new PersonRepository(db);
            await repo.AddAsync(Person.Create("Alice", "AC", "#111", "alice@x.com"));
            await repo.AddAsync(Person.Create("Bob", "BR", "#222", "bob@x.com"));
            await repo.SaveChangesAsync();
        }

        await using (var db = IntegrationFixture.NewDbContext())
        {
            var all = await new PersonRepository(db).GetAllAsync();
            Assert.That(all, Has.Count.EqualTo(2));
        }
    }

    [Test]
    public async Task Remove_deletes_the_person()
    {
        int id;
        await using (var db = IntegrationFixture.NewDbContext())
        {
            var repo = new PersonRepository(db);
            var person = Person.Create("Temp", "TT", "#333", "temp@x.com");
            await repo.AddAsync(person);
            await repo.SaveChangesAsync();
            id = person.Id;
        }

        await using (var db = IntegrationFixture.NewDbContext())
        {
            var repo = new PersonRepository(db);
            var removed = await repo.RemoveAsync(id);
            await repo.SaveChangesAsync();
            Assert.That(removed, Is.True);
        }

        await using (var db = IntegrationFixture.NewDbContext())
        {
            Assert.That(await new PersonRepository(db).GetByIdAsync(id), Is.Null);
        }
    }
}
