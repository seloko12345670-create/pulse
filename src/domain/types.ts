/**
 * PULSE — Modelos de Domínio e Banco de Dados
 */

export type PhysiologicalVariableOption =
  | 'masculino'
  | 'feminino'
  | 'estimativa_media'
  | 'prefiro_nao_informar';

export type ActivityLevel =
  | 'sedentario'
  | 'levemente_ativo'
  | 'moderadamente_ativo'
  | 'muito_ativo'
  | 'extremamente_ativo';

export type PrimaryGoal =
  | 'emagrecer'
  | 'ganhar_massa'
  | 'recomposicao_corporal'
  | 'manter_condicionamento'
  | 'melhorar_resistencia'
  | 'habitos_saudaveis';

export type SecondaryGoal =
  | 'nenhum'
  | 'melhorar_energia_sono'
  | 'economizar_mercado'
  | 'aumentar_forca'
  | 'melhorar_mobilidade'
  | 'reduzir_tempo_cozinha';

export type ExperienceLevel = 'iniciante' | 'intermediario' | 'avancado';

export type TrainingLocation = 'academia' | 'casa' | 'ar_livre';

export type EquipmentType =
  | 'nenhum'
  | 'halteres'
  | 'barra_anilhas'
  | 'elásticos'
  | 'banco_apoio'
  | 'barra_fixa'
  | 'maquinas_academia'
  | 'kettlebell';

export type MuscleGroup =
  | 'peito'
  | 'costas'
  | 'pernas_quadriceps'
  | 'posterior_gluteos'
  | 'ombros'
  | 'biceps_triceps'
  | 'core_abdomen'
  | 'corpo_todo';

export type MovementLimitation =
  | 'nenhuma'
  | 'dor_joelho'
  | 'dor_ombro'
  | 'dor_lombar'
  | 'dor_punho'
  | 'sem_impacto_saltos';

export type DietaryPattern =
  | 'onivoro'
  | 'vegetariano'
  | 'vegano'
  | 'pescetariano'
  | 'flexitariano';

export type AllergenOrRestriction =
  | 'lactose_leite'
  | 'gluten_trigo'
  | 'ovos'
  | 'peixes_frutos_mar'
  | 'amendoim_oleaginosas'
  | 'soja'
  | 'carne_suina'
  | 'carne_bovina';

export type SpecialHealthFlag =
  | 'nenhuma'
  | 'gestante_lactante'
  | 'historico_transtorno_alimentar'
  | 'diabetes_resistencia_insulina'
  | 'hipertensao_cardiovascular'
  | 'doenca_renal_hepatica';

export type CookingHabit =
  | 'cozinho_diariamente'
  | 'marmitas_fim_de_semana'
  | 'preparo_rapido_15min'
  | 'dependo_comida_pronta';

export type BudgetPeriod = 'dia' | 'semana' | 'mes';

export interface PantryItem {
  id: string;
  foodId: string;
  nome: string;
  quantidadeGramas: number;
  medidaAproximada: string;
  jaComprado: boolean;
  precoPersonalizadoPorKg?: number;
}

export interface UserProfile {
  nome: string;
  idade: number;
  alturaCm: number;
  pesoAtualKg: number;
  pesoDesejadoKg?: number;
  variavelFisiologica: PhysiologicalVariableOption;
  nivelAtividade: ActivityLevel;
  condicoesSaude: SpecialHealthFlag[];
  observacoesSaude: string;

  // Etapa 2 — Objetivo
  objetivoPrincipal: PrimaryGoal;
  objetivoSecundario: SecondaryGoal;

  // Etapa 3 — Atividade física
  treinaAtualmente: boolean;
  nivelExperiencia: ExperienceLevel;
  diasTreinoPorSemana: number;
  tempoSessaoMinutos: number;
  localTreino: TrainingLocation;
  equipamentosDisponiveis: EquipmentType[];
  gruposMuscularesFoco: MuscleGroup[];
  limitacoesMovimento: MovementLimitation[];
  observacoesTreino: string;

  // Etapa 4 — Alimentação
  refeicoesPorDia: number;
  padraoAlimentar: DietaryPattern;
  alergiasRestricoes: AllergenOrRestriction[];
  alimentosFavoritos: string[]; // IDs ou nomes
  alimentosNaoCome: string[]; // IDs ou nomes
  tempoPreparoMinutos: number;
  habitoCozinhar: CookingHabit;
  utensiliosDisponiveis: string[];

  // Etapa 5 — Orçamento alimentar
  orcamentoValor: number;
  orcamentoPeriodo: BudgetPeriod;
  semDinheiroExtraCompras: boolean;
  modoEconomicoAtivo: boolean;
  despensa: PantryItem[];

  // Etapa 6 — Rotina
  horarioAcordar: string;
  horarioDormir: string;
  horariosRefeicoes: string[];
  horarioTreino: string;
  diasRotinaConsistente: number;
}

