import { FOOD_DATABASE, findFoodById } from './foodDatabase';
import {
  DietPlan,
  FoodDiaryEntry,
  FoodItem,
  MealIngredient,
  NutritionTargets,
  PlannedMeal,
  ShoppingListItem,
  ShoppingListPlan,
  UserProfile,
} from './types';

/**
 * Gerador Inteligente de Dietas, Modo Econômico e Lista de Compras do PULSE
 */

export function isFoodAllowedForProfile(food: FoodItem, perfil: UserProfile): boolean {
  // 1. Verificar padrão alimentar
  if (perfil.padraoAlimentar === 'vegano' && !food.vegano) return false;
  if (perfil.padraoAlimentar === 'vegetariano' && !food.vegetariano) return false;
  if (perfil.padraoAlimentar === 'pescetariano') {
    const ehCarneTerrestre =
      food.categoria === 'proteinas_animais' && !food.alergenos.includes('peixes_frutos_mar');
    if (ehCarneTerrestre) return false;
  }

  // 2. Verificar alergias e restrições
  for (const alergia of perfil.alergiasRestricoes) {
    if (food.alergenos.includes(alergia)) return false;
  }

  // 3. Verificar alimentos que o usuário não come (nunca obrigar a comer o que não gosta)
  for (const naoCome of perfil.alimentosNaoCome) {
    const termo = naoCome.trim().toLowerCase();
    if (!termo) continue;
    if (
      food.id.toLowerCase() === termo ||
      food.nome.toLowerCase().includes(termo) ||
      food.apelidos.some((ap) => ap.toLowerCase() === termo || ap.toLowerCase().includes(termo))
    ) {
      return false;
    }
  }

  return true;
}

export function getDailyBudgetBRL(perfil: UserProfile): number {
  if (perfil.semDinheiroExtraCompras) return 0;
  if (perfil.orcamentoValor <= 0) return 0;
  if (perfil.orcamentoPeriodo === 'dia') return perfil.orcamentoValor;
  if (perfil.orcamentoPeriodo === 'semana') return Number((perfil.orcamentoValor / 7).toFixed(2));
  return Number((perfil.orcamentoValor / 30).toFixed(2));
}

export function formatHouseholdMeasure(food: FoodItem, gramas: number): string {
  const unidades = gramas / food.gramasPorMedidaCaseira;
  if (unidades < 0.65) {
    return `1/2 ${food.medidaCaseiraNome} (~${Math.round(gramas)}g)`;
  }
  const arredondado = Math.round(unidades * 2) / 2;
  return `${arredondado} ${food.medidaCaseiraNome}${arredondado > 1 ? 's' : ''} (~${Math.round(gramas)}g)`;
}

export function buildMealIngredient(
  food: FoodItem,
  quantidadeGramas: number,
  perfil: UserProfile,
  consumoAcumuladoDespensa: Record<string, number>
): MealIngredient {
  const gramasLimpo = Math.max(10, Math.round(quantidadeGramas / 5) * 5);
  const fator = gramasLimpo / 100;

  const itemDespensa = perfil.despensa.find((d) => d.foodId === food.id);
  const estoqueTotalCasa = itemDespensa ? itemDespensa.quantidadeGramas : 0;
  const jaUsado = consumoAcumuladoDespensa[food.id] ?? 0;
  const disponivelRestante = Math.max(0, estoqueTotalCasa - jaUsado);

  const disponivelEmCasaGramas = Math.min(gramasLimpo, disponivelRestante);
  const faltaComprarGramas = Math.max(0, gramasLimpo - disponivelEmCasaGramas);
  consumoAcumuladoDespensa[food.id] = jaUsado + disponivelEmCasaGramas;

  const precoPorKg = itemDespensa?.precoPersonalizadoPorKg ?? food.precoEstimadoPorKgBRL;
  const custoEstimadoBRL = Number(((gramasLimpo / 1000) * precoPorKg).toFixed(2));

  // Calcular substituições possíveis respeitando restrições e gostos
  const kcalAlvo = food.kcalPor100g * fator;
  const substituicoesPossiveis = food.substitutosIds
    .map((subId) => findFoodById(subId))
    .filter((sub): sub is FoodItem => Boolean(sub) && isFoodAllowedForProfile(sub!, perfil))
    .map((sub) => {
      const gramasEquiv = Math.max(
        15,
        Math.round(((kcalAlvo / Math.max(20, sub.kcalPor100g)) * 100) / 5) * 5
      );
      const subItemDespensa = perfil.despensa.find((d) => d.foodId === sub.id);
      const subPrecoKg = subItemDespensa?.precoPersonalizadoPorKg ?? sub.precoEstimadoPorKgBRL;
      const subCusto = Number(((gramasEquiv / 1000) * subPrecoKg).toFixed(2));
      return {
        foodId: sub.id,
        nome: sub.nome,
        quantidadeEquivalenteGramas: gramasEquiv,
        medidaCaseiraTexto: formatHouseholdMeasure(sub, gramasEquiv),
        custoEstimadoBRL: subCusto,
        economiaBRL: Number(Math.max(0, custoEstimadoBRL - subCusto).toFixed(2)),
      };
    });

  return {
    foodId: food.id,
    nome: food.nome,
    quantidadeGramas: gramasLimpo,
    medidaCaseiraTexto: formatHouseholdMeasure(food, gramasLimpo),
    kcal: Math.round(food.kcalPor100g * fator),
    proteinas: Number((food.proteinaPor100g * fator).toFixed(1)),
    carboidratos: Number((food.carboidratoPor100g * fator).toFixed(1)),
    gorduras: Number((food.gorduraPor100g * fator).toFixed(1)),
    fibras: Number((food.fibraPor100g * fator).toFixed(1)),
    custoEstimadoBRL,
    disponivelEmCasaGramas,
    faltaComprarGramas,
    substituicoesPossiveis,
  };
}

