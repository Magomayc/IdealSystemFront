import api from './client';

const milhoAPI = {
  // 1. LISTAR (GET) - Traz o histórico de entradas de milho
  // O parâmetro "ativo=true" garante que só vêm os registros não deletados, conforme sua API
  listar: async (ativo = true) => {
    const response = await api.get(`/Milho/Listar?ativo=${ativo}`);
    return response.data;
  },

  // 2. OBTER POR ID (GET) - Busca os detalhes de uma compra específica
  obterPorId: async (id) => {
    const response = await api.get(`/Milho/Obter/${id}`);
    return response.data;
  },

  // 3. CRIAR (POST) - Registra uma nova compra/lote de milho
  criar: async (dadosMilho) => {
    const response = await api.post('/Milho/Criar', dadosMilho);
    return response.data;
  },

  // 4. ATUALIZAR (PUT) - Edita os dados de uma compra existente
  atualizar: async (dadosMilho) => {
    const response = await api.put('/Milho/Atualizar', dadosMilho);
    return response.data;
  },

  // 5. DELETAR (DELETE) - "Inativa" o registro no banco
  deletar: async (id) => {
    // CORRIGIDO: Alterado de /Excluir/ para /Deletar/ para bater com a Controller C#
    const response = await api.delete(`/Milho/Deletar/${id}`);
    return response.data;
  },

  // 6. RESTAURAR (PUT) - Reativa um registro que foi excluído
  restaurar: async (id) => {
    const response = await api.put(`/Milho/Restaurar/${id}`);
    return response.data;
  }
};

export default milhoAPI;