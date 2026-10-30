import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateNutritionTargets,
  validateUserProfile,
} from './nutritionCalculator';
import {
  calculateDiaryTotals,
  generateDietPlan,
  generateShoppingList,
  isFoodAllowedForProfile,
  substituteIngredientInPlan,
  swapMealInPlan,
} from './dietGenerator';
import { generateWorkoutPlan, swapExerciseInWorkoutDay } from './workoutGenerator';
import {
  buildInitialDatabaseState,
  createDefaultUserProfile,
  migrateDatabaseState,
} from './storage';
import {
  executeAssistantAction,
  generateLocalAssistantResponse,
} from './assistantEngine';
import { FOOD_DATABASE, findFoodById } from './foodDatabase';

test('1. Validação de entradas extremas e dados incompletos no onboarding', () => {
  const invalidoIdade = validateUserProfile({
    idade: 5,
    alturaCm: 170,
    pesoAtualKg: 70,
    orcamentoValor: 300,
    refeicoesPorDia: 4,
  });
  assert.equal(invalidoIdade.valido, false);
  assert.ok(invalidoIdade.erros.some((e) => e.includes('idade')));

  const invalidoPeso = validateUserProfile({
    idade: 25,
    alturaCm: 170,
    pesoAtualKg: -10,
    orcamentoValor: 300,
    refeicoesPorDia: 4,
  });
  assert.equal(invalidoPeso.valido, false);

  const valido = validateUserProfile(createDefaultUserProfile());
  assert.equal(valido.valido, true);
  assert.equal(valido.erros.length, 0);
});

test('2. Cálculo energético (BMR/TDEE) e respeito à opção de não informar variável fisiológica', () => {
  const perfilBase = createDefaultUserProfile();

  const metasNeutras = calculateNutritionTargets({
    ...perfilBase,
    variavelFisiologica: 'prefiro_nao_informar',
  });
  assert.ok(metasNeutras.bmrEstimadoKcal > 1200);
  assert.equal(metasNeutras.bmrIncertezaKcal, 120);
  assert.ok(metasNeutras.formulaUsada.includes('estimativa neutra'));

  const metasMasc = calculateNutritionTargets({
    ...perfilBase,
    variavelFisiologica: 'masculino',
  });
  const metasFem = calculateNutritionTargets({
    ...perfilBase,
    variavelFisiologica: 'feminino',
  });
  assert.ok(metasMasc.bmrEstimadoKcal > metasFem.bmrEstimadoKcal);
});

test('3. Proteção clínica para menores de idade, gestantes e histórico de transtorno alimentar', () => {
  const perfilMenor = {
    ...createDefaultUserProfile(),
    idade: 16,
    objetivoPrincipal: 'emagrecer' as const,
  };
  const metasMenor = calculateNutritionTargets(perfilMenor);
  assert.equal(metasMenor.modoSeguroEducativo, true);
  // Não deve aplicar déficit restritivo abaixo do gasto energético diário estimado
  assert.ok(metasMenor.caloriasMetaKcal >= metasMenor.tdeeEstimadoKcal * 0.98);
});

test('4. Consistência matemática entre calorias e macronutrientes', () => {
  const perfil = createDefaultUserProfile();
  const metas = calculateNutritionTargets(perfil);
  const kcalDosMacros =
    metas.proteinasGramas * 4 + metas.carboidratosGramas * 4 + metas.gordurasGramas * 9;
  assert.equal(kcalDosMacros, metas.caloriasMetaKcal);
  assert.ok(metas.fibrasGramas >= 22);
  assert.ok(metas.hidratacaoLitrosReferencia >= 1.5);
});

