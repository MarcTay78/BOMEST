import { NavLink } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export function AppNav() {
  const { signOut } = useAuth();
  return (
    <nav className="app-nav">
      <span className="nav-brand">ESTAY</span>
      <NavLink to="/products">Products</NavLink>
      <NavLink to="/materials">Materials</NavLink>
      <NavLink to="/dashboard">Dashboard</NavLink>
      <button type="button" className="linklike" onClick={() => signOut()}>Log out</button>
    </nav>
  );
}
