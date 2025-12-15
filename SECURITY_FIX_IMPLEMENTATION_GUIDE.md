# Security Fix Implementation Guide

**Status**: 🔴 CRITICAL FIXES REQUIRED
**Estimated Time**: 40 hours (1 week)
**Priority**: IMMEDIATE

This guide provides step-by-step instructions to fix the critical security vulnerabilities identified in the OWASP audit.

[[_TOC_]]

---

## Prerequisites

Before starting, ensure you have:
- [ ] Backup of current codebase
- [ ] Access to development environment
- [ ] Access to production environment configuration
- [ ] Approval to make security changes
- [ ] Testing environment ready

---

## Phase 1: Critical Security Fixes (Week 1)

### Fix #1: Authentication Bypass (CRITICAL)

**Estimated Time**: 8 hours

#### Step 1: Install Required Dependencies

```bash
cd backend-express
npm install helmet@^7.1.0 express-rate-limit@^7.1.5
```

#### Step 2: Create Environment Check

Create new file `backend-express/src/utils/security-checks.ts`:

```typescript
import { config } from '../config';

export function validateProductionSecurity(): void {
  const errors: string[] = [];

  // Check 1: Active Directory must be enabled in production
  if (process.env.NODE_ENV === 'production' && !config.activeDirectory.enabled) {
    errors.push('Active Directory must be enabled in production (AD_ENABLED=true)');
  }

  // Check 2: ALLOWED_ORIGINS must be configured
  if (process.env.NODE_ENV === 'production') {
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean);
    if (allowedOrigins.length === 0) {
      errors.push('ALLOWED_ORIGINS environment variable must be set in production');
    }
    if (allowedOrigins.some(origin => origin.includes('localhost'))) {
      errors.push('ALLOWED_ORIGINS cannot include localhost in production');
    }
  }

  // Check 3: Database encryption key must be set (for future DB encryption)
  if (process.env.NODE_ENV === 'production' && !process.env.DB_ENCRYPTION_KEY) {
    errors.push('DB_ENCRYPTION_KEY must be set in production');
  }

  // Check 4: Session secret must be strong
  if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET) {
    errors.push('SESSION_SECRET must be set in production');
  }

  // If any errors, log and exit
  if (errors.length > 0) {
    console.error('\n╔════════════════════════════════════════════════════════════════╗');
    console.error('║  FATAL: Production Security Validation Failed                 ║');
    console.error('╚════════════════════════════════════════════════════════════════╝\n');
    errors.forEach((error, i) => {
      console.error(`${i + 1}. ${error}`);
    });
    console.error('\nApplication startup aborted for security reasons.\n');
    process.exit(1);
  }

  console.log('✓ Production security checks passed');
}
```

#### Step 3: Update Authentication Middleware

Replace `backend-express/src/middleware/auth.middleware.ts` with:

