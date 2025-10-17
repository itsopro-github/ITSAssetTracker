import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { csvApi } from '../services/api';

function CsvUpload() {
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<any>(null);

  const uploadMutation = useMutation({
    mutationFn: (file: File) => csvApi.upload(file),
    onSuccess: (data) => {
      setUploadResult(data);
      setSelectedFile(null);
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
    onError: (error: any) => {
      alert(`Error uploading CSV: ${error.response?.data || error.message}`);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setUploadResult(null);
    }
  };

  const handleUpload = () => {
    if (!selectedFile) {
      alert('Please select a file first');
      return;
    }

    uploadMutation.mutate(selectedFile);
  };

  const handleDownloadTemplate = async () => {
    try {
      const blob = await csvApi.downloadTemplate();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'inventory_template.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error: any) {
      alert(`Error downloading template: ${error.message}`);
    }
  };

  return (
    <div>
      <h1 className="mb-3">CSV Bulk Upload</h1>

      {/* Instructions */}
      <div className="card">
        <h2>Instructions</h2>
        <ol style={{ paddingLeft: '1.5rem' }}>
          <li>Download the CSV template below</li>
          <li>Fill in your inventory data following the template format</li>
          <li>Upload the completed CSV file</li>
          <li>Review the results and any errors</li>
        </ol>

        <p className="mt-2"><strong>CSV Format:</strong></p>
        <ul style={{ paddingLeft: '1.5rem' }}>
          <li><strong>Item Number:</strong> Unique identifier (required)</li>
          <li><strong>Hardware Description:</strong> Description of the item (required)</li>
          <li><strong>Hardware Type:</strong> Category/type (required)</li>
          <li><strong>Cost:</strong> Unit cost (required)</li>
          <li><strong>Minimum Threshold:</strong> Minimum quantity before reorder alert (required)</li>
          <li><strong>Reorder Amount:</strong> Recommended reorder quantity (required)</li>
          <li><strong>Current Quantity:</strong> Current stock level (required)</li>
          <li><strong>Audit User:</strong> Username for audit trail (optional)</li>
          <li><strong>Audit Date:</strong> Date of audit (optional)</li>
          <li><strong>ServiceNow Ticket URL:</strong> Related ticket (optional)</li>
        </ul>

        <div className="mt-2">
          <button className="btn btn-secondary" onClick={handleDownloadTemplate}>
            Download CSV Template
          </button>
        </div>
      </div>

      {/* Upload Form */}
      <div className="card">
        <h2>Upload CSV File</h2>

        <div className="form-group">
          <label>Select CSV File</label>
          <input
            type="file"
            className="form-control"
            accept=".csv"
            onChange={handleFileChange}
          />
          {selectedFile && (
            <small className="mt-1" style={{ display: 'block' }}>
              Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
            </small>
          )}
        </div>

        <button
          className="btn btn-primary"
          onClick={handleUpload}
          disabled={!selectedFile || uploadMutation.isPending}
        >
          {uploadMutation.isPending ? 'Uploading...' : 'Upload and Process'}
        </button>
      </div>

      {/* Upload Results */}
      {uploadResult && (
        <div className="card">
          <h2>Upload Results</h2>

          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            <div className="stat-card">
              <h3>Successful</h3>
              <div className="value" style={{ color: '#388e3c' }}>{uploadResult.successCount}</div>
            </div>
            <div className="stat-card">
              <h3>Failed</h3>
              <div className="value" style={{ color: '#d32f2f' }}>{uploadResult.failureCount}</div>
            </div>
            <div className="stat-card">
              <h3>Low Stock Alerts</h3>
              <div className="value" style={{ color: '#f57c00' }}>{uploadResult.lowStockAlerts?.length || 0}</div>
            </div>
          </div>

          {uploadResult.errors && uploadResult.errors.length > 0 && (
            <div className="mt-3">
              <h3>Errors</h3>
              <div className="alert alert-error">
                <ul style={{ paddingLeft: '1.5rem', margin: 0 }}>
                  {uploadResult.errors.map((error: string, index: number) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {uploadResult.lowStockAlerts && uploadResult.lowStockAlerts.length > 0 && (
            <div className="mt-3">
              <h3>Low Stock Alerts Sent</h3>
              <div className="alert alert-warning">
                <ul style={{ paddingLeft: '1.5rem', margin: 0 }}>
                  {uploadResult.lowStockAlerts.map((alert: string, index: number) => (
                    <li key={index}>{alert}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {uploadResult.successCount > 0 && uploadResult.failureCount === 0 && (
            <div className="alert alert-success mt-3">
              All records processed successfully! Email notifications have been sent for any low stock items.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default CsvUpload;
