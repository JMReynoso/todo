using api.Application.DTOs.Requests;
using FluentValidation;

namespace api.Application.Validators;

public class CreateTodoRequestValidator : AbstractValidator<CreateTodoRequest>
{
    public CreateTodoRequestValidator()
    {
        RuleFor(todo => todo.Title).NotEmpty().MaximumLength(200);
        RuleFor(todo => todo.Cadence).IsInEnum();
        RuleFor(todo => todo.OwnerId).GreaterThan(0);
    }
}
