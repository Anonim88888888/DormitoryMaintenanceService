using DormitoryMaintenanceService.Api.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace DormitoryMaintenanceService.Api.Data;

public static class IdentitySeeder
{
    public static async Task SeedAsync(IServiceProvider services)
    {
        using var scope = services.CreateScope();

        var provider = scope.ServiceProvider;
        var roles = provider.GetRequiredService<RoleManager<IdentityRole>>();
        var users = provider.GetRequiredService<UserManager<ApplicationUser>>();
        var configuration = provider.GetRequiredService<IConfiguration>();

        foreach (var roleName in new[] { "Resident", "Admin" })
        {
            if (!await roles.RoleExistsAsync(roleName))
            {
                var result = await roles.CreateAsync(
                    new IdentityRole(roleName));

                if (!result.Succeeded)
                {
                    throw new InvalidOperationException(
                        $"Не вдалося створити роль {roleName}: " +
                        string.Join("; ", result.Errors.Select(e => e.Description)));
                }
            }
        }

        var email = configuration["Admin:Email"];
        var password = configuration["Admin:Password"];

        if (string.IsNullOrWhiteSpace(email) ||
            string.IsNullOrWhiteSpace(password))
        {
            return;
        }

        var admin = await users.FindByEmailAsync(email);
        var isNewAdmin = admin is null;

        if (admin is null)
        {
            admin = new ApplicationUser
            {
                UserName = email,
                Email = email,
                FullName = "Адміністратор",
                EmailConfirmed = true
            };

            var createResult = await users.CreateAsync(admin, password);

            if (!createResult.Succeeded)
            {
                throw new InvalidOperationException(
                    "Не вдалося створити адміністратора: " +
                    string.Join("; ", createResult.Errors.Select(e => e.Description)));
            }
        }

        if (!await users.IsInRoleAsync(admin, "Admin"))
        {
            if (!isNewAdmin)
            {
                throw new InvalidOperationException(
                    "Обліковий запис адміністратора вже існує, " +
                    "але не має ролі Admin. Автоматичне підвищення заборонено.");
            }

            var roleResult = await users.AddToRoleAsync(admin, "Admin");

            if (!roleResult.Succeeded)
            {
                throw new InvalidOperationException(
                    "Не вдалося призначити роль Admin: " +
                    string.Join("; ", roleResult.Errors.Select(e => e.Description)));
            }
        }
    }
}
