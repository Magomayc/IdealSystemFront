import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Tractor, LayoutDashboard, Users, LogOut, Beef, DollarSign, Wheat } from 'lucide-react'; 
import styles from './Sidebar.module.css';

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  // --- TRAVA DE SEGURANÇA (RBAC) BLINDADA ---
  const usuarioDados = localStorage.getItem('usuario_dados') || '{}';
  let usuario = {};
  try {
      usuario = JSON.parse(usuarioDados);
  } catch (e) {
      console.error("Erro ao ler usuário do localStorage");
  }
  
  const tipoID = usuario?.tipoUsuarioID || 
                 usuario?.TipoUsuarioID || 
                 usuario?.tipoUsuarioId || 
                 usuario?.tipo || 
                 (usuario?.data && usuario?.data?.tipoUsuarioID) || 
                 0;

  const isAdmin = Number(tipoID) === 1;

  const handleLogout = () => {
    // 👇 Aproveitei para garantir que tudo seja limpo no logout
    localStorage.removeItem('usuario_token'); 
    localStorage.removeItem('usuario_dados'); 
    localStorage.removeItem('user_token'); // Mantive o seu caso ele seja usado em outro lugar
    navigate('/login');
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <aside className={styles.sidebar}>
      
      {/* Topo / Logo */}
      <div className={styles.logoContainer}>
        <Link to="/menu" className={styles.logoTitle} title="Ir para o Início">
          <Tractor size={28} />
          <span>IdealSystem</span>
        </Link>
      </div>

      <nav className={styles.nav}>
        
        {/* Dashboard */}
        <Link 
          to="/menu" 
          className={`${styles.navLink} ${isActive('/menu') ? styles.activeLink : ''}`}
        >
          <LayoutDashboard size={22} />
          <span>Dashboard</span>
        </Link>

        {/* Animais */}
        <Link 
          to="/animais" 
          className={`${styles.navLink} ${isActive('/animais') ? styles.activeLink : ''}`}
        >
          <Beef size={22} />
          <span>Animais</span>
        </Link>
        
        {/* Vendas */}
        <Link 
          to="/vendas" 
          className={`${styles.navLink} ${isActive('/vendas') ? styles.activeLink : ''}`}
        >
          <DollarSign size={22} />
          <span>Vendas</span>
        </Link>

        {/* Milho / Estoque */}
        <Link 
          to="/milhos" 
          className={`${styles.navLink} ${location.pathname.startsWith('/milho') ? styles.activeLink : ''}`}
        >
          <Wheat size={22} />
          <span>Milho / Ração</span>
        </Link>

        {/* 👇 MÁGICA AQUI: O botão "Usuários" só aparece se for Admin */}
        {isAdmin && (
          <Link 
            to="/usuarios" 
            className={`${styles.navLink} ${isActive('/usuarios') ? styles.activeLink : ''}`}
          >
            <Users size={22} />
            <span>Usuários</span>
          </Link>
        )}
        
      </nav>

      <div className={styles.footer}>
        <button onClick={handleLogout} className={styles.logoutBtn}>
          <LogOut size={22} />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  );
}