```typescript
import { Request, Response, NextFunction } from 'express';
import { activeDirectoryService } from '../services/activeDirectory.service';
import { config } from '../config';

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
 */
export const authenticateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // CRITICAL: Prevent production without proper auth
    if (process.env.NODE_ENV === 'production' && !config.activeDirectory.enabled) {
      return res.status(500).json({ error: 'Authentication service unavailable' });
    }

    let username: string | null = null;

    // Development Mode - Require explicit header (no fallback)
    if (process.env.NODE_ENV === 'development') {
      username = req.headers['x-username'] as string;

      if (!username || username.trim() === '') {
        return res.status(401).json({
          error: 'Development mode requires X-Username header'
        });
      }

      // Validate username format
      if (!/^[a-zA-Z0-9._-]+$/.test(username)) {
        return res.status(401).json({ error: 'Invalid username format' });
      }
    }
    // Production Mode - Windows Auth or JWT
    else {
      username = req.headers['x-iisnode-auth_user'] as string ||
                 req.headers['remote-user'] as string;

      if (!username) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
    }

    // Check roles
    const isAdmin = activeDirectoryService.isUserInGroup(username, config.activeDirectory.adminGroup);
    const isServiceDesk = activeDirectoryService.isUserInGroup(username, config.activeDirectory.serviceDeskGroup);
    const isReadOnly = activeDirectoryService.isUserInGroup(username, config.activeDirectory.readOnlyGroup);

    req.user = { username, isAdmin, isServiceDesk, isReadOnly };
    next();
  } catch (error: any) {
    console.error('Authentication error:', error);
    return res.status(500).json({ error: 'Authentication service error' });
  }
};

export const requireAdGroups = (allowedGroups: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      console.warn('Authorization failed: No user', { path: req.path, ip: req.ip });
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const isAuthorized = allowedGroups.some(groupName =>
      activeDirectoryService.isUserInGroup(req.user!.username, groupName)
    );

    if (!isAuthorized) {
      console.warn('Authorization failed', {
        username: req.user.username,
        requiredGroups: allowedGroups,
        path: req.path,
        ip: req.ip
      });
      return res.status(403).json({ error: 'Forbidden' });
    }

    next();
  };
};

export const requireAdmin = requireAdGroups([config.activeDirectory.adminGroup]);
export const requireServiceDesk = requireAdGroups([
  config.activeDirectory.adminGroup,
  config.activeDirectory.serviceDeskGroup,
]);
```

#### Step 4: Update Server Configuration

Replace `backend-express/src/server.ts` with:

```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { validateProductionSecurity } from './utils/security-checks';
import inventoryRoutes from './routes/inventory.routes';
import userRoutes from './routes/user.routes';
import configurationRoutes from './routes/configuration.routes';
import csvUploadRoutes from './routes/csvUpload.routes';

const app = express();

// Run security checks before starting
if (process.env.NODE_ENV === 'production') {
  validateProductionSecurity();
}

// 1. Security Headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  frameguard: { action: 'deny' },
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  hidePoweredBy: true,
}));

// 2. CORS
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? (process.env.ALLOWED_ORIGINS || '').split(',').map(o => o.trim())
  : ['http://localhost:3000', 'http://localhost:5173'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
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

// 3. Rate Limiting
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
  message: 'Too many uploads, please try again later.',
});

app.use('/api/', apiLimiter);
app.use('/api/csvupload', uploadLimiter);

// 4. Body Parsers
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// 5. Routes
app.use('/api/inventory', inventoryRoutes);
app.use('/api/user', userRoutes);
app.use('/api/configuration', configurationRoutes);
app.use('/api/csvupload', csvUploadRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', {
    message: err.message,
    path: req.path,
    user: req.user?.username
  });

  const isDev = process.env.NODE_ENV === 'development';
  res.status(err.status || 500).json({
    error: isDev ? err.message : 'An error occurred',
    ...(isDev && { stack: err.stack })
  });
});

// Start server
app.listen(config.port, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║  ITS Asset Tracker API Server                                  ║
╠════════════════════════════════════════════════════════════════╣
║  Status: Running                                               ║
║  Port: ${config.port.toString().padEnd(52)}║
║  Environment: ${config.nodeEnv.padEnd(47)}║
║  Security Headers: ✓ Enabled                                   ║
║  Rate Limiting: ✓ Enabled                                      ║
║  CORS Origins: ${allowedOrigins[0]?.substring(0, 40).padEnd(42)}║
╚════════════════════════════════════════════════════════════════╝
  `);
});

export default app;
```

#### Step 5: Update Configuration Routes

Edit `backend-express/src/routes/configuration.routes.ts`:

```typescript
import { Router } from 'express';
import { configurationController } from '../controllers/configuration.controller';
import { authenticateUser, requireServiceDesk } from '../middleware/auth.middleware';

const router = Router();

// Apply authentication to all routes
router.use(authenticateUser);

// FIXED: Require ServiceDesk role for reading configuration
router.get('/notification', requireServiceDesk, configurationController.getNotificationConfig);
router.put('/notification', requireServiceDesk, configurationController.updateNotificationConfig);

export default router;
```

#### Step 6: Update User Routes

Edit `backend-express/src/routes/user.routes.ts`:

```typescript
import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { authenticateUser, requireServiceDesk } from '../middleware/auth.middleware';

