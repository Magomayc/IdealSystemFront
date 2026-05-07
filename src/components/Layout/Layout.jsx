import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../Sidebar/Sidebar'; // Verifique se o caminho está correto
import { Topbar } from '../Topbar/Topbar';   // Verifique se o caminho está correto
import styles from './Layout.module.css';

export function Layout() {
  return (
    <div className={styles.container}>
      {/* Barra Lateral Fixa */}
      <Sidebar />
      
      {/* Área da Direita (Topbar + Conteúdo) */}
      <div className={styles.mainContent}>
        
        {/* Barra Superior */}
        <Topbar />
        
        {/* Área onde as páginas (Menu, Usuario, etc) são carregadas */}
        <main className={styles.pageContent}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}