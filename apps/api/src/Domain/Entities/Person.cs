namespace api.Domain.Entities;

public class Person : Entity
{
    public string Name { get; private set; } = string.Empty;
    public string Initials { get; private set; } = string.Empty;
    public string Color { get; private set; } = string.Empty;
    public string Email { get; private set; } = string.Empty;
    public string? PhotoUrl { get; private set; }

    /// <summary>
    /// Owned scoring settings. Stored by EF as additional columns on the
    /// Persons table (see <c>AppDbContext.OnModelCreating</c>).
    /// </summary>
    public ScoringSettings Scoring { get; private set; } = ScoringSettings.Default();

    private Person() { }

    public static Person Create(string name, string initials, string color, string email, string? photoUrl = null)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name);
        ArgumentException.ThrowIfNullOrWhiteSpace(initials);
        ArgumentException.ThrowIfNullOrWhiteSpace(color);
        ArgumentException.ThrowIfNullOrWhiteSpace(email);

        return new Person
        {
            Name = name,
            Initials = initials,
            Color = color,
            Email = email,
            PhotoUrl = photoUrl,
            Scoring = ScoringSettings.Default(),
        };
    }

    /// <summary>Replace the entire scoring config (e.g. from a settings save).</summary>
    public void ReplaceScoring(ScoringSettings scoring)
    {
        ArgumentNullException.ThrowIfNull(scoring);
        Scoring = scoring;
    }

    public void SetName(string name)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name);
        Name = name;
    }

    public void SetInitials(string initials)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(initials);
        Initials = initials;
    }

    public void SetColor(string color)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(color);
        Color = color;
    }

    public void SetEmail(string email)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(email);
        Email = email;
    }

    public void SetPhotoUrl(string? photoUrl) => PhotoUrl = photoUrl;

    public string? GetPhotoUrl() => PhotoUrl;

    public string GetName() => Name;

    public string GetInitials() => Initials;

    public string GetColor() => Color;

    public string GetEmail() => Email;

    public Person GetPerson() => this;
}
