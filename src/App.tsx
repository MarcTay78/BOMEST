import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { AppNav } from './components/AppNav';
import { Dashboard } from './pages/Dashboard';
import { Login } from './pages/Login';
import { Materials } from './pages/Materials';
import { NewProduct } from './pages/NewProduct';
import { ProductDetail } from './pages/ProductDetail';
import { ProductList } from './pages/ProductList';

function AppShell() {
  return (
    <>
      <AppNav />
      <Routes>
        <Route path="/" element={<Navigate to="/products" replace />} />
        <Route path="/products" element={<ProductList />} />
        <Route path="/products/new" element={<NewProduct />} />
        <Route path="/products/:id" element={<ProductDetail />} />
        <Route path="/materials" element={<Materials />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/*" element={<AppShell />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}

export default App;
