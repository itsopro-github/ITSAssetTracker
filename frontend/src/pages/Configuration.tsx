import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { configApi } from '../services/api';

function Configuration() {
  const queryClient = useQueryClient();
  const [adGroupName, setAdGroupName] = useState('');
  const [additionalEmails, setAdditionalEmails] = useState('');

  const { data: config, isLoading } = useQuery({
    queryKey: ['notificationConfig'],
    queryFn: configApi.getNotificationConfig,
  });

  useEffect(() => {
    if (config) {
      setAdGroupName(config.adGroupName);
      setAdditionalEmails(config.additionalEmailRecipients || '');
    }
  }, [config]);

  const updateMutation = useMutation({
    mutationFn: () => configApi.updateNotificationConfig({
      id: config?.id || 1,
      adGroupName,
      additionalEmailRecipients: additionalEmails,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificationConfig'] });
      alert('Configuration updated successfully');
    },
    onError: (error: any) => {
      alert(`Error updating configuration: ${error.response?.data || error.message}`);
    },
  });

  const handleSave = () => {
    if (!adGroupName.trim()) {
      alert('AD Group Name is required');
      return;
    }

    updateMutation.mutate();
  };

  if (isLoading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  return (
    <div>
      <h1 className="mb-3">System Configuration</h1>

      <div className="card">
        <h2>Email Notification Settings</h2>
        <p>Configure who receives low stock alert notifications.</p>

        <div className="form-group">
          <label>Active Directory Group Name</label>
          <input
            type="text"
            className="form-control"
            value={adGroupName}
            onChange={e => setAdGroupName(e.target.value)}
            placeholder="e.g., IT_Governance"
          />
          <small>Members of this AD group will receive low stock email alerts.</small>
        </div>

        <div className="form-group">
          <label>Additional Email Recipients</label>
          <textarea
            className="form-control"
            rows={4}
            value={additionalEmails}
            onChange={e => setAdditionalEmails(e.target.value)}
            placeholder="email1@company.com, email2@company.com"
            style={{ resize: 'vertical' }}
          />
          <small>Enter additional email addresses separated by commas. These addresses will receive alerts in addition to the AD group members.</small>
        </div>

        <button
          className="btn btn-primary"
          onClick={handleSave}
          disabled={updateMutation.isPending}
        >
          {updateMutation.isPending ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>

      <div className="card">
        <h2>SMTP Email Settings</h2>
        <div className="alert alert-info">
          SMTP settings are configured in the backend <code>appsettings.json</code> file.
          Contact your system administrator to modify these settings.
        </div>

        <p><strong>Current Configuration Location:</strong></p>
        <code style={{ display: 'block', padding: '1rem', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
          backend/ITSAssetTracker.API/appsettings.json
        </code>

        <p className="mt-2"><strong>Required Settings:</strong></p>
        <ul style={{ paddingLeft: '1.5rem' }}>
          <li>SmtpHost: SMTP server address</li>
          <li>SmtpPort: SMTP server port (usually 587 for TLS)</li>
          <li>SmtpUsername: SMTP authentication username (if required)</li>
          <li>SmtpPassword: SMTP authentication password (if required)</li>
          <li>FromAddress: Email sender address</li>
          <li>FromName: Email sender display name</li>
          <li>EnableSsl: Enable SSL/TLS encryption</li>
        </ul>
      </div>

      <div className="card">
        <h2>Active Directory Settings</h2>
        <div className="alert alert-info">
          The application is configured to use Windows Authentication with your Active Directory.
        </div>

        <p><strong>Configured AD Groups:</strong></p>
        <ul style={{ paddingLeft: '1.5rem' }}>
          <li><strong>IT_ServiceDesk:</strong> Full access - can upload CSV, update inventory, and configure settings</li>
          <li><strong>IT_ReadOnly:</strong> Read-only access - can view dashboard and inventory</li>
        </ul>

        <p className="mt-2"><small>Users must be members of one of these groups to access the application.</small></p>
      </div>
    </div>
  );
}

export default Configuration;
