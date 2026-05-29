using api.Application.DTOs.Requests;
using api.Application.DTOs.Responses;
using api.Application.Mappings;
using api.Domain.Entities;
using api.Domain.Interfaces;
using FluentValidation;

namespace api.Application.Persons;

/// <summary>
/// Application service for Person operations: validates incoming requests, drives
/// the domain via <see cref="IPersonRepository"/>, owns the unit-of-work boundary
/// (the repo only stages changes), and maps entities to response DTOs.
/// </summary>
public class PersonService(
    IPersonRepository persons,
    IPhotoStorage photoStorage,
    IValidator<CreatePersonRequest> createValidator,
    IValidator<UpdatePersonRequest> updateValidator,
    IValidator<UpdateScoringSettingsRequest> scoringValidator)
{
    public async Task<PersonResponse?> GetByIdAsync(int id, CancellationToken ct = default)
    {
        var person = await persons.GetByIdAsync(id, ct);
        return person?.ToResponse();
    }

    public async Task<IReadOnlyList<PersonResponse>> GetAllAsync(CancellationToken ct = default)
    {
        var all = await persons.GetAllAsync(ct);
        return all.Select(person => person.ToResponse()).ToList();
    }

    public async Task<PersonResponse> CreateAsync(CreatePersonRequest request, CancellationToken ct = default)
    {
        await createValidator.ValidateAndThrowAsync(request, ct);

        var person = Person.Create(request.Name, request.Initials, request.Color, request.Email, request.PhotoUrl);
        await persons.AddAsync(person, ct);
        await persons.SaveChangesAsync(ct);
        return person.ToResponse();
    }

    public async Task<PersonResponse?> UpdateAsync(int id, UpdatePersonRequest request, CancellationToken ct = default)
    {
        await updateValidator.ValidateAndThrowAsync(request, ct);

        var person = await persons.GetByIdAsync(id, ct);
        if (person is null) return null;

        person.SetName(request.Name);
        person.SetInitials(request.Initials);
        person.SetColor(request.Color);
        person.SetEmail(request.Email);
        person.SetPhotoUrl(request.PhotoUrl);

        await persons.SaveChangesAsync(ct);
        return person.ToResponse();
    }

    public async Task<PersonResponse?> UpdateScoringAsync(int id, UpdateScoringSettingsRequest request, CancellationToken ct = default)
    {
        await scoringValidator.ValidateAndThrowAsync(request, ct);

        var person = await persons.GetByIdAsync(id, ct);
        if (person is null) return null;

        person.ReplaceScoring(ScoringSettings.Create(
            request.IncludeDaily,
            request.IncludeWeekly,
            request.IncludeMonthly,
            request.IncludeQuarterly,
            request.IncludeOnce,
            request.StreakThreshold));

        await persons.SaveChangesAsync(ct);
        return person.ToResponse();
    }

    /// <summary>
    /// Stores the uploaded photo and saves its URL on the person. Returns null if
    /// the person doesn't exist. File-type/size validation happens at the edge
    /// (the controller); this method trusts the validated stream + extension.
    /// </summary>
    public async Task<PersonResponse?> SetPhotoAsync(int id, Stream content, CancellationToken ct = default)
    {
        var person = await persons.GetByIdAsync(id, ct);
        if (person is null) return null;

        //get previous URL before we overwrite it, so we can delete the old file after saving the new one. 
        // If there's no previous URL or the same URL is being reused, skip deletion.
        var previousUrl = person.PhotoUrl;

        var url = await photoStorage.SaveAsync(id, content, ct);
        person.SetPhotoUrl(url);
        await persons.SaveChangesAsync(ct);

        // Delete the old file only after the new URL is committed — that way a
        // failure here leaves an orphan file, never a person pointing at nothing.
        if (!string.IsNullOrEmpty(previousUrl) && previousUrl != url)
            await photoStorage.DeleteAsync(previousUrl, ct);

        return person.ToResponse();
    }

    public async Task<bool> RemoveAsync(int id, CancellationToken ct = default)
    {
        var removed = await persons.RemoveAsync(id, ct);
        if (removed) await persons.SaveChangesAsync(ct);
        return removed;
    }
}
