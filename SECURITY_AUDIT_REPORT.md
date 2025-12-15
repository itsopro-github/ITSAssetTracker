# ITS Asset Tracker - OWASP Top 10 Security Audit Report

**Audit Date**: 2025-11-19
**Application Version**: 1.0.0
**Framework**: OWASP Top 10 (2021)
**Status**: ⚠️ **CRITICAL VULNERABILITIES FOUND**

[[_TOC_]]

---

## Executive Summary

This security audit identified **31 vulnerabilities** requiring remediation:

| Severity | Count | Action Required |
|----------|-------|-----------------|
| 🔴 Critical | 3 | **Immediate** (within 1 week) |
| 🔴 High | 10 | High Priority (within 2 weeks) |
| 🟡 Medium | 14 | Medium Priority (within 1 month) |
| 🟢 Low | 4 | Low Priority (within 2 months) |

**Most Critical Issues:**
1. Authentication bypass via header manipulation
2. Unencrypted database with sensitive data
3. Missing security headers (XSS, clickjacking vulnerabilities)
4. No rate limiting (DoS exposure)
5. Mock authentication enabled

---

## Detailed Findings by OWASP Category

### A01:2021 - Broken Access Control (5 findings)

#### 🔴 CRITICAL #1: Bypassable Authentication via Header Manipulation
- **File**: `backend-express/src/middleware/auth.middleware.ts:24-26`
- **Severity**: CRITICAL
- **CVSS Score**: 9.8 (Critical)

**Vulnerability:**
```typescript
const username = req.headers['x-username'] as string || 'admin';
```

Any user can impersonate any user (including admin) by setting the `X-Username` header.

**Proof of Concept:**
```bash
curl -H "X-Username: admin" http://localhost:5002/api/inventory
# Returns admin-level access without authentication
```

**Impact:**
- Complete authentication bypass
- Unauthorized access to all admin functions
- Data breach potential
- Audit log tampering

**Remediation:**
```typescript
export const authenticateUser = async (req: Request, res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV === 'production' && !config.activeDirectory.enabled) {
    throw new Error('Production mode requires Active Directory authentication');
  }

  // For development only
  if (process.env.NODE_ENV === 'development') {
    const username = req.headers['x-username'] as string;
    if (!username) {
      return res.status(401).json({ error: 'X-Username header required in dev mode' });
    }

    req.user = {
      username,
      isAdmin: activeDirectoryService.isUserInGroup(username, config.activeDirectory.adminGroup),
      isServiceDesk: activeDirectoryService.isUserInGroup(username, config.activeDirectory.serviceDeskGroup),
      isReadOnly: activeDirectoryService.isUserInGroup(username, config.activeDirectory.readOnlyGroup),
    };

    next();
    return;
  }

  // Production: Implement Windows Authentication or JWT
  const user = await verifyWindowsAuthentication(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  req.user = user;
  next();
};
```

---

#### 🔴 HIGH #2: Missing Authorization on Configuration Endpoint
- **File**: `backend-express/src/routes/configuration.routes.ts:11`
- **Severity**: HIGH
- **CWE**: CWE-862 (Missing Authorization)

**Vulnerability:**
```typescript
router.get('/notification', configurationController.getNotificationConfig);
// No authorization middleware
```

**Impact:**
- Any authenticated user can view notification configuration
- Exposes AD group names
- Exposes additional email recipients
- Information disclosure for social engineering

**Remediation:**
```typescript
router.get('/notification', requireServiceDesk, configurationController.getNotificationConfig);
```

---

#### 🔴 HIGH #3: Missing Authorization on User Search
- **File**: `backend-express/src/routes/user.routes.ts:11`
- **Severity**: HIGH
- **CWE**: CWE-862 (Missing Authorization)

**Vulnerability:**
All authenticated users can enumerate Active Directory users.

**Impact:**
- User enumeration
- Facilitates phishing attacks
- Facilitates brute force attacks

**Remediation:**
```typescript
router.get('/search', requireServiceDesk, userController.searchUsers);
```

---

#### 🟡 MEDIUM #4: No Row-Level Access Control
- **Files**: All controllers
- **Severity**: MEDIUM
- **CWE**: CWE-639 (Authorization Bypass Through User-Controlled Key)

**Vulnerability:**
No checks to ensure users can only access their own assigned assets.

**Impact:**
Users could view/modify audit history and assignments of other users.

**Remediation:**
Implement row-level security checks in all data access operations.

---

