using api.Application.Auth;
using api.Application.DTOs.Requests;
using api.Controllers;
using api.Domain.Entities;
using api.Domain.Interfaces;
using Api.UnitTests.TestSupport;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace Api.UnitTests.Controllers;

[TestFixture]
public class AuthControllerTests
{
    private Mock<IPersonRepository> _persons = null!;
    private AuthController _controller = null!;

    private const string TestSecret = "test-secret-key-for-unit-tests-min-32-chars!!";

    [SetUp]
    public void SetUp()
    {
        _persons = new Mock<IPersonRepository>();
        var service = new AuthService(_persons.Object, Options.Create(new JwtOptions { Secret = TestSecret }));
        _controller = new AuthController(service);
    }

    private static Person PersonWithHash(string email, string password)
    {
        var person = Person.Create("Alice Chen", "AC", "#fff", email).WithId(1);
        person.SetPasswordHash(BCrypt.Net.BCrypt.HashPassword(password));
        return person;
    }

    [Test]
    public async Task Login_PersonNotFound_ReturnsUnauthorized()
    {
        _persons.Setup(p => p.GetByEmailAsync("unknown@test.com", It.IsAny<CancellationToken>()))
            .ReturnsAsync((Person?)null);

        var result = await _controller.Login(new LoginRequest("unknown@test.com", "pass"), default);

        Assert.That(result.Result, Is.InstanceOf<UnauthorizedResult>());
    }

    [Test]
    public async Task Login_WrongPassword_ReturnsUnauthorized()
    {
        var person = PersonWithHash("alice@test.com", "correctpass");
        _persons.Setup(p => p.GetByEmailAsync("alice@test.com", It.IsAny<CancellationToken>()))
            .ReturnsAsync(person);

        var result = await _controller.Login(new LoginRequest("alice@test.com", "wrongpass"), default);

        Assert.That(result.Result, Is.InstanceOf<UnauthorizedResult>());
    }

    [Test]
    public async Task Login_ValidCredentials_ReturnsOkWithToken()
    {
        var person = PersonWithHash("alice@test.com", "secret123");
        _persons.Setup(p => p.GetByEmailAsync("alice@test.com", It.IsAny<CancellationToken>()))
            .ReturnsAsync(person);

        var result = await _controller.Login(new LoginRequest("alice@test.com", "secret123"), default);

        Assert.That(result.Result, Is.InstanceOf<OkObjectResult>());
    }
}
