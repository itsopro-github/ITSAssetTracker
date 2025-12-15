import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { userApi } from './services/api';
import { mockUser } from './services/mockData';
import Dashboard from './pages/Dashboard';
import InventoryList from './pages/InventoryList';
import AdminPanel from './pages/AdminPanel';
import AuditLog from './pages/AuditLog';
import Configuration from './pages/Configuration';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

// Use mock data for demo purposes
const USE_MOCK_DATA = false;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function Navigation() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: USE_MOCK_DATA ? async () => mockUser : userApi.getCurrentUser,
  });

  return (
    <nav className="navbar">
      <div className="navbar-content">
        <h1>ITS Asset Tracker</h1>
        <nav>
          <Link to="/">Dashboard</Link>
          <Link to="/inventory">Inventory</Link>
          <Link to="/audit-log">Audit Log</Link>
          {user?.roles.isAdmin && <Link to="/admin">Admin</Link>}
        </nav>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {user && (
            <div className="user-info">
              Logged in as: {user.username}
              {user.roles.isAdmin && ' (Admin)'}
              {user.roles.isServiceDesk && !user.roles.isAdmin && ' (Service Desk)'}
              {user.roles.isReadOnly && !user.roles.isServiceDesk && !user.roles.isAdmin && ' (Read Only)'}
            </div>
          )}
          {user?.roles.isAdmin && (
            <Link to="/configuration" title="Settings" style={{ display: 'flex', alignItems: 'center', color: 'inherit', textDecoration: 'none' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M12 2.69l1.36 1.36a2 2 0 0 0 2.83 0l.96-.96a10 10 0 0 1 2.12 2.12l-.96.96a2 2 0 0 0 0 2.83l1.36 1.36a10 10 0 0 1 0 3l-1.36 1.36a2 2 0 0 0 0 2.83l.96.96a10 10 0 0 1-2.12 2.12l-.96-.96a2 2 0 0 0-2.83 0L12 21.31l-1.36-1.36a2 2 0 0 0-2.83 0l-.96.96a10 10 0 0 1-2.12-2.12l.96-.96a2 2 0 0 0 0-2.83L4.33 14a10 10 0 0 1 0-3l1.36-1.36a2 2 0 0 0 0-2.83l-.96-.96a10 10 0 0 1 2.12-2.12l.96.96a2 2 0 0 0 2.83 0L12 2.69z"></path>
              </svg>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Router>
          <div className="App">
            <Navigation />
            <div className="container">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/inventory" element={<InventoryList />} />
                <Route path="/audit-log" element={<AuditLog />} />
                <Route path="/admin" element={<AdminPanel />} />
                <Route path="/configuration" element={<Configuration />} />
              </Routes>
            </div>
          </div>
        </Router>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
