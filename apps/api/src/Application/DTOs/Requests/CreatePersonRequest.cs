namespace api.Application.DTOs.Requests;

public record CreatePersonRequest(
    string Name,
    string Initials,
    string Color,
    string Email,
    string Password,
    string? PhotoUrl);
