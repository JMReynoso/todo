using Microsoft.EntityFrameworkCore;

namespace Api.IntegrationTests.Infrastructure;

/// <summary>
/// Verifies the migrations the fixture applied against a fresh database — i.e.
/// that the production migration path produces a complete, up-to-date schema.
/// </summary>
[TestFixture]
public class MigrationsIntegrationTests
{
    [Test]
    public async Task No_migrations_are_pending()
    {
        await using var db = IntegrationFixture.NewDbContext();

        var pending = await db.Database.GetPendingMigrationsAsync();

        Assert.That(pending, Is.Empty);
    }

    [Test]
    public async Task Applied_migrations_include_initial_create_and_todo_owner()
    {
        await using var db = IntegrationFixture.NewDbContext();

        var applied = (await db.Database.GetAppliedMigrationsAsync()).ToList();

        Assert.Multiple(() =>
        {
            Assert.That(applied, Has.Some.EndsWith("InitialCreate"));
            Assert.That(applied, Has.Some.EndsWith("AddTodoOwner"));
        });
    }
}
