import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',

  database: {
    url: process.env.DATABASE_URL || 'file:./assettracker.db',
  },

  email: {
    smtpHost: process.env.SMTP_HOST || 'smtp.company.com',
    smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
    smtpUsername: process.env.SMTP_USERNAME || '',
    smtpPassword: process.env.SMTP_PASSWORD || '',
    fromAddress: process.env.SMTP_FROM_ADDRESS || 'noreply@company.com',
    fromName: process.env.SMTP_FROM_NAME || 'ITS Asset Tracker',
    enableSsl: process.env.SMTP_ENABLE_SSL === 'true',
  },

  activeDirectory: {
    enabled: process.env.AD_ENABLED === 'true',
    domain: process.env.AD_DOMAIN || 'company.local',
    ldapServer: process.env.AD_LDAP_SERVER || 'ldap://dc.company.local:389',
    ldapPort: parseInt(process.env.AD_LDAP_PORT || '389', 10),
    useSsl: process.env.AD_USE_SSL === 'true',
    searchBase: process.env.AD_SEARCH_BASE || 'DC=company,DC=local',
    adminGroup: process.env.AD_ADMIN_GROUP || 'ITS-AssetTracker-Admins',
    serviceDeskGroup: process.env.AD_SERVICE_DESK_GROUP || 'ITS-ServiceDesk',
    readOnlyGroup: process.env.AD_READ_ONLY_GROUP || 'ITS-AssetTracker-ReadOnly',
    bindUsername: process.env.AD_BIND_USERNAME || '',
    bindPassword: process.env.AD_BIND_PASSWORD || '',
  },
};
