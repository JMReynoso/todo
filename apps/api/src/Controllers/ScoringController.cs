using api.Application.DTOs.Responses;
using api.Application.Scoring;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace api.Controllers;

[Authorize]
[ApiController]
[Route("api/scoring")]
public class ScoringController(ScoringService scoring) : ControllerBase
{
    [HttpGet("{personId:int}")]
    public async Task<ActionResult<PersonScoreResponse>> GetScore(int personId, CancellationToken ct)
        => Ok(await scoring.CalculateScoreAsync(personId, ct));
}
