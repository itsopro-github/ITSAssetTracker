using ITSAssetTracker.API.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace ITSAssetTracker.API.Middleware;

[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public class ADGroupAuthorizationAttribute : Attribute, IAsyncAuthorizationFilter
{
    private readonly string[] _allowedGroups;

    public ADGroupAuthorizationAttribute(params string[] allowedGroups)
    {
        _allowedGroups = allowedGroups;
    }

    public async Task OnAuthorizationAsync(AuthorizationFilterContext context)
    {
        var user = context.HttpContext.User;

        if (user?.Identity?.IsAuthenticated != true)
        {
            context.Result = new UnauthorizedResult();
            return;
        }

        var username = user.Identity.Name;
        if (string.IsNullOrEmpty(username))
        {
            context.Result = new UnauthorizedResult();
            return;
        }

        var adService = context.HttpContext.RequestServices.GetService<IActiveDirectoryService>();
        if (adService == null)
        {
            context.Result = new StatusCodeResult(500);
            return;
        }

        var isAuthorized = false;
        foreach (var group in _allowedGroups)
        {
            if (adService.IsUserInGroup(username, group))
            {
                isAuthorized = true;
                break;
            }
        }

        if (!isAuthorized)
        {
            context.Result = new ForbidResult();
        }

        await Task.CompletedTask;
    }
}