interface MealSlotTemplate {
  tituloSlot: string;
  horarioPadrao: string;
  proporcaoCalorias: number;
  tipoSlot: 'cafe_lanche' | 'principal';
}

function getMealSlots(numRefeicoes: number, horariosUsuario: string[]): MealSlotTemplate[] {
  const n = Math.min(6, Math.max(2, numRefeicoes));
  if (n === 2) {
    return [
      { tituloSlot: 'Primeira Refeição (Almoço)', horarioPadrao: horariosUsuario[0] || '12:30', proporcaoCalorias: 0.55, tipoSlot: 'principal' },
      { tituloSlot: 'Segunda Refeição (Jantar)', horarioPadrao: horariosUsuario[1] || '20:00', proporcaoCalorias: 0.45, tipoSlot: 'principal' },
    ];
  }
  if (n === 3) {
    return [
      { tituloSlot: 'Café da Manhã', horarioPadrao: horariosUsuario[0] || '07:30', proporcaoCalorias: 0.26, tipoSlot: 'cafe_lanche' },
      { tituloSlot: 'Almoço', horarioPadrao: horariosUsuario[1] || '12:30', proporcaoCalorias: 0.40, tipoSlot: 'principal' },
      { tituloSlot: 'Jantar', horarioPadrao: horariosUsuario[2] || '19:30', proporcaoCalorias: 0.34, tipoSlot: 'principal' },
    ];
  }
  if (n === 4) {
    return [
      { tituloSlot: 'Café da Manhã', horarioPadrao: horariosUsuario[0] || '07:30', proporcaoCalorias: 0.22, tipoSlot: 'cafe_lanche' },
      { tituloSlot: 'Almoço', horarioPadrao: horariosUsuario[1] || '12:30', proporcaoCalorias: 0.35, tipoSlot: 'principal' },
      { tituloSlot: 'Lanche da Tarde', horarioPadrao: horariosUsuario[2] || '16:30', proporcaoCalorias: 0.15, tipoSlot: 'cafe_lanche' },
      { tituloSlot: 'Jantar', horarioPadrao: horariosUsuario[3] || '20:00', proporcaoCalorias: 0.28, tipoSlot: 'principal' },
    ];
  }
  if (n === 5) {
    return [
      { tituloSlot: 'Café da Manhã', horarioPadrao: horariosUsuario[0] || '07:00', proporcaoCalorias: 0.20, tipoSlot: 'cafe_lanche' },
      { tituloSlot: 'Colação / Lanche da Manhã', horarioPadrao: horariosUsuario[1] || '10:00', proporcaoCalorias: 0.10, tipoSlot: 'cafe_lanche' },
      { tituloSlot: 'Almoço', horarioPadrao: horariosUsuario[2] || '12:30', proporcaoCalorias: 0.32, tipoSlot: 'principal' },
      { tituloSlot: 'Lanche da Tarde', horarioPadrao: horariosUsuario[3] || '16:30', proporcaoCalorias: 0.14, tipoSlot: 'cafe_lanche' },
      { tituloSlot: 'Jantar', horarioPadrao: horariosUsuario[4] || '20:00', proporcaoCalorias: 0.24, tipoSlot: 'principal' },
    ];
  }
  return [
    { tituloSlot: 'Café da Manhã', horarioPadrao: horariosUsuario[0] || '07:00', proporcaoCalorias: 0.18, tipoSlot: 'cafe_lanche' },
    { tituloSlot: 'Lanche da Manhã', horarioPadrao: horariosUsuario[1] || '10:00', proporcaoCalorias: 0.10, tipoSlot: 'cafe_lanche' },
    { tituloSlot: 'Almoço', horarioPadrao: horariosUsuario[2] || '12:30', proporcaoCalorias: 0.30, tipoSlot: 'principal' },
    { tituloSlot: 'Lanche da Tarde', horarioPadrao: horariosUsuario[3] || '16:00', proporcaoCalorias: 0.12, tipoSlot: 'cafe_lanche' },
    { tituloSlot: 'Jantar', horarioPadrao: horariosUsuario[4] || '19:30', proporcaoCalorias: 0.20, tipoSlot: 'principal' },
    { tituloSlot: 'Ceia', horarioPadrao: horariosUsuario[5] || '22:00', proporcaoCalorias: 0.10, tipoSlot: 'cafe_lanche' },
  ];
}

function scoreFoodForSelection(food: FoodItem, perfil: UserProfile, modoEconomico: boolean): number {
  let score = 10;
  const emCasa = perfil.despensa.some((d) => d.foodId === food.id && d.quantidadeGramas > 0);
  if (emCasa) score += 50; // Forte prioridade para itens já disponíveis em casa

  const ehFavorito = perfil.alimentosFavoritos.some(
    (fav) =>
      food.id === fav.toLowerCase() ||
      food.nome.toLowerCase().includes(fav.toLowerCase()) ||
      food.apelidos.some((ap) => ap.toLowerCase().includes(fav.toLowerCase()))
  );
  if (ehFavorito) score += 25;

  if (modoEconomico) {
    if (food.acessivelEconomico) score += 20;
    if (food.sazonalOuEstacao) score += 10;
    score -= food.precoEstimadoPorKgBRL * 0.4;
  }

  if (perfil.tempoPreparoMinutos <= 15 && food.tempoPreparoMin <= 10) {
    score += 12;
  }

  return score;
}

