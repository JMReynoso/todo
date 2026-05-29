namespace api.Domain.Interfaces;

/// <summary>
/// Persists a person's photo to durable storage and returns the relative URL
/// path under which the app serves it (e.g. "/uploads/avatars/3-ab12.webp").
/// Only the path is stored on the Person — the bytes live outside the database.
/// Implemented in Infrastructure.
/// </summary>
public interface IPhotoStorage
{
    /// <summary>
    /// Converts the image to WebP, downscales it to a bounded size, stores it
    /// under a unique file name, and returns the relative URL it is served from.
    /// </summary>
    /// <param name="personId">Owner of the photo; part of the stored file name.</param>
    /// <param name="content">The uploaded image bytes (any ImageSharp-supported format).</param>
    Task<string> SaveAsync(int personId, Stream content, CancellationToken ct = default);

    /// <summary>
    /// Deletes the file backing a previously returned URL. No-op if the URL is
    /// empty, doesn't exist, or resolves outside the storage root.
    /// </summary>
    Task DeleteAsync(string relativeUrl, CancellationToken ct = default);
}
