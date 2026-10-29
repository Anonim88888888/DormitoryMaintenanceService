using System.ComponentModel.DataAnnotations;
using System.Linq;
using DormitoryMaintenanceService.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace DormitoryMaintenanceService.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly SignInManager<ApplicationUser> _signInManager;
    private readonly RoleManager<IdentityRole> _roleManager;

    public AuthController(
        UserManager<ApplicationUser> userManager,
        SignInManager<ApplicationUser> signInManager,
        RoleManager<IdentityRole> roleManager)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _roleManager = roleManager;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterRequest request)
    {
        var email = request.Email.Trim();

        if (await _userManager.FindByEmailAsync(email) != null)
        {
            return Conflict(new
            {
                message = "Користувач із таким email уже існує."
            });
        }

        var user = new ApplicationUser
        {
            UserName = email,
            Email = email,
            FullName = request.FullName.Trim(),
            RoomNumber = request.RoomNumber?.Trim()
        };

        var createResult = await _userManager.CreateAsync(
            user, request.Password);

        if (!createResult.Succeeded)
        {
            return BadRequest(new
            {
                errors = createResult.Errors.Select(e => e.Description)
            });
        }

        if (!await _roleManager.RoleExistsAsync("Resident"))
        {
            var roleResult = await _roleManager.CreateAsync(
                new IdentityRole("Resident"));

            if (!roleResult.Succeeded)
            {
                await _userManager.DeleteAsync(user);

                return StatusCode(StatusCodes.Status500InternalServerError,
                    new { message = "Не вдалося створити роль користувача." });
            }
        }

        var addRoleResult = await _userManager.AddToRoleAsync(
            user, "Resident");

        if (!addRoleResult.Succeeded)
        {
            await _userManager.DeleteAsync(user);

            return StatusCode(StatusCodes.Status500InternalServerError,
                new { message = "Не вдалося призначити роль користувачу." });
        }

        await _signInManager.SignInAsync(user, isPersistent: false);

        return Ok(new
        {
            message = "Реєстрація успішна.",
            user = new
            {
                user.Id,
                user.FullName,
                user.Email,
                user.RoomNumber,
                role = "Resident"
            }
        });
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequest request)
    {
        var user = await _userManager.FindByEmailAsync(
            request.Email.Trim());

        if (user == null)
        {
            return Unauthorized(new
            {
                message = "Неправильний email або пароль."
            });
        }

        var result = await _signInManager.PasswordSignInAsync(
            user,
            request.Password,
            isPersistent: false,
            lockoutOnFailure: true);

        if (!result.Succeeded)
        {
            return Unauthorized(new
            {
                message = "Неправильний email або пароль."
            });
        }

        var roles = await _userManager.GetRolesAsync(user);

        return Ok(new
        {
            message = "Вхід успішний.",
            user = new
            {
                user.Id,
                user.FullName,
                user.Email,
                user.RoomNumber,
                roles
            }
        });
    }

    [Authorize]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        await _signInManager.SignOutAsync();

        return Ok(new { message = "Ви вийшли з акаунта." });
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        var user = await _userManager.GetUserAsync(User);

        if (user == null)
        {
            return Unauthorized();
        }

        var roles = await _userManager.GetRolesAsync(user);

        return Ok(new
        {
            user.Id,
            user.FullName,
            user.Email,
            user.RoomNumber,
            roles
        });
    }
}

public class RegisterRequest
{
    [Required]
    [StringLength(100, MinimumLength = 2)]
    public string FullName { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    [MinLength(8)]
    public string Password { get; set; } = string.Empty;

    [StringLength(20)]
    public string? RoomNumber { get; set; }
}

public class LoginRequest
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string Password { get; set; } = string.Empty;
}