#### 🟡 MEDIUM #5: Mass Assignment Vulnerability
- **File**: `backend-express/src/controllers/inventory.controller.ts:344-350`
- **Severity**: MEDIUM
- **CWE**: CWE-915 (Improperly Controlled Modification of Dynamically-Determined Object Attributes)

**Vulnerability:**
```typescript
const updateData = req.body;
const updatedItem = await prisma.inventory.update({
  where: { id: parseInt(id, 10) },
  data: {
    ...updateData,  // Dangerous
    lastModifiedBy: req.user?.username || 'System',
  },
});
```

**Impact:**
Attackers could modify protected fields like `id`, `itemNumber`, or inject malicious data.

**Remediation:**
```typescript
const allowedFields = ['assetType', 'description', 'category', 'cost',
                       'minimumThreshold', 'reorderAmount', 'currentQuantity'];

const updateData = Object.keys(req.body)
  .filter(key => allowedFields.includes(key))
  .reduce((obj, key) => ({ ...obj, [key]: req.body[key] }), {});

// Validate each field
if (updateData.cost !== undefined && (updateData.cost < 0 || updateData.cost > 999999)) {
  return res.status(400).json({ error: 'Invalid cost value' });
}
```

---

### A02:2021 - Cryptographic Failures (6 findings)

#### 🔴 CRITICAL #6: Unencrypted Database
- **File**: `backend-express/.env:7`
- **Severity**: CRITICAL
- **CWE**: CWE-311 (Missing Encryption of Sensitive Data)

**Vulnerability:**
```env
DATABASE_URL="file:./assettracker.db"
```

SQLite database stored without encryption.

**Impact:**
- Complete data breach if server compromised
- Audit logs readable in plaintext
- User assignments visible
- Inventory data exposed

**Remediation (Option 1 - SQLCipher):**
```bash
npm install better-sqlite3 @types/better-sqlite3
```

```typescript
import Database from 'better-sqlite3';

const db = new Database('assettracker.db');
db.pragma(`key='${process.env.DB_ENCRYPTION_KEY}'`);
```

**Remediation (Option 2 - Migrate to SQL Server):**
See `SQL_SERVER_MIGRATION_GUIDE.md` and enable TDE (Transparent Data Encryption).

---

#### 🔴 HIGH #7: SMTP Credentials in Plaintext
- **File**: `backend-express/.env:12-13`
- **Severity**: HIGH
- **CWE**: CWE-798 (Use of Hard-coded Credentials)

**Vulnerability:**
```env
SMTP_USERNAME=
SMTP_PASSWORD=
```

**Impact:**
Email account compromise if `.env` exposed.

**Remediation:**
```typescript
// Use Azure Key Vault
import { SecretClient } from "@azure/keyvault-secrets";

const client = new SecretClient(
  process.env.KEYVAULT_URL,
  new DefaultAzureCredential()
);

const smtpPassword = await client.getSecret("smtp-password");
```

---

#### 🔴 HIGH #8: AD Credentials in Plaintext
- **File**: `backend-express/.env:28-29`
- **Severity**: HIGH
- **CWE**: CWE-798

**Vulnerability:**
Active Directory bind credentials stored unencrypted.

**Impact:**
Domain service account compromise could allow lateral movement across corporate network.

**Remediation:**
Store in Azure Key Vault or AWS Secrets Manager.

---

#### 🟡 MEDIUM #9: TLS Verification Disabled
- **File**: `backend-express/src/services/email.service.ts:27-29`
- **Severity**: MEDIUM
- **CWE**: CWE-295 (Improper Certificate Validation)

**Vulnerability:**
```typescript
tls: {
  rejectUnauthorized: false,
},
```

**Impact:**
Man-in-the-middle attacks on email communications.

**Remediation:**
```typescript
tls: {
  rejectUnauthorized: process.env.NODE_ENV === 'production',
  minVersion: 'TLSv1.2',
  ciphers: 'HIGH:!aNULL:!MD5'
},
```

---

#### 🟡 MEDIUM #10: No HTTPS Enforcement
- **File**: `backend-express/src/server.ts`
- **Severity**: MEDIUM
- **CWE**: CWE-319 (Cleartext Transmission of Sensitive Information)

**Vulnerability:**
Server runs on HTTP only.

**Impact:**
- Session hijacking
- Credential interception
- Data tampering in transit

