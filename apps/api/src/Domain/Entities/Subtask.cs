namespace api.Domain.Entities;

public class Subtask : Entity
{
    public string Title { get; private set; } = string.Empty;
    public bool Done { get; private set; }
    public int TodoId { get; private set; }

    private Subtask() { }

    public static Subtask Create(string title)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(title);
        return new Subtask { Title = title };
    }

    public void Complete() => Done = true;
    public void Reopen() => Done = false;

    public void UpdateTitle(string title)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(title);
        Title = title;
    }

    public void SetTodoId(int todoId) => TodoId = todoId;

    public Subtask GetSubtask()
    {
        return this;
    }
}