test('5. Respeito rigoroso a alergias, restrições e alimentos que o usuário não gosta', () => {
  const perfilRestrito = {
    ...createDefaultUserProfile(),
    padraoAlimentar: 'vegetariano' as const,
    alergiasRestricoes: ['lactose_leite' as const],
    alimentosNaoCome: ['banana'],
  };
  const frango = findFoodById('frango_peito_grelhado')!;
  const leite = findFoodById('leite_integral')!;
  const banana = findFoodById('banana_prata')!;
  const ovo = findFoodById('ovo_galinha_cozido')!;

  assert.equal(isFoodAllowedForProfile(frango, perfilRestrito), false);
  assert.equal(isFoodAllowedForProfile(leite, perfilRestrito), false);
  assert.equal(isFoodAllowedForProfile(banana, perfilRestrito), false);
  assert.equal(isFoodAllowedForProfile(ovo, perfilRestrito), true);

  const metas = calculateNutritionTargets(perfilRestrito);
  const plano = generateDietPlan(perfilRestrito, metas);
  for (const ref of plano.refeicoes) {
    for (const ing of ref.ingredientes) {
      assert.notEqual(ing.foodId, 'frango_peito_grelhado');
      assert.notEqual(ing.foodId, 'leite_integral');
      assert.notEqual(ing.foodId, 'banana_prata');
    }
  }
});

test('6. Cenário real de orçamento limitado: arroz, feijão, ovos, banana e aveia para ganho muscular', () => {
  const perfilEconomico = {
    ...createDefaultUserProfile(),
    objetivoPrincipal: 'ganhar_massa' as const,
    orcamentoValor: 10,
    orcamentoPeriodo: 'dia' as const,
    modoEconomicoAtivo: true,
    despensa: [
      { id: '1', foodId: 'arroz_branco_cozido', nome: 'Arroz', quantidadeGramas: 1000, medidaAproximada: '1kg', jaComprado: true },
      { id: '2', foodId: 'feijao_carioca_cozido', nome: 'Feijão', quantidadeGramas: 1000, medidaAproximada: '1kg', jaComprado: true },
      { id: '3', foodId: 'ovo_galinha_cozido', nome: 'Ovos', quantidadeGramas: 800, medidaAproximada: '16 un', jaComprado: true },
      { id: '4', foodId: 'banana_prata', nome: 'Banana', quantidadeGramas: 600, medidaAproximada: '8 un', jaComprado: true },
      { id: '5', foodId: 'aveia_flocos', nome: 'Aveia', quantidadeGramas: 400, medidaAproximada: '400g', jaComprado: true },
    ],
  };

  const metas = calculateNutritionTargets(perfilEconomico);
  const plano = generateDietPlan(perfilEconomico, metas);

  assert.equal(plano.modoEconomico, true);
  assert.ok(plano.refeicoes.length === 4);
  // Verifica que ingredientes da despensa foram priorizados e marcados como disponíveis em casa
  const totalEmCasaUsado = plano.refeicoes.reduce(
    (acc, r) => acc + r.ingredientes.reduce((s, i) => s + i.disponivelEmCasaGramas, 0),
    0
  );
  assert.ok(totalEmCasaUsado > 400);
});

test('7. Substituição de ingredientes, troca de refeição e recálculo determinístico', () => {
  const estado = buildInitialDatabaseState(true);
  const primeiraRefeicao = estado.planoAlimentar.refeicoes[0];
  const primeiroIng = primeiraRefeicao.ingredientes[0];
  const sub = primeiroIng.substituicoesPossiveis[0];
  assert.ok(sub, 'Deve existir substituição compatível');

  const planoSubstituido = substituteIngredientInPlan(
    estado.planoAlimentar,
    primeiraRefeicao.id,
    primeiroIng.foodId,
    sub.foodId,
    estado.perfil,
    estado.metasNutricionais
  );
  assert.equal(planoSubstituido.refeicoes[0].ingredientes[0].foodId, sub.foodId);

  const alt = primeiraRefeicao.alternativasRefeicao[0];
  const planoTrocado = swapMealInPlan(
    estado.planoAlimentar,
    primeiraRefeicao.id,
    alt.id,
    estado.perfil,
    estado.metasNutricionais
  );
  assert.equal(planoTrocado.refeicoes[0].nomeRefeicao, alt.nomeRefeicao);
});