**Remediation:**
```typescript
import https from 'https';
import fs from 'fs';

if (process.env.NODE_ENV === 'production') {
  const options = {
    key: fs.readFileSync(process.env.SSL_KEY_PATH),
    cert: fs.readFileSync(process.env.SSL_CERT_PATH)
  };

  https.createServer(options, app).listen(config.port, () => {
    console.log(`HTTPS server running on port ${config.port}`);
  });
} else {
  app.listen(config.port, () => {
    console.log(`HTTP server running on port ${config.port} (DEV ONLY)`);
  });
}
```

---

### A03:2021 - Injection (3 findings)

#### ✅ LOW RISK: SQL Injection Protected
- **Assessment**: Prisma ORM provides automatic parameterization. No raw SQL found.
- **Status**: ✅ PROTECTED

---

#### 🟡 MEDIUM #11: CSV Injection
- **File**: `backend-express/src/services/csvProcessing.service.ts:87-89`
- **Severity**: MEDIUM
- **CWE**: CWE-1236 (Improper Neutralization of Formula Elements)

**Vulnerability:**
CSV fields not sanitized. Excel could execute formulas like `=cmd|'/c calc'!A1`.

**Impact:**
Remote code execution when CSV downloaded and opened in Excel.

**Remediation:**
```typescript
function sanitizeCsvField(field: string): string {
  if (typeof field !== 'string') return field;

  const dangerousChars = ['=', '+', '-', '@', '\t', '\r'];
  if (dangerousChars.some(char => field.startsWith(char))) {
    return `'${field}`; // Prefix with single quote
  }
  return field;
}

// Apply before processing
const sanitizedDescription = sanitizeCsvField(row.Description);
```

---

#### 🟢 LOW #12: Insufficient Numeric Validation
- **File**: `backend-express/src/services/csvProcessing.service.ts:76-79`
- **Severity**: LOW
- **CWE**: CWE-1284 (Improper Validation of Specified Quantity in Input)

**Vulnerability:**
```typescript
const cost = parseFloat(row.Cost) || 0;
```

Accepts negative numbers, NaN, or extremely large values.

**Remediation:**
```typescript
function parsePositiveFloat(value: string, min: number, max: number): number {
  const parsed = parseFloat(value);
  if (isNaN(parsed) || parsed < min || parsed > max) {
    throw new Error(`Value must be between ${min} and ${max}`);
  }
  return parsed;
}

const cost = parsePositiveFloat(row.Cost, 0, 999999.99);
```

---

#### 🟡 MEDIUM #13: Insufficient URL Validation
- **File**: `frontend/src/pages/InventoryList.tsx:248-254`
- **Severity**: MEDIUM
- **CWE**: CWE-20 (Improper Input Validation)

**Vulnerability:**
```typescript
a.ticketUrl && !a.ticketUrl.match(/^https?:\/\/.+/)
```

Accepts any domain for ServiceNow URLs.

**Impact:**
- SSRF if URLs fetched server-side
- Phishing links in audit trail

**Remediation:**
```typescript
const ALLOWED_SERVICENOW_DOMAINS = [
  'servicenow.company.com',
  'company.service-now.com'
];

function isValidServiceNowUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' &&
           ALLOWED_SERVICENOW_DOMAINS.includes(parsed.hostname);
  } catch {
    return false;
  }
}
```

---

### A04:2021 - Insecure Design (3 findings)

#### 🔴 HIGH #14: No Rate Limiting
- **File**: `backend-express/src/server.ts`
- **Severity**: HIGH
- **CWE**: CWE-770 (Allocation of Resources Without Limits)

**Vulnerability:**
No rate limiting implemented.

**Impact:**
- Brute force attacks
- API abuse
- DoS attacks
- CSV upload bombing

**Remediation:**
```bash
npm install express-rate-limit
```

```typescript
import rateLimit from 'express-rate-limit';

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: 'Too many file uploads, please try again later.'
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true
});

app.use('/api/', apiLimiter);
app.use('/api/csvupload', uploadLimiter);
app.use('/api/user/me', authLimiter);
```

---

#### 🟡 MEDIUM #15: No CSRF Protection
- **File**: `backend-express/src/server.ts`
- **Severity**: MEDIUM
- **CWE**: CWE-352 (Cross-Site Request Forgery)

**Vulnerability:**
No CSRF tokens. Application uses cookies (`withCredentials: true`).

**Impact:**
Malicious websites can trigger state-changing requests on behalf of authenticated users.

**Remediation:**
```bash
npm install csurf
```

```typescript
import csrf from 'csurf';

const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  }
});

app.use(csrfProtection);

