namespace api.Application.DTOs.Responses;

/// <summary>Computed score for a person. Not a domain type.</summary>
public record PersonScoreResponse(int PersonId, string Name, int Score);
