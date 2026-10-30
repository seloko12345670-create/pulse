import { calculateNutritionTargets } from './nutritionCalculator';
import { generateDietPlan, generateShoppingList } from './dietGenerator';
import { generateWorkoutPlan } from './workoutGenerator';
import { PulseDatabaseState, UserProfile } from './types';

const STORAGE_KEY = 'pulse_app_database_v1';
const CURRENT_SCHEMA_VERSION = 1;

export function createDefaultUserProfile(): UserProfile {
  return {
    nome: 'Alex',
    idade: 28,
    alturaCm: 172,
    pesoAtualKg: 74.5,
    pesoDesejadoKg: 70,
    variavelFisiologica: 'estimativa_media',
    nivelAtividade: 'moderadamente_ativo',
    condicoesSaude: ['nenhuma'],
    observacoesSaude: '',

    objetivoPrincipal: 'recomposicao_corporal',
    objetivoSecundario: 'economizar_mercado',

    treinaAtualmente: true,
    nivelExperiencia: 'iniciante',
    diasTreinoPorSemana: 3,
    tempoSessaoMinutos: 45,
    localTreino: 'casa',
    equipamentosDisponiveis: ['halteres', 'nenhum'],
    gruposMuscularesFoco: ['peito', 'costas', 'pernas_quadriceps', 'posterior_gluteos'],
    limitacoesMovimento: ['nenhuma'],
    observacoesTreino: '',

    refeicoesPorDia: 4,
    padraoAlimentar: 'onivoro',
    alergiasRestricoes: [],
    alimentosFavoritos: ['arroz_branco_cozido', 'feijao_carioca_cozido', 'ovo_galinha_cozido', 'banana_prata', 'aveia_flocos'],
    alimentosNaoCome: [],
    tempoPreparoMinutos: 25,
    habitoCozinhar: 'cozinho_diariamente',
    utensiliosDisponiveis: ['Fogão', 'Panela', 'Frigideira antiaderente', 'Liquidificador'],

    orcamentoValor: 450,
    orcamentoPeriodo: 'mes',
    semDinheiroExtraCompras: false,
    modoEconomicoAtivo: true,
    despensa: [
      {
        id: 'p_arroz',
        foodId: 'arroz_branco_cozido',
        nome: 'Arroz branco cozido',
        quantidadeGramas: 1500,
        medidaAproximada: '1,5 kg em casa',
        jaComprado: true,
      },
      {
        id: 'p_feijao',
        foodId: 'feijao_carioca_cozido',
        nome: 'Feijão carioca cozido',
        quantidadeGramas: 1000,
        medidaAproximada: '1 kg em casa',
        jaComprado: true,
      },
      {
        id: 'p_ovos',
        foodId: 'ovo_galinha_cozido',
        nome: 'Ovos de galinha (cozidos ou mexidos sem óleo extra)',
        quantidadeGramas: 900,
        medidaAproximada: '18 unidades (~900g)',
        jaComprado: true,
      },
      {
        id: 'p_aveia',
        foodId: 'aveia_flocos',
        nome: 'Aveia em flocos',
        quantidadeGramas: 400,
        medidaAproximada: '1 caixa (400g)',
        jaComprado: true,
      },
      {
        id: 'p_banana',
        foodId: 'banana_prata',
        nome: 'Banana (prata ou nanica)',
        quantidadeGramas: 600,
        medidaAproximada: '1 penca média (~8 unidades)',
        jaComprado: true,
      },
    ],

    horarioAcordar: '06:30',
    horarioDormir: '22:30',
    horariosRefeicoes: ['07:30', '12:30', '16:30', '20:00'],
    horarioTreino: '18:00',
    diasRotinaConsistente: 5,
  };
}

