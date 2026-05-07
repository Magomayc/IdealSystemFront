import api from './client';

const vendaAPI = {
  // 1. LISTAR (GET) - Ajustado para a nova rota e aceitando o filtro de ativo
  listar: async (ativo = true) => {
    // Nota: Se o seu client.js já tiver '/api' na baseURL, você pode tirar o '/api' daqui
    const response = await api.get(`/api/Venda/Listar?ativo=${ativo}`);
    return response.data;
  },

  // 2. OBTER POR ID (GET)
  // ⚠️ Aviso: Nós não colocamos essa rota na VendaController final! 
  // Se você for usar essa tela no React para ver detalhes de 1 venda só, me avise que criamos no C#.
  obterPorId: async (id) => {
    const response = await api.get(`/api/Venda/Obter/${id}`);
    return response.data;
  },

  // 3. REGISTRAR (POST) - Ajustado para a rota /Registrar
  registrar: async (dadosVenda) => {
    const response = await api.post('/api/Venda/Registrar', dadosVenda);
    return response.data;
  },

  // 4. ATUALIZAR ROMANEIO (PUT) - NOVO ENDPOINT DO FRIGORÍFICO
  atualizarRomaneio: async (dadosVenda) => {
    const response = await api.put('/api/Venda/AtualizarRomaneio', dadosVenda);
    return response.data;
  },

  // 5. EXCLUIR (DELETE) - Ajustado para a rota /Excluir
  excluir: async (id) => {
    const response = await api.delete(`/api/Venda/Excluir/${id}`);
    return response.data;
  }
};

export default vendaAPI;