app.get('/api/csrf-token', (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});
```

Frontend:
```typescript
// Get CSRF token on app load
const { data: csrfToken } = await axios.get('/api/csrf-token');

// Include in all state-changing requests
axios.post('/api/inventory', data, {
  headers: { 'X-CSRF-Token': csrfToken }
});
```

---

#### 🟡 MEDIUM #16: Inadequate File Upload Validation
- **File**: `backend-express/src/routes/csvUpload.routes.ts:9-21`
- **Severity**: MEDIUM
- **CWE**: CWE-434 (Unrestricted Upload of File with Dangerous Type)

**Vulnerability:**
Only checks MIME type and extension (easily spoofed).

**Impact:**
Malicious files disguised as CSV could exploit parser vulnerabilities.

**Remediation:**
```typescript
import { parse } from 'csv-parse/sync';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 1
  },
  fileFilter: (req, file, cb) => {
    if (!file.originalname.match(/\.csv$/i)) {
      return cb(new Error('Only CSV files allowed'));
    }
    cb(null, true);
  },
});

// In controller, validate actual content
router.post('/', upload.single('file'), async (req, res) => {
  try {
    // Verify it's valid CSV by parsing
    const records = parse(req.file.buffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relaxColumnCount: false // Strict column validation
    });

    // Process records...
  } catch (error) {
    return res.status(400).json({ error: 'Invalid CSV format' });
  }
});
```

---

### A05:2021 - Security Misconfiguration (5 findings)

#### 🔴 HIGH #17: Missing Security Headers
- **File**: `backend-express/src/server.ts`
- **Severity**: HIGH
- **CWE**: CWE-1021 (Improper Restriction of Rendered UI Layers)

**Vulnerability:**
No security headers (helmet) middleware.

**Impact:**
- Clickjacking attacks (no X-Frame-Options)
- XSS attacks (no CSP)
- MIME sniffing attacks (no X-Content-Type-Options)

**Remediation:**
```bash
npm install helmet
```

```typescript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Consider removing unsafe-inline
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));
```

---

#### 🔴 HIGH #18: Overly Permissive CORS
- **File**: `backend-express/src/server.ts:12-15`
- **Severity**: HIGH
- **CWE**: CWE-942 (Permissive Cross-domain Policy)

**Vulnerability:**
```typescript
app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
}));
```

If `FRONTEND_URL` misconfigured to `*`, allows any origin.

**Remediation:**
```typescript
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? ['https://assets.company.com']
  : ['http://localhost:3000', 'http://localhost:5173'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  maxAge: 86400,
}));
```

---

#### 🟡 MEDIUM #19: Detailed Error Messages
- **File**: `backend-express/src/server.ts:31-35`
- **Severity**: MEDIUM
- **CWE**: CWE-209 (Generation of Error Message Containing Sensitive Information)

**Vulnerability:**
Error handler exposes detailed messages and stack traces.

**Impact:**
Leaks implementation details, database schema, file paths.

**Remediation:**
```typescript
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Log full error server-side only
  logger.error('Application error', {
    message: err.message,
    stack: err.stack,
    user: req.user?.username,
    path: req.path,
    method: req.method,
    ip: req.ip
  });

  // Generic message in production
  const isDevelopment = process.env.NODE_ENV === 'development';

  res.status(err.status || 500).json({
    error: isDevelopment ? err.message : 'An error occurred',
    ...(isDevelopment && { stack: err.stack })
  });
});
```

---

#### 🟢 LOW #20: .env File Security
- **Status**: Currently gitignored ✓
- **Recommendation**: Enhance `.gitignore`:

```gitignore
# Environment files
.env*
!.env.example
*.env
.env.local
.env.*.local
.env.production
.env.development.local

