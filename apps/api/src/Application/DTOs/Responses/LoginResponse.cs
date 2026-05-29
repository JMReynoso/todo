namespace api.Application.DTOs.Responses;

public record LoginResponse(string Token, int PersonId, string Name, string Email);
