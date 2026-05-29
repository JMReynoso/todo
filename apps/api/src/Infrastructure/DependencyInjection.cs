using api.Domain.Interfaces;
using api.Infrastructure.Caching;
using api.Infrastructure.Persistence;
using api.Infrastructure.Repositories;
using Hangfire;
using Hangfire.PostgreSql;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;
using StackExchange.Redis;

namespace api.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var pgConnection = configuration.GetConnectionString("Postgres")!;

        // EF Core + Npgsql + NodaTime
        var dataSource = new NpgsqlDataSourceBuilder(pgConnection)
            .UseNodaTime()
            .Build();

        services.AddDbContext<AppDbContext>(options => options.UseNpgsql(dataSource));

        // Repositories
        services.AddScoped<ITodoRepository, TodoRepository>();
        services.AddScoped<IPersonRepository, PersonRepository>();

        // Redis — connect lazily via a factory so the multiplexer is created on
        // first resolution rather than during service registration. Connecting
        // eagerly here would block app startup on Redis availability and break
        // design-time tooling (e.g. `dotnet ef migrations`), which builds the
        // host without Redis running.
        services.AddSingleton<IConnectionMultiplexer>(_ =>
            ConnectionMultiplexer.Connect(configuration.GetConnectionString("Redis")!));

        services.AddSingleton<IScoreCache, RedisScoreCache>();

        // Hangfire
        services.AddHangfire(config => config
            .SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
            .UseSimpleAssemblyNameTypeSerializer()
            .UseRecommendedSerializerSettings()
            .UsePostgreSqlStorage(c => c.UseNpgsqlConnection(pgConnection)));

        services.AddHangfireServer();

        return services;
    }
}
