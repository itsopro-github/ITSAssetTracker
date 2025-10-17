using System.DirectoryServices;
using System.DirectoryServices.AccountManagement;

namespace ITSAssetTracker.API.Services;

public class ActiveDirectoryService : IActiveDirectoryService
{
    private readonly ILogger<ActiveDirectoryService> _logger;
    private readonly IConfiguration _configuration;

    public ActiveDirectoryService(ILogger<ActiveDirectoryService> logger, IConfiguration configuration)
    {
        _logger = logger;
        _configuration = configuration;
    }

    public bool IsUserInGroup(string username, string groupName)
    {
        try
        {
            // Remove domain prefix if present (DOMAIN\username -> username)
            var cleanUsername = username.Contains('\\') ? username.Split('\\')[1] : username;

            using var context = new PrincipalContext(ContextType.Domain);
            using var user = UserPrincipal.FindByIdentity(context, IdentityType.SamAccountName, cleanUsername);

            if (user == null)
            {
                _logger.LogWarning("User {Username} not found in Active Directory", cleanUsername);
                return false;
            }

            using var group = GroupPrincipal.FindByIdentity(context, IdentityType.Name, groupName);
            if (group == null)
            {
                _logger.LogWarning("Group {GroupName} not found in Active Directory", groupName);
                return false;
            }

            return user.IsMemberOf(group);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking if user {Username} is in group {GroupName}", username, groupName);
            return false;
        }
    }

    public async Task<List<string>> GetEmailAddressesForGroup(string groupName)
    {
        return await Task.Run(() =>
        {
            var emails = new List<string>();
            try
            {
                using var context = new PrincipalContext(ContextType.Domain);
                using var group = GroupPrincipal.FindByIdentity(context, IdentityType.Name, groupName);

                if (group == null)
                {
                    _logger.LogWarning("Group {GroupName} not found", groupName);
                    return emails;
                }

                foreach (var member in group.GetMembers(false))
                {
                    if (member is UserPrincipal userPrincipal && !string.IsNullOrEmpty(userPrincipal.EmailAddress))
                    {
                        emails.Add(userPrincipal.EmailAddress);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving email addresses for group {GroupName}", groupName);
            }

            return emails;
        });
    }

    public async Task<string?> GetUserEmailAddress(string username)
    {
        return await Task.Run(() =>
        {
            try
            {
                var cleanUsername = username.Contains('\\') ? username.Split('\\')[1] : username;

                using var context = new PrincipalContext(ContextType.Domain);
                using var user = UserPrincipal.FindByIdentity(context, IdentityType.SamAccountName, cleanUsername);

                return user?.EmailAddress;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving email for user {Username}", username);
                return null;
            }
        });
    }

    public async Task<List<string>> SearchUsers(string searchTerm)
    {
        return await Task.Run(() =>
        {
            var users = new List<string>();
            try
            {
                using var context = new PrincipalContext(ContextType.Domain);
                using var searcher = new PrincipalSearcher(new UserPrincipal(context)
                {
                    SamAccountName = $"{searchTerm}*"
                });

                foreach (var result in searcher.FindAll().Take(20))
                {
                    if (result is UserPrincipal user && !string.IsNullOrEmpty(user.SamAccountName))
                    {
                        users.Add(user.SamAccountName);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error searching for users with term {SearchTerm}", searchTerm);
            }

            return users;
        });
    }
}
