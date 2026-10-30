import React from 'react';
import {
  PlannedMeal,
  PulseDatabaseState,
  WorkoutDay,
} from '../domain/types';
import { calculateDiaryTotals } from '../domain/dietGenerator';
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Dumbbell,
  Flame,
  MessageSquareHeart,
  PlusCircle,
  Scale,
  ShoppingBag,
  Utensils,
} from 'lucide-react';

interface DashboardViewProps {
  estado: PulseDatabaseState;
  onNavigateTab: (tab: 'inicio' | 'dieta' | 'treino' | 'evolucao' | 'perfil') => void;
  onOpenDietSubTab: (subTab: 'plano' | 'diario' | 'busca' | 'receitas' | 'compras') => void;
  onOpenMealDetail: (meal: PlannedMeal) => void;
  onMarkMealConsumed: (mealId: string) => void;
  onStartActiveWorkout: (day: WorkoutDay) => void;
  onOpenPulseAi: () => void;
}

const GOAL_LABELS: Record<string, string> = {
  emagrecer: 'Emagrecimento saudável',
  ganhar_massa: 'Ganho de massa muscular',
  recomposicao_corporal: 'Recomposição corporal',
  manter_condicionamento: 'Manutenção e condicionamento',
  melhorar_resistencia: 'Resistência física',
  habitos_saudaveis: 'Hábitos saudáveis',
};

