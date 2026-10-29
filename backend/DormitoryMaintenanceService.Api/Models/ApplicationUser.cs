using Microsoft.AspNetCore.Identity;

namespace DormitoryMaintenanceService.Api.Models;

public class ApplicationUser : IdentityUser
{
    public string FullName { get; set; } = string.Empty;

    public string? RoomNumber { get; set; }
}
