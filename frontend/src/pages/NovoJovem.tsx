import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { jovemService, opcoesService } from '../services/api';
import { JovemInput } from '../types';

interface FormData {
  nome: string;
  email: string;
  idade: string;
  formacao: string;
  curso: string;
  habilidades: string[];
  interesses: string[];
  planos_futuros: string;
}

const NovoJovem: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Redirecionar se não for instituição de ensino
  useEffect(() => {
    if (user?.papel !== 'instituicao_ensino') {
      navigate('/');
    }
  }, [user, navigate]);

  const [formData, setFormData] = useState<FormData>({
    nome: '',
    email: '',
    idade: '',
    formacao: '',
    curso: '',
    habilidades: [],
    interesses: [],
    planos_futuros: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{mensagem: string, tipo: 'success' | 'error'} | null>(null);
  const [loadingOpcoes, setLoadingOpcoes] = useState(true);
  const [opcoes, setOpcoes] = useState<{
    formacoes: string[];
    cursos: string[];
    habilidades: string[];
    interesses: string[];
  }>({
    formacoes: [],
    cursos: [],
    habilidades: [],
    interesses: []
  });

  // Carregar opções do sistema
  useEffect(() => {
    const carregarOpcoes = async () => {
      try {
        setLoadingOpcoes(true);
        const [formacoes, habilidades, interesses] = await Promise.all([
          opcoesService.obterOpcoesPorCategoria('formacoes'),
          opcoesService.obterOpcoesPorCategoria('habilidades'),
          opcoesService.obterOpcoesPorCategoria('areas_interesse')
        ]);

        setOpcoes({
          formacoes: formacoes.map((f: any) => f.valor),
          cursos: [], // Será preenchido baseado na formação
          habilidades: habilidades.map((h: any) => h.valor),
          interesses: interesses.map((i: any) => i.valor)
        });
      } catch (error) {
        console.error('Erro ao carregar opções:', error);
        setFeedback({
          mensagem: 'Erro ao carregar opções do sistema',
          tipo: 'error'
        });
      } finally {
        setLoadingOpcoes(false);
      }
    };

    carregarOpcoes();
  }, []);

  // Atualizar cursos disponíveis quando a formação mudar
  useEffect(() => {
    const carregarCursos = async () => {
      if (!formData.formacao) return;

      try {
        const cursos = await opcoesService.obterOpcoesPorCategoria('area_ensino');
        setOpcoes(prev => ({
          ...prev,
          cursos: cursos.map((c: any) => c.valor)
        }));
      } catch (error) {
        console.error('Erro ao carregar cursos:', error);
      }
    };

    carregarCursos();
  }, [formData.formacao]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleArrayChange = (name: string, value: string[]) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.nome.trim()) {
      newErrors.nome = 'Nome é obrigatório';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email é obrigatório';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }

    if (!formData.idade) {
      newErrors.idade = 'Idade é obrigatória';
    } else if (parseInt(formData.idade) < 14 || parseInt(formData.idade) > 29) {
      newErrors.idade = 'Idade deve estar entre 14 e 29 anos';
    }

    if (!formData.formacao) {
      newErrors.formacao = 'Formação é obrigatória';
    }

    if (['superior', 'pos_graduacao'].includes(formData.formacao) && !formData.curso) {
      newErrors.curso = 'Curso é obrigatório para formação superior';
    }

    if (!formData.habilidades.length) {
      newErrors.habilidades = 'Pelo menos uma habilidade é obrigatória';
    }

    if (!formData.interesses.length) {
      newErrors.interesses = 'Pelo menos um interesse é obrigatório';
    }

    if (!formData.planos_futuros.trim()) {
      newErrors.planos_futuros = 'Planos futuros são obrigatórios';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      setFeedback({
        mensagem: 'Por favor, corrija os erros no formulário',
        tipo: 'error'
      });
      return;
    }

    setLoading(true);
    setFeedback(null);
    
    try {
      await jovemService.adicionarJovem({
        ...formData,
        idade: parseInt(formData.idade)
      });
      
      setFeedback({
        mensagem: 'Jovem adicionado com sucesso!',
        tipo: 'success'
      });
      
      setTimeout(() => {
        navigate('/instituicao-ensino');
      }, 2000);
    } catch (error: any) {
      console.error('Erro ao adicionar jovem:', error);
      
      setFeedback({
        mensagem: error.response?.data?.message || error.message || 'Erro ao adicionar jovem',
        tipo: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  if (user?.papel !== 'instituicao_ensino') {
    return null;
  }

  return (
    <div className="min-h-screen bg-cursor-background py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Botão de Voltar */}
        <div className="mb-4">
          <button
            onClick={() => navigate('/instituicao-ensino')}
            className="btn-secondary"
          >
            Voltar
          </button>
        </div>
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-cursor-text-primary">Novo Jovem</h1>
            <p className="text-cursor-text-secondary mt-1">Adicione um novo jovem ao sistema</p>
          </div>
        </div>

        {feedback && (
          <div className={`mb-8 p-4 rounded-lg ${
            feedback.tipo === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {feedback.mensagem}
          </div>
        )}

        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="nome" className="block text-sm font-medium text-cursor-text-secondary mb-1">
                  Nome *
                </label>
                <input
                  type="text"
                  id="nome"
                  name="nome"
                  value={formData.nome}
                  onChange={handleChange}
                  className={`input-field w-full ${errors.nome ? 'border-cursor-error' : ''}`}
                  required
                />
                {errors.nome && (
                  <p className="mt-1 text-sm text-cursor-error">{errors.nome}</p>
                )}
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-cursor-text-secondary mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`input-field w-full ${errors.email ? 'border-cursor-error' : ''}`}
                  required
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-cursor-error">{errors.email}</p>
                )}
              </div>

              <div>
                <label htmlFor="idade" className="block text-sm font-medium text-cursor-text-secondary mb-1">
                  Idade *
                </label>
                <input
                  type="number"
                  id="idade"
                  name="idade"
                  value={formData.idade}
                  onChange={handleChange}
                  min="14"
                  max="29"
                  className={`input-field w-full ${errors.idade ? 'border-cursor-error' : ''}`}
                  required
                />
                {errors.idade && (
                  <p className="mt-1 text-sm text-cursor-error">{errors.idade}</p>
                )}
              </div>

              <div>
                <label htmlFor="formacao" className="block text-sm font-medium text-cursor-text-secondary mb-1">
                  Formação *
                </label>
                <select
                  id="formacao"
                  name="formacao"
                  value={formData.formacao}
                  onChange={handleChange}
                  className={`input-field w-full ${errors.formacao ? 'border-cursor-error' : ''}`}
                  required
                >
                  <option value="">Selecione uma formação</option>
                  {opcoes.formacoes.map((formacao) => (
                    <option key={formacao} value={formacao}>
                      {formacao.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                    </option>
                  ))}
                </select>
                {errors.formacao && (
                  <p className="mt-1 text-sm text-cursor-error">{errors.formacao}</p>
                )}
              </div>

              {formData.formacao && ['superior', 'pos_graduacao'].includes(formData.formacao) && (
                <div>
                  <label htmlFor="curso" className="block text-sm font-medium text-cursor-text-secondary mb-1">
                    Curso *
                  </label>
                  <select
                    id="curso"
                    name="curso"
                    value={formData.curso}
                    onChange={handleChange}
                    className={`input-field w-full ${errors.curso ? 'border-cursor-error' : ''}`}
                    required
                  >
                    <option value="">Selecione um curso</option>
                    {opcoes.cursos.map((curso) => (
                      <option key={curso} value={curso}>
                        {curso.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                      </option>
                    ))}
                  </select>
                  {errors.curso && (
                    <p className="mt-1 text-sm text-cursor-error">{errors.curso}</p>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-cursor-text-secondary mb-1">
                Habilidades *
              </label>
              <div className="p-3 rounded-lg bg-[#1a1a1a] border border-[#333]">
                {loadingOpcoes ? (
                  <p className="text-cursor-text-secondary">Carregando opções...</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {opcoes.habilidades.map((habilidade) => {
                      const selected = formData.habilidades.includes(habilidade);
                      return (
                        <button
                          type="button"
                          key={habilidade}
                          onClick={() => {
                            const newValue = selected
                              ? formData.habilidades.filter(h => h !== habilidade)
                              : [...formData.habilidades, habilidade];
                            handleArrayChange('habilidades', newValue);
                          }}
                          className={`flex items-center w-full text-left px-3 py-2 rounded transition border border-transparent hover:border-cursor-primary focus:outline-none ${selected ? 'bg-cursor-background-light font-semibold text-cursor-primary' : 'bg-transparent text-white'}`}
                        >
                          <span className={`mr-2 text-lg ${selected ? 'visible' : 'invisible'}`}>✓</span>
                          {habilidade.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              {errors.habilidades && (
                <p className="mt-1 text-sm text-cursor-error">{errors.habilidades}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-cursor-text-secondary mb-1">
                Interesses *
              </label>
              <div className="p-3 rounded-lg bg-[#1a1a1a] border border-[#333]">
                {loadingOpcoes ? (
                  <p className="text-cursor-text-secondary">Carregando opções...</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {opcoes.interesses.map((interesse) => {
                      const selected = formData.interesses.includes(interesse);
                      return (
                        <button
                          type="button"
                          key={interesse}
                          onClick={() => {
                            const newValue = selected
                              ? formData.interesses.filter(i => i !== interesse)
                              : [...formData.interesses, interesse];
                            handleArrayChange('interesses', newValue);
                          }}
                          className={`flex items-center w-full text-left px-3 py-2 rounded transition border border-transparent hover:border-cursor-primary focus:outline-none ${selected ? 'bg-cursor-background-light font-semibold text-cursor-primary' : 'bg-transparent text-white'}`}
                        >
                          <span className={`mr-2 text-lg ${selected ? 'visible' : 'invisible'}`}>✓</span>
                          {interesse.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              {errors.interesses && (
                <p className="mt-1 text-sm text-cursor-error">{errors.interesses}</p>
              )}
            </div>

            <div>
              <label htmlFor="planos_futuros" className="block text-sm font-medium text-cursor-text-secondary mb-1">
                Planos para o futuro *
              </label>
              <textarea
                id="planos_futuros"
                name="planos_futuros"
                value={formData.planos_futuros}
                onChange={handleChange}
                rows={3}
                className={`input-field w-full ${errors.planos_futuros ? 'border-cursor-error' : ''}`}
                required
                placeholder="Descreva os planos futuros do jovem..."
              />
              {errors.planos_futuros && (
                <p className="mt-1 text-sm text-cursor-error">{errors.planos_futuros}</p>
              )}
            </div>

            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => navigate('/instituicao-ensino')}
                className="btn-secondary"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="loading-spinner mr-2"></div>
                    Salvando...
                  </div>
                ) : 'Salvar jovem'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default NovoJovem; 