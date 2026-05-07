import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Save, Loader2, ArrowLeft, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import animalAPI from '@/services/animalAPI';
import styles from './EditarAnimal.module.css';

export function EditarAnimal() {
  const { id } = useParams(); 
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false); 
  const [loadingDados, setLoadingDados] = useState(true); 
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    brinco: '',      
    raca: '',        
    sexo: 'Macho',   // NOVO
    vendedor: '',
    peso: '',
    valorEntrada: '',
    precoArroba: '', // NOVO
    dataEntrada: '',
    estoque: 1       // ALINHADO com o C# (1 = Pasto, 2 = Cocho)
  });

  useEffect(() => {
    const carregarAnimal = async () => {
      try {
        const dados = await animalAPI.obterPorId(id);
        
        let dataFormatada = '';
        const dataCrua = dados.dataEntrada || dados.DataEntrada;
        if (dataCrua) {
            dataFormatada = dataCrua.split('T')[0];
        }

        setFormData({
            brinco: dados.brinco || dados.Brinco || '',
            raca: dados.raca || dados.Raca || '',
            sexo: dados.sexo || dados.Sexo || 'Macho', // Puxa o sexo
            vendedor: dados.vendedor || dados.Vendedor || '',
            peso: dados.peso || dados.Peso || '',
            valorEntrada: dados.valorEntrada || dados.ValorEntrada || '',
            precoArroba: dados.precoArroba || dados.PrecoArroba || '', // Puxa a arroba
            dataEntrada: dataFormatada,
            estoque: dados.estoque || dados.Estoque || 1 // Puxa o Enum do banco
        });
      } catch (err) {
        toast.error("Erro ao buscar dados do animal.");
        navigate('/animais');
      } finally {
        setLoadingDados(false);
      }
    };
    carregarAnimal();
  }, [id, navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // --- INTELIGÊNCIA: Cálculo Automático ---
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload = {
        Id: Number(id), 
        Brinco: formData.brinco,
        Raca: formData.raca,
        Sexo: formData.sexo,                     // NOVO
        Vendedor: formData.vendedor,
        Peso: Number(formData.peso),
        ValorEntrada: Number(formData.valorEntrada),
        PrecoArroba: Number(formData.precoArroba), // NOVO
        DataEntrada: formData.dataEntrada,
        Estoque: Number(formData.estoque),       // ALINHADO COM O BACKEND
        Ativo: true
      };

      if (payload.Peso <= 0 || payload.ValorEntrada <= 0 || payload.PrecoArroba <= 0) {
        setError("Peso, Valor e Preço da Arroba devem ser maiores que zero.");
        setLoading(false);
        return;
      }

      await animalAPI.atualizar(id, payload);

      toast.success("Registro atualizado com sucesso!");
      navigate('/animais');

    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.mensagem || "Erro ao salvar alterações.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (loadingDados) {
      return (
        <div className={styles.loadingContainer}>
            <Loader2 className="animate-spin text-orange-600" size={40} />
        </div>
      );
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        
        <div className={styles.header}>
          <h1 className={styles.title}>Editar Entrada</h1>
          <p className={styles.subtitle}>Ajuste os dados do registro #{id}</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <div className={styles.errorMessage}><AlertCircle size={16}/> {error}</div>}

          {/* Brinco, Raça e Sexo */}
          <div className={styles.row}>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Nº do Brinco</label>
                <input 
                    name="brinco" 
                    value={formData.brinco} 
                    onChange={handleChange} 
                    className={styles.input} 
                    required 
                />
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label}>Raça</label>
                <input 
                    name="raca" 
                    value={formData.raca} 
                    onChange={handleChange} 
                    className={styles.input} 
                    required 
                />
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label}>Sexo</label>
                <select 
                    name="sexo" 
                    value={formData.sexo} 
                    onChange={handleChange} 
                    className={styles.input} 
                    required
                >
                    <option value="Macho">Macho</option>
                    <option value="Fêmea">Fêmea</option>
                </select>
              </div>
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Vendedor / Origem</label>
            <input 
                name="vendedor" 
                value={formData.vendedor} 
                onChange={handleChange} 
                className={styles.input} 
                required 
            />
          </div>

          <div className={styles.row}>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Peso Vivo (kg)</label>
                <input 
                    name="peso" 
                    type="number"
                    step="0.1" 
                    value={formData.peso} 
                    onChange={handleChange} 
                    onBlur={(e) => calcularValores('peso', e.target.value)}
                    className={styles.input} 
                    required 
                />
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label}>Preço Arroba (R$)</label>
                <input 
                    name="precoArroba" 
                    type="number"
                    step="0.01" 
                    value={formData.precoArroba} 
                    onChange={handleChange} 
                    onBlur={(e) => calcularValores('precoArroba', e.target.value)}
                    className={styles.input} 
                    required 
                />
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label}>Valor (R$)</label>
                <input 
                    name="valorEntrada" 
                    type="number"
                    step="0.01" 
                    value={formData.valorEntrada} 
                    onChange={handleChange} 
                    onBlur={(e) => calcularValores('valorEntrada', e.target.value)}
                    className={styles.input} 
                    required 
                />
              </div>
          </div>

          <div className={styles.row}>
              {/* Seleção do Enumerador (Estoque) */}
              <div className={styles.inputGroup}>
                <label className={styles.label}>Local / Regime</label>
                <select 
                    name="estoque" 
                    value={formData.estoque} 
                    onChange={handleChange} 
                    className={styles.input} 
                    required
                >
                    <option value={1}>Gado a Pasto</option>
                    <option value={2}>Gado no Cocho</option>
                </select>
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label}>Data da Entrada</label>
                <input 
                    name="dataEntrada" 
                    type="date" 
                    value={formData.dataEntrada} 
                    onChange={handleChange} 
                    className={styles.input} 
                    required 
                />
              </div>
          </div>

          <button type="submit" className={styles.button} disabled={loading}>
            {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
            {loading ? 'Salvar Alterações' : 'Atualizar Registro'}
          </button>
        </form>

        <div className={styles.backContainer}>
            <Link to="/animais" className={styles.backLink}>
                <ArrowLeft size={16} /> Voltar para Lista
            </Link>
        </div>

      </div>
    </div>
  );
}