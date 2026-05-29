using api.Domain.Interfaces;
using Microsoft.Extensions.Options;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Webp;
using SixLabors.ImageSharp.Processing;

namespace api.Infrastructure.Storage;

/// <summary>
/// Stores photos on the local filesystem under <c>{RootPath}/avatars</c>. Each
/// upload is decoded, downscaled to fit a bounding box, re-encoded as WebP, and
/// written under a unique name (so the URL changes and caches bust). The caller
/// removes the prior file via <see cref="DeleteAsync"/>.
/// </summary>
public class LocalPhotoStorage(IOptions<PhotoStorageOptions> options) : IPhotoStorage
{
    private const string UrlPrefix = "/uploads";
    private const string SubFolder = "avatars";
    private const int MaxDimension = 512; // px; avatars don't need to be larger

    private readonly string _root = options.Value.RootPath;

    public async Task<string> SaveAsync(int personId, Stream content, CancellationToken ct = default)
    {
        var dir = Path.Combine(_root, SubFolder);
        Directory.CreateDirectory(dir);

        using var image = await Image.LoadAsync(content, ct);

        // Downscale to fit MaxDimension x MaxDimension, preserving aspect ratio.
        // Only shrink — never upscale a smaller source.
        if (image.Width > MaxDimension || image.Height > MaxDimension)
        {
            image.Mutate(x => x.Resize(new ResizeOptions
            {
                Mode = ResizeMode.Max,
                Size = new Size(MaxDimension, MaxDimension),
            }));
        }

        var fileName = $"{personId}-{Guid.NewGuid():N}.webp";
        await image.SaveAsWebpAsync(Path.Combine(dir, fileName), new WebpEncoder { Quality = 80 }, ct);

        return $"{UrlPrefix}/{SubFolder}/{fileName}";
    }

    public Task DeleteAsync(string relativeUrl, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(relativeUrl) || !relativeUrl.StartsWith(UrlPrefix + "/", StringComparison.Ordinal))
            return Task.CompletedTask;

        var relativePath = relativeUrl[(UrlPrefix.Length + 1)..].Replace('/', Path.DirectorySeparatorChar);
        var fullPath = Path.GetFullPath(Path.Combine(_root, relativePath));

        // Guard against path traversal: only ever delete inside the storage root.
        var rootFull = Path.GetFullPath(_root);
        if (fullPath.StartsWith(rootFull, StringComparison.Ordinal) && File.Exists(fullPath))
            File.Delete(fullPath);

        return Task.CompletedTask;
    }
}