const router = Router();

// Apply authentication to all routes
router.use(authenticateUser);

router.get('/me', userController.getCurrentUser);

// FIXED: Require ServiceDesk role for user search
router.get('/search', requireServiceDesk, userController.searchUsers);

export default router;
```

#### Step 7: Update Environment Variables

Update `backend-express/.env`:

```env
# Server Configuration
PORT=5002
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Production CORS (comma-separated)
ALLOWED_ORIGINS=https://assets.company.com,https://assets.yourcompany.com

# Database
DATABASE_URL="file:./assettracker.db"
DB_ENCRYPTION_KEY=  # TODO: Generate secure key for production

# Email Configuration
SMTP_HOST=smtp.company.com
SMTP_PORT=587
SMTP_USERNAME=
SMTP_PASSWORD=
SMTP_FROM_ADDRESS=noreply@company.com
SMTP_FROM_NAME=ITS Asset Tracker
SMTP_ENABLE_SSL=true

# Active Directory Configuration
AD_ENABLED=false  # Set to true in production
AD_DOMAIN=company.local
AD_LDAP_SERVER=ldap://dc.company.local:389
AD_LDAP_PORT=389
AD_USE_SSL=false
AD_SEARCH_BASE=DC=company,DC=local
AD_ADMIN_GROUP=ITS-AssetTracker-Admins
AD_SERVICE_DESK_GROUP=ITS-ServiceDesk
AD_READ_ONLY_GROUP=ITS-AssetTracker-ReadOnly
AD_BIND_USERNAME=
AD_BIND_PASSWORD=

# Security
SESSION_SECRET=  # TODO: Generate strong random secret

# App Settings
BASE_URL=http://localhost:3000
```

#### Step 8: Create Production Environment Template

Create `backend-express/.env.production.example`:

```env
# Production Environment Configuration

# Server Configuration
PORT=5002
NODE_ENV=production
FRONTEND_URL=https://assets.company.com

# Production CORS (comma-separated, no spaces)
ALLOWED_ORIGINS=https://assets.company.com

# Database
DATABASE_URL="file:./assettracker.db"
DB_ENCRYPTION_KEY=CHANGE_THIS_TO_32_CHAR_RANDOM_STRING

# Email Configuration - Use Azure Key Vault or AWS Secrets Manager
SMTP_HOST=smtp.company.com
SMTP_PORT=587
SMTP_USERNAME=  # Retrieve from vault
SMTP_PASSWORD=  # Retrieve from vault
SMTP_FROM_ADDRESS=noreply@company.com
SMTP_FROM_NAME=ITS Asset Tracker
SMTP_ENABLE_SSL=true

# Active Directory Configuration - REQUIRED in production
AD_ENABLED=true
AD_DOMAIN=company.local
AD_LDAP_SERVER=ldap://dc.company.local:389
AD_LDAP_PORT=389
AD_USE_SSL=true
AD_SEARCH_BASE=DC=company,DC=local
AD_ADMIN_GROUP=ITS-AssetTracker-Admins
AD_SERVICE_DESK_GROUP=ITS-ServiceDesk
AD_READ_ONLY_GROUP=ITS-AssetTracker-ReadOnly
AD_BIND_USERNAME=  # Retrieve from vault
AD_BIND_PASSWORD=  # Retrieve from vault

# Security
SESSION_SECRET=CHANGE_THIS_TO_64_CHAR_RANDOM_STRING

# App Settings
BASE_URL=https://assets.company.com
```

#### Step 9: Testing Authentication Fix

Create test file `backend-express/tests/auth.test.sh`:

```bash
#!/bin/bash

echo "=== Testing Authentication Security Fixes ==="
echo ""

BASE_URL="http://localhost:5002"

echo "Test 1: Request without X-Username header (should fail)"
curl -s -o /dev/null -w "HTTP %{http_code}\n" $BASE_URL/api/inventory
echo "Expected: HTTP 401"
echo ""

