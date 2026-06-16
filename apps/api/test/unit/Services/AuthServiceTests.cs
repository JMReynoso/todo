using api.Application.Auth;
using api.Application.DTOs.Requests;
using api.Domain.Entities;
using api.Domain.Interfaces;
using Api.UnitTests.TestSupport;
using Microsoft.Extensions.Options;

namespace Api.UnitTests.Services;

[TestFixture]
public class AuthServiceTests
{
    private Mock<IPersonRepository> _persons = null!;
    private AuthService _service = null!;

    private const string TestSecret = "test-secret-key-for-unit-tests-min-32-chars!!";

    [SetUp]
    public void SetUp()
    {
        _persons = new Mock<IPersonRepository>();
        _service = new AuthService(_persons.Object, Options.Create(new JwtOptions { Secret = TestSecret }));
    }

    private static Person PersonWithHash(string email, string password)
    {
        var person = Person.Create("Alice Chen", "AC", "#fff", email).WithId(1);
        person.SetPasswordHash(BCrypt.Net.BCrypt.HashPassword(password));
        return person;
    }

    [Test]
    public async Task LoginAsync_EmailNotFound_ReturnsNull()
    {
        _persons.Setup(p => p.GetByEmailAsync("unknown@test.com", It.IsAny<CancellationToken>()))
            .ReturnsAsync((Person?)null);

        var result = await _service.LoginAsync(new LoginRequest("unknown@test.com", "pass"));

        Assert.That(result, Is.Null);
    }

    [Test]
    public async Task LoginAsync_NoPasswordHash_ReturnsNull()
    {
        var person = Person.Create("Alice Chen", "AC", "#fff", "alice@test.com").WithId(1);
        _persons.Setup(p => p.GetByEmailAsync("alice@test.com", It.IsAny<CancellationToken>()))
            .ReturnsAsync(person);

        var result = await _service.LoginAsync(new LoginRequest("alice@test.com", "pass"));

        Assert.That(result, Is.Null);
    }

    [Test]
    public async Task LoginAsync_WrongPassword_ReturnsNull()
    {
        var person = PersonWithHash("alice@test.com", "correctpass");
        _persons.Setup(p => p.GetByEmailAsync("alice@test.com", It.IsAny<CancellationToken>()))
            .ReturnsAsync(person);

        var result = await _service.LoginAsync(new LoginRequest("alice@test.com", "wrongpass"));

        Assert.That(result, Is.Null);
    }

    [Test]
    public async Task LoginAsync_ValidCredentials_ReturnsLoginResponseWithPersonInfo()
    {
        var person = PersonWithHash("alice@test.com", "secret123");
        _persons.Setup(p => p.GetByEmailAsync("alice@test.com", It.IsAny<CancellationToken>()))
            .ReturnsAsync(person);

        var result = await _service.LoginAsync(new LoginRequest("alice@test.com", "secret123"));

        Assert.That(result, Is.Not.Null);
        Assert.Multiple(() =>
        {
            Assert.That(result!.PersonId, Is.EqualTo(1));
            Assert.That(result.Name, Is.EqualTo("Alice Chen"));
            Assert.That(result.Email, Is.EqualTo("alice@test.com"));
            Assert.That(result.Token, Is.Not.Null.And.Not.Empty);
        });
    }

    [Test]
    public async Task LogoutAsync_PersonExists_ReturnsTrue()
    {
        var person = Person.Create("Alice Chen", "AC", "#fff", "alice@test.com").WithId(1);
        _persons.Setup(p => p.GetByIdAsync(1, It.IsAny<CancellationToken>()))
            .ReturnsAsync(person);

        var result = await _service.LogoutAsync(1);

        Assert.That(result, Is.True);
    }

    [Test]
    public async Task LogoutAsync_PersonNotFound_ReturnsFalse()
    {
        _persons.Setup(p => p.GetByIdAsync(99, It.IsAny<CancellationToken>()))
            .ReturnsAsync((Person?)null);

        var result = await _service.LogoutAsync(99);

        Assert.That(result, Is.False);
    }
}
