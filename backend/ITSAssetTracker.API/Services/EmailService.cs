using System.Net;
using System.Net.Mail;
using System.Text;
using ITSAssetTracker.API.Data;
using ITSAssetTracker.API.Models;
using Microsoft.EntityFrameworkCore;

namespace ITSAssetTracker.API.Services;

public class EmailService : IEmailService
{
    private readonly ILogger<EmailService> _logger;
    private readonly IConfiguration _configuration;
    private readonly IActiveDirectoryService _adService;
    private readonly AssetTrackerDbContext _context;

    public EmailService(
        ILogger<EmailService> logger,
        IConfiguration configuration,
        IActiveDirectoryService adService,
        AssetTrackerDbContext context)
    {
        _logger = logger;
        _configuration = configuration;
        _adService = adService;
        _context = context;
    }

    public async Task SendLowStockAlert(Inventory item, string appBaseUrl)
    {
        await SendLowStockAlerts(new List<Inventory> { item }, appBaseUrl);
    }

    public async Task SendLowStockAlerts(List<Inventory> items, string appBaseUrl)
    {
        if (items == null || items.Count == 0)
            return;

        try
        {
            var recipients = await GetNotificationRecipients();
            if (!recipients.Any())
            {
                _logger.LogWarning("No email recipients configured for low stock alerts");
                return;
            }

            var subject = items.Count == 1
                ? $"🚨 Inventory Alert: {items[0].ItemNumber} Below Threshold"
                : $"🚨 Inventory Alert: {items.Count} Items Below Threshold";

            var body = BuildAlertEmailBody(items, appBaseUrl);

            await SendEmail(recipients, subject, body);

            _logger.LogInformation("Low stock alert sent for {Count} items to {RecipientCount} recipients",
                items.Count, recipients.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending low stock alerts");
            throw;
        }
    }

    private async Task<List<string>> GetNotificationRecipients()
    {
        var recipients = new List<string>();

        var config = await _context.NotificationConfigs.FirstOrDefaultAsync();
        if (config == null)
            return recipients;

        // Get emails from AD group
        if (!string.IsNullOrEmpty(config.ADGroupName))
        {
            var groupEmails = await _adService.GetEmailAddressesForGroup(config.ADGroupName);
            recipients.AddRange(groupEmails);
        }

        // Add additional email recipients
        if (!string.IsNullOrEmpty(config.AdditionalEmailRecipients))
        {
            var additionalEmails = config.AdditionalEmailRecipients
                .Split(',', StringSplitOptions.RemoveEmptyEntries)
                .Select(e => e.Trim())
                .Where(e => !string.IsNullOrEmpty(e));

            recipients.AddRange(additionalEmails);
        }

        return recipients.Distinct().ToList();
    }

    private string BuildAlertEmailBody(List<Inventory> items, string appBaseUrl)
    {
        var sb = new StringBuilder();
        sb.AppendLine("<html><body>");
        sb.AppendLine("<h2>Inventory Low Stock Alert</h2>");
        sb.AppendLine($"<p>The following {(items.Count == 1 ? "item has" : "items have")} reached or fallen below the minimum threshold:</p>");

        foreach (var item in items)
        {
            sb.AppendLine("<div style='border: 1px solid #ddd; padding: 15px; margin: 10px 0; background-color: #fff5f5;'>");
            sb.AppendLine($"<h3 style='color: #d32f2f; margin-top: 0;'>Item Number: {item.ItemNumber}</h3>");
            sb.AppendLine($"<p><strong>Description:</strong> {item.HardwareDescription}</p>");
            sb.AppendLine($"<p><strong>Type:</strong> {item.HardwareType}</p>");
            sb.AppendLine($"<p><strong>Current Quantity:</strong> <span style='color: #d32f2f; font-weight: bold;'>{item.CurrentQuantity}</span></p>");
            sb.AppendLine($"<p><strong>Minimum Threshold:</strong> {item.MinimumThreshold}</p>");
            sb.AppendLine($"<p><strong>Recommended Reorder Amount:</strong> {item.ReorderAmount}</p>");
            sb.AppendLine($"<p><a href='{appBaseUrl}/inventory/{item.Id}' style='color: #1976d2;'>View Item Details</a></p>");
            sb.AppendLine("</div>");
        }

        sb.AppendLine("<hr/>");
        sb.AppendLine($"<p><small>This is an automated notification from the ITS Asset Tracker system. Generated at {DateTime.Now:yyyy-MM-dd HH:mm:ss}</small></p>");
        sb.AppendLine("</body></html>");

        return sb.ToString();
    }

    private async Task SendEmail(List<string> recipients, string subject, string body)
    {
        var smtpHost = _configuration["Email:SmtpHost"] ?? "localhost";
        var smtpPort = int.Parse(_configuration["Email:SmtpPort"] ?? "25");
        var smtpUsername = _configuration["Email:SmtpUsername"];
        var smtpPassword = _configuration["Email:SmtpPassword"];
        var fromAddress = _configuration["Email:FromAddress"] ?? "noreply@company.com";
        var fromName = _configuration["Email:FromName"] ?? "ITS Asset Tracker";
        var enableSsl = bool.Parse(_configuration["Email:EnableSsl"] ?? "false");

        using var message = new MailMessage
        {
            From = new MailAddress(fromAddress, fromName),
            Subject = subject,
            Body = body,
            IsBodyHtml = true
        };

        foreach (var recipient in recipients)
        {
            message.To.Add(recipient);
        }

        using var client = new SmtpClient(smtpHost, smtpPort)
        {
            EnableSsl = enableSsl
        };

        if (!string.IsNullOrEmpty(smtpUsername) && !string.IsNullOrEmpty(smtpPassword))
        {
            client.Credentials = new NetworkCredential(smtpUsername, smtpPassword);
        }

        await client.SendMailAsync(message);
    }
}
