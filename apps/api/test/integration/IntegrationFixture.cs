using api.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using StackExchange.Redis;
using Testcontainers.PostgreSql;
using Testcontainers.Redis;

namespace Api.IntegrationTests;

/// <summary>
/// Assembly-wide setup: starts throwaway PostgreSQL and Redis containers (matching
/// the prod images), applies EF migrations once, and exposes factories for a fresh
/// <see cref="AppDbContext"/> / Redis connection. Requires a running Docker daemon.
/// </summary>
[SetUpFixture]
public class IntegrationFixture
{
    private static PostgreSqlContainer _postgres = null!;
    private static RedisContainer _redis = null!;
    private static NpgsqlDataSource _dataSource = null!;

    public static string RedisConnectionString { get; private set; } = null!;

    [OneTimeSetUp]
    public async Task GlobalSetUp()
    {
        _postgres = new PostgreSqlBuilder("postgres:17-alpine").Build();
        _redis = new RedisBuilder("redis:7-alpine").Build();

        await Task.WhenAll(_postgres.StartAsync(), _redis.StartAsync());

        RedisConnectionString = _redis.GetConnectionString();

        // Mirror production's data source configuration (NodaTime plugin).
        _dataSource = new NpgsqlDataSourceBuilder(_postgres.GetConnectionString())
            .UseNodaTime()
            .Build();

        // Apply migrations against the fresh database — this also validates that
        // the migrations apply cleanly end to end.
        await using var db = NewDbContext();
        await db.Database.MigrateAsync();
    }

    [OneTimeTearDown]
    public async Task GlobalTearDown()
    {
        if (_dataSource is not null) await _dataSource.DisposeAsync();
        if (_redis is not null) await _redis.DisposeAsync();
        if (_postgres is not null) await _postgres.DisposeAsync();
    }

    /// <summary>A new context over the shared container — one per logical operation
    /// so tests read through the database rather than a stale change tracker.</summary>
    public static AppDbContext NewDbContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>().UseNpgsql(_dataSource).Options);

    public static IConnectionMultiplexer NewRedis() =>
        ConnectionMultiplexer.Connect(RedisConnectionString);
}
