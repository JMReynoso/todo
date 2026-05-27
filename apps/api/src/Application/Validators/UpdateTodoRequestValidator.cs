using api.Application.DTOs.Requests;
using FluentValidation;

namespace api.Application.Validators;

public class UpdateTodoRequestValidator : AbstractValidator<UpdateTodoRequest>
{
    public UpdateTodoRequestValidator()
    {
        RuleFor(todo => todo.Title).NotEmpty().MaximumLength(200);
        RuleFor(todo => todo.Priority).IsInEnum();

        // Assignee is optional; only validate the enum value when one is set.
        RuleFor(todo => todo.Assignee!.Value)
            .IsInEnum()
            .When(todo => todo.Assignee.HasValue);
    }
}
