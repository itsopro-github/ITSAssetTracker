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
 * - Requires X-Username header (simulates Windows Auth for testing)
 * - Validates username is not empty
 * - Logs all authentication attempts
 *
 * Production Mode:
 * - Requires real Windows Authentication (NTLM/Kerberos)
 * - OR requires valid JWT token
 * - Fails closed if AD is not configured
 */
export const authenticateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
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

      console.log('Development authentication', {
        username,
        ip: req.ip,
        path: req.path
      });
    }
    // Production Mode - Windows Authentication or JWT
    else {
      // Option 1: Windows Authentication (NTLM/Kerberos)
      // The username would be extracted from Windows authentication
      // This is typically handled by IIS or a reverse proxy
      username = req.headers['x-iisnode-auth_user'] as string || // IIS
                 req.headers['remote-user'] as string ||          // Apache/nginx
                 req.user?.username;                              // Passport.js

      // Option 2: JWT Token Authentication (alternative to Windows Auth)
      if (!username) {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (token) {
          try {
            // Verify JWT token (you would implement verifyJwtToken)
            // const decoded = await verifyJwtToken(token);
            // username = decoded.username;
          } catch (error) {
            console.error('JWT verification failed', { error });
          }
        }
      }

      // Fail if no valid authentication found
      if (!username) {
        console.warn('Authentication failed: No valid credentials', {
          ip: req.ip,
          path: req.path,
          headers: Object.keys(req.headers)
        });
        return res.status(401).json({
          error: 'Unauthorized - Authentication required'
        });
      }

      console.log('Production authentication', {
        username,
        ip: req.ip,
        path: req.path
      });
    }

    // At this point, username is validated and non-null
    // Check user roles based on AD group membership
    const isAdmin = activeDirectoryService.isUserInGroup(
      username,
      config.activeDirectory.adminGroup
    );
    const isServiceDesk = activeDirectoryService.isUserInGroup(
      username,
      config.activeDirectory.serviceDeskGroup
    );
    const isReadOnly = activeDirectoryService.isUserInGroup(
      username,
      config.activeDirectory.readOnlyGroup
    );

    // Log successful authentication
    console.info('User authenticated successfully', {
      username,
      roles: {
        isAdmin,
        isServiceDesk,
        isReadOnly
      },
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

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
      stack: error.stack,
      ip: req.ip
    });
    return res.status(500).json({
      error: 'Authentication service error'
    });
  }
};

/**
 * Middleware factory to check if user is in required AD groups
 * Logs all authorization attempts for audit purposes
 * @param allowedGroups Array of AD group names that are allowed
 */
export const requireAdGroups = (allowedGroups: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Check if user is authenticated
    if (!req.user) {
      console.warn('Authorization failed: User not authenticated', {
        ip: req.ip,
        path: req.path
      });
      return res.status(401).json({
        error: 'Unauthorized - User not authenticated'
      });
    }

    // Check if user is in any of the allowed groups
    const isAuthorized = allowedGroups.some(groupName => {
      return activeDirectoryService.isUserInGroup(req.user!.username, groupName);
    });

    if (!isAuthorized) {
      // Log authorization failure for security monitoring
      console.warn('Authorization failed: Insufficient permissions', {
        username: req.user.username,
        requiredGroups: allowedGroups,
        userRoles: {
          isAdmin: req.user.isAdmin,
          isServiceDesk: req.user.isServiceDesk,
          isReadOnly: req.user.isReadOnly
        },
        ip: req.ip,
        path: req.path,
        method: req.method
      });

      return res.status(403).json({
        error: 'Forbidden - You do not have permission to access this resource',
      });
    }

    // Log successful authorization
    console.info('Authorization successful', {
      username: req.user.username,
      requiredGroups: allowedGroups,
      path: req.path
    });

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

/**
 * Additional security middleware - Add request rate tracking per user
 * This helps detect unusual patterns that might indicate compromised accounts
 */
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export const trackUserRequests = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next();
  }

  const username = req.user.username;
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute window

  let userStats = requestCounts.get(username);

  if (!userStats || now > userStats.resetTime) {
    // Reset or initialize
    userStats = { count: 1, resetTime: now + windowMs };
    requestCounts.set(username, userStats);
  } else {
    userStats.count++;

    // Log if user makes unusually high number of requests
    if (userStats.count > 100) {
      console.warn('Unusual request volume detected', {
        username,
        requestCount: userStats.count,
        ip: req.ip,
        path: req.path
      });
    }
  }

  next();
};
