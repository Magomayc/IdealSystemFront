import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, DollarSign, Loader2, Calendar, User, Eye, Trash2, Plus, 
  FileDown, X, Filter, AlertTriangle, ShoppingCart, ArrowUp, ArrowDown 
} from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import vendaAPI from '@/services/vendaAPI';    
import styles from './Vendas.module.css'; 

export function Vendas() {
  const navigate = useNavigate();
  const [vendas, setVendas] = useState([]);
  const [loading, setLoading] = useState(true);

  const [busca, setBusca] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [abaAtiva, setAbaAtiva] = useState('Venda'); 
  
  const [descontarBaixas, setDescontarBaixas] = useState(false);

  const carregarVendas = async () => {
    try {
      setLoading(true);
      const data = await vendaAPI.listar(); 
      const lista = Array.isArray(data) ? data : (data.data || []);
      setVendas(lista);
    } catch (error) {
      toast.error("Erro ao carregar histórico.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregarVendas(); }, []);

  const handleEstornar = async (id) => {
    if (!window.confirm("Tem certeza que deseja estornar e excluir este registro? Os animais voltarão para o estoque.")) return;
    try {
      await vendaAPI.excluir(id); 
      toast.success("Registro estornado com sucesso.");
      carregarVendas(); 
    } catch (error) {
      toast.error("Erro ao estornar registro.");
    }
  };

  const vendasNoPeriodo = useMemo(() => {
    return vendas.filter(v => {
      const nomeDb = v.comprador || v.Comprador || '';
      const matchNome = nomeDb.toLowerCase().includes(busca.toLowerCase());

      let matchData = true;
      if (dataInicio || dataFim) {
        const dataVenda = new Date(v.dataVenda || v.DataVenda);
        dataVenda.setHours(0,0,0,0);
        if (dataInicio) {
          const inicio = new Date(dataInicio);
          inicio.setHours(0,0,0,0);
          inicio.setDate(inicio.getDate() + 1); 
          if (dataVenda < inicio) matchData = false;
        }
        if (dataFim && matchData) {
          const fim = new Date(dataFim);
          fim.setHours(0,0,0,0);
          fim.setDate(fim.getDate() + 1);
          if (dataVenda > fim) matchData = false;
        }
      }
      return matchNome && matchData;
    });
  }, [vendas, busca, dataInicio, dataFim]);

  const vendasFiltradas = useMemo(() => {
    return vendasNoPeriodo.filter(v => {
      const isBaixa = (v.tipo || v.Tipo) === 2;
      const tipoRegistro = isBaixa ? 'Morte' : 'Venda';
      return tipoRegistro === abaAtiva;
    });
  }, [vendasNoPeriodo, abaAtiva]);

  const totaisGerais = useMemo(() => {
      let faturamentoVendas = 0;
      let custoVendas = 0;
      let prejuizoMortes = 0;

      vendasNoPeriodo.forEach(v => {
          const isBaixa = (v.tipo || v.Tipo) === 2;
          if (!isBaixa) {
              faturamentoVendas += Number(v.valorTotal || v.ValorTotal || 0);
              (v.itens || v.Itens || []).forEach(item => {
                  custoVendas += Number(item.valorEntrada || item.ValorEntrada || 0);
              });
          } else {
              (v.itens || v.Itens || []).forEach(item => {
                  prejuizoMortes += Number(item.valorEntrada || item.ValorEntrada || 0);
              });
          }
      });

      const lucroApenasVendas = faturamentoVendas - custoVendas;
      const lucroLiquidoReal = lucroApenasVendas - prejuizoMortes;

      return {
          faturamento: faturamentoVendas,
          lucroVendas: lucroApenasVendas,
          prejuizoMortes: prejuizoMortes,
          lucroFinal: descontarBaixas ? lucroLiquidoReal : lucroApenasVendas
      };
  }, [vendasNoPeriodo, descontarBaixas]);

  const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('pt-BR');
  const limparFiltros = () => { setBusca(''); setDataInicio(''); setDataFim(''); };

  // --- EXPORTAÇÃO PDF VERTICAL ---
  const exportarPDF = () => {
    const doc = new jsPDF('p', 'mm', 'a4'); // 'p' = Portrait (Vertical)
    const isVenda = abaAtiva === 'Venda';
    
    const primaryColor = isVenda ? [22, 163, 74] : [220, 38, 38]; 
    const darkColor = [30, 41, 59]; 

    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, 210, 35, 'F');

    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text(isVenda ? "Relatório Histórico de Vendas" : "Histórico de Baixas e Mortes", 14, 20);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 28);

    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text("Parâmetros do Filtro:", 14, 45);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    let filtroBusca = busca ? `Busca: "${busca}"` : "Busca: Todos";
    let filtroData = "Período: Completo";
    if (dataInicio || dataFim) {
        filtroData = `Período: ${dataInicio ? formatDate(dataInicio) : 'Início'} - ${dataFim ? formatDate(dataFim) : 'Hoje'}`;
    }
    doc.text(`${filtroBusca}  |  ${filtroData}`, 14, 50);

    // Configuração das colunas para caber na vertical
    const tableColumn = isVenda 
      ? ["Data", "Comprador", "Preço @", "Qtd", "Faturamento", "Lucro"]
      : ["Data", "Motivo da Baixa", "Qtd", "Prejuízo Total"];

    const tableRows = [];

    vendasFiltradas.forEach(registro => {
      const isBaixaReg = (registro.tipo || registro.Tipo) === 2;
      const nomeLimpo = registro.comprador || registro.Comprador;
      const valorTotalRegistro = isBaixaReg ? 0 : Number(registro.valorTotal || registro.ValorTotal || 0);
      const precoArroba = isBaixaReg ? 0 : Number(registro.precoArroba || registro.PrecoArroba || 0);
      const qtdCabecas = (registro.itens || registro.Itens || []).length;
      
      let custoTotalDestaSaida = 0;
      (registro.itens || registro.Itens || []).forEach(item => {
          const animal = item.animal || item.Animal || {};
          custoTotalDestaSaida += Number(item.valorEntrada || item.ValorEntrada || animal.valorEntrada || 0);
      });

      const lucroLinha = valorTotalRegistro - custoTotalDestaSaida;

      if (isVenda) {
          tableRows.push([
            formatDate(registro.dataVenda || registro.DataVenda),
            nomeLimpo,
            formatMoney(precoArroba),
            qtdCabecas,
            formatMoney(valorTotalRegistro),
            formatMoney(lucroLinha) 
          ]);
      } else {
          tableRows.push([
            formatDate(registro.dataVenda || registro.DataVenda),
            nomeLimpo,
            qtdCabecas,
            formatMoney(custoTotalDestaSaida),
          ]);
      }
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 55,
      theme: 'striped', 
      styles: { fontSize: 8, cellPadding: 3, valign: 'middle' },
      headStyles: { fillColor: darkColor, textColor: 255 },
      columnStyles: isVenda ? {
        0: { cellWidth: 22 },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 25, halign: 'right' },
        3: { cellWidth: 15, halign: 'center' },
        4: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
        5: { cellWidth: 30, halign: 'right', fontStyle: 'bold' }
      } : {
        0: { cellWidth: 30 },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 20, halign: 'center' },
        3: { cellWidth: 40, halign: 'right', fontStyle: 'bold', textColor: primaryColor }
      },
      didParseCell: (data) => {
          if(isVenda && data.column.index === 5 && data.section === 'body') {
              const text = data.cell.raw.toString();
              if(text.includes('-')) data.cell.styles.textColor = [220, 38, 38];
              else data.cell.styles.textColor = [22, 163, 74];
          }
      }
    });

    // Resumo final no rodapé do PDF
    let finalY = doc.lastAutoTable.finalY + 10;
    if (finalY > 250) { doc.addPage(); finalY = 20; }

    doc.setFillColor(248, 250, 252); 
    doc.roundedRect(14, finalY, 182, 30, 2, 2, 'F');

    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text("RESUMO FINANCEIRO DO PERÍODO", 20, finalY + 8);
    
    doc.setFontSize(11);
    doc.setTextColor(...darkColor);
    doc.setFont('helvetica', 'bold');
    
    if (isVenda) {
        doc.text(`Faturamento: ${formatMoney(totaisGerais.faturamento)}`, 20, finalY + 18);
        doc.setTextColor(totaisGerais.lucroFinal >= 0 ? 22 : 220, totaisGerais.lucroFinal >= 0 ? 163 : 38, totaisGerais.lucroFinal >= 0 ? 74 : 38);
        doc.text(`Lucro Líquido: ${formatMoney(totaisGerais.lucroFinal)}`, 100, finalY + 18);
        if (descontarBaixas) {
            doc.setFontSize(7);
            doc.setTextColor(150, 150, 150);
            doc.text("* Baixas e mortes descontadas do lucro líquido.", 20, finalY + 25);
        }
    } else {
        doc.setTextColor(...primaryColor);
        doc.text(`Prejuízo Total em Baixas: ${formatMoney(totaisGerais.prejuizoMortes)}`, 20, finalY + 18);
    }

    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`IdealSystem - Página ${i} de ${pageCount}`, 14, 285);
    }

    doc.save(`historico_${abaAtiva.toLowerCase()}.pdf`);
    toast.success("Relatório gerado!");
  };

  return (
    <div className={styles.container}>
      <div className={styles.contentWrapper}>
        
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>
                {abaAtiva === 'Venda' ? <ShoppingCart className="text-green-600" size={36}/> : <AlertTriangle className="text-red-600" size={36}/>} 
                {abaAtiva === 'Venda' ? ' Vendas ao Frigorífico' : ' Baixas e Mortes'}
            </h1>
            <p className={styles.subtitle}>Gerencie o histórico de saídas e exporte relatórios.</p>
          </div>
          
          <button 
            onClick={() => navigate(abaAtiva === 'Venda' ? '/vendas/nova' : '/baixas/nova')} 
            className={abaAtiva === 'Venda' ? styles.primaryButton : styles.dangerButton}
          >
            <Plus size={20} /> Nova {abaAtiva}
          </button>
        </div>

        <div className={styles.tabsContainer}>
            <button 
                onClick={() => { setAbaAtiva('Venda'); limparFiltros(); }}
                className={`${styles.tabButton} ${abaAtiva === 'Venda' ? styles.tabActiveVenda : styles.tabInactive}`}
            >
                Vendas (Lucro)
            </button>
            <button 
                onClick={() => { setAbaAtiva('Morte'); limparFiltros(); }}
                className={`${styles.tabButton} ${abaAtiva === 'Morte' ? styles.tabActiveMorte : styles.tabInactive}`}
            >
                Mortes / Baixas (Prejuízo)
            </button>
        </div>

        <div className={styles.filterCard}>
            <div className={styles.filterInputs}>
                <div className={styles.inputGroup}>
                    <Search className={styles.inputIcon} size={18}/>
                    <input 
                        className={styles.input} 
                        placeholder={abaAtiva === 'Venda' ? "Buscar por comprador..." : "Buscar por motivo..."} 
                        value={busca} 
                        onChange={e => setBusca(e.target.value)}
                    />
                </div>
                
                <div className={styles.dateGroup}>
                    <span className={styles.dateLabel}>De:</span>
                    <input type="date" className={styles.dateInput} value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
                    <span className={styles.dateLabel}>Até:</span>
                    <input type="date" className={styles.dateInput} value={dataFim} onChange={e => setDataFim(e.target.value)} />
                </div>

                {(busca || dataInicio || dataFim) && (
                    <button onClick={limparFiltros} className={styles.clearButton} title="Limpar filtros">
                        <X size={18} />
                    </button>
                )}
            </div>

            <button onClick={exportarPDF} className={styles.secondaryButton} disabled={vendasFiltradas.length === 0}>
                <FileDown size={18} /> Exportar PDF
            </button>
        </div>

        <div className={styles.tableCard}>
          <div className={styles.tableContainer}>
            {loading ? (
                <div className={styles.loadingContainer}>
                    <Loader2 className="animate-spin" size={40}/>
                    <span>Carregando dados...</span>
                </div>
            ) : vendasFiltradas.length === 0 ? (
                <div className={styles.emptyState}>
                    <Filter size={48} style={{ opacity: 0.2 }}/>
                    <p>Nenhum registro encontrado.</p>
                </div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>{abaAtiva === 'Venda' ? 'Comprador/Frigorífico' : 'Motivo da Baixa'}</th>
                    <th>Qtd. Animais</th>
                    {abaAtiva === 'Venda' && <th>Preço @ (Médio)</th>}
                    {abaAtiva === 'Venda' && <th className={styles.textRight}>Faturamento</th>}
                    {abaAtiva === 'Venda' && <th className={styles.textRight}>Lucro Líquido</th>}
                    <th className={styles.textRight}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {vendasFiltradas.map(venda => {
                    const nomeLimpo = venda.comprador || venda.Comprador;
                    const faturamentoLinha = Number(venda.valorTotal || venda.ValorTotal || 0);
                    let custoLinha = 0;
                    (venda.itens || venda.Itens || []).forEach(i => {
                        custoLinha += Number(i.valorEntrada || i.ValorEntrada || 0);
                    });
                    const lucroLinha = faturamentoLinha - custoLinha;

                    return (
                        <tr key={venda.id || venda.ID}>
                        <td>
                            <div className={styles.dateInfo}>
                                <Calendar size={14} className="text-slate-400"/> 
                                <span>{formatDate(venda.dataVenda || venda.DataVenda)}</span>
                            </div>
                        </td>
                        <td>
                            <div className={styles.userInfo}>
                                {abaAtiva === 'Venda' ? <User size={16}/> : <AlertTriangle size={16}/>} 
                                {nomeLimpo}
                            </div>
                        </td>
                        <td>
                            <span className={styles.badge}>
                                {(venda.itens || venda.Itens || []).length} cabeças
                            </span>
                        </td>
                        {abaAtiva === 'Venda' && (
                            <td>
                                <span className={styles.arrobaValue}>
                                    {formatMoney(venda.precoArroba || venda.PrecoArroba)}
                                </span>
                            </td>
                        )}
                        {abaAtiva === 'Venda' && (
                            <td className={styles.textRight}>
                                <span className={styles.totalValue}>
                                    {formatMoney(faturamentoLinha)}
                                </span>
                            </td>
                        )}
                        {abaAtiva === 'Venda' && (
                            <td className={styles.textRight}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', fontWeight: 'bold', color: lucroLinha >= 0 ? '#166534' : '#dc2626' }}>
                                    {lucroLinha >= 0 ? <ArrowUp size={16}/> : <ArrowDown size={16}/>}
                                    {formatMoney(lucroLinha)}
                                </div>
                            </td>
                        )}
                        <td className={styles.textRight}>
                            <div className={styles.flexEnd}>
                                <button onClick={() => navigate(`/${abaAtiva === 'Venda' ? 'vendas' : 'baixas'}/${venda.id || venda.ID}`)} className={`${styles.actionBtn} ${styles.btnBlue}`} title="Ver Detalhes">
                                    <Eye size={18} />
                                </button>
                                <button onClick={() => handleEstornar(venda.id || venda.ID)} className={`${styles.actionBtn} ${styles.btnRed}`} title="Estornar e Devolver ao Estoque">
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </td>
                        </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
          
          {!loading && vendasFiltradas.length > 0 && (
              <div className={styles.tableFooter} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                  <span className={styles.footerText}>Mostrando <strong>{vendasFiltradas.length}</strong> registros</span>
                  
                  {abaAtiva === 'Venda' && (
                    <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                        {totaisGerais.prejuizoMortes > 0 && (
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#64748b', fontSize: '0.9rem', backgroundColor: '#f1f5f9', padding: '6px 12px', borderRadius: '6px' }}>
                                <input 
                                    type="checkbox" 
                                    checked={descontarBaixas} 
                                    onChange={e => setDescontarBaixas(e.target.checked)}
                                    style={{ accentColor: '#dc2626', width: '16px', height: '16px', cursor: 'pointer' }}
                                />
                                Descontar mortes do lucro
                            </label>
                        )}
                        <span className={styles.footerTotal}>
                            Faturamento: 
                            <strong className={styles.footerTotalValue} style={{ marginLeft: '8px' }}>
                                {formatMoney(totaisGerais.faturamento)}
                            </strong>
                        </span>
                        <span className={styles.footerTotal} style={{ color: totaisGerais.lucroFinal >= 0 ? '#166534' : '#dc2626' }}>
                            {descontarBaixas ? 'Lucro Líquido Real:' : 'Lucro das Vendas:'} 
                            <strong className={styles.footerTotalValue} style={{ marginLeft: '8px', color: totaisGerais.lucroFinal >= 0 ? '#166534' : '#dc2626' }}>
                                {formatMoney(totaisGerais.lucroFinal)}
                            </strong>
                        </span>
                    </div>
                  )}

                  {abaAtiva === 'Morte' && (
                      <div style={{ display: 'flex', gap: '24px' }}>
                          <span className={styles.footerTotal} style={{ color: '#dc2626' }}>
                              Prejuízo Total do Período: 
                              <strong className={styles.footerTotalValue} style={{ marginLeft: '8px', color: '#dc2626' }}>
                                  {formatMoney(totaisGerais.prejuizoMortes)}
                              </strong>
                          </span>
                      </div>
                  )}
              </div>
          )}
        </div>

      </div>
    </div>
  );
}