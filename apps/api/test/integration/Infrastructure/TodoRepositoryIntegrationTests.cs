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
    public async Task GetIncompleteOnce_returns_only_open_once_tasks()
    {
        var ownerId = await SeedPersonAsync("Owner", "owner@x.com");

        await using (var db = IntegrationFixture.NewDbContext())
        {
            var repo = new TodoRepository(db);

            var openOnce = Todo.Create("open one-off", Cadence.Once, ownerId);

            var doneOnce = Todo.Create("done one-off", Cadence.Once, ownerId);
            doneOnce.Complete();

            var openDaily = Todo.Create("open daily", Cadence.Daily, ownerId);

            await repo.AddAsync(openOnce);
            await repo.AddAsync(doneOnce);
            await repo.AddAsync(openDaily);
            await repo.SaveChangesAsync();
        }

        await using (var db = IntegrationFixture.NewDbContext())
        {
            var open = await new TodoRepository(db).GetIncompleteOnceAsync();
            Assert.Multiple(() =>
            {
                Assert.That(open, Has.Count.EqualTo(1));
                Assert.That(open[0].Title, Is.EqualTo("open one-off"));
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

    [Test]
    public async Task Remove_nonexistent_returns_false()
    {
        await using var db = IntegrationFixture.NewDbContext();
        var repo = new TodoRepository(db);

        Assert.That(await repo.RemoveAsync(999_999), Is.False);
    }

    [Test]
    public async Task GetById_orders_subtasks_by_id()
    {
        var ownerId = await SeedPersonAsync("Owner", "owner@x.com");

        int todoId;
        await using (var db = IntegrationFixture.NewDbContext())
        {
            var repo = new TodoRepository(db);
            var todo = Todo.Create("groceries", Cadence.Weekly, ownerId);
            todo.AddSubtask(Subtask.Create("first"));
            todo.AddSubtask(Subtask.Create("second"));
            todo.AddSubtask(Subtask.Create("third"));
            await repo.AddAsync(todo);
            await repo.SaveChangesAsync();
            todoId = todo.Id;
        }

        await using (var db = IntegrationFixture.NewDbContext())
        {
            var loaded = await new TodoRepository(db).GetByIdAsync(todoId);
            Assert.That(loaded, Is.Not.Null);
            Assert.That(
                loaded!.Subtasks.Select(s => s.Title),
                Is.EqualTo(new[] { "first", "second", "third" }).AsCollection);
        }
    }

    [Test]
    public async Task GetAllForUser_returns_owned_and_assigned_but_not_unrelated()
    {
        var ownerId = await SeedPersonAsync("Owner", "owner@x.com");
        var otherId = await SeedPersonAsync("Other", "other@x.com");

        await using (var db = IntegrationFixture.NewDbContext())
        {
            var repo = new TodoRepository(db);

            var owned = Todo.Create("owned", Cadence.Daily, ownerId);

            var assigned = Todo.Create("assigned", Cadence.Daily, otherId);
            assigned.AssignTo(ownerId);

            var unrelated = Todo.Create("unrelated", Cadence.Daily, otherId);

            await repo.AddAsync(owned);
            await repo.AddAsync(assigned);
            await repo.AddAsync(unrelated);
            await repo.SaveChangesAsync();
        }

        await using (var db = IntegrationFixture.NewDbContext())
        {
            var mine = await new TodoRepository(db).GetAllForUserAsync(ownerId);
            Assert.That(
                mine.Select(t => t.Title),
                Is.EquivalentTo(new[] { "owned", "assigned" }));
        }
    }

    [Test]
    public async Task GetDoneRecurring_returns_only_completed_recurring_tasks()
    {
        var ownerId = await SeedPersonAsync("Owner", "owner@x.com");

        await using (var db = IntegrationFixture.NewDbContext())
        {
            var repo = new TodoRepository(db);

            var doneWeekly = Todo.Create("done weekly", Cadence.Weekly, ownerId);
            doneWeekly.Complete();

            var openWeekly = Todo.Create("open weekly", Cadence.Weekly, ownerId);

            var doneOnce = Todo.Create("done once", Cadence.Once, ownerId);
            doneOnce.Complete();

            await repo.AddAsync(doneWeekly);
            await repo.AddAsync(openWeekly);
            await repo.AddAsync(doneOnce);
            await repo.SaveChangesAsync();
        }

        await using (var db = IntegrationFixture.NewDbContext())
        {
            var done = await new TodoRepository(db).GetDoneRecurringAsync();
            Assert.Multiple(() =>
            {
                Assert.That(done, Has.Count.EqualTo(1));
                Assert.That(done[0].Title, Is.EqualTo("done weekly"));
            });
        }
    }

    [Test]
    public async Task GetAll_returns_every_todo_across_users()
    {
        var ownerId = await SeedPersonAsync("Owner", "owner@x.com");
        var otherId = await SeedPersonAsync("Other", "other@x.com");

        await using (var db = IntegrationFixture.NewDbContext())
        {
            var repo = new TodoRepository(db);
            await repo.AddAsync(Todo.Create("a", Cadence.Daily, ownerId));
            await repo.AddAsync(Todo.Create("b", Cadence.Daily, otherId));
            await repo.SaveChangesAsync();
        }

        await using (var db = IntegrationFixture.NewDbContext())
        {
            var all = await new TodoRepository(db).GetAllAsync();
            Assert.That(all.Select(t => t.Title), Is.EquivalentTo(new[] { "a", "b" }));
        }
    }
}
