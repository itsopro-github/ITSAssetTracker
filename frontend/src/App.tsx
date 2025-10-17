import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { userApi } from './services/api';
import Dashboard from './pages/Dashboard';
import InventoryList from './pages/InventoryList';
import CsvUpload from './pages/CsvUpload';
import Configuration from './pages/Configuration';
import './index.css';

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
    queryFn: userApi.getCurrentUser,
  });

  return (
    <nav className="navbar">
      <div className="navbar-content">
        <h1>ITS Asset Tracker</h1>
        <nav>
          <Link to="/">Dashboard</Link>
          <Link to="/inventory">Inventory</Link>
          {user?.roles.isServiceDesk && <Link to="/upload">CSV Upload</Link>}
          {user?.roles.isAdmin && <Link to="/config">Configuration</Link>}
        </nav>
        {user && (
          <div className="user-info">
            Logged in as: {user.username}
            {user.roles.isServiceDesk && ' (Service Desk)'}
            {user.roles.isReadOnly && !user.roles.isServiceDesk && ' (Read Only)'}
          </div>
        )}
      </div>
    </nav>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="App">
          <Navigation />
          <div className="container">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/inventory" element={<InventoryList />} />
              <Route path="/upload" element={<CsvUpload />} />
              <Route path="/config" element={<Configuration />} />
            </Routes>
          </div>
        </div>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
