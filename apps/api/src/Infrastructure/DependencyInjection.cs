using api.Domain.Interfaces;
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

        // Redis
        services.AddSingleton<IConnectionMultiplexer>(
            ConnectionMultiplexer.Connect(configuration.GetConnectionString("Redis")!));

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
