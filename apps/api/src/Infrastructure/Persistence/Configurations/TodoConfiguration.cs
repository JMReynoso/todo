using api.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace api.Infrastructure.Persistence.Configurations;

public class TodoConfiguration : IEntityTypeConfiguration<Todo>
{
    public void Configure(EntityTypeBuilder<Todo> todo)
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

        // Owner: required FK to a Person, referenced by id only. Cascade so a
        // person's owned tasks are removed with them — an owned task can never
        // be left pointing at a non-existent owner. Distinct from AssigneeId.
        todo.HasOne<Person>()
            .WithMany()
            .HasForeignKey(t => t.OwnerId)
            .OnDelete(DeleteBehavior.Cascade);

        // Assignee: optional FK to a Person, referenced by id only (Todo and
        // Person are separate aggregate roots). No inverse navigation. SetNull
        // so deleting a person unassigns their todos rather than deleting them.
        todo.HasOne<Person>()
            .WithMany()
            .HasForeignKey(t => t.AssigneeId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