export function buildInitialDatabaseState(onboardingConcluido = false): PulseDatabaseState {
  const perfil = createDefaultUserProfile();
  const metasNutricionais = calculateNutritionTargets(perfil);
  const planoAlimentar = generateDietPlan(perfil, metasNutricionais);
  const listaCompras = generateShoppingList(planoAlimentar, perfil, 7);
  const planoTreino = generateWorkoutPlan(perfil);

  const hojeISO = new Date().toISOString().slice(0, 10);

  return {
    versaoSchema: CURRENT_SCHEMA_VERSION,
    onboardingConcluido,
    etapaOnboardingAtual: 1,
    perfil,
    metasNutricionais,
    planoAlimentar,
    listaCompras,
    diarioAlimentar: [],
    receitasPersonalizadas: [
      {
        id: 'rec_panqueca_banana_aveia',
        nome: 'Panqueca Proteica de Banana, Aveia e Ovos',
        tempoPreparoMin: 8,
        modoPreparo:
          'Amasse 1 banana média, misture com 2 ovos e 2 colheres de sopa de aveia em flocos. Doure dos dois lados em frigideira antiaderente em fogo baixo.',
        favoritaCombinacao: true,
        ingredientes: [
          { foodId: 'banana_prata', nome: 'Banana (prata ou nanica)', quantidadeGramas: 75 },
          { foodId: 'ovo_galinha_cozido', nome: 'Ovos de galinha', quantidadeGramas: 100 },
          { foodId: 'aveia_flocos', nome: 'Aveia em flocos', quantidadeGramas: 30 },
        ],
        totais: {
          kcal: 338,
          proteinas: 18.4,
          carboidratos: 40.1,
          gorduras: 12.1,
          fibras: 4.2,
        },
      },
    ],
    planoTreino,
    historicoTreinos: [],
    historicoMedidas: [
      {
        id: 'med_inicial',
        dataISO: hojeISO,
        pesoKg: perfil.pesoAtualKg,
        cinturaCm: 84,
        quadrilCm: 98,
        bracoCm: 33,
        notaPessoal: 'Medida de ponto de partida registrada na configuração inicial.',
      },
    ],
    mensagensAssistente: [
      {
        id: 'msg_boas_vindas',
        remetente: 'assistente',
        texto:
          'Olá! Sou o **PULSE AI**, seu assistente de nutrição acessível e treinamento inteligente. Consulto sempre seu orçamento, os ingredientes que você já tem em casa e seu plano de treino antes de responder. Como posso te ajudar hoje?',
        criadoEmISO: new Date().toISOString(),
        origem: 'motor_local_deterministico',
      },
    ],
    sequenciaHabitosDias: 1,
    historicoAlteracoes: [
      {
        id: 'audit_init',
        dataISO: new Date().toISOString(),
        modulo: 'Sistema',
        descricao: 'Banco de dados local inicializado com base TACO/TBCA e biblioteca de exercícios.',
      },
    ],
  };
}

export function migrateDatabaseState(raw: Partial<PulseDatabaseState>): PulseDatabaseState {
  const base = buildInitialDatabaseState(Boolean(raw.onboardingConcluido));
  if (!raw || typeof raw !== 'object') return base;

  const perfilMesclado: UserProfile = {
    ...base.perfil,
    ...(raw.perfil ?? {}),
    despensa: Array.isArray(raw.perfil?.despensa) ? raw.perfil!.despensa : base.perfil.despensa,
    condicoesSaude: Array.isArray(raw.perfil?.condicoesSaude)
      ? raw.perfil!.condicoesSaude
      : base.perfil.condicoesSaude,
    alergiasRestricoes: Array.isArray(raw.perfil?.alergiasRestricoes)
      ? raw.perfil!.alergiasRestricoes
      : base.perfil.alergiasRestricoes,
    alimentosFavoritos: Array.isArray(raw.perfil?.alimentosFavoritos)
      ? raw.perfil!.alimentosFavoritos
      : base.perfil.alimentosFavoritos,
    alimentosNaoCome: Array.isArray(raw.perfil?.alimentosNaoCome)
      ? raw.perfil!.alimentosNaoCome
      : base.perfil.alimentosNaoCome,
    equipamentosDisponiveis: Array.isArray(raw.perfil?.equipamentosDisponiveis)
      ? raw.perfil!.equipamentosDisponiveis
      : base.perfil.equipamentosDisponiveis,
    gruposMuscularesFoco: Array.isArray(raw.perfil?.gruposMuscularesFoco)
      ? raw.perfil!.gruposMuscularesFoco
      : base.perfil.gruposMuscularesFoco,
    limitacoesMovimento: Array.isArray(raw.perfil?.limitacoesMovimento)
      ? raw.perfil!.limitacoesMovimento
      : base.perfil.limitacoesMovimento,
  };

  return {
    ...base,
    ...raw,
    versaoSchema: CURRENT_SCHEMA_VERSION,
    perfil: perfilMesclado,
  };
}

export function loadDatabaseState(): PulseDatabaseState {
  const isAutostart =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('autostart') === '1';

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const salvo = window.localStorage.getItem(STORAGE_KEY);
      if (salvo) {
        const parsed = JSON.parse(salvo);
        const migrated = migrateDatabaseState(parsed);
        if (isAutostart && !migrated.onboardingConcluido) {
          migrated.onboardingConcluido = true;
        }
        return migrated;
      }
    }
  } catch {
    // Em caso de falha de leitura, retorna estado inicial íntegro
  }

  return buildInitialDatabaseState(isAutostart);
}

export function saveDatabaseState(state: PulseDatabaseState): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  } catch {
    // Silencioso caso quota excedida
  }
}

export function clearAllPersonalData(): PulseDatabaseState {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Ignorar erro
  }
  return buildInitialDatabaseState(false);
}
