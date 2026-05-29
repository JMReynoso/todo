namespace api.Infrastructure.Storage;

/// <summary>Configuration for <see cref="LocalPhotoStorage"/>.</summary>
public class PhotoStorageOptions
{
    /// <summary>
    /// Absolute root directory uploaded files are written under. Resolved at
    /// startup in <c>Program.cs</c> (defaults to <c>{ContentRoot}/uploads</c>,
    /// which is <c>/app/uploads</c> in the container — the mounted volume).
    /// </summary>
    public string RootPath { get; set; } = "uploads";
}
