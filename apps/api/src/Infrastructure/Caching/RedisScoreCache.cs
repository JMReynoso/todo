using api.Domain.Interfaces;
using StackExchange.Redis;

namespace api.Infrastructure.Caching;

/// <summary>
/// Redis-backed <see cref="IScoreCache"/>. The cached value expires at the next
/// UTC midnight, so a person's score is computed at most once per calendar day;
/// the first request after midnight recomputes and re-caches it.
/// </summary>
public class RedisScoreCache(IConnectionMultiplexer redis) : IScoreCache
{
    private static string Key(int personId) => $"score:person:{personId}";

    public async Task<int?> GetAsync(int personId, CancellationToken ct = default)
    {
        var value = await redis.GetDatabase().StringGetAsync(Key(personId));
        return value.IsNullOrEmpty ? null : (int)value;
    }

    public Task SetAsync(int personId, int score, CancellationToken ct = default) =>
        redis.GetDatabase().StringSetAsync(Key(personId), score, TimeUntilEndOfUtcDay());

    public Task InvalidateAsync(int personId, CancellationToken ct = default) =>
        redis.GetDatabase().KeyDeleteAsync(Key(personId));

    private static TimeSpan TimeUntilEndOfUtcDay()
    {
        var now = DateTime.UtcNow;
        return now.Date.AddDays(1) - now;
    }
}
