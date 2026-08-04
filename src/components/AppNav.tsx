import { NavLink } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useCssVarHeight } from '../lib/useCssVarHeight';

export function AppNav() {
  const { signOut } = useAuth();
  const navRef = useCssVarHeight<HTMLElement>('--nav-h');
  return (
    <nav className="app-nav" ref={navRef}>
      <span className="nav-brand">ESTAY</span>
      <NavLink to="/products">Products</NavLink>
      <NavLink to="/hardware">Hardware</NavLink>
      <NavLink to="/materials">Materials</NavLink>
      <NavLink to="/dashboard">Dashboard</NavLink>
      <NavLink to="/lists">Lists</NavLink>
      <button type="button" className="linklike" onClick={() => signOut()}>Log out</button>
    </nav>
  );
}