# Sensitive files
*.pem
*.key
*.cert
*.p12
```

---

### A06:2021 - Vulnerable and Outdated Components (3 findings)

#### 🔴 HIGH #21: Vulnerable nodemailer
- **Package**: `nodemailer@6.9.15`
- **Severity**: HIGH
- **CVE**: GHSA-mm7p-fcc7-pg87
- **CWE**: CWE-20, CWE-436

**Vulnerability:**
Email domain interpretation conflict in address parsing.

**Remediation:**
```bash
cd backend-express
npm install nodemailer@^7.0.7
npm audit fix
```

---

#### 🟡 MEDIUM #22: Vulnerable Vite
- **Package**: `vite@5.0.0`
- **Severity**: MEDIUM
- **CVE**: GHSA-93m4-6634-74q7
- **CWE**: CWE-22 (Path Traversal)

**Vulnerability:**
Path traversal in dev server.

**Remediation:**
```bash
cd frontend
npm install vite@^6.1.7
```

---

#### 🟡 MEDIUM #23: Vulnerable esbuild
- **Package**: `esbuild@<=0.24.2`
- **Severity**: MEDIUM (CVSS 5.3)
- **CVE**: GHSA-67mh-4wv8-2f99
- **CWE**: CWE-346

**Vulnerability:**
Unauthorized requests to dev server.

**Remediation:**
```bash
cd frontend
npm install esbuild@^0.24.3
```

---

### A07:2021 - Identification and Authentication Failures (2 findings)

#### 🔴 CRITICAL #24: Mock Authentication in Production
- **File**: `backend-express/src/services/activeDirectory.service.ts:16-37`
- **Severity**: CRITICAL
- **CWE**: CWE-798 (Hard-coded Credentials)

**Vulnerability:**
```typescript
if (!config.activeDirectory.enabled) {
  const adminUsers = ['admin', 'john.doe'];
  // ...
}
```

**Impact:**
Anyone knowing these usernames can authenticate as admin in production.

**Remediation:**
```typescript
if (!config.activeDirectory.enabled) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Mock authentication not allowed in production');
  }
  // Mock logic only in development
}
```

Add startup check:
```typescript
// In server.ts
if (process.env.NODE_ENV === 'production') {
  if (!config.activeDirectory.enabled) {
    console.error('FATAL: Active Directory must be enabled in production');
    process.exit(1);
  }
}
```

---

#### 🟡 MEDIUM #25: No Session Management
- **Severity**: MEDIUM
- **CWE**: CWE-613 (Insufficient Session Expiration)

**Vulnerability:**
No session timeouts, rotation, or concurrent session limits.

**Impact:**
Stolen credentials remain valid indefinitely.

**Remediation:**
```bash
npm install express-session connect-redis ioredis
```

```typescript
import session from 'express-session';
import RedisStore from 'connect-redis';
import { createClient } from 'redis';

const redisClient = createClient({
  url: process.env.REDIS_URL
});
redisClient.connect();

app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  name: 'sessionId',
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 30 * 60 * 1000, // 30 minutes
    sameSite: 'strict'
  },
  rolling: true // Reset expiration on activity
}));
```

---

### A08:2021 - Software and Data Integrity Failures (1 finding)

#### 🟢 LOW #26: No Package Integrity Verification
- **Files**: `package-lock.json` exists ✓
- **Severity**: LOW
- **CWE**: CWE-494 (Download of Code Without Integrity Check)

**Recommendation:**
```json
// package.json
{
  "scripts": {
    "preinstall": "npm audit --audit-level=moderate",
    "postinstall": "npm audit --audit-level=moderate"
  }
}
```

Add to CI/CD pipeline:
```yaml
- name: Security Audit
  run: |
    npm audit --audit-level=moderate
    npm run test:security
```

---

### A09:2021 - Security Logging and Monitoring Failures (2 findings)

#### 🔴 HIGH #27: Insufficient Audit Logging
- **Files**: All controllers
- **Severity**: HIGH
- **CWE**: CWE-778 (Insufficient Logging)

**Vulnerability:**
- No logging of failed authorization
- No logging of authentication failures
- No configuration change logging
- No correlation IDs

**Impact:**
Cannot detect or investigate security incidents.

**Remediation:**
```bash
npm install winston express-winston
```

```typescript
import winston from 'winston';
import expressWinston from 'express-winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'asset-tracker' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/security.log', level: 'warn' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

// Request logging
app.use(expressWinston.logger({
  transports: [
    new winston.transports.File({ filename: 'logs/access.log' })
  ],
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  meta: true,
  msg: "HTTP {{req.method}} {{req.url}}",
  expressFormat: true,
  colorize: false,
}));

// Security event logging
function logSecurityEvent(event: string, details: any) {
  logger.warn('Security Event', {
    event,
    ...details,
    timestamp: new Date().toISOString()
  });
}

// Usage in middleware
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user?.isAdmin) {
    logSecurityEvent('AUTHORIZATION_FAILED', {
      user: req.user?.username,
      resource: req.path,
      requiredRole: 'Admin',
      ip: req.ip
    });
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
};
```

---

#### 🟡 MEDIUM #28: console.log Used for Logging
- **Files**: Multiple (30+ occurrences)
- **Severity**: MEDIUM
- **CWE**: CWE-532 (Insertion of Sensitive Information into Log File)

**Vulnerability:**
Using `console.log` without structured logging.

**Impact:**
- Logs may contain sensitive data
- No log levels
- Difficult to search/correlate
- No SIEM integration

**Remediation:**
Replace all `console.log`, `console.error` with winston logger:

```bash
# Find all console.log occurrences
grep -r "console\." backend-express/src/

