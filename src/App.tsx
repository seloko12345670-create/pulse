/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  AssistantActionProposal,
  AssistantMessage,
  BodyMeasurementEntry,
  CustomRecipe,
  FoodDiaryEntry,
  FoodItem,
  PlannedMeal,
  PulseDatabaseState,
  UserProfile,
  WorkoutDay,
  WorkoutSessionLog,
} from './domain/types';
import {
  clearAllPersonalData,
  loadDatabaseState,
  saveDatabaseState,
} from './domain/storage';
import { calculateNutritionTargets } from './domain/nutritionCalculator';
import {
  generateDietPlan,
  generateShoppingList,
  substituteIngredientInPlan,
  swapMealInPlan,
} from './domain/dietGenerator';
import { generateWorkoutPlan, swapExerciseInWorkoutDay } from './domain/workoutGenerator';
import { executeAssistantAction } from './domain/assistantEngine';
import { PulseLogo } from './components/PulseLogo';
import { OnboardingFlow } from './components/OnboardingFlow';
import { DashboardView } from './components/DashboardView';
import { DietModuleView } from './components/DietModuleView';
import { WorkoutModuleView } from './components/WorkoutModuleView';
import { EvolutionModuleView } from './components/EvolutionModuleView';
import { ProfileSettingsView } from './components/ProfileSettingsView';
import { PulseAiModal } from './components/PulseAiModal';
import {
  Activity,
  Dumbbell,
  Home,
  MessageSquareHeart,
  User,
  Utensils,
  WifiOff,
} from 'lucide-react';

type MainTab = 'inicio' | 'dieta' | 'treino' | 'evolucao' | 'perfil';
type DietSubTab = 'plano' | 'diario' | 'busca' | 'receitas' | 'compras';