export function generateDietPlan(perfil: UserProfile, metas: NutritionTargets): DietPlan {
  const orcamentoDiario = getDailyBudgetBRL(perfil);
  const modoEconomico =
    perfil.modoEconomicoAtivo ||
    perfil.semDinheiroExtraCompras ||
    (orcamentoDiario > 0 && orcamentoDiario <= 18) ||
    perfil.objetivoSecundario === 'economizar_mercado';

  const alimentosPermitidos = FOOD_DATABASE.filter((f) => isFoodAllowedForProfile(f, perfil));

  // Ordenar candidatos por pontuação (prioriza despensa + favoritos + economia)
  const ordenarPorScore = (lista: FoodItem[]) =>
    [...lista].sort(
      (a, b) => scoreFoodForSelection(b, perfil, modoEconomico) - scoreFoodForSelection(a, perfil, modoEconomico)
    );

  // Fontes para Café / Lanche (prioriza aveia, cuscuz, pão, tapioca e batata-doce)
  const carbosCafe = ordenarPorScore(
    alimentosPermitidos.filter((f) =>
      ['aveia_flocos', 'cuscuz_milho_cozido', 'pao_frances', 'tapioca_goma', 'batata_doce_cozida'].includes(f.id)
    )
  );
  const frutasPermitidas = ordenarPorScore(alimentosPermitidos.filter((f) => f.categoria === 'frutas'));
  const proteinasCafe = ordenarPorScore(
    alimentosPermitidos.filter((f) =>
      ['ovo_galinha_cozido', 'leite_integral', 'iogurte_natural', 'queijo_minas_frescal', 'tofu_firme', 'pts_soja_cozida', 'amendoim_torrado'].includes(f.id)
    )
  );

  // Fontes para Almoço / Jantar
  const carbosPrincipais = ordenarPorScore(
    alimentosPermitidos.filter((f) =>
      ['arroz_branco_cozido', 'arroz_integral_cozido', 'macarrao_cozido', 'batata_inglesa_cozida', 'batata_doce_cozida', 'mandioca_cozida', 'cuscuz_milho_cozido'].includes(f.id)
    )
  );
  const leguminosasPermitidas = ordenarPorScore(alimentosPermitidos.filter((f) => f.categoria === 'leguminosas'));
  const proteinasPrincipais = ordenarPorScore(
    alimentosPermitidos.filter((f) =>
      [
        'frango_peito_grelhado',
        'ovo_galinha_cozido',
        'frango_coxa_sobrecoxa',
        'sardinha_conserva',
        'carne_moida_acem',
        'lombo_suino_assado',
        'pts_soja_cozida',
        'tofu_firme',
        'grao_de_bico_cozido',
      ].includes(f.id)
    )
  );
  const vegetaisPermitidos = ordenarPorScore(alimentosPermitidos.filter((f) => f.categoria === 'verduras_legumes'));

  const slots = getMealSlots(perfil.refeicoesPorDia, perfil.horariosRefeicoes);
  const consumoAcumuladoDespensa: Record<string, number> = {};

  const refeicoes: PlannedMeal[] = slots.map((slot, idx) => {
    const kcalAlvoSlot = metas.caloriasMetaKcal * slot.proporcaoCalorias;
    const ingredientes: MealIngredient[] = [];
    let nomeRefeicao = '';
    let modoPreparo: string[] = [];

    if (slot.tipoSlot === 'cafe_lanche') {
      const carbo = carbosCafe[idx % Math.max(1, carbosCafe.length)] ?? carbosCafe[0] ?? alimentosPermitidos[0];
      const fruta = frutasPermitidas[idx % Math.max(1, frutasPermitidas.length)] ?? frutasPermitidas[0];
      const prot = proteinasCafe[idx % Math.max(1, proteinasCafe.length)] ?? proteinasCafe[0];

      // Distribuir calorias do slot: ~45% carbo/cereal, ~25% fruta, ~30% fonte proteica
      if (carbo) {
        const gramasCarbo = ((kcalAlvoSlot * 0.42) / Math.max(40, carbo.kcalPor100g)) * 100;
        ingredientes.push(buildMealIngredient(carbo, gramasCarbo, perfil, consumoAcumuladoDespensa));
      }
      if (prot && prot.id !== carbo?.id) {
        const gramasProt = ((kcalAlvoSlot * 0.35) / Math.max(40, prot.kcalPor100g)) * 100;
        ingredientes.push(buildMealIngredient(prot, gramasProt, perfil, consumoAcumuladoDespensa));
      }
      if (fruta && fruta.id !== carbo?.id && fruta.id !== prot?.id) {
        const gramasFruta = ((kcalAlvoSlot * 0.23) / Math.max(30, fruta.kcalPor100g)) * 100;
        ingredientes.push(buildMealIngredient(fruta, gramasFruta, perfil, consumoAcumuladoDespensa));
      }

      const nomesCurto = ingredientes.map((i) => i.nome.split(' ')[0]).join(' + ');
      nomeRefeicao = `${slot.tituloSlot}: ${nomesCurto}`;
      modoPreparo = [
        'Separe as porções indicadas utilizando medidas caseiras ou balança de cozinha.',
        prot?.id === 'ovo_galinha_cozido'
          ? 'Prepare os ovos mexidos ou cozidos em panela antiaderente em fogo baixo.'
          : 'Combine a fonte de proteína com a base energética.',
        fruta ? `Consuma a porção de ${fruta.nome.toLowerCase()} fresca para aporte de fibras e saciedade.` : 'Sirva imediatamente.',
      ];
    } else {
      // Refeição Principal (Almoço / Jantar)
      // Em modo econômico, compartilha a base principal para evitar desperdício e tempo de cozinha
      const indiceVariedade = modoEconomico ? 0 : idx % Math.max(1, carbosPrincipais.length);
      const carbo = carbosPrincipais[indiceVariedade] ?? carbosPrincipais[0];
      const leguminosa = leguminosasPermitidas[0];
      const indiceProt = modoEconomico
        ? idx % Math.min(2, Math.max(1, proteinasPrincipais.length))
        : idx % Math.max(1, proteinasPrincipais.length);
      const prot = proteinasPrincipais[indiceProt] ?? proteinasPrincipais[0];
      const vegetal = vegetaisPermitidos[idx % Math.max(1, vegetaisPermitidos.length)] ?? vegetaisPermitidos[0];

      if (carbo) {
        const gramasCarbo = ((kcalAlvoSlot * 0.42) / Math.max(50, carbo.kcalPor100g)) * 100;
        ingredientes.push(buildMealIngredient(carbo, gramasCarbo, perfil, consumoAcumuladoDespensa));
      }
      if (leguminosa && leguminosa.id !== carbo?.id) {
        const gramasLeg = ((kcalAlvoSlot * 0.20) / Math.max(50, leguminosa.kcalPor100g)) * 100;
        ingredientes.push(buildMealIngredient(leguminosa, gramasLeg, perfil, consumoAcumuladoDespensa));
      }
      if (prot && prot.id !== leguminosa?.id) {
        const gramasProt = ((kcalAlvoSlot * 0.32) / Math.max(60, prot.kcalPor100g)) * 100;
        ingredientes.push(buildMealIngredient(prot, gramasProt, perfil, consumoAcumuladoDespensa));
      }
      if (vegetal) {
        const gramasVeg = Math.max(80, ((kcalAlvoSlot * 0.06) / Math.max(15, vegetal.kcalPor100g)) * 100);
        ingredientes.push(buildMealIngredient(vegetal, gramasVeg, perfil, consumoAcumuladoDespensa));
      }

      const nomesCurto = ingredientes.slice(0, 3).map((i) => i.nome.split(' ')[0]).join(', ');
      nomeRefeicao = `Prato Brasileiro Equilibrado (${nomesCurto})`;
      modoPreparo = [
        'Cozinhe a base de carboidrato e leguminosa com temperos naturais (alho, cebola, ervas e pouco sal).',
        'Prepare a fonte proteica grelhada, cozida ou assada sem excesso de óleo.',
        'Monte o prato iniciando pelos vegetais e legumes para garantir micronutrientes e fibras.',
      ];
    }

    const caloriasTotais = ingredientes.reduce((acc, i) => acc + i.kcal, 0);
    const proteinasTotais = Number(ingredientes.reduce((acc, i) => acc + i.proteinas, 0).toFixed(1));
    const carboidratosTotais = Number(ingredientes.reduce((acc, i) => acc + i.carboidratos, 0).toFixed(1));
    const gordurasTotais = Number(ingredientes.reduce((acc, i) => acc + i.gorduras, 0).toFixed(1));
    const fibrasTotais = Number(ingredientes.reduce((acc, i) => acc + i.fibras, 0).toFixed(1));
    const custoEstimadoTotalBRL = Number(
      ingredientes.reduce((acc, i) => acc + i.custoEstimadoBRL, 0).toFixed(2)
    );
    const tempoEstimadoMin = Math.min(
      perfil.tempoPreparoMinutos || 30,
      Math.max(...ingredientes.map((i) => findFoodById(i.foodId)?.tempoPreparoMin ?? 10), 10)
    );

    // Gerar 2 alternativas compatíveis para o botão "Trocar refeição"
    const alternativasRefeicao = buildMealAlternatives(
      slot.tipoSlot,
      alimentosPermitidos,
      ingredientes.map((i) => i.foodId)
    );

    return {
      id: `meal_${idx + 1}`,
      slotIndex: idx,
      tituloSlot: slot.tituloSlot,
      horarioSugerido: slot.horarioPadrao,
      nomeRefeicao,
      ingredientes,
      modoPreparo,
      tempoEstimadoMin,
      caloriasTotais,
      proteinasTotais,
      carboidratosTotais,
      gordurasTotais,
      fibrasTotais,
      custoEstimadoTotalBRL,
      consumidaHoje: false,
      alternativasRefeicao,
    };
  });

  return summarizeAndValidateDietPlan(refeicoes, perfil, metas, modoEconomico);
}

