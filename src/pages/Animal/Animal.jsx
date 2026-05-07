import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Edit, Beef, Tag, MapPin, Calendar, 
  Scale, DollarSign, User, Activity, Loader2, Info
} from 'lucide-react';
import { toast } from 'sonner';

import animalAPI from '../../services/animalAPI'; 
import styles from './Animal.module.css';

export function Animal() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [animal, setAnimal] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const buscarAnimal = async () => {
      try {
        setLoading(true);
        const dados = await animalAPI.obterPorId(id); 
        setAnimal(dados);
      } catch (error) {
        toast.error("Erro ao carregar a ficha do animal.");
        navigate('/animais');
      } finally {
        setLoading(false);
      }
    };

    if (id) buscarAnimal();
  }, [id, navigate]);

  const formatarData = (dataString) => {
    if (!dataString) return '-';
    return new Date(dataString).toLocaleDateString('pt-BR');
  };

  const formatarMoeda = (valor) => {
    if (valor === undefined || valor === null) return 'R$ 0,00';
    return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Loader2 className="animate-spin text-orange-600 mb-4" size={48} />
        <p>Buscando ficha do animal...</p>
      </div>
    );
  }

  if (!animal) return null;

  const isPasto = Number(animal.estoque || animal.Estoque || animal.local || animal.Local || 1) === 1;
  const isAtivo = animal.ativo !== false;
  
  // Cálculo de Arrobas
  const pesoVivo = Number(animal.peso || animal.Peso || 0);
  const qtdArrobas = (pesoVivo / 30).toFixed(2);

  return (
    <div className={styles.container}>
      <div className={styles.contentWrapper}>
        
        {/* CABEÇALHO */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <button onClick={() => navigate('/animais')} className={styles.backButton}>
              <ArrowLeft size={20} /> Voltar
            </button>
            <div className={styles.titleWrapper}>
              <div className={styles.iconBubble}><Beef size={28} /></div>
              <div>
                <h1 className={styles.title}>
                  Ficha do Animal 
                  {/* 👇 AJUSTADO: Brinco em destaque */}
                  <span style={{ 
                    marginLeft: '12px',
                    backgroundColor: '#ffedd5', 
                    color: '#ea580c', 
                    padding: '4px 12px', 
                    borderRadius: '8px', 
                    fontSize: '1.4rem', 
                    fontWeight: '800', 
                    border: '1px solid #fed7aa',
                    verticalAlign: 'middle'
                  }}>
                    #{animal.brinco || animal.Brinco || 'N/I'}
                  </span>
                </h1>
                <p className={styles.subtitle}>Detalhes completos e histórico</p>
              </div>
            </div>
          </div>

          <div className={styles.headerActions}>
            <button 
              onClick={() => navigate(`/editarAnimal/${id}`)} 
              className={styles.editButton}
            >
              <Edit size={18} /> Editar Cadastro
            </button>
          </div>
        </div>

        {/* STATUS GERAL (BANNERS) */}
        <div className={styles.statusBanners}>
          <div className={`${styles.statusBadge} ${isAtivo ? styles.badgeActive : styles.badgeInactive}`}>
            <Activity size={18} />
            {isAtivo ? 'Animal no Estoque (Ativo)' : 'Animal Baixado (Vendido/Morto)'}
          </div>
          
          {isAtivo && (
            <div className={`${styles.statusBadge} ${isPasto ? styles.badgePasto : styles.badgeCocho}`}>
              <MapPin size={18} />
              Localização Atual: {isPasto ? 'A Pasto' : 'No Cocho'}
            </div>
          )}
        </div>

        {/* GRID DE INFORMAÇÕES */}
        <div className={styles.infoGrid}>
          
          {/* CARD 1: Identificação */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}><Tag size={20} className="text-orange-500" /> Identificação e Origem</h2>
            <div className={styles.cardContent}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Brinco de Identificação</span>
                <span className={styles.infoValue}>#{animal.brinco || animal.Brinco || '-'}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Raça</span>
                <span className={styles.infoValue}>{animal.raca || animal.Raca || 'Não Informada'}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Sexo</span>
                <span className={styles.infoValue}>{animal.sexo || animal.Sexo || 'Macho'}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}><User size={16}/> Comprado de (Vendedor)</span>
                <span className={styles.infoValue}>{animal.vendedor || animal.Vendedor || 'Não Informado'}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}><Calendar size={16}/> Data de Entrada</span>
                <span className={styles.infoValue}>{formatarData(animal.dataEntrada || animal.DataEntrada)}</span>
              </div>
            </div>
          </div>

          {/* CARD 2: Financeiro e Peso */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}><Scale size={20} className="text-blue-500" /> Medidas e Financeiro</h2>
            <div className={styles.cardContent}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Peso Vivo de Entrada</span>
                <span className={styles.infoValue}>{pesoVivo} kg</span>
              </div>

              {/* 👇 AJUSTADO: Nova linha com a quantidade de Arrobas calculada */}
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Arrobas na Entrada (@)</span>
                <span className={styles.infoValue} style={{ color: '#ea580c' }}>{qtdArrobas} @</span>
              </div>
              
              <div className={styles.divider}></div>

              <div className={styles.infoRow}>
                <span className={styles.infoLabel}><DollarSign size={16}/> Valor Investido (Custo)</span>
                <span className={styles.infoValueHighlight} style={{ color: '#dc2626' }}>
                  {formatarMoeda(animal.valorEntrada || animal.ValorEntrada)}
                </span>
              </div>
              
              {/* 👇 AJUSTADO: Renomeado para "Arroba pago" */}
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Arroba pago (Na Compra)</span>
                <span className={styles.infoValue} style={{ color: '#64748b' }}>
                  {formatarMoeda(animal.precoArroba || animal.PrecoArroba)}
                </span>
              </div>
            </div>
          </div>

          {/* CARD 3: Observações Adicionais */}
          <div className={styles.card} style={{ gridColumn: '1 / -1' }}>
            <h2 className={styles.cardTitle}><Info size={20} className="text-stone-500" /> Observações do Animal</h2>
            <div className={styles.cardContent}>
              <p className={styles.observacaoText}>
                {animal.observacao || animal.Observacao ? (
                  animal.observacao || animal.Observacao
                ) : (
                  <span className="text-stone-400 italic">Nenhuma observação registrada para este animal.</span>
                )}
              </p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}