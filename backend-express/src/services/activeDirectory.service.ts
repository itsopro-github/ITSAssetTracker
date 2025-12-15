import { config } from '../config';

export interface IActiveDirectoryService {
  isUserInGroup(username: string, groupName: string): boolean;
  getEmailAddressesForGroup(groupName: string): Promise<string[]>;
  getUserEmailAddress(username: string): Promise<string | null>;
  searchUsers(searchTerm: string): Promise<string[]>;
}

class ActiveDirectoryService implements IActiveDirectoryService {
  /**
   * Check if a user is in a specific AD group
   * Mock implementation for development
   */
  isUserInGroup(username: string, groupName: string): boolean {
    if (!config.activeDirectory.enabled) {
      // Mock implementation - for development/testing
      // Admin users: admin, john.doe
      // ServiceDesk users: admin, john.doe, jane.smith
      // ReadOnly users: all others

      const adminUsers = ['admin', 'john.doe'];
      const serviceDeskUsers = ['admin', 'john.doe', 'jane.smith'];

      if (groupName === config.activeDirectory.adminGroup) {
        return adminUsers.includes(username.toLowerCase());
      }

      if (groupName === config.activeDirectory.serviceDeskGroup) {
        return serviceDeskUsers.includes(username.toLowerCase());
      }

      if (groupName === config.activeDirectory.readOnlyGroup) {
        return true; // Everyone has read access in mock mode
      }

      return false;
    }

    // TODO: Implement real LDAP integration when AD is enabled
    // This would use libraries like ldapjs or activedirectory2
    throw new Error('Active Directory integration not yet implemented');
  }

  /**
   * Get email addresses for all members of an AD group
   * Mock implementation for development
   */
  async getEmailAddressesForGroup(groupName: string): Promise<string[]> {
    if (!config.activeDirectory.enabled) {
      // Mock implementation
      const mockEmails: Record<string, string[]> = {
        [config.activeDirectory.adminGroup]: ['admin@company.com', 'john.doe@company.com'],
        [config.activeDirectory.serviceDeskGroup]: [
          'admin@company.com',
          'john.doe@company.com',
          'jane.smith@company.com',
        ],
        'IT_Governance': [
          'governance@company.com',
          'it.manager@company.com',
        ],
      };

      return mockEmails[groupName] || [];
    }

    // TODO: Implement real LDAP integration when AD is enabled
    throw new Error('Active Directory integration not yet implemented');
  }

  /**
   * Get email address for a specific user
   * Mock implementation for development
   */
  async getUserEmailAddress(username: string): Promise<string | null> {
    if (!config.activeDirectory.enabled) {
      // Mock implementation
      const mockEmails: Record<string, string> = {
        admin: 'admin@company.com',
        'john.doe': 'john.doe@company.com',
        'jane.smith': 'jane.smith@company.com',
        'bob.johnson': 'bob.johnson@company.com',
      };

      return mockEmails[username.toLowerCase()] || `${username}@company.com`;
    }

    // TODO: Implement real LDAP integration when AD is enabled
    throw new Error('Active Directory integration not yet implemented');
  }

  /**
   * Search for users by name or username
   * Mock implementation for development
   */
  async searchUsers(searchTerm: string): Promise<string[]> {
    if (searchTerm.length < 2) {
      return [];
    }

    if (!config.activeDirectory.enabled) {
      // Mock implementation
      const mockUsers = [
        'admin',
        'john.doe',
        'jane.smith',
        'bob.johnson',
        'alice.williams',
        'charlie.brown',
        'david.miller',
        'emily.davis',
      ];

      return mockUsers
        .filter(user => user.toLowerCase().includes(searchTerm.toLowerCase()))
        .slice(0, 20);
    }

    // TODO: Implement real LDAP integration when AD is enabled
    throw new Error('Active Directory integration not yet implemented');
  }
}

export const activeDirectoryService = new ActiveDirectoryService();
