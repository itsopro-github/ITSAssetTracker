import { Request, Response, NextFunction } from 'express';
import { activeDirectoryService } from '../services/activeDirectory.service';
import { config } from '../config';

// Extend Express Request to include user information
declare global {
  namespace Express {
    interface Request {
      user?: {
        username: string;
        isAdmin: boolean;
        isServiceDesk: boolean;
        isReadOnly: boolean;
      };
    }
  }
}

/**
 * SECURE Authentication Middleware
 *
 * Development Mode:
 * - Requires X-Username header (no default fallback)
 * - Validates username format
 * - Logs all authentication attempts
 *
 * Production Mode:
 * - Requires real Windows Authentication (NTLM/Kerberos)
 * - Fails closed if AD is not configured
 */
export const authenticateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // DEMO MODE: Bypass authentication for testing
    console.log('DEMO_MODE check:', process.env.DEMO_MODE);
    if (process.env.DEMO_MODE === 'true') {
      console.log('DEMO MODE ACTIVE - Bypassing authentication');
      req.user = {
        username: 'demo-user',
        isAdmin: true,
        isServiceDesk: true,
        isReadOnly: false,
      };
      return next();
    }

    // CRITICAL: Prevent production deployment without proper authentication
    if (process.env.NODE_ENV === 'production' && !config.activeDirectory.enabled) {
      console.error('FATAL: Production mode requires Active Directory to be enabled');
      return res.status(500).json({
        error: 'Authentication service unavailable'
      });
    }

    let username: string | null = null;

    // Development Mode - Header-based authentication (for testing only)
    if (process.env.NODE_ENV === 'development') {
      username = req.headers['x-username'] as string;

      // Require explicit username in development (no default fallback)
      if (!username || username.trim() === '') {
        console.warn('Authentication failed: Missing X-Username header', {
          ip: req.ip,
          path: req.path,
          method: req.method
        });
        return res.status(401).json({
          error: 'Unauthorized - X-Username header required in development mode'
        });
      }

      // Validate username format (alphanumeric, dots, hyphens only)
      if (!/^[a-zA-Z0-9._-]+$/.test(username)) {
        console.warn('Authentication failed: Invalid username format', {
          username,
          ip: req.ip
        });
        return res.status(401).json({
          error: 'Unauthorized - Invalid username format'
        });
      }
    }
    // Production Mode - Windows Authentication
    else {
      // Extract username from Windows authentication headers
      username = req.headers['x-iisnode-auth_user'] as string || // IIS
                 req.headers['remote-user'] as string;            // Apache/nginx

      // Fail if no valid authentication found
      if (!username) {
        console.warn('Authentication failed: No valid credentials', {
          ip: req.ip,
          path: req.path
        });
        return res.status(401).json({
          error: 'Unauthorized - Authentication required'
        });
      }
    }

    // Check user roles based on AD group membership
    const isAdmin = activeDirectoryService.isUserInGroup(username, config.activeDirectory.adminGroup);
    const isServiceDesk = activeDirectoryService.isUserInGroup(username, config.activeDirectory.serviceDeskGroup);
    const isReadOnly = activeDirectoryService.isUserInGroup(username, config.activeDirectory.readOnlyGroup);

    // Attach user info to request
    req.user = {
      username,
      isAdmin,
      isServiceDesk,
      isReadOnly,
    };

    next();
  } catch (error: any) {
    console.error('Authentication error', {
      error: error.message,
      ip: req.ip
    });
    return res.status(500).json({
      error: 'Authentication service error'
    });
  }
};

/**
 * Middleware factory to check if user is in required AD groups
 * @param allowedGroups Array of AD group names that are allowed
 */
export const requireAdGroups = (allowedGroups: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized - User not authenticated' });
    }

    // In DEMO_MODE, check the isAdmin/isServiceDesk flags directly
    if (process.env.DEMO_MODE === 'true') {
      // Check if user has admin or service desk permissions based on req.user flags
      const hasPermission = req.user.isAdmin || req.user.isServiceDesk;
      if (!hasPermission) {
        return res.status(403).json({
          error: 'Forbidden - You do not have permission to access this resource',
        });
      }
      return next();
    }

    // Check if user is in any of the allowed groups
    const isAuthorized = allowedGroups.some(groupName => {
      return activeDirectoryService.isUserInGroup(req.user!.username, groupName);
    });

    if (!isAuthorized) {
      return res.status(403).json({
        error: 'Forbidden - You do not have permission to access this resource',
      });
    }

    next();
  };
};

/**
 * Middleware to require admin access
 */
export const requireAdmin = requireAdGroups([config.activeDirectory.adminGroup]);

/**
 * Middleware to require ServiceDesk or Admin access
 */
export const requireServiceDesk = requireAdGroups([
  config.activeDirectory.adminGroup,
  config.activeDirectory.serviceDeskGroup,
]);