function buildMealAlternatives(
  tipoSlot: 'cafe_lanche' | 'principal',
  alimentosPermitidos: FoodItem[],
  atuaisIds: string[]
) {
  if (tipoSlot === 'cafe_lanche') {
    const alt1 = [
      { foodId: 'cuscuz_milho_cozido', proporcao: 0.45 },
      { foodId: 'ovo_galinha_cozido', proporcao: 0.35 },
      { foodId: 'banana_prata', proporcao: 0.2 },
    ].filter((item) => alimentosPermitidos.some((f) => f.id === item.foodId));

    const alt2 = [
      { foodId: 'aveia_flocos', proporcao: 0.45 },
      { foodId: 'leite_integral', proporcao: 0.3 },
      { foodId: 'mamao_formosa', proporcao: 0.25 },
    ].filter((item) => alimentosPermitidos.some((f) => f.id === item.foodId));

    const alt3 = [
      { foodId: 'pao_frances', proporcao: 0.5 },
      { foodId: 'ovo_galinha_cozido', proporcao: 0.3 },
      { foodId: 'laranja_pera', proporcao: 0.2 },
    ].filter((item) => alimentosPermitidos.some((f) => f.id === item.foodId));

    return [
      {
        id: 'alt_cafe_1',
        nomeRefeicao: 'Cuscuz Nordestino com Ovos e Fruta',
        descricaoCurta: 'Energia de absorção gradual com alto custo-benefício',
        foodIdsBase: alt1.length >= 2 ? alt1 : alt3,
      },
      {
        id: 'alt_cafe_2',
        nomeRefeicao: 'Mingau/Tigela de Aveia Proteica com Fruta',
        descricaoCurta: 'Rico em fibras solúveis (beta-glucana) e preparo em 3 minutos',
        foodIdsBase: alt2.length >= 2 ? alt2 : alt1,
      },
      {
        id: 'alt_cafe_3',
        nomeRefeicao: 'Pão com Ovos Mexidos e Cítrico da Estação',
        descricaoCurta: 'Prático para rotina corrida sem abrir mão de proteína',
        foodIdsBase: alt3.length >= 2 ? alt3 : alt1,
      },
    ].filter((a) => !a.foodIdsBase.every((fb) => atuaisIds.includes(fb.foodId)));
  }

  // Principal
  const altP1 = [
    { foodId: 'arroz_branco_cozido', proporcao: 0.4 },
    { foodId: 'feijao_carioca_cozido', proporcao: 0.22 },
    { foodId: 'ovo_galinha_cozido', proporcao: 0.32 },
    { foodId: 'legumes_estacao_cozidos', proporcao: 0.06 },
  ].filter((item) => alimentosPermitidos.some((f) => f.id === item.foodId));

  const altP2 = [
    { foodId: 'batata_doce_cozida', proporcao: 0.45 },
    { foodId: 'frango_peito_grelhado', proporcao: 0.38 },
    { foodId: 'salada_folhas_tomate', proporcao: 0.17 },
  ].filter((item) => alimentosPermitidos.some((f) => f.id === item.foodId));

  const altP3 = [
    { foodId: 'macarrao_cozido', proporcao: 0.48 },
    { foodId: 'sardinha_conserva', proporcao: 0.36 },
    { foodId: 'legumes_estacao_cozidos', proporcao: 0.16 },
  ].filter((item) => alimentosPermitidos.some((f) => f.id === item.foodId));

  return [
    {
      id: 'alt_princ_1',
      nomeRefeicao: 'Arroz, Feijão, Ovos e Legumes da Estação',
      descricaoCurta: 'Combinação clássica brasileira de aminoácidos essenciais e baixo custo',
      foodIdsBase: altP1,
    },
    {
      id: 'alt_princ_2',
      nomeRefeicao: 'Raízes (Batata-doce/Mandioca) com Frango e Salada',
      descricaoCurta: 'Excelente saciedade e densidade proteica',
      foodIdsBase: altP2.length >= 2 ? altP2 : altP1,
    },
    {
      id: 'alt_princ_3',
      nomeRefeicao: 'Macarrão Rápido de Panela com Proteína e Legumes',
      descricaoCurta: 'Preparo rápido para dias com pouco tempo',
      foodIdsBase: altP3.length >= 2 ? altP3 : altP1,
    },
  ];
}

