using api.Domain.Entities;

namespace Api.UnitTests.Domain;

[TestFixture]
public class SubtaskTests
{
    [Test]
    public void Create_Blank_Throws() =>
        Assert.Throws<ArgumentException>(() => Subtask.Create("  "));

    [Test]
    public void Create_SetsTitleAndDefaultsToNotDone()
    {
        var sub = Subtask.Create("Buy milk");
        Assert.Multiple(() =>
        {
            Assert.That(sub.Title, Is.EqualTo("Buy milk"));
            Assert.That(sub.Done, Is.False);
        });
    }

    [Test]
    public void Complete_ThenReopen_TogglesDone()
    {
        var sub = Subtask.Create("s");
        sub.Complete();
        Assert.That(sub.Done, Is.True);
        sub.Reopen();
        Assert.That(sub.Done, Is.False);
    }

    [Test]
    public void UpdateTitle_Blank_Throws() =>
        Assert.Throws<ArgumentException>(() => Subtask.Create("s").UpdateTitle(""));

    [Test]
    public void UpdateTitle_Valid_Updates()
    {
        var sub = Subtask.Create("old");
        sub.UpdateTitle("new");
        Assert.That(sub.Title, Is.EqualTo("new"));
    }
}
