import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Vault from './pages/Vault';
import Passwords from './pages/Passwords';
import Activity from './pages/Activity';
import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) return (
    <div className="h-screen w-screen flex items-center justify-center font-mono">
      <div className="animate-pulse">INITIALIZING SECURE SESSION...</div>
    </div>
  );
  
  if (!user) return <Navigate to="/login" />;
  
  return <>{children}</>;
}

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route 
            path="/" 
            element={
              <PrivateRoute>
                <Layout><Dashboard /></Layout>
              </PrivateRoute>
            } 
          />
          <Route 
            path="/vault" 
            element={
              <PrivateRoute>
                <Layout><Vault /></Layout>
              </PrivateRoute>
            } 
          />
          <Route 
            path="/passwords" 
            element={
              <PrivateRoute>
                <Layout><Passwords /></Layout>
              </PrivateRoute>
            } 
          />
          <Route 
            path="/activity" 
            element={
              <PrivateRoute>
                <Layout><Activity /></Layout>
              </PrivateRoute>
            } 
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
