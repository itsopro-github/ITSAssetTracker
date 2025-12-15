import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { inventoryApi, userApi } from '../services/api';
import { mockInventoryItems, mockUser } from '../services/mockData';
import type { FilterOptions, UpdateInventoryDto } from '../types';

// Use mock data for demo purposes
const USE_MOCK_DATA = false;

function InventoryList() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState<FilterOptions>({
    search: '',
    assetType: '',
    category: '',
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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: number; itemNumber: string } | null>(null);
  const [assignments, setAssignments] = useState<Array<{
    id: string;
    quantity: number;
    assignedTo: string;
    ticketUrl: string;
  }>>([{ id: '1', quantity: 1, assignedTo: '', ticketUrl: '' }]);
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [activeSearchIndex, setActiveSearchIndex] = useState<number | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [tileFilter, setTileFilter] = useState<'all' | 'Hardware' | 'Software'>('all');


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
        (item.description && item.description.toLowerCase().includes(search)) ||
        (item.hardwareDescription && item.hardwareDescription.toLowerCase().includes(search))
      );
    }

    if (filters.assetType) {
      filtered = filtered.filter(item => item.assetType === filters.assetType);
    }

    if (filters.category) {
      filtered = filtered.filter(item =>
        item.category === filters.category || item.hardwareType === filters.category
      );
    }

    // Legacy filter support
    if (filters.hardwareType) {
      filtered = filtered.filter(item =>
        item.hardwareType === filters.hardwareType || item.category === filters.hardwareType
      );
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
          aVal = (a.description || a.hardwareDescription || '').toLowerCase();
          bVal = (b.description || b.hardwareDescription || '').toLowerCase();
          break;
        case 'assettype':
          aVal = a.assetType.toLowerCase();
          bVal = b.assetType.toLowerCase();
          break;
        case 'category':
        case 'type':
          aVal = (a.category || a.hardwareType || '').toLowerCase();
          bVal = (b.category || b.hardwareType || '').toLowerCase();
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
      console.error('Update error:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.details || error.message || 'Unknown error occurred';
      alert(`Error updating inventory: ${errorMessage}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => inventoryApi.deleteItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      setShowDeleteModal(false);
      setItemToDelete(null);
      alert('Item deleted successfully');
    },
    onError: (error: any) => {
      alert(`Error deleting item: ${error.response?.data?.error || error.message}`);
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
      try {
        // Search Active Directory by name/username
        const users = await userApi.searchUsers(query);
        setSearchResults(users);
      } catch (error) {
        console.error('Error searching users:', error);
        setSearchResults([]);
      }
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

  const openDeleteModal = (id: number, itemNumber: string) => {
    setItemToDelete({ id, itemNumber });
    setShowDeleteModal(true);
  };

  const handleDelete = () => {
    if (itemToDelete) {
      deleteMutation.mutate(itemToDelete.id);
    }
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setItemToDelete(null);
  };

  // Define permissions before early returns to avoid hook ordering issues
  const canEdit = user?.roles.isServiceDesk;
  const isAdmin = user?.roles.isAdmin;

  // Group items by category for tile view - MUST be before early returns
  const categoryTiles = useMemo(() => {
    if (!items) return [];

    const grouped = items.reduce((acc, item) => {
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
      items: typeof items;
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
  }, [items]);

  const filteredTiles = useMemo(() => {
    if (tileFilter === 'all') return categoryTiles;
    return categoryTiles.filter(tile => tile.assetType === tileFilter);
  }, [categoryTiles, tileFilter]);

  // Early returns AFTER all hooks are defined
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

  const toggleCategory = (category: string, assetType: string) => {
    const key = `${assetType}-${category}`;
    setExpandedCategory(expandedCategory === key ? null : key);
  };

  const handleTileAssign = (tile: typeof categoryTiles[0], e: React.MouseEvent) => {
    e.stopPropagation();
    // If only one item in the category, open assign modal directly
    if (tile.items.length === 1) {
      openUpdateModal(tile.items[0].itemNumber);
    } else {
      // If multiple items, expand the category to show all items
      toggleCategory(tile.category, tile.assetType);
    }
  };

  const renderExpandedCategory = () => {
    const tile = categoryTiles.find(t => `${t.assetType}-${t.category}` === expandedCategory);
    if (!tile) return null;

    return (
      <div className="card">
        <div className="card-header">
          <h2>{tile.category} - Detailed View</h2>
          <button
            className="btn btn-secondary"
            onClick={() => setExpandedCategory(null)}
            style={{ marginLeft: 'auto' }}
          >
            Close
          </button>
        </div>
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Item Number</th>
                <th>Description</th>
                <th>Quantity</th>
                <th>Cost</th>
                <th>Threshold</th>
                <th>Reorder Amt</th>
                <th>Last Modified</th>
                {canEdit && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {tile.items.map(item => (
                <tr key={item.id} style={item.needsReorder ? { backgroundColor: '#ffebee' } : {}}>
                  <td><strong>{item.itemNumber}</strong></td>
                  <td>{item.description || item.hardwareDescription}</td>
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
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          className="btn btn-primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            openUpdateModal(item.itemNumber);
                          }}
                          disabled={item.currentQuantity === 0}
                          style={{
                            fontSize: '0.8125rem',
                            padding: '0.5rem 1rem',
                            opacity: item.currentQuantity === 0 ? 0.5 : 1,
                            cursor: item.currentQuantity === 0 ? 'not-allowed' : 'pointer',
                          }}
                          title={item.currentQuantity === 0 ? 'Out of stock' : ''}
                        >
                          Assign
                        </button>
                        {isAdmin && (
                          <button
                            className="btn btn-danger"
                            onClick={(e) => {
                              e.stopPropagation();
                              openDeleteModal(item.id, item.itemNumber);
                            }}
                            style={{
                              fontSize: '0.8125rem',
                              padding: '0.5rem 0.75rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                            title="Delete item"
                            aria-label="Delete item"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                              <line x1="10" y1="11" x2="10" y2="17"></line>
                              <line x1="14" y1="11" x2="14" y2="17"></line>
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="card-header">
        <h1>Inventory Management</h1>
      </div>

      {/* Category Tiles Overview */}
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
            const isExpanded = expandedCategory === key;

            return (
              <div
                key={key}
                onClick={() => toggleCategory(tile.category, tile.assetType)}
                onKeyDown={(e) => e.key === 'Enter' && toggleCategory(tile.category, tile.assetType)}
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
                  boxShadow: isExpanded ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  if (!isExpanded) {
                    e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
                  }
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

                <div style={{ marginTop: '1rem' }}>
                  {canEdit && (
                    <button
                      className="btn btn-primary"
                      onClick={(e) => handleTileAssign(tile, e)}
                      disabled={tile.totalQuantity === 0}
                      style={{
                        fontSize: '0.875rem',
                        padding: '0.625rem 1rem',
                        width: '100%',
                        opacity: tile.totalQuantity === 0 ? 0.5 : 1,
                        cursor: tile.totalQuantity === 0 ? 'not-allowed' : 'pointer',
                      }}
                      title={tile.totalQuantity === 0 ? 'Out of stock' : ''}
                    >
                      {tile.items.length === 1 ? 'Assign' : `Assign (${tile.items.length} items)`}
                    </button>
                  )}
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

      {/* Expanded Category Details */}
      {expandedCategory && renderExpandedCategory()}

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
            <label>Asset Type</label>
            <select
              className="form-control"
              value={filters.assetType}
              onChange={e => setFilters(prev => ({ ...prev, assetType: e.target.value }))}
            >
              <option value="">All Assets</option>
              <option value="Hardware">Hardware</option>
              <option value="Software">Software</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Category</label>
            <select
              className="form-control"
              value={filters.category}
              onChange={e => setFilters(prev => ({ ...prev, category: e.target.value }))}
            >
              <option value="">All Categories</option>
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
                <th onClick={() => handleSort('assettype')}>
                  Asset Type {filters.sortBy === 'assettype' && (filters.sortDesc ? '↓' : '↑')}
                </th>
                <th onClick={() => handleSort('description')}>
                  Description {filters.sortBy === 'description' && (filters.sortDesc ? '↓' : '↑')}
                </th>
                <th onClick={() => handleSort('category')}>
                  Category {filters.sortBy === 'category' && (filters.sortDesc ? '↓' : '↑')}
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
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          className="btn btn-primary"
                          onClick={() => openUpdateModal(item.itemNumber)}
                          disabled={item.currentQuantity === 0}
                          style={{
                            fontSize: '0.8125rem',
                            padding: '0.5rem 1rem',
                            opacity: item.currentQuantity === 0 ? 0.5 : 1,
                            cursor: item.currentQuantity === 0 ? 'not-allowed' : 'pointer',
                          }}
                          title={item.currentQuantity === 0 ? 'Out of stock' : ''}
                        >
                          Assign
                        </button>
                        {isAdmin && (
                          <button
                            className="btn btn-danger"
                            onClick={() => openDeleteModal(item.id, item.itemNumber)}
                            style={{
                              fontSize: '0.8125rem',
                              padding: '0.5rem 0.75rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                            title="Delete item"
                            aria-label="Delete item"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                              <line x1="10" y1="11" x2="10" y2="17"></line>
                              <line x1="14" y1="11" x2="14" y2="17"></line>
                            </svg>
                          </button>
                        )}
                      </div>
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
                    <label>Assign To (Username) <span style={{ color: '#dc2626' }}>*</span></label>
                    <input
                      type="text"
                      className="form-control"
                      value={assignment.assignedTo}
                      onChange={e => {
                        updateAssignment(assignment.id, 'assignedTo', e.target.value.trim());
                        handleUserSearch(e.target.value.trim(), index);
                      }}
                      placeholder="Search user by name..."
                      required
                      aria-required="true"
                      aria-label="Username"
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

      {/* Delete Confirmation Modal */}
      {showDeleteModal && itemToDelete && (
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
            <h2 style={{ color: '#dc2626' }}>Delete Inventory Item</h2>
            <p style={{ marginBottom: '1.5rem', color: '#374151' }}>
              Are you sure you want to delete <strong>{itemToDelete.itemNumber}</strong>?
            </p>
            <div style={{
              padding: '1rem',
              backgroundColor: '#fef2f2',
              border: '1px solid #fca5a5',
              borderRadius: '0.5rem',
              marginBottom: '1.5rem',
            }}>
              <p style={{ color: '#991b1b', fontSize: '0.875rem', margin: 0 }}>
                <strong>Warning:</strong> This action cannot be undone. All audit history for this item will also be deleted.
              </p>
            </div>
            <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
              <button
                className="btn btn-secondary"
                onClick={closeDeleteModal}
                disabled={deleteMutation.isPending}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete Item'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default InventoryList;
