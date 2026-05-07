import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Save, Calendar, Weight, 
  ArrowUpRight, AlertTriangle, DollarSign, User, CreditCard, Package
} from 'lucide-react';
import { toast } from 'sonner';

import milhoAPI from '../../services/milhoAPI'; 
import movimentacaoAPI from '../../services/movimentacaoMilhoAPI'; 

import styles from './SaidaMilho.module.css'; 

export function SaidaMilho() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [lotesDisponiveis, setLotesDisponiveis] = useState([]);

  const [formData, setFormData] = useState({
    tipo: 1, 
    quantidadeKg: '',
    dataMovimentacao: new Date().toISOString().split('T')[0],
    comprador: '',
    valorPorSacoVendido: '',
    pagamento: 1, 
    observacao: ''
  });

  useEffect(() => {
    const buscarLotes = async () => {
      try {
        const dados = await milhoAPI.listar();
        
        // Pega os lotes com saldo e ORDENA DO MAIS VELHO PARA O MAIS NOVO (PEPS/FIFO)
        const comSaldo = dados
          .filter(l => l.kgEstoqueAtual > 0)
          .sort((a, b) => new Date(a.dataCompra) - new Date(b.dataCompra));
          
        setLotesDisponiveis(comSaldo);
      } catch (error) {
        toast.error("Erro ao carregar o estoque do silo.");
      }
    };
    buscarLotes();
  }, []);

  // --- NOVA MATEMÁTICA GLOBAL ---
  const estoqueTotalSilo = lotesDisponiveis.reduce((acc, lote) => acc + lote.kgEstoqueAtual, 0);
  const saldoRestante = estoqueTotalSilo - Number(formData.quantidadeKg);

  const qtdSacosVenda = Number(formData.quantidadeKg) / 60;
  const valorTotalVenda = qtdSacosVenda * Number(formData.valorPorSacoVendido);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const val = (name === 'tipo' || name === 'pagamento') ? Number(value) : value;
    setFormData(prev => ({ ...prev, [name]: val }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.quantidadeKg || Number(formData.quantidadeKg) <= 0) {
      toast.error("Informe uma quantidade válida.");
      return;
    }

    if (saldoRestante < 0) {
      toast.error("A quantidade solicitada é maior que o saldo total do silo!");
      return;
    }

    if (formData.tipo === 2 && (!formData.comprador || !formData.valorPorSacoVendido)) {
      toast.error("Para vendas, preencha o Comprador e o Valor.");
      return;
    }

    try {
      setLoading(true);
      
      let qtdDesejada = Number(formData.quantidadeKg);

      // --- A MÁGICA DO PEPS (BASTIDORES) ---
      for (const lote of lotesDisponiveis) {
        if (qtdDesejada <= 0) break; // Já tirou tudo que precisava

        const kgTirarDesteLote = Math.min(qtdDesejada, lote.kgEstoqueAtual);
        
        const proporcao = kgTirarDesteLote / Number(formData.quantidadeKg);
        const valorVendaProporcional = valorTotalVenda * proporcao;

        const payload = {
          milhoID: lote.id, 
          tipo: formData.tipo,
          quantidadeKg: kgTirarDesteLote,
          dataMovimentacao: formData.dataMovimentacao,
          
          // 👇 AQUI ESTÁ A SOLUÇÃO: Se for venda manda o comprador, se não for, manda "Fazenda"
          comprador: formData.tipo === 2 ? formData.comprador : "Fazenda",
          
          valorPorSacoVendido: formData.tipo === 2 ? Number(formData.valorPorSacoVendido) : 0,
          valorVenda: formData.tipo === 2 ? valorVendaProporcional : 0,
          pagamento: formData.tipo === 2 ? formData.pagamento : 1,
          
          observacao: formData.observacao
        };

        // Salva esse pedaço no banco
        await movimentacaoAPI.criar(payload);
        
        qtdDesejada -= kgTirarDesteLote;
      }

      toast.success("Saída registrada com sucesso no silo!");
      navigate('/milhos');
    } catch (error) {
      toast.error("Erro ao registrar a movimentação.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.contentWrapper}>
        
        <div className={styles.header}>
          <button onClick={() => navigate('/milhos')} className={styles.backButton}>
            <ArrowLeft size={20} /> Voltar
          </button>
          <h1 className={styles.title}>
            <ArrowUpRight className="text-slate-600" size={28} />
            Registrar Saída de Milho
          </h1>
        </div>

        <form onSubmit={handleSubmit} className={styles.formCard}>
          <div className={styles.formGrid}>
            
            <div className={styles.inputGroup}>
              <label>Tipo de Saída *</label>
              <select name="tipo" value={formData.tipo} onChange={handleChange} style={{ fontWeight: 'bold' }}>
                <option value={1}>🔵 Consumo (Trato do Gado)</option>
                <option value={2}>🟢 Venda a Terceiros</option>
                <option value={3}>🔴 Perda (Umidade/Pragas)</option>
              </select>
            </div>

            <div className={styles.inputGroup}>
              <label><Calendar size={16} /> Data *</label>
              <input type="date" name="dataMovimentacao" value={formData.dataMovimentacao} onChange={handleChange} required />
            </div>

            <div className={styles.inputGroup} style={{ gridColumn: '1 / -1' }}>
              <div style={{ padding: '16px', backgroundColor: '#f1f5f9', borderRadius: '8px', border: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Package className="text-slate-600" size={24} />
                <div>
                  <span style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>DISPONÍVEL NO SILO</span>
                  <strong style={{ fontSize: '1.2rem', color: '#0f172a' }}>{estoqueTotalSilo.toLocaleString('pt-BR')} Kg</strong>
                </div>
              </div>
            </div>

            <div className={styles.inputGroup}>
              <label><Weight size={16} /> Quantidade de Saída (Kg) *</label>
              <input type="number" name="quantidadeKg" placeholder="Ex: 500" value={formData.quantidadeKg} onChange={handleChange} min="1" required />
            </div>

            {formData.tipo === 2 && (
              <>
                <div className={styles.inputGroup}>
                  <label><User size={16} /> Comprador *</label>
                  <input type="text" name="comprador" placeholder="Ex: Vizinho João" value={formData.comprador} onChange={handleChange} required />
                </div>
                
                <div className={styles.inputGroup}>
                  <label><DollarSign size={16} /> Valor Cobrado por Saco (R$) *</label>
                  <input type="number" step="0.01" name="valorPorSacoVendido" placeholder="Ex: 95.00" value={formData.valorPorSacoVendido} onChange={handleChange} required />
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
              </>
            )}
          </div>

          <div className={styles.costSummary} style={{ backgroundColor: saldoRestante < 0 ? '#fef2f2' : '#f8fafc', borderColor: saldoRestante < 0 ? '#fca5a5' : '#e2e8f0' }}>
            <div className={styles.costInfo}>
              <AlertTriangle size={20} className={saldoRestante < 0 ? "text-red-600" : "text-slate-400"} />
              <div>
                <span>Saldo após essa saída:</span>
                <strong style={{ color: saldoRestante < 0 ? '#dc2626' : '#334155' }}>
                  {saldoRestante.toLocaleString('pt-BR')} Kg
                </strong>
                {saldoRestante < 0 && <span style={{display:'block', color:'#dc2626', fontSize:'0.8rem', marginTop:'4px'}}>⚠️ Quantidade excede o saldo do silo!</span>}
              </div>
            </div>

            {formData.tipo === 2 && (
              <div className={styles.costInfo} style={{ borderLeft: '1px solid #cbd5e1', paddingLeft: '20px' }}>
                <div>
                  <span>Total da Venda (~{qtdSacosVenda.toFixed(1)} sacos):</span>
                  <strong style={{ color: '#166534' }}>
                      {valorTotalVenda.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </strong>
                </div>
              </div>
            )}
          </div>

          <div className={styles.inputGroup} style={{ marginTop: '20px' }}>
            <label>Detalhes / Observações</label>
            <textarea name="observacao" rows="2" placeholder={formData.tipo === 1 ? "Ex: Trato do gado no confinamento..." : "Opcional..."} value={formData.observacao} onChange={handleChange} />
          </div>

          <div className={styles.formActions}>
            <button type="button" onClick={() => navigate('/milhos')} className={styles.cancelButton}>Cancelar</button>
            <button type="submit" className={styles.saveButton} disabled={loading || saldoRestante < 0 || estoqueTotalSilo === 0}>
              {loading ? 'Processando...' : <><Save size={20} /> Baixar Estoque</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}