using api.Domain.Enums;

namespace api.Domain.Entities;

public class Todo : Entity
{
    public string Title { get; private set; } = string.Empty;
    public Cadence Cadence { get; private set; }
    public bool Done { get; private set; }
    public Priority Priority { get; private set; } = Priority.Med;

    /// <summary>Free-text recurrence hint, e.g. "today", "Fri 2p", "1st", "last Sun".</summary>
    public string Due { get; private set; } = string.Empty;

    /// <summary>Hard deadline (optional, used by <see cref="Enums.Cadence.Once"/> tasks).</summary>
    public DateOnly? DueOn { get; private set; }

    /// <summary>Anchor date used by <see cref="Enums.Cadence.Once"/> cadence.</summary>
    public DateOnly? Date { get; private set; }

    public string Notes { get; private set; } = string.Empty;
    public int Streak { get; private set; }

    /// <summary>
    /// Optional FK to the assigned <see cref="Person"/>. Held by id only —
    /// Person is a separate aggregate root, so we reference it across the
    /// boundary by identity rather than holding the entity.
    /// </summary>
    public int? AssigneeId { get; private set; }

    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;

    private readonly List<string> _tags = [];
    public IReadOnlyList<string> Tags => _tags.AsReadOnly();

    private readonly List<Subtask> _subtasks = [];
    public IReadOnlyList<Subtask> Subtasks => _subtasks.AsReadOnly();

    private Todo() { }

    public static Todo Create(string title, Cadence cadence)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(title);
        return new Todo { Title = title, Cadence = cadence };
    }

    public void Complete() => Done = true;

    public void Reopen() => Done = false;

    public void SetTitle(string title)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(title);
        Title = title;
    }

    public void SetPriority(Priority priority) => Priority = priority;

    public void SetDue(string due) => Due = due ?? string.Empty;

    public void SetDueOn(DateOnly? dueOn) => DueOn = dueOn;

    public void SetDate(DateOnly? date) => Date = date;

    public void SetNotes(string notes) => Notes = notes ?? string.Empty;

    public void AssignTo(int personId) => AssigneeId = personId;

    public void Unassign() => AssigneeId = null;

    public void IncrementStreak() => Streak++;

    public void ResetStreak() => Streak = 0;

    public void AddTag(string tag)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(tag);
        if (!_tags.Contains(tag)) _tags.Add(tag);
    }

    public bool RemoveTag(string tag) => _tags.Remove(tag);

    public void AddSubtask(Subtask subtask)
    {
        ArgumentNullException.ThrowIfNull(subtask);
        _subtasks.Add(subtask);
    }

    public bool RemoveSubtask(Subtask subtask) => _subtasks.Remove(subtask);
}
