using api.Domain.Entities;

namespace api.Domain.Interfaces;

public interface ITodoRepository
{
    Task<Todo?> GetByIdAsync(int id, CancellationToken ct = default);
    Task<IReadOnlyList<Todo>> GetAllAsync(CancellationToken ct = default);
    Task<IReadOnlyList<Todo>> GetAllForUserAsync(int userId, CancellationToken ct = default);
    Task<IReadOnlyList<Todo>> GetDoneRecurringAsync(CancellationToken ct = default);
    Task<IReadOnlyList<Todo>> GetIncompleteOnceAsync(CancellationToken ct = default);
    Task AddAsync(Todo todo, CancellationToken ct = default);
    Task<bool> RemoveAsync(int id, CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);
}
