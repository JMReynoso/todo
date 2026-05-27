using api.Domain.Entities;
using api.Domain.Interfaces;
using api.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace api.Infrastructure.Repositories;

public class PersonRepository(AppDbContext db) : IPersonRepository
{
    public Task<Person?> GetByIdAsync(int id, CancellationToken ct = default) =>
        db.Persons.FirstOrDefaultAsync(p => p.Id == id, ct);

    public async Task<IReadOnlyList<Person>> GetAllAsync(CancellationToken ct = default) =>
        await db.Persons.ToListAsync(ct);

    public async Task AddAsync(Person person, CancellationToken ct = default) =>
        await db.Persons.AddAsync(person, ct);

    public async Task<bool> RemoveAsync(int id, CancellationToken ct = default)
    {
        var person = await db.Persons.FindAsync([id], ct);
        if (person is null) return false;
        db.Persons.Remove(person);
        return true;
    }

    public Task SaveChangesAsync(CancellationToken ct = default) =>
        db.SaveChangesAsync(ct);
}
