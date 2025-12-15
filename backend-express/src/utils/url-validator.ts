/**
 * Validate ServiceNow ticket URL
 * Only allows HTTPS URLs from whitelisted ServiceNow domains
 */
export function validateServiceNowUrl(url: string | null | undefined): {
  valid: boolean;
  error?: string;
} {
  // Allow null/empty URLs (optional field)
  if (!url || url.trim() === '') {
    return { valid: true };
  }

  try {
    const parsed = new URL(url);

    // Only allow HTTPS protocol
    if (parsed.protocol !== 'https:') {
      return {
        valid: false,
        error: 'ServiceNow URL must use HTTPS protocol'
      };
    }

    // Whitelist allowed ServiceNow domains
    const allowedDomains = (process.env.SERVICENOW_DOMAINS || 'servicenow.company.com')
      .split(',')
      .map(d => d.trim());

    if (!allowedDomains.some(domain => parsed.hostname === domain)) {
      return {
        valid: false,
        error: `ServiceNow URL must be from one of: ${allowedDomains.join(', ')}`
      };
    }

    // Prevent localhost and private IP ranges
    const hostname = parsed.hostname;
    const isPrivateNetwork =
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./); // 172.16.0.0 - 172.31.255.255

    if (isPrivateNetwork) {
      return {
        valid: false,
        error: 'ServiceNow URL cannot point to private network'
      };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: 'Invalid URL format'
    };
  }
}
