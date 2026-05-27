using api.Application.DTOs.Requests;
using FluentValidation;

namespace api.Application.Validators;

public class UpdatePersonRequestValidator : AbstractValidator<UpdatePersonRequest>
{
    public UpdatePersonRequestValidator()
    {
        RuleFor(person => person.Name).NotEmpty();
        RuleFor(person => person.Initials).NotEmpty().MaximumLength(3);
        RuleFor(person => person.Color).NotEmpty();
        RuleFor(person => person.Email).NotEmpty().EmailAddress();
    }
}
