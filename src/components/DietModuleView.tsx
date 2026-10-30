import React, { useState } from 'react';
import {
  CustomRecipe,
  FoodDiaryEntry,
  FoodItem,
  PlannedMeal,
  PulseDatabaseState,
} from '../domain/types';
import { FOOD_DATABASE, findFoodById, searchFoodsByQuery } from '../domain/foodDatabase';
import { calculateDiaryTotals } from '../domain/dietGenerator';
import {
  BookOpen,
  Check,
  CheckCircle2,
  ChefHat,
  Clock,
  Copy,
  Plus,
  RefreshCw,
  Search,
  ShoppingBag,
  Sparkles,
  Trash2,
  Utensils,
  Wallet,
  X,
} from 'lucide-react';

interface DietModuleViewProps {
  estado: PulseDatabaseState;
  subTabAtiva: 'plano' | 'diario' | 'busca' | 'receitas' | 'compras';
  onChangeSubTab: (sub: 'plano' | 'diario' | 'busca' | 'receitas' | 'compras') => void;
  refeicaoDetalhe: PlannedMeal | null;
  onSelectMealDetail: (meal: PlannedMeal | null) => void;
  onToggleEconomyMode: () => void;
  onSwapMeal: (mealId: string, alternativeId: string) => void;
  onSubstituteIngredient: (mealId: string, oldFoodId: string, newFoodId: string) => void;
  onMarkMealConsumed: (mealId: string) => void;
  onAddDiaryEntry: (entry: Omit<FoodDiaryEntry, 'id'>) => void;
  onRemoveDiaryEntry: (entryId: string) => void;
  onRepeatYesterdayDiary: () => void;
  onAddCustomRecipe: (recipe: CustomRecipe) => void;
  onLogRecipeToDiary: (recipe: CustomRecipe, slotRefeicao: string) => void;
  onChangeShoppingPeriod: (dias: 3 | 7 | 14) => void;
  onToggleShoppingItemPurchased: (itemId: string) => void;
  onUpdateShoppingItemQuantityOrPrice: (
    itemId: string,
    novaQtdGramas?: number,
    novoPrecoKg?: number
  ) => void;
  onApplyCheaperSubstitutionInPlan: (oldFoodId: string, newFoodId: string) => void;
  onAddFoodToPantry: (food: FoodItem, gramas: number) => void;
}

