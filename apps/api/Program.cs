using System.Text;
using api.Application;
using api.Application.Auth;
using api.Application.Todos;
using api.Infrastructure;
using api.Infrastructure.Persistence;
using api.Infrastructure.Storage;
using Hangfire;
using Microsoft.AspNetCore.Authentication.JwtBearer;
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

    var jwtSecret = builder.Configuration["Jwt:Secret"]!;
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
                RequireExpirationTime = false,
                ValidateLifetime = false,
            };
        });

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

    app.UseSwagger();
    app.UseSwaggerUI();
    app.UseHangfireDashboard();

    var jobs = app.Services.GetRequiredService<IRecurringJobManager>();
    jobs.AddOrUpdate<TodoResetJob>(
        "todo-daily-reset",
        job => job.ExecuteAsync(CancellationToken.None),
        Cron.Daily);

    app.MapGet("/", () => Results.Redirect("/swagger")).ExcludeFromDescription();


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
