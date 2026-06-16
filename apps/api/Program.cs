using System.Text;
using api.Application;
using api.Application.Auth;
using api.Application.Todos;
using api.Infrastructure;
using api.Infrastructure.Persistence;
using api.Infrastructure.Storage;
using Hangfire;
using Hangfire.Dashboard;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Microsoft.IdentityModel.Tokens;
using Serilog;
using Serilog.Events;

Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Override("Microsoft", LogEventLevel.Information)
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .CreateBootstrapLogger();

try
{
    Log.Information("Starting application");

    var builder = WebApplication.CreateBuilder(args);

    builder.Host.UseSerilog((context, services, config) => config
        .ReadFrom.Configuration(context.Configuration)
        .ReadFrom.Services(services)
        .Enrich.FromLogContext());

    builder.Services.AddCors(options => options.AddDefaultPolicy(policy =>
        policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()));

    // The JWT signing secret must come from configuration (env var Jwt__Secret in
    // prod). Fail fast rather than boot with a missing/weak key — a known secret
    // lets anyone forge a token for any user. HMAC-SHA256 needs at least 256 bits.
    var jwtSecret = builder.Configuration["Jwt:Secret"];
    if (string.IsNullOrWhiteSpace(jwtSecret) || Encoding.UTF8.GetByteCount(jwtSecret) < 32)
        throw new InvalidOperationException(
            "Jwt:Secret is missing or too short. Set the JWT_SECRET environment variable " +
            "(mapped to Jwt__Secret) to a random value of at least 32 bytes.");

    builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection("Jwt"));
    builder.Services.Configure<JwtOptions>(o => o.Secret = jwtSecret);
    builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
        .AddJwtBearer(options =>
        {
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
                ValidateIssuer = false,
                ValidateAudience = false,
                // Tokens carry an expiry now — enforce it so leaked/old tokens die.
                RequireExpirationTime = true,
                ValidateLifetime = true,
            };
        });

    // Default-deny: every endpoint requires an authenticated user unless it opts
    // out with [AllowAnonymous] (e.g. login). This is the safety net so a
    // controller that forgets [Authorize] isn't silently left wide open.
    builder.Services.AddAuthorizationBuilder()
        .SetFallbackPolicy(new AuthorizationPolicyBuilder()
            .RequireAuthenticatedUser()
            .Build());

    builder.Services.AddControllers()
        .AddJsonOptions(o =>
            o.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter()));

    // Map anticipated exceptions (validation, domain rules, bad uploads) to
    // 400 ProblemDetails instead of leaking 500s. See GlobalExceptionHandler.
    builder.Services.AddProblemDetails();
    builder.Services.AddExceptionHandler<api.GlobalExceptionHandler>();
    builder.Services.AddApplication();
    builder.Services.AddInfrastructure(builder.Configuration);

    builder.Services.AddEndpointsApiExplorer();
    builder.Services.AddSwaggerGen(options =>
    {
        // Wire up JWT bearer auth so Swagger UI can exercise the protected
        // endpoints without the frontend. Log in via POST /api/auth/login
        // (seeded dev users: alice@example.com / alice123), copy the returned
        // token, then click "Authorize" and paste it — the scheme below adds
        // the "Authorization: Bearer <token>" header to every request.
        var scheme = new Microsoft.OpenApi.Models.OpenApiSecurityScheme
        {
            Name = "Authorization",
            Type = Microsoft.OpenApi.Models.SecuritySchemeType.Http,
            Scheme = "bearer",
            BearerFormat = "JWT",
            In = Microsoft.OpenApi.Models.ParameterLocation.Header,
            Description = "Paste only the JWT from POST /api/auth/login (no \"Bearer \" prefix).",
            Reference = new Microsoft.OpenApi.Models.OpenApiReference
            {
                Id = JwtBearerDefaults.AuthenticationScheme,
                Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
            },
        };

        options.AddSecurityDefinition(JwtBearerDefaults.AuthenticationScheme, scheme);
        options.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
        {
            [scheme] = Array.Empty<string>(),
        });
    });

    // Resolve the uploads root: an absolute "PhotoStorage:RootPath" override if
    // set, otherwise {ContentRoot}/uploads — which is /app/uploads in the
    // container (the mounted volume) and a local folder during development.
    var uploadsPath = builder.Configuration["PhotoStorage:RootPath"];
    if (string.IsNullOrWhiteSpace(uploadsPath))
        uploadsPath = Path.Combine(builder.Environment.ContentRootPath, "uploads");
    builder.Services.Configure<PhotoStorageOptions>(options => options.RootPath = uploadsPath);

    var app = builder.Build();

    // One-shot prod bootstrap: `dotnet api.dll --seed` short-circuits the web
    // host. Runs migrations + ProdSeeder, then exits. Idempotent — re-running
    // on an already-seeded database is a no-op. See ProdSeeder.cs for the
    // required env vars (Seed__Admin*).
    if (args.Contains("--seed"))
    {
        using var seedScope = app.Services.CreateScope();
        var seedDb = seedScope.ServiceProvider.GetRequiredService<AppDbContext>();
        var seedConfig = seedScope.ServiceProvider.GetRequiredService<IConfiguration>();
        await seedDb.Database.MigrateAsync();
        await ProdSeeder.SeedAsync(seedDb, seedConfig);
        Log.Information("Production seed complete");
        return 0;
    }

    using (var scope = app.Services.CreateScope())
    {
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await db.Database.MigrateAsync();

        if (app.Environment.IsDevelopment())
            await Seeder.SeedAsync(db);
    }

    // Must come first so it wraps the rest of the pipeline. Maps known
    // exceptions to 400s; everything else returns the default 500.
    app.UseExceptionHandler();

    app.UseSerilogRequestLogging();

    // Serve uploaded photos at /uploads/* straight from disk (no controller).
    // PhysicalFileProvider throws if the directory is missing, so ensure it exists.
    Directory.CreateDirectory(uploadsPath);
    app.UseStaticFiles(new StaticFileOptions
    {
        FileProvider = new PhysicalFileProvider(uploadsPath),
        RequestPath = "/uploads",
    });

    // Swagger UI and the Hangfire dashboard expose the full API surface and
    // background-job internals. In production they sit behind HTTP Basic auth
    // (Dashboard:Username / Dashboard:Password). In development they stay open
    // for local use, as before.
    if (!app.Environment.IsDevelopment())
        app.UseWhen(
            ctx => ctx.Request.Path.StartsWithSegments("/swagger"),
            branch => branch.UseMiddleware<api.DashboardBasicAuthMiddleware>());

    app.UseSwagger();
    app.UseSwaggerUI();

    var hangfireAuth = app.Environment.IsDevelopment()
        ? new Hangfire.Dashboard.IDashboardAuthorizationFilter[]
            { new Hangfire.Dashboard.LocalRequestsOnlyAuthorizationFilter() }
        : new Hangfire.Dashboard.IDashboardAuthorizationFilter[]
            { new api.HangfireDashboardBasicAuthFilter() };
    app.UseHangfireDashboard("/hangfire", new DashboardOptions { Authorization = hangfireAuth });

    var jobs = app.Services.GetRequiredService<IRecurringJobManager>();
    jobs.AddOrUpdate<TodoResetJob>(
        "todo-daily-reset",
        job => job.ExecuteAsync(CancellationToken.None),
        Cron.Daily);
    jobs.AddOrUpdate<TodoLedgerPruneJob>(
        "todo-ledger-prune",
        job => job.ExecuteAsync(CancellationToken.None),
        Cron.Yearly);

    app.MapGet("/", () => Results.Redirect("/swagger")).ExcludeFromDescription().AllowAnonymous();


    app.UseCors();
    app.UseHttpsRedirection();
    app.UseAuthentication();
    app.UseAuthorization();
    app.MapControllers();

    app.Run();
    return 0;
}
catch (Exception ex)
{
    Log.Fatal(ex, "Application terminated unexpectedly");
    return 1;
}
finally
{
    Log.CloseAndFlush();
}