export function summarizeAndValidateDietPlan(
  refeicoes: PlannedMeal[],
  perfil: UserProfile,
  metas: NutritionTargets,
  modoEconomico: boolean
): DietPlan {
  const calorias = refeicoes.reduce((acc, r) => acc + r.caloriasTotais, 0);
  const proteinas = Number(refeicoes.reduce((acc, r) => acc + r.proteinasTotais, 0).toFixed(1));
  const carboidratos = Number(refeicoes.reduce((acc, r) => acc + r.carboidratosTotais, 0).toFixed(1));
  const gorduras = Number(refeicoes.reduce((acc, r) => acc + r.gordurasTotais, 0).toFixed(1));
  const fibras = Number(refeicoes.reduce((acc, r) => acc + r.fibrasTotais, 0).toFixed(1));

  // Custo diário total dos alimentos consumidos vs custo apenas do que falta comprar
  const custoDiarioTotalIngredientesBRL = Number(
    refeicoes.reduce((acc, r) => acc + r.custoEstimadoTotalBRL, 0).toFixed(2)
  );
  const custoDiarioFaltanteBRL = Number(
    refeicoes
      .reduce(
        (acc, r) =>
          acc +
          r.ingredientes.reduce((sub, ing) => {
            if (ing.quantidadeGramas <= 0) return sub;
            const proporcaoFalta = ing.faltaComprarGramas / ing.quantidadeGramas;
            return sub + ing.custoEstimadoBRL * proporcaoFalta;
          }, 0),
        0
      )
      .toFixed(2)
  );

  const orcamentoDeclaradoDiarioBRL = getDailyBudgetBRL(perfil);
  const orcamentoSuficiente =
    perfil.semDinheiroExtraCompras
      ? custoDiarioFaltanteBRL <= 1.0
      : orcamentoDeclaradoDiarioBRL <= 0 || custoDiarioFaltanteBRL <= orcamentoDeclaradoDiarioBRL * 1.08;

  const lacunasNutricionais: string[] = [];
  const explicacaoLimitacoes: string[] = [];
  const sugestoesBaixoCusto: string[] = [];

  if (proteinas < metas.proteinasFaixaGramas[0]) {
    lacunasNutricionais.push(
      `Aporte proteico atual (${proteinas}g) ficou ligeiramente abaixo da faixa ideal (${metas.proteinasFaixaGramas[0]}g–${metas.proteinasFaixaGramas[1]}g) devido às restrições ou estoque atual.`
    );
    sugestoesBaixoCusto.push(
      'Fontes de proteína com melhor custo por grama no Brasil: ovos em cartela de 30 unidades, combinação arroz + feijão (1:1), proteína texturizada de soja (PTS) ou coxa/sobrecoxa de frango.'
    );
  }

  if (fibras < metas.fibrasGramas * 0.8) {
    lacunasNutricionais.push(
      `Fibras estimadas (${fibras}g) abaixo da referência de ${metas.fibrasGramas}g/dia.`
    );
    sugestoesBaixoCusto.push(
      'Aumente feijão, aveia em flocos ou verduras/frutas da estação (banana, laranja, couve, repolho).'
    );
  }

  if (perfil.semDinheiroExtraCompras && custoDiarioFaltanteBRL > 0.5) {
    explicacaoLimitacoes.push(
      `Você indicou que não possui orçamento extra para compras neste momento. Montamos o plano priorizando 100% da sua despensa atual (${perfil.despensa.map((d) => d.nome).join(', ') || 'itens informados'}). Alguns itens complementares aparecem apenas como referência caso consiga repor depois.`
    );
  } else if (!orcamentoSuficiente && orcamentoDeclaradoDiarioBRL > 0) {
    explicacaoLimitacoes.push(
      `Respeitando sua realidade: o orçamento declarado de R$ ${orcamentoDeclaradoDiarioBRL.toFixed(2)}/dia é menor do que o custo estimado de reposição (R$ ${custoDiarioFaltanteBRL.toFixed(2)}/dia com preços médios de referência). Priorizamos seus ingredientes em casa e opções econômicas.`
    );
    sugestoesBaixoCusto.push(
      'Troque cortes de carne bovina ou peito de frango por ovos, feijão, sardinha ou proteína de soja na aba de substituições para reduzir o custo diário em até 35%.'
    );
  }

  explicacaoLimitacoes.push(
    'Os preços exibidos são estimativas médias nacionais de referência e podem variar na sua região. Você pode editar preços na Lista de Compras.'
  );

  return {
    id: `plan_${Date.now()}`,
    criadoEmISO: new Date().toISOString(),
    modoEconomico,
    refeicoes,
    totaisPlano: {
      calorias,
      proteinas,
      carboidratos,
      gorduras,
      fibras,
      custoDiarioEstimadoBRL: custoDiarioTotalIngredientesBRL,
      custoSemanalEstimadoBRL: Number((custoDiarioTotalIngredientesBRL * 7).toFixed(2)),
      custoMensalEstimadoBRL: Number((custoDiarioTotalIngredientesBRL * 30).toFixed(2)),
    },
    orcamentoDeclaradoDiarioBRL,
    orcamentoSuficiente,
    lacunasNutricionais,
    explicacaoLimitacoes,
    sugestoesBaixoCusto,
  };
}

