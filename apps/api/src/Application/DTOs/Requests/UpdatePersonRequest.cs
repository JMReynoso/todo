namespace api.Application.DTOs.Requests;

public record UpdatePersonRequest(
    string Name,
    string Initials,
    string Color,
    string Email,
    string? PhotoUrl);
