import { useQuery } from '@tanstack/react-query';
import { inventoryApi } from '../services/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { useState, useMemo } from 'react';

function Dashboard() {
  const [timeRange, setTimeRange] = useState('7d');

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: inventoryApi.getDashboardStats,
  });

  const { data: allItems, isLoading: itemsLoading } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => inventoryApi.getAll({}),
  });

  const lowStockItems = useMemo(() => {
    return allItems?.filter(item => item.needsReorder) || [];
  }, [allItems]);

  const inventoryByType = useMemo(() => {
    if (!allItems) return [];

    const grouped = allItems.reduce((acc, item) => {
      const existing = acc.find(g => g.type === item.hardwareType);
      if (existing) {
        existing.count += 1;
        existing.value += item.cost * item.currentQuantity;
      } else {
        acc.push({
          type: item.hardwareType,
          count: 1,
          value: item.cost * item.currentQuantity,
        });
      }
      return acc;
    }, [] as Array<{ type: string; count: number; value: number }>);

    return grouped.sort((a, b) => b.count - a.count);
  }, [allItems]);

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
    return <div className="loading"><div className="spinner"></div></div>;
  }

  return (
    <div>
      <h1 className="mb-3">Dashboard</h1>

      {/* Stats Overview */}
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Items</h3>
          <div className="value">{stats?.totalItems || 0}</div>
        </div>
        <div className="stat-card danger">
          <h3>Low Stock Items</h3>
          <div className="value">{stats?.lowStockCount || 0}</div>
        </div>
        <div className="stat-card">
          <h3>Total Inventory Value</h3>
          <div className="value">${(stats?.totalValue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
        </div>
        <div className="stat-card">
          <h3>Recent Changes</h3>
          <div className="value">{stats?.recentChanges?.length || 0}</div>
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <div className="alert alert-error mb-3">
          <strong>Low Stock Alert:</strong> {lowStockItems.length} item(s) need reordering
        </div>
      )}

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="card">
          <h2>Inventory by Type</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={inventoryByType}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="type" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#1976d2" name="Item Count" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h2>Recent Activity</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={recentActivityData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="changes" stroke="#1976d2" name="Changes" />
            </LineChart>
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
                  <tr key={item.id}>
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
                  <tr key={change.id}>
                    <td>{new Date(change.changeDate).toLocaleString()}</td>
                    <td>{change.item?.itemNumber}</td>
                    <td>{change.previousQuantity}</td>
                    <td>{change.newQuantity}</td>
                    <td>{change.changedBy}</td>
                    <td>
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