test('8. Geração e recálculo da Lista de Compras para 3, 7 e 14 dias', () => {
  const estado = buildInitialDatabaseState(true);
  const lista3 = generateShoppingList(estado.planoAlimentar, estado.perfil, 3);
  const lista7 = generateShoppingList(estado.planoAlimentar, estado.perfil, 7);
  const lista14 = generateShoppingList(estado.planoAlimentar, estado.perfil, 14);

  assert.equal(lista3.periodoDias, 3);
  assert.equal(lista7.periodoDias, 7);
  assert.equal(lista14.periodoDias, 14);
  assert.ok(
    lista14.itens[0].quantidadeNecessariaGramas > lista3.itens[0].quantidadeNecessariaGramas
  );
});

test('9. Diário alimentar: soma precisa dos totais a partir da base TACO/TBCA', () => {
  const arroz = FOOD_DATABASE.find((f) => f.id === 'arroz_branco_cozido')!;
  const frango = FOOD_DATABASE.find((f) => f.id === 'frango_peito_grelhado')!;

  const totais = calculateDiaryTotals([
    {
      id: 'd1',
      dataISO: '2026-10-29',
      slotRefeicao: 'Almoço',
      foodId: arroz.id,
      nomeAlimento: arroz.nome,
      quantidadeGramas: 200,
      kcal: arroz.kcalPor100g * 2,
      proteinas: arroz.proteinaPor100g * 2,
      carboidratos: arroz.carboidratoPor100g * 2,
      gorduras: arroz.gorduraPor100g * 2,
      fibras: arroz.fibraPor100g * 2,
      fonteNutricional: arroz.fonteNutricional,
      ehEstimativaManual: false,
    },
    {
      id: 'd2',
      dataISO: '2026-10-29',
      slotRefeicao: 'Almoço',
      foodId: frango.id,
      nomeAlimento: frango.nome,
      quantidadeGramas: 100,
      kcal: frango.kcalPor100g,
      proteinas: frango.proteinaPor100g,
      carboidratos: frango.carboidratoPor100g,
      gorduras: frango.gorduraPor100g,
      fibras: frango.fibraPor100g,
      fonteNutricional: frango.fonteNutricional,
      ehEstimativaManual: false,
    },
  ]);

  assert.equal(totais.kcal, 128 * 2 + 159);
  assert.equal(totais.proteinas, 2.5 * 2 + 32.0);
});

test('10. Geração de treinos respeitando limitações de joelho/ombro e troca de exercício', () => {
  const perfilComDorJoelho = {
    ...createDefaultUserProfile(),
    limitacoesMovimento: ['dor_joelho' as const],
  };
  const plano = generateWorkoutPlan(perfilComDorJoelho);
  for (const dia of plano.dias) {
    for (const ex of dia.exercicios) {
      assert.notEqual(ex.exerciseId, 'agachamento_livre_peso_corporal');
      assert.notEqual(ex.exerciseId, 'leg_press_45');
    }
  }

  const primeiroDia = plano.dias[0];
  const primeiroEx = primeiroDia.exercicios[0];
  const planoComTroca = swapExerciseInWorkoutDay(
    plano,
    primeiroDia.id,
    primeiroEx.exerciseId,
    'prancha_abdominal_frontal',
    perfilComDorJoelho
  );
  assert.equal(planoComTroca.dias[0].exercicios[0].exerciseId, 'prancha_abdominal_frontal');
});

test('11. Assistente PULSE AI local, execução real de alterações no estado e migração de persistência', () => {
  const estado = buildInitialDatabaseState(true);
  const resposta = generateLocalAssistantResponse(
    'Só tenho R$ 20 para comida até amanhã.',
    estado
  );
  assert.ok(resposta.propostaAcao);
  assert.equal(resposta.propostaAcao?.tipo, 'atualizar_orcamento');

  const novoEstado = executeAssistantAction(estado, resposta.propostaAcao!);
  assert.equal(novoEstado.perfil.orcamentoValor, 20);
  assert.equal(novoEstado.perfil.orcamentoPeriodo, 'dia');
  assert.ok(novoEstado.historicoAlteracoes.length > estado.historicoAlteracoes.length);

  const migrado = migrateDatabaseState({ onboardingConcluido: true });
  assert.equal(migrado.onboardingConcluido, true);
  assert.ok(migrado.perfil.despensa.length > 0);
});
