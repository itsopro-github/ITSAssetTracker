namespace ITSAssetTracker.API.Services;

public interface IActiveDirectoryService
{
    bool IsUserInGroup(string username, string groupName);
    Task<List<string>> GetEmailAddressesForGroup(string groupName);
    Task<string?> GetUserEmailAddress(string username);
    Task<List<string>> SearchUsers(string searchTerm);
}