export const DietModuleView: React.FC<DietModuleViewProps> = ({
  estado,
  subTabAtiva,
  onChangeSubTab,
  refeicaoDetalhe,
  onSelectMealDetail,
  onToggleEconomyMode,
  onSwapMeal,
  onSubstituteIngredient,
  onMarkMealConsumed,
  onAddDiaryEntry,
  onRemoveDiaryEntry,
  onRepeatYesterdayDiary,
  onAddCustomRecipe,
  onLogRecipeToDiary,
  onChangeShoppingPeriod,
  onToggleShoppingItemPurchased,
  onUpdateShoppingItemQuantityOrPrice,
  onApplyCheaperSubstitutionInPlan,
  onAddFoodToPantry,
}) => {
  const { planoAlimentar, metasNutricionais, diarioAlimentar, receitasPersonalizadas, listaCompras } =
    estado;

  // Estados locais para Diário e Busca
  const [buscaQuery, setBuscaQuery] = useState('');
  const [alimentoSelecionadoDiario, setAlimentoSelecionadoDiario] = useState<string>(
    FOOD_DATABASE[0].id
  );
  const [gramasDiarioInput, setGramasDiarioInput] = useState<string>('120');
  const [slotDiarioInput, setSlotDiarioInput] = useState<string>('Almoço');

  // Estados locais para Nova Receita
  const [nomeReceita, setNomeReceita] = useState('');
  const [tempoReceita, setTempoReceita] = useState('15');
  const [preparoReceita, setPreparoReceita] = useState('');
  const [ingReceitaFoodId, setIngReceitaFoodId] = useState(FOOD_DATABASE[0].id);
  const [ingReceitaGramas, setIngReceitaGramas] = useState('100');
  const [ingredientesNovaReceita, setIngredientesNovaReceita] = useState<
    { foodId: string; nome: string; quantidadeGramas: number }[]
  >([]);

  const [copiadoSucesso, setCopiadoSucesso] = useState(false);

  const hojeISO = new Date().toISOString().slice(0, 10);
  const entradasHoje = diarioAlimentar.filter((e) => e.dataISO === hojeISO);
  const totaisHoje = calculateDiaryTotals(entradasHoje);
  const resultadosBusca = searchFoodsByQuery(buscaQuery);

  const handleRegistrarItemDiario = (e: React.FormEvent) => {
    e.preventDefault();
    const food = findFoodById(alimentoSelecionadoDiario);
    if (!food) return;
    const gramas = Math.max(5, Number(gramasDiarioInput) || 100);
    const fator = gramas / 100;

    onAddDiaryEntry({
      dataISO: hojeISO,
      slotRefeicao: slotDiarioInput,
      foodId: food.id,
      nomeAlimento: food.nome,
      quantidadeGramas: gramas,
      kcal: Math.round(food.kcalPor100g * fator),
      proteinas: Number((food.proteinaPor100g * fator).toFixed(1)),
      carboidratos: Number((food.carboidratoPor100g * fator).toFixed(1)),
      gorduras: Number((food.gorduraPor100g * fator).toFixed(1)),
      fibras: Number((food.fibraPor100g * fator).toFixed(1)),
      fonteNutricional: food.fonteNutricional,
      ehEstimativaManual: false,
    });
  };

  const handleSalvarReceita = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeReceita.trim() || ingredientesNovaReceita.length === 0) return;

    const totais = ingredientesNovaReceita.reduce(
      (acc, item) => {
        const f = findFoodById(item.foodId);
        if (!f) return acc;
        const fator = item.quantidadeGramas / 100;
        return {
          kcal: Math.round(acc.kcal + f.kcalPor100g * fator),
          proteinas: Number((acc.proteinas + f.proteinaPor100g * fator).toFixed(1)),
          carboidratos: Number((acc.carboidratos + f.carboidratoPor100g * fator).toFixed(1)),
          gorduras: Number((acc.gorduras + f.gorduraPor100g * fator).toFixed(1)),
          fibras: Number((acc.fibras + f.fibraPor100g * fator).toFixed(1)),
        };
      },
      { kcal: 0, proteinas: 0, carboidratos: 0, gorduras: 0, fibras: 0 }
    );

    onAddCustomRecipe({
      id: `rec_${Date.now()}`,
      nome: nomeReceita.trim(),
      tempoPreparoMin: Number(tempoReceita) || 15,
      modoPreparo:
        preparoReceita.trim() ||
        'Misture os ingredientes nas quantidades indicadas e prepare em fogo moderado.',
      favoritaCombinacao: true,
      ingredientes: ingredientesNovaReceita,
      totais,
    });

    setNomeReceita('');
    setPreparoReceita('');
    setIngredientesNovaReceita([]);
  };

  const handleCopiarListaCompras = () => {
    const linhas = listaCompras.itens
      .filter((i) => !i.comprado && i.quantidadeFaltanteGramas > 0)
      .map(
        (i) =>
          `- ${i.nome}: comprar ${i.quantidadeFaltanteGramas}g (~R$ ${i.custoEstimadoFaltanteBRL.toFixed(2)})`
      );
    const texto = `Lista de Compras PULSE (${listaCompras.periodoDias} dias)\nTotal estimado: R$ ${listaCompras.custoTotalFaltanteEstimadoBRL.toFixed(2)}\n\n${linhas.join('\n')}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(texto).catch(() => {});
    }
    setCopiadoSucesso(true);
    setTimeout(() => setCopiadoSucesso(false), 2500);
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Navegação de Sub-telas de Nutrição */}
      <div className="flex items-center gap-1.5 p-1.5 bg-[#121212] border border-white/10 rounded-2xl overflow-x-auto">
        {[
          { id: 'plano', label: 'Plano Alimentar', icon: Utensils },
          { id: 'diario', label: 'Diário Alimentar', icon: BookOpen },
          { id: 'busca', label: 'Base TACO/TBCA', icon: Search },
          { id: 'receitas', label: 'Receitas', icon: ChefHat },
          { id: 'compras', label: 'Lista de Compras', icon: ShoppingBag },
        ].map((tab) => {
          const Icon = tab.icon;
          const ativo = subTabAtiva === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChangeSubTab(tab.id as typeof subTabAtiva)}
              className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                ativo
                  ? 'bg-[#FF2D8D] text-white'
                  : 'text-[#B3B3B3] hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* SUB-TELA 1: PLANO ALIMENTAR E MODO ECONÔMICO */}
      {subTabAtiva === 'plano' && (
        <div className="space-y-5">
          {/* Barra de Resumo e Modo Econômico */}
          <div className="bg-[#1B1B1B] border border-white/10 rounded-3xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="font-display text-xl font-bold text-white">
                  Plano Alimentar Inteligente
                </h1>
                <p className="text-xs text-[#B3B3B3]">
                  Total planejado: <span className="text-white font-mono-num">{planoAlimentar.totaisPlano.calorias} kcal</span>
                  {' · '}
                  P: <span className="text-white font-mono-num">{planoAlimentar.totaisPlano.proteinas}g</span>
                  {' · '}
                  C: <span className="text-white font-mono-num">{planoAlimentar.totaisPlano.carboidratos}g</span>
                  {' · '}
                  G: <span className="text-white font-mono-num">{planoAlimentar.totaisPlano.gorduras}g</span>
                  {' · '}
                  Custo ref.: <span className="text-[#FF65AD] font-mono-num">R$ {planoAlimentar.totaisPlano.custoDiarioEstimadoBRL.toFixed(2)}/dia</span>
                </p>
              </div>

              <button
                type="button"
                onClick={onToggleEconomyMode}
                className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold border flex items-center gap-2 transition-colors cursor-pointer shrink-0 ${
                  planoAlimentar.modoEconomico
                    ? 'bg-[#FF2D8D]/20 border-[#FF2D8D] text-white'
                    : 'bg-[#121212] border-white/15 text-[#B3B3B3]'
                }`}
              >
                <Wallet className="w-4 h-4 text-[#FF65AD]" />
                <span>
                  Modo Econômico: {planoAlimentar.modoEconomico ? 'Ativado' : 'Padrão'}
                </span>
              </button>
            </div>

            {/* Avisos de orçamento, lacunas e sugestões de baixo custo */}
            {(planoAlimentar.lacunasNutricionais.length > 0 ||
              planoAlimentar.explicacaoLimitacoes.length > 0) && (
              <div className="bg-[#121212] rounded-2xl p-4 border border-white/5 space-y-1.5 text-xs text-[#B3B3B3]">
                {planoAlimentar.explicacaoLimitacoes.map((exp, idx) => (
                  <p key={idx}>• {exp}</p>
                ))}
                {planoAlimentar.lacunasNutricionais.map((lac, idx) => (
                  <p key={idx} className="text-[#FF65AD]">
                    • {lac}
                  </p>
                ))}
                {planoAlimentar.sugestoesBaixoCusto.map((sug, idx) => (
                  <p key={idx} className="text-white">
                    • <strong>Dica econômica:</strong> {sug}
                  </p>
                ))}
              </div>
            )}
          </div>

          {/* Lista de Refeições do Dia */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {planoAlimentar.refeicoes.map((meal) => {
              const qtdEmCasa = meal.ingredientes.filter(
                (i) => i.disponivelEmCasaGramas >= i.quantidadeGramas
              ).length;
              return (
                <article
                  key={meal.id}
                  className="bg-[#1B1B1B] border border-white/10 rounded-3xl p-5 flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs text-[#B3B3B3]">
                      <span>
                        {meal.tituloSlot} · {meal.horarioSugerido} · ~{meal.tempoEstimadoMin} min
                      </span>
                      <span className="font-mono-num text-white font-semibold">
                        {meal.caloriasTotais} kcal
                      </span>
                    </div>

                    <h2 className="font-display text-lg font-bold text-white">
                      {meal.nomeRefeicao}
                    </h2>

                    <p className="text-xs text-[#B3B3B3]">
                      Proteínas: <span className="text-white font-mono-num">{meal.proteinasTotais}g</span>
                      {' · '}
                      Carbo: <span className="text-white font-mono-num">{meal.carboidratosTotais}g</span>
                      {' · '}
                      Gorduras: <span className="text-white font-mono-num">{meal.gordurasTotais}g</span>
                      {' · '}
                      Custo est.: <span className="text-[#FF65AD] font-mono-num">R$ {meal.custoEstimadoTotalBRL.toFixed(2)}</span>
                    </p>

                    {/* Ingredientes resumidos com status Em Casa vs Falta */}
                    <div className="space-y-1.5 pt-1">
                      {meal.ingredientes.map((ing) => (
                        <div
                          key={ing.foodId}
                          className="flex items-center justify-between text-xs bg-[#121212] px-3 py-2 rounded-xl"
                        >
                          <div className="truncate pr-2">
                            <span className="text-white font-medium">{ing.nome}</span>
                            <span className="text-[#B3B3B3] ml-1.5">({ing.medidaCaseiraTexto})</span>
                          </div>
                          <span
                            className={`text-[11px] shrink-0 ${
                              ing.faltaComprarGramas === 0 ? 'text-emerald-400' : 'text-[#FF65AD]'
                            }`}
                          >
                            {ing.faltaComprarGramas === 0
                              ? 'Tem em casa'
                              : `Falta ${ing.faltaComprarGramas}g`}
                          </span>
                        </div>
                      ))}
                    </div>
                    <p className="text-[11px] text-[#B3B3B3]">
                      {qtdEmCasa} de {meal.ingredientes.length} ingredientes disponíveis na sua despensa.
                    </p>
                  </div>

                  {/* Ações da Refeição */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => onSelectMealDetail(meal)}
                      className="flex-1 min-h-[44px] px-3 py-2 rounded-xl bg-[#121212] hover:bg-white/10 border border-white/15 text-xs font-medium text-white cursor-pointer"
                    >
                      Detalhes e Substituições
                    </button>

                    {meal.alternativasRefeicao.length > 0 && (
                      <button
                        type="button"
                        onClick={() => onSwapMeal(meal.id, meal.alternativasRefeicao[0].id)}
                        aria-label={`Trocar ${meal.tituloSlot}`}
                        className="min-h-[44px] px-3 py-2 rounded-xl bg-[#121212] hover:bg-white/10 border border-white/15 text-xs font-medium text-[#FF65AD] flex items-center gap-1.5 cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Trocar</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onMarkMealConsumed(meal.id)}
                      className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                        meal.consumidaHoje
                          ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-300'
                          : 'bg-[#FF2D8D] hover:bg-[#FF65AD] text-white'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{meal.consumidaHoje ? 'Consumida' : 'Consumir'}</span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL / TELA DETALHE DA REFEIÇÃO */}
      {refeicaoDetalhe && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Detalhes de ${refeicaoDetalhe.nomeRefeicao}`}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
        >
          <div className="bg-[#1B1B1B] border border-white/15 rounded-t-3xl sm:rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-5 sm:p-6 space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs text-[#FF65AD]">
                  {refeicaoDetalhe.tituloSlot} · {refeicaoDetalhe.horarioSugerido} · Preparo ~
                  {refeicaoDetalhe.tempoEstimadoMin} min
                </p>
                <h2 className="font-display text-xl font-bold text-white mt-0.5">
                  {refeicaoDetalhe.nomeRefeicao}
                </h2>
              </div>
              <button
                type="button"
                aria-label="Fechar detalhe da refeição"
                onClick={() => onSelectMealDetail(null)}
                className="min-h-[44px] min-w-[44px] rounded-xl bg-[#121212] flex items-center justify-center text-[#B3B3B3] hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2 bg-[#121212] p-3.5 rounded-2xl text-center">
              <div>
                <p className="text-[11px] text-[#B3B3B3]">Calorias</p>
                <p className="text-sm font-bold font-mono-num text-white">
                  {refeicaoDetalhe.caloriasTotais} kcal
                </p>
              </div>
              <div>
                <p className="text-[11px] text-[#B3B3B3]">Proteínas</p>
                <p className="text-sm font-bold font-mono-num text-[#FF65AD]">
                  {refeicaoDetalhe.proteinasTotais}g
                </p>
              </div>
              <div>
                <p className="text-[11px] text-[#B3B3B3]">Carboidratos</p>
                <p className="text-sm font-bold font-mono-num text-white">
                  {refeicaoDetalhe.carboidratosTotais}g
                </p>
              </div>
              <div>
                <p className="text-[11px] text-[#B3B3B3]">Custo Est.</p>
                <p className="text-sm font-bold font-mono-num text-white">
                  R$ {refeicaoDetalhe.custoEstimadoTotalBRL.toFixed(2)}
                </p>
              </div>
            </div>

            {/* Ingredientes e Substituições Individuais */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-white">
                Ingredientes, Estoque em Casa e Substituições Equivalentes
              </h3>
              {refeicaoDetalhe.ingredientes.map((ing) => (
                <div
                  key={ing.foodId}
                  className="bg-[#121212] border border-white/10 rounded-2xl p-4 space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-white">{ing.nome}</p>
                      <p className="text-xs text-[#B3B3B3]">
                        Medida: {ing.medidaCaseiraTexto} · {ing.kcal} kcal · P: {ing.proteinas}g ·
                        Custo aprox.: R$ {ing.custoEstimadoBRL.toFixed(2)}
                      </p>
                    </div>
                    <span className="text-xs text-[#FF65AD] shrink-0">
                      {ing.faltaComprarGramas === 0
                        ? `Em casa (${ing.disponivelEmCasaGramas}g)`
                        : `Falta ${ing.faltaComprarGramas}g`}
                    </span>
                  </div>

                  {ing.substituicoesPossiveis.length > 0 && (
                    <div className="pt-1 space-y-1.5">
                      <p className="text-[11px] text-[#B3B3B3]">
                        Substituir este ingrediente mantendo calorias equivalentes:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {ing.substituicoesPossiveis.map((sub) => (
                          <button
                            key={sub.foodId}
                            type="button"
                            onClick={() =>
                              onSubstituteIngredient(refeicaoDetalhe.id, ing.foodId, sub.foodId)
                            }
                            className="min-h-[38px] px-3 py-1.5 rounded-xl bg-[#1B1B1B] hover:bg-[#FF2D8D] border border-white/15 text-xs text-white transition-colors cursor-pointer"
                          >
                            Trocar por {sub.nome.split(' ')[0]} ({sub.quantidadeEquivalenteGramas}g · R${' '}
                            {sub.custoEstimadoBRL.toFixed(2)})
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Modo de Preparo */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-white">Modo de Preparo</h3>
              <ol className="space-y-1.5 text-xs text-[#B3B3B3] list-decimal list-inside bg-[#121212] p-4 rounded-2xl">
                {refeicaoDetalhe.modoPreparo.map((passo, idx) => (
                  <li key={idx}>{passo}</li>
                ))}
              </ol>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  onMarkMealConsumed(refeicaoDetalhe.id);
                  onSelectMealDetail(null);
                }}
                className="flex-1 min-h-[48px] px-4 py-3 rounded-xl bg-[#FF2D8D] hover:bg-[#FF65AD] text-white text-xs font-semibold cursor-pointer"
              >
                Marcar como Consumida e Registrar no Diário
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TELA 2: DIÁRIO ALIMENTAR */}
      {subTabAtiva === 'diario' && (
        <div className="space-y-5">
          <div className="bg-[#1B1B1B] border border-white/10 rounded-3xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="font-display text-xl font-bold text-white">
                  Diário Alimentar ({hojeISO})
                </h1>
                <p className="text-xs text-[#B3B3B3]">
                  Cálculo determinístico a partir das quantidades em gramas e da base TACO/TBCA.
                </p>
              </div>
              <button
                type="button"
                onClick={onRepeatYesterdayDiary}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-[#121212] hover:bg-white/10 border border-white/15 text-xs font-medium text-white cursor-pointer"
              >
                Importar refeições do plano de hoje
              </button>
            </div>

            {/* Comparativo Registrado vs Meta Estimada */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#121212] p-4 rounded-2xl">
              <div>
                <p className="text-[11px] text-[#B3B3B3]">Calorias Registradas</p>
                <p className="text-base font-bold font-mono-num text-white">
                  {totaisHoje.kcal} / {metasNutricionais.caloriasMetaKcal} kcal
                </p>
              </div>
              <div>
                <p className="text-[11px] text-[#B3B3B3]">Proteínas</p>
                <p className="text-base font-bold font-mono-num text-[#FF65AD]">
                  {totaisHoje.proteinas}g / {metasNutricionais.proteinasGramas}g
                </p>
              </div>
              <div>
                <p className="text-[11px] text-[#B3B3B3]">Carboidratos</p>
                <p className="text-base font-bold font-mono-num text-white">
                  {totaisHoje.carboidratos}g / {metasNutricionais.carboidratosGramas}g
                </p>
              </div>
              <div>
                <p className="text-[11px] text-[#B3B3B3]">Gorduras</p>
                <p className="text-base font-bold font-mono-num text-white">
                  {totaisHoje.gorduras}g / {metasNutricionais.gordurasGramas}g
                </p>
              </div>
            </div>

            {/* Formulário de Registro de Alimento */}
            <form onSubmit={handleRegistrarItemDiario} className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
              <div>
                <label htmlFor="diario-slot" className="block text-xs text-[#B3B3B3] mb-1">
                  Refeição
                </label>
                <select
                  id="diario-slot"
                  value={slotDiarioInput}
                  onChange={(e) => setSlotDiarioInput(e.target.value)}
                  className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-[#121212] border border-white/15 text-xs text-white"
                >
                  <option value="Café da Manhã">Café da Manhã</option>
                  <option value="Almoço">Almoço</option>
                  <option value="Lanche da Tarde">Lanche da Tarde</option>
                  <option value="Jantar">Jantar</option>
                  <option value="Ceia / Extra">Ceia / Extra</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="diario-alimento" className="block text-xs text-[#B3B3B3] mb-1">
                  Alimento (Base TACO/TBCA)
                </label>
                <select
                  id="diario-alimento"
                  value={alimentoSelecionadoDiario}
                  onChange={(e) => setAlimentoSelecionadoDiario(e.target.value)}
                  className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-[#121212] border border-white/15 text-xs text-white"
                >
                  {FOOD_DATABASE.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nome} ({f.kcalPor100g} kcal/100g)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label htmlFor="diario-gramas" className="block text-xs text-[#B3B3B3] mb-1">
                    Quantidade (g)
                  </label>
                  <input
                    id="diario-gramas"
                    type="number"
                    min={5}
                    max={2000}
                    value={gramasDiarioInput}
                    onChange={(e) => setGramasDiarioInput(e.target.value)}
                    className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-[#121212] border border-white/15 text-xs text-white font-mono-num"
                  />
                </div>
                <button
                  type="submit"
                  className="min-h-[44px] px-4 rounded-xl bg-[#FF2D8D] hover:bg-[#FF65AD] text-white text-xs font-semibold cursor-pointer"
                >
                  Adicionar
                </button>
              </div>
            </form>
          </div>

          {/* Lista de Registros do Dia */}
          <div className="bg-[#1B1B1B] border border-white/10 rounded-3xl p-5 space-y-3">
            <h2 className="text-sm font-semibold text-white">Itens Registrados Hoje</h2>
            {entradasHoje.length === 0 ? (
              <p className="text-xs text-[#B3B3B3] py-6 text-center">
                Nenhum alimento registrado hoje ainda. Adicione acima ou marque uma refeição do seu
                plano como consumida.
              </p>
            ) : (
              <div className="space-y-2">
                {entradasHoje.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between gap-3 bg-[#121212] px-4 py-3 rounded-2xl border border-white/5"
                  >
                    <div>
                      <p className="text-xs text-[#FF65AD]">{entry.slotRefeicao}</p>
                      <p className="text-sm font-semibold text-white">
                        {entry.nomeAlimento} ({entry.quantidadeGramas}g)
                      </p>
                      <p className="text-xs text-[#B3B3B3]">
                        {entry.kcal} kcal · P: {entry.proteinas}g · C: {entry.carboidratos}g · G:{' '}
                        {entry.gorduras}g · Fonte: {entry.fonteNutricional}
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label={`Remover ${entry.nomeAlimento} do diário`}
                      onClick={() => onRemoveDiaryEntry(entry.id)}
                      className="min-h-[40px] min-w-[40px] flex items-center justify-center text-[#B3B3B3] hover:text-[#FF2D8D] cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TELA 3: PESQUISA DE ALIMENTOS (BASE TACO / TBCA) */}
      {subTabAtiva === 'busca' && (
        <div className="space-y-4">
          <div className="bg-[#1B1B1B] border border-white/10 rounded-3xl p-5 space-y-4">
            <h1 className="font-display text-xl font-bold text-white">
              Pesquisa de Alimentos (Base TACO / TBCA)
            </h1>
            <div className="relative">
              <Search className="w-4 h-4 text-[#B3B3B3] absolute left-3.5 top-3.5" />
              <input
                type="search"
                aria-label="Pesquisar alimento na base nutricional"
                value={buscaQuery}
                onChange={(e) => setBuscaQuery(e.target.value)}
                placeholder="Buscar por nome (ex.: arroz, cuscuz, sardinha, ovo, aveia)..."
                className="w-full min-h-[44px] pl-10 pr-4 py-2 rounded-xl bg-[#121212] border border-white/15 text-sm text-white focus:outline-none focus:border-[#FF2D8D]"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {resultadosBusca.map((food) => (
                <div
                  key={food.id}
                  className="bg-[#121212] border border-white/10 rounded-2xl p-4 flex flex-col justify-between space-y-3"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="text-sm font-semibold text-white">{food.nome}</h2>
                      <span className="text-xs font-mono-num text-[#FF65AD] shrink-0">
                        {food.kcalPor100g} kcal/100g
                      </span>
                    </div>
                    <p className="text-xs text-[#B3B3B3] mt-1">
                      P: {food.proteinaPor100g}g · C: {food.carboidratoPor100g}g · G:{' '}
                      {food.gorduraPor100g}g · Fibras: {food.fibraPor100g}g
                    </p>
                    <p className="text-[11px] text-[#B3B3B3] mt-1">
                      Medida caseira: 1 {food.medidaCaseiraNome} ({food.gramasPorMedidaCaseira}g) ·
                      Fonte: {food.fonteNutricional}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => onAddFoodToPantry(food, 500)}
                      className="flex-1 min-h-[40px] px-3 py-1.5 rounded-xl bg-[#1B1B1B] hover:bg-white/10 border border-white/15 text-xs text-white cursor-pointer"
                    >
                      + Adicionar à Despensa (500g)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onAddDiaryEntry({
                          dataISO: hojeISO,
                          slotRefeicao: 'Refeição avulsa',
                          foodId: food.id,
                          nomeAlimento: food.nome,
                          quantidadeGramas: food.gramasPorMedidaCaseira,
                          kcal: Math.round(
                            (food.kcalPor100g * food.gramasPorMedidaCaseira) / 100
                          ),
                          proteinas: Number(
                            ((food.proteinaPor100g * food.gramasPorMedidaCaseira) / 100).toFixed(1)
                          ),
                          carboidratos: Number(
                            ((food.carboidratoPor100g * food.gramasPorMedidaCaseira) / 100).toFixed(1)
                          ),
                          gorduras: Number(
                            ((food.gorduraPor100g * food.gramasPorMedidaCaseira) / 100).toFixed(1)
                          ),
                          fibras: Number(
                            ((food.fibraPor100g * food.gramasPorMedidaCaseira) / 100).toFixed(1)
                          ),
                          fonteNutricional: food.fonteNutricional,
                          ehEstimativaManual: false,
                        });
                        onChangeSubTab('diario');
                      }}
                      className="min-h-[40px] px-3 py-1.5 rounded-xl bg-[#FF2D8D] text-xs font-semibold text-white cursor-pointer"
                    >
                      Registrar 1 porção
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TELA 4: CADASTRO DE RECEITAS PRÓPRIAS E COMBINAÇÕES FREQUENTES */}
      {subTabAtiva === 'receitas' && (
        <div className="space-y-5">
          <div className="bg-[#1B1B1B] border border-white/10 rounded-3xl p-5 space-y-4">
            <h1 className="font-display text-xl font-bold text-white">
              Criar Receita ou Combinação Frequente
            </h1>
            <form onSubmit={handleSalvarReceita} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label htmlFor="rec-nome" className="block text-xs text-[#B3B3B3] mb-1">
                    Nome da receita
                  </label>
                  <input
                    id="rec-nome"
                    type="text"
                    value={nomeReceita}
                    onChange={(e) => setNomeReceita(e.target.value)}
                    placeholder="Ex.: Omelete de Forno com Aveia"
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#121212] border border-white/15 text-sm text-white"
                  />
                </div>
                <div>
                  <label htmlFor="rec-tempo" className="block text-xs text-[#B3B3B3] mb-1">
                    Tempo de preparo (min)
                  </label>
                  <input
                    id="rec-tempo"
                    type="number"
                    min={1}
                    value={tempoReceita}
                    onChange={(e) => setTempoReceita(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#121212] border border-white/15 text-sm text-white font-mono-num"
                  />
                </div>
              </div>

              {/* Adicionar ingrediente na receita */}
              <div className="bg-[#121212] p-4 rounded-2xl space-y-3">
                <p className="text-xs font-medium text-white">Ingredientes da receita:</p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    aria-label="Selecionar ingrediente para receita"
                    value={ingReceitaFoodId}
                    onChange={(e) => setIngReceitaFoodId(e.target.value)}
                    className="flex-1 min-h-[44px] px-3 py-2 rounded-xl bg-[#1B1B1B] border border-white/15 text-xs text-white"
                  >
                    {FOOD_DATABASE.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.nome}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    aria-label="Gramas do ingrediente da receita"
                    value={ingReceitaGramas}
                    onChange={(e) => setIngReceitaGramas(e.target.value)}
                    className="w-full sm:w-28 min-h-[44px] px-3 py-2 rounded-xl bg-[#1B1B1B] border border-white/15 text-xs text-white font-mono-num"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const f = findFoodById(ingReceitaFoodId);
                      if (!f) return;
                      setIngredientesNovaReceita([
                        ...ingredientesNovaReceita,
                        {
                          foodId: f.id,
                          nome: f.nome,
                          quantidadeGramas: Math.max(5, Number(ingReceitaGramas) || 50),
                        },
                      ]);
                    }}
                    className="min-h-[44px] px-4 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white cursor-pointer"
                  >
                    + Incluir ingrediente
                  </button>
                </div>

                {ingredientesNovaReceita.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {ingredientesNovaReceita.map((ing, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 rounded-lg bg-[#1B1B1B] text-xs text-white"
                      >
                        {ing.nome.split(' ')[0]} ({ing.quantidadeGramas}g)
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="rec-preparo" className="block text-xs text-[#B3B3B3] mb-1">
                  Modo de preparo
                </label>
                <textarea
                  id="rec-preparo"
                  rows={2}
                  value={preparoReceita}
                  onChange={(e) => setPreparoReceita(e.target.value)}
                  placeholder="Descreva os passos rápidos de preparo..."
                  className="w-full p-3 rounded-xl bg-[#121212] border border-white/15 text-xs text-white"
                />
              </div>

              <button
                type="submit"
                className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#FF2D8D] hover:bg-[#FF65AD] text-xs font-semibold text-white cursor-pointer"
              >
                Salvar Receita Calculada
              </button>
            </form>
          </div>

          {/* Lista de Receitas Salvas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {receitasPersonalizadas.map((rec) => (
              <div
                key={rec.id}
                className="bg-[#1B1B1B] border border-white/10 rounded-3xl p-5 flex flex-col justify-between space-y-3"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <h2 className="font-display text-base font-bold text-white">{rec.nome}</h2>
                    <span className="text-xs font-mono-num text-[#FF65AD]">
                      {rec.totais.kcal} kcal
                    </span>
                  </div>
                  <p className="text-xs text-[#B3B3B3]">
                    P: {rec.totais.proteinas}g · C: {rec.totais.carboidratos}g · G:{' '}
                    {rec.totais.gorduras}g · <Clock className="w-3 h-3 inline" /> {rec.tempoPreparoMin} min
                  </p>
                  <p className="text-xs text-[#B3B3B3]">{rec.modoPreparo}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onLogRecipeToDiary(rec, 'Lanche / Receita');
                    onChangeSubTab('diario');
                  }}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-[#121212] hover:bg-[#FF2D8D] border border-white/15 text-xs font-semibold text-white transition-colors cursor-pointer"
                >
                  Registrar no Diário de Hoje
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TELA 5: LISTA DE COMPRAS INTELIGENTE (3, 7 OU 14 DIAS) */}
      {subTabAtiva === 'compras' && (
        <div className="space-y-5">
          <div className="bg-[#1B1B1B] border border-white/10 rounded-3xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="font-display text-xl font-bold text-white">
                  Lista de Compras Inteligente
                </h1>
                <p className="text-xs text-[#B3B3B3]">
                  Agrupa ingredientes do seu plano e desconta automaticamente o que já existe na sua despensa.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {([3, 7, 14] as const).map((dias) => (
                  <button
                    key={dias}
                    type="button"
                    onClick={() => onChangeShoppingPeriod(dias)}
                    className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold border cursor-pointer ${
                      listaCompras.periodoDias === dias
                        ? 'bg-[#FF2D8D] border-[#FF2D8D] text-white'
                        : 'bg-[#121212] border-white/15 text-[#B3B3B3]'
                    }`}
                  >
                    {dias} dias
                  </button>
                ))}

                <button
                  type="button"
                  onClick={handleCopiarListaCompras}
                  className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#121212] hover:bg-white/10 border border-white/15 text-xs font-medium text-white flex items-center gap-1.5 cursor-pointer"
                >
                  {copiadoSucesso ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copiadoSucesso ? 'Copiada!' : 'Compartilhar'}</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#121212] p-4 rounded-2xl">
              <div>
                <p className="text-[11px] text-[#B3B3B3]">Custo Total Faltante ({listaCompras.periodoDias}d)</p>
                <p className="text-lg font-bold font-mono-num text-white">
                  R$ {listaCompras.custoTotalFaltanteEstimadoBRL.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-[#B3B3B3]">Apenas Itens Essenciais</p>
                <p className="text-lg font-bold font-mono-num text-[#FF65AD]">
                  R$ {listaCompras.custoItensEssenciaisBRL.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-[#B3B3B3]">Economia com Substituições</p>
                <p className="text-lg font-bold font-mono-num text-emerald-400">
                  R$ {listaCompras.economiaPotencialSubstituicoesBRL.toFixed(2)}
                </p>
              </div>
            </div>

            <p className="text-[11px] text-[#B3B3B3]">{listaCompras.avisoPreciosEstimados}</p>
          </div>

          <div className="space-y-3">
            {listaCompras.itens.map((item) => (
              <div
                key={item.id}
                className={`bg-[#1B1B1B] border rounded-2xl p-4 space-y-3 transition-opacity ${
                  item.comprado ? 'border-white/5 opacity-60' : 'border-white/10'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      aria-label={`Marcar ${item.nome} como comprado`}
                      onClick={() => onToggleShoppingItemPurchased(item.id)}
                      className={`min-h-[44px] min-w-[44px] rounded-xl border flex items-center justify-center shrink-0 cursor-pointer ${
                        item.comprado
                          ? 'bg-[#FF2D8D] border-[#FF2D8D] text-white'
                          : 'bg-[#121212] border-white/20 text-transparent'
                      }`}
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <div>
                      <p className="text-sm font-semibold text-white">{item.nome}</p>
                      <p className="text-xs text-[#B3B3B3]">
                        Prioridade: {item.prioridade === 'essencial' ? 'Essencial' : 'Complementar'}
                        {' · '}
                        Necessário ({listaCompras.periodoDias}d): {item.quantidadeNecessariaGramas}g
                        {' · '}
                        Em casa: {item.quantidadeEmCasaGramas}g
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <div className="text-right">
                      <label htmlFor={`qtd-${item.id}`} className="block text-[10px] text-[#B3B3B3]">
                        Falta comprar (g)
                      </label>
                      <input
                        id={`qtd-${item.id}`}
                        type="number"
                        min={0}
                        step={50}
                        value={item.quantidadeFaltanteGramas}
                        onChange={(e) =>
                          onUpdateShoppingItemQuantityOrPrice(
                            item.id,
                            Math.max(0, Number(e.target.value))
                          )
                        }
                        className="w-24 min-h-[38px] px-2 rounded-lg bg-[#121212] border border-white/15 text-xs text-white text-right font-mono-num"
                      />
                    </div>
                    <div className="text-right min-w-[80px]">
                      <p className="text-[10px] text-[#B3B3B3]">Custo est.</p>
                      <p className="text-sm font-bold font-mono-num text-[#FF65AD]">
                        R$ {item.custoEstimadoFaltanteBRL.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>

                {item.substituicaoMaisBarata && !item.comprado && (
                  <div className="flex items-center justify-between gap-2 bg-[#121212] px-3.5 py-2.5 rounded-xl border border-white/5 text-xs">
                    <span className="text-[#B3B3B3]">
                      Opção mais econômica: <strong className="text-white">{item.substituicaoMaisBarata.nome}</strong> (economiza ~R${' '}
                      {item.substituicaoMaisBarata.economiaBRL.toFixed(2)})
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        onApplyCheaperSubstitutionInPlan(
                          item.foodId,
                          item.substituicaoMaisBarata!.foodId
                        )
                      }
                      className="min-h-[36px] px-3 py-1 rounded-lg bg-[#FF2D8D] text-white font-semibold shrink-0 cursor-pointer"
                    >
                      Substituir no plano
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
