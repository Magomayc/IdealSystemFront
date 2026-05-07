import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Printer, User, CreditCard, Tag, Wheat
} from 'lucide-react';
import { toast } from 'sonner';

import movimentacaoAPI from '../../services/movimentacaoMilhoAPI'; 

// Importação do CSS com o nome exato no singular
import styles from './Milho.module.css'; 

export default function Milho() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [detalhes, setDetalhes] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const carregarDetalhes = async () => {
      try {
        setLoading(true);
        // Busca a movimentação específica pelo ID que veio na URL
        const dados = await movimentacaoAPI.obterPorId(id);
        setDetalhes(dados);
      } catch (error) {
        toast.error("Erro ao carregar os detalhes da venda.");
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    if (id) carregarDetalhes();
  }, [id]);

  const handleImprimirPDF = () => {
    // Abre a tela de impressão do navegador (onde o usuário pode escolher "Salvar como PDF")
    window.print();
  };

  const getNomePagamento = (codigo) => {
    switch(codigo) {
      case 1: return 'Dinheiro';
      case 2: return 'Pix';
      case 3: return 'Boleto';
      case 4: return 'Cartão';
      case 5: return 'A Prazo';
      default: return 'Não informado';
    }
  };

  const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('pt-BR');

  if (loading) {
    return <div className={styles.loadingMensagem}>Carregando recibo...</div>;
  }

  if (!detalhes) {
    return (
      <div className={styles.loadingMensagem}>
        Registro não encontrado. <br/>
        <button onClick={() => navigate('/milhos')} className={styles.backButton} style={{marginTop: '20px'}}>Voltar</button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.contentWrapper}>
        
        {/* BOTÕES DE AÇÃO (Ficam ocultos no PDF graças ao CSS) */}
        <div className={`${styles.header} ${styles.noPrint}`}>
          <button onClick={() => navigate('/milhos')} className={styles.backButton}>
            <ArrowLeft size={20} /> Voltar
          </button>
          
          <button onClick={handleImprimirPDF} className={styles.printButton}>
            <Printer size={20} /> Salvar PDF / Imprimir
          </button>
        </div>

        {/* --- ÁREA DO RECIBO (O que vai sair no PDF) --- */}
        <div className={styles.reciboCard} id="area-recibo">
          
          {/* Cabeçalho do Recibo */}
          <div className={styles.reciboHeader}>
            <div className={styles.empresaLogo}>
              <Wheat size={40} className="text-yellow-600" />
              <div>
                <h2>Gestão Agro</h2>
                <p>Comprovante de Saída / Venda</p>
              </div>
            </div>
            <div className={styles.reciboInfo}>
              <strong>Registro Nº:</strong> {detalhes.id}<br/>
              <strong>Data:</strong> {formatDate(detalhes.dataMovimentacao)}
            </div>
          </div>

          <div className={styles.divider}></div>

          {/* Dados Principais */}
          <div className={styles.dadosGrid}>
            <div className={styles.dadoItem}>
              <span className={styles.dadoLabel}><User size={16}/> Comprador / Destino</span>
              {/* 👇 AJUSTE AQUI: Se não for venda (2), escreve "Fazenda" fixo */}
              <span className={styles.dadoValor}>
                {detalhes.tipo === 2 ? (detalhes.comprador || 'Não informado') : 'Fazenda'}
              </span>
            </div>
            
            <div className={styles.dadoItem}>
              <span className={styles.dadoLabel}><Tag size={16}/> Tipo de Operação</span>
              <span className={styles.dadoValor}>
                {detalhes.tipo === 1 ? 'Consumo (Trato)' : detalhes.tipo === 2 ? 'Venda' : 'Perda'}
              </span>
            </div>
          </div>

          {/* Tabela de Valores */}
          <table className={styles.tabelaValores}>
            <thead>
              <tr>
                <th>Descrição</th>
                <th className={styles.textRight}>Volume</th>
                {detalhes.tipo === 2 && <th className={styles.textRight}>Preço por Saca (60kg)</th>}
                {detalhes.tipo === 2 && <th className={styles.textRight}>Total</th>}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Milho a granel (Silo)</td>
                <td className={styles.textRight}>{detalhes.quantidadeKg.toLocaleString('pt-BR')} kg</td>
                {detalhes.tipo === 2 && <td className={styles.textRight}>{formatMoney(detalhes.valorPorSacoVendido)}</td>}
                {detalhes.tipo === 2 && <td className={styles.textRight}><strong>{formatMoney(detalhes.valorVenda)}</strong></td>}
              </tr>
            </tbody>
          </table>

          {/* Informações de Pagamento (Só aparece se for venda) */}
          {detalhes.tipo === 2 && (
            <div className={styles.pagamentoInfo}>
              <div className={styles.pagamentoBox}>
                <CreditCard size={20} className="text-slate-500" />
                <div>
                  <span className={styles.dadoLabel}>Forma de Pagamento</span>
                  <span className={styles.dadoValor}>{getNomePagamento(detalhes.pagamento)}</span>
                </div>
              </div>
              
              <div className={styles.totalBox}>
                <span>TOTAL GERAL:</span>
                <h2>{formatMoney(detalhes.valorVenda)}</h2>
              </div>
            </div>
          )}

          {/* Observações */}
          {detalhes.observacao && (
            <div className={styles.observacaoBox}>
              <strong>Observações:</strong>
              <p>{detalhes.observacao}</p>
            </div>
          )}

          {/* Rodapé do Recibo */}
          <div className={styles.reciboFooter}>
            <p>Documento gerado pelo sistema Gestão Agro em {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}.</p>
            <div className={styles.assinatura}>
              <hr />
              <span>Assinatura do Responsável</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}