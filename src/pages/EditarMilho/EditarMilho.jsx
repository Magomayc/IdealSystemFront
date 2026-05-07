import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, Save, Calendar, User, Package, DollarSign, Wheat
} from 'lucide-react';
import { toast } from 'sonner';

import milhoAPI from '../../services/milhoAPI';

import styles from './EditarMilho.module.css';

export function EditarMilho() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [carregandoDados, setCarregandoDados] = useState(true);

  const [formData, setFormData] = useState({
    dataCompra: '',
    vendedor: '',
    quantidadeSacos: '',
    valorTotal: ''
  });

  // Busca os dados da compra assim que a tela abre
  useEffect(() => {
    const carregarCompra = async () => {
      try {
        const dados = await milhoAPI.obterPorId(id);
        
        // Formata a data para o input type="date" (AAAA-MM-DD)
        const dataFormatada = dados.dataCompra ? new Date(dados.dataCompra).toISOString().split('T')[0] : '';

        setFormData({
          dataCompra: dataFormatada,
          vendedor: dados.vendedor || '',
          quantidadeSacos: dados.quantidadeSacos || '',
          valorTotal: dados.valorTotal || ''
        });
      } catch (error) {
        toast.error("Erro ao carregar dados da compra.");
        navigate('/milhos'); // Se der erro, volta pra lista
      } finally {
        setCarregandoDados(false);
      }
    };

    if (id) carregarCompra();
  }, [id, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.vendedor || !formData.quantidadeSacos || !formData.valorTotal) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }

    try {
      setLoading(true);
      
      const payload = {
        id: id,
        dataCompra: formData.dataCompra,
        vendedor: formData.vendedor,
        quantidadeSacos: Number(formData.quantidadeSacos),
        valorTotal: Number(formData.valorTotal)
        // O kgComprado e kgEstoqueAtual normalmente são recalculados pela API (ex: sacos * 60)
      };

      await milhoAPI.atualizar(id, payload);
      
      toast.success("Compra atualizada com sucesso!");
      navigate('/milhos');
    } catch (error) {
      toast.error("Erro ao atualizar a compra.");
    } finally {
      setLoading(false);
    }
  };

  if (carregandoDados) {
    return <div className={styles.loadingMensagem}>Buscando dados no banco...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.contentWrapper}>
        
        <div className={styles.header}>
          <button onClick={() => navigate('/milhos')} className={styles.backButton}>
            <ArrowLeft size={20} /> Voltar
          </button>
          <h1 className={styles.title}>
            <Wheat className="text-yellow-600" size={28} />
            Editar Compra de Milho
          </h1>
        </div>

        <form onSubmit={handleSubmit} className={styles.formCard}>
          <div className={styles.formGrid}>
            
            <div className={styles.inputGroup}>
              <label><Calendar size={16} /> Data da Compra *</label>
              <input 
                type="date" 
                name="dataCompra" 
                value={formData.dataCompra} 
                onChange={handleChange} 
                required 
              />
            </div>

            <div className={styles.inputGroup}>
              <label><User size={16} /> Vendedor / Fornecedor *</label>
              <input 
                type="text" 
                name="vendedor" 
                placeholder="Ex: Fazenda São João" 
                value={formData.vendedor} 
                onChange={handleChange} 
                required 
              />
            </div>

            <div className={styles.inputGroup}>
              <label><Package size={16} /> Quantidade (Sacos 60kg) *</label>
              <input 
                type="number" 
                name="quantidadeSacos" 
                placeholder="Ex: 100" 
                value={formData.quantidadeSacos} 
                onChange={handleChange} 
                min="1" 
                required 
              />
            </div>

            <div className={styles.inputGroup}>
              <label><DollarSign size={16} /> Valor Total Pago (R$) *</label>
              <input 
                type="number" 
                step="0.01" 
                name="valorTotal" 
                placeholder="Ex: 6500.00" 
                value={formData.valorTotal} 
                onChange={handleChange} 
                required 
              />
            </div>

          </div>

          <div className={styles.formActions}>
            <button type="button" onClick={() => navigate('/milhos')} className={styles.cancelButton}>
              Cancelar
            </button>
            <button type="submit" className={styles.saveButton} disabled={loading}>
              {loading ? 'Salvando...' : <><Save size={20} /> Salvar Alterações</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}