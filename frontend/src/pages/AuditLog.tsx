import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { inventoryApi } from '../services/api';
import { useNavigate } from 'react-router-dom';

function AuditLog() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const { data: auditHistory, isLoading } = useQuery({
    queryKey: ['auditHistory', debouncedSearch],
    queryFn: () => inventoryApi.getAllAuditHistory({ search: debouncedSearch || undefined }),
  });

  // Debounce search input
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    const timer = setTimeout(() => {
      setDebouncedSearch(value);
    }, 300);
    return () => clearTimeout(timer);
  };

  if (isLoading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p style={{ marginTop: '1rem', color: '#6b7280' }}>Loading audit history...</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '700', color: '#111827', marginBottom: '0.5rem' }}>
          Audit Log
        </h1>
        <p style={{ color: '#6b7280', fontSize: '1rem' }}>
          View complete history of all inventory changes
        </p>
      </div>

      {/* Search Bar */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label htmlFor="search">Search Audit Log</label>
          <input
            id="search"
            type="text"
            className="form-control"
            placeholder="Search by item number, description, or changed by..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>
      </div>

      {/* Audit History Table */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2>Activity History</h2>
          <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>
            {auditHistory?.length || 0} records found
          </div>
        </div>

        {auditHistory && auditHistory.length > 0 ? (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Item Number</th>
                  <th>Asset Type</th>
                  <th>Description</th>
                  <th>Previous Qty</th>
                  <th>New Qty</th>
                  <th>Change</th>
                  <th>Changed By</th>
                  <th>ServiceNow Ticket</th>
                </tr>
              </thead>
              <tbody>
                {auditHistory.map((entry: any) => {
                  const change = entry.newQuantity - entry.previousQuantity;
                  const isIncrease = change > 0;
                  const isDecrease = change < 0;

                  return (
                    <tr
                      key={entry.id}
                      onClick={() => navigate('/inventory')}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>{new Date(entry.changeDate).toLocaleString()}</td>
                      <td>
                        <strong>{entry.item?.itemNumber || entry.itemNumber || 'N/A'}</strong>
                        {entry.serviceNowTicketUrl === 'ITEM DELETED' && (
                          <span style={{ color: '#dc2626', fontSize: '0.75rem', marginLeft: '0.5rem' }}>(Deleted)</span>
                        )}
                      </td>
                      <td>
                        <span
                          className="badge"
                          style={{
                            backgroundColor: entry.item?.assetType === 'Hardware' ? '#dbeafe' : entry.item?.assetType === 'Software' ? '#f3e8ff' : '#e5e7eb',
                            color: entry.item?.assetType === 'Hardware' ? '#1e40af' : entry.item?.assetType === 'Software' ? '#6b21a8' : '#6b7280',
                            border: entry.item?.assetType === 'Hardware' ? '1px solid #93c5fd' : entry.item?.assetType === 'Software' ? '1px solid #d8b4fe' : '1px solid #d1d5db',
                          }}
                        >
                          {entry.item?.assetType || '-'}
                        </span>
                      </td>
                      <td>{entry.item?.description || entry.item?.hardwareDescription || entry.itemDescription || 'N/A'}</td>
                      <td>{entry.previousQuantity}</td>
                      <td>{entry.newQuantity}</td>
                      <td>
                        <span
                          style={{
                            color: isIncrease ? '#059669' : isDecrease ? '#dc2626' : '#6b7280',
                            fontWeight: '600',
                          }}
                        >
                          {isIncrease && '+'}
                          {change}
                        </span>
                      </td>
                      <td>{entry.changedBy}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        {entry.serviceNowTicketUrl ? (
                          <a
                            href={entry.serviceNowTicketUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-secondary"
                            style={{ fontSize: '0.8125rem', padding: '0.375rem 0.75rem' }}
                          >
                            View Ticket
                          </a>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
            <p style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>No audit records found</p>
            <p style={{ fontSize: '0.875rem' }}>
              {searchTerm ? 'Try adjusting your search criteria' : 'Activity will appear here when inventory changes are made'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default AuditLog;
