import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import usuarioAPI from '@/services/usuarioAPI';
import styles from './NovoUsuario.module.css';

export function NovoUsuario() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    senha: '',
    confirmarSenha: ''
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validação básica de senha
    if (formData.senha !== formData.confirmarSenha) {
      setError("As senhas não coincidem.");
      setLoading(false);
      return;
    }

    if (formData.senha.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      setLoading(false);
      return;
    }

    try {
      const payload = {
        Nome: formData.nome,
        Email: formData.email,
        Senha: formData.senha,
        TipoUsuarioID: 1 // Ajuste aqui se quiser criar admin (1) ou comum (2)
      };

      await usuarioAPI.criar(payload);

      // --- MUDANÇA 1: Mensagem e Redirecionamento ---
      toast.success("Usuário cadastrado com sucesso!");
      navigate('/usuarios'); // Volta para a Lista de Usuários

    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.mensagem || "Erro ao criar usuário. Tente novamente.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        
        <div className={styles.header}>
          {/* Ajustei o texto para parecer uma ferramenta interna */}
          <h1 className={styles.title}>Novo Usuário</h1>
          <p className={styles.subtitle}>Cadastre um novo acesso ao sistema</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          
          {error && (
            <div className={styles.errorMessage}>
              {error}
            </div>
          )}

          {/* Nome */}
          <div className={styles.inputGroup}>
            <label htmlFor="nome" className={styles.label}>Nome Completo</label>
            <input
              id="nome"
              name="nome"
              type="text"
              placeholder="Nome do usuário"
              className={styles.input}
              value={formData.nome}
              onChange={handleChange}
              required
            />
          </div>

          {/* E-mail */}
          <div className={styles.inputGroup}>
            <label htmlFor="email" className={styles.label}>E-mail</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="email@exemplo.com"
              className={styles.input}
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          {/* Senha */}
          <div className={styles.inputGroup}>
            <label htmlFor="senha" className={styles.label}>Senha Provisória</label>
            <input
              id="senha"
              name="senha"
              type="password"
              placeholder="Mínimo 6 caracteres"
              className={styles.input}
              value={formData.senha}
              onChange={handleChange}
              required
            />
          </div>

          {/* Confirmar Senha */}
          <div className={styles.inputGroup}>
            <label htmlFor="confirmarSenha" className={styles.label}>Confirmar Senha</label>
            <input
              id="confirmarSenha"
              name="confirmarSenha"
              type="password"
              placeholder="Repita a senha"
              className={styles.input}
              value={formData.confirmarSenha}
              onChange={handleChange}
              required
            />
          </div>

          <button type="submit" className={styles.button} disabled={loading}>
            {loading ? <Loader2 className="animate-spin" size={20} /> : <UserPlus size={20} />}
            {loading ? 'Salvando...' : 'Cadastrar Usuário'}
          </button>

        </form>

        {/* --- MUDANÇA 2: Link de Voltar --- */}
        {/* Removi o "Já tem conta?" e deixei apenas o voltar para a lista */}
        {/* Substitua a div final do JSX por esta */}
        <div className={styles.backContainer}>
            <Link to="/usuarios" className={styles.backLink}>
                <ArrowLeft size={16} /> Voltar para Lista
            </Link>
        </div>

      </div>
    </div>
  );
}