echo "Test 2: Request with empty X-Username (should fail)"
curl -s -o /dev/null -w "HTTP %{http_code}\n" -H "X-Username: " $BASE_URL/api/inventory
echo "Expected: HTTP 401"
echo ""

echo "Test 3: Request with invalid characters (should fail)"
curl -s -o /dev/null -w "HTTP %{http_code}\n" -H "X-Username: admin<script>" $BASE_URL/api/inventory
echo "Expected: HTTP 401"
echo ""

echo "Test 4: Valid request with X-Username (should succeed in dev)"
curl -s -o /dev/null -w "HTTP %{http_code}\n" -H "X-Username: admin" $BASE_URL/api/inventory
echo "Expected: HTTP 200"
echo ""

echo "Test 5: Unauthorized user accessing admin endpoint (should fail)"
curl -s -o /dev/null -w "HTTP %{http_code}\n" \
  -H "X-Username: regular-user" \
  $BASE_URL/api/configuration/notification
echo "Expected: HTTP 403"
echo ""

echo "Test 6: Rate limiting test (101 requests)"
for i in {1..101}; do
  response=$(curl -s -o /dev/null -w "%{http_code}" -H "X-Username: admin" $BASE_URL/api/inventory)
  if [ "$response" == "429" ]; then
    echo "Rate limit triggered at request #$i (HTTP 429)"
    break
  fi
done
echo ""

echo "Test 7: Security headers check"
curl -I -s -H "X-Username: admin" $BASE_URL/api/inventory | grep -E "(X-Frame-Options|X-Content-Type-Options|Strict-Transport-Security|X-XSS-Protection|Content-Security-Policy)"
echo ""

echo "=== Testing Complete ==="
```

Make it executable:
```bash
chmod +x backend-express/tests/auth.test.sh
```

#### Step 10: Verification Checklist

Run through this checklist:

```bash
# 1. Install dependencies
cd backend-express
npm install

# 2. Run tests
./tests/auth.test.sh

# 3. Check security headers
curl -I http://localhost:5002/api/inventory

# 4. Verify rate limiting
# Make 101 requests rapidly - should see 429 error

# 5. Test authentication bypass prevention
curl -H "X-Username: hacker" http://localhost:5002/api/inventory
# Should return data (but logged)

curl http://localhost:5002/api/inventory
# Should return 401 Unauthorized

# 6. Test authorization
curl -H "X-Username: readonly-user" http://localhost:5002/api/configuration/notification
# Should return 403 Forbidden
```

---

### Fix #2: Vulnerable Dependencies (HIGH)

**Estimated Time**: 2 hours

#### Step 1: Update Package Dependencies

```bash
cd backend-express

# Update nodemailer
npm install nodemailer@^7.0.7

# Update other vulnerable packages
npm audit fix --force

# Check for remaining vulnerabilities
npm audit
```

#### Step 2: Frontend Dependencies

```bash
cd ../frontend

# Update Vite
npm install vite@^6.1.7

# Update esbuild
npm install esbuild@^0.24.3

# Update all dependencies
npm update

# Check vulnerabilities
npm audit
```

#### Step 3: Verify Updates

```bash
# Backend
cd backend-express
npm list nodemailer
# Should show nodemailer@7.0.7 or higher

# Frontend
cd ../frontend
npm list vite esbuild
# Should show vite@6.1.7+ and esbuild@0.24.3+
```

---

### Fix #3: CSV Injection Protection (MEDIUM)

**Estimated Time**: 4 hours

#### Step 1: Create CSV Sanitizer

Create `backend-express/src/utils/csv-sanitizer.ts`:

```typescript
/**
 * Sanitize CSV field to prevent formula injection
 * Excel/Google Sheets interpret cells starting with =, +, -, @ as formulas
 */
