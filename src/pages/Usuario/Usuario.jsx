import React, { useState, useEffect } from 'react';
import { Mail, Shield, Hash, User } from 'lucide-react'; 
import styles from './Usuario.module.css';

export function Usuario() {
  const [perfil, setPerfil] = useState(null);

  useEffect(() => {
    const dados = localStorage.getItem('usuario_dados');
    if (dados) {
      setPerfil(JSON.parse(dados));
    }
  }, []);

  if (!perfil) {
    return (
        <div className={styles.container}>
            <div className="text-slate-500 mt-10">Nenhum usuário logado.</div>
        </div>
    );
  }

  // --- TRAVA DE SEGURANÇA PADRONIZADA ---
  // Vasculha todas as formas que o C# pode ter mandado a variável
  const tipoID = perfil?.tipoUsuarioID || 
                 perfil?.TipoUsuarioID || 
                 perfil?.tipoUsuarioId || 
                 perfil?.tipo || 
                 (perfil?.data && perfil?.data?.tipoUsuarioID) || 
                 2;
  
  // Verifica se é 1 (Admin)
  const isAdmin = Number(tipoID) === 1;

  return (
    <div className={styles.container}>
      <div className={styles.contentWrapper}>
        
        {/* CABEÇALHO PADRÃO */}
        <div className={styles.header}>
          <div className={styles.titleWrapper}>
             <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
               <User className="text-orange-600" size={32}/> Meu Perfil
             </h1>
             <p className={styles.subtitle}>Informações da sua conta de acesso.</p>
          </div>
        </div>

        {/* CARTÃO DO PERFIL */}
        <div className={styles.cardContainer}>
          <div className={styles.card}>
            
            {/* Banner Laranja */}
            <div className={styles.banner}>
                <div className={styles.avatarWrapper}>
                    <div className={styles.avatar}>
                        <User size={40} strokeWidth={2.5} />
                    </div>
                </div>
            </div>

            {/* Conteúdo Central */}
            <div className={styles.content}>
                <h2 className={styles.name}>{perfil.nome || perfil.Nome}</h2>
                <p className={styles.email}>{perfil.email || perfil.Email}</p>
                
                {/* Badge de Nível */}
                <span className={`${styles.roleBadge} ${isAdmin ? styles.roleAdmin : styles.roleUser}`}>
                    {isAdmin ? 'Administrador do Sistema' : 'Usuário Comum'}
                </span>

                {/* Detalhes do Cadastro */}
                <div className={styles.detailsBox}>
                    
                    <div className={styles.detailItem}>
                        <div className={styles.iconBox}><Hash size={18}/></div>
                        <div className={styles.detailText}>
                            <span className={styles.label}>ID do Usuário</span>
                            <span className={styles.value}>#{perfil.id || perfil.Id}</span>
                        </div>
                    </div>

                    <div className={styles.detailItem}>
                        <div className={styles.iconBox}><Mail size={18}/></div>
                        <div className={styles.detailText}>
                            <span className={styles.label}>E-mail</span>
                            <span className={styles.value}>{perfil.email || perfil.Email}</span>
                        </div>
                    </div>

                    <div className={styles.detailItem}>
                        <div className={styles.iconBox}><Shield size={18}/></div>
                        <div className={styles.detailText}>
                            <span className={styles.label}>Nível de Acesso</span>
                            <span className={styles.value}>
                                {isAdmin ? 'Acesso Total (Admin)' : 'Acesso Limitado'}
                            </span>
                        </div>
                    </div>

                </div>
            </div>

          </div>
        </div>
        
      </div>
    </div>
  );
}