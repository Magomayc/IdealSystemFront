import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, ShoppingCart, TrendingUp, Loader2, ArrowRight, DollarSign, Wheat, Package, AlertTriangle, Beef 
} from 'lucide-react';

import animalAPI from '../../services/animalAPI'; 
import vendaAPI from '../../services/vendaAPI';   
import milhoAPI from '../../services/milhoAPI'; 
import movimentacaoMilhoAPI from '../../services/movimentacaoMilhoAPI'; 

import styles from './Menu.module.css';

export default function MenuDashboard() {
  const navigate = useNavigate();

  // --- TRAVA DE SEGURANÇA (RBAC) SUPER BLINDADA ---
  const usuarioDados = localStorage.getItem('usuario_dados') || '{}';
  let usuario = {};
  try {
      usuario = JSON.parse(usuarioDados);
  } catch (e) {
      console.error("Erro ao ler usuário do localStorage");
  }
  
  // Procura o ID do cargo em todas as variações possíveis de maiúsculas/minúsculas ou objetos aninhados
  const tipoID = usuario?.tipoUsuarioID || 
                 usuario?.TipoUsuarioID || 
                 usuario?.tipoUsuarioId || 
                 usuario?.tipo || 
                 (usuario?.data && usuario?.data?.tipoUsuarioID) || 
                 0;

  const isAdmin = Number(tipoID) === 1;

  // --- ESTADOS DE CONFIGURAÇÃO DO DASHBOARD ---
  const [incluirMilhoNoLucro, setIncluirMilhoNoLucro] = useState(true);
  const [abaterMortesDoLucro, setAbaterMortesDoLucro] = useState(true);

  // --- 1. BUSCAR DADOS DE GADO ---
  const { data: listaVendasGado = [], isLoading: loadingVendas } = useQuery({
    queryKey: ['vendas_dashboard'],
    queryFn: async () => {
      try {
        const data = await vendaAPI.listar();
        return Array.isArray(data) ? data : (data.data || []);
      } catch (error) { return []; }
    },
    staleTime: 1000 * 60 * 5, 
  });

  const { data: listaAnimais = [], isLoading: loadingAnimais } = useQuery({
    queryKey: ['animais_dashboard'],
    queryFn: async () => {
      try {
        const data = await animalAPI.listar();
        return Array.isArray(data) ? data : (data.data || []);
      } catch (error) { return []; }
    },
    staleTime: 1000 * 60 * 5,
  });

  // --- 2. BUSCAR DADOS DE MILHO ---
  const { data: listaComprasMilho = [], isLoading: loadingComprasMilho } = useQuery({
    queryKey: ['compras_milho_dashboard'],
    queryFn: async () => {
      try { return await milhoAPI.listar(); } catch (error) { return []; }
    }
  });

  const { data: listaMovimentacoesMilho = [], isLoading: loadingMovimentacoesMilho } = useQuery({
    queryKey: ['movimentacoes_milho_dashboard'],
    queryFn: async () => {
      try { return await movimentacaoMilhoAPI.listar(); } catch (error) { return []; }
    }
  });

  const isLoading = loadingVendas || loadingAnimais || loadingComprasMilho || loadingMovimentacoesMilho;

  // --- 3. O GRANDE MOTOR FINANCEIRO (CÁLCULOS GERAIS) ---
  const kpis = useMemo(() => {
    
    const estoqueAtivo = listaAnimais.filter(a => a.ativo !== false).length;
    let qtdVendidos = 0;
    let qtdMortos = 0;
    
    let faturamentoGado = 0;
    let custoGadoVendido = 0;
    let prejuizoMortes = 0;

    listaVendasGado.forEach(v => {
      const isBaixa = (v.tipo || v.Tipo) === 2; 
      
      if (!isBaixa) {
          faturamentoGado += (Number(v.valorTotal || v.ValorTotal) || 0);
          (v.itens || v.Itens || []).forEach(item => {
              qtdVendidos++;
              custoGadoVendido += (Number(item.valorEntrada || item.ValorEntrada || item.animal?.valorEntrada) || 0);
          });
      } else {
          (v.itens || v.Itens || []).forEach(item => {
              qtdMortos++;
              prejuizoMortes += (Number(item.valorEntrada || item.ValorEntrada || item.animal?.valorEntrada) || 0);
          });
      }
    });

    const lucroGadoBruto = faturamentoGado - custoGadoVendido;
    const lucroGadoLiquido = lucroGadoBruto - prejuizoMortes;

    const kgSiloTotal = listaComprasMilho.reduce((acc, c) => acc + Number(c.kgEstoqueAtual || 0), 0);
    let investimentoTotalMilho = listaComprasMilho.reduce((acc, c) => acc + Number(c.valorTotal || 0), 0);
    
    let faturamentoMilho = 0;
    let kgPerdidoMilho = 0; 

    listaMovimentacoesMilho.forEach(m => {
        if (m.tipo === 2) { 
            faturamentoMilho += Number(m.valorVenda || 0);
        } else if (m.tipo === 3) { 
            kgPerdidoMilho += Number(m.quantidadeKg || 0);
        }
    });

    const saldoFinanceiroMilho = faturamentoMilho - investimentoTotalMilho; 

    let lucroGadoAtual = abaterMortesDoLucro ? lucroGadoLiquido : lucroGadoBruto;
    let lucroFinalExibido = lucroGadoAtual;
    
    if (incluirMilhoNoLucro) {
        lucroFinalExibido += saldoFinanceiroMilho;
    }

    return { 
        estoqueAtivo, qtdVendidos, qtdMortos,
        lucroGadoAtual, lucroGadoBruto, lucroGadoLiquido, prejuizoMortes,
        kgSiloTotal, saldoFinanceiroMilho, investimentoTotalMilho, faturamentoMilho, kgPerdidoMilho,
        lucroFinalExibido
    };
  }, [listaVendasGado, listaAnimais, listaComprasMilho, listaMovimentacoesMilho, incluirMilhoNoLucro, abaterMortesDoLucro]);

  const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <Loader2 className="animate-spin text-orange-600 mb-4" size={48} />
        <p>Carregando painel e atualizando números...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.contentWrapper}>
        
        {/* --- SEÇÃO 1: BOTÕES DE AÇÃO DESTACADOS --- */}
        <div className={styles.heroSection}>
          <h1 className={styles.heroTitle}>Painel Geral</h1>
          <p className={styles.heroSubtitle}>Visão unificada: Gado e Estoque de Milho.</p>
          
          {/* MÁGICA AQUI: Os botões grandes só aparecem se for ADMIN */}
          {isAdmin && (
            <div className={styles.actionButtonsGrid}>
              <button onClick={() => navigate('/novoAnimal')} className={`${styles.bigButton} ${styles.btnOrange}`}>
                <div className={styles.btnContent}>
                  <span className={styles.btnTitle}>Entrada Animal</span>
                  <span className={styles.btnDesc}>Cadastrar no rebanho</span>
                </div>
                <div className={styles.iconBg}><Beef size={64} /></div>
              </button>

              <button onClick={() => navigate('/vendas/nova')} className={`${styles.bigButton} ${styles.btnGreen}`}>
                <div className={styles.btnContent}>
                  <span className={styles.btnTitle}>Venda Animal</span>
                  <span className={styles.btnDesc}>Registrar ao frigorífico</span>
                </div>
                <div className={styles.iconBg}><ShoppingCart size={64} /></div>
              </button>

              <button onClick={() => navigate('/milho/nova-compra')} className={`${styles.bigButton} ${styles.btnYellow}`}>
                <div className={styles.btnContent}>
                  <span className={styles.btnTitle}>Compra Milho</span>
                  <span className={styles.btnDesc}>Abastecer o Silo</span>
                </div>
                <div className={styles.iconBg}><Wheat size={64} /></div>
              </button>
            </div>
          )}
        </div>

        {/* --- SEÇÃO 2: DASHBOARD GERAL --- */}
        <div className={styles.dashboardSection}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '16px' }}>
              <h2 className={styles.sectionTitle} style={{ margin: 0 }}>
                <TrendingUp size={20} className="text-slate-500"/> 
                Resultados e Estoque Atual
              </h2>

              <div style={{ display: 'flex', gap: '12px', background: 'white', padding: '6px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.8rem', color: '#475569', fontWeight: '500' }}>
                      <input 
                          type="checkbox" 
                          checked={abaterMortesDoLucro} 
                          onChange={(e) => setAbaterMortesDoLucro(e.target.checked)} 
                          style={{ accentColor: '#ea580c', width: '14px', height: '14px' }}
                      />
                      Abater Mortes
                  </label>
                  <div style={{ width: '1px', backgroundColor: '#e2e8f0' }}></div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.8rem', color: '#475569', fontWeight: '500' }}>
                      <input 
                          type="checkbox" 
                          checked={incluirMilhoNoLucro} 
                          onChange={(e) => setIncluirMilhoNoLucro(e.target.checked)} 
                          style={{ accentColor: '#ea580c', width: '14px', height: '14px' }}
                      />
                      Somar Milho no Lucro
                  </label>
              </div>
          </div>
          
          {/* CARDS INDICADORES */}
          <div className={styles.cardsGrid} style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            
            <div className={styles.trilogyGrid}>
                <div className={styles.card} style={{ border: '1px solid #cbd5e1', cursor: 'default' }}>
                    <div className={styles.cardHeader}>
                        <div className={`${styles.iconBubble} ${kpis.lucroGadoAtual >= 0 ? styles.bubbleGreen : styles.bubbleRed}`} style={{ width: '36px', height: '36px' }}><Beef size={18}/></div>
                        <span className={styles.cardLabel} style={{ fontSize: '0.75rem' }}>Lucro Gado</span>
                    </div>
                    <div className={`${styles.cardValue} ${kpis.lucroGadoAtual < 0 ? 'text-red-600' : 'text-slate-900'}`}>
                        {formatMoney(kpis.lucroGadoAtual)}
                    </div>
                    <div className={styles.cardFooter} style={{ color: '#64748b', fontSize: '0.7rem', paddingTop: '0.5rem', border: 'none' }}>
                        <span>{abaterMortesDoLucro ? 'Líquido' : 'Bruto'}</span>
                    </div>
                </div>

                <div className={styles.card} style={{ border: '1px solid #cbd5e1', cursor: 'default' }}>
                    <div className={styles.cardHeader}>
                        <div className={`${styles.iconBubble} ${kpis.saldoFinanceiroMilho >= 0 ? styles.bubbleGreen : styles.bubbleRed}`} style={{ width: '36px', height: '36px' }}><Wheat size={18}/></div>
                        <span className={styles.cardLabel} style={{ fontSize: '0.75rem' }}>Lucro Milho</span>
                    </div>
                    <div className={`${styles.cardValue} ${kpis.saldoFinanceiroMilho < 0 ? 'text-red-600' : 'text-slate-900'}`}>
                        {formatMoney(kpis.saldoFinanceiroMilho)}
                    </div>
                    <div className={styles.cardFooter} style={{ color: '#64748b', fontSize: '0.7rem', paddingTop: '0.5rem', border: 'none' }}>
                        <span>Venda - Compra</span>
                    </div>
                </div>

                <div className={styles.card} style={{ border: '2px solid #ca8a04', cursor: 'default', backgroundColor: '#fffbeb' }}>
                    <div className={styles.cardHeader}>
                        <div className={`${styles.iconBubble} ${kpis.lucroFinalExibido >= 0 ? styles.bubbleGreen : styles.bubbleRed}`} style={{ width: '36px', height: '36px' }}><DollarSign size={18}/></div>
                        <span className={styles.cardLabel} style={{ fontSize: '0.75rem', color: '#b45309', fontWeight: 'bold' }}>Global</span>
                    </div>
                    <div className={`${styles.cardValue} ${kpis.lucroFinalExibido < 0 ? 'text-red-600' : 'text-slate-900'}`} style={{ fontSize: '1.8rem' }}>
                        {formatMoney(kpis.lucroFinalExibido)}
                    </div>
                    <div className={styles.cardFooter} style={{ color: '#b45309', fontSize: '0.7rem', paddingTop: '0.5rem', borderColor: '#fde68a', border: 'none' }}>
                        <span>Conforme filtros</span>
                    </div>
                </div>
            </div>

            <div className={styles.card} onClick={() => navigate('/animais')}>
              <div className={styles.cardHeader}>
                <div className={`${styles.iconBubble} ${styles.bubbleOrange}`}><Beef size={24}/></div>
                <span className={styles.cardLabel}>Estoque</span>
              </div>
              <div className={styles.cardValue}>{kpis.estoqueAtivo} <span className={styles.valueUnit}>cabeças</span></div>
              <div className={styles.cardFooter}>
                <span>Ver lista completa</span> <ArrowRight size={16} className={styles.arrowIcon}/>
              </div>
            </div>

            <div className={styles.card} onClick={() => navigate('/vendas')}>
              <div className={styles.cardHeader}>
                <div className={`${styles.iconBubble} ${styles.bubbleBlue}`}><ShoppingCart size={24}/></div>
                <span className={styles.cardLabel}>Gado Vendido</span>
              </div>
              <div className={styles.cardValue}>
                {kpis.qtdVendidos} <span className={styles.valueUnit}>cabeças</span>
              </div>
              <div className={styles.cardFooter}>
                <span>Bruto:</span> <strong style={{color: '#166534'}}>{formatMoney(kpis.lucroGadoBruto)}</strong>
              </div>
            </div>

            <div className={styles.card} onClick={() => navigate('/vendas')} style={{ backgroundColor: '#fef2f2', borderColor: '#fecaca' }}>
              <div className={styles.cardHeader}>
                <div className={`${styles.iconBubble} ${styles.bubbleRed}`}><AlertTriangle size={24}/></div>
                <span className={styles.cardLabel} style={{color: '#991b1b'}}>Perdas</span>
              </div>
              <div className={styles.cardValue} style={{color: '#dc2626'}}>
                {kpis.qtdMortos} <span className={styles.valueUnit} style={{color:'#f87171'}}>animais</span>
              </div>
              
              <div className={styles.cardFooterCol} style={{ color: '#b91c1c' }}>
                <div className={styles.footerRow}>
                    <span>Gado:</span>
                    <strong>{formatMoney(kpis.prejuizoMortes)}</strong>
                </div>
                <div className={styles.footerRow}>
                    <span>Milho:</span>
                    <strong>{kpis.kgPerdidoMilho} kg</strong>
                </div>
              </div>
            </div>

            <div className={styles.card} onClick={() => navigate('/milhos')}>
              <div className={styles.cardHeader}>
                <div className={`${styles.iconBubble}`} style={{ backgroundColor: '#fef9c3', color: '#854d0e' }}><Package size={24}/></div>
                <span className={styles.cardLabel}>Silo (Milho)</span>
              </div>
              <div className={styles.cardValue}>
                {kpis.kgSiloTotal.toLocaleString('pt-BR')} <span className={styles.valueUnit}>kg</span>
              </div>
              
              <div className={styles.cardFooterCol} style={{ color: '#854d0e' }}>
                 <div className={styles.footerRow}>
                     <span>Gasto:</span>
                     <strong>{formatMoney(kpis.investimentoTotalMilho)}</strong>
                 </div>
                 <div className={styles.footerRow}>
                     <span>Lucro:</span>
                     <strong style={{ color: kpis.saldoFinanceiroMilho >= 0 ? '#166534' : '#dc2626' }}>{formatMoney(kpis.saldoFinanceiroMilho)}</strong>
                 </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}