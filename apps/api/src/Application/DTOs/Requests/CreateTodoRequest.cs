using api.Domain.Enums;

namespace api.Application.DTOs.Requests;

// OwnerId is supplied by the client for now. Once login exists it will be
// derived from the authenticated user instead of trusted from the request.
public record CreateTodoRequest(string Title, Cadence Cadence, int OwnerId);