/**
 * Substitui um ingrediente específico dentro de uma refeição e recalcula todo o plano
 */
export function substituteIngredientInPlan(
  planoAtual: DietPlan,
  mealId: string,
  oldFoodId: string,
  newFoodId: string,
  perfil: UserProfile,
  metas: NutritionTargets
): DietPlan {
  const novoFood = findFoodById(newFoodId);
  if (!novoFood) return planoAtual;

  const consumoAcumuladoDespensa: Record<string, number> = {};

  const novasRefeicoes = planoAtual.refeicoes.map((refeicao) => {
    if (refeicao.id !== mealId) {
      // Contabiliza uso da despensa nas outras refeições
      for (const ing of refeicao.ingredientes) {
        consumoAcumuladoDespensa[ing.foodId] =
          (consumoAcumuladoDespensa[ing.foodId] ?? 0) + ing.disponivelEmCasaGramas;
      }
      return refeicao;
    }

    const novosIngredientes = refeicao.ingredientes.map((ing) => {
      if (ing.foodId !== oldFoodId) {
        consumoAcumuladoDespensa[ing.foodId] =
          (consumoAcumuladoDespensa[ing.foodId] ?? 0) + ing.disponivelEmCasaGramas;
        return ing;
      }
      // Calcula quantidade energeticamente equivalente
      const gramasEquiv = ((ing.kcal / Math.max(20, novoFood.kcalPor100g)) * 100);
      return buildMealIngredient(novoFood, gramasEquiv, perfil, consumoAcumuladoDespensa);
    });

    const caloriasTotais = novosIngredientes.reduce((acc, i) => acc + i.kcal, 0);
    const proteinasTotais = Number(novosIngredientes.reduce((acc, i) => acc + i.proteinas, 0).toFixed(1));
    const carboidratosTotais = Number(novosIngredientes.reduce((acc, i) => acc + i.carboidratos, 0).toFixed(1));
    const gordurasTotais = Number(novosIngredientes.reduce((acc, i) => acc + i.gorduras, 0).toFixed(1));
    const fibrasTotais = Number(novosIngredientes.reduce((acc, i) => acc + i.fibras, 0).toFixed(1));
    const custoEstimadoTotalBRL = Number(
      novosIngredientes.reduce((acc, i) => acc + i.custoEstimadoBRL, 0).toFixed(2)
    );

    return {
      ...refeicao,
      nomeRefeicao: `${refeicao.tituloSlot}: ${novosIngredientes.slice(0, 3).map((i) => i.nome.split(' ')[0]).join(' + ')}`,
      ingredientes: novosIngredientes,
      caloriasTotais,
      proteinasTotais,
      carboidratosTotais,
      gordurasTotais,
      fibrasTotais,
      custoEstimadoTotalBRL,
    };
  });

  return summarizeAndValidateDietPlan(novasRefeicoes, perfil, metas, planoAtual.modoEconomico);
}

