using api.Domain.Entities;

namespace Api.UnitTests.Domain;

[TestFixture]
public class ScoringSettingsTests
{
    [Test]
    public void Default_HasExpectedShape()
    {
        var s = ScoringSettings.Default();
        Assert.Multiple(() =>
        {
            Assert.That(s.IncludeDaily, Is.True);
            Assert.That(s.IncludeWeekly, Is.True);
            Assert.That(s.IncludeMonthly, Is.False);
            Assert.That(s.IncludeQuarterly, Is.False);
            Assert.That(s.IncludeOnce, Is.False);
            Assert.That(s.StreakThreshold, Is.EqualTo(3));
        });
    }

    [Test]
    public void Create_StoresProvidedValues()
    {
        var s = ScoringSettings.Create(
            includeDaily: false, includeWeekly: false, includeMonthly: true,
            includeQuarterly: true, includeOnce: true, streakThreshold: 7);
        Assert.Multiple(() =>
        {
            Assert.That(s.IncludeDaily, Is.False);
            Assert.That(s.IncludeWeekly, Is.False);
            Assert.That(s.IncludeMonthly, Is.True);
            Assert.That(s.IncludeQuarterly, Is.True);
            Assert.That(s.IncludeOnce, Is.True);
            Assert.That(s.StreakThreshold, Is.EqualTo(7));
        });
    }

    [Test]
    public void Update_Methods_MutateEachField()
    {
        var s = ScoringSettings.Default();
        s.UpdateIncludeDaily(false);
        s.UpdateIncludeWeekly(false);
        s.UpdateIncludeMonthly(true);
        s.UpdateIncludeQuarterly(true);
        s.UpdateIncludeOnce(true);
        s.UpdateStreakThreshold(10);
        Assert.Multiple(() =>
        {
            Assert.That(s.IncludeDaily, Is.False);
            Assert.That(s.IncludeWeekly, Is.False);
            Assert.That(s.IncludeMonthly, Is.True);
            Assert.That(s.IncludeQuarterly, Is.True);
            Assert.That(s.IncludeOnce, Is.True);
            Assert.That(s.StreakThreshold, Is.EqualTo(10));
        });
    }
}
