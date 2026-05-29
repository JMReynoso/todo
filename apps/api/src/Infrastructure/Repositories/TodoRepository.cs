using api.Domain.Entities;
using api.Domain.Interfaces;
using api.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace api.Infrastructure.Repositories;

public class TodoRepository(AppDbContext db) : ITodoRepository
{
    public Task<Todo?> GetByIdAsync(int id, CancellationToken ct = default) =>
        db.Todos.FirstOrDefaultAsync(t => t.Id == id, ct);

    public async Task<IReadOnlyList<Todo>> GetAllAsync(CancellationToken ct = default) =>
        await db.Todos.ToListAsync(ct);

    public async Task AddAsync(Todo todo, CancellationToken ct = default) =>
        await db.Todos.AddAsync(todo, ct);

    public async Task<bool> RemoveAsync(int id, CancellationToken ct = default)
    {
        var todo = await db.Todos.FindAsync([id], ct);
        if (todo is null) return false;
        db.Todos.Remove(todo);
        return true;
    }

    public Task SaveChangesAsync(CancellationToken ct = default) =>
        db.SaveChangesAsync(ct);
}
