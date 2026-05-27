using api.Application.DTOs.Responses;
using api.Domain.Exceptions;
using api.Domain.Interfaces;
using api.Domain.Services;

namespace api.Application.Scoring;

/// <summary>
/// Cross-aggregate read use-case: combines a person's scoring settings with
/// their todos to produce a score. Orchestration only — the actual rule lives
/// in <see cref="ScoringCalculator"/>. Lives in its own service rather than
/// PersonService because it spans both the Person and Todo aggregates.
/// </summary>
public class ScoringService(IPersonRepository persons, ITodoRepository todos)
{
    public async Task<PersonScoreResponse> CalculateScoreAsync(int personId, CancellationToken ct = default)
    {
        var person = await persons.GetByIdAsync(personId, ct)
            ?? throw new DomainException($"Person {personId} not found.");

        // Materialize into memory, filter to this person's assigned todos, then
        // let the Domain rule do the C# math. (A repo-level GetByAssignee query
        // would avoid loading every todo if this becomes hot.)
        var assigned = (await todos.GetAllAsync(ct))
            .Where(todo => todo.AssigneeId == personId)
            .ToList();

        var score = ScoringCalculator.Compute(person.Scoring, assigned);

        return new PersonScoreResponse(person.Id, person.Name, score);
    }
}
