export interface InventoryItem {
  id: number;
  itemNumber: string;
  hardwareDescription: string;
  hardwareType: string;
  cost: number;
  minimumThreshold: number;
  reorderAmount: number;
  currentQuantity: number;
  lastModifiedBy: string;
  lastModifiedDate: string;
  needsReorder: boolean;
}

export interface AuditHistory {
  id: number;
  itemId: number;
  previousQuantity: number;
  newQuantity: number;
  changedBy: string;
  changeDate: string;
  serviceNowTicketUrl?: string;
  item?: InventoryItem;
}

export interface NotificationConfig {
  id: number;
  adGroupName: string;
  additionalEmailRecipients?: string;
}

export interface User {
  username: string;
  roles: {
    isServiceDesk: boolean;
    isReadOnly: boolean;
    isAdmin: boolean;
  };
}

export interface UpdateInventoryDto {
  itemNumber: string;
  quantityChange: number;
  serviceNowTicketUrl?: string;
  assignedToUser?: string;
}

export interface CsvUploadResult {
  successCount: number;
  failureCount: number;
  errors: string[];
  lowStockAlerts: string[];
}

export interface DashboardStats {
  totalItems: number;
  lowStockCount: number;
  totalValue: number;
  recentChanges: AuditHistory[];
}

export interface FilterOptions {
  search?: string;
  hardwareType?: string;
  needsReorder?: boolean;
  sortBy?: string;
  sortDesc?: boolean;
}
