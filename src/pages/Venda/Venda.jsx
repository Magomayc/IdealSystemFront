import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Calendar, User, ShoppingBag, Scale, Loader2, FileDown,
  TrendingUp, ArrowDownCircle, ArrowUpCircle, AlertTriangle, CircleDollarSign, ArrowRight, Tag
} from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import vendaAPI from '@/services/vendaAPI';
import animalAPI from '@/services/animalAPI'; 
import styles from './Venda.module.css';

export default function Venda() {
  const { id } = useParams(); 
  const navigate = useNavigate();
  
  const [venda, setVenda] = useState(null);
  const [loading, setLoading] = useState(true);

  const [resumo, setResumo] = useState({ entrada: 0, saida: 0, lucro: 0, qtd: 0, totalArrobas: 0 });

  useEffect(() => {
    carregarDados();
  }, [id]);

  const extrairArray = (resposta) => {
      if (!resposta) return [];
      if (Array.isArray(resposta)) return resposta;
      if (Array.isArray(resposta.data)) return resposta.data;
      if (Array.isArray(resposta.result)) return resposta.result;
      return [];
  };

  const carregarDados = async () => {
    try {
      setLoading(true);
      
      const [listaVendas, listaAnimaisReq] = await Promise.all([
          vendaAPI.listar(),
          animalAPI.listar()
      ]);

      const arrayVendas = extrairArray(listaVendas);
      const arrayAnimais = extrairArray(listaAnimaisReq);
      
      const dadosVenda = arrayVendas.find(v => String(v.id || v.ID) === String(id));

      if (dadosVenda) {
        const itensEnriquecidos = await Promise.all((dadosVenda.itens || dadosVenda.Itens || []).map(async (item) => {
            const animalId = item.animalId || item.AnimalId || item.AnimalID || item.animal?.id || item.animal?.Id;
            
            let animalOriginal = arrayAnimais.find(a => String(a.id || a.Id) === String(animalId));

            if (!animalOriginal && animalId) {
                try {
                    const req = await animalAPI.obterPorId(animalId);
                    animalOriginal = req.data || req.result || req;
                } catch (e) {
                    console.log(`Animal ${animalId} não encontrado.`);
                }
            }
            
            return {
                ...item,
                animalOriginal: animalOriginal || item.animal || item.Animal || {} 
            };
        }));

        const vendaEnriquecida = { ...dadosVenda, itens: itensEnriquecidos };

        setVenda(vendaEnriquecida);
        calcularResumo(vendaEnriquecida);
      } else {
        throw new Error("Registro não encontrado");
      }
    } catch (error) {
      toast.error("Erro ao carregar detalhes.");
      navigate('/vendas');
    } finally {
      setLoading(false);
    }
  };

  const calcularResumo = (dados) => {
    if (!dados || !dados.itens) return;

    const isVendaReal = (dados.tipo || dados.Tipo) !== 2;
    let somaArrobas = 0;

    const custoTotal = dados.itens.reduce((acc, item) => {
        const objBase = item.animalOriginal || {};
        const custoAnimal = item.valorEntrada || item.ValorEntrada || objBase.valorEntrada || objBase.ValorEntrada || 0;
        
        const pesoMorto = Number(item.pesoMorto || item.PesoMorto || 0);
        const pesoVivo = Number(item.pesoVivo || item.PesoVivo || 0);
        somaArrobas += pesoMorto > 0 ? (pesoMorto / 15) : (pesoVivo / 30);

        return acc + Number(custoAnimal);
    }, 0);

    const vendaTotal = isVendaReal ? (dados.valorTotal || dados.ValorTotal || 0) : 0;
    
    setResumo({
        qtd: dados.itens.length,
        entrada: custoTotal,
        saida: vendaTotal,
        lucro: vendaTotal - custoTotal,
        totalArrobas: somaArrobas
    });
  };

  const isVenda = (venda?.tipo || venda?.Tipo) !== 2;
  const compradorReal = venda?.comprador || venda?.Comprador || 'Não informado';
  const dataReal = venda?.dataVenda || venda?.DataVenda;
  const precoArrobaMedio = isVenda ? (venda?.precoArroba || venda?.PrecoArroba || 0) : 0;

  // --- EXPORTAÇÃO PDF PREMIUM (FORMATO VERTICAL / RETRATO) ---
  const handleSalvarPDF = () => {
    const doc = new jsPDF('p', 'mm', 'a4'); // 'p' = Portrait (Vertical)
    
    const primaryColor = isVenda ? [22, 163, 74] : [220, 38, 38]; 
    const darkColor = [30, 41, 59]; 

    // 1. CABEÇALHO
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, 210, 35, 'F');

    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text(isVenda ? `Comprovante de Venda #${venda.id || venda.ID}` : `Relatório de Baixa #${venda.id || venda.ID}`, 14, 18);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 26);

    // 2. INFORMAÇÕES GERAIS
    doc.setTextColor(...darkColor);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(isVenda ? "Comprador / Frigorífico:" : "Motivo da Ocorrência:", 14, 45);
    doc.setFont('helvetica', 'normal');
    doc.text(compradorReal, 14, 50);

    doc.setFont('helvetica', 'bold');
    doc.text("Data:", 135, 45);
    doc.setFont('helvetica', 'normal');
    doc.text(formatDate(dataReal).split(' ')[0], 135, 50);

    if (isVenda && precoArrobaMedio > 0) {
        doc.setFont('helvetica', 'bold');
        doc.text("Média @ Lote:", 170, 45);
        doc.setFont('helvetica', 'normal');
        doc.text(formatMoney(precoArrobaMedio), 170, 50);
    }

    // 3. TABELA DE ITENS (Otimizada para Portrait)
    const tableColumn = isVenda 
        ? ["Brinco/Raça", "Pesagens", "Rend", "Arrobas/@", "Custo", "Venda", "Lucro"]
        : ["Brinco/Raça", "Pesagens", "Rend", "Custo (Prejuízo)"];
        
    const tableRows = (venda.itens || []).map(item => {
        const objBase = item.animalOriginal || {};
        const raca = item.raca || item.Raca || objBase.raca || objBase.Raca || 'N/I';
        const brinco = objBase.brinco || objBase.Brinco || `ID:${item.animalId || item.AnimalID}`;
        const custo = Number(item.valorEntrada || item.ValorEntrada || objBase.valorEntrada || objBase.ValorEntrada || 0);
        const pesoEntrada = Number(item.pesoEntrada || item.PesoEntrada || objBase.peso || objBase.Peso || 0);
        const pesoVivoSaida = Number(item.pesoVivo || item.PesoVivo || 0);
        const pesoMorto = Number(item.pesoMorto || item.PesoMorto || 0);

        const vendaVal = isVenda ? (item.valorUnitario || item.ValorUnitario || item.valorVenda || item.ValorVenda || 0) : 0;
        const lucroItem = vendaVal - custo;

        const qtdArrobas = pesoMorto > 0 ? (pesoMorto / 15) : (pesoVivoSaida / 30);
        const precoArr = Number(item.precoArroba || item.PrecoArroba || precoArrobaMedio);

        let rendStr = '-';
        if (pesoVivoSaida > 0 && pesoMorto > 0) {
            rendStr = `${((pesoMorto / pesoVivoSaida) * 100).toFixed(0)}%`;
        }

        // Abreviando para caber na vertical
        const pesoTexto = `E:${pesoEntrada}k\nS:${pesoVivoSaida}k${pesoMorto > 0 ? `\nC:${pesoMorto}k` : ''}`;

        if (isVenda) {
            return [
                `#${brinco}\n${raca}`,
                pesoTexto,
                rendStr,
                `${qtdArrobas.toFixed(1)}@\n${formatMoney(precoArr)}`,
                formatMoney(custo),
                formatMoney(vendaVal),
                formatMoney(lucroItem)
            ];
        } else {
            return [
                `#${brinco}\n${raca}`,
                pesoTexto,
                rendStr,
                formatMoney(custo)
            ];
        }
    });

    autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 58,
        theme: 'striped',
        styles: { fontSize: 7.5, cellPadding: 2, valign: 'middle', overflow: 'linebreak' }, 
        headStyles: { fillColor: darkColor, textColor: 255, halign: 'center' },
        columnStyles: isVenda ? {
            0: { cellWidth: 25 },
            1: { cellWidth: 28, halign: 'center' },
            2: { cellWidth: 12, halign: 'center' },
            3: { cellWidth: 28, halign: 'center', fontStyle: 'bold' },
            4: { halign: 'right' },
            5: { halign: 'right', fontStyle: 'bold' },
            6: { halign: 'right', fontStyle: 'bold' }
        } : {
            0: { cellWidth: 50 },
            1: { cellWidth: 60, halign: 'center' },
            2: { cellWidth: 30, halign: 'center' }, 
            3: { halign: 'right', fontStyle: 'bold' }
        },
        didParseCell: (data) => {
            if (isVenda && data.section === 'body' && data.column.index === 6) {
                const valStr = data.cell.raw.toString().replace(/[^\d,-]/g, '').replace(',', '.');
                if (parseFloat(valStr) < 0) data.cell.styles.textColor = [220, 38, 38];
                else data.cell.styles.textColor = [22, 163, 74];
            }
        }
    });

    // 4. RODAPÉ COM TOTAIS
    let finalY = doc.lastAutoTable.finalY + 10;
    if (finalY > 240) { doc.addPage(); finalY = 20; }

    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, finalY, 182, 35, 2, 2, 'F');
    
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text("RESUMO CONSOLIDADO", 20, finalY + 8);
    
    doc.setFontSize(10);
    doc.setTextColor(...darkColor);
    doc.text(`Cabeças: ${resumo.qtd}`, 20, finalY + 18);
    doc.text(`Custo Total: ${formatMoney(resumo.entrada)}`, 20, finalY + 26);

    if (isVenda) {
        doc.setTextColor(234, 88, 12);
        doc.text(`Total @: ${resumo.totalArrobas.toFixed(2)}`, 80, finalY + 18);
        doc.setTextColor(...darkColor);
        doc.text(`Faturamento: ${formatMoney(resumo.saida)}`, 130, finalY + 18);
        doc.setFontSize(12);
        doc.setTextColor(...primaryColor);
        doc.text(`Lucro Líquido: ${formatMoney(resumo.lucro)}`, 130, finalY + 26);
    }

    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`IdealSystem - Página ${i} de ${pageCount}`, 14, 285);
        doc.text(`ID Registro: ${venda.id || venda.ID}`, 170, 285);
    }

    doc.save(`${isVenda ? 'venda' : 'baixa'}_${venda.id || venda.ID}.pdf`);
  };

  const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  const formatDate = (dateStr) => {
    if(!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (loading) return <div className={styles.loadingContainer}><Loader2 className="animate-spin" size={40}/></div>;
  if (!venda) return null;

  return (
    <div className={styles.container}>
      <div className={styles.contentWrapper}>
        
        <div className={styles.actionBar}>
          <button onClick={() => navigate('/vendas')} className={styles.backButton}>
            <ArrowLeft size={20} /> Voltar para Relatórios
          </button>
          <div className="flex gap-3">
            <button onClick={handleSalvarPDF} className={styles.pdfButton}>
                <FileDown size={18} /> Baixar PDF
            </button>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.headerTop}>
                <div>
                    <div className={styles.statusBadge}>
                        <span className={isVenda ? styles.badgeVenda : styles.badgeMorte}>
                            {isVenda ? 'Venda Concluída' : 'Baixa de Estoque Registrada'}
                        </span>
                        <span className={styles.idLabel}>Registro #{venda.id || venda.ID}</span>
                    </div>
                    <h1 className={styles.title}>
                        {isVenda ? <User className={styles.iconGreen} /> : <AlertTriangle className={styles.iconRed} />} 
                        {compradorReal}
                    </h1>
                    <p className={styles.dateInfo}>
                        <Calendar size={16} /> {formatDate(dataReal)}
                    </p>
                    
                    {isVenda && precoArrobaMedio > 0 && (
                        <div className={styles.infoBoxContainer}>
                            <div className={styles.infoBox}>
                                <CircleDollarSign size={18} className={styles.iconGray}/>
                                <div>
                                    <div className={styles.infoBoxLabel}>Preço Médio da Arroba</div>
                                    <div className={styles.infoBoxValue}>{formatMoney(precoArrobaMedio)}</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className={styles.financialGrid}>
                <div className={styles.finCard}>
                    <div className={styles.finLabel}>
                        <ArrowDownCircle size={14} className={isVenda ? "text-orange-500" : "text-red-600"}/> 
                        {isVenda ? 'Custo Original (Lote)' : 'Custo do Prejuízo'}
                    </div>
                    <div className={styles.finValue} style={{ color: isVenda ? 'inherit' : '#dc2626' }}>
                        {formatMoney(resumo.entrada)}
                    </div>
                </div>

                {isVenda ? (
                    <>
                        <div className={styles.finCard}>
                            <div className={styles.finLabel}>
                                <ArrowUpCircle size={14} className="text-blue-500"/> Faturamento (Saída)
                            </div>
                            <div className={styles.finValue}>{formatMoney(resumo.saida)}</div>
                        </div>
                        <div className={`${styles.finCard} ${styles.lucroCard}`}>
                            <div className={styles.finLabel}>
                                <TrendingUp size={14} className="text-green-600"/> Lucro Líquido
                            </div>
                            <div className={styles.lucroValue}>{formatMoney(resumo.lucro)}</div>
                        </div>
                    </>
                ) : (
                    <div className={`${styles.finCard} ${styles.prejuizoCard}`} style={{ gridColumn: 'span 2' }}>
                        <div className={styles.finLabel}>
                            <AlertTriangle size={14} className="text-red-600"/> Resumo da Ocorrência
                        </div>
                        <div style={{ color: '#dc2626', fontSize: '1rem', marginTop: '4px' }}>
                            A baixa retirou {resumo.qtd} {resumo.qtd > 1 ? 'animais' : 'animal'} do estoque, assumindo a perda financeira dos custos de entrada.
                        </div>
                    </div>
                )}
            </div>
          </div>

          <div className={styles.cardBody}>
            <h3 className={styles.sectionTitle}>
                <ShoppingBag size={20} className={styles.iconGray}/> Detalhamento ({resumo.qtd} cabeças)
            </h3>
            
            <div className={styles.tableResponsive}>
                <table className={styles.table}>
                <thead>
                    <tr>
                        <th>Animal / Identificação</th>
                        <th className={styles.textCenter}>Evolução de Peso</th>
                        <th className={styles.textCenter}>Rend. (%)</th> 
                        {isVenda && <th className={styles.textCenter}>Arrobas / Preço @</th>}
                        <th className={styles.textRight}>{isVenda ? 'Custo Orig.' : 'Custo (Prejuízo)'}</th>
                        {isVenda && <th className={styles.textRight}>Valor da Venda</th>}
                        {isVenda && <th className={styles.textRight}>Margem Real</th>}
                    </tr>
                </thead>
                <tbody>
                    {(venda.itens || []).map((item, index) => {
                        const objBase = item.animalOriginal || {};
                        const raca = item.raca || item.Raca || objBase.raca || objBase.Raca || 'Não informada';
                        const brinco = objBase.brinco || objBase.Brinco || `ID:${item.animalId || item.AnimalID}`;
                        const custo = Number(item.valorEntrada || item.ValorEntrada || objBase.valorEntrada || objBase.ValorEntrada || 0);
                        const pesoEntrada = Number(item.weightEntrada || item.PesoEntrada || objBase.peso || objBase.Peso || 0);
                        const pesoVivoSaida = Number(item.pesoVivo || item.PesoVivo || 0);
                        const pesoMorto = Number(item.pesoMorto || item.PesoMorto || 0);

                        const vendaVal = isVenda ? (item.valorUnitario || item.ValorUnitario || item.valorVenda || item.ValorVenda || 0) : 0;
                        const lucroItem = vendaVal - custo;
                        
                        const qtdArrobas = pesoMorto > 0 ? (pesoMorto / 15) : (pesoVivoSaida / 30);
                        const precoArrobaItem = Number(item.precoArroba || item.PrecoArroba || precoArrobaMedio);
                        
                        let rendimentoStr = '-';
                        if (pesoVivoSaida > 0 && pesoMorto > 0) {
                            const rend = (pesoMorto / pesoVivoSaida) * 100;
                            rendimentoStr = `${rend.toFixed(1)}%`;
                        }

                        return (
                        <tr key={index}>
                            <td>
                                <div className={styles.animalName}>Brinco: #{brinco}</div>
                                <div className={styles.animalOrigin}>Raça: {raca}</div>
                            </td>
                            <td className={styles.textCenter}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span className={styles.weightBadge} style={{ backgroundColor: '#f1f5f9', color: '#64748b' }}>
                                            Entrada: {pesoEntrada} kg
                                        </span>
                                        <ArrowRight size={14} className="text-stone-400" />
                                        <span className={styles.weightBadge} style={{ backgroundColor: isVenda ? '#dcfce7' : '#fee2e2', color: isVenda ? '#166534' : '#dc2626' }}>
                                            {isVenda ? 'Saída' : 'Perda'}: {pesoVivoSaida} kg
                                        </span>
                                    </div>
                                    {isVenda && pesoMorto > 0 && (
                                        <div className={`${styles.weightBadge} ${styles.weightHighlight}`} style={{ marginTop: '2px' }}>
                                            Carcaça (Morto): {pesoMorto} kg
                                        </div>
                                    )}
                                </div>
                            </td>
                            <td className={styles.textCenter} style={{ fontWeight: 'bold', color: '#166534' }}>
                                {rendimentoStr}
                            </td>
                            
                            {isVenda && (
                                <td className={styles.textCenter}>
                                    <div style={{ color: '#ea580c', fontWeight: 'bold', fontSize: '1.05rem' }}>
                                        {qtdArrobas.toFixed(2)} @
                                    </div>
                                    <div style={{ color: '#64748b', fontSize: '0.85rem' }}>
                                        <Tag size={12} style={{display: 'inline', marginRight: '2px'}}/> 
                                        {formatMoney(precoArrobaItem)}
                                    </div>
                                </td>
                            )}

                            <td className={`${styles.textRight} ${styles.textStone} ${styles.fontMedium}`}>
                                {formatMoney(custo)}
                            </td>
                            
                            {isVenda && (
                                <td className={`${styles.textRight} ${styles.fontBold} ${styles.textBlue}`}>
                                    {formatMoney(vendaVal)}
                                </td>
                            )}
                            {isVenda && (
                                <td className={`${styles.textRight} ${styles.fontBold} ${lucroItem >= 0 ? styles.textGreen : styles.textRed} ${lucroItem >= 0 ? styles.bgGreenLight : styles.bgRedLight}`}>
                                    {formatMoney(lucroItem)}
                                </td>
                            )}
                        </tr>
                        );
                    })}
                </tbody>
                </table>
            </div>
          </div>
          
          <div className={styles.printFooter}>
              Documento gerado e validado pelo IdealSystem. Emissão: {new Date().toLocaleDateString()}.
          </div>

        </div>
      </div>
    </div>
  );
}