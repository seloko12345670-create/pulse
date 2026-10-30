import React, { useState } from 'react';
import {
  AllergenOrRestriction,
  ActivityLevel,
  BudgetPeriod,
  CookingHabit,
  DietaryPattern,
  EquipmentType,
  ExperienceLevel,
  MovementLimitation,
  MuscleGroup,
  NutritionTargets,
  PantryItem,
  PhysiologicalVariableOption,
  PrimaryGoal,
  SecondaryGoal,
  SpecialHealthFlag,
  TrainingLocation,
  UserProfile,
} from '../domain/types';
import { FOOD_DATABASE, matchFoodFromNaturalName } from '../domain/foodDatabase';
import { calculateNutritionTargets, validateUserProfile } from '../domain/nutritionCalculator';
import { PulseLogo } from './PulseLogo';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Edit3,
  Plus,
  ShieldAlert,
  Sparkles,
  Trash2,
} from 'lucide-react';

interface OnboardingFlowProps {
  perfil: UserProfile;
  etapaInicial: number;
  onUpdateProfile: (novoPerfil: UserProfile, etapaAtual: number) => void;
  onCompleteOnboarding: (perfilFinal: UserProfile) => void;
  onQuickDemoStart: () => void;
}

const STAPLE_SUGGESTIONS = [
  { foodId: 'arroz_branco_cozido', label: 'Arroz', gramasPadrao: 1000 },
  { foodId: 'feijao_carioca_cozido', label: 'Feijão', gramasPadrao: 1000 },
  { foodId: 'ovo_galinha_cozido', label: 'Ovos', gramasPadrao: 600 },
  { foodId: 'frango_peito_grelhado', label: 'Frango', gramasPadrao: 1000 },
  { foodId: 'sardinha_conserva', label: 'Sardinha', gramasPadrao: 250 },
  { foodId: 'aveia_flocos', label: 'Aveia', gramasPadrao: 400 },
  { foodId: 'banana_prata', label: 'Banana', gramasPadrao: 600 },
  { foodId: 'leite_integral', label: 'Leite', gramasPadrao: 1000 },
  { foodId: 'iogurte_natural', label: 'Iogurte', gramasPadrao: 340 },
  { foodId: 'batata_inglesa_cozida', label: 'Batata', gramasPadrao: 800 },
  { foodId: 'macarrao_cozido', label: 'Macarrão', gramasPadrao: 500 },
  { foodId: 'legumes_estacao_cozidos', label: 'Legumes', gramasPadrao: 600 },
  { foodId: 'salada_folhas_tomate', label: 'Verduras', gramasPadrao: 400 },
  { foodId: 'laranja_pera', label: 'Frutas da estação', gramasPadrao: 700 },
];

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({
  perfil,
  etapaInicial,
  onUpdateProfile,
  onCompleteOnboarding,
  onQuickDemoStart,
}) => {
  const [mostrarBoasVindas, setMostrarBoasVindas] = useState<boolean>(etapaInicial <= 1);
  const [etapa, setEtapa] = useState<number>(Math.min(7, Math.max(1, etapaInicial || 1)));
  const [errosValidacao, setErrosValidacao] = useState<string[]>([]);

  // Campos auxiliares para adicionar itens personalizados
  const [novoAlimentoDespensaNome, setNovoAlimentoDespensaNome] = useState('');
  const [novoAlimentoDespensaGramas, setNovoAlimentoDespensaGramas] = useState('500');
  const [novoGostaInput, setNovoGostaInput] = useState('');
  const [novoNaoComeInput, setNovoNaoComeInput] = useState('');

  const atualizarCampo = <K extends keyof UserProfile>(campo: K, valor: UserProfile[K]) => {
    const atualizado = { ...perfil, [campo]: valor };
    setErrosValidacao([]);
    onUpdateProfile(atualizado, etapa);
  };

  const irParaEtapa = (novaEtapa: number) => {
    const validacao = validateUserProfile(perfil);
    if (novaEtapa > etapa && !validacao.valido) {
      setErrosValidacao(validacao.erros);
      return;
    }
    setErrosValidacao([]);
    const destino = Math.min(7, Math.max(1, novaEtapa));
    setEtapa(destino);
    onUpdateProfile(perfil, destino);
  };

  const toggleItemArray = <T extends string>(lista: T[], item: T): T[] => {
    return lista.includes(item) ? lista.filter((x) => x !== item) : [...lista, item];
  };

  const togglePantrySuggestion = (foodId: string, label: string, gramasPadrao: number) => {
    const existe = perfil.despensa.some((d) => d.foodId === foodId);
    let novaDespensa: PantryItem[];
    if (existe) {
      novaDespensa = perfil.despensa.filter((d) => d.foodId !== foodId);
    } else {
      const foodRef = FOOD_DATABASE.find((f) => f.id === foodId);
      novaDespensa = [
        ...perfil.despensa,
        {
          id: `p_${foodId}_${Date.now()}`,
          foodId,
          nome: foodRef?.nome ?? label,
          quantidadeGramas: gramasPadrao,
          medidaAproximada: `${gramasPadrao}g disponíveis`,
          jaComprado: true,
        },
      ];
    }
    atualizarCampo('despensa', novaDespensa);
  };

  const adicionarAlimentoManualDespensa = () => {
    const nomeLimpo = novoAlimentoDespensaNome.trim();
    if (!nomeLimpo) return;
    const gramas = Math.max(50, Number(novoAlimentoDespensaGramas) || 500);
    const match = matchFoodFromNaturalName(nomeLimpo);
    const foodId = match ? match.id : 'arroz_branco_cozido';

    const novoItem: PantryItem = {
      id: `p_custom_${Date.now()}`,
      foodId,
      nome: match ? `${match.nome} (${nomeLimpo})` : nomeLimpo,
      quantidadeGramas: gramas,
      medidaAproximada: `${gramas}g em casa`,
      jaComprado: true,
    };
    atualizarCampo('despensa', [...perfil.despensa, novoItem]);
    setNovoAlimentoDespensaNome('');
  };

  let metasPrevia: NutritionTargets | null = null;
  try {
    metasPrevia = calculateNutritionTargets(perfil);
  } catch {
    metasPrevia = null;
  }

  if (mostrarBoasVindas) {
    return (
      <div className="min-h-screen bg-[#080808] text-white flex flex-col justify-between p-5 sm:p-10 max-w-4xl mx-auto">
        <header className="flex items-center justify-between gap-4">
          <PulseLogo size="sm" />
          <span className="text-[11px] sm:text-xs text-[#B3B3B3] text-right truncate">
            Base TACO/TBCA · Treino Baseado em Evidências
          </span>
        </header>

        <main className="my-auto py-4 sm:py-8 space-y-4 sm:space-y-6">
          <p className="text-[11px] sm:text-xs font-semibold tracking-wider text-[#FF65AD]">
            ASSISTENTE PESSOAL DE FITNESS E ALIMENTAÇÃO REAL
          </p>
          <h1 className="font-display text-2xl sm:text-5xl font-bold tracking-tight text-white leading-tight">
            Evolução física adaptada à sua rotina, à sua despensa e ao seu bolso.
          </h1>
          <p className="text-xs sm:text-base text-[#B3B3B3] max-w-2xl leading-relaxed">
            O PULSE calcula suas estimativas energéticas reais, monta refeições com os alimentos
            que você já tem em casa (arroz, feijão, ovos, aveia, frutas da estação) e estrutura seu
            treino para academia, casa ou ar livre — sem promessas irreais ou ingredientes caros.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-4 pt-1">
            <div className="bg-[#1B1B1B] border border-white/10 rounded-2xl p-3.5 sm:p-4">
              <p className="text-xs sm:text-sm font-semibold text-white">Orçamento e Despensa</p>
              <p className="text-[11px] sm:text-xs text-[#B3B3B3] mt-0.5">
                Prioriza o que você já comprou e adapta o cardápio ao valor que pode gastar.
              </p>
            </div>
            <div className="bg-[#1B1B1B] border border-white/10 rounded-2xl p-3.5 sm:p-4">
              <p className="text-xs sm:text-sm font-semibold text-white">Cálculo Determinístico</p>
              <p className="text-[11px] sm:text-xs text-[#B3B3B3] mt-0.5">
                Equações metabólicas transparentes e tabela nutricional brasileira TACO/UNICAMP.
              </p>
            </div>
            <div className="bg-[#1B1B1B] border border-white/10 rounded-2xl p-3.5 sm:p-4">
              <p className="text-xs sm:text-sm font-semibold text-white">100% Offline & Privado</p>
              <p className="text-[11px] sm:text-xs text-[#B3B3B3] mt-0.5">
                Seus dados ficam salvos no aparelho para consulta sem internet, com exportação JSON.
              </p>
            </div>
          </div>
        </main>

        <footer className="space-y-2.5 pt-3 border-t border-white/10">
          <div className="flex flex-col sm:flex-row gap-2.5">
            <button
              type="button"
              onClick={() => setMostrarBoasVindas(false)}
              className="flex-1 min-h-[48px] px-5 py-3 rounded-xl bg-[#FF2D8D] hover:bg-[#FF65AD] text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <span>Começar configuração em 7 etapas</span>
              <ArrowRight className="w-4 h-4 shrink-0" />
            </button>
            <button
              type="button"
              onClick={onQuickDemoStart}
              className="min-h-[46px] px-4 py-2.5 rounded-xl bg-[#1B1B1B] hover:bg-white/10 border border-white/15 text-white font-medium text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <span>Entrar com perfil preenchido (Acesso Rápido)</span>
            </button>
          </div>
          <p className="text-[10px] sm:text-[11px] text-[#B3B3B3] text-center sm:text-left">
            Cada etapa é salva automaticamente. As metas são estimativas educativas e não substituem avaliação clínica.
          </p>
        </footer>
      </div>
    );
  }

  const titulosEtapas = [
    '1. Perfil Básico',
    '2. Objetivo',
    '3. Atividade Física',
    '4. Alimentação',
    '5. Orçamento e Despensa',
    '6. Rotina Diária',
    '7. Revisão e Confirmação',
  ];

  return (
    <div className="min-h-screen bg-[#080808] text-white flex flex-col justify-between max-w-3xl mx-auto p-4 sm:p-8">
      {/* Cabeçalho e Progresso */}
      <header className="space-y-4">
        <div className="flex items-center justify-between">
          <PulseLogo size="sm" />
          <span className="text-xs font-mono-num text-[#B3B3B3]">
            Etapa {etapa} de 7 · Salvo automaticamente
          </span>
        </div>

        <div className="w-full bg-[#1B1B1B] h-2 rounded-full overflow-hidden">
          <div
            className="bg-[#FF2D8D] h-full transition-transform duration-200 origin-left"
            style={{ transform: `scaleX(${etapa / 7})` }}
          />
        </div>

        <div className="flex items-center justify-between">
          <h1 className="font-display text-xl sm:text-2xl font-bold text-white">
            {titulosEtapas[etapa - 1]}
          </h1>
          {etapa < 7 && (
            <button
              type="button"
              onClick={() => irParaEtapa(7)}
              className="text-xs text-[#FF65AD] hover:underline min-h-[44px] px-2 flex items-center cursor-pointer"
            >
              Ir para Revisão
            </button>
          )}
        </div>
      </header>

      {/* Mensagens de erro de validação */}
      {errosValidacao.length > 0 && (
        <div
          role="alert"
          className="my-4 p-4 rounded-2xl bg-[#1B1B1B] border border-[#FF2D8D] text-sm text-white space-y-1"
        >
          <p className="font-semibold text-[#FF65AD]">Verifique os campos antes de continuar:</p>
          {errosValidacao.map((err, i) => (
            <p key={i} className="text-xs text-[#B3B3B3]">
              • {err}
            </p>
          ))}
        </div>
      )}

      {/* Corpo da Etapa */}
      <main className="my-6 flex-1 space-y-6">
        {etapa === 1 && (
          <div className="space-y-5">
            <p className="text-xs text-[#B3B3B3]">
              Por que solicitamos estes dados? Idade, altura, peso e nível de atividade são usados
              exclusivamente para estimar sua Taxa Metabólica de Repouso (equação de Mifflin-St
              Jeor) e seu gasto energético diário.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="onb-nome" className="block text-xs font-medium text-[#B3B3B3] mb-1.5">
                  Como prefere ser chamado(a)?
                </label>
                <input
                  id="onb-nome"
                  type="text"
                  value={perfil.nome}
                  onChange={(e) => atualizarCampo('nome', e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#1B1B1B] border border-white/15 text-white text-sm focus:outline-none focus:border-[#FF2D8D]"
                  placeholder="Ex.: Alex"
                />
              </div>

              <div>
                <label htmlFor="onb-idade" className="block text-xs font-medium text-[#B3B3B3] mb-1.5">
                  Idade (anos)
                </label>
                <input
                  id="onb-idade"
                  type="number"
                  min={12}
                  max={110}
                  value={perfil.idade}
                  onChange={(e) => atualizarCampo('idade', Number(e.target.value))}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#1B1B1B] border border-white/15 text-white text-sm font-mono-num focus:outline-none focus:border-[#FF2D8D]"
                />
              </div>

              <div>
                <label htmlFor="onb-altura" className="block text-xs font-medium text-[#B3B3B3] mb-1.5">
                  Altura (cm)
                </label>
                <input
                  id="onb-altura"
                  type="number"
                  min={110}
                  max={240}
                  value={perfil.alturaCm}
                  onChange={(e) => atualizarCampo('alturaCm', Number(e.target.value))}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#1B1B1B] border border-white/15 text-white text-sm font-mono-num focus:outline-none focus:border-[#FF2D8D]"
                />
              </div>

              <div>
                <label htmlFor="onb-peso" className="block text-xs font-medium text-[#B3B3B3] mb-1.5">
                  Peso atual (kg)
                </label>
                <input
                  id="onb-peso"
                  type="number"
                  step="0.1"
                  min={30}
                  max={300}
                  value={perfil.pesoAtualKg}
                  onChange={(e) => atualizarCampo('pesoAtualKg', Number(e.target.value))}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#1B1B1B] border border-white/15 text-white text-sm font-mono-num focus:outline-none focus:border-[#FF2D8D]"
                />
              </div>

              <div>
                <label htmlFor="onb-peso-desejado" className="block text-xs font-medium text-[#B3B3B3] mb-1.5">
                  Peso desejado em kg (opcional — não tratado como meta automática)
                </label>
                <input
                  id="onb-peso-desejado"
                  type="number"
                  step="0.5"
                  value={perfil.pesoDesejadoKg ?? ''}
                  onChange={(e) =>
                    atualizarCampo(
                      'pesoDesejadoKg',
                      e.target.value === '' ? undefined : Number(e.target.value)
                    )
                  }
                  placeholder="Opcional"
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#1B1B1B] border border-white/15 text-white text-sm font-mono-num focus:outline-none focus:border-[#FF2D8D]"
                />
              </div>

              <div>
                <label htmlFor="onb-atividade" className="block text-xs font-medium text-[#B3B3B3] mb-1.5">
                  Nível habitual de atividade física no dia a dia
                </label>
                <select
                  id="onb-atividade"
                  value={perfil.nivelAtividade}
                  onChange={(e) => atualizarCampo('nivelAtividade', e.target.value as ActivityLevel)}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#1B1B1B] border border-white/15 text-white text-sm focus:outline-none focus:border-[#FF2D8D]"
                >
                  <option value="sedentario">Sedentário (trabalho sentado, pouco deslocamento)</option>
                  <option value="levemente_ativo">Levemente ativo (caminhadas curtas ou 1–2 treinos/sem)</option>
                  <option value="moderadamente_ativo">Moderadamente ativo (3–4 treinos/sem ou rotina ativa)</option>
                  <option value="muito_ativo">Muito ativo (5–6 treinos intensos/sem)</option>
                  <option value="extremamente_ativo">Extremamente ativo (trabalho braçal pesado ou atleta)</option>
                </select>
              </div>
            </div>

            {/* Variável fisiológica da equação metabólica com explicação transparente */}
            <div className="bg-[#1B1B1B] border border-white/10 rounded-2xl p-4 space-y-2.5">
              <label htmlFor="onb-fisiologia" className="block text-xs font-semibold text-white">
                Constante fisiológica para a fórmula de gasto energético (Mifflin-St Jeor)
              </label>
              <p className="text-xs text-[#B3B3B3]">
                Equações preditivas de taxa metabólica utilizam uma constante fisiológica (+5 kcal ou
                -161 kcal) devido a diferenças médias populacionais de massa magra. Você pode
                selecionar uma referência ou optar por estimativa média/não informar sem qualquer prejuízo.
              </p>
              <select
                id="onb-fisiologia"
                value={perfil.variavelFisiologica}
                onChange={(e) =>
                  atualizarCampo('variavelFisiologica', e.target.value as PhysiologicalVariableOption)
                }
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#121212] border border-white/15 text-white text-sm focus:outline-none focus:border-[#FF2D8D]"
              >
                <option value="estimativa_media">Usar estimativa média neutra (faixa ±120 kcal)</option>
                <option value="feminino">Parâmetro fisiológico feminino (-161 kcal na fórmula)</option>
                <option value="masculino">Parâmetro fisiológico masculino (+5 kcal na fórmula)</option>
                <option value="prefiro_nao_informar">Prefiro não informar (usa estimativa neutra)</option>
              </select>
            </div>

            {/* Condições de saúde relevantes */}
            <div className="bg-[#1B1B1B] border border-white/10 rounded-2xl p-4 space-y-3">
              <p className="text-xs font-semibold text-white">
                Há alguma informação de saúde relevante para adaptar a experiência com segurança?
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { id: 'nenhuma', label: 'Nenhuma condição específica' },
                  { id: 'gestante_lactante', label: 'Gestante ou amamentando' },
                  { id: 'historico_transtorno_alimentar', label: 'Histórico de transtorno alimentar' },
                  { id: 'diabetes_resistencia_insulina', label: 'Diabetes ou resistência à insulina' },
                  { id: 'hipertensao_cardiovascular', label: 'Hipertensão ou condição cardiovascular' },
                  { id: 'doenca_renal_hepatica', label: 'Condição renal ou hepática' },
                ].map((cond) => {
                  const ativo = perfil.condicoesSaude.includes(cond.id as SpecialHealthFlag);
                  return (
                    <button
                      key={cond.id}
                      type="button"
                      onClick={() => {
                        if (cond.id === 'nenhuma') {
                          atualizarCampo('condicoesSaude', ['nenhuma']);
                        } else {
                          const semNenhuma = perfil.condicoesSaude.filter((c) => c !== 'nenhuma');
                          const nova = toggleItemArray(semNenhuma, cond.id as SpecialHealthFlag);
                          atualizarCampo('condicoesSaude', nova.length ? nova : ['nenhuma']);
                        }
                      }}
                      className={`min-h-[44px] px-3 py-2 rounded-xl text-left text-xs font-medium border transition-colors cursor-pointer flex items-center justify-between ${
                        ativo
                          ? 'bg-[#FF2D8D]/15 border-[#FF2D8D] text-white'
                          : 'bg-[#121212] border-white/10 text-[#B3B3B3] hover:text-white'
                      }`}
                    >
                      <span>{cond.label}</span>
                      {ativo && <Check className="w-4 h-4 text-[#FF2D8D] shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {etapa === 2 && (
          <div className="space-y-5">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-[#B3B3B3]">Selecione seu objetivo principal:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  {
                    id: 'emagrecer',
                    titulo: 'Emagrecer com saúde',
                    desc: 'Déficit energético moderado e seguro, preservando massa magra e saciedade.',
                  },
                  {
                    id: 'ganhar_massa',
                    titulo: 'Ganhar massa muscular',
                    desc: 'Disponibilidade energética e proteica para hipertrofia e recuperação.',
                  },
                  {
                    id: 'recomposicao_corporal',
                    titulo: 'Recomposição corporal',
                    desc: 'Reduzir percentual de gordura enquanto desenvolve musculatura gradualmente.',
                  },
                  {
                    id: 'manter_condicionamento',
                    titulo: 'Manter o peso e melhorar condicionamento',
                    desc: 'Estabilidade energética com foco em vitalidade e desempenho.',
                  },
                  {
                    id: 'melhorar_resistencia',
                    titulo: 'Melhorar resistência física',
                    desc: 'Suporte energético para treinos cardiorrespiratórios e fôlego.',
                  },
                  {
                    id: 'habitos_saudaveis',
                    titulo: 'Criar hábitos saudáveis',
                    desc: 'Organização alimentar e constância sem pressões estéticas.',
                  },
                ].map((obj) => {
                  const selecionado = perfil.objetivoPrincipal === obj.id;
                  return (
                    <button
                      key={obj.id}
                      type="button"
                      onClick={() => atualizarCampo('objetivoPrincipal', obj.id as PrimaryGoal)}
                      className={`p-4 rounded-2xl border text-left transition-colors cursor-pointer ${
                        selecionado
                          ? 'bg-[#FF2D8D]/15 border-[#FF2D8D] text-white'
                          : 'bg-[#1B1B1B] border-white/10 text-[#B3B3B3] hover:text-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-white">{obj.titulo}</span>
                        {selecionado && <Check className="w-4 h-4 text-[#FF2D8D]" />}
                      </div>
                      <p className="text-xs text-[#B3B3B3] mt-1">{obj.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label htmlFor="onb-obj-sec" className="block text-xs font-medium text-[#B3B3B3] mb-1.5">
                Objetivo secundário (opcional)
              </label>
              <select
                id="onb-obj-sec"
                value={perfil.objetivoSecundario}
                onChange={(e) => atualizarCampo('objetivoSecundario', e.target.value as SecondaryGoal)}
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#1B1B1B] border border-white/15 text-white text-sm focus:outline-none focus:border-[#FF2D8D]"
              >
                <option value="economizar_mercado">Economizar nas compras de supermercado</option>
                <option value="reduzir_tempo_cozinha">Reduzir tempo preparando refeições</option>
                <option value="aumentar_forca">Aumentar força nos exercícios básicos</option>
                <option value="melhorar_mobilidade">Melhorar postura e mobilidade articular</option>
                <option value="melhorar_energia_sono">Melhorar disposição diária e sono</option>
                <option value="nenhum">Nenhum objetivo secundário específico</option>
              </select>
            </div>

            <div className="p-4 rounded-2xl bg-[#1B1B1B] border border-white/10 text-xs text-[#B3B3B3] space-y-1">
              <p className="font-semibold text-white">Transparência e Ciência</p>
              <p>
                Os resultados físicos dependem da consistência ao longo das semanas, qualidade do
                sono, alimentação, treino e fatores biológicos individuais. O PULSE não promete
                resultados garantidos em um número fixo de dias e nunca utiliza dietas de fome.
              </p>
            </div>
          </div>
        )}

        {etapa === 3 && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="onb-nivel-exp" className="block text-xs font-medium text-[#B3B3B3] mb-1.5">
                  Experiência atual com treinamento
                </label>
                <select
                  id="onb-nivel-exp"
                  value={perfil.nivelExperiencia}
                  onChange={(e) => atualizarCampo('nivelExperiencia', e.target.value as ExperienceLevel)}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#1B1B1B] border border-white/15 text-white text-sm"
                >
                  <option value="iniciante">Iniciante (começando agora ou parado há meses)</option>
                  <option value="intermediario">Intermediário (treina regularmente há 6+ meses)</option>
                  <option value="avancado">Avançado (treina com consistência há 2+ anos)</option>
                </select>
              </div>

              <div>
                <label htmlFor="onb-local-treino" className="block text-xs font-medium text-[#B3B3B3] mb-1.5">
                  Onde você prefere treinar?
                </label>
                <select
                  id="onb-local-treino"
                  value={perfil.localTreino}
                  onChange={(e) => atualizarCampo('localTreino', e.target.value as TrainingLocation)}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#1B1B1B] border border-white/15 text-white text-sm"
                >
                  <option value="casa">Em casa</option>
                  <option value="academia">Em academia</option>
                  <option value="ar_livre">Ao ar livre / Parque / Calistenia</option>
                </select>
              </div>

              <div>
                <label htmlFor="onb-dias-sem" className="block text-xs font-medium text-[#B3B3B3] mb-1.5">
                  Quantos dias por semana pode treinar?
                </label>
                <input
                  id="onb-dias-sem"
                  type="number"
                  min={1}
                  max={6}
                  value={perfil.diasTreinoPorSemana}
                  onChange={(e) => atualizarCampo('diasTreinoPorSemana', Number(e.target.value))}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#1B1B1B] border border-white/15 text-white text-sm font-mono-num"
                />
              </div>

              <div>
                <label htmlFor="onb-tempo-sessao" className="block text-xs font-medium text-[#B3B3B3] mb-1.5">
                  Tempo disponível por sessão (minutos)
                </label>
                <input
                  id="onb-tempo-sessao"
                  type="number"
                  min={15}
                  max={120}
                  step={5}
                  value={perfil.tempoSessaoMinutos}
                  onChange={(e) => atualizarCampo('tempoSessaoMinutos', Number(e.target.value))}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#1B1B1B] border border-white/15 text-white text-sm font-mono-num"
                />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-[#B3B3B3]">Quais equipamentos você possui acesso?</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'nenhum', label: 'Apenas peso do corpo' },
                  { id: 'halteres', label: 'Halteres / Pesos livres' },
                  { id: 'elásticos', label: 'Elásticos / Mini-bands' },
                  { id: 'banco_apoio', label: 'Banco ou cadeira firme' },
                  { id: 'barra_fixa', label: 'Barra fixa' },
                  { id: 'maquinas_academia', label: 'Máquinas e polias de academia' },
                ].map((eq) => {
                  const ativo = perfil.equipamentosDisponiveis.includes(eq.id as EquipmentType);
                  return (
                    <button
                      key={eq.id}
                      type="button"
                      onClick={() =>
                        atualizarCampo(
                          'equipamentosDisponiveis',
                          toggleItemArray(perfil.equipamentosDisponiveis, eq.id as EquipmentType)
                        )
                      }
                      className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                        ativo
                          ? 'bg-[#FF2D8D] border-[#FF2D8D] text-white'
                          : 'bg-[#1B1B1B] border-white/10 text-[#B3B3B3]'
                      }`}
                    >
                      {eq.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-[#B3B3B3]">
                Existe alguma limitação de movimento ou articulação que devemos proteger?
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'nenhuma', label: 'Nenhuma limitação' },
                  { id: 'dor_joelho', label: 'Sensibilidade no joelho' },
                  { id: 'dor_ombro', label: 'Sensibilidade no ombro' },
                  { id: 'dor_lombar', label: 'Sensibilidade na lombar' },
                  { id: 'dor_punho', label: 'Sensibilidade no punho' },
                  { id: 'sem_impacto_saltos', label: 'Evitar impacto / saltos' },
                ].map((lim) => {
                  const ativo = perfil.limitacoesMovimento.includes(lim.id as MovementLimitation);
                  return (
                    <button
                      key={lim.id}
                      type="button"
                      onClick={() => {
                        if (lim.id === 'nenhuma') {
                          atualizarCampo('limitacoesMovimento', ['nenhuma']);
                        } else {
                          const semNenhuma = perfil.limitacoesMovimento.filter((l) => l !== 'nenhuma');
                          const nova = toggleItemArray(semNenhuma, lim.id as MovementLimitation);
                          atualizarCampo('limitacoesMovimento', nova.length ? nova : ['nenhuma']);
                        }
                      }}
                      className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                        ativo
                          ? 'bg-[#FF2D8D]/20 border-[#FF2D8D] text-white'
                          : 'bg-[#1B1B1B] border-white/10 text-[#B3B3B3]'
                      }`}
                    >
                      {lim.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {etapa === 4 && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="onb-num-ref" className="block text-xs font-medium text-[#B3B3B3] mb-1.5">
                  Refeições por dia (2 a 6)
                </label>
                <input
                  id="onb-num-ref"
                  type="number"
                  min={2}
                  max={6}
                  value={perfil.refeicoesPorDia}
                  onChange={(e) => atualizarCampo('refeicoesPorDia', Number(e.target.value))}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#1B1B1B] border border-white/15 text-white text-sm font-mono-num"
                />
              </div>

              <div>
                <label htmlFor="onb-padrao-alim" className="block text-xs font-medium text-[#B3B3B3] mb-1.5">
                  Padrão alimentar
                </label>
                <select
                  id="onb-padrao-alim"
                  value={perfil.padraoAlimentar}
                  onChange={(e) => atualizarCampo('padraoAlimentar', e.target.value as DietaryPattern)}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#1B1B1B] border border-white/15 text-white text-sm"
                >
                  <option value="onivoro">Onívoro (come de tudo)</option>
                  <option value="flexitariano">Flexitariano (prioriza vegetais e ovos)</option>
                  <option value="pescetariano">Pescetariano (peixes, ovos, laticínios)</option>
                  <option value="vegetariano">Vegetariano (ovos e laticínios)</option>
                  <option value="vegano">Vegano (100% vegetal)</option>
                </select>
              </div>

              <div>
                <label htmlFor="onb-habito-coz" className="block text-xs font-medium text-[#B3B3B3] mb-1.5">
                  Rotina na cozinha
                </label>
                <select
                  id="onb-habito-coz"
                  value={perfil.habitoCozinhar}
                  onChange={(e) => atualizarCampo('habitoCozinhar', e.target.value as CookingHabit)}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#1B1B1B] border border-white/15 text-white text-sm"
                >
                  <option value="cozinho_diariamente">Cozinho diariamente (20–30 min)</option>
                  <option value="marmitas_fim_de_semana">Faço marmitas para vários dias</option>
                  <option value="preparo_rapido_15min">Preparo rápido (até 15 min)</option>
                  <option value="dependo_comida_pronta">Dependo de refeições práticas/prontas</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-[#B3B3B3]">Alergias ou restrições alimentares:</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'lactose_leite', label: 'Sem lactose / leite' },
                  { id: 'gluten_trigo', label: 'Sem glúten / trigo' },
                  { id: 'ovos', label: 'Alergia a ovos' },
                  { id: 'peixes_frutos_mar', label: 'Alergia a peixes' },
                  { id: 'amendoim_oleaginosas', label: 'Alergia a amendoim' },
                  { id: 'soja', label: 'Restrição a soja' },
                  { id: 'carne_suina', label: 'Não consome carne suína' },
                  { id: 'carne_bovina', label: 'Não consome carne bovina' },
                ].map((al) => {
                  const ativo = perfil.alergiasRestricoes.includes(al.id as AllergenOrRestriction);
                  return (
                    <button
                      key={al.id}
                      type="button"
                      onClick={() =>
                        atualizarCampo(
                          'alergiasRestricoes',
                          toggleItemArray(perfil.alergiasRestricoes, al.id as AllergenOrRestriction)
                        )
                      }
                      className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                        ativo
                          ? 'bg-[#FF2D8D] border-[#FF2D8D] text-white'
                          : 'bg-[#1B1B1B] border-white/10 text-[#B3B3B3]'
                      }`}
                    >
                      {al.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Alimentos que NÃO come */}
            <div className="bg-[#1B1B1B] border border-white/10 rounded-2xl p-4 space-y-3">
              <label htmlFor="onb-nao-come" className="block text-xs font-semibold text-white">
                Quais alimentos você NÃO gosta ou prefere nunca incluir?
              </label>
              <div className="flex gap-2">
                <input
                  id="onb-nao-come"
                  type="text"
                  value={novoNaoComeInput}
                  onChange={(e) => setNovoNaoComeInput(e.target.value)}
                  placeholder="Ex.: sardinha, chuchu, leite..."
                  className="flex-1 min-h-[44px] px-3.5 py-2 rounded-xl bg-[#121212] border border-white/15 text-white text-sm"
                />
                <button
                  type="button"
                  onClick={() => {
                    const val = novoNaoComeInput.trim();
                    if (!val) return;
                    atualizarCampo('alimentosNaoCome', [...perfil.alimentosNaoCome, val]);
                    setNovoNaoComeInput('');
                  }}
                  className="min-h-[44px] px-4 rounded-xl bg-[#FF2D8D] text-white text-xs font-semibold cursor-pointer"
                >
                  Excluir do plano
                </button>
              </div>
              {perfil.alimentosNaoCome.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {perfil.alimentosNaoCome.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() =>
                        atualizarCampo(
                          'alimentosNaoCome',
                          perfil.alimentosNaoCome.filter((_, i) => i !== idx)
                        )
                      }
                      className="min-h-[36px] px-3 py-1 rounded-lg bg-[#121212] border border-white/15 text-xs text-white flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Não incluir: {item}</span>
                      <Trash2 className="w-3.5 h-3.5 text-[#FF65AD]" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Alimentos favoritos */}
            <div className="bg-[#1B1B1B] border border-white/10 rounded-2xl p-4 space-y-3">
              <label htmlFor="onb-favoritos" className="block text-xs font-semibold text-white">
                Alimentos que você mais gosta no dia a dia:
              </label>
              <div className="flex gap-2">
                <input
                  id="onb-favoritos"
                  type="text"
                  value={novoGostaInput}
                  onChange={(e) => setNovoGostaInput(e.target.value)}
                  placeholder="Ex.: cuscuz, ovos, banana, feijão..."
                  className="flex-1 min-h-[44px] px-3.5 py-2 rounded-xl bg-[#121212] border border-white/15 text-white text-sm"
                />
                <button
                  type="button"
                  onClick={() => {
                    const val = novoGostaInput.trim();
                    if (!val) return;
                    atualizarCampo('alimentosFavoritos', [...perfil.alimentosFavoritos, val]);
                    setNovoGostaInput('');
                  }}
                  className="min-h-[44px] px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold cursor-pointer"
                >
                  Adicionar favorito
                </button>
              </div>
              <p className="text-xs text-[#B3B3B3]">
                Favoritos atuais: {perfil.alimentosFavoritos.join(' · ') || 'Nenhum informado'}
              </p>
            </div>
          </div>
        )}

        {etapa === 5 && (
          <div className="space-y-5">
            <div className="bg-[#1B1B1B] border border-[#FF2D8D]/40 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-white">
                  Orçamento Alimentar e Modo Econômico
                </p>
                <span className="text-xs text-[#FF65AD]">Função Central PULSE</span>
              </div>
              <p className="text-xs text-[#B3B3B3]">
                Informe quanto você pode investir com alimentação ou marque que deseja montar o
                plano apenas com o que já tem na despensa de casa.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label htmlFor="onb-orcamento-val" className="block text-xs font-medium text-[#B3B3B3] mb-1">
                    Valor disponível (R$)
                  </label>
                  <input
                    id="onb-orcamento-val"
                    type="number"
                    min={0}
                    step={5}
                    disabled={perfil.semDinheiroExtraCompras}
                    value={perfil.semDinheiroExtraCompras ? 0 : perfil.orcamentoValor}
                    onChange={(e) => atualizarCampo('orcamentoValor', Number(e.target.value))}
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#121212] border border-white/15 text-white text-sm font-mono-num disabled:opacity-50"
                  />
                </div>

                <div>
                  <label htmlFor="onb-orcamento-per" className="block text-xs font-medium text-[#B3B3B3] mb-1">
                    Período do orçamento
                  </label>
                  <select
                    id="onb-orcamento-per"
                    disabled={perfil.semDinheiroExtraCompras}
                    value={perfil.orcamentoPeriodo}
                    onChange={(e) => atualizarCampo('orcamentoPeriodo', e.target.value as BudgetPeriod)}
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#121212] border border-white/15 text-white text-sm disabled:opacity-50"
                  >
                    <option value="dia">Por dia</option>
                    <option value="semana">Por semana</option>
                    <option value="mes">Por mês</option>
                  </select>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  atualizarCampo('semDinheiroExtraCompras', !perfil.semDinheiroExtraCompras)
                }
                className={`w-full min-h-[44px] px-4 py-2.5 rounded-xl border text-left text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                  perfil.semDinheiroExtraCompras
                    ? 'bg-[#FF2D8D]/20 border-[#FF2D8D] text-white'
                    : 'bg-[#121212] border-white/10 text-[#B3B3B3]'
                }`}
              >
                <span>
                  Não possuo dinheiro disponível para compras extras agora (usar estoque de casa)
                </span>
                {perfil.semDinheiroExtraCompras && <Check className="w-4 h-4 text-[#FF2D8D]" />}
              </button>
            </div>

            {/* Despensa atual em casa */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-white">
                Toque nos alimentos que você JÁ TEM em casa agora:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {STAPLE_SUGGESTIONS.map((sug) => {
                  const selecionado = perfil.despensa.some((d) => d.foodId === sug.foodId);
                  return (
                    <button
                      key={sug.foodId}
                      type="button"
                      onClick={() =>
                        togglePantrySuggestion(sug.foodId, sug.label, sug.gramasPadrao)
                      }
                      className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-medium border flex items-center justify-between transition-colors cursor-pointer ${
                        selecionado
                          ? 'bg-[#FF2D8D] border-[#FF2D8D] text-white'
                          : 'bg-[#1B1B1B] border-white/10 text-[#B3B3B3] hover:text-white'
                      }`}
                    >
                      <span>{sug.label}</span>
                      {selecionado && <Check className="w-3.5 h-3.5 shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {/* Adicionar alimento manual na despensa */}
              <div className="bg-[#1B1B1B] border border-white/10 rounded-2xl p-4 space-y-3">
                <p className="text-xs font-medium text-white">
                  Adicionar outro alimento disponível em casa e ajustar quantidades:
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    aria-label="Nome do alimento disponível em casa"
                    value={novoAlimentoDespensaNome}
                    onChange={(e) => setNovoAlimentoDespensaNome(e.target.value)}
                    placeholder="Ex.: Cuscuz, Mandioca, Lentilha..."
                    className="flex-1 min-h-[44px] px-3.5 py-2 rounded-xl bg-[#121212] border border-white/15 text-white text-sm"
                  />
                  <input
                    type="number"
                    aria-label="Quantidade aproximada em gramas"
                    value={novoAlimentoDespensaGramas}
                    onChange={(e) => setNovoAlimentoDespensaGramas(e.target.value)}
                    placeholder="Gramas (g)"
                    className="w-full sm:w-32 min-h-[44px] px-3.5 py-2 rounded-xl bg-[#121212] border border-white/15 text-white text-sm font-mono-num"
                  />
                  <button
                    type="button"
                    onClick={adicionarAlimentoManualDespensa}
                    className="min-h-[44px] px-4 rounded-xl bg-[#FF2D8D] text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Adicionar</span>
                  </button>
                </div>

                {/* Lista editável da despensa */}
                <div className="space-y-2 pt-2 max-h-56 overflow-y-auto">
                  {perfil.despensa.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-2 bg-[#121212] px-3 py-2 rounded-xl border border-white/10 text-xs"
                    >
                      <span className="text-white font-medium truncate">{item.nome}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <input
                          type="number"
                          aria-label={`Quantidade em gramas de ${item.nome}`}
                          min={50}
                          step={50}
                          value={item.quantidadeGramas}
                          onChange={(e) => {
                            const novaQtd = Math.max(0, Number(e.target.value));
                            atualizarCampo(
                              'despensa',
                              perfil.despensa.map((d) =>
                                d.id === item.id ? { ...d, quantidadeGramas: novaQtd } : d
                              )
                            );
                          }}
                          className="w-20 min-h-[36px] px-2 rounded-lg bg-[#1B1B1B] border border-white/15 text-white text-right font-mono-num"
                        />
                        <span className="text-[#B3B3B3]">g</span>
                        <button
                          type="button"
                          aria-label={`Remover ${item.nome} da despensa`}
                          onClick={() =>
                            atualizarCampo(
                              'despensa',
                              perfil.despensa.filter((d) => d.id !== item.id)
                            )
                          }
                          className="min-h-[36px] min-w-[36px] flex items-center justify-center text-[#B3B3B3] hover:text-[#FF2D8D] cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {etapa === 6 && (
          <div className="space-y-5">
            <p className="text-xs text-[#B3B3B3]">
              Estes horários são opcionais e ajudam o PULSE a organizar lembretes e sugestões de
              pré/pós-treino.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="onb-acordar" className="block text-xs font-medium text-[#B3B3B3] mb-1.5">
                  Horário habitual de acordar (opcional)
                </label>
                <input
                  id="onb-acordar"
                  type="time"
                  value={perfil.horarioAcordar}
                  onChange={(e) => atualizarCampo('horarioAcordar', e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#1B1B1B] border border-white/15 text-white text-sm font-mono-num"
                />
              </div>

              <div>
                <label htmlFor="onb-dormir" className="block text-xs font-medium text-[#B3B3B3] mb-1.5">
                  Horário habitual de dormir (opcional)
                </label>
                <input
                  id="onb-dormir"
                  type="time"
                  value={perfil.horarioDormir}
                  onChange={(e) => atualizarCampo('horarioDormir', e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#1B1B1B] border border-white/15 text-white text-sm font-mono-num"
                />
              </div>

              <div>
                <label htmlFor="onb-hora-treino" className="block text-xs font-medium text-[#B3B3B3] mb-1.5">
                  Horário preferido para treinar (opcional)
                </label>
                <input
                  id="onb-hora-treino"
                  type="time"
                  value={perfil.horarioTreino}
                  onChange={(e) => atualizarCampo('horarioTreino', e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#1B1B1B] border border-white/15 text-white text-sm font-mono-num"
                />
              </div>

              <div>
                <label htmlFor="onb-dias-rotina" className="block text-xs font-medium text-[#B3B3B3] mb-1.5">
                  Quantos dias na semana consegue manter essa rotina?
                </label>
                <input
                  id="onb-dias-rotina"
                  type="number"
                  min={1}
                  max={7}
                  value={perfil.diasRotinaConsistente}
                  onChange={(e) => atualizarCampo('diasRotinaConsistente', Number(e.target.value))}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#1B1B1B] border border-white/15 text-white text-sm font-mono-num"
                />
              </div>
            </div>
          </div>
        )}

        {etapa === 7 && (
          <div className="space-y-5">
            <p className="text-xs text-[#B3B3B3]">
              Confira o resumo das suas informações, as estimativas calculadas e toque em qualquer
              etapa caso queira corrigir antes de gerar seu painel personalizado.
            </p>

            {/* Resumo das respostas com botão de editar por bloco */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-[#1B1B1B] border border-white/10 rounded-2xl p-4 flex items-start justify-between">
                <div className="space-y-1 text-xs">
                  <p className="font-semibold text-white">Perfil e Saúde</p>
                  <p className="text-[#B3B3B3]">
                    {perfil.nome} · {perfil.idade} anos · {perfil.alturaCm} cm · {perfil.pesoAtualKg} kg
                  </p>
                  <p className="text-[#B3B3B3]">
                    Fórmula: {perfil.variavelFisiologica.replace('_', ' ')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => irParaEtapa(1)}
                  aria-label="Editar Etapa 1 Perfil Básico"
                  className="min-h-[40px] px-2.5 text-xs text-[#FF65AD] flex items-center gap-1 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Editar</span>
                </button>
              </div>

              <div className="bg-[#1B1B1B] border border-white/10 rounded-2xl p-4 flex items-start justify-between">
                <div className="space-y-1 text-xs">
                  <p className="font-semibold text-white">Objetivo e Treino</p>
                  <p className="text-[#B3B3B3]">
                    Meta: {perfil.objetivoPrincipal.replace('_', ' ')}
                  </p>
                  <p className="text-[#B3B3B3]">
                    Treino: {perfil.diasTreinoPorSemana}x/sem ({perfil.tempoSessaoMinutos} min) ·{' '}
                    {perfil.localTreino}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => irParaEtapa(3)}
                  aria-label="Editar Etapa 3 Atividade Física"
                  className="min-h-[40px] px-2.5 text-xs text-[#FF65AD] flex items-center gap-1 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Editar</span>
                </button>
              </div>

              <div className="bg-[#1B1B1B] border border-white/10 rounded-2xl p-4 flex items-start justify-between sm:col-span-2">
                <div className="space-y-1 text-xs">
                  <p className="font-semibold text-white">Alimentação, Orçamento e Despensa</p>
                  <p className="text-[#B3B3B3]">
                    {perfil.refeicoesPorDia} refeições/dia · Padrão {perfil.padraoAlimentar} ·{' '}
                    {perfil.semDinheiroExtraCompras
                      ? 'Sem dinheiro extra para compras (foco 100% despensa)'
                      : `Orçamento: R$ ${perfil.orcamentoValor} por ${perfil.orcamentoPeriodo}`}
                  </p>
                  <p className="text-[#B3B3B3]">
                    Despensa cadastrada ({perfil.despensa.length} itens):{' '}
                    {perfil.despensa.map((d) => d.nome.split(' ')[0]).join(', ') || 'Nenhum item'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => irParaEtapa(5)}
                  aria-label="Editar Etapa 5 Orçamento e Despensa"
                  className="min-h-[40px] px-2.5 text-xs text-[#FF65AD] flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Editar</span>
                </button>
              </div>
            </div>

            {/* Estimativas iniciais calculadas */}
            {metasPrevia && (
              <div className="bg-[#1B1B1B] border border-[#FF2D8D]/40 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-white">
                    Estimativas Energéticas e Metas Propostas
                  </p>
                  <span className="text-xs text-[#FF65AD]">Cálculo Determinístico</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-[#121212] p-3 rounded-xl">
                    <p className="text-[11px] text-[#B3B3B3]">TMB de Repouso</p>
                    <p className="text-lg font-bold font-mono-num text-white">
                      ~{metasPrevia.bmrEstimadoKcal} kcal
                    </p>
                  </div>
                  <div className="bg-[#121212] p-3 rounded-xl">
                    <p className="text-[11px] text-[#B3B3B3]">Gasto Diário (TDEE)</p>
                    <p className="text-lg font-bold font-mono-num text-white">
                      ~{metasPrevia.tdeeEstimadoKcal} kcal
                    </p>
                  </div>
                  <div className="bg-[#121212] p-3 rounded-xl">
                    <p className="text-[11px] text-[#B3B3B3]">Meta Estimada</p>
                    <p className="text-lg font-bold font-mono-num text-[#FF65AD]">
                      {metasPrevia.caloriasMetaKcal} kcal
                    </p>
                  </div>
                  <div className="bg-[#121212] p-3 rounded-xl">
                    <p className="text-[11px] text-[#B3B3B3]">Proteínas / Dia</p>
                    <p className="text-lg font-bold font-mono-num text-white">
                      {metasPrevia.proteinasGramas}g
                    </p>
                  </div>
                </div>

                <div className="text-xs text-[#B3B3B3] space-y-1">
                  <p>
                    <strong className="text-white">Fórmula aplicada:</strong> {metasPrevia.formulaUsada}
                  </p>
                  {metasPrevia.analisePesoDesejado && (
                    <p className="text-[#FF65AD]">{metasPrevia.analisePesoDesejado}</p>
                  )}
                  {metasPrevia.avisosSeguranca.map((av, i) => (
                    <p key={i} className="flex items-start gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-[#FF65AD] shrink-0 mt-0.5" />
                      <span>{av}</span>
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Navegação Inferior do Onboarding */}
      <footer className="pt-4 border-t border-white/10 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => {
            if (etapa === 1) {
              setMostrarBoasVindas(true);
            } else {
              irParaEtapa(etapa - 1);
            }
          }}
          className="min-h-[48px] px-5 py-2.5 rounded-xl bg-[#1B1B1B] hover:bg-white/10 border border-white/15 text-white text-sm font-medium flex items-center gap-2 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar</span>
        </button>

        {etapa < 7 ? (
          <button
            type="button"
            onClick={() => irParaEtapa(etapa + 1)}
            className="min-h-[48px] px-6 py-2.5 rounded-xl bg-[#FF2D8D] hover:bg-[#FF65AD] text-white text-sm font-semibold flex items-center gap-2 cursor-pointer"
          >
            <span>Continuar</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onCompleteOnboarding(perfil)}
            className="min-h-[48px] px-6 py-2.5 rounded-xl bg-[#FF2D8D] hover:bg-[#FF65AD] text-white text-sm font-semibold flex items-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Confirmar e Gerar Meu Plano PULSE</span>
          </button>
        )}
      </footer>
    </div>
  );
};
