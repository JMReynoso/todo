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
    /// Required FK to the <see cref="Person"/> who owns this task. Every task
    /// has an owner, so it can always be reached even when no assignee is set —
    /// an unassigned task can never become orphaned.
    /// </summary>
    public int OwnerId { get; private set; }

    /// <summary>
    /// Optional FK to the assigned <see cref="Person"/>. Held by id only —
    /// Person is a separate aggregate root, so we reference it across the
    /// boundary by identity rather than holding the entity. Distinct from
    /// <see cref="OwnerId"/>: the owner created it, the assignee does it.
    /// </summary>
    public int? AssigneeId { get; private set; }

    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;

    /// <summary>
    /// The calendar date on which this task was last completed. Used by the
    /// reset job to determine whether the task's cadence period has rolled over.
    /// Null if the task has never been completed.
    /// </summary>
    public DateOnly? LastCompletedOn { get; private set; }

    private readonly List<string> _tags = [];
    public IReadOnlyList<string> Tags => _tags.AsReadOnly();

    private readonly List<Subtask> _subtasks = [];
    public IReadOnlyList<Subtask> Subtasks => _subtasks.AsReadOnly();

    private Todo() { }

    public static Todo Create(string title, Cadence cadence, int ownerId)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(title);
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(ownerId);
        return new Todo { Title = title, Cadence = cadence, OwnerId = ownerId };
    }

    public void Complete(DateOnly? completedOn = null)
    {
        Done = true;
        LastCompletedOn = completedOn ?? DateOnly.FromDateTime(DateTime.UtcNow);
    }

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

    public void TransferOwnership(int ownerId)
    {
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(ownerId);
        OwnerId = ownerId;
    }

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

    public void SetTags(IEnumerable<string> tags)
    {
        _tags.Clear();
        foreach (var tag in tags)
            AddTag(tag);
    }

    public void AddSubtask(Subtask subtask)
    {
        ArgumentNullException.ThrowIfNull(subtask);
        _subtasks.Add(subtask);
    }

    public bool RemoveSubtask(Subtask subtask) => _subtasks.Remove(subtask);
}
