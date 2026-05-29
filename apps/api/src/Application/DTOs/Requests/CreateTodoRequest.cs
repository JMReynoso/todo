using api.Domain.Enums;

namespace api.Application.DTOs.Requests;

public record CreateTodoRequest(string Title, Cadence Cadence);
