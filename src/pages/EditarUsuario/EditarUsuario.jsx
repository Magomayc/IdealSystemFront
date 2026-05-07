import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Save, Loader2, ArrowLeft, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import usuarioAPI from '@/services/usuarioAPI';
import styles from './EditarUsuario.module.css'; 

export function EditarUsuario() {
  const { id } = useParams(); 
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [loadingDados, setLoadingDados] = useState(true);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    tipoUsuarioID: 2,
    senha: '',
  });

  // 1. Busca os dados ao carregar
  useEffect(() => {
    const carregarUsuario = async () => {
      try {
        const dados = await usuarioAPI.obterPorId(id);
        
        // BLINDAGEM: Vasculha todas as formas que o C# pode ter mandado a variável
        const tipoIDBanco = dados.tipoUsuarioID || 
                            dados.TipoUsuarioID || 
                            dados.tipoUsuarioId || 
                            dados.TipoUsuarioId || 
                            dados.tipo || 
                            2;

        setFormData({
            nome: dados.nome || dados.Nome || '',
            email: dados.email || dados.Email || '',
            tipoUsuarioID: Number(tipoIDBanco),
            senha: '' 
        });
      } catch (err) {
        toast.error("Erro ao carregar dados do usuário.");
        navigate('/usuarios');
      } finally {
        setLoadingDados(false);
      }
    };
    carregarUsuario();
  }, [id, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    // BLINDAGEM: Se o campo for o select de tipo, já converte pra número na hora!
    setFormData({ 
        ...formData, 
        [name]: name === 'tipoUsuarioID' ? Number(value) : value 
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 2. Monta o payload mandando as chaves em várias formatações 
      // para o Entity Framework (C#) não ter desculpa para ignorar!
      const payload = {
        Id: Number(id), 
        id: Number(id),
        Nome: formData.nome,
        nome: formData.nome,
        Email: formData.email,
        email: formData.email,
        
        // Manda o ID do cargo de todas as formas possíveis para forçar o Update
        TipoUsuarioID: formData.tipoUsuarioID,
        tipoUsuarioID: formData.tipoUsuarioID,
        TipoUsuarioId: formData.tipoUsuarioID,
        tipoUsuarioId: formData.tipoUsuarioID
      };

      // 3. Validação de senha opcional
      if (formData.senha) {
          if (formData.senha.length < 6) {
              setError("A nova senha deve ter no mínimo 6 caracteres.");
              setLoading(false);
              return;
          }
          payload.Senha = formData.senha;
          payload.senha = formData.senha;
      }

      await usuarioAPI.atualizar(id, payload);

      toast.success("Usuário atualizado com sucesso!");
      
      // ALERTA DE LOGOUT: Verifica se o cara editou ele mesmo
      const usuarioLogado = JSON.parse(localStorage.getItem('usuario_dados') || '{}');
      if (Number(usuarioLogado.id) === Number(id) || Number(usuarioLogado.Id) === Number(id)) {
          toast.info("Você editou suas próprias permissões. Por segurança, faça login novamente.");
      }

      navigate('/usuarios');

    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.mensagem || "Erro ao salvar alterações.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (loadingDados) {
      return (
        <div className={styles.loadingContainer}>
            <Loader2 className="animate-spin text-orange-600" size={40} />
        </div>
      );
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        
        <div className={styles.header}>
          <h1 className={styles.title}>Editar Usuário</h1>
          <p className={styles.subtitle}>Ajuste as informações de acesso</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {error && (
            <div className={styles.errorMessage}>
                <AlertCircle size={16}/> {error}
            </div>
          )}

          {/* Nome */}
          <div className={styles.inputGroup}>
            <label className={styles.label}>Nome</label>
            <input 
                name="nome" 
                value={formData.nome} 
                onChange={handleChange} 
                className={styles.input} 
                required 
            />
          </div>

          {/* E-mail */}
          <div className={styles.inputGroup}>
            <label className={styles.label}>E-mail</label>
            <input 
                name="email" 
                type="email" 
                value={formData.email} 
                onChange={handleChange} 
                className={styles.input} 
                required 
            />
          </div>

          {/* Tipo de Permissão */}
          <div className={styles.inputGroup}>
             <label className={styles.label}>Nível de Permissão</label>
             <select 
                name="tipoUsuarioID" 
                value={formData.tipoUsuarioID} 
                onChange={handleChange}
                className={styles.select} 
             >
                <option value={2}>Usuário Comum</option>
                <option value={1}>Administrador</option>
             </select>
          </div>

          {/* Senha */}
          <div className={styles.inputGroup}>
            <label className={styles.label}>
                Nova Senha <span className="text-stone-400 font-normal text-xs">(Deixe em branco para manter)</span>
            </label>
            <input 
                name="senha" 
                type="password" 
                value={formData.senha} 
                onChange={handleChange} 
                className={styles.input} 
                placeholder="••••••••"
            />
          </div>

          <button type="submit" className={styles.button} disabled={loading}>
            {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
            {loading ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </form>

        <div className={styles.backContainer}>
            <Link to="/usuarios" className={styles.backLink}>
                <ArrowLeft size={16} /> Voltar para Lista
            </Link>
        </div>

      </div>
    </div>
  );
}