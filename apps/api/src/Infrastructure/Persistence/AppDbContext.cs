using api.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace api.Infrastructure.Persistence;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Todo> Todos => Set<Todo>();
    public DbSet<Person> Persons => Set<Person>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Per-entity config lives in IEntityTypeConfiguration<T> classes under
        // Configurations/ — this scans the assembly and applies each one.
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
    }
}
