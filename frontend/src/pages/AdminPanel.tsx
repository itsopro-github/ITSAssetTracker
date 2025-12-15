import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryApi, userApi } from '../services/api';
import { mockUser, mockInventoryItems } from '../services/mockData';
import type { InventoryItem } from '../types';

// Use mock data for demo purposes
const USE_MOCK_DATA = false;

function AdminPanel() {
  const [activeTab, setActiveTab] = useState<'inventory' | 'upload'>('inventory');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: USE_MOCK_DATA ? async () => mockUser : userApi.getCurrentUser,
  });

  // Check admin access
  if (!user?.roles.isAdmin) {
    return (
      <div className="card">
        <h1>Access Denied</h1>
        <p>You do not have permission to access this page.</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '700', color: '#111827', marginBottom: '0.5rem' }}>Admin Panel</h1>
        <p style={{ color: '#6b7280', fontSize: '1rem' }}>Manage inventory and upload data</p>
      </div>

      {/* Tab Navigation */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '2px solid #e5e7eb', paddingBottom: '0' }}>
          <button
            onClick={() => setActiveTab('inventory')}
            style={{
              padding: '0.75rem 1.5rem',
              border: 'none',
              background: 'none',
              fontSize: '0.9375rem',
              fontWeight: '500',
              cursor: 'pointer',
              borderBottom: activeTab === 'inventory' ? '2px solid #059669' : '2px solid transparent',
              color: activeTab === 'inventory' ? '#059669' : '#6b7280',
              marginBottom: '-2px',
            }}
          >
            Manage Inventory
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            style={{
              padding: '0.75rem 1.5rem',
              border: 'none',
              background: 'none',
              fontSize: '0.9375rem',
              fontWeight: '500',
              cursor: 'pointer',
              borderBottom: activeTab === 'upload' ? '2px solid #059669' : '2px solid transparent',
              color: activeTab === 'upload' ? '#059669' : '#6b7280',
              marginBottom: '-2px',
            }}
          >
            CSV Upload
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'inventory' && <InventoryManagement />}
      {activeTab === 'upload' && <CsvUploadTab />}
    </div>
  );
}

// Inventory Management Tab
function InventoryManagement() {
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: number; itemNumber: string } | null>(null);
  const queryClient = useQueryClient();

  const { data: items, isLoading } = useQuery({
    queryKey: ['inventory'],
    queryFn: USE_MOCK_DATA ? async () => mockInventoryItems : () => inventoryApi.getAll({}),
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

  const openEditModal = (item: InventoryItem) => {
    setEditingItem({ ...item });
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingItem(null);
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

  const updateField = (field: keyof InventoryItem, value: any) => {
    if (editingItem) {
      setEditingItem({ ...editingItem, [field]: value });
    }
  };

  const handleSave = async () => {
    if (!editingItem) return;

    try {
      await inventoryApi.updateItem(editingItem.id, editingItem);
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      alert('Item updated successfully');
      closeEditModal();
    } catch (error: any) {
      alert(`Error updating item: ${error.response?.data || error.message}`);
    }
  };

  if (isLoading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  return (
    <div>
      <div className="card">
        <h2>Inventory Items</h2>
        <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1rem' }}>
          Edit item details, costs, thresholds, and reorder amounts
        </p>
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Item Number</th>
                <th>Description</th>
                <th>Type</th>
                <th>Quantity</th>
                <th>Cost</th>
                <th>Threshold</th>
                <th>Reorder Amt</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items?.map(item => (
                <tr key={item.id}>
                  <td><strong>{item.itemNumber}</strong></td>
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
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        className="btn btn-secondary"
                        onClick={() => openEditModal(item)}
                        style={{ fontSize: '0.8125rem', padding: '0.5rem 1rem' }}
                      >
                        Edit
                      </button>
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
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && editingItem && (
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
          <div className="card" style={{ width: '600px', maxWidth: '100%', maxHeight: '90vh', overflow: 'auto' }}>
            <h2>Edit Item: {editingItem.itemNumber}</h2>

            <div className="form-group">
              <label>Item Number</label>
              <input
                type="text"
                className="form-control"
                value={editingItem.itemNumber}
                onChange={e => updateField('itemNumber', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <input
                type="text"
                className="form-control"
                value={editingItem.description || editingItem.hardwareDescription || ''}
                onChange={e => {
                  // Update the appropriate field based on asset type
                  if (editingItem.assetType === 'Software' || editingItem.description) {
                    updateField('description', e.target.value);
                  } else {
                    updateField('hardwareDescription', e.target.value);
                  }
                }}
              />
            </div>

            <div className="form-group">
              <label>Category / Type</label>
              <input
                type="text"
                className="form-control"
                value={editingItem.category || editingItem.hardwareType || ''}
                onChange={e => {
                  // Update the appropriate field based on asset type
                  if (editingItem.assetType === 'Software' || editingItem.category) {
                    updateField('category', e.target.value);
                  } else {
                    updateField('hardwareType', e.target.value);
                  }
                }}
              />
            </div>

            <div className="form-group">
              <label>Cost ($)</label>
              <input
                type="number"
                step="0.01"
                className="form-control"
                value={editingItem.cost}
                onChange={e => updateField('cost', parseFloat(e.target.value))}
              />
            </div>

            <div className="form-group">
              <label>Current Quantity</label>
              <input
                type="number"
                className="form-control"
                value={editingItem.currentQuantity}
                onChange={e => updateField('currentQuantity', parseInt(e.target.value))}
              />
            </div>

            <div className="form-group">
              <label>Minimum Threshold</label>
              <input
                type="number"
                className="form-control"
                value={editingItem.minimumThreshold}
                onChange={e => updateField('minimumThreshold', parseInt(e.target.value))}
              />
            </div>

            <div className="form-group">
              <label>Reorder Amount</label>
              <input
                type="number"
                className="form-control"
                value={editingItem.reorderAmount}
                onChange={e => updateField('reorderAmount', parseInt(e.target.value))}
              />
            </div>

            <div className="flex gap-2" style={{ justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button className="btn btn-secondary" onClick={closeEditModal}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSave}>
                Save Changes
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

// CSV Upload Tab
function CsvUploadTab() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    // In production, this would call csvApi.upload(selectedFile)
    setTimeout(() => {
      alert('CSV uploaded successfully (demo mode)');
      setUploading(false);
      setSelectedFile(null);
    }, 2000);
  };

  const handleDownloadTemplate = () => {
    // In production, this would call csvApi.downloadTemplate()
    alert('Downloading CSV template (demo mode)');
  };

  return (
    <div>
      <div className="card">
        <h2>CSV Upload</h2>
        <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
          Upload a CSV file to bulk update inventory items
        </p>

        <div className="alert alert-info" style={{ marginBottom: '1.5rem' }}>
          <strong>CSV Format:</strong> Your CSV should include columns for Item Number, Description, Type, Cost,
          Minimum Threshold, and Reorder Amount.
        </div>

        <div className="form-group">
          <label>Select CSV File</label>
          <input
            type="file"
            accept=".csv"
            className="form-control"
            onChange={handleFileChange}
          />
        </div>

        {selectedFile && (
          <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#f0fdf4', borderRadius: '0.375rem', border: '1px solid #86efac' }}>
            <strong style={{ color: '#166534' }}>Selected File: </strong>
            <span style={{ color: '#15803d' }}>{selectedFile.name}</span>
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            className="btn btn-primary"
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
          >
            {uploading ? 'Uploading...' : 'Upload CSV'}
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleDownloadTemplate}
          >
            Download Template
          </button>
        </div>
      </div>
    </div>
  );
}

export default AdminPanel;
