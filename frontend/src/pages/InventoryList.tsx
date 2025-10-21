import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { inventoryApi, userApi } from '../services/api';
import { mockInventoryItems, mockUser } from '../services/mockData';
import type { FilterOptions, UpdateInventoryDto } from '../types';

// Use mock data for demo purposes
const USE_MOCK_DATA = true;

function InventoryList() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState<FilterOptions>({
    search: '',
    hardwareType: '',
    needsReorder: undefined,
    sortBy: 'itemnumber',
    sortDesc: false,
  });

  // Handle URL query parameters for filtered views
  useEffect(() => {
    const filterParam = searchParams.get('filter');
    if (filterParam === 'lowstock') {
      setFilters(prev => ({ ...prev, needsReorder: true }));
    }
  }, [searchParams]);

  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [assignments, setAssignments] = useState<Array<{
    id: string;
    quantity: number;
    assignedTo: string;
    ticketUrl: string;
  }>>([{ id: '1', quantity: 1, assignedTo: '', ticketUrl: '' }]);
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [activeSearchIndex, setActiveSearchIndex] = useState<number | null>(null);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: USE_MOCK_DATA ? async () => mockUser : userApi.getCurrentUser,
  });

  const { data: rawItems, isLoading } = useQuery({
    queryKey: ['inventory'],
    queryFn: USE_MOCK_DATA ? async () => mockInventoryItems : () => inventoryApi.getAll({}),
  });

  // Apply filtering and sorting client-side
  const items = useMemo(() => {
    if (!rawItems) return [];

    let filtered = [...rawItems];

    // Apply filters
    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(item =>
        item.itemNumber.toLowerCase().includes(search) ||
        item.hardwareDescription.toLowerCase().includes(search)
      );
    }

    if (filters.hardwareType) {
      filtered = filtered.filter(item => item.hardwareType === filters.hardwareType);
    }

    if (filters.needsReorder !== undefined) {
      filtered = filtered.filter(item => item.needsReorder === filters.needsReorder);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (filters.sortBy) {
        case 'itemnumber':
          aVal = a.itemNumber.toLowerCase();
          bVal = b.itemNumber.toLowerCase();
          break;
        case 'description':
          aVal = a.hardwareDescription.toLowerCase();
          bVal = b.hardwareDescription.toLowerCase();
          break;
        case 'type':
          aVal = a.hardwareType.toLowerCase();
          bVal = b.hardwareType.toLowerCase();
          break;
        case 'quantity':
          aVal = a.currentQuantity;
          bVal = b.currentQuantity;
          break;
        case 'cost':
          aVal = a.cost;
          bVal = b.cost;
          break;
        case 'modified':
          aVal = new Date(a.lastModifiedDate).getTime();
          bVal = new Date(b.lastModifiedDate).getTime();
          break;
        default:
          aVal = a.itemNumber.toLowerCase();
          bVal = b.itemNumber.toLowerCase();
      }

      if (aVal < bVal) return filters.sortDesc ? 1 : -1;
      if (aVal > bVal) return filters.sortDesc ? -1 : 1;
      return 0;
    });

    return filtered;
  }, [rawItems, filters]);

  const { data: hardwareTypes } = useQuery({
    queryKey: ['hardwareTypes'],
    queryFn: USE_MOCK_DATA ? async () => {
      const types = [...new Set(mockInventoryItems.map(item => item.hardwareType))];
      return types.sort();
    } : inventoryApi.getHardwareTypes,
  });

  const updateMutation = useMutation({
    mutationFn: (dto: UpdateInventoryDto) => inventoryApi.updateQuantity(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      closeModal();
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
    setAssignments([{ id: '1', quantity: 1, assignedTo: '', ticketUrl: '' }]);
    setShowUpdateModal(true);
  };

  const addAssignment = () => {
    // Validate current assignments before adding new one
    const hasEmptyAssignments = assignments.some(a => !a.assignedTo || a.quantity <= 0);
    if (hasEmptyAssignments) {
      alert('Please complete all existing assignments before adding a new one.');
      return;
    }

    setAssignments([...assignments, {
      id: Date.now().toString(),
      quantity: 1,
      assignedTo: '',
      ticketUrl: ''
    }]);
  };

  const removeAssignment = (id: string) => {
    if (assignments.length > 1) {
      setAssignments(assignments.filter(a => a.id !== id));
    }
  };

  const updateAssignment = (id: string, field: string, value: any) => {
    setAssignments(assignments.map(a =>
      a.id === id ? { ...a, [field]: value } : a
    ));
  };

  const handleUserSearch = async (query: string, index: number) => {
    setActiveSearchIndex(index);

    if (query.length >= 2) {
      // Mock AD search - in production, this would call userApi.searchUsers
      const mockUsers = [
        'john.doe@company.com',
        'jane.smith@company.com',
        'mike.johnson@company.com',
        'sarah.williams@company.com',
        'david.brown@company.com',
        'emily.davis@company.com',
        'chris.martinez@company.com',
        'amanda.taylor@company.com',
      ];
      const filtered = mockUsers.filter(u => u.toLowerCase().includes(query.toLowerCase()));
      setSearchResults(filtered);
    } else {
      setSearchResults([]);
    }
  };

  const selectUser = (user: string, assignmentId: string) => {
    updateAssignment(assignmentId, 'assignedTo', user);
    setSearchResults([]);
    setActiveSearchIndex(null);
  };

  const handleUpdate = () => {
    if (!selectedItem) return;

    // Validate all assignments
    const invalidAssignments = assignments.filter(a => !a.assignedTo || a.quantity <= 0);
    if (invalidAssignments.length > 0) {
      alert('Please ensure all assignments have a user selected and quantity greater than 0.');
      return;
    }

    // Calculate total quantity being assigned
    const totalQuantity = assignments.reduce((sum, a) => sum + a.quantity, 0);

    // Check if we have enough inventory
    const currentItem = items?.find(item => item.itemNumber === selectedItem);
    if (currentItem && totalQuantity > currentItem.currentQuantity) {
      alert(`Cannot assign ${totalQuantity} items. Only ${currentItem.currentQuantity} available in stock.`);
      return;
    }

    // Validate ServiceNow URLs if provided
    const invalidUrls = assignments.filter(a =>
      a.ticketUrl && !a.ticketUrl.match(/^https?:\/\/.+/)
    );
    if (invalidUrls.length > 0) {
      alert('Please enter valid URLs for ServiceNow tickets (must start with http:// or https://)');
      return;
    }

    // In a real implementation, you'd process each assignment separately
    // For now, we'll submit the first one as an example
    const firstAssignment = assignments[0];

    updateMutation.mutate({
      itemNumber: selectedItem,
      quantityChange: -totalQuantity, // Negative because we're removing from inventory
      serviceNowTicketUrl: firstAssignment.ticketUrl || undefined,
      assignedToUser: firstAssignment.assignedTo || undefined,
    });
  };

  const closeModal = () => {
    setShowUpdateModal(false);
    setSelectedItem(null);
    setAssignments([{ id: '1', quantity: 1, assignedTo: '', ticketUrl: '' }]);
    setSearchResults([]);
    setActiveSearchIndex(null);
  };

  if (isLoading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p style={{ marginTop: '1rem', color: '#6b7280' }}>Loading inventory...</p>
      </div>
    );
  }

  if (!items) {
    return (
      <div className="alert alert-error">
        <strong>Error:</strong> Failed to load inventory data. Please refresh the page.
      </div>
    );
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
                        style={{ fontSize: '0.8125rem', padding: '0.5rem 1rem' }}
                      >
                        Assign
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
          overflow: 'auto',
          padding: '2rem',
        }}>
          <div className="card" style={{ width: '700px', maxWidth: '100%', maxHeight: '90vh', overflow: 'auto' }}>
            <h2>Assign Assets: {selectedItem}</h2>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              Assign this item to one or more users. Each assignment will reduce the inventory count.
            </p>

            {/* Assignments List */}
            <div style={{ marginBottom: '1rem' }}>
              {assignments.map((assignment, index) => (
                <div key={assignment.id} style={{
                  padding: '1rem',
                  marginBottom: '1rem',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  backgroundColor: '#f9fafb',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <h3 style={{ fontSize: '0.9375rem', fontWeight: '600', color: '#374151' }}>
                      Assignment #{index + 1}
                    </h3>
                    {assignments.length > 1 && (
                      <button
                        className="btn btn-danger"
                        style={{ padding: '0.25rem 0.75rem', fontSize: '0.8125rem' }}
                        onClick={() => removeAssignment(assignment.id)}
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="form-group">
                    <label>Quantity <span style={{ color: '#dc2626' }}>*</span></label>
                    <input
                      type="number"
                      min="1"
                      className="form-control"
                      value={assignment.quantity}
                      onChange={e => {
                        const value = parseInt(e.target.value);
                        if (value > 0 || e.target.value === '') {
                          updateAssignment(assignment.id, 'quantity', value || 1);
                        }
                      }}
                      placeholder="1"
                      required
                      aria-required="true"
                    />
                  </div>

                  <div className="form-group" style={{ position: 'relative' }}>
                    <label>Assign To (User Email) <span style={{ color: '#dc2626' }}>*</span></label>
                    <input
                      type="email"
                      className="form-control"
                      value={assignment.assignedTo}
                      onChange={e => {
                        updateAssignment(assignment.id, 'assignedTo', e.target.value.trim());
                        handleUserSearch(e.target.value.trim(), index);
                      }}
                      placeholder="Search user by email..."
                      required
                      aria-required="true"
                      aria-label="User email address"
                    />
                    {searchResults.length > 0 && activeSearchIndex === index && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '0.375rem',
                        marginTop: '0.25rem',
                        maxHeight: '200px',
                        overflow: 'auto',
                        zIndex: 1001,
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      }}>
                        {searchResults.map(user => (
                          <div
                            key={user}
                            onClick={() => selectUser(user, assignment.id)}
                            style={{
                              padding: '0.625rem 0.75rem',
                              cursor: 'pointer',
                              borderBottom: '1px solid #f3f4f6',
                              fontSize: '0.875rem',
                            }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'white'}
                          >
                            {user}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>ServiceNow Ticket URL (Optional)</label>
                    <input
                      type="url"
                      className="form-control"
                      value={assignment.ticketUrl}
                      onChange={e => updateAssignment(assignment.id, 'ticketUrl', e.target.value.trim())}
                      placeholder="https://servicenow.company.com/ticket/..."
                      pattern="https?://.+"
                      aria-label="ServiceNow ticket URL"
                    />
                    {assignment.ticketUrl && !assignment.ticketUrl.match(/^https?:\/\/.+/) && (
                      <small style={{ color: '#dc2626', fontSize: '0.75rem' }}>
                        Please enter a valid URL (must start with http:// or https://)
                      </small>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Add Another Button */}
            <button
              className="btn btn-secondary"
              onClick={addAssignment}
              style={{ marginBottom: '1.5rem', width: '100%' }}
            >
              + Add Another Assignment
            </button>

            {/* Summary */}
            <div style={{
              padding: '1rem',
              backgroundColor: '#f0fdf4',
              border: '1px solid #86efac',
              borderRadius: '0.5rem',
              marginBottom: '1.5rem',
            }}>
              <strong style={{ color: '#166534' }}>Total Quantity to Assign: </strong>
              <span style={{ color: '#166534', fontSize: '1.25rem', fontWeight: '700' }}>
                {assignments.reduce((sum, a) => sum + a.quantity, 0)}
              </span>
              <div style={{ fontSize: '0.8125rem', color: '#15803d', marginTop: '0.25rem' }}>
                This will be removed from inventory
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
              <button
                className="btn btn-secondary"
                onClick={closeModal}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleUpdate}
                disabled={updateMutation.isPending || assignments.some(a => !a.assignedTo)}
              >
                {updateMutation.isPending ? 'Assigning...' : 'Assign Assets'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default InventoryList;