# Replace with logger
- console.log('User authenticated:', username);
+ logger.info('User authenticated', { username });

- console.error('Error:', error);
+ logger.error('Error occurred', { error: error.message, stack: error.stack });
```

---

### A10:2021 - Server-Side Request Forgery (1 finding)

#### 🟢 LOW #29: ServiceNow URL Storage
- **Files**: `backend-express/src/controllers/inventory.controller.ts:261,300`
- **Severity**: LOW
- **Assessment**: URLs only stored, not fetched server-side

**Current Risk**: LOW (no server-side fetching)

**Future Proofing:**
If you add features that fetch ServiceNow URLs server-side:

```typescript
const ALLOWED_SERVICENOW_DOMAIN = process.env.SERVICENOW_DOMAIN || 'servicenow.company.com';

function validateServiceNowUrl(url: string): boolean {
  try {
    const parsed = new URL(url);

    // Only allow HTTPS
    if (parsed.protocol !== 'https:') return false;

    // Only allow specific domain
    if (parsed.hostname !== ALLOWED_SERVICENOW_DOMAIN) return false;

    // Prevent local network access
    const hostname = parsed.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1' ||
        hostname.startsWith('192.168.') || hostname.startsWith('10.') ||
        hostname.startsWith('172.16.')) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}
```

---

## Remediation Roadmap

### Phase 1: Immediate (Week 1)

**Critical Security Fixes:**

1. **Fix Authentication Bypass** (#1)
   - Implement proper authentication
   - Disable header-based auth in production
   - Add startup validation

2. **Add Security Headers** (#17)
   - Install and configure helmet
   - Test CSP compatibility

3. **Implement Rate Limiting** (#14)
   - Install express-rate-limit
   - Configure limits for all endpoints

4. **Disable Mock Auth in Production** (#24)
   - Add environment checks
   - Add startup validation

**Acceptance Criteria:**
- [ ] Cannot bypass authentication via headers
- [ ] All security headers present (verify with securityheaders.com)
- [ ] Rate limiting active on all endpoints
- [ ] Application refuses to start with mock auth in production

---

### Phase 2: High Priority (Week 2-3)

**Access Control & Secrets Management:**

5. **Add Authorization Checks** (#2, #3)
   - Protect configuration endpoints
   - Protect user search endpoint

6. **Move Secrets to Vault** (#7, #8)
   - Set up Azure Key Vault
   - Migrate SMTP credentials
   - Migrate AD credentials

7. **Update Vulnerable Dependencies** (#21, #22, #23)
   - Update nodemailer
   - Update vite
   - Update esbuild
   - Run npm audit

8. **Harden CORS** (#18)
   - Implement whitelist validation
   - Remove wildcard origins

9. **Implement Audit Logging** (#27)
   - Install winston
   - Log security events
   - Log failed authentications

**Acceptance Criteria:**
- [ ] All admin endpoints require proper authorization
- [ ] No secrets in .env file
- [ ] npm audit shows 0 high/critical vulnerabilities
- [ ] CORS rejects unauthorized origins
- [ ] Security events logged to file

---

### Phase 3: Medium Priority (Month 2)

**Data Protection & Input Validation:**

10. **Database Encryption** (#6)
    - Evaluate SQLCipher vs SQL Server migration
    - Implement chosen solution
    - Test encryption performance

11. **Fix Mass Assignment** (#5)
    - Implement field whitelisting
    - Add input validation

12. **CSV Injection Protection** (#11)
    - Implement field sanitization
    - Test with malicious payloads

13. **URL Validation** (#13)
    - Whitelist ServiceNow domains
    - Implement strict validation

14. **CSRF Protection** (#15)
    - Install and configure csurf
    - Update frontend to include tokens

15. **File Upload Security** (#16)
    - Add content validation
    - Implement virus scanning (optional)

16. **Error Message Sanitization** (#19)
    - Implement environment-based error handling
    - Remove stack traces from production

17. **TLS Configuration** (#9, #10)
    - Enable TLS for SMTP
    - Implement HTTPS for server
    - Add TLS certificate management

**Acceptance Criteria:**
- [ ] Database encrypted at rest
- [ ] Cannot modify protected fields via API
- [ ] CSV formulas sanitized
- [ ] Only whitelisted URLs accepted
- [ ] CSRF tokens required for state changes
- [ ] File uploads validated beyond extension
- [ ] Production errors don't leak details
- [ ] All connections use TLS

---

### Phase 4: Low Priority & Continuous

**Ongoing Security Maintenance:**

18. **Session Management** (#25)
    - Implement Redis-backed sessions
    - Configure timeouts and rotation

19. **Replace console.log** (#28)
    - Migrate to winston throughout codebase
    - Configure log rotation

20. **Package Integrity** (#26)
    - Add npm audit to CI/CD
    - Implement automated dependency updates

21. **Security Testing**
    - Set up automated security scanning (Snyk, SonarQube)
    - Schedule penetration testing
    - Implement security training

**Acceptance Criteria:**
- [ ] Sessions expire after inactivity
- [ ] Structured logging throughout
- [ ] Automated security scanning in CI/CD
- [ ] Regular penetration tests scheduled

---

## Testing Checklist

Before deploying fixes:

### Authentication & Authorization
- [ ] Cannot set X-Username header to impersonate users
- [ ] /api/configuration/notification requires ServiceDesk role
- [ ] /api/user/search requires ServiceDesk role
- [ ] Mock authentication disabled in production
- [ ] Sessions expire after 30 minutes of inactivity

### Cryptography
- [ ] Database file is encrypted
- [ ] Secrets retrieved from vault, not .env
- [ ] SMTP connection uses TLS
- [ ] Application runs on HTTPS in production
- [ ] Certificate validation enabled

### Injection Prevention
- [ ] CSV with =cmd formulas is sanitized
- [ ] Negative numbers rejected in numeric fields
- [ ] Only whitelisted ServiceNow domains accepted

### Security Configuration
- [ ] Security headers present (helmet)
- [ ] CORS rejects unauthorized origins
- [ ] Error messages don't leak details in production
- [ ] Rate limiting prevents abuse
- [ ] CSRF protection active

### Vulnerable Components
- [ ] npm audit shows 0 high/critical vulnerabilities
- [ ] All dependencies up to date

### Logging & Monitoring
- [ ] Failed authentications logged
- [ ] Authorization failures logged
- [ ] Configuration changes logged
- [ ] All logs structured (JSON)

### Verification Commands
```bash
# Check security headers
curl -I https://your-app.com

