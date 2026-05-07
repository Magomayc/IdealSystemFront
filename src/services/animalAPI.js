import api from './client';

const animalAPI = {
  listar: async () => {
    // Mantemos esse para a tela de Estoque (traz só os vivos no pasto/cocho)
    const response = await api.get('/Animal/Listar?ativo=true');
    return response.data;
  },

  // 👇 NOVO: Traz o rebanho atual + os animais já vendidos/mortos
  listarHistoricoCompleto: async () => {
    // Faz duas buscas super rápidas no backend
    const [reqAtivos, reqInativos] = await Promise.all([
      api.get('/Animal/Listar?ativo=true'),
      api.get('/Animal/Listar?ativo=false')
    ]);
    
    // Extrai as listas de forma segura
    const ativos = Array.isArray(reqAtivos.data) ? reqAtivos.data : [];
    const inativos = Array.isArray(reqInativos.data) ? reqInativos.data : [];
    
    // Junta tudo em uma lista só e devolve para o React
    return [...ativos, ...inativos];
  },

  obterPorId: async (id) => {
    const response = await api.get(`/Animal/Obter/${id}`);
    return response.data;
  },

  criar: async (dados) => {
    const response = await api.post('/Animal/Criar', dados);
    return response.data;
  },

  atualizar: async (id, dados) => {
    // Ajustado para mandar ID no corpo, igual fizemos em Usuario
    const response = await api.put('/Animal/Atualizar', dados);
    return response.data;
  },

  deletar: async (id) => {
    const response = await api.delete(`/Animal/Deletar/${id}`);
    return response.data;
  }
};

export default animalAPI;