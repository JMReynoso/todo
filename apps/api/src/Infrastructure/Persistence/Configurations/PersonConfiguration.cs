using api.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace api.Infrastructure.Persistence.Configurations;

public class PersonConfiguration : IEntityTypeConfiguration<Person>
{
    public void Configure(EntityTypeBuilder<Person> person)
    {
        // ScoringSettings is an owned type: stored as additional columns on
        // the Persons table (Scoring_IncludeDaily, Scoring_StreakThreshold, ...).
        person.OwnsOne(p => p.Scoring);
    }
}
