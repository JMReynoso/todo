namespace api.Domain.Enums;

/// <summary>
/// Placeholder identifier for assignees while users live as fixed seed data.
/// When real auth lands this should become a foreign key to a User entity.
/// </summary>
public enum PersonId
{
    Me,
    Maya,
    Devon,
    Sam,
    Nina,
}
