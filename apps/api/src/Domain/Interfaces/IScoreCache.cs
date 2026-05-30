namespace api.Domain.Interfaces;

/// <summary>
/// Caches a person's computed score for the remainder of the current day.
/// Scores are recomputed at most once per day, so reads within the same day
/// return the cached value instead of re-running the calculation.
/// </summary>
public interface IScoreCache
{
    /// <summary>Returns the cached score for today, or null if none is cached.</summary>
    Task<int?> GetAsync(int personId, CancellationToken ct = default);

    /// <summary>Caches the score until the end of the current day.</summary>
    Task SetAsync(int personId, int score, CancellationToken ct = default);

    /// <summary>Removes the cached score so the next read recomputes it.</summary>
    Task InvalidateAsync(int personId, CancellationToken ct = default);
}
