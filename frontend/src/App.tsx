import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { userApi } from './services/api';
import { mockUser } from './services/mockData';
import Dashboard from './pages/Dashboard';
import InventoryList from './pages/InventoryList';
import AdminPanel from './pages/AdminPanel';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

// Use mock data for demo purposes
const USE_MOCK_DATA = true;

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
          {user?.roles.isAdmin && <Link to="/admin">Admin</Link>}
        </nav>
        {user && (
          <div className="user-info">
            Logged in as: {user.username}
            {user.roles.isAdmin && ' (Admin)'}
            {user.roles.isServiceDesk && !user.roles.isAdmin && ' (Service Desk)'}
            {user.roles.isReadOnly && !user.roles.isServiceDesk && !user.roles.isAdmin && ' (Read Only)'}
          </div>
        )}
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
                <Route path="/admin" element={<AdminPanel />} />
              </Routes>
            </div>
          </div>
        </Router>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
