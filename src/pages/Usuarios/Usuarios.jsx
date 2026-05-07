import React, { useState, useEffect, useMemo } from 'react';
import api from '@/services/client'; 
import { Users, Trash2, Shield, User, Loader2, Plus, Pencil, Search, X, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { Link, useNavigate } from 'react-router-dom';
import styles from './Usuarios.module.css';

export function Usuarios() {
  const navigate = useNavigate();
  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // NOVO: Estado para a barra de busca
  const [busca, setBusca] = useState('');

  const fetchUsuarios = async () => {
    try {
      setLoading(true);
      const response = await api.get('/Usuario/Listar?ativo=true');
      
      let dados = [];
      if (Array.isArray(response.data)) dados = response.data;
      else if (response.data?.result) dados = response.data.result;
      else if (response.data?.data) dados = response.data.data;

      setLista(dados);
    } catch (error) {
      console.error("Erro:", error);
      toast.error("Erro ao carregar lista de usuários.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsuarios();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir este usuário?')) {
      try {
        await api.delete(`/Usuario/Deletar/${id}`);
        toast.success("Usuário excluído com sucesso!");
        fetchUsuarios(); 
      } catch (error) { 
        toast.error("Erro ao excluir usuário."); 
      }
    }
  };

  const renderBadge = (user) => {
    const tipo = Number(user.tipoUsuarioID || user.tipoUsuarioId || user.TipoUsuarioID || 2);
    
    if (tipo === 1) {
      return (
        <span className={`${styles.badge} ${styles.badgeAdmin}`}>
          <Shield size={14}/> Administrador
        </span>
      );
    }
    return (
      <span className={`${styles.badge} ${styles.badgeUser}`}>
        <User size={14}/> Usuário
      </span>
    );
  };

  // NOVO: Filtrar a lista com base na busca
  const usuariosFiltrados = useMemo(() => {
    if (!busca) return lista;
    const termo = busca.toLowerCase();
    return lista.filter(u => 
      (u.nome || u.Nome || '').toLowerCase().includes(termo) ||
      (u.email || u.Email || '').toLowerCase().includes(termo)
    );
  }, [lista, busca]);

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Loader2 className="animate-spin" size={40} />
        <span>Carregando usuários...</span>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.contentWrapper}>
        
        {/* CABEÇALHO PADRONIZADO */}
        <div className={styles.header}>
          <div className={styles.titleWrapper}>
             <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
               <Users className="text-orange-600" size={32}/> Gestão de Usuários
             </h1>
             <p className={styles.subtitle}>Gerencie os acessos e permissões do sistema.</p>
          </div>
          
          <Link to="/novoUsuario" className={styles.newButton}>
              <Plus size={18} /> Novo Usuário
          </Link>
        </div>

        {/* BARRA DE PESQUISA PADRONIZADA */}
        <div className={styles.filterCard}>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', flex: 1 }}>
              <div className={styles.inputGroup} style={{ flex: '1', maxWidth: '400px' }}>
                  <Search className={styles.inputIcon} size={18}/>
                  <input 
                      className={styles.input} 
                      placeholder="Buscar por nome ou e-mail..." 
                      value={busca} 
                      onChange={e => setBusca(e.target.value)}
                  />
              </div>

              {busca && (
                  <button onClick={() => setBusca('')} className={styles.cancelButton} title="Limpar busca">
                      <X size={18} />
                  </button>
              )}
          </div>
        </div>

        {/* TABELA PADRONIZADA */}
        <div className={styles.tableContainer}>
          <table className={styles.table}>
              <thead className={styles.thead}>
                  <tr>
                      <th style={{ width: '80px' }}>ID</th>
                      <th>Nome</th>
                      <th>E-mail</th>
                      <th>Nível de Acesso</th>
                      <th className={styles.textRight}>Ações</th>
                  </tr>
              </thead>
              <tbody className={styles.tbody}>
                  {usuariosFiltrados.map(u => (
                      <tr key={u.id || u.Id}>
                          <td className={styles.tdId}>#{u.id || u.Id}</td>
                          <td className={styles.tdBold}>{u.nome || u.Nome}</td>
                          <td style={{ color: '#64748b' }}>{u.email || u.Email}</td>
                          <td>{renderBadge(u)}</td>
                          
                          <td className={styles.textRight}>
                              <div className={styles.actionsWrapper}>
                                  
                                  <button 
                                      onClick={() => navigate(`/editarUsuario/${u.id || u.Id}`)} 
                                      className={`${styles.actionBtn} ${styles.btnBlue}`} 
                                      title="Editar Usuário"
                                  >
                                      <Pencil size={18}/>
                                  </button>

                                  <button 
                                      onClick={() => handleDelete(u.id || u.Id)} 
                                      className={`${styles.actionBtn} ${styles.btnRed}`}
                                      title="Excluir Usuário"
                                  >
                                      <Trash2 size={18}/>
                                  </button>
                                  
                              </div>
                          </td>
                      </tr>
                  ))}
                  
                  {usuariosFiltrados.length === 0 && (
                      <tr>
                          <td colSpan={5}>
                              <div className={styles.emptyState}>
                                  <Filter size={48} style={{ opacity: 0.2 }}/>
                                  <p>Nenhum usuário encontrado para esta busca.</p>
                              </div>
                          </td>
                      </tr>
                  )}
              </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}