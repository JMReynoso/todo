using api.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Api.IntegrationTests.Infrastructure;

[TestFixture]
public class SeederIntegrationTests : DatabaseIntegrationTestBase
{
    [Test]
    public async Task Seeds_persons_and_todos_and_is_idempotent()
    {
        await using (var db = IntegrationFixture.NewDbContext())
            await Seeder.SeedAsync(db);

        // Second run must be a no-op thanks to the AnyAsync gate — not a duplicate.
        await using (var db = IntegrationFixture.NewDbContext())
            await Seeder.SeedAsync(db);

        await using (var verify = IntegrationFixture.NewDbContext())
        {
            var persons = await verify.Persons.CountAsync();
            var todos = await verify.Todos.CountAsync();

            Assert.Multiple(() =>
            {
                Assert.That(persons, Is.EqualTo(2));
                Assert.That(todos, Is.EqualTo(5));
            });
        }
    }
}
