using api.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace api.Infrastructure.Persistence;

/// <summary>
/// One-shot production bootstrap: creates the initial admin accounts so
/// someone can log in. Triggered manually via <c>dotnet api.dll --seed</c>
/// (see <c>Program.cs</c>) rather than running on every startup, because
/// production should never side-effect a database mid-deploy.
/// <para>
/// Idempotent: bails if any Person already exists, so re-running on an
/// already-bootstrapped database is a no-op rather than an error.
/// </para>
/// <para>
/// Required environment variables (read via IConfiguration; the double
/// underscore in env var names maps to a colon in config keys). One full
/// set per admin, indexed 1..<see cref="AdminCount"/>:
/// <list type="bullet">
///   <item><c>SEED_ADMIN{N}_NAME</c>     → <c>Seed:Admin{N}Name</c></item>
///   <item><c>SEED_ADMIN{N}_INITIALS</c> → <c>Seed:Admin{N}Initials</c></item>
///   <item><c>SEED_ADMIN{N}_COLOR</c>    → <c>Seed:Admin{N}Color</c> (hex, e.g. #c97a3c)</item>
///   <item><c>SEED_ADMIN{N}_EMAIL</c>    → <c>Seed:Admin{N}Email</c></item>
///   <item><c>SEED_ADMIN{N}_PASSWORD</c> → <c>Seed:Admin{N}Password</c> (plaintext at boot; bcrypt-hashed before storage)</item>
/// </list>
/// Values live in the gitignored <c>.env</c> at the repo root. Any missing
/// value throws — the seed run fails loudly rather than silently creating
/// an account with empty fields. To add another admin, bump
/// <see cref="AdminCount"/> and add the matching env vars.
/// </para>
/// </summary>
public static class ProdSeeder
{
    private const int AdminCount = 2;

    public static async Task SeedAsync(
        AppDbContext db,
        IConfiguration config,
        CancellationToken ct = default)
    {
        if (await db.Persons.AnyAsync(ct)) return;

        for (var i = 1; i <= AdminCount; i++)
        {
            var a = ReadAdmin(config, i);
            var admin = Person.Create(a.Name, a.Initials, a.Color, a.Email);
            admin.SetPasswordHash(BCrypt.Net.BCrypt.HashPassword(a.Password));
            db.Persons.Add(admin);
        }

        await db.SaveChangesAsync(ct);
    }

    private static (string Name, string Initials, string Color, string Email, string Password)
        ReadAdmin(IConfiguration config, int index)
    {
        var configPrefix = $"Seed:Admin{index}";
        var envPrefix = $"SEED_ADMIN{index}";
        return (
            Required(config, $"{configPrefix}Name", $"{envPrefix}_NAME"),
            Required(config, $"{configPrefix}Initials", $"{envPrefix}_INITIALS"),
            Required(config, $"{configPrefix}Color", $"{envPrefix}_COLOR"),
            Required(config, $"{configPrefix}Email", $"{envPrefix}_EMAIL"),
            Required(config, $"{configPrefix}Password", $"{envPrefix}_PASSWORD"));
    }

    private static string Required(IConfiguration config, string key, string envVar)
        => config[key] ?? throw new InvalidOperationException(
            $"Production seed requires config '{key}'. Set env var {envVar} in .env before running --seed.");
}