export interface NutritionTargets {
  bmrEstimadoKcal: number;
  bmrIncertezaKcal: number;
  tdeeEstimadoKcal: number;
  caloriasMetaKcal: number;
  faixaCaloriasMin: number;
  faixaCaloriasMax: number;
  proteinasGramas: number;
  proteinasFaixaGramas: [number, number];
  carboidratosGramas: number;
  gordurasGramas: number;
  fibrasGramas: number;
  hidratacaoLitrosReferencia: number;
  formulaUsada: string;
  variaveisEntraramCalculo: string[];
  modoSeguroEducativo: boolean;
  avisosSeguranca: string[];
  analisePesoDesejado?: string;
}

export type FoodCategory =
  | 'cereais_tuberculos'
  | 'leguminosas'
  | 'proteinas_animais'
  | 'laticinios_ovos'
  | 'frutas'
  | 'verduras_legumes'
  | 'oleos_gorduras_sementes'
  | 'proteinas_vegetais';

export interface FoodItem {
  id: string;
  nome: string;
  apelidos: string[];
  categoria: FoodCategory;
  fonteNutricional: 'TACO 4ª Ed. (UNICAMP)' | 'TBCA (USP)' | 'Estimativa Culinária Padronizada';
  // Valores por 100g de parte comestível pronta para consumo
  kcalPor100g: number;
  proteinaPor100g: number;
  carboidratoPor100g: number;
  gorduraPor100g: number;
  fibraPor100g: number;
  medidaCaseiraNome: string;
  gramasPorMedidaCaseira: number;
  precoEstimadoPorKgBRL: number; // Estimativa média de referência no Brasil (identificada como aproximada)
  acessivelEconomico: boolean;
  sazonalOuEstacao: boolean;
  tempoPreparoMin: number;
  requerFogao: boolean;
  alergenos: AllergenOrRestriction[];
  vegano: boolean;
  vegetariano: boolean;
  substitutosIds: string[];
}

export interface MealIngredient {
  foodId: string;
  nome: string;
  quantidadeGramas: number;
  medidaCaseiraTexto: string;
  kcal: number;
  proteinas: number;
  carboidratos: number;
  gorduras: number;
  fibras: number;
  custoEstimadoBRL: number;
  disponivelEmCasaGramas: number;
  faltaComprarGramas: number;
  substituicoesPossiveis: {
    foodId: string;
    nome: string;
    quantidadeEquivalenteGramas: number;
    medidaCaseiraTexto: string;
    custoEstimadoBRL: number;
    economiaBRL: number;
  }[];
}

export interface PlannedMeal {
  id: string;
  slotIndex: number;
  tituloSlot: string; // Café da Manhã, Almoço, Lanche, Jantar, etc.
  horarioSugerido: string;
  nomeRefeicao: string;
  ingredientes: MealIngredient[];
  modoPreparo: string[];
  tempoEstimadoMin: number;
  caloriasTotais: number;
  proteinasTotais: number;
  carboidratosTotais: number;
  gordurasTotais: number;
  fibrasTotais: number;
  custoEstimadoTotalBRL: number;
  consumidaHoje: boolean;
  alternativasRefeicao: {
    id: string;
    nomeRefeicao: string;
    descricaoCurta: string;
    foodIdsBase: { foodId: string; proporcao: number }[];
  }[];
}

export interface DietPlan {
  id: string;
  criadoEmISO: string;
  modoEconomico: boolean;
  refeicoes: PlannedMeal[];
  totaisPlano: {
    calorias: number;
    proteinas: number;
    carboidratos: number;
    gorduras: number;
    fibras: number;
    custoDiarioEstimadoBRL: number;
    custoSemanalEstimadoBRL: number;
    custoMensalEstimadoBRL: number;
  };
  orcamentoDeclaradoDiarioBRL: number;
  orcamentoSuficiente: boolean;
  lacunasNutricionais: string[];
  explicacaoLimitacoes: string[];
  sugestoesBaixoCusto: string[];
}

export interface ShoppingListItem {
  id: string;
  foodId: string;
  nome: string;
  categoria: FoodCategory;
  quantidadeNecessariaGramas: number;
  quantidadeEmCasaGramas: number;
  quantidadeFaltanteGramas: number;
  quantidadeEditadaGramas?: number;
  comprado: boolean;
  prioridade: 'essencial' | 'opcional_complementar';
  custoEstimadoFaltanteBRL: number;
  precoPersonalizadoPorKgBRL?: number;
  substituicaoMaisBarata?: {
    foodId: string;
    nome: string;
    custoEstimadoBRL: number;
    economiaBRL: number;
  };
}

export interface ShoppingListPlan {
  periodoDias: 3 | 7 | 14;
  itens: ShoppingListItem[];
  custoTotalFaltanteEstimadoBRL: number;
  custoItensEssenciaisBRL: number;
  economiaPotencialSubstituicoesBRL: number;
  avisoPreciosEstimados: string;
}

