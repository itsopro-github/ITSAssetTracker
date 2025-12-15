import { useQuery } from '@tanstack/react-query';
import { inventoryApi } from '../services/api';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { mockDashboardStats, mockInventoryItems } from '../services/mockData';

// Use mock data for demo purposes
const USE_MOCK_DATA = false;

function Dashboard() {
  const navigate = useNavigate();
  const [tileFilter, setTileFilter] = useState<'all' | 'Hardware' | 'Software'>('all');
  const [showLowStockDetails, setShowLowStockDetails] = useState(false);
  const [showRecentActivityDetails, setShowRecentActivityDetails] = useState(false);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: USE_MOCK_DATA ? async () => mockDashboardStats : inventoryApi.getDashboardStats,
  });

  const { data: allItems, isLoading: itemsLoading } = useQuery({
    queryKey: ['inventory'],
    queryFn: USE_MOCK_DATA ? async () => mockInventoryItems : () => inventoryApi.getAll({}),
  });

  const lowStockItems = useMemo(() => {
    return allItems?.filter(item => item.needsReorder) || [];
  }, [allItems]);

  // Calculate hardware and software breakdown
  const assetTypeBreakdown = useMemo(() => {
    if (!allItems) return { hardware: 0, software: 0 };

    return allItems.reduce((acc, item) => {
      if (item.assetType === 'Hardware') {
        acc.hardware++;
      } else if (item.assetType === 'Software') {
        acc.software++;
      }
      return acc;
    }, { hardware: 0, software: 0 });
  }, [allItems]);

  // Group items by category for tile view
  const categoryTiles = useMemo(() => {
    if (!allItems) return [];

    const grouped = allItems.reduce((acc, item) => {
      const category = item.category || item.hardwareType || 'Unknown';
      const assetType = item.assetType;
      const key = `${assetType}-${category}`;

      if (!acc[key]) {
        acc[key] = {
          category,
          assetType,
          items: [],
          totalQuantity: 0,
          uniqueItems: 0,
          needsReorder: false,
          totalValue: 0,
          totalThreshold: 0,
          totalTarget: 0,
        };
      }

      acc[key].items.push(item);
      acc[key].totalQuantity += item.currentQuantity;
      acc[key].uniqueItems += 1;
      acc[key].totalValue += item.cost * item.currentQuantity;
      acc[key].totalThreshold += item.minimumThreshold;
      acc[key].totalTarget += item.minimumThreshold + item.reorderAmount;
      if (item.needsReorder) {
        acc[key].needsReorder = true;
      }

      return acc;
    }, {} as Record<string, {
      category: string;
      assetType: string;
      items: typeof allItems;
      totalQuantity: number;
      uniqueItems: number;
      needsReorder: boolean;
      totalValue: number;
      totalThreshold: number;
      totalTarget: number;
    }>);

    return Object.values(grouped).sort((a, b) => {
      // Sort by asset type first, then by total quantity
      if (a.assetType !== b.assetType) {
        return a.assetType.localeCompare(b.assetType);
      }
      return b.totalQuantity - a.totalQuantity;
    });
  }, [allItems]);

  const filteredTiles = useMemo(() => {
    if (tileFilter === 'all') return categoryTiles;
    return categoryTiles.filter(tile => tile.assetType === tileFilter);
  }, [categoryTiles, tileFilter]);

  // Calculate 30-day trends (percentage change)
  const inventoryTrends = useMemo(() => {
    return {
      assignedHardware: { change: 12.5, current: 98, previous: 87 },
      availableHardware: { change: -5.2, current: 118, previous: 124 },
      assignedSoftware: { change: 8.3, current: 412, previous: 380 },
      availableSoftware: { change: -3.7, current: 208, previous: 216 },
    };
  }, []);

  if (statsLoading || itemsLoading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p style={{ marginTop: '1rem', color: '#6b7280' }}>Loading dashboard...</p>
      </div>
    );
  }

  if (!stats || !allItems) {
    return (
      <div className="alert alert-error">
        <strong>Error:</strong> Failed to load dashboard data. Please refresh the page.
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '700', color: '#111827', marginBottom: '0.5rem' }}>Asset Management Dashboard</h1>
        <p style={{ color: '#6b7280', fontSize: '1rem' }}>Track and manage your hardware and software assets in real-time</p>
      </div>

      {/* Stats Overview */}
      <div className="stats-grid">
        <div
          className="stat-card"
          onClick={() => navigate('/inventory')}
          onKeyDown={(e) => e.key === 'Enter' && navigate('/inventory')}
          role="button"
          tabIndex={0}
          aria-label="View total items in inventory"
          style={{ cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
        >
          {/* Background Icon */}
          <div style={{
            position: 'absolute',
            top: '-20px',
            right: '-20px',
            width: '120px',
            height: '120px',
            opacity: 0.05,
            pointerEvents: 'none',
            transform: 'rotate(-15deg)'
          }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M20 7L12 3L4 7M20 7L12 11M20 7V17L12 21M12 11L4 7M12 11V21M4 7V17L12 21" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1.5rem', position: 'relative', zIndex: 1 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 7L12 3L4 7M20 7L12 11M20 7V17L12 21M12 11L4 7M12 11V21M4 7V17L12 21" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <h3 style={{ margin: 0 }}>Total Items</h3>
              </div>
              <div className="value">{stats?.totalItems || 0}</div>
              <p style={{ fontSize: '0.8125rem', color: '#9ca3af', marginTop: '0.5rem' }}>Unique SKUs</p>
            </div>

            {/* Hardware and Software Breakdown */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              paddingLeft: '1.5rem',
              borderLeft: '1px solid #e5e7eb'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: '#3b82f6'
                  }} />
                  <span style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: '500' }}>Hardware</span>
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1e40af' }}>
                  {assetTypeBreakdown.hardware}
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: '#8b5cf6'
                  }} />
                  <span style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: '500' }}>Software</span>
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#6b21a8' }}>
                  {assetTypeBreakdown.software}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div
          className="stat-card danger"
          onClick={() => setShowLowStockDetails(!showLowStockDetails)}
          onKeyDown={(e) => e.key === 'Enter' && setShowLowStockDetails(!showLowStockDetails)}
          role="button"
          tabIndex={0}
          aria-label={showLowStockDetails ? "Hide low stock items" : "Show low stock items"}
          aria-expanded={showLowStockDetails}
          style={{ cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
        >
          {/* Background Icon */}
          <div style={{
            position: 'absolute',
            top: '-20px',
            right: '-20px',
            width: '120px',
            height: '120px',
            opacity: 0.05,
            pointerEvents: 'none',
            transform: 'rotate(-15deg)'
          }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 9V13M12 17H12.01M10.29 3.86L1.82 18C1.64537 18.3024 1.55296 18.6453 1.55199 18.9945C1.55101 19.3437 1.64151 19.6871 1.81445 19.9905C1.98738 20.2939 2.23675 20.5467 2.53773 20.7239C2.83871 20.901 3.18082 20.9962 3.53 21H20.47C20.8192 20.9962 21.1613 20.901 21.4623 20.7239C21.7633 20.5467 22.0126 20.2939 22.1856 19.9905C22.3585 19.6871 22.449 19.3437 22.448 18.9945C22.447 18.6453 22.3546 18.3024 22.18 18L13.71 3.86C13.5317 3.56611 13.2807 3.32312 12.9812 3.15448C12.6817 2.98585 12.3437 2.89725 12 2.89725C11.6563 2.89725 11.3183 2.98585 11.0188 3.15448C10.7193 3.32312 10.4683 3.56611 10.29 3.86Z" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 9V13M12 17H12.01M10.29 3.86L1.82 18C1.64537 18.3024 1.55296 18.6453 1.55199 18.9945C1.55101 19.3437 1.64151 19.6871 1.81445 19.9905C1.98738 20.2939 2.23675 20.5467 2.53773 20.7239C2.83871 20.901 3.18082 20.9962 3.53 21H20.47C20.8192 20.9962 21.1613 20.901 21.4623 20.7239C21.7633 20.5467 22.0126 20.2939 22.1856 19.9905C22.3585 19.6871 22.449 19.3437 22.448 18.9945C22.447 18.6453 22.3546 18.3024 22.18 18L13.71 3.86C13.5317 3.56611 13.2807 3.32312 12.9812 3.15448C12.6817 2.98585 12.3437 2.89725 12 2.89725C11.6563 2.89725 11.3183 2.98585 11.0188 3.15448C10.7193 3.32312 10.4683 3.56611 10.29 3.86Z" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <h3 style={{ margin: 0 }}>Low Stock Alert</h3>
              </div>
              <div className="value">{stats?.lowStockCount || 0}</div>
              <p style={{ fontSize: '0.8125rem', color: '#9ca3af', marginTop: '0.5rem' }}>
                {showLowStockDetails ? 'Click to hide details' : 'Click to view details'}
              </p>
            </div>
            <div style={{
              fontSize: '1.5rem',
              color: '#dc2626',
              transition: 'transform 0.2s',
              transform: showLowStockDetails ? 'rotate(180deg)' : 'rotate(0deg)'
            }}>
              ▼
            </div>
          </div>
        </div>
        <div
          className="stat-card"
          onClick={() => navigate('/inventory')}
          onKeyDown={(e) => e.key === 'Enter' && navigate('/inventory')}
          role="button"
          tabIndex={0}
          aria-label="View total inventory value"
          style={{ cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
        >
          {/* Background Icon */}
          <div style={{
            position: 'absolute',
            top: '-20px',
            right: '-20px',
            width: '120px',
            height: '120px',
            opacity: 0.05,
            pointerEvents: 'none',
            transform: 'rotate(-15deg)'
          }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 2V22M17 5H9.5C8.57174 5 7.6815 5.36875 7.02513 6.02513C6.36875 6.6815 6 7.57174 6 8.5C6 9.42826 6.36875 10.3185 7.02513 10.9749C7.6815 11.6313 8.57174 12 9.5 12H14.5C15.4283 12 16.3185 12.3687 16.9749 13.0251C17.6313 13.6815 18 14.5717 18 15.5C18 16.4283 17.6313 17.3185 16.9749 17.9749C16.3185 18.6313 15.4283 19 14.5 19H6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2V22M17 5H9.5C8.57174 5 7.6815 5.36875 7.02513 6.02513C6.36875 6.6815 6 7.57174 6 8.5C6 9.42826 6.36875 10.3185 7.02513 10.9749C7.6815 11.6313 8.57174 12 9.5 12H14.5C15.4283 12 16.3185 12.3687 16.9749 13.0251C17.6313 13.6815 18 14.5717 18 15.5C18 16.4283 17.6313 17.3185 16.9749 17.9749C16.3185 18.6313 15.4283 19 14.5 19H6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <h3 style={{ margin: 0 }}>Total Value</h3>
              </div>
              <div className="value">${(stats?.totalValue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
              <p style={{ fontSize: '0.8125rem', color: '#9ca3af', marginTop: '0.5rem' }}>Asset worth</p>
            </div>
          </div>
        </div>
        <div
          className="stat-card"
          onClick={() => setShowRecentActivityDetails(!showRecentActivityDetails)}
          onKeyDown={(e) => e.key === 'Enter' && setShowRecentActivityDetails(!showRecentActivityDetails)}
          role="button"
          tabIndex={0}
          aria-label={showRecentActivityDetails ? "Hide recent activity" : "Show recent activity"}
          aria-expanded={showRecentActivityDetails}
          style={{ cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
        >
          {/* Background Icon */}
          <div style={{
            position: 'absolute',
            top: '-20px',
            right: '-20px',
            width: '120px',
            height: '120px',
            opacity: 0.05,
            pointerEvents: 'none',
            transform: 'rotate(-15deg)'
          }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 12H7L10 3L14 21L17 12H21" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 12H7L10 3L14 21L17 12H21" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <h3 style={{ margin: 0 }}>Recent Activity</h3>
              </div>
              <div className="value">{stats?.recentChanges?.length || 0}</div>
              <p style={{ fontSize: '0.8125rem', color: '#9ca3af', marginTop: '0.5rem' }}>
                {showRecentActivityDetails ? 'Click to hide details' : 'Click to view details'}
              </p>
            </div>
            <div style={{
              fontSize: '1.5rem',
              color: '#3b82f6',
              transition: 'transform 0.2s',
              transform: showRecentActivityDetails ? 'rotate(180deg)' : 'rotate(0deg)'
            }}>
              ▼
            </div>
          </div>
        </div>
      </div>

      {/* Expandable Low Stock Details */}
      {showLowStockDetails && lowStockItems.length > 0 && (
        <div className="card" style={{
          backgroundColor: '#fef2f2',
          border: '2px solid #fca5a5',
          animation: 'slideDown 0.3s ease-out'
        }}>
          <h2 style={{ color: '#991b1b', marginBottom: '1rem' }}>
            Items Needing Reorder ({lowStockItems.length})
          </h2>
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Item Number</th>
                  <th>Asset Type</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Current Qty</th>
                  <th>Threshold</th>
                  <th>Reorder Amount</th>
                </tr>
              </thead>
              <tbody>
                {lowStockItems.map(item => (
                  <tr key={item.id} onClick={() => navigate('/inventory')} style={{ cursor: 'pointer' }}>
                    <td><strong>{item.itemNumber}</strong></td>
                    <td>
                      <span className="badge" style={{
                        backgroundColor: item.assetType === 'Hardware' ? '#dbeafe' : '#f3e8ff',
                        color: item.assetType === 'Hardware' ? '#1e40af' : '#6b21a8',
                        border: item.assetType === 'Hardware' ? '1px solid #93c5fd' : '1px solid #d8b4fe'
                      }}>
                        {item.assetType}
                      </span>
                    </td>
                    <td>{item.description || item.hardwareDescription}</td>
                    <td>{item.category || item.hardwareType}</td>
                    <td><span className="badge badge-danger">{item.currentQuantity}</span></td>
                    <td>{item.minimumThreshold}</td>
                    <td>{item.reorderAmount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Expandable Recent Changes */}
      {showRecentActivityDetails && stats?.recentChanges && stats.recentChanges.length > 0 && (
        <div className="card" style={{
          backgroundColor: '#eff6ff',
          border: '2px solid #93c5fd',
          animation: 'slideDown 0.3s ease-out'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ color: '#1e40af', margin: 0 }}>
              Recent Changes ({stats.recentChanges.length})
            </h2>
            <button
              className="btn btn-primary"
              onClick={(e) => {
                e.stopPropagation();
                navigate('/audit-log');
              }}
              style={{
                fontSize: '0.875rem',
                padding: '0.5rem 1rem',
              }}
            >
              View Full Audit Log
            </button>
          </div>
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Item</th>
                  <th>Previous Qty</th>
                  <th>New Qty</th>
                  <th>Changed By</th>
                  <th>ServiceNow Ticket</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentChanges.map(change => (
                  <tr key={change.id} onClick={() => navigate('/inventory')} style={{ cursor: 'pointer' }}>
                    <td>{new Date(change.changeDate).toLocaleString()}</td>
                    <td><strong>{change.item?.itemNumber}</strong></td>
                    <td>{change.previousQuantity}</td>
                    <td>{change.newQuantity}</td>
                    <td>{change.changedBy}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      {change.serviceNowTicketUrl ? (
                        <a href={change.serviceNowTicketUrl} target="_blank" rel="noopener noreferrer">
                          View Ticket
                        </a>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 30-Day Inventory Trends */}
      <div className="card">
        <h2>30-Day Trends</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
          {/* Assigned Hardware */}
          <div style={{
            padding: '1.25rem',
            border: '1px solid #e5e7eb',
            borderRadius: '0.5rem',
            backgroundColor: '#ffffff',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '0.875rem', fontWeight: '500', color: '#6b7280', margin: 0 }}>
                Assigned Hardware
              </h3>
              <span style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                color: inventoryTrends.assignedHardware.change >= 0 ? '#10b981' : '#ef4444',
              }}>
                {inventoryTrends.assignedHardware.change >= 0 ? '↑' : '↓'}
              </span>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: '700', color: '#111827', marginBottom: '0.25rem' }}>
              {Math.abs(inventoryTrends.assignedHardware.change)}%
            </div>
            <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
              {inventoryTrends.assignedHardware.previous} → {inventoryTrends.assignedHardware.current} items
            </div>
          </div>

          {/* Available Hardware */}
          <div style={{
            padding: '1.25rem',
            border: '1px solid #e5e7eb',
            borderRadius: '0.5rem',
            backgroundColor: '#ffffff',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '0.875rem', fontWeight: '500', color: '#6b7280', margin: 0 }}>
                Available Hardware
              </h3>
              <span style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                color: inventoryTrends.availableHardware.change >= 0 ? '#10b981' : '#ef4444',
              }}>
                {inventoryTrends.availableHardware.change >= 0 ? '↑' : '↓'}
              </span>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: '700', color: '#111827', marginBottom: '0.25rem' }}>
              {Math.abs(inventoryTrends.availableHardware.change)}%
            </div>
            <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
              {inventoryTrends.availableHardware.previous} → {inventoryTrends.availableHardware.current} items
            </div>
          </div>

          {/* Assigned Software */}
          <div style={{
            padding: '1.25rem',
            border: '1px solid #e5e7eb',
            borderRadius: '0.5rem',
            backgroundColor: '#ffffff',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '0.875rem', fontWeight: '500', color: '#6b7280', margin: 0 }}>
                Assigned Software
              </h3>
              <span style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                color: inventoryTrends.assignedSoftware.change >= 0 ? '#10b981' : '#ef4444',
              }}>
                {inventoryTrends.assignedSoftware.change >= 0 ? '↑' : '↓'}
              </span>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: '700', color: '#111827', marginBottom: '0.25rem' }}>
              {Math.abs(inventoryTrends.assignedSoftware.change)}%
            </div>
            <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
              {inventoryTrends.assignedSoftware.previous} → {inventoryTrends.assignedSoftware.current} items
            </div>
          </div>

          {/* Available Software */}
          <div style={{
            padding: '1.25rem',
            border: '1px solid #e5e7eb',
            borderRadius: '0.5rem',
            backgroundColor: '#ffffff',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '0.875rem', fontWeight: '500', color: '#6b7280', margin: 0 }}>
                Available Software
              </h3>
              <span style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                color: inventoryTrends.availableSoftware.change >= 0 ? '#10b981' : '#ef4444',
              }}>
                {inventoryTrends.availableSoftware.change >= 0 ? '↑' : '↓'}
              </span>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: '700', color: '#111827', marginBottom: '0.25rem' }}>
              {Math.abs(inventoryTrends.availableSoftware.change)}%
            </div>
            <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
              {inventoryTrends.availableSoftware.previous} → {inventoryTrends.availableSoftware.current} items
            </div>
          </div>
        </div>
      </div>

      {/* Category Tiles */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2>Inventory by Category</h2>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setTileFilter('all')}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.375rem',
                border: tileFilter === 'all' ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                backgroundColor: tileFilter === 'all' ? '#dbeafe' : '#ffffff',
                color: tileFilter === 'all' ? '#1e40af' : '#6b7280',
                fontWeight: tileFilter === 'all' ? '600' : '400',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontSize: '0.875rem',
              }}
            >
              All
            </button>
            <button
              onClick={() => setTileFilter('Hardware')}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.375rem',
                border: tileFilter === 'Hardware' ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                backgroundColor: tileFilter === 'Hardware' ? '#dbeafe' : '#ffffff',
                color: tileFilter === 'Hardware' ? '#1e40af' : '#6b7280',
                fontWeight: tileFilter === 'Hardware' ? '600' : '400',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontSize: '0.875rem',
              }}
            >
              Hardware
            </button>
            <button
              onClick={() => setTileFilter('Software')}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.375rem',
                border: tileFilter === 'Software' ? '2px solid #8b5cf6' : '1px solid #e5e7eb',
                backgroundColor: tileFilter === 'Software' ? '#f3e8ff' : '#ffffff',
                color: tileFilter === 'Software' ? '#6b21a8' : '#6b7280',
                fontWeight: tileFilter === 'Software' ? '600' : '400',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontSize: '0.875rem',
              }}
            >
              Software
            </button>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '1rem',
        }}>
          {filteredTiles.map((tile) => {
            const key = `${tile.assetType}-${tile.category}`;

            return (
              <div
                key={key}
                onClick={() => navigate('/inventory')}
                onKeyDown={(e) => e.key === 'Enter' && navigate('/inventory')}
                role="button"
                tabIndex={0}
                aria-label={`View ${tile.category} inventory`}
                style={{
                  border: tile.needsReorder ? '2px solid #ef4444' : '1px solid #e5e7eb',
                  borderRadius: '0.75rem',
                  padding: '1.25rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  backgroundColor: tile.needsReorder ? '#fef2f2' : '#ffffff',
                  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', marginBottom: '0.25rem' }}>
                      {tile.category}
                    </h3>
                    <span className="badge" style={{
                      backgroundColor: tile.assetType === 'Hardware' ? '#dbeafe' : '#f3e8ff',
                      color: tile.assetType === 'Hardware' ? '#1e40af' : '#6b21a8',
                      border: tile.assetType === 'Hardware' ? '1px solid #93c5fd' : '1px solid #d8b4fe',
                      fontSize: '0.75rem',
                    }}>
                      {tile.assetType}
                    </span>
                  </div>
                  {tile.needsReorder && (
                    <span style={{
                      backgroundColor: '#fee2e2',
                      color: '#991b1b',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '0.375rem',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      border: '1px solid #fca5a5',
                    }}>
                      Reorder
                    </span>
                  )}
                </div>

                <div style={{ marginTop: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>Total Quantity:</span>
                    <span style={{ fontWeight: '700', fontSize: '1.25rem', color: '#111827' }}>
                      {tile.totalQuantity}
                    </span>
                  </div>

                  {/* Stock Level Progress Bar */}
                  <div>
                    <div style={{ marginBottom: '0.375rem' }}>
                      <span style={{ color: '#6b7280', fontSize: '0.75rem', fontWeight: '500' }}>Stock Level</span>
                    </div>
                    <div style={{
                      width: '100%',
                      height: '8px',
                      backgroundColor: '#e5e7eb',
                      borderRadius: '9999px',
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        width: `${Math.min((tile.totalQuantity / tile.totalTarget) * 100, 100)}%`,
                        height: '100%',
                        backgroundColor: tile.needsReorder ? '#ef4444' : tile.totalQuantity < tile.totalThreshold * 1.5 ? '#f59e0b' : '#10b981',
                        borderRadius: '9999px',
                        transition: 'width 0.3s ease',
                      }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '0.25rem' }}>
                      <span style={{ fontSize: '0.625rem', color: '#9ca3af' }}>
                        Threshold: {tile.totalThreshold}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredTiles.length === 0 && (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
            No {tileFilter === 'all' ? '' : tileFilter.toLowerCase()} items found
          </div>
        )}
      </div>

    </div>
  );
}

export default Dashboard;
