import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryApi, userApi } from '../services/api';
import type { FilterOptions, UpdateInventoryDto } from '../types';

function InventoryList() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<FilterOptions>({
    search: '',
    hardwareType: '',
    needsReorder: undefined,
    sortBy: 'itemnumber',
    sortDesc: false,
  });

  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [quantityChange, setQuantityChange] = useState<number>(0);
  const [ticketUrl, setTicketUrl] = useState<string>('');
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: userApi.getCurrentUser,
  });

  const { data: items, isLoading } = useQuery({
    queryKey: ['inventory', filters],
    queryFn: () => inventoryApi.getAll(filters),
  });

  const { data: hardwareTypes } = useQuery({
    queryKey: ['hardwareTypes'],
    queryFn: inventoryApi.getHardwareTypes,
  });

  const updateMutation = useMutation({
    mutationFn: (dto: UpdateInventoryDto) => inventoryApi.updateQuantity(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      setShowUpdateModal(false);
      setSelectedItem(null);
      setQuantityChange(0);
      setTicketUrl('');
      alert('Inventory updated successfully');
    },
    onError: (error: any) => {
      alert(`Error updating inventory: ${error.response?.data || error.message}`);
    },
  });

  const handleSort = (column: string) => {
    setFilters(prev => ({
      ...prev,
      sortBy: column,
      sortDesc: prev.sortBy === column ? !prev.sortDesc : false,
    }));
  };

  const openUpdateModal = (itemNumber: string) => {
    setSelectedItem(itemNumber);
    setShowUpdateModal(true);
  };

  const handleUpdate = () => {
    if (!selectedItem) return;

    updateMutation.mutate({
      itemNumber: selectedItem,
      quantityChange,
      serviceNowTicketUrl: ticketUrl || undefined,
    });
  };

  if (isLoading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  const canEdit = user?.roles.isServiceDesk;

  return (
    <div>
      <div className="card-header">
        <h1>Inventory Management</h1>
      </div>

      {/* Filters */}
      <div className="card">
        <h2>Filters</h2>
        <div className="filters">
          <div className="filter-group">
            <label>Search</label>
            <input
              type="text"
              className="form-control"
              placeholder="Search by item number or description..."
              value={filters.search}
              onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
            />
          </div>

          <div className="filter-group">
            <label>Hardware Type</label>
            <select
              className="form-control"
              value={filters.hardwareType}
              onChange={e => setFilters(prev => ({ ...prev, hardwareType: e.target.value }))}
            >
              <option value="">All Types</option>
              {hardwareTypes?.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Stock Status</label>
            <select
              className="form-control"
              value={filters.needsReorder === undefined ? '' : String(filters.needsReorder)}
              onChange={e => setFilters(prev => ({
                ...prev,
                needsReorder: e.target.value === '' ? undefined : e.target.value === 'true'
              }))}
            >
              <option value="">All Items</option>
              <option value="true">Needs Reorder</option>
              <option value="false">Adequate Stock</option>
            </select>
          </div>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="card">
        <div className="card-header">
          <h2>Items ({items?.length || 0})</h2>
        </div>
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th onClick={() => handleSort('itemnumber')}>
                  Item Number {filters.sortBy === 'itemnumber' && (filters.sortDesc ? '↓' : '↑')}
                </th>
                <th onClick={() => handleSort('description')}>
                  Description {filters.sortBy === 'description' && (filters.sortDesc ? '↓' : '↑')}
                </th>
                <th onClick={() => handleSort('type')}>
                  Type {filters.sortBy === 'type' && (filters.sortDesc ? '↓' : '↑')}
                </th>
                <th onClick={() => handleSort('quantity')}>
                  Quantity {filters.sortBy === 'quantity' && (filters.sortDesc ? '↓' : '↑')}
                </th>
                <th onClick={() => handleSort('cost')}>
                  Cost {filters.sortBy === 'cost' && (filters.sortDesc ? '↓' : '↑')}
                </th>
                <th>Threshold</th>
                <th>Reorder Amt</th>
                <th onClick={() => handleSort('modified')}>
                  Last Modified {filters.sortBy === 'modified' && (filters.sortDesc ? '↓' : '↑')}
                </th>
                {canEdit && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {items?.map(item => (
                <tr key={item.id} style={item.needsReorder ? { backgroundColor: '#ffebee' } : {}}>
                  <td><strong>{item.itemNumber}</strong></td>
                  <td>{item.hardwareDescription}</td>
                  <td>{item.hardwareType}</td>
                  <td>
                    <span className={item.needsReorder ? 'badge badge-danger' : 'badge badge-success'}>
                      {item.currentQuantity}
                    </span>
                  </td>
                  <td>${item.cost.toFixed(2)}</td>
                  <td>{item.minimumThreshold}</td>
                  <td>{item.reorderAmount}</td>
                  <td>
                    <small>{new Date(item.lastModifiedDate).toLocaleDateString()}</small>
                    <br />
                    <small>{item.lastModifiedBy}</small>
                  </td>
                  {canEdit && (
                    <td>
                      <button
                        className="btn btn-primary"
                        onClick={() => openUpdateModal(item.itemNumber)}
                      >
                        Update
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Update Modal */}
      {showUpdateModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div className="card" style={{ width: '500px', maxWidth: '90%' }}>
            <h2>Update Inventory: {selectedItem}</h2>

            <div className="form-group">
              <label>Quantity Change</label>
              <input
                type="number"
                className="form-control"
                value={quantityChange}
                onChange={e => setQuantityChange(Number(e.target.value))}
                placeholder="Enter positive to add, negative to remove"
              />
              <small>Use positive numbers to add stock, negative to remove</small>
            </div>

            <div className="form-group">
              <label>ServiceNow Ticket URL (Optional)</label>
              <input
                type="text"
                className="form-control"
                value={ticketUrl}
                onChange={e => setTicketUrl(e.target.value)}
                placeholder="https://servicenow.company.com/ticket/..."
              />
            </div>

            <div className="flex gap-2" style={{ justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setShowUpdateModal(false);
                  setSelectedItem(null);
                  setQuantityChange(0);
                  setTicketUrl('');
                }}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleUpdate}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? 'Updating...' : 'Update'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default InventoryList;
