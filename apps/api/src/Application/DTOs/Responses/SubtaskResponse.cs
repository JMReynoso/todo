namespace api.Application.DTOs.Responses;

public record SubtaskResponse(int Id, string Title, bool Done, int TodoId);
