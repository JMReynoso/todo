namespace api.Domain.Entities;

public class Person : Entity
{
    public string Name { get; private set; } = string.Empty;
    public string Initials Name { get; private set; } = string.Empty;
    public string Color { get; private set; } = string.Empty;
    public string? PhotoURL { get; private set; }
    public string email { get; private set; } = string.Empty;

    public static Person Create(string name, string initials, string color, string email, string? photoURL = null)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name);
        ArgumentException.ThrowIfNullOrWhiteSpace(initials);
        ArgumentException.ThrowIfNullOrWhiteSpace(color);
        ArgumentException.ThrowIfNullOrWhiteSpace(email);

        Name = name;
        Initials = initials;
        Color = color;
        this.email = email;
        PhotoURL = photoURL;
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
        this.email = email;
    }
    public string? GetPhotoUrl()
    {
        return PhotoURL;
    }
    public string GetName()
    {
        return Name;
    }
    public string? GetInitials()
    {
        return Initials;
    }
    public string? GetColor()
    {
        return Color;
    }
    public string? GetEmail()
    {
        return email;
    }
    public Person GetPerson()
    {
        return this;
    }
}