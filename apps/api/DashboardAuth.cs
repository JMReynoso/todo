using System.Security.Cryptography;
using System.Text;
using Hangfire.Dashboard;

namespace api;

/// <summary>
/// Shared HTTP Basic auth check for the developer-facing dashboards (Swagger UI
/// and the Hangfire dashboard). Credentials come from configuration — set
/// Dashboard:Username / Dashboard:Password (env: Dashboard__Username /
/// Dashboard__Password) in production. If either is unset, access is denied:
/// these surfaces never go open to the internet by accident.
/// </summary>
public static class DashboardAuth
{
    public static bool IsAuthenticated(HttpContext http)
    {
        var config = http.RequestServices.GetRequiredService<IConfiguration>();
        var expectedUser = config["Dashboard:Username"];
        var expectedPass = config["Dashboard:Password"];

        // No credentials configured → deny rather than fall open.
        if (string.IsNullOrEmpty(expectedUser) || string.IsNullOrEmpty(expectedPass))
            return false;

        string? header = http.Request.Headers.Authorization;
        if (header is null || !header.StartsWith("Basic ", StringComparison.OrdinalIgnoreCase))
            return false;

        string decoded;
        try
        {
            decoded = Encoding.UTF8.GetString(Convert.FromBase64String(header["Basic ".Length..].Trim()));
        }
        catch (FormatException)
        {
            return false;
        }

        var separator = decoded.IndexOf(':');
        if (separator < 0)
            return false;

        var user = decoded[..separator];
        var pass = decoded[(separator + 1)..];

        return FixedTimeEquals(user, expectedUser) && FixedTimeEquals(pass, expectedPass);
    }

    /// <summary>Constant-time string compare to avoid leaking length/content via timing.</summary>
    private static bool FixedTimeEquals(string a, string b) =>
        CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(a), Encoding.UTF8.GetBytes(b));

    public static void Challenge(HttpContext http, string realm)
    {
        http.Response.StatusCode = StatusCodes.Status401Unauthorized;
        http.Response.Headers.WWWAuthenticate = $"Basic realm=\"{realm}\"";
    }
}

/// <summary>Gates the Swagger UI middleware branch behind <see cref="DashboardAuth"/>.</summary>
public class DashboardBasicAuthMiddleware(RequestDelegate next)
{
    public async Task Invoke(HttpContext context)
    {
        if (!DashboardAuth.IsAuthenticated(context))
        {
            DashboardAuth.Challenge(context, "Swagger");
            return;
        }

        await next(context);
    }
}

/// <summary>Gates the Hangfire dashboard behind <see cref="DashboardAuth"/>.</summary>
public class HangfireDashboardBasicAuthFilter : IDashboardAuthorizationFilter
{
    public bool Authorize(DashboardContext context)
    {
        var http = context.GetHttpContext();
        if (DashboardAuth.IsAuthenticated(http))
            return true;

        DashboardAuth.Challenge(http, "Hangfire");
        return false;
    }
}
