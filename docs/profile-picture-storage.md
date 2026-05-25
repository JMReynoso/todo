# Profile picture storage

Profile pictures are stored on the **host filesystem** via a Docker named volume. The API serves them as static files and saves only the URL path in Postgres — no binary data goes in the database.

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

Docker manages the volume on the Mac mini at:

```
/var/lib/docker/volumes/infra_uploads_data/_data/
```

Files written to `/app/uploads` inside the container land here on the host. The data persists across container restarts and image rebuilds. To back it up, copy that host path.

---

## How a photo is stored

When a user uploads a photo the API:

1. Receives the file via `POST /api/users/{id}/avatar`
2. Resizes / converts it to WebP (optional but recommended)
3. Writes it to `/app/uploads/avatars/{userId}.webp`
4. Returns the relative URL `/uploads/avatars/{userId}.webp`

The file is served by ASP.NET Core's static file middleware wired up in `Program.cs`:

```csharp
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider("/app/uploads"),
    RequestPath  = "/uploads"
});
```

A request to `GET /uploads/avatars/abc123.webp` maps directly to `/app/uploads/avatars/abc123.webp` on disk — no controller involved.

---

## How the URL is stored in Postgres

The `Users` table has a nullable `photo_url` text column. Only the **path** is stored, not the full origin, so the frontend can prefix it with whatever base URL it needs.

### Entity

```csharp
// apps/api/src/Domain/Entities/User.cs
public class User : Entity
{
    public string Name     { get; private set; } = string.Empty;
    public string Email    { get; private set; } = string.Empty;
    public string Initials { get; private set; } = string.Empty;
    public string Color    { get; private set; } = string.Empty;
    public string? PhotoUrl { get; private set; }

    public void SetPhoto(string relativePath) => PhotoUrl = relativePath;
    public void ClearPhoto()                  => PhotoUrl = null;
}
```

### EF Core configuration

```csharp
// apps/api/src/Infrastructure/Persistence/Configurations/UserConfiguration.cs
builder.Property(x => x.PhotoUrl).HasMaxLength(500);
```

### What a row looks like

| id | name | email | photo_url |
|----|------|-------|-----------|
| `a1b2…` | Justin | justin@example.com | `/uploads/avatars/a1b2….webp` |
| `c3d4…` | Maya   | maya@example.com   | `null` |

### Migration

After adding the `User` entity run:

```bash
dotnet ef migrations add AddUsers --project src/Infrastructure --startup-project .
dotnet ef database update  --project src/Infrastructure --startup-project .
```

---

## Deleting a photo

When a user removes their photo:

1. Delete the file at `/app/uploads/avatars/{userId}.webp`
2. Call `user.ClearPhoto()` and save — sets `photo_url` to `null` in Postgres
