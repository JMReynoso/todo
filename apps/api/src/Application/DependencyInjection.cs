using System.Reflection;
using api.Application.Persons;
using api.Application.Todos;
using FluentValidation;
using Microsoft.Extensions.DependencyInjection;

namespace api.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddValidatorsFromAssembly(Assembly.GetExecutingAssembly());

        services.AddScoped<TodoService>();
        services.AddScoped<PersonService>();

        return services;
    }
}
