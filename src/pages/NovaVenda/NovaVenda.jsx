import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, ShoppingCart, Loader2, CheckCircle2, 
  ArrowLeft, Pencil, Trash2, Scale, 
  ArrowDownCircle, Tag, Calculator, DollarSign
} from 'lucide-react';
import { toast } from 'sonner';

import animalAPI from '@/services/animalAPI'; 
import vendaAPI from '@/services/vendaAPI';   
import styles from './NovaVenda.module.css'; 

export function NovaVenda() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [processando, setProcessando] = useState(false);
  const [modalValidacao, setModalValidacao] = useState(false);

  const [animais, setAnimais] = useState([]); 
  const [busca, setBusca] = useState('');
  
  const [dadosItens, setDadosItens] = useState({});
  const [editandoId, setEditandoId] = useState(null);

  const [dadosVenda, setDadosVenda] = useState({ 
    comprador: '', 
    dataVenda: new Date().toISOString().split('T')[0],
    observacao: ''
  });

  useEffect(() => {
    const carregarEstoque = async () => {
      try {
        setLoading(true);
        const data = await animalAPI.listar(); 
        const lista = Array.isArray(data) ? data : (data.data || []);
        setAnimais(lista.filter(a => a.ativo !== false));
      } catch (error) { 
        toast.error("Erro ao carregar estoque."); 
      } finally { 
        setLoading(false); 
      }
    };
    carregarEstoque();
  }, []);

  const toggleSelecao = (animal) => {
    const id = animal.id || animal.Id;
    setDadosItens(prev => {
      const itemAtual = prev[id] || {};
      if (!itemAtual.selecionado) {
        return { 
          ...prev, 
          [id]: { 
            selecionado: true, 
            pesoVivo: animal.peso || animal.Peso, 
            incluirPesoMorto: false, 
            pesoMorto: '', 
            precoArroba: '', 
            valorTotal: '',  
            custoOriginal: animal.valorEntrada || animal.ValorEntrada || 0 
          } 
        };
      } else { 
        const novo = { ...prev }; 
        delete novo[id]; 
        return novo; 
      }
    });
    if (editandoId === id) setEditandoId(null);
  };

  // CÁLCULO INTELIGENTE AUTOMÁTICO POR ANIMAL
  const atualizarValorItem = (id, campo, valorDigitado) => {
    setDadosItens(prev => {
        const item = { ...prev[id], [campo]: valorDigitado };
        
        let p = parseFloat(item.incluirPesoMorto && item.pesoMorto ? item.pesoMorto : item.pesoVivo) || 0;
        let v = parseFloat(campo === 'valorTotal' ? valorDigitado : item.valorTotal) || 0;
        let a = parseFloat(campo === 'precoArroba' ? valorDigitado : item.precoArroba) || 0;

        // Se tem peso morto, divide por 15. Se só tem peso vivo, divide por 30.
        const qtdeArrobas = (item.incluirPesoMorto && item.pesoMorto) ? (p / 15) : (p / 30);

        if (qtdeArrobas > 0) {
            if (campo === 'precoArroba' && !isNaN(a)) {
                item.valorTotal = (qtdeArrobas * a).toFixed(2);
            } else if (campo === 'valorTotal' && !isNaN(v)) {
                item.precoArroba = (v / qtdeArrobas).toFixed(2);
            } else if (campo === 'pesoMorto' || campo === 'pesoVivo' || campo === 'incluirPesoMorto') {
                if (!isNaN(a) && a > 0) item.valorTotal = (qtdeArrobas * a).toFixed(2);
                else if (!isNaN(v) && v > 0) item.precoArroba = (v / qtdeArrobas).toFixed(2);
            }
        }
        return { ...prev, [id]: item };
    });
  };

  // RESUMO GLOBAL (SOMA OS ITENS AUTOMATICAMENTE SEM PRECISAR DE CHAVEZINHA)
  const financeiros = useMemo(() => {
    const selecionados = Object.keys(dadosItens).filter(key => dadosItens[key]?.selecionado);
    return selecionados.reduce((acc, key) => {
      const item = dadosItens[key];
      const pesoBoiVivo = parseFloat(item.pesoVivo) || 0;
      const usaPesoMorto = item.incluirPesoMorto && parseFloat(item.pesoMorto) > 0;
      
      const pesoBaseCalculo = usaPesoMorto ? parseFloat(item.pesoMorto) : pesoBoiVivo;
      const qtdeArrobas = usaPesoMorto ? (pesoBaseCalculo / 15) : (pesoBaseCalculo / 30);

      acc.qtd += 1;
      acc.totalCusto += parseFloat(item.custoOriginal) || 0;
      acc.totalPesoBase += pesoBaseCalculo; // Soma o peso que foi efetivamente usado na matemática
      acc.totalArrobas += qtdeArrobas;
      acc.totalVenda += parseFloat(item.valorTotal) || 0; 
      
      return acc;
    }, { qtd: 0, totalCusto: 0, totalPesoBase: 0, totalArrobas: 0, totalVenda: 0 });
  }, [dadosItens]);

  const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  const prepararFinalizacao = () => {
    if (financeiros.qtd === 0) return toast.warning("Selecione pelo menos um animal.");
    if (!dadosVenda.comprador) return toast.warning("Informe o comprador/frigorífico.");
    if (financeiros.totalVenda <= 0) return toast.warning("Informe os valores de venda (Arroba/Total) nos animais selecionados.");

    const itensParaEnviar = Object.keys(dadosItens).filter(key => dadosItens[key].selecionado);
    if (itensParaEnviar.some(key => parseFloat(dadosItens[key].pesoVivo) <= 0)) {
        return toast.warning("O Peso Vivo dos animais não pode ser zero.");
    }
    setModalValidacao(true);
  };

  const confirmarVenda = async () => {
    const itensParaEnviar = Object.keys(dadosItens)
      .filter(key => dadosItens[key].selecionado)
      .map(key => {
        const item = dadosItens[key];
        const animalNoEstoque = animais.find(a => String(a.id || a.Id) === String(key)) || {};

        const payloadItem = { 
            AnimalId: parseInt(key), 
            PesoVivo: parseFloat(item.pesoVivo) || 0,
            ValorVenda: parseFloat(item.valorTotal) || 0,
            PrecoArroba: parseFloat(item.precoArroba) || 0,
            
            Raca: animalNoEstoque.raca || animalNoEstoque.Raca || 'Não Informada',
            ValorEntrada: parseFloat(animalNoEstoque.valorEntrada || animalNoEstoque.ValorEntrada || 0),
            PesoEntrada: parseFloat(animalNoEstoque.peso || animalNoEstoque.Peso || 0)
        };
        
        if (item.incluirPesoMorto && parseFloat(item.pesoMorto) > 0) {
            payloadItem.PesoMorto = parseFloat(item.pesoMorto);
        }
        return payloadItem;
      });

    try {
      setProcessando(true);

      // Recalcula o PrecoArroba médio para enviar na raiz da Venda (Evita o erro 400 do C#)
      const precoArrobaMedio = financeiros.totalArrobas > 0 
        ? (financeiros.totalVenda / financeiros.totalArrobas) 
        : 0;

      const payloadVenda = { 
        Comprador: dadosVenda.comprador.trim(), 
        DataVenda: dadosVenda.dataVenda, 
        Observacao: dadosVenda.observacao,
        ValorTotal: financeiros.totalVenda, 
        PesoTotalCarcaça: financeiros.totalPesoBase, // Mandamos a soma dos pesos usados (Vivo ou Morto)
        PrecoArroba: precoArrobaMedio, 
        Itens: itensParaEnviar 
      };

      await vendaAPI.registrar(payloadVenda);
      toast.success("Venda enviada com sucesso!");
      navigate('/vendas');
    } catch (error) { 
      toast.error(error.response?.data?.mensagem || error.response?.data?.erro || "Erro ao registrar venda."); 
      setModalValidacao(false); 
    } finally { 
      setProcessando(false); 
    }
  };

  const animaisFiltrados = animais.filter(a => {
      const termo = busca.toLowerCase();
      const brinco = (a.brinco || a.Brinco || '').toLowerCase();
      const raca = (a.raca || a.Raca || '').toLowerCase();
      return brinco.includes(termo) || raca.includes(termo);
  });

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button onClick={() => navigate('/vendas')} className={styles.backButton}>
          <ArrowLeft size={16} /> Voltar para Painel
        </button>
        <h1 className={styles.title}>
            <ShoppingCart className={styles.titleCartIcon} size={32}/> Despachar Animais
        </h1>
        <p className={styles.subtitle}>Selecione os animais e informe o peso de carcaça e valor pago por cabeça.</p>
      </div>

      <div className={styles.gridContainer}>
        {/* --- LISTA DE ANIMAIS --- */}
        <div className={styles.listCard}>
            <div className={styles.searchBar}>
                <Search className={styles.searchIcon} size={18}/>
                <input 
                    className={styles.searchInput} 
                    placeholder="Buscar boi por Brinco ou Raça..." 
                    value={busca} 
                    onChange={e => setBusca(e.target.value)}
                />
            </div>
            
            <div className={styles.itemsList}>
                {loading ? <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-green-600"/></div> : 
                 animaisFiltrados.map(animal => {
                    const id = animal.id || animal.Id;
                    const item = dadosItens[id] || {};
                    const sel = !!item.selecionado;
                    const edit = editandoId === id;
                    const brinco = animal.brinco || animal.Brinco || `ID:${id}`;
                    
                    // Cálculo local para exibição
                    const pesoCalculo = (item.incluirPesoMorto && item.pesoMorto) ? parseFloat(item.pesoMorto) : parseFloat(item.pesoVivo || 0);
                    const arrobasExibicao = item.incluirPesoMorto ? (pesoCalculo / 15) : (pesoCalculo / 30);
                    
                    return (
                        <div key={id} className={`${styles.itemRow} ${sel ? styles.selected : ''}`} onClick={() => !sel && toggleSelecao(animal)}>
                            <div className={styles.itemMainInfo}>
                                <div className={styles.itemHeader}>
                                    <h4 className={styles.itemBrinco}>
                                        <Tag size={16} className={styles.itemTagIcon}/> #{brinco}
                                    </h4>
                                    <span className={styles.itemDetalhes}>{animal.raca || animal.Raca}</span>
                                    <span className={styles.custoBadge} style={{ marginLeft: 'auto' }}>
                                        Custo: {formatMoney(animal.valorEntrada || animal.ValorEntrada)}
                                    </span>
                                </div>
                                {!sel && <div className={styles.itemSubText}>Peso no Pasto: {animal.peso || animal.Peso} kg</div>}
                            </div>

                            {sel && (
                                <div className={styles.itemActionArea}>
                                    {edit ? (
                                        <div className={styles.editItemBox} onClick={e => e.stopPropagation()}>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '10px' }}>
                                                
                                                <div className={styles.editField} style={{ flex: '1', minWidth: '120px' }}>
                                                    <label>Peso Vivo (kg)</label>
                                                    <input type="number" step="0.1" value={item.pesoVivo} onChange={e => atualizarValorItem(id, 'pesoVivo', e.target.value)} />
                                                </div>

                                                <div className={styles.editField} style={{ flex: '1', minWidth: '120px' }}>
                                                    <label>Peso Morto (kg)</label>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                        <input type="checkbox" checked={item.incluirPesoMorto || false} onChange={e => atualizarValorItem(id, 'incluirPesoMorto', e.target.checked)} title="Usar Peso Morto"/>
                                                        <input type="number" step="0.1" value={item.pesoMorto || ''} onChange={e => atualizarValorItem(id, 'pesoMorto', e.target.value)} disabled={!item.incluirPesoMorto} placeholder="Opcional" style={{ width: '100%' }}/>
                                                    </div>
                                                </div>

                                                <div className={styles.editField} style={{ flex: '1', minWidth: '120px' }}>
                                                    <label style={{ color: '#ea580c' }}>Preço Arroba (R$)</label>
                                                    <input type="number" step="0.01" value={item.precoArroba || ''} onChange={e => atualizarValorItem(id, 'precoArroba', e.target.value)} placeholder="0.00" />
                                                </div>

                                                <div className={styles.editField} style={{ flex: '1', minWidth: '120px' }}>
                                                    <label style={{ color: '#16a34a' }}>Valor Final (R$)</label>
                                                    <input type="number" step="0.01" value={item.valorTotal || ''} onChange={e => atualizarValorItem(id, 'valorTotal', e.target.value)} placeholder="0.00" />
                                                </div>

                                            </div>
                                            <div className={styles.editActions}>
                                                <button onClick={() => setEditandoId(null)} className={styles.saveBtn}><CheckCircle2 size={14}/> Salvar Item</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className={styles.displayItemBox}>
                                            <div className={styles.itemStats} style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                                                <span>Peso: <strong>{item.incluirPesoMorto && item.pesoMorto ? `${item.pesoMorto} kg (Morto)` : `${item.pesoVivo} kg (Vivo)`}</strong></span>
                                                <span style={{ color: '#ea580c' }}>Arrobas: <strong>{arrobasExibicao.toFixed(2)} @</strong></span>
                                                <span style={{ color: '#16a34a' }}>Total: <strong>{formatMoney(item.valorTotal)}</strong></span>
                                            </div>
                                            <div className={styles.rowActions}>
                                                <button onClick={(e) => {e.stopPropagation(); setEditandoId(id)}} className={styles.btnEdit}><Pencil size={14}/> Ajustar</button>
                                                <button onClick={(e) => {e.stopPropagation(); toggleSelecao(animal)}} className={styles.btnDelete}><Trash2 size={14}/> Remover</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>

        {/* --- CARD DE FECHAMENTO --- */}
        <div className={styles.summaryCard}>
            <h2 className={styles.summaryTitle}>Acordo e Fechamento</h2>
            
            <div className={styles.formSection}>
                <div className={styles.formGroup}>
                    <label className={styles.label}>Comprador / Frigorífico *</label>
                    <input className={styles.input} value={dadosVenda.comprador} onChange={e => setDadosVenda({...dadosVenda, comprador: e.target.value})} placeholder="Ex: Frigorífico Friboi"/>
                </div>
                
                <div className={styles.formGroup}>
                    <label className={styles.label}>Data do Embarque *</label>
                    <input type="date" className={styles.input} value={dadosVenda.dataVenda} onChange={e => setDadosVenda({...dadosVenda, dataVenda: e.target.value})} />
                </div>
            </div>

            <div className={`${styles.summaryRow} ${styles.marginTop15}`}>
                <span className={styles.summaryRowLabel}>
                    <Scale size={14} className={styles.summaryRowIcon}/> {financeiros.qtd} Animais (Peso Base):
                </span>
                <strong className={styles.summaryRowValue}>
                    {financeiros.totalPesoBase.toFixed(1)} kg
                </strong>
            </div>
            
            <div className={`${styles.summaryRow} ${styles.marginTop10}`}>
                <span className={styles.summaryRowLabel}>
                    <Tag size={14} className={styles.summaryRowIcon}/> Total de Arrobas (@):
                </span>
                <strong className={styles.summaryRowValue} style={{ color: '#ea580c' }}>
                    {financeiros.totalArrobas.toFixed(2)} @
                </strong>
            </div>

            <div className={`${styles.summaryRow} ${styles.marginTop10} ${styles.paddingTop10} ${styles.borderTopDashed}`}>
                <span className={`${styles.summaryRowLabel} ${styles.summaryRowCustoOriginalLabel}`}>
                    <ArrowDownCircle size={14} className={styles.summaryRowCustoOriginalIcon}/> Custo Original do Lote:
                </span>
                <strong className={styles.summaryRowValue}>{formatMoney(financeiros.totalCusto)}</strong>
            </div>

            <div className={`${styles.summaryRow} ${styles.marginTop15}`} style={{ backgroundColor: '#f0fdf4', padding: '15px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                <span className={styles.summaryRowLabel} style={{ color: '#166534', fontWeight: 800, fontSize: '1.1rem' }}>
                    <DollarSign size={18} /> Valor Final da Venda:
                </span>
                <strong style={{ color: '#15803d', fontSize: '1.5rem', fontWeight: 900 }}>
                    {formatMoney(financeiros.totalVenda)}
                </strong>
            </div>
            
            <button className={styles.finishButton} onClick={prepararFinalizacao} disabled={financeiros.qtd === 0}>
               <CheckCircle2 size={20}/> Despachar Animais
            </button>
        </div>
      </div>

      {modalValidacao && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContainer}>
            
            <div className={styles.modalHeader}>
                <Calculator size={48} className={styles.modalIcon} />
                <h2 className={styles.modalTitle}>Confirmar Lote de Venda</h2>
                <p className={styles.modalSubtitle}>Confira os totais antes de registrar a saída para {dadosVenda.comprador}:</p>
            </div>

            <div className={styles.modalBody}>
                <div className={styles.modalValidacaoTabelaLinha}>
                    <span className={styles.modalValidacaoTabelaLabel}>Cabeças Despachadas:</span>
                    <strong className={styles.modalValidacaoTabelaValor}>
                        {financeiros.qtd} Animais
                    </strong>
                </div>
                <div className={styles.modalValidacaoTabelaLinha}>
                    <span className={styles.modalValidacaoTabelaLabel}>Total de Arrobas (@):</span>
                    <strong className={styles.modalValidacaoTabelaValor}>
                        {financeiros.totalArrobas.toFixed(2)} @
                    </strong>
                </div>
                
                <div className={styles.modalValidacaoSeparador}></div>
                
                <div className={styles.modalValidacaoDestaque}>
                    <span className={styles.modalValidacaoDestaqueLabel}>Valor Final a Receber:</span>
                    <strong className={styles.modalValidacaoDestaqueValue}>
                        {formatMoney(financeiros.totalVenda)}
                    </strong>
                </div>
            </div>

            <div className={styles.modalValidacaoAcoes}>
              <button 
                onClick={() => setModalValidacao(false)}
                disabled={processando}
                className={styles.btnModalCancelar}
              >
                Voltar e Corrigir
              </button>
              <button 
                onClick={confirmarVenda}
                disabled={processando}
                className={styles.btnModalConfirmar}
              >
                {processando ? <Loader2 size={18} className={`${styles.loadingIcon} ${styles.animateSpin}`}/> : <CheckCircle2 size={18}/>}
                Confirmar Saída
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}