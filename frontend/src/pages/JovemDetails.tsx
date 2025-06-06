import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  Jovem, 
  Avaliacao, 
  HistoricoDesenvolvimento,
  HistoricoDesenvolvimentoInput
} from '../types';
import { AvaliacoesJovem } from '../components/AvaliacoesJovem';
import { avaliacoesService } from '../services/avaliacoes';
import { jovemService } from '../services/api';
import { Checkbox, CheckboxGroup } from '@chakra-ui/react';

// Função para formatar a formação
const formatarFormacao = (formacao: string): string => {
  const formatacoes: { [key: string]: string } = {
    'ensino_medio': 'Ensino Médio',
    'tecnico': 'Técnico',
    'superior': 'Superior',
    'pos_graduacao': 'Pós-Graduação'
  };
  return formatacoes[formacao] || formacao;
};

// Função para formatar tipo e área
const formatarTipoArea = (valor: string): string => {
  if (!valor) return '';
  return valor
    .split('_')
    .map(palavra => palavra.charAt(0).toUpperCase() + palavra.slice(1).toLowerCase())
    .join(' ');
};

// Função para formatar texto com primeira letra maiúscula
const capitalizarPalavras = (texto: string | undefined | null): string => {
  if (!texto || typeof texto !== 'string') {
    return '';
  }
  return texto.split(' ').map(palavra => 
    palavra.charAt(0).toUpperCase() + palavra.slice(1).toLowerCase()
  ).join(' ');
};

const JovemDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [jovem, setJovem] = useState<Jovem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
  const [mediaGeral, setMediaGeral] = useState<number>(0);
  const [totalAvaliacoes, setTotalAvaliacoes] = useState<number>(0);
  const [historico, setHistorico] = useState<HistoricoDesenvolvimento[]>([]);
  const [selectedHabilidades, setSelectedHabilidades] = useState<string[]>([]);
  const [selectedInteresses, setSelectedInteresses] = useState<string[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!id) {
          setError('ID do jovem não fornecido');
          return;
        }

        console.log(`[JovemDetails] Iniciando carregamento de dados para jovem ${id}`);

        // Buscar dados do jovem
        try {
          const jovemData = await jovemService.getJovem(Number(id));
          console.log('[JovemDetails] Dados do jovem carregados:', jovemData);
          setJovem(jovemData);
          setSelectedHabilidades(jovemData.habilidades || []);
          setSelectedInteresses(jovemData.interesses || []);
        } catch (error: any) {
          console.error('[JovemDetails] Erro ao carregar dados do jovem:', error);
          setError(error.message || 'Erro ao carregar dados do jovem');
          return;
        }

        // Buscar avaliações
        try {
          const avaliacoesData = await avaliacoesService.obterAvaliacoesJovem(Number(id));
          setAvaliacoes(avaliacoesData.avaliacoes);
          setMediaGeral(avaliacoesData.media_geral);
          setTotalAvaliacoes(avaliacoesData.total_avaliacoes);
          console.log('[JovemDetails] Avaliações carregadas com sucesso');
        } catch (error: any) {
          console.error('[JovemDetails] Erro ao carregar avaliações:', error);
        }

        // Buscar histórico
        try {
          const historicoData = await jovemService.obterHistoricoJovem(Number(id));
          setHistorico(historicoData);
          console.log('[JovemDetails] Histórico carregado com sucesso');
        } catch (error: any) {
          console.error('[JovemDetails] Erro ao carregar histórico:', error);
        }
      } catch (error: any) {
        console.error('[JovemDetails] Erro geral ao carregar dados:', error);
        setError('Erro ao carregar dados. Por favor, tente novamente.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleAddAvaliacao = async (avaliacao: Avaliacao) => {
    try {
      const novaAvaliacao = await avaliacoesService.criarAvaliacao(Number(id), avaliacao);
      setAvaliacoes(prev => [novaAvaliacao, ...prev]);
      
      // Atualizar média e total
      const avaliacoesData = await avaliacoesService.obterAvaliacoesJovem(Number(id));
      setMediaGeral(avaliacoesData.media_geral);
      setTotalAvaliacoes(avaliacoesData.total_avaliacoes);
    } catch (error) {
      console.error('Erro ao adicionar avaliação:', error);
      throw error;
    }
  };

  const handleAddHistorico = async (historico: HistoricoDesenvolvimentoInput) => {
    try {
      await jovemService.adicionarHistorico(Number(id), historico);
      // Atualizar a lista de histórico
      const historicoData = await jovemService.obterHistoricoJovem(Number(id));
      setHistorico(historicoData);
    } catch (error) {
      console.error('Erro ao adicionar histórico:', error);
      throw error;
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Tem certeza que deseja excluir este jovem?')) {
      return;
    }

    try {
      await jovemService.excluirJovem(Number(id));
      
      // Redirecionar para o dashboard específico do papel do usuário
      if (user?.papel === 'instituicao_ensino') {
        navigate('/instituicao-ensino');
      } else if (user?.papel === 'chefe_empresa') {
        navigate('/chefe-empresa');
      } else if (user?.papel === 'instituicao_contratante') {
        navigate('/instituicao-contratante');
      } else if (user?.papel) {
        // Mapear o papel para a URL correta
        const papelParaUrl = {
          'instituicao_ensino': 'instituicao-ensino',
          'chefe_empresa': 'chefe-empresa',
          'instituicao_contratante': 'instituicao-contratante'
        };
        navigate(`/${papelParaUrl[user.papel]}/jovens`);
      }
    } catch (error) {
      console.error('Erro:', error);
      setError('Erro ao excluir jovem. Por favor, tente novamente.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-cursor-background py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cursor-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!jovem) {
    return (
      <div className="min-h-screen bg-cursor-background py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-8">
            <h3 className="text-lg font-medium text-cursor-text-primary mb-2">
              {error || 'Jovem não encontrado'}
            </h3>
            <button 
              onClick={() => {
                const papelParaUrl = {
                  'instituicao_ensino': 'instituicao-ensino',
                  'chefe_empresa': 'chefe-empresa',
                  'instituicao_contratante': 'instituicao-contratante'
                };
                const urlPapel = user?.papel ? papelParaUrl[user.papel] : '';
                navigate(`/${urlPapel}/jovens`);
              }}
              className="btn-primary mt-4"
            >
              Voltar para lista
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cursor-background py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Botão de Voltar */}
        <div className="mb-4">
          <button
            onClick={() => {
              const papelParaUrl = {
                'instituicao_ensino': 'instituicao-ensino',
                'chefe_empresa': 'chefe-empresa',
                'instituicao_contratante': 'instituicao-contratante'
              };
              const urlPapel = user?.papel ? papelParaUrl[user.papel] : '';
              navigate(`/${urlPapel}/jovens`);
            }}
            className="btn-secondary"
          >
            Voltar
          </button>
        </div>
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-cursor-text-primary">{jovem.nome}</h1>
            <p className="text-cursor-text-secondary mt-1">
              {formatarFormacao(jovem.formacao)} • {jovem.curso || 'Sem curso especificado'}
            </p>
          </div>
          <div className="flex gap-4">
            {user?.papel === 'instituicao_ensino' && (
              <>
                <button
                  onClick={() => navigate(`/avaliacoes/novo/${id}`)}
                  className="btn-primary"
                >
                  Nova Avaliação
                </button>
                <button
                  onClick={() => navigate(`/historico/novo/${id}`)}
                  className="btn-secondary"
                >
                  Adicionar Histórico
                </button>
              </>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-cursor-text-primary mb-2">Desempenho</h3>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold text-cursor-text-primary">{mediaGeral.toFixed(1)}</span>
              <span className="text-cursor-text-secondary mb-1">/10</span>
            </div>
            <p className="text-sm text-cursor-text-secondary mt-2">
              Baseado em {totalAvaliacoes} avaliações
            </p>
          </div>

          <div className="card p-6">
            <h3 className="text-lg font-semibold text-cursor-text-primary mb-2">Status</h3>
            <div className="flex items-center gap-2 mt-6">
              <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${
                jovem.status === 'Ativo' ? 'bg-green-100 text-green-800' :
                jovem.status === 'Inativo' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d={jovem.status === 'Ativo' ? 
                      "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" : 
                      "M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                    } 
                  />
                </svg>
                {jovem.status}
              </span>
            </div>
          </div>

          <div className="card p-6">
            <h3 className="text-lg font-semibold text-cursor-text-primary mb-2">Oportunidades</h3>
            <div className="flex items-end gap-2">
              {jovem.oportunidades && jovem.oportunidades.length > 0 ? (
                <span className="text-3xl font-bold text-cursor-text-primary">
                  {jovem.oportunidades.length}
                </span>
              ) : (
                <span className="text-cursor-text-tertiary text-base font-medium">Ainda não recomendado</span>
              )}
            </div>
            {jovem.oportunidades && jovem.oportunidades.length > 0 && (
              <div className="mt-4 space-y-2">
                {jovem.oportunidades.map((oportunidade) => (
                  <div key={oportunidade.id} className="p-3 bg-cursor-background-light rounded-lg border border-cursor-border">
                    <div className="flex justify-between items-center">
                      <span className="text-cursor-text-primary font-medium">{oportunidade.titulo}</span>
                      <span className={`badge ${
                        oportunidade.status === 'Aberta' ? 'badge-success' : 
                        oportunidade.status === 'Fechada' ? 'badge-warning' : 
                        'badge-default'
                      }`}>
                        {oportunidade.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Informações Pessoais */}
          <div className="card p-6">
            <h2 className="text-xl font-semibold text-cursor-text-primary mb-6">Informações Pessoais</h2>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-cursor-text-secondary mb-1">Nome</label>
                  <p className="text-cursor-text-primary">{jovem.nome}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-cursor-text-secondary mb-1">Email</label>
                  <p className="text-cursor-text-primary">{jovem.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-cursor-text-secondary mb-1">Idade</label>
                  <p className="text-cursor-text-primary">{jovem.idade} anos</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-cursor-text-secondary mb-1">Formação</label>
                  <p className="text-cursor-text-primary">{formatarFormacao(jovem.formacao)}</p>
                </div>
                {jovem.curso && (
                  <div>
                    <label className="block text-sm font-medium text-cursor-text-secondary mb-1">Curso</label>
                    <p className="text-cursor-text-primary">{jovem.curso}</p>
                  </div>
                )}
                {jovem.tipo && (
                  <div>
                    <label className="block text-sm font-medium text-cursor-text-secondary mb-1">Tipo</label>
                    <p className="text-cursor-text-primary">{formatarTipoArea(jovem.tipo)}</p>
                  </div>
                )}
                {jovem.area && (
                  <div>
                    <label className="block text-sm font-medium text-cursor-text-secondary mb-1">Área</label>
                    <p className="text-cursor-text-primary">{formatarTipoArea(jovem.area)}</p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-cursor-text-secondary mb-2">Habilidades</label>
                <div className="p-3 rounded-lg bg-cursor-bg border border-cursor-border flex flex-wrap gap-2">
                  {jovem.habilidades && jovem.habilidades.length > 0 ? (
                    jovem.habilidades.map((habilidade, idx) => (
                      <span key={idx} className="inline-block bg-cursor-background-light text-cursor-text-primary px-3 py-1 rounded-full text-sm border border-cursor-border">
                        {typeof habilidade === 'string'
                          ? habilidade.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
                          : String(habilidade)}
                      </span>
                    ))
                  ) : (
                    <span className="text-cursor-text-tertiary">Nenhuma habilidade informada</span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-cursor-text-secondary mb-2">Interesses</label>
                <div className="p-3 rounded-lg bg-cursor-bg border border-cursor-border flex flex-wrap gap-2">
                  {jovem.interesses && jovem.interesses.length > 0 ? (
                    jovem.interesses.map((interesse, idx) => (
                      <span key={idx} className="inline-block bg-cursor-background-light text-cursor-text-primary px-3 py-1 rounded-full text-sm border border-cursor-border">
                        {typeof interesse === 'string'
                          ? interesse.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
                          : String(interesse)}
                      </span>
                    ))
                  ) : (
                    <span className="text-cursor-text-tertiary">Nenhum interesse informado</span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-cursor-text-secondary mb-1">Planos Futuros</label>
                <p className="text-cursor-text-primary whitespace-pre-wrap">{jovem.planos_futuros}</p>
              </div>
            </div>
          </div>

          {/* Avaliações e Histórico */}
          <div className="card p-6">
            <h2 className="text-xl font-semibold text-cursor-text-primary mb-6">Avaliações e Histórico</h2>
            <AvaliacoesJovem
              jovemId={Number(id)}
              avaliacoes={avaliacoes}
              historico={historico}
              badges={jovem.badges || []}
              mediaGeral={mediaGeral}
              onAddAvaliacao={handleAddAvaliacao}
              onAddHistorico={handleAddHistorico}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default JovemDetails; 