/**
 * Troca uma refeição inteira por uma de suas alternativas compatíveis e recalcula o plano
 */
export function swapMealInPlan(
  planoAtual: DietPlan,
  mealId: string,
  alternativeId: string,
  perfil: UserProfile,
  metas: NutritionTargets
): DietPlan {
  const consumoAcumuladoDespensa: Record<string, number> = {};

  const novasRefeicoes = planoAtual.refeicoes.map((refeicao) => {
    if (refeicao.id !== mealId) {
      for (const ing of refeicao.ingredientes) {
        consumoAcumuladoDespensa[ing.foodId] =
          (consumoAcumuladoDespensa[ing.foodId] ?? 0) + ing.disponivelEmCasaGramas;
      }
      return refeicao;
    }

    const alt =
      refeicao.alternativasRefeicao.find((a) => a.id === alternativeId) ??
      refeicao.alternativasRefeicao[0];
    if (!alt || alt.foodIdsBase.length === 0) return refeicao;

    const kcalAlvo = refeicao.caloriasTotais;
    const novosIngredientes = alt.foodIdsBase
      .map((itemBase) => {
        const food = findFoodById(itemBase.foodId);
        if (!food) return null;
        const gramas = ((kcalAlvo * itemBase.proporcao) / Math.max(25, food.kcalPor100g)) * 100;
        return buildMealIngredient(food, gramas, perfil, consumoAcumuladoDespensa);
      })
      .filter((i): i is MealIngredient => Boolean(i));

    const caloriasTotais = novosIngredientes.reduce((acc, i) => acc + i.kcal, 0);
    const proteinasTotais = Number(novosIngredientes.reduce((acc, i) => acc + i.proteinas, 0).toFixed(1));
    const carboidratosTotais = Number(novosIngredientes.reduce((acc, i) => acc + i.carboidratos, 0).toFixed(1));
    const gordurasTotais = Number(novosIngredientes.reduce((acc, i) => acc + i.gorduras, 0).toFixed(1));
    const fibrasTotais = Number(novosIngredientes.reduce((acc, i) => acc + i.fibras, 0).toFixed(1));
    const custoEstimadoTotalBRL = Number(
      novosIngredientes.reduce((acc, i) => acc + i.custoEstimadoBRL, 0).toFixed(2)
    );

    return {
      ...refeicao,
      nomeRefeicao: alt.nomeRefeicao,
      ingredientes: novosIngredientes,
      caloriasTotais,
      proteinasTotais,
      carboidratosTotais,
      gordurasTotais,
      fibrasTotais,
      custoEstimadoTotalBRL,
    };
  });

  return summarizeAndValidateDietPlan(novasRefeicoes, perfil, metas, planoAtual.modoEconomico);
}

/**
 * Gera a Lista de Compras Agrupada para 3, 7 ou 14 dias
 */
