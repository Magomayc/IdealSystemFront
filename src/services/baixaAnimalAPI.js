import api from './client';

const baixaAnimalAPI = {
  // 1. LISTAR (GET) - Traz o histórico de perdas da fazenda
  listar: async (ativo = true) => {
    const response = await api.get(`/api/BaixaAnimal/Listar?ativo=${ativo}`);
    return response.data;
  },

  // 2. REGISTRAR (POST) - Salva a morte e tira o boi do pasto automaticamente
  registrar: async (dadosBaixa) => {
    const response = await api.post('/api/BaixaAnimal/Registrar', dadosBaixa);
    return response.data;
  },

  // 3. ATUALIZAR (PUT) - Ajusta data ou motivo caso o peão tenha digitado errado
  atualizar: async (dadosBaixa) => {
    const response = await api.put('/api/BaixaAnimal/Atualizar', dadosBaixa);
    return response.data;
  },

  // 4. EXCLUIR / CANCELAR (DELETE) - Cancela a baixa e devolve o boi para o estoque
  excluir: async (id) => {
    const response = await api.delete(`/api/BaixaAnimal/Excluir/${id}`);
    return response.data;
  }
};

export default baixaAnimalAPI;