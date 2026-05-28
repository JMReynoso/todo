using api.Application.DTOs.Requests;
using api.Application.DTOs.Responses;
using api.Application.Persons;
using Microsoft.AspNetCore.Mvc;

namespace api.Controllers;

[ApiController]
[Route("api/persons")]
public class PersonController(PersonService persons) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<PersonResponse>>> GetAll(CancellationToken ct)
        => Ok(await persons.GetAllAsync(ct));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<PersonResponse>> GetById(int id, CancellationToken ct)
    {
        var person = await persons.GetByIdAsync(id, ct);
        return person is null ? NotFound() : Ok(person);
    }

    [HttpPost]
    public async Task<ActionResult<PersonResponse>> Create(CreatePersonRequest request, CancellationToken ct)
    {
        var created = await persons.CreateAsync(request, ct);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<PersonResponse>> Update(int id, UpdatePersonRequest request, CancellationToken ct)
    {
        var updated = await persons.UpdateAsync(id, request, ct);
        return updated is null ? NotFound() : Ok(updated);
    }

    [HttpPut("{id:int}/scoring")]
    public async Task<ActionResult<PersonResponse>> UpdateScoring(int id, UpdateScoringSettingsRequest request, CancellationToken ct)
    {
        var updated = await persons.UpdateScoringAsync(id, request, ct);
        return updated is null ? NotFound() : Ok(updated);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Remove(int id, CancellationToken ct)
        => await persons.RemoveAsync(id, ct) ? NoContent() : NotFound();
}
