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
