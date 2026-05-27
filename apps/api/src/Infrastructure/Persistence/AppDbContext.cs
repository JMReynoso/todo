using api.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace api.Infrastructure.Persistence;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Todo> Todos => Set<Todo>();
    public DbSet<Person> Persons => Set<Person>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // ScoringSettings is an owned type: stored as additional columns on
        // the Persons table (Scoring_IncludeDaily, Scoring_StreakThreshold, ...).
        modelBuilder.Entity<Person>().OwnsOne(person => person.Scoring);

        modelBuilder.Entity<Todo>(todo =>
        {
            // Subtasks: one-to-many parent-child; cascade delete enforces the
            // aggregate-root rule that subtasks can't outlive their parent Todo.
            todo.HasMany<Subtask>(nameof(Todo.Subtasks))
                .WithOne()
                .HasForeignKey(subtask => subtask.TodoId)
                .OnDelete(DeleteBehavior.Cascade);

            // Subtasks is exposed as IReadOnlyList<Subtask> with a private
            // _subtasks backing field. Tell EF to read/write the field directly
            // instead of going through the read-only getter.
            todo.Navigation(nameof(Todo.Subtasks))
                .UsePropertyAccessMode(PropertyAccessMode.Field);

            // Tags: a primitive string collection stored in a single JSON/text
            // column (EF Core 8+). Same backing-field trick applies.
            todo.PrimitiveCollection(nameof(Todo.Tags))
                .UsePropertyAccessMode(PropertyAccessMode.Field);
        });

        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
    }
}
