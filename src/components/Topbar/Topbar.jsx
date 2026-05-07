import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { User } from 'lucide-react'; 
import styles from './Topbar.module.css'; 

export function Topbar() {
  const [user, setUser] = useState({ nome: 'Usuário' });

  useEffect(() => {
    const stored = localStorage.getItem('usuario_dados');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch (e) {
        console.error("Erro ao ler dados do usuário", e);
      }
    }
  }, []);

  const primeiroNome = user.nome ? user.nome.split(' ')[0] : 'Usuário';

  return (
    <header className={styles.header}>
      
      {/* Lado Esquerdo vazio */}
      <div></div>

      {/* Lado Direito */}
      <div className={styles.rightSection}>
        
        {/* Link para o Perfil agrupando Nome e Ícone */}
        <Link to="/perfil" className={styles.avatarContainer}>
          
          {/* Nome do lado esquerdo */}
          <span className={styles.userName}>
            Olá, {primeiroNome}
          </span>
          
          {/* 👇 AJUSTADO: Ícone de usuário dentro do quadrado laranja */}
          <div className={styles.avatar}>
            <User size={22} strokeWidth={2.5} />
          </div>

        </Link>

      </div>
    </header>
  );
}