export default function App() {
  const [estado, setEstado] = useState<PulseDatabaseState>(() => loadDatabaseState());
  const [abaAtiva, setAbaAtiva] = useState<MainTab>('inicio');
  const [subTabDieta, setSubTabDieta] = useState<DietSubTab>('plano');
  const [refeicaoDetalhe, setRefeicaoDetalhe] = useState<PlannedMeal | null>(null);
  const [treinoAtivoDia, setTreinoAtivoDia] = useState<WorkoutDay | null>(null);
  const [pulseAiAberto, setPulseAiAberto] = useState<boolean>(false);
  const [isOffline, setIsOffline] = useState<boolean>(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );

  // Salva automaticamente qualquer alteração no banco de dados persistente local
  useEffect(() => {
    saveDatabaseState(estado);
  }, [estado]);

  // Monitora conectividade para funcionamento offline transparente
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sincroniza refeicaoDetalhe quando o plano alimentar é recalculado
  useEffect(() => {
    if (!refeicaoDetalhe) return;
    const atualizada = estado.planoAlimentar.refeicoes.find((r) => r.id === refeicaoDetalhe.id);
    if (atualizada) setRefeicaoDetalhe(atualizada);
  }, [estado.planoAlimentar]);

  const recalcularTudoComPerfil = (novoPerfil: UserProfile, concluirOnboarding = true) => {
    const novasMetas = calculateNutritionTargets(novoPerfil);
    const novoPlanoAlimentar = generateDietPlan(novoPerfil, novasMetas);
    const novaListaCompras = generateShoppingList(
      novoPlanoAlimentar,
      novoPerfil,
      estado.listaCompras.periodoDias
    );
    const novoPlanoTreino = generateWorkoutPlan(novoPerfil);

    setEstado((prev) => ({
      ...prev,
      onboardingConcluido: concluirOnboarding,
      perfil: novoPerfil,
      metasNutricionais: novasMetas,
      planoAlimentar: novoPlanoAlimentar,
      listaCompras: novaListaCompras,
      planoTreino: novoPlanoTreino,
      historicoAlteracoes: [
        {
          id: `audit_${Date.now()}`,
          dataISO: new Date().toISOString(),
          modulo: 'Perfil e Metas',
          descricao: `Plano recalculado (${novasMetas.caloriasMetaKcal} kcal/dia · ${novoPlanoTreino.frequenciaSemanal} treinos/sem).`,
        },
        ...prev.historicoAlteracoes,
      ],
    }));
  };

  // Se ainda estiver no Onboarding Inicial
  if (!estado.onboardingConcluido) {
    return (
      <OnboardingFlow
        perfil={estado.perfil}
        etapaInicial={estado.etapaOnboardingAtual}
        onUpdateProfile={(novoPerfil, etapaAtual) => {
          setEstado((prev) => ({
            ...prev,
            perfil: novoPerfil,
            etapaOnboardingAtual: etapaAtual,
          }));
        }}
        onCompleteOnboarding={(perfilFinal) => {
          recalcularTudoComPerfil(perfilFinal, true);
        }}
        onQuickDemoStart={() => {
          recalcularTudoComPerfil(estado.perfil, true);
        }}
      />
    );
  }

  // Handlers de Nutrição e Dieta
  const handleToggleEconomyMode = () => {
    const novoModo = !estado.planoAlimentar.modoEconomico;
    const novoPerfil = { ...estado.perfil, modoEconomicoAtivo: novoModo };
    const novoPlano = generateDietPlan(novoPerfil, estado.metasNutricionais);
    const novaLista = generateShoppingList(
      novoPlano,
      novoPerfil,
      estado.listaCompras.periodoDias
    );
    setEstado((prev) => ({
      ...prev,
      perfil: novoPerfil,
      planoAlimentar: { ...novoPlano, modoEconomico: novoModo },
      listaCompras: novaLista,
    }));
  };

  const handleSwapMeal = (mealId: string, alternativeId: string) => {
    const novoPlano = swapMealInPlan(
      estado.planoAlimentar,
      mealId,
      alternativeId,
      estado.perfil,
      estado.metasNutricionais
    );
    const novaLista = generateShoppingList(
      novoPlano,
      estado.perfil,
      estado.listaCompras.periodoDias
    );
    setEstado((prev) => ({
      ...prev,
      planoAlimentar: novoPlano,
      listaCompras: novaLista,
    }));
  };

  const handleSubstituteIngredient = (mealId: string, oldFoodId: string, newFoodId: string) => {
    const novoPlano = substituteIngredientInPlan(
      estado.planoAlimentar,
      mealId,
      oldFoodId,
      newFoodId,
      estado.perfil,
      estado.metasNutricionais
    );
    const novaLista = generateShoppingList(
      novoPlano,
      estado.perfil,
      estado.listaCompras.periodoDias
    );
    setEstado((prev) => ({
      ...prev,
      planoAlimentar: novoPlano,
      listaCompras: novaLista,
    }));
  };

  const handleMarkMealConsumed = (mealId: string) => {
    const refeicao = estado.planoAlimentar.refeicoes.find((r) => r.id === mealId);
    if (!refeicao) return;
    const hojeISO = new Date().toISOString().slice(0, 10);

    const novasEntradasDiario: FoodDiaryEntry[] = refeicao.ingredientes.map((ing, i) => ({
      id: `diary_${Date.now()}_${i}`,
      dataISO: hojeISO,
      slotRefeicao: refeicao.tituloSlot,
      foodId: ing.foodId,
      nomeAlimento: ing.nome,
      quantidadeGramas: ing.quantidadeGramas,
      kcal: ing.kcal,
      proteinas: ing.proteinas,
      carboidratos: ing.carboidratos,
      gorduras: ing.gorduras,
      fibras: ing.fibras,
      fonteNutricional: 'TACO 4ª Ed. (UNICAMP)',
      ehEstimativaManual: false,
    }));

    setEstado((prev) => ({
      ...prev,
      planoAlimentar: {
        ...prev.planoAlimentar,
        refeicoes: prev.planoAlimentar.refeicoes.map((r) =>
          r.id === mealId ? { ...r, consumidaHoje: true } : r
        ),
      },
      diarioAlimentar: [...novasEntradasDiario, ...prev.diarioAlimentar],
      sequenciaHabitosDias: prev.sequenciaHabitosDias + (refeicao.consumidaHoje ? 0 : 1),
    }));
  };

  const handleAddDiaryEntry = (entry: Omit<FoodDiaryEntry, 'id'>) => {
    setEstado((prev) => ({
      ...prev,
      diarioAlimentar: [{ ...entry, id: `diary_${Date.now()}` }, ...prev.diarioAlimentar],
    }));
  };

  const handleRemoveDiaryEntry = (entryId: string) => {
    setEstado((prev) => ({
      ...prev,
      diarioAlimentar: prev.diarioAlimentar.filter((e) => e.id !== entryId),
    }));
  };

  const handleRepeatYesterdayDiary = () => {
    const hojeISO = new Date().toISOString().slice(0, 10);
    const entradasDoPlano: FoodDiaryEntry[] = estado.planoAlimentar.refeicoes.flatMap((ref, rIdx) =>
      ref.ingredientes.map((ing, iIdx) => ({
        id: `diary_imp_${Date.now()}_${rIdx}_${iIdx}`,
        dataISO: hojeISO,
        slotRefeicao: ref.tituloSlot,
        foodId: ing.foodId,
        nomeAlimento: ing.nome,
        quantidadeGramas: ing.quantidadeGramas,
        kcal: ing.kcal,
        proteinas: ing.proteinas,
        carboidratos: ing.carboidratos,
        gorduras: ing.gorduras,
        fibras: ing.fibras,
        fonteNutricional: 'TACO 4ª Ed. (UNICAMP)',
        ehEstimativaManual: false,
      }))
    );
    setEstado((prev) => ({
      ...prev,
      diarioAlimentar: [...entradasDoPlano, ...prev.diarioAlimentar],
    }));
  };

  const handleAddCustomRecipe = (recipe: CustomRecipe) => {
    setEstado((prev) => ({
      ...prev,
      receitasPersonalizadas: [recipe, ...prev.receitasPersonalizadas],
    }));
  };

  const handleLogRecipeToDiary = (recipe: CustomRecipe, slotRefeicao: string) => {
    const hojeISO = new Date().toISOString().slice(0, 10);
    const entry: FoodDiaryEntry = {
      id: `diary_rec_${Date.now()}`,
      dataISO: hojeISO,
      slotRefeicao,
      foodId: recipe.id,
      nomeAlimento: `Receita: ${recipe.nome}`,
      quantidadeGramas: recipe.ingredientes.reduce((a, b) => a + b.quantidadeGramas, 0),
      kcal: recipe.totais.kcal,
      proteinas: recipe.totais.proteinas,
      carboidratos: recipe.totais.carboidratos,
      gorduras: recipe.totais.gorduras,
      fibras: recipe.totais.fibras,
      fonteNutricional: 'Receita Calculada TACO/TBCA',
      ehEstimativaManual: false,
    };
    setEstado((prev) => ({
      ...prev,
      diarioAlimentar: [entry, ...prev.diarioAlimentar],
    }));
  };

  const handleChangeShoppingPeriod = (dias: 3 | 7 | 14) => {
    const novaLista = generateShoppingList(
      estado.planoAlimentar,
      estado.perfil,
      dias,
      estado.listaCompras
    );
    setEstado((prev) => ({ ...prev, listaCompras: novaLista }));
  };

  const handleToggleShoppingItemPurchased = (itemId: string) => {
    setEstado((prev) => {
      const novosItens = prev.listaCompras.itens.map((i) =>
        i.id === itemId ? { ...i, comprado: !i.comprado } : i
      );
      const custoTotalFaltanteEstimadoBRL = Number(
        novosItens
          .filter((i) => !i.comprado)
          .reduce((acc, i) => acc + i.custoEstimadoFaltanteBRL, 0)
          .toFixed(2)
      );
      return {
        ...prev,
        listaCompras: {
          ...prev.listaCompras,
          itens: novosItens,
          custoTotalFaltanteEstimadoBRL,
        },
      };
    });
  };

  const handleUpdateShoppingItemQuantityOrPrice = (
    itemId: string,
    novaQtdGramas?: number
  ) => {
    setEstado((prev) => {
      const novosItens = prev.listaCompras.itens.map((item) => {
        if (item.id !== itemId) return item;
        const qtd = novaQtdGramas !== undefined ? novaQtdGramas : item.quantidadeFaltanteGramas;
        const precoPorGrama =
          item.quantidadeFaltanteGramas > 0
            ? item.custoEstimadoFaltanteBRL / item.quantidadeFaltanteGramas
            : 0.015;
        const novoCusto = Number((qtd * precoPorGrama).toFixed(2));
        return {
          ...item,
          quantidadeFaltanteGramas: qtd,
          quantidadeEditadaGramas: qtd,
          custoEstimadoFaltanteBRL: novoCusto,
        };
      });
      const custoTotalFaltanteEstimadoBRL = Number(
        novosItens
          .filter((i) => !i.comprado)
          .reduce((acc, i) => acc + i.custoEstimadoFaltanteBRL, 0)
          .toFixed(2)
      );
      return {
        ...prev,
        listaCompras: {
          ...prev.listaCompras,
          itens: novosItens,
          custoTotalFaltanteEstimadoBRL,
        },
      };
    });
  };

  const handleApplyCheaperSubstitutionInPlan = (oldFoodId: string, newFoodId: string) => {
    let planoTemp = estado.planoAlimentar;
    for (const ref of planoTemp.refeicoes) {
      if (ref.ingredientes.some((i) => i.foodId === oldFoodId)) {
        planoTemp = substituteIngredientInPlan(
          planoTemp,
          ref.id,
          oldFoodId,
          newFoodId,
          estado.perfil,
          estado.metasNutricionais
        );
      }
    }
    const novaLista = generateShoppingList(
      planoTemp,
      estado.perfil,
      estado.listaCompras.periodoDias
    );
    setEstado((prev) => ({
      ...prev,
      planoAlimentar: planoTemp,
      listaCompras: novaLista,
    }));
  };

  const handleAddFoodToPantry = (food: FoodItem, gramas: number) => {
    const existe = estado.perfil.despensa.find((d) => d.foodId === food.id);
    const novaDespensa = existe
      ? estado.perfil.despensa.map((d) =>
          d.foodId === food.id ? { ...d, quantidadeGramas: d.quantidadeGramas + gramas } : d
        )
      : [
          ...estado.perfil.despensa,
          {
            id: `p_${food.id}_${Date.now()}`,
            foodId: food.id,
            nome: food.nome,
            quantidadeGramas: gramas,
            medidaAproximada: `${gramas}g em casa`,
            jaComprado: true,
          },
        ];

    const novoPerfil = { ...estado.perfil, despensa: novaDespensa };
    recalcularTudoComPerfil(novoPerfil, true);
  };

  // Handlers de Treino e Evolução
  const handleSwapExerciseInDay = (workoutDayId: string, oldExId: string, newExId: string) => {
    const novoPlanoTreino = swapExerciseInWorkoutDay(
      estado.planoTreino,
      workoutDayId,
      oldExId,
      newExId,
      estado.perfil
    );
    setEstado((prev) => ({
      ...prev,
      planoTreino: novoPlanoTreino,
    }));
    if (treinoAtivoDia && treinoAtivoDia.id === workoutDayId) {
      const diaAtualizado = novoPlanoTreino.dias.find((d) => d.id === workoutDayId) ?? null;
      setTreinoAtivoDia(diaAtualizado);
    }
  };

  const handleCompleteWorkoutSession = (log: Omit<WorkoutSessionLog, 'id'>) => {
    setEstado((prev) => ({
      ...prev,
      historicoTreinos: [{ ...log, id: `wlog_${Date.now()}` }, ...prev.historicoTreinos],
      sequenciaHabitosDias: prev.sequenciaHabitosDias + 1,
    }));
  };

  const handleAddMeasurement = (entry: Omit<BodyMeasurementEntry, 'id'>) => {
    setEstado((prev) => ({
      ...prev,
      perfil: { ...prev.perfil, pesoAtualKg: entry.pesoKg },
      historicoMedidas: [{ ...entry, id: `med_${Date.now()}` }, ...prev.historicoMedidas],
    }));
  };

  const handleDeleteMeasurement = (id: string) => {
    setEstado((prev) => ({
      ...prev,
      historicoMedidas: prev.historicoMedidas.filter((m) => m.id !== id),
    }));
  };

  const navItems: { id: MainTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'inicio', label: 'Início', icon: Home },
    { id: 'dieta', label: 'Dieta', icon: Utensils },
    { id: 'treino', label: 'Treino', icon: Dumbbell },
    { id: 'evolucao', label: 'Evolução', icon: Activity },
    { id: 'perfil', label: 'Perfil', icon: User },
  ];

  return (
    <div className="min-h-screen bg-[#080808] text-white flex flex-col">
      {/* Top Bar seguindo o contrato de 3 zonas */}
      <header className="sticky top-0 z-30 h-14 bg-[#080808]/90 backdrop-blur-md border-b border-white/10 px-4 sm:px-8 flex items-center justify-between gap-8">
        {/* Zona 1: Brand Wordmark */}
        <a
          href="#inicio"
          onClick={(e) => {
            e.preventDefault();
            setAbaAtiva('inicio');
          }}
          className="whitespace-nowrap shrink-0"
        >
          <PulseLogo size="sm" />
        </a>

        {/* Zona 2: Links de navegação em telas médias/grandes */}
        <nav
          aria-label="Navegação principal desktop"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-[#B3B3B3]"
        >
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setAbaAtiva(item.id)}
              className={`py-1 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                abaAtiva === item.id
                  ? 'text-white border-b-2 border-[#FF2D8D]'
                  : 'hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Zona 3: 1 Ação Primária (Atalho visível para PULSE AI) */}
        <div className="flex items-center gap-3 shrink-0">
          {isOffline && (
            <span className="text-xs text-[#FF65AD] hidden sm:inline-flex items-center gap-1">
              <WifiOff className="w-3.5 h-3.5" />
              Modo Offline
            </span>
          )}
          <button
            type="button"
            onClick={() => setPulseAiAberto(true)}
            className="min-h-[40px] px-4 py-2 rounded-xl bg-[#FF2D8D] hover:bg-[#FF65AD] text-white text-xs font-semibold flex items-center gap-2 whitespace-nowrap shrink-0 transition-colors cursor-pointer"
          >
            <MessageSquareHeart className="w-4 h-4" />
            <span>PULSE AI</span>
          </button>
        </div>
      </header>

      {/* Conteúdo Principal Responsivo */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-8 pt-5 pb-20 md:pb-10">
        {abaAtiva === 'inicio' && (
          <DashboardView
            estado={estado}
            onNavigateTab={setAbaAtiva}
            onOpenDietSubTab={setSubTabDieta}
            onOpenMealDetail={(meal) => {
              setAbaAtiva('dieta');
              setSubTabDieta('plano');
              setRefeicaoDetalhe(meal);
            }}
            onMarkMealConsumed={handleMarkMealConsumed}
            onStartActiveWorkout={(day) => {
              setAbaAtiva('treino');
              setTreinoAtivoDia(day);
            }}
            onOpenPulseAi={() => setPulseAiAberto(true)}
          />
        )}

        {abaAtiva === 'dieta' && (
          <DietModuleView
            estado={estado}
            subTabAtiva={subTabDieta}
            onChangeSubTab={setSubTabDieta}
            refeicaoDetalhe={refeicaoDetalhe}
            onSelectMealDetail={setRefeicaoDetalhe}
            onToggleEconomyMode={handleToggleEconomyMode}
            onSwapMeal={handleSwapMeal}
            onSubstituteIngredient={handleSubstituteIngredient}
            onMarkMealConsumed={handleMarkMealConsumed}
            onAddDiaryEntry={handleAddDiaryEntry}
            onRemoveDiaryEntry={handleRemoveDiaryEntry}
            onRepeatYesterdayDiary={handleRepeatYesterdayDiary}
            onAddCustomRecipe={handleAddCustomRecipe}
            onLogRecipeToDiary={handleLogRecipeToDiary}
            onChangeShoppingPeriod={handleChangeShoppingPeriod}
            onToggleShoppingItemPurchased={handleToggleShoppingItemPurchased}
            onUpdateShoppingItemQuantityOrPrice={handleUpdateShoppingItemQuantityOrPrice}
            onApplyCheaperSubstitutionInPlan={handleApplyCheaperSubstitutionInPlan}
            onAddFoodToPantry={handleAddFoodToPantry}
          />
        )}

        {abaAtiva === 'treino' && (
          <WorkoutModuleView
            estado={estado}
            treinoAtivoDia={treinoAtivoDia}
            onStartActiveWorkout={setTreinoAtivoDia}
            onSwapExerciseInDay={handleSwapExerciseInDay}
            onCompleteWorkoutSession={handleCompleteWorkoutSession}
          />
        )}

        {abaAtiva === 'evolucao' && (
          <EvolutionModuleView
            estado={estado}
            onAddMeasurement={handleAddMeasurement}
            onDeleteMeasurement={handleDeleteMeasurement}
          />
        )}

        {abaAtiva === 'perfil' && (
          <ProfileSettingsView
            estado={estado}
            onReopenOnboardingToEdit={(step = 1) => {
              setEstado((prev) => ({
                ...prev,
                onboardingConcluido: false,
                etapaOnboardingAtual: step,
              }));
            }}
            onQuickRecalculateAll={(novoPerfil) => recalcularTudoComPerfil(novoPerfil, true)}
            onResetAllPersonalData={() => {
              const limpo = clearAllPersonalData();
              setEstado(limpo);
            }}
          />
        )}
      </main>

      {/* Barra de Navegação Inferior Mobile (5 Abas Obrigatórias: Início, Dieta, Treino, Evolução, Perfil) */}
      <nav
        aria-label="Navegação inferior mobile"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-[#121212]/95 backdrop-blur-md border-t border-white/10 grid grid-cols-5 items-center px-1"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const ativo = abaAtiva === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setAbaAtiva(item.id)}
              className={`min-h-[48px] flex flex-col items-center justify-center transition-colors cursor-pointer ${
                ativo ? 'text-[#FF2D8D]' : 'text-[#B3B3B3] hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium tracking-tight mt-1 whitespace-nowrap">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Modal / Tela do Assistente Conversacional PULSE AI */}
      <PulseAiModal
        aberto={pulseAiAberto}
        onClose={() => setPulseAiAberto(false)}
        estado={estado}
        onAddAssistantMessages={(msgs: AssistantMessage[]) => {
          setEstado((prev) => ({
            ...prev,
            mensagensAssistente: [...prev.mensagensAssistente, ...msgs],
          }));
        }}
        onConfirmActionProposal={(proposta: AssistantActionProposal) => {
          setEstado((prev) => executeAssistantAction(prev, proposta));
        }}
      />
    </div>
  );
}
