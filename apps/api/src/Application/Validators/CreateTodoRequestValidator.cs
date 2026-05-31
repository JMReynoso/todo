using api.Application.DTOs.Requests;
using FluentValidation;

namespace api.Application.Validators;

public class CreateTodoRequestValidator : AbstractValidator<CreateTodoRequest>
{
    public CreateTodoRequestValidator()
    {
        RuleFor(todo => todo.Title).NotEmpty().MaximumLength(200);
        RuleFor(todo => todo.Cadence).IsInEnum();
        RuleFor(todo => todo.Priority).IsInEnum();

        // StartsOn is the user-chosen anchor and is required (no free-text "due").
        RuleFor(todo => todo.StartsOn).NotEqual(default(DateOnly));

        // DueOn is client-derived from StartsOn; when present it can't precede it.
        RuleFor(todo => todo.DueOn!.Value)
            .GreaterThanOrEqualTo(todo => todo.StartsOn)
            .When(todo => todo.DueOn.HasValue);

        RuleFor(todo => todo.AssigneeId!.Value)
            .GreaterThan(0)
            .When(todo => todo.AssigneeId.HasValue);
    }
}
