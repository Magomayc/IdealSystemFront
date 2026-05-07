import api from './client'; // Importa sua configuração do Axios

const usuarioAPI = {
  // --- Autenticação ---
  login: async (email, senha) => {
    const response = await api.post('/Usuario/Login', { email, senha });
    return response.data;
  },

  // --- Leitura ---
  listar: async (ativo = true, query = '') => {
    const response = await api.get('/Usuario/Listar', {
      params: { ativo, query }
    });
    return response.data;
  },

  obterPorId: async (id) => {
    const response = await api.get(`/Usuario/Obter/${id}`);
    return response.data;
  },

  // --- Escrita ---
  criar: async (dadosUsuario) => {
    const response = await api.post('/Usuario/Criar', dadosUsuario);
    return response.data;
  },

  // --- AJUSTADO AQUI ---
  // Agora aceita 'id' separadamente para montar a URL correta: /Usuario/Atualizar/5
atualizar: async (id, dadosUsuario) => {
  // CERTO: Manda para a rota base. O ID já está dentro do objeto 'dadosUsuario'
  const response = await api.put('/Usuario/Atualizar', dadosUsuario);
  return response.data;
},

  // --- Opcional (se for usar rota específica de senha) ---
  atualizarSenha: async (id, novaSenha, senhaAntiga) => {
    const payload = {
      id: id,
      senha: novaSenha,
      senhaAntiga: senhaAntiga
    };
    const response = await api.put('/Usuario/AtualizarSenha', payload);
    return response.data;
  },

  // --- Exclusão ---
  deletar: async (id) => {
    const response = await api.delete(`/Usuario/Deletar/${id}`);
    return response.data;
  },

  restaurar: async (id) => {
    const response = await api.put(`/Usuario/Restaurar/${id}`);
    return response.data;
  }
};

export default usuarioAPI;