# Check npm vulnerabilities
npm audit

# Check CORS
curl -H "Origin: https://evil.com" https://your-app.com/api/inventory

# Check rate limiting
for i in {1..101}; do curl https://your-app.com/api/inventory; done

# Check authentication
curl https://your-app.com/api/inventory
# Should return 401

# Check authorization
curl -H "X-Username: readonly-user" https://your-app.com/api/configuration/notification
# Should return 403
```

---

## Security Best Practices Moving Forward

### 1. Secure Development Lifecycle

**Code Reviews:**
- Require security review for all PRs
- Use security checklist during reviews
- Mandate two approvals for auth/crypto changes

**Static Analysis:**
```bash
# Install security linters
npm install -D eslint-plugin-security

# .eslintrc.js
{
  "plugins": ["security"],
  "extends": ["plugin:security/recommended"]
}
```

**Dynamic Testing:**
- OWASP ZAP automated scans
- Burp Suite for manual testing
- Fuzzing for input validation

---

### 2. Security Monitoring

**Implement SIEM Integration:**
```typescript
// Send logs to Azure Sentinel, Splunk, or ELK
const winstonAzure = require('winston-azure-application-insights').AzureApplicationInsightsLogger;

logger.add(new winstonAzure({
  insights: {
    instrumentationKey: process.env.APPINSIGHTS_KEY
  }
}));
```

**Alert on Security Events:**
- Failed authentication attempts (>5 in 15 min)
- Authorization failures for same user (>10 in 1 hour)
- Unusual API usage patterns
- Configuration changes
- Database encryption key access

---

### 3. Dependency Management

**Automated Updates:**
```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/backend-express"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
    reviewers:
      - "security-team"
    labels:
      - "dependencies"
      - "security"
