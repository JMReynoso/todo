using api.Infrastructure.Caching;
using StackExchange.Redis;

namespace Api.IntegrationTests.Infrastructure;

[TestFixture]
public class RedisScoreCacheIntegrationTests
{
    private IConnectionMultiplexer _redis = null!;
    private RedisScoreCache _cache = null!;

    [SetUp]
    public void SetUp()
    {
        _redis = IntegrationFixture.NewRedis();
        _cache = new RedisScoreCache(_redis);
    }

    [TearDown]
    public async Task TearDown()
    {
        await _redis.GetDatabase().ExecuteAsync("FLUSHDB");
        await _redis.DisposeAsync();
    }

    [Test]
    public async Task Set_then_Get_returns_the_cached_score()
    {
        await _cache.SetAsync(personId: 1, score: 7);

        Assert.That(await _cache.GetAsync(1), Is.EqualTo(7));
    }

    [Test]
    public async Task Get_returns_null_when_nothing_cached()
    {
        Assert.That(await _cache.GetAsync(404), Is.Null);
    }

    [Test]
    public async Task Set_applies_an_expiry_within_one_day()
    {
        await _cache.SetAsync(personId: 1, score: 5);

        // Cache entries expire at the next UTC midnight, so the TTL is positive
        // and never exceeds 24 hours.
        var ttl = await _redis.GetDatabase().KeyTimeToLiveAsync("score:person:1");

        Assert.That(ttl, Is.Not.Null);
        Assert.That(ttl!.Value, Is.GreaterThan(TimeSpan.Zero));
        Assert.That(ttl.Value, Is.LessThanOrEqualTo(TimeSpan.FromDays(1)));
    }
}
