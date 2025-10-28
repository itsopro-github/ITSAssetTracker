import { useQuery } from '@tanstack/react-query';
import { inventoryApi } from '../services/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { mockDashboardStats, mockInventoryItems } from '../services/mockData';

// Use mock data for demo purposes
const USE_MOCK_DATA = true;

function Dashboard() {
  const navigate = useNavigate();
  const [tileFilter, setTileFilter] = useState<'all' | 'Hardware' | 'Software'>('all');

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

  const hardwareByCategory = useMemo(() => {
    if (!allItems) return [];

    const hardwareItems = allItems.filter(item => item.assetType === 'Hardware');
    const grouped = hardwareItems.reduce((acc, item) => {
      const itemType = item.category || item.hardwareType || 'Unknown';
      const existing = acc.find(g => g.type === itemType);
      if (existing) {
        existing.count += item.currentQuantity;
        existing.value += item.cost * item.currentQuantity;
      } else {
        acc.push({
          type: itemType,
          count: item.currentQuantity,
          value: item.cost * item.currentQuantity,
        });
      }
      return acc;
    }, [] as Array<{ type: string; count: number; value: number }>);

    return grouped.sort((a, b) => b.count - a.count);
  }, [allItems]);

  const softwareByCategory = useMemo(() => {
    if (!allItems) return [];

    const softwareItems = allItems.filter(item => item.assetType === 'Software');
    const grouped = softwareItems.reduce((acc, item) => {
      const itemType = item.category || 'Unknown';
      const existing = acc.find(g => g.type === itemType);
      if (existing) {
        existing.count += item.currentQuantity;
        existing.value += item.cost * item.currentQuantity;
      } else {
        acc.push({
          type: itemType,
          count: item.currentQuantity,
          value: item.cost * item.currentQuantity,
        });
      }
      return acc;
    }, [] as Array<{ type: string; count: number; value: number }>);

    return grouped.sort((a, b) => b.count - a.count);
  }, [allItems]);

  const inventoryByAssetType = useMemo(() => {
    if (!allItems) return [];

    const grouped = allItems.reduce((acc, item) => {
      const existing = acc.find(g => g.assetType === item.assetType);
      if (existing) {
        existing.count += item.currentQuantity;
        existing.value += item.cost * item.currentQuantity;
      } else {
        acc.push({
          assetType: item.assetType,
          count: item.currentQuantity,
          value: item.cost * item.currentQuantity,
        });
      }
      return acc;
    }, [] as Array<{ assetType: string; count: number; value: number }>);

    return grouped.sort((a, b) => b.count - a.count);
  }, [allItems]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#06b6d4'];

  const recentActivityData = useMemo(() => {
    if (!stats?.recentChanges) return [];

    const dailyChanges = stats.recentChanges.reduce((acc, change) => {
      const date = new Date(change.changeDate).toLocaleDateString();
      const existing = acc.find(d => d.date === date);
      if (existing) {
        existing.changes += 1;
      } else {
        acc.push({ date, changes: 1 });
      }
      return acc;
    }, [] as Array<{ date: string; changes: number }>);

    return dailyChanges.slice(0, 7).reverse();
  }, [stats]);

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
          style={{ cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h3>Total Items</h3>
              <div className="value">{stats?.totalItems || 0}</div>
              <p style={{ fontSize: '0.8125rem', color: '#9ca3af', marginTop: '0.5rem' }}>Unique SKUs</p>
            </div>
          </div>
        </div>
        <div
          className="stat-card danger"
          onClick={() => navigate('/inventory?filter=lowstock')}
          onKeyDown={(e) => e.key === 'Enter' && navigate('/inventory?filter=lowstock')}
          role="button"
          tabIndex={0}
          aria-label="View low stock items"
          style={{ cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h3>Low Stock Alert</h3>
              <div className="value">{stats?.lowStockCount || 0}</div>
              <p style={{ fontSize: '0.8125rem', color: '#9ca3af', marginTop: '0.5rem' }}>Need reordering</p>
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
          style={{ cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h3>Total Value</h3>
              <div className="value">${(stats?.totalValue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
              <p style={{ fontSize: '0.8125rem', color: '#9ca3af', marginTop: '0.5rem' }}>Asset worth</p>
            </div>
          </div>
        </div>
        <div
          className="stat-card"
          onClick={() => navigate('/inventory')}
          onKeyDown={(e) => e.key === 'Enter' && navigate('/inventory')}
          role="button"
          tabIndex={0}
          aria-label="View recent activity"
          style={{ cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h3>Recent Activity</h3>
              <div className="value">{stats?.recentChanges?.length || 0}</div>
              <p style={{ fontSize: '0.8125rem', color: '#9ca3af', marginTop: '0.5rem' }}>This week</p>
            </div>
          </div>
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <div className="alert alert-error mb-3">
          <strong>Low Stock Alert:</strong> {lowStockItems.length} item(s) need reordering
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

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="card">
          <h2>Hardware vs Software Distribution</h2>
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Pie
                data={inventoryByAssetType}
                dataKey="count"
                nameKey="assetType"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ assetType, count }) => `${assetType}: ${count} units`}
              >
                {inventoryByAssetType.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.assetType === 'Hardware' ? '#3b82f6' : '#8b5cf6'} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h2>Hardware by Category</h2>
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Pie
                data={hardwareByCategory}
                dataKey="count"
                nameKey="type"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ type, count }) => `${type}: ${count} units`}
              >
                {hardwareByCategory.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h2>Software by Category</h2>
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Pie
                data={softwareByCategory}
                dataKey="count"
                nameKey="type"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ type, count }) => `${type}: ${count} units`}
              >
                {softwareByCategory.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h2>Hardware Count by Category</h2>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={hardwareByCategory} margin={{ bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
              <XAxis
                dataKey="type"
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                interval={0}
                height={80}
              />
              <YAxis />
              <Tooltip
                contentStyle={{ background: 'rgba(255, 255, 255, 0.95)', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}
              />
              <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h2>Software Count by Category</h2>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={softwareByCategory}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
              <XAxis dataKey="type" tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip
                contentStyle={{ background: 'rgba(255, 255, 255, 0.95)', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}
              />
              <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h2>Activity Trend</h2>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={recentActivityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip
                contentStyle={{ background: 'rgba(255, 255, 255, 0.95)', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}
              />
              <Line
                type="monotone"
                dataKey="changes"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ fill: '#10b981', r: 4 }}
                name="Changes"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h2>Hardware Value by Category</h2>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={hardwareByCategory}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
              <XAxis dataKey="type" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: 'rgba(255, 255, 255, 0.95)', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}
                formatter={(value: number) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
              />
              <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Total Value" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h2>Software Value by Category</h2>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={softwareByCategory}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
              <XAxis dataKey="type" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: 'rgba(255, 255, 255, 0.95)', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}
                formatter={(value: number) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
              />
              <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Total Value" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Low Stock Items Table */}
      {lowStockItems.length > 0 && (
        <div className="card">
          <h2>Items Needing Reorder</h2>
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
                    <td>{item.itemNumber}</td>
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

      {/* Recent Changes */}
      {stats?.recentChanges && stats.recentChanges.length > 0 && (
        <div className="card">
          <h2>Recent Changes</h2>
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
                    <td>{change.item?.itemNumber}</td>
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
    </div>
  );
}

export default Dashboard;
