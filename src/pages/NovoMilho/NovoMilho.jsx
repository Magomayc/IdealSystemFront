import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Save, Calendar, User, 
  Weight, DollarSign, Calculator, Wheat, Package, CreditCard
} from 'lucide-react';
import { toast } from 'sonner';

// Importando a API configurada
import milhoAPI from '../../services/milhoAPI'; 

import styles from './NovoMilho.module.css'; 

export function NovoMilho() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    dataCompra: new Date().toISOString().split('T')[0],
    vendedor: '', 
    quantidadeSacos: '',
    pesoPorSaco: '60', 
    valorPorSaco: '',
    pagamento: 1, // Inicia em 1 (Dinheiro) conforme seu Enum C#
    observacao: ''
  });

  // --- LÓGICA DE CÁLCULO VISUAL (Apenas para mostrar na tela) ---
  const kgComprado = Number(formData.quantidadeSacos) * Number(formData.pesoPorSaco);
  const valorTotal = Number(formData.quantidadeSacos) * Number(formData.valorPorSaco);

  const handleChange = (e) => {
    const { name, value } = e.target;
    // Converte o pagamento para número imediatamente para o Enum do C#
    const val = name === 'pagamento' ? Number(value) : value;
    
    setFormData(prev => ({ ...prev, [name]: val }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.vendedor || !formData.quantidadeSacos || !formData.valorPorSaco) {
      toast.error("Preencha os campos obrigatórios.");
      return;
    }

    // Payload espelhado com o "MilhoCriar.cs"
    const payload = {
      vendedor: formData.vendedor,
      quantidadeSacos: Number(formData.quantidadeSacos),
      pesoPorSaco: Number(formData.pesoPorSaco),
      valorPorSaco: Number(formData.valorPorSaco),
      pagamento: formData.pagamento,
      dataCompra: formData.dataCompra,
      observacao: formData.observacao
    };

    try {
      setLoading(true);
      
      // Chamada real para o Backend
      await milhoAPI.criar(payload);
      
      toast.success("Entrada de milho registrada com sucesso!");
      // 👇 AJUSTADO: Volta para a tela principal no plural
      navigate('/milhos'); 
    } catch (error) {
      toast.error("Erro ao salvar no servidor.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.contentWrapper}>
        
        <div className={styles.header}>
          {/* 👇 AJUSTADO: Botão de voltar */}
          <button onClick={() => navigate('/milhos')} className={styles.backButton}>
            <ArrowLeft size={20} /> Voltar
          </button>
          <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
            <h1 className={styles.title}>
              <Wheat className="text-yellow-600" size={28} />
              Nova Entrada de Milho
            </h1>
          </div>
        </div>

        <form onSubmit={handleSubmit} className={styles.formCard}>
          <div className={styles.formGrid}>
            
            <div className={styles.inputGroup}>
              <label><Calendar size={16} /> Data da Compra *</label>
              <input type="date" name="dataCompra" value={formData.dataCompra} onChange={handleChange} required />
            </div>

            <div className={styles.inputGroup}>
              <label><User size={16} /> Vendedor / Origem *</label>
              <input type="text" name="vendedor" placeholder="Ex: Agropecuária Silva" value={formData.vendedor} onChange={handleChange} required />
            </div>

            <div className={styles.inputGroup}>
              <label><Package size={16} /> Quantidade de Sacos *</label>
              <input type="number" name="quantidadeSacos" placeholder="Ex: 50" value={formData.quantidadeSacos} onChange={handleChange} min="1" required />
            </div>

            <div className={styles.inputGroup}>
              <label><Weight size={16} /> Peso por Saco (Kg) *</label>
              <input type="number" name="pesoPorSaco" value={formData.pesoPorSaco} onChange={handleChange} step="0.1" min="0.1" required />
            </div>

            <div className={styles.inputGroup}>
              <label><DollarSign size={16} /> Valor por Saco (R$) *</label>
              <input type="number" step="0.01" name="valorPorSaco" placeholder="Ex: 85.00" value={formData.valorPorSaco} onChange={handleChange} min="0.01" required />
            </div>

            <div className={styles.inputGroup}>
              <label><CreditCard size={16} /> Forma de Pagamento</label>
              <select name="pagamento" value={formData.pagamento} onChange={handleChange}>
                <option value={1}>Dinheiro</option>
                <option value={2}>Pix</option>
                <option value={3}>Boleto</option>
                <option value={4}>Cartão</option>
                <option value={5}>A Prazo</option>
              </select>
            </div>
          </div>

          <div className={styles.costSummary}>
            <div className={styles.costInfo}>
              <Calculator size={20} className="text-yellow-700" />
              <div>
                <span>Volume Total:</span>
                <strong>{kgComprado.toLocaleString('pt-BR')} Kg</strong>
              </div>
            </div>
            <div className={styles.costInfo} style={{ borderLeft: '1px solid #eab308', paddingLeft: '20px' }}>
              <div>
                <span>Investimento Total:</span>
                <strong style={{ color: '#166534' }}>
                    {valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </strong>
              </div>
            </div>
          </div>

          <div className={styles.inputGroup} style={{ marginTop: '20px' }}>
            <label>Observações</label>
            <textarea name="observacao" rows="2" placeholder="Opcional..." value={formData.observacao} onChange={handleChange} />
          </div>

          <div className={styles.formActions}>
            {/* 👇 AJUSTADO: Botão de cancelar */}
            <button type="button" onClick={() => navigate('/milhos')} className={styles.cancelButton}>Cancelar</button>
            <button type="submit" className={styles.saveButton} disabled={loading}>
              {loading ? 'Salvando...' : <><Save size={20} /> Salvar Registro</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}