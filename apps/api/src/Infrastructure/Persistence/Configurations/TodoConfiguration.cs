using api.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace api.Infrastructure.Persistence.Configurations;

public class TodoConfiguration : IEntityTypeConfiguration<Todo>
{
    public void Configure(EntityTypeBuilder<Todo> builder)
    {
        // Subtasks: one-to-many parent-child; cascade delete enforces the
        // aggregate-root rule that subtasks can't outlive their parent Todo.
        builder.HasMany<Subtask>(nameof(Todo.Subtasks))
            .WithOne()
            .HasForeignKey(subtask => subtask.TodoId)
            .OnDelete(DeleteBehavior.Cascade);

        // Subtasks is exposed as IReadOnlyList<Subtask> with a private
        // _subtasks backing field. Tell EF to read/write the field directly
        // instead of going through the read-only getter.
        builder.Navigation(nameof(Todo.Subtasks))
            .UsePropertyAccessMode(PropertyAccessMode.Field);

        // Tags: a primitive string collection stored in a single JSON/text
        // column (EF Core 8+). Same backing-field trick applies.
        builder.PrimitiveCollection(nameof(Todo.Tags))
            .UsePropertyAccessMode(PropertyAccessMode.Field);
    }
}
