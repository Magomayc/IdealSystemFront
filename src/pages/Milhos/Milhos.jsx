import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Plus, Loader2, Trash2, Edit, Calendar, 
  Wheat, TrendingDown, DollarSign, Package, ArrowUpRight, Eye, FileDown, X, Filter
} from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import milhoAPI from '../../services/milhoAPI'; 
import movimentacaoAPI from '../../services/movimentacaoMilhoAPI'; 

import styles from './Milhos.module.css'; 

export function Milhos() {
  const navigate = useNavigate();
  const [compras, setCompras] = useState([]);
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // FILTROS (Igual da tela de Vendas)
  const [busca, setBusca] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  
  const [abaAtiva, setAbaAtiva] = useState('entradas'); 

  const carregarDados = async () => {
    try {
      setLoading(true);
      const dadosCompras = await milhoAPI.listar(); 
      const dadosSaidas = await movimentacaoAPI.listar();
      
      setCompras(dadosCompras);
      setMovimentacoes(dadosSaidas);
    } catch (error) {
      toast.error("Erro ao conectar com o servidor.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    carregarDados(); 
  }, []);

  const getNomeTipo = (tipo) => {
    switch(tipo) {
      case 1: return <span className={styles.badgeBlue}>Consumo</span>;
      case 2: return <span className={styles.badgeGreen}>Venda</span>;
      case 3: return <span className={styles.badgeRed}>Perda</span>;
      default: return '-';
    }
  };

  const handleExcluirCompra = async (id) => {
    if (!window.confirm("Excluir esta compra? O estoque será recalculado.")) return;
    try {
      await milhoAPI.deletar(id); 
      setCompras(compras.filter(c => c.id !== id));
      toast.success("Compra removida com sucesso!");
    } catch(error) {
      toast.error("Erro ao remover a compra.");
    }
  };

  // 👇 NOVA FUNÇÃO: Excluir Saída (Movimentação)
  const handleExcluirMovimentacao = async (id) => {
    if (!window.confirm("Excluir esta saída? O saldo do silo será recalculado.")) return;
    try {
      await movimentacaoAPI.deletar(id);
      toast.success("Saída removida com sucesso!");
      // Recarregamos tudo para o backend recalcular o saldo do silo corretamente
      carregarDados(); 
    } catch(error) {
      toast.error("Erro ao remover a saída.");
    }
  };

  const resumo = useMemo(() => {
    const estoqueLivre = compras.reduce((acc, compra) => acc + Number(compra.kgEstoqueAtual || 0), 0);
    
    const totaisMov = movimentacoes.reduce((acc, mov) => {
      const kg = Number(mov.quantidadeKg || 0);
      const valor = Number(mov.valorVenda || 0);

      if (mov.tipo === 1) acc.kgUsado += kg;      
      else if (mov.tipo === 2) {
        acc.kgVendido += kg;     
        acc.totalVendido += valor;
      } 
      else if (mov.tipo === 3) acc.kgPerdido += kg;     

      return acc;
    }, { kgUsado: 0, kgVendido: 0, totalVendido: 0, kgPerdido: 0 });

    return { estoqueLivre, ...totaisMov };
  }, [compras, movimentacoes]); 

  // --- FUNÇÃO DE FILTRAGEM DE DATAS REUTILIZÁVEL ---
  const dentroDoPeriodo = (dataStr) => {
    if (!dataInicio && !dataFim) return true;
    const d = new Date(dataStr);
    d.setHours(0,0,0,0);
    let match = true;
    
    if (dataInicio) {
        const inicio = new Date(dataInicio);
        inicio.setHours(0,0,0,0);
        inicio.setDate(inicio.getDate() + 1); // Ajuste de fuso horário
        if (d < inicio) match = false;
    }
    if (dataFim && match) {
        const fim = new Date(dataFim);
        fim.setHours(0,0,0,0);
        fim.setDate(fim.getDate() + 1); // Ajuste de fuso horário
        if (d > fim) match = false;
    }
    return match;
  };

  // --- FILTROS APLICADOS ---
  const comprasFiltradas = useMemo(() => {
    return compras
      .filter(c => (c.vendedor || '').toLowerCase().includes(busca.toLowerCase()))
      .filter(c => dentroDoPeriodo(c.dataCompra))
      .sort((a, b) => new Date(b.dataCompra) - new Date(a.dataCompra)); 
  }, [compras, busca, dataInicio, dataFim]);
  
  const movimentacoesFiltradas = useMemo(() => {
    return movimentacoes
        .filter(m => (m.observacao || m.comprador || '').toLowerCase().includes(busca.toLowerCase()))
        .filter(m => dentroDoPeriodo(m.dataMovimentacao))
        .sort((a, b) => new Date(b.dataMovimentacao) - new Date(a.dataMovimentacao));
  }, [movimentacoes, busca, dataInicio, dataFim]);

  const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('pt-BR');
  
  const limparFiltros = () => { setBusca(''); setDataInicio(''); setDataFim(''); };

  // --- FUNÇÃO DE GERAR PDF ---
  const exportarPDF = () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const isEntrada = abaAtiva === 'entradas';
    
    const primaryColor = isEntrada ? [202, 138, 4] : [51, 65, 85]; // Amarelo p/ Entradas, Slate p/ Saídas
    const darkColor = [30, 41, 59]; 

    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, 210, 40, 'F');

    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text(isEntrada ? "Relatório de Compras de Milho" : "Relatório de Movimentações (Silo)", 14, 22);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 30);

    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text("Parâmetros do Relatório:", 14, 52);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    let filtroBusca = busca ? `Busca: "${busca}"` : "Busca: Geral (Todos)";
    let filtroData = "Período: Todo o histórico";
    if (dataInicio || dataFim) {
        filtroData = `Período: ${dataInicio ? formatDate(dataInicio) : 'Início'} até ${dataFim ? formatDate(dataFim) : 'Hoje'}`;
    }
    doc.text(`${filtroBusca}  |  ${filtroData}`, 14, 58);

    const tableColumn = isEntrada 
      ? ["Data", "Vendedor", "Sacos", "Kg Comprado", "Total Pago"]
      : ["Data", "Tipo", "Detalhes / Comprador", "Volume (Kg)", "Valor Venda"];

    const tableRows = [];

    if (isEntrada) {
        comprasFiltradas.forEach(c => {
            tableRows.push([
                formatDate(c.dataCompra),
                c.vendedor,
                `${c.quantidadeSacos} un`,
                `${c.kgComprado.toLocaleString('pt-BR')} kg`,
                formatMoney(c.valorTotal)
            ]);
        });
    } else {
        movimentacoesFiltradas.forEach(m => {
            let tipo = m.tipo === 1 ? 'Consumo' : m.tipo === 2 ? 'Venda' : 'Perda';
            tableRows.push([
                formatDate(m.dataMovimentacao),
                tipo,
                m.tipo === 2 ? m.comprador : (m.observacao || '-'),
                `${m.quantidadeKg.toLocaleString('pt-BR')} kg`,
                m.tipo === 2 && m.valorVenda > 0 ? formatMoney(m.valorVenda) : '-'
            ]);
        });
    }

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 65,
      theme: 'striped', 
      styles: { fontSize: 9, cellPadding: 3, textColor: [60, 60, 60], valign: 'middle' },
      headStyles: { fillColor: darkColor, textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { bottom: 30 } 
    });

    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.setFont('helvetica', 'normal');
        doc.text(`GadoSystem - Página ${i} de ${pageCount}`, 14, 290);
    }

    doc.save(`relatorio_${abaAtiva}_${new Date().getTime()}.pdf`);
    toast.success("PDF exportado com sucesso!");
  };

  return (
    <div className={styles.container}>
      <div className={styles.contentWrapper}>
        
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}><Wheat className="text-yellow-600" size={36}/> Gestão de Milho / Ração</h1>
            <p className={styles.subtitle}>Controle as entradas no silo, saídas e estoque disponível.</p>
          </div>
          
          <div className={styles.flexEnd} style={{ gap: '12px' }}>
            <button 
              onClick={() => navigate('/milho/nova-saida')} 
              className={styles.primaryButton}
              style={{ backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' }}
            >
              <ArrowUpRight size={20} /> Registrar Saída
            </button>

            <button 
              onClick={() => navigate('/milho/nova-compra')} 
              className={styles.primaryButton}
              style={{ backgroundColor: '#ca8a04' }}
            >
              <Plus size={20} /> Registrar Compra
            </button>
          </div>
        </div>

        <div className={styles.dashboardGrid}>
            <div className={styles.card}>
                <div className={styles.cardIcon} style={{ backgroundColor: '#fef9c3' }}><Package size={28} className="text-yellow-700"/></div>
                <div>
                    <div className={styles.cardLabel}>Saldo no Silo</div>
                    <div className={styles.cardValue}>{resumo.estoqueLivre.toLocaleString('pt-BR')} kg</div>
                </div>
            </div>

            <div className={styles.card}>
                <div className={styles.cardIcon} style={{ backgroundColor: '#dcfce7' }}><DollarSign size={28} className="text-green-700"/></div>
                <div>
                    <div className={styles.cardLabel}>Milho Vendido</div>
                    <div className={styles.cardValue} style={{ color: '#166534' }}>{formatMoney(resumo.totalVendido)}</div>
                    <div className={styles.cardSubValue}>Volume: {resumo.kgVendido.toLocaleString('pt-BR')} kg</div>
                </div>
            </div>

            <div className={styles.card}>
                <div className={styles.cardIcon} style={{ backgroundColor: '#eff6ff' }}><Wheat size={28} className="text-blue-700"/></div>
                <div>
                    <div className={styles.cardLabel}>Consumo (Trato)</div>
                    <div className={styles.cardValue} style={{ color: '#1d4ed8' }}>{resumo.kgUsado.toLocaleString('pt-BR')} kg</div>
                    <div className={styles.cardSubValue}>Usado no confinamento</div>
                </div>
            </div>

            <div className={styles.card}>
                <div className={styles.cardIcon} style={{ backgroundColor: '#fef2f2' }}><TrendingDown size={28} className="text-red-700"/></div>
                <div>
                    <div className={styles.cardLabel}>Perdas (Umidade/Pragas)</div>
                    <div className={styles.cardValue} style={{ color: '#b91c1c' }}>{resumo.kgPerdido.toLocaleString('pt-BR')} kg</div>
                    <div className={styles.cardSubValue}>Volume descartado</div>
                </div>
            </div>
        </div>

        <div className={styles.tabsContainer}>
          <button 
            className={`${styles.tabButton} ${abaAtiva === 'entradas' ? styles.activeTab : ''}`}
            onClick={() => { setAbaAtiva('entradas'); limparFiltros(); }}
          >
            Histórico de Compras (Entradas)
          </button>
          <button 
            className={`${styles.tabButton} ${abaAtiva === 'saidas' ? styles.activeTab : ''}`}
            onClick={() => { setAbaAtiva('saidas'); limparFiltros(); }}
          >
            Histórico de Movimentações (Saídas)
          </button>
        </div>

        {/* MOLDADO IGUAL À TELA DE VENDAS */}
        <div className={styles.filterCard} style={{ borderTopLeftRadius: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', flex: 1 }}>
                    <div className={styles.inputGroup} style={{ flex: '1', minWidth: '250px' }}>
                        <Search className={styles.inputIcon} size={18}/>
                        <input 
                            className={styles.input} 
                            placeholder={abaAtiva === 'entradas' ? "Buscar por vendedor..." : "Buscar observação ou comprador..."} 
                            value={busca} 
                            onChange={e => setBusca(e.target.value)}
                        />
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: 600 }}>De:</span>
                        <input type="date" className={styles.input} style={{ padding: '10px' }} value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
                        
                        <span style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: 600, marginLeft: '8px' }}>Até:</span>
                        <input type="date" className={styles.input} style={{ padding: '10px' }} value={dataFim} onChange={e => setDataFim(e.target.value)} />
                    </div>

                    {(busca || dataInicio || dataFim) && (
                        <button onClick={limparFiltros} className={styles.cancelButton} style={{ padding: '10px 12px', marginTop: 0 }} title="Limpar filtros">
                            <X size={18} />
                        </button>
                    )}
                </div>

                <button 
                    onClick={exportarPDF} 
                    className={styles.primaryButton} 
                    style={{ backgroundColor: '#334155', height: 'fit-content' }}
                    disabled={(abaAtiva === 'entradas' ? comprasFiltradas.length : movimentacoesFiltradas.length) === 0}
                >
                    <FileDown size={18} /> Exportar PDF
                </button>
                
            </div>
        </div>

        <div className={styles.tableCard}>
          <div className={styles.tableContainer}>
            {loading ? (
                <div className={styles.loadingContainer}><Loader2 className="animate-spin" size={40}/><span>Conectando ao banco...</span></div>
            ) : abaAtiva === 'entradas' ? (
              
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Data</th><th>Vendedor</th><th className={styles.textRight}>Sacos</th><th className={styles.textRight}>Kg Comprado</th>
                    <th className={styles.textRight}>Em Estoque</th><th className={styles.textRight}>Total Pago</th><th className={styles.textRight}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {comprasFiltradas.length === 0 ? (
                    <tr>
                        <td colSpan="7">
                            <div className={styles.emptyState}>
                                <Filter size={48} style={{ opacity: 0.2 }}/>
                                <p>Nenhum registro encontrado no filtro.</p>
                            </div>
                        </td>
                    </tr>
                  ) : comprasFiltradas.map(compra => (
                    <tr key={compra.id}>
                      <td><div className={styles.dateInfo}><Calendar size={14} className="text-slate-400"/> <span>{formatDate(compra.dataCompra)}</span></div></td>
                      <td className={styles.fontMedium}>{compra.vendedor}</td>
                      <td className={styles.textRight}>{compra.quantidadeSacos} un</td>
                      <td className={styles.textRight}>{compra.kgComprado.toLocaleString('pt-BR')} kg</td>
                      <td className={styles.textRight}><span className={compra.kgEstoqueAtual > 0 ? styles.badgeYellow : styles.textStone}>{compra.kgEstoqueAtual.toLocaleString('pt-BR')} kg</span></td>
                      <td className={`${styles.textRight} ${styles.fontBold} ${styles.textGreen}`}>{formatMoney(compra.valorTotal)}</td>
                      <td className={styles.textRight}>
                        <div className={styles.flexEnd}>
                          <button onClick={() => navigate(`/milho/editar/${compra.id}`)} className={`${styles.actionBtn} ${styles.btnBlue}`} title="Editar"><Edit size={18} /></button>
                          <button onClick={() => handleExcluirCompra(compra.id)} className={`${styles.actionBtn} ${styles.btnRed}`} title="Excluir"><Trash2 size={18} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

            ) : (

              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Tipo</th>
                    <th>Detalhes / Comprador</th>
                    <th className={styles.textRight}>Volume (Kg)</th>
                    <th className={styles.textRight}>Valor de Venda</th>
                    <th className={styles.textRight}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {movimentacoesFiltradas.length === 0 ? (
                    <tr>
                        <td colSpan="6">
                            <div className={styles.emptyState}>
                                <Filter size={48} style={{ opacity: 0.2 }}/>
                                <p>Nenhum registro encontrado no filtro.</p>
                            </div>
                        </td>
                    </tr>
                  ) : movimentacoesFiltradas.map((mov) => (
                    <tr key={mov.id}>
                      <td><div className={styles.dateInfo}><Calendar size={14} className="text-slate-400"/> <span>{formatDate(mov.dataMovimentacao)}</span></div></td>
                      <td>{getNomeTipo(mov.tipo)}</td>
                      <td>{mov.tipo === 2 ? mov.comprador : mov.observacao || '-'}</td>
                      <td className={styles.textRight}><span className={styles.textStone}>{mov.quantidadeKg.toLocaleString('pt-BR')} kg</span></td>
                      <td className={`${styles.textRight} ${styles.fontBold} ${styles.textGreen}`}>
                        {mov.tipo === 2 && mov.valorVenda > 0 ? formatMoney(mov.valorVenda) : '-'}
                      </td>
                      <td className={styles.textRight}>
                        <div className={styles.flexEnd}>
                          <button 
                            onClick={() => navigate(`/milho/${mov.id}`)} 
                            className={`${styles.actionBtn} ${styles.btnBlue}`}
                            title="Ver Detalhes da Movimentação"
                          >
                            <Eye size={18} />
                          </button>

                          {/* 👇 NOVO: Botão de excluir a saída/movimentação */}
                          <button 
                            onClick={() => handleExcluirMovimentacao(mov.id)} 
                            className={`${styles.actionBtn} ${styles.btnRed}`}
                            title="Excluir Movimentação"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

            )}
          </div>
        </div>
      </div>
    </div>
  );
}