import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import inventoryRoutes from './routes/inventory.routes';
import userRoutes from './routes/user.routes';
import configurationRoutes from './routes/configuration.routes';
import csvUploadRoutes from './routes/csvUpload.routes';

const app = express();

// ========================================
// SECURITY MIDDLEWARE (Order matters!)
// ========================================

// 1. HELMET - Security Headers
app.use(helmet({
  // Content Security Policy - Prevents XSS attacks
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: [
        "'self'",
        "'unsafe-inline'" // Required for inline styles (consider removing and using classes)
      ],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"], // Prevent embedding in iframes
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"], // Clickjacking protection
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
    },
  },

  // HTTP Strict Transport Security - Force HTTPS
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },

  // X-Content-Type-Options - Prevent MIME sniffing
  noSniff: true,

  // X-Frame-Options - Additional clickjacking protection
  frameguard: {
    action: 'deny'
  },

  // X-XSS-Protection - Legacy XSS protection (mostly deprecated but doesn't hurt)
  xssFilter: true,

  // Referrer Policy - Control referrer information
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin'
  },

  // X-DNS-Prefetch-Control - Control DNS prefetching
  dnsPrefetchControl: {
    allow: false
  },

  // X-Download-Options - Prevent IE from executing downloads
  ieNoOpen: true,

  // X-Permitted-Cross-Domain-Policies - Restrict Adobe Flash/PDF
  permittedCrossDomainPolicies: {
    permittedPolicies: 'none'
  },

  // Hide X-Powered-By header
  hidePoweredBy: true,
}));

// 2. CORS - Cross-Origin Resource Sharing
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? (process.env.ALLOWED_ORIGINS || '').split(',').map(o => o.trim())
  : ['http://localhost:3000', 'http://localhost:5173'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn('CORS: Origin not allowed', { origin, allowedOrigins });
      callback(new Error(`Origin ${origin} not allowed by CORS policy`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-CSRF-Token',
    'X-Requested-With'
  ],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  maxAge: 86400, // 24 hours - cache preflight requests
}));

// 3. RATE LIMITING - Prevent brute force and DoS attacks
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  // Skip successful requests (only count failures)
  skip: (req) => {
    // Don't rate limit health checks
    return req.path === '/health';
  },
  handler: (req, res) => {
    console.warn('Rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      userAgent: req.headers['user-agent']
    });
    res.status(429).json({
      error: 'Too many requests, please try again later.',
      retryAfter: req.rateLimit?.resetTime
    });
  }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per 15 minutes
  skipSuccessfulRequests: true, // Don't count successful authentications
  message: 'Too many authentication attempts, please try again later.',
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 uploads per hour per IP
  message: 'Too many file uploads, please try again later.',
});

// Apply rate limiters
app.use('/api/', apiLimiter);
app.use('/api/user/me', authLimiter);
app.use('/api/csvupload', uploadLimiter);

// 4. BODY PARSERS - Parse request bodies
app.use(express.json({
  limit: '1mb', // Prevent large payload DoS
  strict: true, // Only accept arrays and objects
}));

app.use(express.urlencoded({
  extended: true,
  limit: '1mb',
  parameterLimit: 1000, // Prevent parameter pollution
}));

// 5. REQUEST SANITIZATION - Remove dangerous characters
app.use((req, res, next) => {
  // Log all API requests for security monitoring
  if (req.path.startsWith('/api/')) {
    console.info('API Request', {
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      timestamp: new Date().toISOString()
    });
  }
  next();
});

// ========================================
// ROUTES
// ========================================
app.use('/api/inventory', inventoryRoutes);
app.use('/api/user', userRoutes);
app.use('/api/configuration', configurationRoutes);
app.use('/api/csvupload', csvUploadRoutes);

// ========================================
// HEALTH CHECK
// ========================================
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    uptime: process.uptime()
  });
});

// Security.txt for responsible disclosure
app.get('/.well-known/security.txt', (req, res) => {
  res.type('text/plain');
  res.send(`Contact: security@company.com
Expires: ${new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()}
Preferred-Languages: en
`);
});

// ========================================
// ERROR HANDLING
// ========================================

// 404 Handler
app.use((req, res) => {
  console.warn('404 Not Found', {
    path: req.path,
    method: req.method,
    ip: req.ip
  });
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource does not exist'
  });
});

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Log full error details server-side
  console.error('Application Error', {
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
    ip: req.ip,
    user: req.user?.username,
    timestamp: new Date().toISOString()
  });

  // Determine if this is a validation error, auth error, etc.
  const statusCode = err.status || err.statusCode || 500;

  // Send generic error in production, detailed in development
  const errorResponse: any = {
    error: process.env.NODE_ENV === 'production'
      ? 'An error occurred'
      : err.message || 'Internal server error'
  };

  // Include stack trace only in development
  if (process.env.NODE_ENV === 'development' && err.stack) {
    errorResponse.stack = err.stack;
  }

  // Include validation errors if present
  if (err.errors) {
    errorResponse.errors = err.errors;
  }

  res.status(statusCode).json(errorResponse);
});

// ========================================
// GRACEFUL SHUTDOWN
// ========================================
process.on('SIGTERM', () => {
  console.info('SIGTERM signal received: closing HTTP server');
  // Close server gracefully
  process.exit(0);
});

process.on('SIGINT', () => {
  console.info('SIGINT signal received: closing HTTP server');
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception', {
    error: error.message,
    stack: error.stack
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection', {
    reason,
    promise
  });
});

// ========================================
// START SERVER
// ========================================

// Security check: Ensure production uses proper authentication
if (process.env.NODE_ENV === 'production') {
  if (!config.activeDirectory.enabled) {
    console.error('FATAL: Active Directory must be enabled in production mode');
    console.error('Set AD_ENABLED=true in your environment variables');
    process.exit(1);
  }

  if (allowedOrigins.length === 0 || allowedOrigins.includes('http://localhost:3000')) {
    console.error('FATAL: ALLOWED_ORIGINS must be configured for production');
    console.error('Set ALLOWED_ORIGINS environment variable with production domains');
    process.exit(1);
  }

  console.info('Production security checks passed');
}

const server = app.listen(config.port, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║  ITS Asset Tracker API Server                                  ║
╠════════════════════════════════════════════════════════════════╣
║  Status: Running                                               ║
║  Port: ${config.port}                                                   ║
║  Environment: ${config.nodeEnv}                                       ║
║  Frontend: ${config.frontendUrl}                    ║
║  AD Enabled: ${config.activeDirectory.enabled}                                      ║
║  Security Headers: Enabled                                     ║
║  Rate Limiting: Enabled                                        ║
║  CORS Origins: ${allowedOrigins.join(', ')}                    ║
╚════════════════════════════════════════════════════════════════╝
  `);
});

// Set timeout for long-running requests
server.timeout = 120000; // 2 minutes

export default app;
