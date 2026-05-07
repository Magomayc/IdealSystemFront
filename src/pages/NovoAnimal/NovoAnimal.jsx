import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Save, Tag, Scale, DollarSign, Calculator, Info, Loader2, AlertCircle 
} from 'lucide-react';
import { toast } from 'sonner';

import animalAPI from '@/services/animalAPI';
import styles from './NovoAnimal.module.css';

export function NovoAnimal() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [brincosExistentes, setBrincosExistentes] = useState([]);
  
  const hoje = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    brinco: '',
    raca: '',
    sexo: 'Macho',
    vendedor: '',
    dataEntrada: hoje,
    peso: '',
    precoArroba: '',
    valorEntrada: '', 
    estoque: '1', 
    observacao: ''
  });

  // Busca TODOS os animais já cadastrados (Ativos e Inativos) usando a nova função da API
  useEffect(() => {
    const carregarBrincos = async () => {
      try {
        // 👇 Agora chamamos a função nova que traz TUDO direto do backend!
        const todosAnimais = await animalAPI.listarHistoricoCompleto();
        
        // NORMALIZAÇÃO: Remove espaços em branco e deixa tudo minúsculo para comparação exata
        const listaBrincos = todosAnimais
            .map(a => String(a.brinco || a.Brinco || '').trim().toLowerCase())
            .filter(Boolean);
            
        // Usamos o Set para remover valores duplicados
        setBrincosExistentes([...new Set(listaBrincos)]);
      } catch (error) {
        console.error("Erro ao carregar brincos", error);
        
        // Plano B caso a função nova falhe por algum motivo de rede
        try {
            const fallback = await animalAPI.listar();
            const dados = Array.isArray(fallback) ? fallback : fallback.data || [];
            const listaFallback = dados.map(a => String(a.brinco || a.Brinco || '').trim().toLowerCase()).filter(Boolean);
            setBrincosExistentes([...new Set(listaFallback)]);
        } catch(e) {}
      }
    };
    carregarBrincos();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Verificação em tempo real (Blindagem Visual)
  const brincoAtualNormalizado = String(formData.brinco).trim().toLowerCase();
  const brincoJaExiste = brincoAtualNormalizado !== '' && brincosExistentes.includes(brincoAtualNormalizado);

  // --- CÁLCULO BIDIRECIONAL AUTOMÁTICO ---
  const calcularValores = (campo, valor) => {
    let p = parseFloat(campo === 'peso' ? valor : formData.peso);
    let v = parseFloat(campo === 'valorEntrada' ? valor : formData.valorEntrada);
    let a = parseFloat(campo === 'precoArroba' ? valor : formData.precoArroba);

    if (isNaN(p) || p <= 0) return; 

    const qtdeArrobas = p / 30;

    if (campo === 'precoArroba' && !isNaN(a)) {
        const valorCalculado = qtdeArrobas * a;
        setFormData(prev => ({ ...prev, valorEntrada: valorCalculado.toFixed(2) }));
    } 
    else if (campo === 'valorEntrada' && !isNaN(v)) {
        const arrobaCalculada = v / qtdeArrobas;
        setFormData(prev => ({ ...prev, precoArroba: arrobaCalculada.toFixed(2) }));
    }
    else if (campo === 'peso') {
        if (!isNaN(a) && a > 0) {
            const valorCalculado = qtdeArrobas * a;
            setFormData(prev => ({ ...prev, valorEntrada: valorCalculado.toFixed(2) }));
        } else if (!isNaN(v) && v > 0) {
            const arrobaCalculada = v / qtdeArrobas;
            setFormData(prev => ({ ...prev, precoArroba: arrobaCalculada.toFixed(2) }));
        }
    }
  };

  const resumo = useMemo(() => {
    const peso = Number(formData.peso) || 0;
    const arrobas = peso / 30;
    return {
      pesoCarcaca: peso * 0.5,
      arrobas: arrobas,
      total: Number(formData.valorEntrada) || 0
    };
  }, [formData.peso, formData.valorEntrada]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Trava de segurança local extra antes de chamar a API
    if (brincoJaExiste) {
      toast.error(`Atenção: O brinco #${formData.brinco} já está sendo utilizado no histórico!`);
      return;
    }

    const payload = {
      Brinco: formData.brinco,
      Raca: formData.raca,
      Sexo: formData.sexo,                     
      Vendedor: formData.vendedor,
      Peso: Number(formData.peso),
      ValorEntrada: Number(formData.valorEntrada),
      PrecoArroba: Number(formData.precoArroba), 
      DataEntrada: formData.dataEntrada,
      Estoque: Number(formData.estoque),
      Observacao: formData.observacao,
      Ativo: true
    };

    if (payload.Peso <= 0 || payload.ValorEntrada <= 0 || payload.PrecoArroba <= 0) {
      toast.error("Peso, Valor e Preço da Arroba devem ser maiores que zero.");
      return;
    }

    try {
      setLoading(true);
      await animalAPI.criar(payload);
      toast.success("Entrada registrada com sucesso!");
      navigate('/animais'); 
    } catch (err) {
      console.error(err);
      // Aqui a mágica do Backend aparece! Se o C# bloquear, o Toast mostra a mensagem dele.
      const msg = err.response?.data?.mensagem || err.response?.data?.erro || "Erro ao registrar animal. Verifique os dados.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.contentWrapper}>
        
        <div className={styles.header}>
          <button onClick={() => navigate('/animais')} className={styles.backButton}>
            <ArrowLeft size={20} /> Voltar para Lista
          </button>
          <div>
            <h1 className={styles.title}>Nova Entrada de Animal</h1>
            <p className={styles.subtitle}>Registre a compra com cálculo dinâmico de arroba e valores.</p>
          </div>
        </div>

        <div className={styles.mainGrid}>
          
          <form onSubmit={handleSubmit} className={styles.formCard}>
            
            <h2 className={styles.sectionTitle}><Tag size={18}/> Identificação</h2>
            <div className={styles.inputRow}>
              <div className={styles.inputGroup}>
                <label>Nº do Brinco *</label>
                <input 
                  type="text" 
                  name="brinco" 
                  value={formData.brinco} 
                  onChange={handleChange} 
                  placeholder="Ex: 1599" 
                  required
                  // 👇 MÁGICA VISUAL AQUI: Borda e fundo vermelhos se o brinco já existir
                  style={brincoJaExiste ? { borderColor: '#dc2626', backgroundColor: '#fef2f2', outline: 'none' } : {}}
                />
                {/* 👇 MENSAGEM DE ERRO NA TELA EM TEMPO REAL */}
                {brincoJaExiste && (
                  <span style={{ color: '#dc2626', fontSize: '0.8rem', fontWeight: 'bold', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <AlertCircle size={14} /> Este brinco já consta no sistema!
                  </span>
                )}
              </div>
              <div className={styles.inputGroup}>
                <label>Raça *</label>
                <input type="text" name="raca" value={formData.raca} onChange={handleChange} placeholder="Ex: Nelore" required />
              </div>
              <div className={styles.inputGroup}>
                <label>Sexo *</label>
                <select name="sexo" value={formData.sexo} onChange={handleChange} required>
                  <option value="Macho">Macho</option>
                  <option value="Fêmea">Fêmea</option>
                </select>
              </div>
            </div>

            <div className={styles.inputRow}>
              <div className={styles.inputGroup} style={{ flex: 2 }}>
                <label>Vendedor / Origem *</label>
                <input type="text" name="vendedor" value={formData.vendedor} onChange={handleChange} placeholder="Ex: Fazenda Santa Rita" required />
              </div>
              <div className={styles.inputGroup} style={{ flex: 1 }}>
                <label>Data de Entrada *</label>
                <input type="date" name="dataEntrada" value={formData.dataEntrada} onChange={handleChange} required />
              </div>
            </div>

            <hr className={styles.divider} />

            <h2 className={styles.sectionTitle}><Scale size={18}/> Medidas e Financeiro</h2>
            <div className={styles.inputRow}>
              <div className={styles.inputGroup}>
                <label>Peso Vivo (kg) *</label>
                <div className={styles.inputWithIcon}>
                  <Scale size={16} className={styles.iconInside} />
                  <input 
                    type="number" name="peso" step="0.1" 
                    value={formData.peso} onChange={handleChange} 
                    onBlur={(e) => calcularValores('peso', e.target.value)}
                    placeholder="0.0" required 
                  />
                </div>
              </div>
              <div className={styles.inputGroup}>
                <label>Preço Arroba (R$) *</label>
                <div className={styles.inputWithIcon}>
                  <DollarSign size={16} className={styles.iconInside} />
                  <input 
                    type="number" name="precoArroba" step="0.01" 
                    value={formData.precoArroba} onChange={handleChange} 
                    onBlur={(e) => calcularValores('precoArroba', e.target.value)}
                    placeholder="Ex: 250.00" required 
                  />
                </div>
              </div>
              <div className={styles.inputGroup}>
                <label>Valor Total (R$) *</label>
                <div className={styles.inputWithIcon}>
                  <DollarSign size={16} className={styles.iconInside} />
                  <input 
                    type="number" name="valorEntrada" step="0.01" 
                    value={formData.valorEntrada} onChange={handleChange} 
                    onBlur={(e) => calcularValores('valorEntrada', e.target.value)}
                    placeholder="0.00" required 
                  />
                </div>
              </div>
            </div>

            <div className={styles.inputRow}>
              <div className={styles.inputGroup}>
                <label>Destino (Local) *</label>
                <select name="estoque" value={formData.estoque} onChange={handleChange}>
                  <option value="1">Solto a Pasto</option>
                  <option value="2">Confinamento (Cocho)</option>
                </select>
              </div>
              <div className={styles.inputGroup} style={{ flex: 2 }}>
                <label>Observações</label>
                <input type="text" name="observacao" value={formData.observacao} onChange={handleChange} placeholder="Detalhes de saúde, frete, etc." />
              </div>
            </div>

            <div className={styles.formActions}>
              <button type="button" onClick={() => navigate('/animais')} className={styles.btnCancel}>Cancelar</button>
              {/* 👇 MÁGICA DO BOTÃO: Se o brinco já existir, o botão desativa sozinho */}
              <button 
                type="submit" 
                className={styles.btnSave} 
                disabled={loading || brincoJaExiste}
                style={brincoJaExiste ? { backgroundColor: '#94a3b8', cursor: 'not-allowed' } : {}}
              >
                {loading ? <Loader2 className="animate-spin" size={20}/> : <Save size={20}/>}
                Registrar Entrada
              </button>
            </div>
          </form>

          {/* COLUNA DIREITA: Resumo / Cálculo Dinâmico */}
          <div className={styles.summaryCard}>
            <div className={styles.summaryHeader}>
              <Calculator size={24} />
              <h3>Painel do Animal</h3>
            </div>
            
            <div className={styles.summaryContent}>
              <div className={styles.infoAlert}>
                <Info size={16} style={{ flexShrink: 0 }} />
                <span>Cálculo padrão: <strong>Rendimento de 50%</strong> (1@ = 15kg de carcaça).</span>
              </div>

              <div className={styles.calcRow}>
                <span className={styles.calcLabel}>Peso Vivo Informado:</span>
                <span className={styles.calcValue}>{Number(formData.peso || 0).toFixed(1)} kg</span>
              </div>
              
              <div className={styles.calcRow}>
                <span className={styles.calcLabel}>Estimativa Carcaça:</span>
                <span className={styles.calcValue}>{resumo.pesoCarcaca.toFixed(1)} kg</span>
              </div>

              <div className={styles.calcHighlight}>
                <span className={styles.calcLabel}>Total Estimado:</span>
                <span className={styles.calcArroba}>{resumo.arrobas.toFixed(2)} @</span>
              </div>

              <div className={styles.calcTotal}>
                <span className={styles.totalLabel}>Custo Final do Animal</span>
                <span className={styles.totalValue}>
                  {resumo.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}