import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, AlertTriangle, Loader2, CheckCircle2, 
  ArrowLeft, Trash2, Scale, Tag, ArrowDownCircle, Skull
} from 'lucide-react';
import { toast } from 'sonner';
import animalAPI from '@/services/animalAPI'; 
import vendaAPI from '@/services/vendaAPI';   
import styles from './NovaBaixa.module.css'; 

export function NovaBaixa() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [processando, setProcessando] = useState(false);
  const [modalValidacao, setModalValidacao] = useState(false);

  const [animais, setAnimais] = useState([]); 
  const [busca, setBusca] = useState('');
  const [dadosItens, setDadosItens] = useState({});
  
  const [dadosBaixa, setDadosBaixa] = useState({ 
    motivo: '', 
    dataBaixa: new Date().toISOString().split('T')[0]
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
            pesoVivo: animal.peso || animal.Peso || 0, 
            custoOriginal: animal.valorEntrada || animal.ValorEntrada || 0 
          } 
        };
      } else { 
        const novo = { ...prev }; 
        delete novo[id]; 
        return novo; 
      }
    });
  };

  const financeiros = useMemo(() => {
    const selecionados = Object.keys(dadosItens).filter(key => dadosItens[key]?.selecionado);
    return selecionados.reduce((acc, key) => {
      const item = dadosItens[key];
      acc.qtd += 1;
      acc.totalCusto += parseFloat(item.custoOriginal) || 0;
      acc.totalPesoVivo += parseFloat(item.pesoVivo) || 0;
      return acc;
    }, { qtd: 0, totalCusto: 0, totalPesoVivo: 0 });
  }, [dadosItens]);

  const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  const prepararFinalizacao = () => {
    if (financeiros.qtd === 0) return toast.warning("Selecione pelo menos um animal.");
    if (!dadosBaixa.motivo || dadosBaixa.motivo.trim() === '') return toast.warning("Informe o motivo da baixa.");
    
    setModalValidacao(true);
  };

  const confirmarBaixa = async () => {
    const itensParaEnviar = Object.keys(dadosItens)
      .filter(key => dadosItens[key].selecionado)
      .map(key => {
          const animalOriginal = animais.find(a => String(a.id || a.Id) === String(key)) || {};
          
          return { 
            AnimalId: parseInt(key), 
            PesoVivo: parseFloat(dadosItens[key].pesoVivo) || 0,
            Raca: animalOriginal.raca || animalOriginal.Raca || 'N/I',
            ValorEntrada: parseFloat(animalOriginal.valorEntrada || animalOriginal.ValorEntrada || 0),
            PesoEntrada: parseFloat(animalOriginal.peso || animalOriginal.Peso || 0)
          };
      });

    try {
      setProcessando(true);
      
      const payloadBaixa = { 
        Tipo: 2, // AJUSTE FINAL: A nossa "chave" que diz ao C# que isso é uma baixa
        Comprador: `Motivo: ${dadosBaixa.motivo.trim()}`, // Tiramos a gambiarra do "BAIXA -"
        DataVenda: dadosBaixa.dataBaixa, 
        PrecoArroba: 0, // Agora podemos mandar zero sem medo!
        ValorTotal: 0,  // Enviamos zerado também
        Itens: itensParaEnviar 
      };

      await vendaAPI.registrar(payloadBaixa);
      toast.success("Baixa registrada com sucesso!");
      navigate('/vendas'); 
    } catch (error) { 
      const mensagemErro = error.response?.data?.mensagem || error.response?.data?.errors || "Erro ao registrar a baixa.";
      console.error("Erro completo da API:", error.response?.data);
      
      if (typeof mensagemErro === 'object') {
         const primeiroErro = Object.values(mensagemErro)[0];
         toast.error(Array.isArray(primeiroErro) ? primeiroErro[0] : "Erro de validação nos campos.");
      } else {
         toast.error(mensagemErro); 
      }
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
            <AlertTriangle className="text-red-600" size={32}/> Registrar Baixa / Morte
        </h1>
        <p className={styles.subtitle}>Remova animais do estoque e registre o motivo da perda.</p>
      </div>

      <div className={styles.gridContainer}>
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
                {loading ? <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-red-600"/></div> : 
                 animaisFiltrados.map(animal => {
                    const id = animal.id || animal.Id;
                    const item = dadosItens[id] || {};
                    const sel = !!item.selecionado;
                    const brinco = animal.brinco || animal.Brinco || `ID:${id}`;
                    
                    return (
                        <div key={id} className={`${styles.itemRow} ${sel ? styles.selected : ''}`} onClick={() => !sel && toggleSelecao(animal)}>
                            <div className={styles.itemMainInfo}>
                                <div className={styles.itemHeader}>
                                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '4px', margin: 0, color: sel ? '#991b1b' : '#292524' }}>
                                        <Tag size={16} className="text-stone-400"/> #{brinco}
                                    </h4>
                                    <span style={{ fontSize: '0.85rem', color: '#64748b' }}>{animal.raca || animal.Raca}</span>
                                </div>
                                {!sel && <div className={styles.itemSubText}>Peso Constante: {animal.peso || animal.Peso} kg</div>}
                            </div>

                            {sel && (
                                <div className={styles.itemActionArea}>
                                    <div className={styles.displayItemBox}>
                                        <div className={styles.itemStats}>
                                            <span style={{ color: '#b91c1c', fontWeight: 'bold' }}>Perda: {formatMoney(item.custoOriginal)}</span>
                                            <span style={{ fontSize: '0.8rem' }}>Peso: {item.pesoVivo} kg</span>
                                        </div>
                                        <div className={styles.rowActions}>
                                            <button onClick={(e) => {e.stopPropagation(); toggleSelecao(animal)}} className={styles.btnDelete}><Trash2 size={16}/> Desfazer</button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>

        <div className={styles.summaryCard}>
            <h2 className={styles.summaryTitle}>Detalhes da Ocorrência</h2>
            
            <div className={styles.formSection}>
                <div className={styles.formGroup}>
                    <label className={styles.label}>Data da Ocorrência</label>
                    <input type="date" className={styles.input} value={dadosBaixa.dataBaixa} onChange={e => setDadosBaixa({...dadosBaixa, dataBaixa: e.target.value})} />
                </div>

                <div className={styles.formGroup} style={{ marginTop: '0.5rem' }}>
                    <label className={styles.label}>Motivo / Causa</label>
                    <input 
                        type="text"
                        className={styles.input} 
                        value={dadosBaixa.motivo} 
                        onChange={e => setDadosBaixa({...dadosBaixa, motivo: e.target.value})} 
                        placeholder="Ex: Morte natural, Picada de cobra..."
                    />
                </div>
            </div>

            <div className={styles.summaryRow} style={{ marginTop: '2rem' }}>
                <span className={styles.summaryRowLabel}>
                    <Scale size={14} className={styles.summaryRowIcon}/> Animais Afetados:
                </span>
                <strong className={styles.summaryRowValue}>{financeiros.qtd} cabeças</strong>
            </div>
            
            <div className={styles.summaryRow}>
                <span className={styles.summaryRowLabel}>
                    <Scale size={14} className={styles.summaryRowIcon}/> Peso Total Perdido:
                </span>
                <strong className={styles.summaryRowValue}>{financeiros.totalPesoVivo.toFixed(1)} kg</strong>
            </div>
            
            <div className={styles.finalTotalBox}>
                <span className={styles.finalTotalLabel}>Prejuízo Assumido:</span>
                <strong className={styles.finalTotalValue}>{formatMoney(financeiros.totalCusto)}</strong>
            </div>
            
            <button className={styles.finishButton} onClick={prepararFinalizacao} disabled={financeiros.qtd === 0}>
               <Skull size={20}/> Registrar Perda
            </button>
        </div>
      </div>

      {modalValidacao && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContainer}>
            <div className={styles.modalHeader}>
                <AlertTriangle size={48} className={styles.modalIcon} />
                <h2 className={styles.modalTitle}>Confirmar Registro de Baixa</h2>
                <p className={styles.modalSubtitle}>Esta ação removerá permanentemente {financeiros.qtd > 1 ? 'os animais' : 'o animal'} do seu estoque ativo.</p>
            </div>
            <div className={styles.modalBody}>
                <div className={styles.modalValidacaoTabelaLinha}>
                    <span className={styles.modalValidacaoTabelaLabel}>Motivo Declarado:</span>
                    <strong className={styles.modalValidacaoTabelaValor}>{dadosBaixa.motivo}</strong>
                </div>
                <div className={styles.modalValidacaoTabelaLinha}>
                    <span className={styles.modalValidacaoTabelaLabel}>Animais Selecionados:</span>
                    <strong className={styles.modalValidacaoTabelaValor}>{financeiros.qtd} cabeças</strong>
                </div>
                <div className={styles.modalValidacaoTabelaLinha}>
                    <span className={styles.modalValidacaoTabelaLabel}>Data da Baixa:</span>
                    <strong className={styles.modalValidacaoTabelaValor}>
                        {new Date(dadosBaixa.dataBaixa + 'T00:00:00').toLocaleDateString('pt-BR')}
                    </strong>
                </div>
                <div className={styles.modalValidacaoSeparador}></div>
                <div className={styles.modalValidacaoDestaque}>
                    <span className={styles.modalValidacaoDestaqueLabel}>Total de Prejuízo:</span>
                    <strong className={styles.modalValidacaoDestaqueValor}>{formatMoney(financeiros.totalCusto)}</strong>
                </div>
            </div>
            <div className={styles.modalValidacaoAcoes}>
              <button onClick={() => setModalValidacao(false)} disabled={processando} className={styles.btnModalCancelar}>
                Cancelar
              </button>
              <button onClick={confirmarBaixa} disabled={processando} className={styles.btnModalConfirmar}>
                {processando ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18}/>} Confirmar Baixa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}