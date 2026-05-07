import React, { useState, useEffect, useMemo } from 'react';
import { 
  Trash2, Pencil, Loader2, Plus, Beef, Calendar, Scale, Tag, 
  AlertCircle, ArrowRightLeft, Leaf, Wheat, Skull, Search, X, FileDown, Eye, Filter 
} from 'lucide-react';
import { toast } from 'sonner';
import { Link, useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import animalAPI from '@/services/animalAPI';
import styles from './Animais.module.css';

export function Animais() {
  const navigate = useNavigate();
  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // --- ESTADOS PARA A BUSCA ---
  const [busca, setBusca] = useState('');
  const [dataInicio, setDataInicio] = useState(''); // NOVO: Data Inicial
  const [dataFim, setDataFim] = useState('');       // NOVO: Data Final
  
  const [abaAtiva, setAbaAtiva] = useState('Todos'); 
  const [modalExcluir, setModalExcluir] = useState({ aberto: false, idParaExcluir: null });
  const [modalToggle, setModalToggle] = useState({ aberto: false, animal: null });

  const fetchAnimais = async () => {
    try {
      setLoading(true);
      const response = await animalAPI.listar();
      
      let dados = [];
      if (Array.isArray(response)) dados = response;
      else if (Array.isArray(response.data)) dados = response.data;
      else if (response.result) dados = response.result;

      setLista(dados);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar lista de animais.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnimais();
  }, []);

  const abrirModalToggle = (animal) => setModalToggle({ aberto: true, animal });

  const confirmarToggle = async () => {
    const animal = modalToggle.animal;
    if (!animal) return;

    const estoqueAtual = Number(animal.estoque || animal.Estoque || animal.local || animal.Local || 1);
    const novoEstoque = estoqueAtual === 1 ? 2 : 1; 
    const nomeNovoRegime = novoEstoque === 1 ? 'Pasto' : 'Cocho';

    try {
      let dataFormatada = '';
      const dataCrua = animal.dataEntrada || animal.DataEntrada;
      if (dataCrua) dataFormatada = dataCrua.split('T')[0];

      const payload = {
        Id: animal.id || animal.Id,
        Brinco: animal.brinco || animal.Brinco,
        Raca: animal.raca || animal.Raca,
        Sexo: animal.sexo || animal.Sexo || 'Macho',
        Vendedor: animal.vendedor || animal.Vendedor,
        Peso: Number(animal.peso || animal.Peso),
        ValorEntrada: Number(animal.valorEntrada || animal.ValorEntrada),
        PrecoArroba: Number(animal.precoArroba || animal.PrecoArroba || 0),
        DataEntrada: dataFormatada,
        Estoque: novoEstoque,
        Ativo: true
      };

      await animalAPI.atualizar(animal.id || animal.Id, payload);
      toast.success(`Animal transferido para o ${nomeNovoRegime}!`);
      fetchAnimais(); 
    } catch (error) {
      console.error(error);
      toast.error("Erro ao transferir o animal.");
    } finally {
      setModalToggle({ aberto: false, animal: null });
    }
  };

  const abrirModalExclusao = (id) => setModalExcluir({ aberto: true, idParaExcluir: id });

  const confirmarExclusao = async () => {
    try {
      await animalAPI.deletar(modalExcluir.idParaExcluir);
      toast.success("Registro removido com sucesso.");
      fetchAnimais();
    } catch (error) { 
      toast.error("Erro ao excluir registro."); 
    } finally {
      setModalExcluir({ aberto: false, idParaExcluir: null });
    }
  };

  const formatarData = (dataString) => {
    if (!dataString) return '-';
    return new Date(dataString).toLocaleDateString('pt-BR');
  };

  const formatarMoeda = (valor) => {
    if (valor === undefined || valor === null) return 'R$ 0,00';
    return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const limparFiltros = () => {
    setBusca('');
    setDataInicio('');
    setDataFim('');
  };

  // --- LÓGICA DE FILTRAGEM POR DATA ---
  const dentroDoPeriodo = (dataStr) => {
    if (!dataInicio && !dataFim) return true;
    if (!dataStr) return false;
    
    const d = new Date(dataStr);
    d.setHours(0,0,0,0);
    let match = true;
    
    if (dataInicio) {
        const inicio = new Date(dataInicio);
        inicio.setHours(0,0,0,0);
        inicio.setDate(inicio.getDate() + 1); // Ajuste de fuso
        if (d < inicio) match = false;
    }
    if (dataFim && match) {
        const fim = new Date(dataFim);
        fim.setHours(0,0,0,0);
        fim.setDate(fim.getDate() + 1); // Ajuste de fuso
        if (d > fim) match = false;
    }
    return match;
  };

  // --- FILTROS APLICADOS ---
  const animaisFiltrados = useMemo(() => {
    return lista.filter(animal => {
        // 1. Filtro da Aba (Local)
        const codigoLocal = Number(animal.estoque || animal.Estoque || animal.local || animal.Local || 1); 
        if (abaAtiva === 'Pasto' && codigoLocal !== 1) return false;
        if (abaAtiva === 'Cocho' && codigoLocal !== 2) return false;

        // 2. Filtro de Texto (Brinco ou Raça)
        if (busca) {
            const termoBusca = busca.toLowerCase();
            const brinco = (animal.brinco || animal.Brinco || '').toLowerCase();
            const raca = (animal.raca || animal.Raca || '').toLowerCase();
            
            if (!brinco.includes(termoBusca) && !raca.includes(termoBusca)) {
                return false;
            }
        }

        // 3. Filtro de Data
        if (!dentroDoPeriodo(animal.dataEntrada || animal.DataEntrada)) {
            return false;
        }

        return true;
    });
  }, [lista, abaAtiva, busca, dataInicio, dataFim]);

  const exportarPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4'); 
    const darkColor = [30, 41, 59]; 
    const primaryColor = [234, 88, 12]; 

    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, 297, 40, 'F'); 

    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text(`Relatório de Rebanho - ${abaAtiva === 'Todos' ? 'Geral' : abaAtiva}`, 14, 22);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 30);

    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text("Parâmetros:", 14, 52);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    let filtroData = "Todo o período";
    if (dataInicio || dataFim) {
        filtroData = `${dataInicio ? formatarData(dataInicio) : 'Início'} até ${dataFim ? formatarData(dataFim) : 'Hoje'}`;
    }

    doc.text(`Busca: ${busca ? `"${busca}"` : "Geral"}  |  Período: ${filtroData}  |  Total na Lista: ${animaisFiltrados.length} cabeças`, 14, 58);

    // 👇 AJUSTADO: Renomeado para "Arroba pago" no PDF
    const tableColumn = ["Brinco", "Raça", "Peso", "Arrobas (@)", "Arroba pago", "Regime", "Data Entrada", "Valor Investido"];
    const tableRows = [];
    
    let pesoTotal = 0;
    let valorTotal = 0;
    let arrobasTotal = 0;

    animaisFiltrados.forEach(animal => {
        const isPasto = Number(animal.estoque || animal.Estoque || animal.local || animal.Local || 1) === 1;
        const pesoStr = animal.peso || animal.Peso || 0;
        const precoArrStr = animal.precoArroba || animal.PrecoArroba || 0;
        const valorStr = animal.valorEntrada || animal.ValorEntrada || 0;
        
        const qtdArrobas = Number(pesoStr) / 30;

        pesoTotal += Number(pesoStr);
        valorTotal += Number(valorStr);
        arrobasTotal += qtdArrobas;

        tableRows.push([
            `#${animal.brinco || animal.Brinco || 'N/I'}`,
            animal.raca || animal.Raca || '-',
            `${pesoStr} kg`,
            `${qtdArrobas.toFixed(2)} @`, 
            formatarMoeda(precoArrStr), 
            isPasto ? 'Pasto' : 'Cocho',
            formatarData(animal.dataEntrada || animal.DataEntrada),
            formatarMoeda(valorStr)
        ]);
    });

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

    let finalY = doc.lastAutoTable.finalY + 15;
    if (finalY > 170) { doc.addPage(); finalY = 20; }

    doc.setFillColor(248, 250, 252); 
    doc.setDrawColor(200, 200, 200); 
    doc.roundedRect(14, finalY, 269, 35, 3, 3, 'FD'); 

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text("RESUMO DO REBANHO SELECIONADO", 20, finalY + 8);
    
    doc.setFontSize(12);
    doc.setTextColor(...darkColor);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total de Cabeças: ${animaisFiltrados.length}`, 20, finalY + 18);
    doc.text(`Peso Total: ${pesoTotal.toLocaleString('pt-BR')} kg`, 20, finalY + 26);
    
    doc.setTextColor(234, 88, 12);
    doc.text(`Total Arrobas: ${arrobasTotal.toFixed(2)} @`, 90, finalY + 18);
    doc.text(`Investimento: ${formatarMoeda(valorTotal)}`, 90, finalY + 26);

    doc.save(`relatorio_rebanho_${new Date().getTime()}.pdf`);
    toast.success("PDF do rebanho gerado com sucesso!");
  };

  if (loading) {
    return <div className={styles.loadingContainer}><Loader2 className="animate-spin" size={32} /></div>;
  }

  return (
    <div className={styles.container}>
      
      <div className={styles.header}>
        <div className={styles.titleWrapper}>
           <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
             <Beef className="text-orange-600" size={32} /> 
             Gestão do Rebanho
           </h1>
           <p className={styles.subtitle}>Controle os animais a pasto e no cocho.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
            <Link 
                to="/baixas/nova" 
                style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '0.6rem 1.2rem', borderRadius: '0.5rem', fontWeight: 'bold', textDecoration: 'none', transition: '0.2s' }}
            >
                <Skull size={18} /> Dar Baixa
            </Link>
            <Link to="/novoAnimal" className={styles.newButton}>
                <Plus size={18} /> Nova Entrada
            </Link>
        </div>
      </div>

      <div className={styles.tabsContainer}>
        {['Todos', 'Pasto', 'Cocho'].map(aba => (
          <button 
            key={aba}
            onClick={() => { setAbaAtiva(aba); limparFiltros(); }}
            className={`${styles.tabButton} ${abaAtiva === aba ? styles.tabActive : styles.tabInactive}`}
          >
            {aba === 'Todos' ? 'Todo o Rebanho' : `Gado ${aba === 'Pasto' ? 'a Pasto' : 'no Cocho'}`}
          </button>
        ))}
      </div>

      <div className={styles.filterCard} style={{ borderTopLeftRadius: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', flex: 1 }}>
                  <div className={styles.inputGroup} style={{ flex: '1', minWidth: '250px' }}>
                      <Search className={styles.inputIcon} size={18}/>
                      <input 
                          className={styles.input} 
                          placeholder="Buscar por brinco ou raça..." 
                          value={busca} 
                          onChange={e => setBusca(e.target.value)}
                      />
                  </div>

                  {/* 👇 AJUSTADO: Inclusão dos filtros de Data */}
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
                  className={styles.pdfButton} 
                  disabled={animaisFiltrados.length === 0}
              >
                  <FileDown size={18} /> Exportar PDF
              </button>
              
          </div>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
            <thead className={styles.thead}>
                <tr>
                    <th>Brinco</th>
                    <th>Raça</th>
                    <th>Peso</th>
                    <th>Arrobas (@)</th>
                    {/* 👇 AJUSTADO: Renomeado */}
                    <th>Arroba pago</th>
                    <th>Valor Entrada</th>
                    <th className={styles.textCenter}>Regime (Local)</th>
                    <th>Data Entrada</th>
                    <th className={styles.textRight}>Ações</th>
                </tr>
            </thead>
            <tbody className={styles.tbody}>
                {animaisFiltrados.map(animal => {
                    const isPasto = Number(animal.estoque || animal.Estoque || animal.local || animal.Local || 1) === 1;
                    const qtdArrobas = (Number(animal.peso || animal.Peso || 0) / 30).toFixed(2);

                    return (
                    <tr key={animal.id || animal.Id}>
                        <td>
                            {/* 👇 AJUSTADO: Brinco em destaque absoluto como uma "etiqueta" (badge) */}
                            <div style={{ 
                                backgroundColor: '#ffedd5', 
                                color: '#c2410c', 
                                padding: '4px 10px', 
                                borderRadius: '8px', 
                                fontSize: '1rem', 
                                fontWeight: '800', 
                                border: '1px solid #fed7aa', 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                gap: '6px' 
                            }}>
                                <Tag size={16} /> #{animal.brinco || animal.Brinco || 'N/I'}
                            </div>
                        </td>
                        <td>{animal.raca || animal.Raca || '-'}</td>
                        <td>
                            <div className="flex items-center gap-1">
                                <Scale size={14} className="text-stone-400"/> {animal.peso || animal.Peso || 0} kg
                            </div>
                        </td>
                        <td style={{ fontWeight: '700', color: '#ea580c' }}>
                            {qtdArrobas} @
                        </td>
                        <td style={{ color: '#64748b' }}>
                            {formatarMoeda(animal.precoArroba || animal.PrecoArroba || 0)}
                        </td>
                        <td className={styles.valorEntrada}>
                            {formatarMoeda(animal.valorEntrada || animal.ValorEntrada)}
                        </td>
                        <td className={styles.textCenter}>
                            <button 
                                onClick={() => abrirModalToggle(animal)} 
                                title={`Mover para ${isPasto ? 'Cocho' : 'Pasto'}`}
                                className={`${styles.toggleBtn} ${isPasto ? styles.togglePasto : styles.toggleCocho}`}
                            >
                                {isPasto ? <Leaf size={14} /> : <Wheat size={14} />}
                                {isPasto ? 'Pasto' : 'Cocho'}
                                <ArrowRightLeft size={14} className={styles.toggleArrow} />
                            </button>
                        </td>
                        <td>
                             <div className="flex items-center gap-1 text-stone-500">
                                <Calendar size={14}/> {formatarData(animal.dataEntrada || animal.DataEntrada)}
                            </div>
                        </td>
                        <td className={styles.textRight}>
                            <div className={styles.actionsWrapper}>
                                
                                <button 
                                    onClick={() => navigate(`/animais/${animal.id || animal.Id}`)} 
                                    className={`${styles.actionBtn} ${styles.btnBlue}`}
                                    title="Ver Ficha Completa do Animal"
                                >
                                    <Eye size={18} />
                                </button>
                                
                                <button 
                                    onClick={() => navigate(`/editarAnimal/${animal.id || animal.Id}`)} 
                                    className={`${styles.actionBtn} ${styles.btnEdit}`} title="Editar"
                                >
                                    <Pencil size={18}/>
                                </button>

                                <button 
                                    onClick={() => abrirModalExclusao(animal.id || animal.Id)} 
                                    className={`${styles.actionBtn} ${styles.btnDelete}`} title="Excluir Permanente"
                                >
                                    <Trash2 size={18}/>
                                </button>

                                <button 
                                    onClick={() => navigate('/baixas/nova')} 
                                    className={`${styles.actionBtn}`} 
                                    style={{ color: '#ea580c', backgroundColor: '#fff7ed', border: '1px solid #fed7aa' }}
                                    title="Registrar Baixa / Morte"
                                >
                                    <Skull size={18}/>
                                </button>

                            </div>
                        </td>
                    </tr>
                    );
                })}
                {animaisFiltrados.length === 0 && (
                    <tr>
                        <td colSpan={9}> 
                             <div className={styles.emptyState}>
                                <Filter size={48} style={{ opacity: 0.2 }}/>
                                <p>Nenhum animal encontrado para esta busca.</p>
                            </div>
                        </td>
                    </tr>
                )}
            </tbody>
        </table>
      </div>

      {/* MODAIS AQUI EMBAIXO (Inalterados) */}
      {modalToggle.aberto && modalToggle.animal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            <ArrowRightLeft size={48} className={`${styles.modalIcon} ${styles.iconBlue}`} />
            <h2 className={styles.modalTitle}>Transferir Animal</h2>
            <p className={styles.modalText}>
              Deseja transferir o animal <strong>#{modalToggle.animal.brinco || modalToggle.animal.Brinco}</strong> para o 
              <strong> {Number(modalToggle.animal.estoque || modalToggle.animal.Estoque || 1) === 1 ? 'Cocho' : 'Pasto'}</strong>?
            </p>
            <div className={styles.modalButtons}>
              <button onClick={() => setModalToggle({ aberto: false, animal: null })} className={styles.btnCancel}>
                Cancelar
              </button>
              <button onClick={confirmarToggle} className={styles.btnConfirmBlue}>
                Sim, Transferir
              </button>
            </div>
          </div>
        </div>
      )}

      {modalExcluir.aberto && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            <AlertCircle size={48} className={`${styles.modalIcon} ${styles.iconRed}`} />
            <h2 className={styles.modalTitle}>Excluir Animal?</h2>
            <p className={styles.modalText}>
              Tem certeza que deseja remover este registro permanentemente? (Use "Dar Baixa" caso o animal tenha morrido ou sido roubado).
            </p>
            <div className={styles.modalButtons}>
              <button onClick={() => setModalExcluir({ aberto: false, idParaExcluir: null })} className={styles.btnCancel}>
                Cancelar
              </button>
              <button onClick={confirmarExclusao} className={styles.btnConfirmRed}>
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}