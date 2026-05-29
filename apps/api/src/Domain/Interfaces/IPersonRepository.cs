using api.Domain.Entities;

namespace api.Domain.Interfaces;

public interface IPersonRepository
{
    Task<Person?> GetByIdAsync(int id, CancellationToken ct = default);
    Task<Person?> GetByEmailAsync(string email, CancellationToken ct = default);
    Task<IReadOnlyList<Person>> GetAllAsync(CancellationToken ct = default);
    Task AddAsync(Person person, CancellationToken ct = default);
    Task<bool> RemoveAsync(int id, CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);
}