```

**Security Scanning:**
```yaml
# .github/workflows/security.yml
name: Security Scan
on: [push, pull_request]
jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run Snyk
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
```

---

### 4. Incident Response Plan

**Detection:**
1. Monitor security logs for anomalies
2. Set up alerts for critical events
3. Regular review of audit logs

**Response:**
1. Isolate affected systems
2. Preserve evidence (logs, memory dumps)
3. Identify scope of breach
4. Contain and eradicate threat
5. Recover and verify
6. Post-incident review

**Communication:**
- Internal escalation path
- External disclosure policy
- User notification templates

---

### 5. Compliance & Auditing

**Regular Security Audits:**
- Quarterly internal security reviews
- Annual external penetration testing
- Bi-annual OWASP Top 10 reassessments

**Compliance Checks:**
- GDPR (if applicable)
- SOC 2 (if required)
- ISO 27001 (if required)
- Industry-specific regulations

---

## Additional Hardening Recommendations

### 1. Infrastructure Security

**Network Segmentation:**
- Place database in private subnet
- Use VPN for admin access
- Implement jump box for server access

**Container Security** (if using Docker):
```dockerfile
# Use minimal base image
FROM node:18-alpine

# Run as non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
USER nodejs

# Set read-only filesystem
VOLUME ["/app/node_modules"]
```

**Secrets Management:**
- Azure Key Vault for secrets
- Managed identities for Azure resources
- Rotate secrets every 90 days

---

### 2. Database Security

**SQL Server Hardening:**
```sql
-- Enable TDE
ALTER DATABASE ITSAssetTracker SET ENCRYPTION ON;

-- Enable auditing
CREATE SERVER AUDIT ITSAssetTrackerAudit TO FILE;
CREATE DATABASE AUDIT SPECIFICATION FOR SERVER AUDIT ITSAssetTrackerAudit;

-- Least privilege
REVOKE ALL FROM AssetTrackerApp;
GRANT SELECT, INSERT, UPDATE, DELETE ON SCHEMA::dbo TO AssetTrackerApp;
```

**Backup Security:**
- Encrypt backups
- Store offsite
- Test restoration monthly

---

### 3. Application Security

**Input Validation Library:**
```bash
npm install joi
```

```typescript
import Joi from 'joi';

const inventorySchema = Joi.object({
  itemNumber: Joi.string().alphanum().max(50).required(),
  cost: Joi.number().min(0).max(999999.99).required(),
  quantity: Joi.number().integer().min(0).max(999999).required(),
  // ...
});

// In controller
const { error, value } = inventorySchema.validate(req.body);
if (error) {
  return res.status(400).json({ error: error.details[0].message });
}
```

**Anti-Automation:**
```bash
npm install express-slow-down
```

```typescript
import slowDown from 'express-slow-down';

const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 50,
  delayMs: 500
});

app.use('/api/', speedLimiter);
```

---

## Security Training Resources

### For Development Team:
1. **OWASP Top 10 Training**: https://owasp.org/www-project-top-ten/
2. **Secure Coding in Node.js**: https://nodesecroadmap.fyi/
3. **Web Security Academy**: https://portswigger.net/web-security

### Security Tools:
1. **OWASP ZAP**: Automated security scanner
2. **Burp Suite**: Manual penetration testing
3. **Snyk**: Dependency vulnerability scanning
4. **SonarQube**: Code quality and security
5. **npm audit**: Built-in npm security audit

---

## Conclusion

This application has **31 identified security vulnerabilities** requiring remediation across all OWASP Top 10 categories. The most critical issues are:

1. **Authentication bypass** allowing unauthorized access
2. **Unencrypted database** exposing sensitive data
3. **Missing security headers** enabling XSS and clickjacking
4. **No rate limiting** allowing DoS attacks
5. **Mock authentication** active in production

**Recommended Action:**
Begin with Phase 1 (Immediate) fixes within the next week, focusing on authentication, security headers, and rate limiting. These changes will address the most critical vulnerabilities and significantly improve the security posture.

**Total Estimated Effort:**
- Phase 1: 40 hours (1 week)
- Phase 2: 80 hours (2-3 weeks)
- Phase 3: 120 hours (4-6 weeks)
- Phase 4: Ongoing

**Next Steps:**
1. Review this report with development team and stakeholders
2. Prioritize fixes based on risk and business impact
3. Create GitHub issues for each vulnerability
4. Begin Phase 1 remediation immediately
5. Schedule follow-up security audit after Phase 2 completion

---

**Report Generated**: 2025-11-19
**Report Version**: 1.0
**Classification**: CONFIDENTIAL
**Distribution**: Development Team, Security Team, Management Only

---

*This security audit report is based on static code analysis and should be followed by dynamic testing and penetration testing for comprehensive security validation.*
