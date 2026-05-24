using api.Domain.Entities;

namespace api.Domain.Interfaces;

public interface ITodoRepository
{
    Task<Todo?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<IReadOnlyList<Todo>> GetAllAsync(CancellationToken ct = default);
    Task AddAsync(Todo todo, CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);
}
