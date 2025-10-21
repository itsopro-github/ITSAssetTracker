import { useQuery } from '@tanstack/react-query';
import { inventoryApi } from '../services/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { mockDashboardStats, mockInventoryItems } from '../services/mockData';

// Use mock data for demo purposes
const USE_MOCK_DATA = true;

function Dashboard() {
  const navigate = useNavigate();

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

  const inventoryByType = useMemo(() => {
    if (!allItems) return [];

    const grouped = allItems.reduce((acc, item) => {
      const existing = acc.find(g => g.type === item.hardwareType);
      if (existing) {
        existing.count += item.currentQuantity; // Sum quantities instead of counting items
        existing.value += item.cost * item.currentQuantity;
      } else {
        acc.push({
          type: item.hardwareType,
          count: item.currentQuantity, // Use quantity instead of 1
          value: item.cost * item.currentQuantity,
        });
      }
      return acc;
    }, [] as Array<{ type: string; count: number; value: number }>);

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
        <p style={{ color: '#6b7280', fontSize: '1rem' }}>Track and manage your hardware inventory in real-time</p>
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

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="card">
          <h2>Inventory Distribution</h2>
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Pie
                data={inventoryByType}
                dataKey="count"
                nameKey="type"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ type, count }) => `${type}: ${count} units`}
              >
                {inventoryByType.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h2>Inventory Count by Category</h2>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={inventoryByType}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
              <XAxis dataKey="type" tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip
                contentStyle={{ background: 'rgba(255, 255, 255, 0.95)', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}
              />
              <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
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
          <h2>Inventory Value by Type</h2>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={inventoryByType}>
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
                  <th>Description</th>
                  <th>Type</th>
                  <th>Current Qty</th>
                  <th>Threshold</th>
                  <th>Reorder Amount</th>
                </tr>
              </thead>
              <tbody>
                {lowStockItems.map(item => (
                  <tr key={item.id} onClick={() => navigate('/inventory')} style={{ cursor: 'pointer' }}>
                    <td>{item.itemNumber}</td>
                    <td>{item.hardwareDescription}</td>
                    <td>{item.hardwareType}</td>
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