export function sanitizeCsvField(field: any): string {
  if (field === null || field === undefined) {
    return '';
  }

  const value = String(field);

  // List of dangerous characters that start formulas
  const dangerousChars = ['=', '+', '-', '@', '\t', '\r', '\n'];

  // Check if field starts with dangerous character
  if (dangerousChars.some(char => value.startsWith(char))) {
    // Prefix with single quote to treat as text
    return `'${value}`;
  }

  // Also escape any existing single quotes
  return value.replace(/'/g, "''");
}

/**
 * Sanitize all fields in a CSV row object
 */
export function sanitizeCsvRow<T extends Record<string, any>>(row: T): T {
  const sanitized = {} as T;

  for (const [key, value] of Object.entries(row)) {
    sanitized[key as keyof T] = sanitizeCsvField(value) as any;
  }

  return sanitized;
}

/**
 * Validate numeric field with bounds checking
 */
export function parseNumericField(
  value: string | number,
  fieldName: string,
  min: number,
  max: number
): number {
  const parsed = typeof value === 'number' ? value : parseFloat(value);

  if (isNaN(parsed)) {
    throw new Error(`${fieldName} must be a valid number`);
  }

  if (parsed < min || parsed > max) {
    throw new Error(`${fieldName} must be between ${min} and ${max}`);
  }

  return parsed;
}

/**
 * Validate integer field with bounds checking
 */
export function parseIntegerField(
  value: string | number,
  fieldName: string,
  min: number,
  max: number
): number {
  const parsed = typeof value === 'number' ? value : parseInt(value, 10);

  if (isNaN(parsed) || !Number.isInteger(parsed)) {
    throw new Error(`${fieldName} must be a valid integer`);
  }

  if (parsed < min || parsed > max) {
    throw new Error(`${fieldName} must be between ${min} and ${max}`);
  }

  return parsed;
}
```

#### Step 2: Update CSV Processing Service

Edit `backend-express/src/services/csvProcessing.service.ts`:

```typescript
import { parse } from 'csv-parse/sync';
import { prisma } from '../config/prisma';
import { emailService } from './email.service';
import {
  sanitizeCsvField,
  parseNumericField,
  parseIntegerField
} from '../utils/csv-sanitizer';

// ... existing code ...

async processCsvUpload(csvBuffer: Buffer, uploadedBy: string): Promise<CsvUploadResult> {
  // ... existing parse code ...

  for (const row of records) {
    try {
      // SECURITY: Sanitize all fields to prevent CSV injection
      const itemNumber = sanitizeCsvField(row.ItemNumber);
      const assetType = sanitizeCsvField(row.AssetType);
      const description = sanitizeCsvField(row.Description);
      const category = row.Category ? sanitizeCsvField(row.Category) : null;

      // SECURITY: Validate numeric fields with bounds
      const cost = parseNumericField(row.Cost, 'Cost', 0, 999999.99);
      const minimumThreshold = parseIntegerField(row.MinimumThreshold, 'MinimumThreshold', 0, 999999);
      const reorderAmount = parseIntegerField(row.ReorderAmount, 'ReorderAmount', 0, 999999);
      const currentQuantity = parseIntegerField(row.CurrentQuantity, 'CurrentQuantity', 0, 999999);

      // Validate required fields
      if (!itemNumber || !assetType || !description) {
        errors.push({
          row: records.indexOf(row) + 1,
          error: 'Missing required fields (ItemNumber, AssetType, or Description)'
        });
        failureCount++;
        continue;
      }

      // Validate asset type
      if (!['Hardware', 'Software'].includes(assetType)) {
        errors.push({
          row: records.indexOf(row) + 1,
          error: 'AssetType must be either "Hardware" or "Software"'
        });
        failureCount++;
        continue;
      }

      // Rest of processing...
    } catch (error: any) {
      errors.push({
        row: records.indexOf(row) + 1,
        error: error.message
      });
      failureCount++;
    }
  }

  // ... rest of code ...
}
```

#### Step 3: Test CSV Injection Protection

Create test file `backend-express/tests/csv-injection-test.csv`:

```csv
ItemNumber,AssetType,Description,Category,Cost,MinimumThreshold,ReorderAmount,CurrentQuantity
=cmd|'/c calc'!A1,Hardware,Malicious Formula 1,Laptop,1000,5,10,15
+2+3,Hardware,Malicious Formula 2,Desktop,800,3,5,10
-1-1,Software,Malicious Formula 3,License,500,10,20,50
@SUM(1+1),Hardware,Malicious Formula 4,Monitor,300,5,10,20
NORMAL-001,Hardware,Normal Item,Laptop,1200,5,10,15
```

Test script `backend-express/tests/test-csv-injection.ts`:

```typescript
import { sanitizeCsvField } from '../src/utils/csv-sanitizer';

console.log('Testing CSV Injection Protection...\n');

const testCases = [
  { input: '=cmd|"/c calc"!A1', expected: "'=cmd|'/c calc'!A1" },
  { input: '+2+3', expected: "'+2+3" },
  { input: '-1-1', expected: "'-1-1" },
  { input: '@SUM(1+1)', expected: "'@SUM(1+1)" },
  { input: 'Normal text', expected: 'Normal text' },
  { input: "O'Brien", expected: "O''Brien" },
];

testCases.forEach(({ input, expected }) => {
  const result = sanitizeCsvField(input);
  const passed = result === expected;
  console.log(`${passed ? '✓' : '✗'} Input: "${input}"`);
  console.log(`  Expected: "${expected}"`);
  console.log(`  Got:      "${result}"`);
  console.log('');
});
```

---

### Fix #4: Mass Assignment Vulnerability (MEDIUM)

**Estimated Time**: 3 hours

#### Step 1: Create Input Validation Schemas

Create `backend-express/src/validation/inventory.schema.ts`:

```typescript
/**
 * Whitelist of fields allowed for inventory updates
 */
export const ALLOWED_INVENTORY_UPDATE_FIELDS = [
  'assetType',
  'description',
  'category',
  'cost',
  'minimumThreshold',
  'reorderAmount',
  'currentQuantity'
] as const;

export type AllowedInventoryUpdateField = typeof ALLOWED_INVENTORY_UPDATE_FIELDS[number];

/**
 * Validate and sanitize inventory update request
 */
export function validateInventoryUpdate(body: any): {
  valid: boolean;
  data?: Partial<Record<AllowedInventoryUpdateField, any>>;
  errors?: string[];
} {
  const errors: string[] = [];
  const data: any = {};

  // Check for unexpected fields
  const bodyKeys = Object.keys(body);
  const unexpectedFields = bodyKeys.filter(
    key => !ALLOWED_INVENTORY_UPDATE_FIELDS.includes(key as any)
  );

  if (unexpectedFields.length > 0) {
    errors.push(`Unexpected fields: ${unexpectedFields.join(', ')}`);
  }

  // Validate each allowed field
  if (body.assetType !== undefined) {
    if (!['Hardware', 'Software'].includes(body.assetType)) {
      errors.push('assetType must be "Hardware" or "Software"');
    } else {
      data.assetType = body.assetType;
    }
  }

  if (body.description !== undefined) {
    if (typeof body.description !== 'string' || body.description.trim() === '') {
      errors.push('description must be a non-empty string');
    } else {
      data.description = body.description.trim();
    }
  }

  if (body.category !== undefined) {
    if (body.category !== null && typeof body.category !== 'string') {
      errors.push('category must be a string or null');
    } else {
      data.category = body.category?.trim() || null;
    }
  }

  if (body.cost !== undefined) {
    const cost = parseFloat(body.cost);
    if (isNaN(cost) || cost < 0 || cost > 999999.99) {
      errors.push('cost must be between 0 and 999999.99');
    } else {
      data.cost = cost;
    }
  }

  if (body.minimumThreshold !== undefined) {
    const threshold = parseInt(body.minimumThreshold, 10);
    if (isNaN(threshold) || threshold < 0 || threshold > 999999) {
      errors.push('minimumThreshold must be between 0 and 999999');
    } else {
      data.minimumThreshold = threshold;
    }
  }

  if (body.reorderAmount !== undefined) {
    const amount = parseInt(body.reorderAmount, 10);
    if (isNaN(amount) || amount < 0 || amount > 999999) {
      errors.push('reorderAmount must be between 0 and 999999');
    } else {
      data.reorderAmount = amount;
    }
  }

  if (body.currentQuantity !== undefined) {
    const quantity = parseInt(body.currentQuantity, 10);
    if (isNaN(quantity) || quantity < 0 || quantity > 999999) {
      errors.push('currentQuantity must be between 0 and 999999');
    } else {
      data.currentQuantity = quantity;
    }
  }

  return {
    valid: errors.length === 0,
    data: errors.length === 0 ? data : undefined,
    errors: errors.length > 0 ? errors : undefined
  };
}
```

#### Step 2: Update Inventory Controller

Edit `backend-express/src/controllers/inventory.controller.ts`:

Find the `update` method and replace it:

```typescript
import { validateInventoryUpdate } from '../validation/inventory.schema';

// In the InventoryController class:

async update(req: Request, res: Response) {
  try {
    const { id } = req.params;

    // SECURITY: Validate and whitelist fields
    const validation = validateInventoryUpdate(req.body);

    if (!validation.valid) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.errors
      });
    }

    const updateData = {
      ...validation.data,
      lastModifiedBy: req.user?.username || 'System',
      lastModifiedDate: new Date(),
    };

    const updatedItem = await prisma.inventory.update({
      where: { id: parseInt(id, 10) },
      data: updateData,
    });

    console.log('Inventory item updated', {
      id: updatedItem.id,
      itemNumber: updatedItem.itemNumber,
      updatedBy: req.user?.username,
      fields: Object.keys(validation.data!)
    });

    res.json(updatedItem);
  } catch (error: any) {
    console.error('Error updating inventory item:', error);
    res.status(500).json({ error: 'Failed to update inventory item' });
  }
}
```

---

### Fix #5: ServiceNow URL Validation (MEDIUM)

**Estimated Time**: 2 hours

#### Step 1: Create URL Validator

Create `backend-express/src/utils/url-validator.ts`:

```typescript
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
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('172.16.') ||
      hostname.startsWith('172.17.') ||
      hostname.startsWith('172.18.') ||
      hostname.startsWith('172.19.') ||
      hostname.startsWith('172.20.') ||
      hostname.startsWith('172.21.') ||
      hostname.startsWith('172.22.') ||
      hostname.startsWith('172.23.') ||
      hostname.startsWith('172.24.') ||
      hostname.startsWith('172.25.') ||
      hostname.startsWith('172.26.') ||
      hostname.startsWith('172.27.') ||
      hostname.startsWith('172.28.') ||
      hostname.startsWith('172.29.') ||
      hostname.startsWith('172.30.') ||
      hostname.startsWith('172.31.')
    ) {
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
```

#### Step 2: Update Inventory Controller

In `backend-express/src/controllers/inventory.controller.ts`:

```typescript
import { validateServiceNowUrl } from '../utils/url-validator';

// In updateQuantity method:
async updateQuantity(req: Request, res: Response) {
  try {
    const { itemNumber, quantityChange, serviceNowTicketUrl, assignedToUser } = req.body;

    // Validate ServiceNow URL if provided
    if (serviceNowTicketUrl) {
      const urlValidation = validateServiceNowUrl(serviceNowTicketUrl);
      if (!urlValidation.valid) {
        return res.status(400).json({
          error: 'Invalid ServiceNow ticket URL',
          details: urlValidation.error
        });
      }
    }

    // Rest of the logic...
  }
}
```

#### Step 3: Update Frontend Validation

Edit `frontend/src/pages/InventoryList.tsx`:

```typescript
// Add ServiceNow domain validation
const SERVICENOW_DOMAINS = [
  'servicenow.company.com',
  'company.service-now.com'
];

function isValidServiceNowUrl(url: string): boolean {
  if (!url || url.trim() === '') return true;

  try {
    const parsed = new URL(url);

    if (parsed.protocol !== 'https:') {
      return false;
    }

    return SERVICENOW_DOMAINS.some(domain => parsed.hostname === domain);
  } catch {
    return false;
  }
}

// In handleUpdate function, update validation:
const invalidUrls = assignments.filter(a =>
  a.ticketUrl && !isValidServiceNowUrl(a.ticketUrl)
);

if (invalidUrls.length > 0) {
  alert(`Invalid ServiceNow ticket URLs. Must be HTTPS from: ${SERVICENOW_DOMAINS.join(', ')}`);
  return;
}
```

#### Step 4: Add Environment Variable

Update `backend-express/.env`:

```env
# ServiceNow Configuration
SERVICENOW_DOMAINS=servicenow.company.com,company.service-now.com
```

---

## Testing Checklist

After implementing all fixes, run through this checklist:

### Security Testing

```bash
# 1. Authentication Tests
./backend-express/tests/auth.test.sh

# 2. Check security headers
curl -I http://localhost:5002/api/inventory

# 3. Test rate limiting
for i in {1..101}; do curl -s -H "X-Username: admin" http://localhost:5002/api/inventory > /dev/null; done
# Should see 429 after 100 requests

# 4. Test CORS
curl -H "Origin: https://evil.com" http://localhost:5002/api/inventory
# Should be rejected

# 5. Test CSV injection protection
# Upload the test CSV file and verify formulas are escaped

# 6. Test mass assignment
curl -X PUT http://localhost:5002/api/inventory/1 \
  -H "Content-Type: application/json" \
  -H "X-Username: admin" \
  -d '{"id": 999, "itemNumber": "HACKED", "description": "Test"}'
# Should reject 'id' and 'itemNumber' fields

# 7. Test URL validation
curl -X POST http://localhost:5002/api/inventory/update-quantity \
  -H "Content-Type: application/json" \
  -H "X-Username: admin" \
  -d '{"itemNumber":"HW-001","quantityChange":-1,"serviceNowTicketUrl":"http://evil.com"}'
# Should reject non-HTTPS and non-whitelisted domains
```

### Functional Testing

- [ ] Can still log in to the application
- [ ] Can view inventory list
- [ ] Can assign assets
- [ ] Can upload CSV files
- [ ] Audit history is recorded
- [ ] Email notifications work
- [ ] All user roles work correctly (Admin, ServiceDesk, ReadOnly)

### Deployment Checklist

Before deploying to production:

- [ ] All security fixes tested in development
- [ ] `.env.production` configured with proper values
- [ ] `ALLOWED_ORIGINS` set to production domain(s)
- [ ] `AD_ENABLED=true` in production
- [ ] Database encryption key generated
- [ ] Session secret generated (64+ characters)
- [ ] ServiceNow domains configured
- [ ] Security headers verified with https://securityheaders.com/
- [ ] SSL/TLS certificate installed
- [ ] Firewall rules configured
- [ ] Monitoring and alerting configured

---

## Summary

This guide covered the critical security fixes:

1. ✅ **Authentication Bypass** - Fixed with proper validation and production checks
2. ✅ **Missing Security Headers** - Added helmet with comprehensive CSP
3. ✅ **Rate Limiting** - Implemented express-rate-limit
4. ✅ **Vulnerable Dependencies** - Updated nodemailer, vite, esbuild
5. ✅ **CSV Injection** - Added field sanitization
6. ✅ **Mass Assignment** - Implemented field whitelisting
7. ✅ **URL Validation** - Added ServiceNow domain whitelist
8. ✅ **Authorization** - Fixed missing role checks

**Estimated Total Time**: ~40 hours
**Priority**: CRITICAL - Deploy within 1 week

---

## Next Steps

After completing these fixes:

1. **Phase 2 Fixes** (Week 2-3):
   - Database encryption
   - Secrets management (Azure Key Vault)
   - CSRF protection
   - Session management

2. **Security Monitoring**:
   - Set up log aggregation
   - Configure security alerts
   - Implement audit dashboard

3. **Continuous Security**:
   - Add automated security scanning to CI/CD
   - Schedule regular penetration testing
   - Implement security training for dev team

---

**Document Version**: 1.0
**Last Updated**: 2025-11-19
**Author**: Security Team
