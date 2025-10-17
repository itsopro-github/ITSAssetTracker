import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { csvApi, configApi, inventoryApi, userApi } from '../services/api';
import { mockUser, mockInventoryItems } from '../services/mockData';
import type { NotificationConfig, InventoryItem } from '../types';

// Use mock data for demo purposes
const USE_MOCK_DATA = true;

function AdminPanel() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'inventory' | 'upload' | 'config'>('inventory');

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
        <p style={{ color: '#6b7280', fontSize: '1rem' }}>Manage inventory, upload data, and configure system settings</p>
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
          <button
            onClick={() => setActiveTab('config')}
            style={{
              padding: '0.75rem 1.5rem',
              border: 'none',
              background: 'none',
              fontSize: '0.9375rem',
              fontWeight: '500',
              cursor: 'pointer',
              borderBottom: activeTab === 'config' ? '2px solid #059669' : '2px solid transparent',
              color: activeTab === 'config' ? '#059669' : '#6b7280',
              marginBottom: '-2px',
            }}
          >
            Configuration
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'inventory' && <InventoryManagement />}
      {activeTab === 'upload' && <CsvUploadTab />}
      {activeTab === 'config' && <ConfigurationTab />}
    </div>
  );
}

// Inventory Management Tab
function InventoryManagement() {
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const { data: items, isLoading } = useQuery({
    queryKey: ['inventory'],
    queryFn: USE_MOCK_DATA ? async () => mockInventoryItems : () => inventoryApi.getAll({}),
  });

  const openEditModal = (item: InventoryItem) => {
    setEditingItem({ ...item });
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingItem(null);
  };

  const updateField = (field: keyof InventoryItem, value: any) => {
    if (editingItem) {
      setEditingItem({ ...editingItem, [field]: value });
    }
  };

  const handleSave = () => {
    // In production, this would call an API to update the item
    alert('Item updated successfully (demo mode)');
    closeEditModal();
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
                    <button
                      className="btn btn-secondary"
                      onClick={() => openEditModal(item)}
                      style={{ fontSize: '0.8125rem', padding: '0.5rem 1rem' }}
                    >
                      Edit
                    </button>
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
                value={editingItem.hardwareDescription}
                onChange={e => updateField('hardwareDescription', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Hardware Type</label>
              <input
                type="text"
                className="form-control"
                value={editingItem.hardwareType}
                onChange={e => updateField('hardwareType', e.target.value)}
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

// Configuration Tab
function ConfigurationTab() {
  const [config, setConfig] = useState({
    adGroupName: 'ITS-ServiceDesk-Team',
    additionalEmailRecipients: 'admin@company.com, manager@company.com',
  });

  const handleSave = () => {
    // In production, this would call configApi.updateNotificationConfig(config)
    alert('Configuration saved successfully (demo mode)');
  };

  return (
    <div>
      <div className="card">
        <h2>Notification Configuration</h2>
        <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
          Configure who receives low stock notifications
        </p>

        <div className="form-group">
          <label>Active Directory Group Name</label>
          <input
            type="text"
            className="form-control"
            value={config.adGroupName}
            onChange={e => setConfig({ ...config, adGroupName: e.target.value })}
            placeholder="e.g., ITS-ServiceDesk-Team"
          />
          <small>Members of this AD group will receive low stock alerts</small>
        </div>

        <div className="form-group">
          <label>Additional Email Recipients</label>
          <textarea
            className="form-control"
            rows={3}
            value={config.additionalEmailRecipients}
            onChange={e => setConfig({ ...config, additionalEmailRecipients: e.target.value })}
            placeholder="Comma-separated email addresses"
          />
          <small>Additional emails to notify (comma-separated)</small>
        </div>

        <button className="btn btn-primary" onClick={handleSave}>
          Save Configuration
        </button>
      </div>
    </div>
  );
}

export default AdminPanel;
