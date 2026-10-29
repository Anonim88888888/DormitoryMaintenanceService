using System.ComponentModel.DataAnnotations;
using DormitoryMaintenanceService.Api.Data;
using DormitoryMaintenanceService.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DormitoryMaintenanceService.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class MaintenanceRequestsController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly UserManager<ApplicationUser> _userManager;

    public MaintenanceRequestsController(
        ApplicationDbContext context,
        UserManager<ApplicationUser> userManager)
    {
        _context = context;
        _userManager = userManager;
    }

    [HttpGet]
    public async Task<ActionResult<List<MaintenanceRequestResponse>>> GetAll()
    {
        var query = _context.MaintenanceRequests.AsNoTracking();

        if (!User.IsInRole("Admin"))
        {
            var userId = _userManager.GetUserId(User);

            if (userId == null)
                return Unauthorized();

            query = query.Where(r => r.UserId == userId);
        }

        var result = await query
            .OrderByDescending(r => r.CreatedAtUtc)
            .Select(r => new MaintenanceRequestResponse
            {
                Id = r.Id,
                Title = r.Title,
                Description = r.Description,
                Location = r.Location,
                Status = r.Status,
                CreatedAtUtc = r.CreatedAtUtc,
                UserId = r.UserId,
                ResidentName = r.User != null ? r.User.FullName : null
            })
            .ToListAsync();

        return Ok(result);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<MaintenanceRequestResponse>> GetById(int id)
    {
        var request = await _context.MaintenanceRequests
            .AsNoTracking()
            .Where(r => r.Id == id)
            .Select(r => new MaintenanceRequestResponse
            {
                Id = r.Id,
                Title = r.Title,
                Description = r.Description,
                Location = r.Location,
                Status = r.Status,
                CreatedAtUtc = r.CreatedAtUtc,
                UserId = r.UserId,
                ResidentName = r.User != null ? r.User.FullName : null
            })
            .FirstOrDefaultAsync();

        if (request == null)
            return NotFound();

        if (!User.IsInRole("Admin"))
        {
            var userId = _userManager.GetUserId(User);

            if (userId == null)
                return Unauthorized();

            if (request.UserId != userId)
                return Forbid();
        }

        return Ok(request);
    }

    [HttpPost]
    public async Task<ActionResult<MaintenanceRequestResponse>> Create(
        CreateMaintenanceRequestRequest input)
    {
        var userId = _userManager.GetUserId(User);

        if (userId == null)
            return Unauthorized();

        var request = new MaintenanceRequest
        {
            Title = input.Title.Trim(),
            Description = input.Description.Trim(),
            Location = input.Location?.Trim(),
            Status = "New",
            CreatedAtUtc = DateTime.UtcNow,
            UserId = userId
        };

        _context.MaintenanceRequests.Add(request);
        await _context.SaveChangesAsync();

        var response = new MaintenanceRequestResponse
        {
            Id = request.Id,
            Title = request.Title,
            Description = request.Description,
            Location = request.Location,
            Status = request.Status,
            CreatedAtUtc = request.CreatedAtUtc,
            UserId = request.UserId,
            ResidentName = User.Identity?.Name
        };

        return CreatedAtAction(
            nameof(GetById),
            new { id = request.Id },
            response);
    }

    [HttpPatch("{id:int}/status")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateStatus(
        int id,
        UpdateRequestStatusRequest input)
    {
        var request = await _context.MaintenanceRequests.FindAsync(id);

        if (request == null)
            return NotFound();

        var allowedStatuses = new[] { "New", "InProgress", "Completed" };

        if (!allowedStatuses.Contains(input.Status))
        {
            return BadRequest(new
            {
                message = "Дозволені статуси: New, InProgress, Completed."
            });
        }

        request.Status = input.Status;
        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = "Статус заявки оновлено.",
            request.Id,
            request.Status
        });
    }
}

public class CreateMaintenanceRequestRequest
{
    [Required]
    [StringLength(120, MinimumLength = 3)]
    public string Title { get; set; } = string.Empty;

    [Required]
    [StringLength(2000, MinimumLength = 5)]
    public string Description { get; set; } = string.Empty;

    [StringLength(50)]
    public string? Location { get; set; }
}

public class UpdateRequestStatusRequest
{
    [Required]
    public string Status { get; set; } = string.Empty;
}

public class MaintenanceRequestResponse
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string? Location { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string? ResidentName { get; set; }
}
