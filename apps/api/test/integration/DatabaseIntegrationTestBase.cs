using Microsoft.EntityFrameworkCore;

namespace Api.IntegrationTests;

/// <summary>
/// Base for tests that touch the database. Truncates all tables before each test
/// so cases stay isolated and identities restart. CASCADE clears the FK graph.
/// </summary>
public abstract class DatabaseIntegrationTestBase
{
    [SetUp]
    public async Task ResetDatabase()
    {
        await using var db = IntegrationFixture.NewDbContext();
        await db.Database.ExecuteSqlRawAsync(
            "TRUNCATE \"Subtask\", \"Todos\", \"Persons\" RESTART IDENTITY CASCADE;");
    }
}
