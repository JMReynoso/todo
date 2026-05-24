namespace api.Domain.Entities;

public class Todo : Entity
{
    public string Title { get; private set; } = string.Empty;
    public bool IsCompleted { get; private set; }
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;

    private Todo() { }

    public static Todo Create(string title)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(title);
        return new Todo { Title = title };
    }

    public void Complete() => IsCompleted = true;

    public void Rename(string title)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(title);
        Title = title;
    }
}
