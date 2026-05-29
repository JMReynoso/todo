using api.Domain.Entities;
using api.Domain.Enums;
using api.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Api.IntegrationTests.Infrastructure;

[TestFixture]
public class TodoRepositoryIntegrationTests : DatabaseIntegrationTestBase
{
    private static async Task<int> SeedPersonAsync(string name, string email)
    {
        await using var db = IntegrationFixture.NewDbContext();
        var repo = new PersonRepository(db);
        var person = Person.Create(name, "XX", "#000", email);
        await repo.AddAsync(person);
        await repo.SaveChangesAsync();
        return person.Id;
    }

    [Test]
    public async Task Add_persists_tags_and_subtasks()
    {
        var ownerId = await SeedPersonAsync("Owner", "owner@x.com");

        int todoId;
        await using (var db = IntegrationFixture.NewDbContext())
        {
            var repo = new TodoRepository(db);
            var todo = Todo.Create("Weekly groceries", Cadence.Weekly, ownerId);
            todo.AddTag("errand");
            todo.AddTag("home");
            todo.AddSubtask(Subtask.Create("Produce"));
            todo.AddSubtask(Subtask.Create("Dairy"));
            await repo.AddAsync(todo);
            await repo.SaveChangesAsync();
            todoId = todo.Id;
        }

        await using (var db = IntegrationFixture.NewDbContext())
        {
            var loaded = await new TodoRepository(db).GetByIdAsync(todoId);
            Assert.That(loaded, Is.Not.Null);
            Assert.That(loaded!.Tags, Is.EquivalentTo(new[] { "errand", "home" }));

            // Subtasks aren't eager-loaded by the repo, so assert against the table.
            var subtaskCount = await db.Set<Subtask>().CountAsync(s => s.TodoId == todoId);
            Assert.That(subtaskCount, Is.EqualTo(2));
        }
    }

    [Test]
    public async Task Add_with_nonexistent_owner_violates_foreign_key()
    {
        await using var db = IntegrationFixture.NewDbContext();
        var repo = new TodoRepository(db);
        var todo = Todo.Create("orphan", Cadence.Daily, ownerId: 999_999); // no such person

        await repo.AddAsync(todo);

        Assert.ThrowsAsync<DbUpdateException>(() => repo.SaveChangesAsync());
    }

    [Test]
    public async Task Deleting_owner_cascade_deletes_their_owned_todos()
    {
        var ownerId = await SeedPersonAsync("Owner", "owner@x.com");

        int todoId;
        await using (var db = IntegrationFixture.NewDbContext())
        {
            var repo = new TodoRepository(db);
            var todo = Todo.Create("owned task", Cadence.Daily, ownerId);
            await repo.AddAsync(todo);
            await repo.SaveChangesAsync();
            todoId = todo.Id;
        }

        await using (var db = IntegrationFixture.NewDbContext())
        {
            var people = new PersonRepository(db);
            await people.RemoveAsync(ownerId);
            await people.SaveChangesAsync();
        }

        await using (var db = IntegrationFixture.NewDbContext())
        {
            // Cascade: deleting the owner removes the owned todo.
            Assert.That(await new TodoRepository(db).GetByIdAsync(todoId), Is.Null);
        }
    }

    [Test]
    public async Task Deleting_assignee_sets_todo_assignee_to_null_but_keeps_the_todo()
    {
        var ownerId = await SeedPersonAsync("Owner", "owner@x.com");
        var assigneeId = await SeedPersonAsync("Assignee", "assignee@x.com");

        int todoId;
        await using (var db = IntegrationFixture.NewDbContext())
        {
            var repo = new TodoRepository(db);
            var todo = Todo.Create("shared task", Cadence.Daily, ownerId);
            todo.AssignTo(assigneeId);
            await repo.AddAsync(todo);
            await repo.SaveChangesAsync();
            todoId = todo.Id;
        }

        await using (var db = IntegrationFixture.NewDbContext())
        {
            var people = new PersonRepository(db);
            await people.RemoveAsync(assigneeId);
            await people.SaveChangesAsync();
        }

        await using (var db = IntegrationFixture.NewDbContext())
        {
            // SetNull: the todo survives, owned by its owner, but unassigned.
            var loaded = await new TodoRepository(db).GetByIdAsync(todoId);
            Assert.That(loaded, Is.Not.Null);
            Assert.Multiple(() =>
            {
                Assert.That(loaded!.OwnerId, Is.EqualTo(ownerId));
                Assert.That(loaded.AssigneeId, Is.Null);
            });
        }
    }

    [Test]
    public async Task Remove_deletes_the_todo()
    {
        var ownerId = await SeedPersonAsync("Owner", "owner@x.com");

        int todoId;
        await using (var db = IntegrationFixture.NewDbContext())
        {
            var repo = new TodoRepository(db);
            var todo = Todo.Create("temp", Cadence.Once, ownerId);
            await repo.AddAsync(todo);
            await repo.SaveChangesAsync();
            todoId = todo.Id;
        }

        await using (var db = IntegrationFixture.NewDbContext())
        {
            var repo = new TodoRepository(db);
            var removed = await repo.RemoveAsync(todoId);
            await repo.SaveChangesAsync();
            Assert.That(removed, Is.True);
        }

        await using (var db = IntegrationFixture.NewDbContext())
        {
            Assert.That(await new TodoRepository(db).GetByIdAsync(todoId), Is.Null);
        }
    }
}
