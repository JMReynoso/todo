using api.Application.DTOs.Requests;
using FluentValidation;

namespace api.Application.Validators;

public class CreateSubtaskRequestValidator : AbstractValidator<CreateSubtaskRequest>
{
    public CreateSubtaskRequestValidator()
    {
        RuleFor(subtask => subtask.Title).NotEmpty();
    }
}
