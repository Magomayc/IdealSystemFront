import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, Loader2, Tractor } from 'lucide-react'; // 👇 Importando o Tractor
import { toast } from 'sonner';

import usuarioAPI from '@/services/usuarioAPI'; 
import styles from './Login.module.css';

export function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    email: '',
    senha: ''
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

    try {
      const data = await usuarioAPI.login(formData.email, formData.senha);
      
      if (data && data.id && data.nome) {
          
          const token = data.token || "token-simulado-pelo-frontend-123";
          
          localStorage.setItem('usuario_token', token);
          localStorage.setItem('usuario_dados', JSON.stringify(data));

          toast.success(`Bem-vindo(a), ${data.nome}!`);
          navigate('/menu');
          return;
      }

      throw new Error("Resposta do servidor inválida. Não identifiquei o usuário.");

    } catch (err) {
      console.error(err);
      
      // --- MODO DE TESTE ---
      if (formData.email === 'admin@gado.com' && formData.senha === '123456') {
        const fakeUser = { id: 1, nome: 'Admin Teste', tipoUsuarioID: 1 }; 
        localStorage.setItem('usuario_dados', JSON.stringify(fakeUser));
        localStorage.setItem('usuario_token', 'token-fake');
        toast.success("Login de teste realizado!");
        navigate('/menu');
        return;
      }

      const msg = err.response?.data?.mensagem || "E-mail ou senha incorretos.";
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
          {/* 👇 NOVO: Título com a Logo IdealSystem */}
          <div className={styles.logoWrapper}>
            <Tractor size={40} className="text-orange-600" />
            <h1 className={styles.title}>IdealSystem</h1>
          </div>
          <p className={styles.subtitle}>Acesso restrito. Insira suas credenciais.</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          
          {error && (
            <div className={styles.errorMessage}>
              {error}
            </div>
          )}

          <div className={styles.inputGroup}>
            <label htmlFor="email" className={styles.label}>E-mail de acesso</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="seu@email.com"
              className={styles.input}
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="senha" className={styles.label}>Senha</label>
            <input
              id="senha"
              name="senha"
              type="password"
              placeholder="••••••••"
              className={styles.input}
              value={formData.senha}
              onChange={handleChange}
              required
            />
          </div>

          <button type="submit" className={styles.button} disabled={loading}>
            {loading ? <Loader2 className="animate-spin" size={20} /> : <LogIn size={20} />}
            {loading ? 'Entrando no sistema...' : 'Acessar Sistema'}
          </button>

        </form>

      </div>
    </div>
  );
}