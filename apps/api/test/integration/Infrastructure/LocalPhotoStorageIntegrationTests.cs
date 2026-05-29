using api.Infrastructure.Storage;
using Microsoft.Extensions.Options;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.PixelFormats;

namespace Api.IntegrationTests.Infrastructure;

/// <summary>
/// Exercises <see cref="LocalPhotoStorage"/> against the real filesystem in a
/// disposable temp directory (no database/Redis needed). Verifies WebP
/// conversion, downscaling, and deletion.
/// </summary>
[TestFixture]
public class LocalPhotoStorageIntegrationTests
{
    private string _root = null!;
    private LocalPhotoStorage _storage = null!;

    [SetUp]
    public void SetUp()
    {
        _root = Path.Combine(Path.GetTempPath(), "todo-photo-tests", Guid.NewGuid().ToString("N"));
        _storage = new LocalPhotoStorage(Options.Create(new PhotoStorageOptions { RootPath = _root }));
    }

    [TearDown]
    public void TearDown()
    {
        if (Directory.Exists(_root)) Directory.Delete(_root, recursive: true);
    }

    private static MemoryStream PngStream(int width, int height)
    {
        using var image = new Image<Rgba32>(width, height);
        var ms = new MemoryStream();
        image.SaveAsPng(ms);
        ms.Position = 0;
        return ms;
    }

    private string PathFromUrl(string url) =>
        Path.Combine(_root, "avatars", url["/uploads/avatars/".Length..]);

    [Test]
    public async Task SaveAsync_converts_to_webp_and_returns_unique_url()
    {
        using var input = PngStream(200, 200);

        var url = await _storage.SaveAsync(personId: 7, input);

        Assert.Multiple(() =>
        {
            Assert.That(url, Does.StartWith("/uploads/avatars/7-"));
            Assert.That(url, Does.EndWith(".webp"));
        });

        var path = PathFromUrl(url);
        Assert.That(File.Exists(path), Is.True);

        var format = await Image.DetectFormatAsync(path);
        Assert.That(format.Name, Is.EqualTo("Webp"));
    }

    [Test]
    public async Task SaveAsync_downscales_large_images_preserving_aspect()
    {
        using var input = PngStream(1000, 800);

        var url = await _storage.SaveAsync(7, input);

        using var saved = await Image.LoadAsync(PathFromUrl(url));
        Assert.Multiple(() =>
        {
            Assert.That(saved.Width, Is.LessThanOrEqualTo(512));
            Assert.That(saved.Height, Is.LessThanOrEqualTo(512));
            Assert.That(saved.Width, Is.LessThan(1000));          // actually downscaled
            Assert.That(saved.Width, Is.GreaterThan(saved.Height)); // landscape aspect preserved
        });
    }

    [Test]
    public async Task SaveAsync_does_not_upscale_small_images()
    {
        using var input = PngStream(100, 100);

        var url = await _storage.SaveAsync(7, input);

        using var saved = await Image.LoadAsync(PathFromUrl(url));
        Assert.Multiple(() =>
        {
            Assert.That(saved.Width, Is.EqualTo(100));
            Assert.That(saved.Height, Is.EqualTo(100));
        });
    }

    [Test]
    public async Task DeleteAsync_removes_the_file()
    {
        using var input = PngStream(50, 50);
        var url = await _storage.SaveAsync(7, input);
        var path = PathFromUrl(url);
        Assert.That(File.Exists(path), Is.True);

        await _storage.DeleteAsync(url);

        Assert.That(File.Exists(path), Is.False);
    }

    [Test]
    public void DeleteAsync_ignores_empty_missing_or_foreign_paths()
    {
        Assert.Multiple(() =>
        {
            Assert.DoesNotThrowAsync(() => _storage.DeleteAsync(""));
            Assert.DoesNotThrowAsync(() => _storage.DeleteAsync("/uploads/avatars/does-not-exist.webp"));
            Assert.DoesNotThrowAsync(() => _storage.DeleteAsync("/etc/passwd"));
        });
    }
}