export interface FoodDiaryEntry {
  id: string;
  dataISO: string; // YYYY-MM-DD
  slotRefeicao: string;
  foodId: string;
  nomeAlimento: string;
  quantidadeGramas: number;
  kcal: number;
  proteinas: number;
  carboidratos: number;
  gorduras: number;
  fibras: number;
  fonteNutricional: string;
  ehEstimativaManual: boolean;
}

export interface CustomRecipe {
  id: string;
  nome: string;
  tempoPreparoMin: number;
  modoPreparo: string;
  favoritaCombinacao: boolean;
  ingredientes: {
    foodId: string;
    nome: string;
    quantidadeGramas: number;
  }[];
  totais: {
    kcal: number;
    proteinas: number;
    carboidratos: number;
    gorduras: number;
    fibras: number;
  };
}

export interface ExerciseDefinition {
  id: string;
  nome: string;
  categoria: 'forca' | 'hipertrofia' | 'condicionamento' | 'mobilidade' | 'aquecimento';
  grupoMuscularPrincipal: MuscleGroup;
  musculosSecundarios: string[];
  equipamentosNecessarios: EquipmentType[];
  locaisCompativeis: TrainingLocation[];
  nivelMinimo: ExperienceLevel;
  evitarEmLimitacoes: MovementLimitation[];
  seriesRecomendadas: number;
  repeticoesRecomendadas: string;
  descansoSegundos: number;
  instrucoesExecucao: string[];
  dicaSeguranca: string;
  referenciaTecnica: string;
  substitutosCompativeisIds: string[];
}

export interface WorkoutExercisePlan {
  exerciseId: string;
  nome: string;
  grupoMuscularPrincipal: MuscleGroup;
  series: number;
  repeticoes: string;
  descansoSegundos: number;
  cargaSugeridaKg?: number;
  concluidoHoje?: boolean;
  observacaoProgressao: string;
}

export interface WorkoutDay {
  id: string;
  codigoDia: string; // Treino A, Treino B, etc.
  titulo: string;
  foco: string;
  duracaoEstimadaMin: number;
  aquecimento: string[];
  exercicios: WorkoutExercisePlan[];
  mobilidadePosTreino: string[];
}

export interface WorkoutPlan {
  id: string;
  tituloPlano: string;
  descricao: string;
  frequenciaSemanal: number;
  avisoSeguranca: string;
  dias: WorkoutDay[];
}

export interface LoggedSet {
  numeroSerie: number;
  repeticoesFeitas: number;
  cargaKg: number;
  rpePercebido?: number;
  concluida: boolean;
}

export interface WorkoutSessionLog {
  id: string;
  dataISO: string;
  workoutDayId: string;
  tituloTreino: string;
  duracaoRealSegundos: number;
  exerciciosRealizados: {
    exerciseId: string;
    nome: string;
    series: LoggedSet[];
  }[];
  notasSessao: string;
}

export interface BodyMeasurementEntry {
  id: string;
  dataISO: string;
  pesoKg: number;
  cinturaCm?: number;
  quadrilCm?: number;
  bracoCm?: number;
  peitoCm?: number;
  coxaCm?: number;
  fotoReferenciaUrl?: string; // DataURL local opcional
  notaPessoal: string;
}

export interface AssistantActionProposal {
  tipo:
    | 'atualizar_orcamento'
    | 'trocar_refeicao'
    | 'adicionar_despensa'
    | 'remover_alimento_nao_gosta'
    | 'mudar_objetivo'
    | 'gerar_treino_rapido'
    | 'registrar_refeicao_extra';
  resumoAcao: string;
  parametros: Record<string, unknown>;
  executada: boolean;
}

export interface AssistantMessage {
  id: string;
  remetente: 'usuario' | 'assistente';
  texto: string;
  criadoEmISO: string;
  origem: 'ia_remota_gemini' | 'motor_local_deterministico';
  propostaAcao?: AssistantActionProposal;
}

export interface AuditChangeEntry {
  id: string;
  dataISO: string;
  modulo: string;
  descricao: string;
}

export interface PulseDatabaseState {
  versaoSchema: number;
  onboardingConcluido: boolean;
  etapaOnboardingAtual: number;
  perfil: UserProfile;
  metasNutricionais: NutritionTargets;
  planoAlimentar: DietPlan;
  listaCompras: ShoppingListPlan;
  diarioAlimentar: FoodDiaryEntry[];
  receitasPersonalizadas: CustomRecipe[];
  planoTreino: WorkoutPlan;
  historicoTreinos: WorkoutSessionLog[];
  historicoMedidas: BodyMeasurementEntry[];
  mensagensAssistente: AssistantMessage[];
  sequenciaHabitosDias: number;
  historicoAlteracoes: AuditChangeEntry[];
}
