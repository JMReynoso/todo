# Profile picture storage

Profile pictures are stored on the **host filesystem** via a Docker named volume. The API serves them as static files and saves only the URL path on the `Person` row in Postgres — no binary data goes in the database.

---

## Where the data lives

The compose files declare a named volume:

```yaml
volumes:
  uploads_data:
```

It is mounted into the API container at `/app/uploads`:

```yaml
# infra/docker-compose.prod.yml
api:
  volumes:
    - uploads_data:/app/uploads
```

Docker manages the volume on the host at:

```
/var/lib/docker/volumes/infra_uploads_data/_data/
```

Files written to `/app/uploads` inside the container land here on the host. The data persists across container restarts and image rebuilds. To back it up, copy that host path.

---

## How a photo is stored

When a photo is uploaded the API:

1. Receives the file via `POST /api/persons/{id}/photo` (multipart form field `file`).
2. Validates type and size at the controller edge — allowed `.jpg/.jpeg/.png/.webp`, max 5 MB.
3. Decodes the image (ImageSharp), **downscales** it to fit a 512×512 box (aspect ratio preserved, never upscaled), and re-encodes it as **WebP** (quality 80).
4. Writes it to `{uploads}/avatars/{personId}-{guid}.webp` via `IPhotoStorage`. The filename is **unique per upload** so the URL changes on every replacement, which busts browser/CDN caches.
5. Saves the new relative URL on the person, commits, then **deletes the person's previous file** (read from the old `PhotoUrl`) — best-effort, after the commit, so a delete failure leaves an orphan file rather than a person pointing at nothing.
6. Returns the updated `PersonResponse`.

> Corrupt content with a valid extension (e.g. a `.png` that isn't really an image) fails decoding and currently surfaces as a 500 — there's no global exception-to-400 mapping in the app yet.

### The uploads path

`Program.cs` resolves the uploads root once and uses it for both the storage and
the static-file middleware:

```csharp
var uploadsPath = builder.Configuration["PhotoStorage:RootPath"];
if (string.IsNullOrWhiteSpace(uploadsPath))
    uploadsPath = Path.Combine(builder.Environment.ContentRootPath, "uploads");
builder.Services.Configure<PhotoStorageOptions>(o => o.RootPath = uploadsPath);
```

Because both Dockerfiles set `WORKDIR /app`, `ContentRootPath` is `/app` in the
container, so this resolves to `/app/uploads` (the mounted volume) with no
hardcoding — and to `{project}/uploads` during local development. Set
`PhotoStorage:RootPath` to override with an absolute path.

### Serving the files

The file is served by ASP.NET Core's static file middleware in `Program.cs`:

```csharp
Directory.CreateDirectory(uploadsPath); // PhysicalFileProvider requires it to exist
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(uploadsPath),
    RequestPath  = "/uploads",
});
```

A request to `GET /uploads/avatars/3.png` maps directly to `{uploads}/avatars/3.png` on disk — no controller involved.

---

## The layering

| Layer | Type | Responsibility |
|-------|------|----------------|
| Controller | `PersonController.UploadPhoto` | Validate file type/size, hand the stream to the service |
| Application | `PersonService.SetPhotoAsync` | Resolve the person, store the new photo, save the URL, delete the previous file |
| Domain | `IPhotoStorage` | Abstraction over storage: `SaveAsync` + `DeleteAsync` |
| Infrastructure | `LocalPhotoStorage` | ImageSharp WebP conversion + resize; writes/deletes on the local filesystem |

Image processing uses [SixLabors.ImageSharp](https://github.com/SixLabors/ImageSharp)
(v3, Six Labors Split License — free for individuals/small businesses).

Keeping file I/O behind `IPhotoStorage` mirrors how the repositories and the
score cache are abstracted, and lets the Application layer stay free of any
filesystem dependency.

---

## How the URL is stored in Postgres

The `Persons` table has a nullable `PhotoUrl` text column. Only the **path** is
stored, not the full origin, so the frontend can prefix it with whatever base
URL it needs.

```csharp
// apps/api/src/Domain/Entities/Person.cs
public string? PhotoUrl { get; private set; }
public void SetPhotoUrl(string? photoUrl) => PhotoUrl = photoUrl;
```

| Id | Name | Email | PhotoUrl |
|----|------|-------|----------|
| 1  | Alice Chen | alice@example.com | `/uploads/avatars/1-9f3c2a….webp` |
| 2  | Bob Reyes  | bob@example.com   | `null` |

No migration is required for uploads themselves — `PhotoUrl` already exists on
the `Person` entity.
