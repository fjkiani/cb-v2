import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { NewsDashboard } from './components/Dashboard/NewsDashboard';
import { RealTimeNews } from './components/News/RealTimeNews';
import AdminDashboard from './components/Admin/AdminDashboard';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';

// Create a client
const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<NewsDashboard />} />
            <Route path="/news" element={<RealTimeNews />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/dashboard" element={<NewsDashboard />} />
          </Routes>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;