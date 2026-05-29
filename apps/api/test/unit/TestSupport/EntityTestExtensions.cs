using api.Domain.Entities;

namespace Api.UnitTests.TestSupport;

/// <summary>
/// Test-only helper for setting the EF-managed identity on an entity, which is
/// normally assigned by the database on insert. Uses reflection because
/// <see cref="Entity.Id"/> exposes only a protected setter by design.
/// </summary>
internal static class EntityTestExtensions
{
    public static T WithId<T>(this T entity, int id) where T : Entity
    {
        typeof(Entity).GetProperty(nameof(Entity.Id))!.SetValue(entity, id);
        return entity;
    }
}
