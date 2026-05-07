import api from './client';

const movimentacaoAPI = {
  // 1. LISTAR (GET) - Traz o extrato das saídas (Consumo, Venda, Perda)
  // Adicionei o milhoId porque o seu C# aceita filtrar por um lote específico!
  listar: async (ativo = true, milhoId = null) => {
    let url = `/MovimentacaoMilho/Listar?ativo=${ativo}`;
    if (milhoId) {
      url += `&milhoId=${milhoId}`;
    }
    const response = await api.get(url);
    return response.data;
  },

  // 2. OBTER POR ID (GET)
  obterPorId: async (id) => {
    const response = await api.get(`/MovimentacaoMilho/Obter/${id}`);
    return response.data;
  },

  // 3. CRIAR (POST) - Manda se foi Consumo, Venda ou Perda e a quantidade
  // Ajustado de /Registrar para /Criar para bater com a rota do C#
  criar: async (dadosMovimentacao) => {
    const response = await api.post('/MovimentacaoMilho/Criar', dadosMovimentacao);
    return response.data;
  },

  // 4. ATUALIZAR (PUT) - Caso o peão tenha digitado a quantidade errada
  atualizar: async (dadosMovimentacao) => {
    const response = await api.put('/MovimentacaoMilho/Atualizar', dadosMovimentacao);
    return response.data;
  },

  // 5. DELETAR (DELETE) - Cancela a movimentação e estorna o peso para o silo
  // Ajustado de /Excluir para /Deletar
  deletar: async (id) => {
    const response = await api.delete(`/MovimentacaoMilho/Deletar/${id}`);
    return response.data;
  },

  // 6. RESTAURAR (PUT) - Desfaz a exclusão
  restaurar: async (id) => {
    const response = await api.put(`/MovimentacaoMilho/Restaurar/${id}`);
    return response.data;
  }
};

export default movimentacaoAPI;