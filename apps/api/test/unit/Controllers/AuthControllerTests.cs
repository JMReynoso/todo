using api.Application.Auth;
using api.Application.DTOs.Requests;
using api.Controllers;
using api.Domain.Entities;
using api.Domain.Interfaces;
using Api.UnitTests.TestSupport;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using System.Security.Claims;

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

    private void AuthenticateAs(int personId)
    {
        var identity = new ClaimsIdentity(
            [new Claim(ClaimTypes.NameIdentifier, personId.ToString())],
            "Test");
        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(identity) },
        };
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

    [Test]
    public async Task Logout_AuthenticatedUser_ReturnsNoContent()
    {
        var person = Person.Create("Alice Chen", "AC", "#fff", "alice@test.com").WithId(1);
        _persons.Setup(p => p.GetByIdAsync(1, It.IsAny<CancellationToken>()))
            .ReturnsAsync(person);
        AuthenticateAs(1);

        var result = await _controller.Logout(default);

        Assert.That(result, Is.InstanceOf<NoContentResult>());
    }

    [Test]
    public async Task Logout_PersonNoLongerExists_ReturnsUnauthorized()
    {
        _persons.Setup(p => p.GetByIdAsync(99, It.IsAny<CancellationToken>()))
            .ReturnsAsync((Person?)null);
        AuthenticateAs(99);

        var result = await _controller.Logout(default);

        Assert.That(result, Is.InstanceOf<UnauthorizedResult>());
    }
}