export const DashboardView: React.FC<DashboardViewProps> = ({
  estado,
  onNavigateTab,
  onOpenDietSubTab,
  onOpenMealDetail,
  onMarkMealConsumed,
  onStartActiveWorkout,
  onOpenPulseAi,
}) => {
  const {
    perfil,
    metasNutricionais,
    planoAlimentar,
    diarioAlimentar,
    planoTreino,
    historicoMedidas,
    historicoTreinos,
    sequenciaHabitosDias,
    listaCompras,
  } = estado;

  const hojeISO = new Date().toISOString().slice(0, 10);
  const registrosHoje = diarioAlimentar.filter((e) => e.dataISO === hojeISO);
  const totaisRegistradosHoje = calculateDiaryTotals(registrosHoje);
  const temRegistroHoje = registrosHoje.length > 0;

  const proximaRefeicao =
    planoAlimentar.refeicoes.find((r) => !r.consumidaHoje) ?? planoAlimentar.refeicoes[0];
  const proximoTreino = planoTreino.dias[0];
  const ultimaMedida = historicoMedidas[0];
  const itensFaltantesCompras = listaCompras.itens.filter(
    (i) => !i.comprado && i.quantidadeFaltanteGramas > 0
  ).length;

  const percProteina = temRegistroHoje
    ? Math.min(100, Math.round((totaisRegistradosHoje.proteinas / metasNutricionais.proteinasGramas) * 100))
    : 0;
  const percCarbo = temRegistroHoje
    ? Math.min(100, Math.round((totaisRegistradosHoje.carboidratos / metasNutricionais.carboidratosGramas) * 100))
    : 0;
  const percGordura = temRegistroHoje
    ? Math.min(100, Math.round((totaisRegistradosHoje.gorduras / metasNutricionais.gordurasGramas) * 100))
    : 0;

  return (
    <div className="space-y-6 pb-8">
      {/* Saudação Personalizada & Objetivo Atual */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#121212] border border-white/10 rounded-3xl p-5 sm:p-6">
        <div className="space-y-1.5">
          <p className="text-xs text-[#B3B3B3]">
            Objetivo atual: <span className="text-[#FF65AD] font-medium">{GOAL_LABELS[perfil.objetivoPrincipal] ?? perfil.objetivoPrincipal}</span>
            {' · '}
            Sequência ativa: <span className="text-white font-mono-num">{sequenciaHabitosDias} {sequenciaHabitosDias === 1 ? 'dia' : 'dias'}</span>
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
            Olá, {perfil.nome || 'Atleta'}
          </h1>
          <p className="text-xs text-[#B3B3B3]">
            Metas estimadas via {metasNutricionais.formulaUsada.split('—')[0].trim()} · Despensa com{' '}
            {perfil.despensa.length} itens ativos.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              onNavigateTab('dieta');
              onOpenDietSubTab('diario');
            }}
            className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[#1B1B1B] hover:bg-white/10 border border-white/15 text-white text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-[#FF65AD]" />
            <span>Registrar refeição</span>
          </button>

          {proximoTreino && (
            <button
              type="button"
              onClick={() => onStartActiveWorkout(proximoTreino)}
              className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[#FF2D8D] hover:bg-[#FF65AD] text-white text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Dumbbell className="w-4 h-4" />
              <span>Iniciar treino</span>
            </button>
          )}
        </div>
      </section>

      {/* Grid Principal: Resumo Nutricional do Dia + Atalho PULSE AI */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Card de Energia e Macronutrientes (Diferenciando Meta Estimada vs Resultado Registrado) */}
        <section className="lg:col-span-2 bg-[#1B1B1B] border border-white/10 rounded-3xl p-5 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
            <div>
              <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
                <Flame className="w-5 h-5 text-[#FF2D8D] shrink-0" />
                <span>Resumo da Alimentação de Hoje</span>
              </h2>
              <p className="text-xs text-[#B3B3B3] mt-0.5">
                Diferenciação clara entre sua meta estimada e o que já foi efetivamente registrado hoje.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                onNavigateTab('dieta');
                onOpenDietSubTab('plano');
              }}
              className="text-xs font-medium text-[#FF65AD] hover:underline min-h-[36px] self-start sm:self-auto flex items-center shrink-0 cursor-pointer"
            >
              Ver plano completo →
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-[#121212] rounded-2xl p-4 border border-white/5">
              <p className="text-xs text-[#B3B3B3]">Meta Diária Estimada</p>
              <p className="text-2xl font-bold font-mono-num text-white mt-1">
                {metasNutricionais.caloriasMetaKcal} <span className="text-sm font-normal text-[#B3B3B3]">kcal</span>
              </p>
              <p className="text-[11px] text-[#B3B3B3] mt-1">
                Faixa estimada: {metasNutricionais.faixaCaloriasMin} a {metasNutricionais.faixaCaloriasMax} kcal · Água ref.: ~{metasNutricionais.hidratacaoLitrosReferencia}L
              </p>
            </div>

            <div className="bg-[#121212] rounded-2xl p-4 border border-white/5">
              <p className="text-xs text-[#B3B3B3]">Consumo Efetivamente Registrado Hoje</p>
              {temRegistroHoje ? (
                <>
                  <p className="text-2xl font-bold font-mono-num text-[#FF65AD] mt-1">
                    {totaisRegistradosHoje.kcal}{' '}
                    <span className="text-sm font-normal text-[#B3B3B3]">
                      kcal ({registrosHoje.length} {registrosHoje.length === 1 ? 'item' : 'itens'})
                    </span>
                  </p>
                  <p className="text-[11px] text-[#B3B3B3] mt-1">
                    Restante estimado para a meta:{' '}
                    {Math.max(0, metasNutricionais.caloriasMetaKcal - totaisRegistradosHoje.kcal)} kcal
                  </p>
                </>
              ) : (
                <div className="mt-1.5 space-y-1">
                  <p className="text-sm font-medium text-white">Nenhuma refeição registrada hoje</p>
                  <p className="text-[11px] text-[#B3B3B3]">
                    Registre uma refeição no Diário ou marque uma refeição do plano como consumida para exibir calorias reais.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Barras de Macronutrientes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#B3B3B3]">Proteínas</span>
                <span className="font-mono-num text-white">
                  {temRegistroHoje ? `${totaisRegistradosHoje.proteinas}g` : '—'} / {metasNutricionais.proteinasGramas}g
                </span>
              </div>
              <div className="w-full h-2 bg-[#121212] rounded-full overflow-hidden">
                <div
                  className="bg-[#FF2D8D] h-full transition-transform duration-200 origin-left"
                  style={{ transform: `scaleX(${percProteina / 100})` }}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#B3B3B3]">Carboidratos</span>
                <span className="font-mono-num text-white">
                  {temRegistroHoje ? `${totaisRegistradosHoje.carboidratos}g` : '—'} / {metasNutricionais.carboidratosGramas}g
                </span>
              </div>
              <div className="w-full h-2 bg-[#121212] rounded-full overflow-hidden">
                <div
                  className="bg-[#FF65AD] h-full transition-transform duration-200 origin-left"
                  style={{ transform: `scaleX(${percCarbo / 100})` }}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#B3B3B3]">Gorduras</span>
                <span className="font-mono-num text-white">
                  {temRegistroHoje ? `${totaisRegistradosHoje.gorduras}g` : '—'} / {metasNutricionais.gordurasGramas}g
                </span>
              </div>
              <div className="w-full h-2 bg-[#121212] rounded-full overflow-hidden">
                <div
                  className="bg-white/80 h-full transition-transform duration-200 origin-left"
                  style={{ transform: `scaleX(${percGordura / 100})` }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Card de Atalho para o Assistente Conversacional PULSE AI */}
        <section className="bg-[#1B1B1B] border border-[#FF2D8D]/40 rounded-3xl p-5 sm:p-6 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#FF65AD]">ASSISTENTE INTELIGENTE</span>
              <MessageSquareHeart className="w-5 h-5 text-[#FF2D8D]" />
            </div>
            <h2 className="font-display text-xl font-bold text-white">PULSE AI</h2>
            <p className="text-xs text-[#B3B3B3] leading-relaxed">
              Converse em português sobre o que cozinhar com o que tem na geladeira, ajustes de
              orçamento ("Só tenho R$ 20 até amanhã") ou treinos rápidos para hoje.
            </p>
          </div>

          <div className="space-y-2 text-xs text-[#B3B3B3] bg-[#121212] p-3 rounded-2xl border border-white/5">
            <p className="text-white font-medium">Exemplos rápidos:</p>
            <p>• &ldquo;Tenho ovos e arroz. O que consigo preparar?&rdquo;</p>
            <p>• &ldquo;Troca meu almoço por uma opção sem frango.&rdquo;</p>
          </div>

          <button
            type="button"
            onClick={onOpenPulseAi}
            className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-[#FF2D8D] hover:bg-[#FF65AD] text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <span>Conversar com PULSE AI</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </section>
      </div>

      {/* Próxima Refeição & Próximo Treino */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {proximaRefeicao && (
          <section className="bg-[#1B1B1B] border border-white/10 rounded-3xl p-5 space-y-4 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-[#B3B3B3]">
                <span className="flex items-center gap-1.5 text-white font-medium">
                  <Utensils className="w-4 h-4 text-[#FF65AD]" />
                  Próxima Refeição ({proximaRefeicao.horarioSugerido})
                </span>
                <span className="font-mono-num">
                  ~{proximaRefeicao.caloriasTotais} kcal · R$ {proximaRefeicao.custoEstimadoTotalBRL.toFixed(2)}
                </span>
              </div>
              <h3 className="font-display text-lg font-bold text-white">
                {proximaRefeicao.nomeRefeicao}
              </h3>
              <p className="text-xs text-[#B3B3B3]">
                {proximaRefeicao.ingredientes
                  .map((i) => `${i.nome.split(' ')[0]} (${i.quantidadeGramas}g)`)
                  .join(' · ')}
              </p>
            </div>

            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => onOpenMealDetail(proximaRefeicao)}
                className="flex-1 min-h-[44px] px-3 py-2 rounded-xl bg-[#121212] hover:bg-white/10 border border-white/15 text-xs font-medium text-white cursor-pointer"
              >
                Ver preparo e substituições
              </button>
              <button
                type="button"
                onClick={() => onMarkMealConsumed(proximaRefeicao.id)}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-[#FF2D8D] hover:bg-[#FF65AD] text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Consumida</span>
              </button>
            </div>
          </section>
        )}

        {proximoTreino && (
          <section className="bg-[#1B1B1B] border border-white/10 rounded-3xl p-5 space-y-4 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-[#B3B3B3]">
                <span className="flex items-center gap-1.5 text-white font-medium">
                  <Dumbbell className="w-4 h-4 text-[#FF65AD]" />
                  Próximo Treino ({perfil.horarioTreino || 'Horário livre'})
                </span>
                <span className="font-mono-num">~{proximoTreino.duracaoEstimadaMin} min</span>
              </div>
              <h3 className="font-display text-lg font-bold text-white">
                {proximoTreino.titulo}
              </h3>
              <p className="text-xs text-[#B3B3B3]">
                {proximoTreino.exercicios.length} exercícios prescritos · {proximoTreino.foco}
              </p>
            </div>

            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => onNavigateTab('treino')}
                className="flex-1 min-h-[44px] px-3 py-2 rounded-xl bg-[#121212] hover:bg-white/10 border border-white/15 text-xs font-medium text-white cursor-pointer"
              >
                Ver ficha completa
              </button>
              <button
                type="button"
                onClick={() => onStartActiveWorkout(proximoTreino)}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-[#FF2D8D] hover:bg-[#FF65AD] text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer"
              >
                <span>Treinar agora</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </section>
        )}
      </div>

      {/* Resumo da Semana, Peso/Medidas Recentes e Lista de Compras */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#1B1B1B] border border-white/10 rounded-2xl p-4 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between text-xs text-[#B3B3B3]">
            <span>Peso e Medidas Recentes</span>
            <Scale className="w-4 h-4 text-[#FF65AD]" />
          </div>
          <div>
            <p className="text-xl font-bold font-mono-num text-white">
              {ultimaMedida ? `${ultimaMedida.pesoKg} kg` : `${perfil.pesoAtualKg} kg`}
            </p>
            <p className="text-xs text-[#B3B3B3] mt-0.5">
              {ultimaMedida?.cinturaCm ? `Cintura: ${ultimaMedida.cinturaCm} cm` : 'Toque para atualizar medidas'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('evolucao')}
            className="text-xs text-[#FF65AD] hover:underline text-left min-h-[36px] flex items-center cursor-pointer"
          >
            Abrir histórico de evolução →
          </button>
        </div>

        <div className="bg-[#1B1B1B] border border-white/10 rounded-2xl p-4 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between text-xs text-[#B3B3B3]">
            <span>Lista de Compras ({listaCompras.periodoDias} dias)</span>
            <ShoppingBag className="w-4 h-4 text-[#FF65AD]" />
          </div>
          <div>
            <p className="text-xl font-bold font-mono-num text-white">
              {itensFaltantesCompras} {itensFaltantesCompras === 1 ? 'item faltante' : 'itens faltantes'}
            </p>
            <p className="text-xs text-[#B3B3B3] mt-0.5">
              Custo estimado de reposição: R$ {listaCompras.custoTotalFaltanteEstimadoBRL.toFixed(2)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              onNavigateTab('dieta');
              onOpenDietSubTab('compras');
            }}
            className="text-xs text-[#FF65AD] hover:underline text-left min-h-[36px] flex items-center cursor-pointer"
          >
            Ver lista e substituições →
          </button>
        </div>

        <div className="bg-[#1B1B1B] border border-white/10 rounded-2xl p-4 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between text-xs text-[#B3B3B3]">
            <span>Resumo da Semana</span>
            <Activity className="w-4 h-4 text-[#FF65AD]" />
          </div>
          <div>
            <p className="text-xl font-bold font-mono-num text-white">
              {historicoTreinos.length} / {planoTreino.frequenciaSemanal} treinos
            </p>
            <p className="text-xs text-[#B3B3B3] mt-0.5">
              Consistência planejada: {perfil.diasRotinaConsistente} dias/semana
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('evolucao')}
            className="text-xs text-[#FF65AD] hover:underline text-left min-h-[36px] flex items-center cursor-pointer"
          >
            Ver gráficos e cargas →
          </button>
        </div>
      </div>
    </div>
  );
};