export function generateShoppingList(
  planoAlimentar: DietPlan,
  perfil: UserProfile,
  periodoDias: 3 | 7 | 14,
  listaAnterior?: ShoppingListPlan
): ShoppingListPlan {
  const agrupadoPorAlimento = new Map<
    string,
    { food: FoodItem; gramasDiarias: number }
  >();

  for (const refeicao of planoAlimentar.refeicoes) {
    for (const ing of refeicao.ingredientes) {
      const food = findFoodById(ing.foodId);
      if (!food) continue;
      const atual = agrupadoPorAlimento.get(food.id);
      if (atual) {
        atual.gramasDiarias += ing.quantidadeGramas;
      } else {
        agrupadoPorAlimento.set(food.id, {
          food,
          gramasDiarias: ing.quantidadeGramas,
        });
      }
    }
  }

  const itens: ShoppingListItem[] = [];
  let economiaPotencialSubstituicoesBRL = 0;

  for (const [foodId, dados] of agrupadoPorAlimento.entries()) {
    const { food, gramasDiarias } = dados;
    const quantidadeNecessariaGramas = Math.round(gramasDiarias * periodoDias);
    const despensaItem = perfil.despensa.find((d) => d.foodId === foodId);
    const quantidadeEmCasaGramas = despensaItem ? despensaItem.quantidadeGramas : 0;

    const itemAnterior = listaAnterior?.itens.find((i) => i.foodId === foodId);
    const quantidadeFaltantePadrao = Math.max(0, quantidadeNecessariaGramas - quantidadeEmCasaGramas);
    const quantidadeFaltanteGramas =
      itemAnterior?.quantidadeEditadaGramas !== undefined
        ? itemAnterior.quantidadeEditadaGramas
        : quantidadeFaltantePadrao;

    const precoPorKg =
      itemAnterior?.precoPersonalizadoPorKgBRL ??
      despensaItem?.precoPersonalizadoPorKg ??
      food.precoEstimadoPorKgBRL;

    const custoEstimadoFaltanteBRL = Number(
      ((quantidadeFaltanteGramas / 1000) * precoPorKg).toFixed(2)
    );

    // Verificar se há substituto permitido mais barato por kg
    let substituicaoMaisBarata: ShoppingListItem['substituicaoMaisBarata'];
    if (quantidadeFaltanteGramas > 0) {
      const candidatosMaisBaratos = food.substitutosIds
        .map((id) => findFoodById(id))
        .filter(
          (sub): sub is FoodItem =>
            Boolean(sub) &&
            isFoodAllowedForProfile(sub!, perfil) &&
            sub!.precoEstimadoPorKgBRL < precoPorKg * 0.85
        )
        .sort((a, b) => a.precoEstimadoPorKgBRL - b.precoEstimadoPorKgBRL);

      const melhorSub = candidatosMaisBaratos[0];
      if (melhorSub) {
        const custoSub = Number(
          ((quantidadeFaltanteGramas / 1000) * melhorSub.precoEstimadoPorKgBRL).toFixed(2)
        );
        const economia = Number(Math.max(0, custoEstimadoFaltanteBRL - custoSub).toFixed(2));
        if (economia >= 0.5) {
          substituicaoMaisBarata = {
            foodId: melhorSub.id,
            nome: melhorSub.nome,
            custoEstimadoBRL: custoSub,
            economiaBRL: economia,
          };
          economiaPotencialSubstituicoesBRL += economia;
        }
      }
    }

    const prioridade: ShoppingListItem['prioridade'] =
      food.categoria === 'cereais_tuberculos' ||
      food.categoria === 'leguminosas' ||
      food.categoria === 'proteinas_animais' ||
      food.categoria === 'laticinios_ovos' ||
      food.categoria === 'proteinas_vegetais'
        ? 'essencial'
        : 'opcional_complementar';

    itens.push({
      id: `shop_${foodId}`,
      foodId,
      nome: food.nome,
      categoria: food.categoria,
      quantidadeNecessariaGramas,
      quantidadeEmCasaGramas,
      quantidadeFaltanteGramas,
      quantidadeEditadaGramas: itemAnterior?.quantidadeEditadaGramas,
      comprado: itemAnterior?.comprado ?? (quantidadeFaltanteGramas === 0),
      prioridade,
      custoEstimadoFaltanteBRL,
      precoPersonalizadoPorKgBRL: itemAnterior?.precoPersonalizadoPorKgBRL,
      substituicaoMaisBarata,
    });
  }

  // Ordenar: itens faltantes essenciais primeiro, depois opcionais, depois já disponíveis em casa
  itens.sort((a, b) => {
    if (a.comprado !== b.comprado) return a.comprado ? 1 : -1;
    if (a.prioridade !== b.prioridade) return a.prioridade === 'essencial' ? -1 : 1;
    return b.custoEstimadoFaltanteBRL - a.custoEstimadoFaltanteBRL;
  });

  const custoTotalFaltanteEstimadoBRL = Number(
    itens.filter((i) => !i.comprado).reduce((acc, i) => acc + i.custoEstimadoFaltanteBRL, 0).toFixed(2)
  );
  const custoItensEssenciaisBRL = Number(
    itens
      .filter((i) => !i.comprado && i.prioridade === 'essencial')
      .reduce((acc, i) => acc + i.custoEstimadoFaltanteBRL, 0)
      .toFixed(2)
  );

  return {
    periodoDias,
    itens,
    custoTotalFaltanteEstimadoBRL,
    custoItensEssenciaisBRL,
    economiaPotencialSubstituicoesBRL: Number(economiaPotencialSubstituicoesBRL.toFixed(2)),
    avisoPreciosEstimados:
      'Os custos são estimativas aproximadas baseadas em médias nacionais e podem ser editados conforme o mercado da sua cidade.',
  };
}

/**
 * Calcula totais reais de entradas do Diário Alimentar a partir da base nutricional
 */
export function calculateDiaryTotals(entradas: FoodDiaryEntry[]) {
  return entradas.reduce(
    (acc, item) => ({
      kcal: acc.kcal + item.kcal,
      proteinas: Number((acc.proteinas + item.proteinas).toFixed(1)),
      carboidratos: Number((acc.carboidratos + item.carboidratos).toFixed(1)),
      gorduras: Number((acc.gorduras + item.gorduras).toFixed(1)),
      fibras: Number((acc.fibras + item.fibras).toFixed(1)),
    }),
    { kcal: 0, proteinas: 0, carboidratos: 0, gorduras: 0, fibras: 0 }
  );
}
