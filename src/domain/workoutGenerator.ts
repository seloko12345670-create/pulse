import { EXERCISE_DATABASE, findExerciseById } from './exerciseDatabase';
import {
  ExerciseDefinition,
  UserProfile,
  WorkoutDay,
  WorkoutExercisePlan,
  WorkoutPlan,
} from './types';

/**
 * Gerador Personalizado de Treinos do PULSE
 * Adapta divisão semanal, volume, equipamentos e limitações articulares/movimento.
 */

export function isExerciseCompatibleWithProfile(
  ex: ExerciseDefinition,
  perfil: UserProfile
): boolean {
  // 1. Verificar limitações de movimento declaradas pelo usuário
  for (const lim of perfil.limitacoesMovimento) {
    if (lim !== 'nenhuma' && ex.evitarEmLimitacoes.includes(lim)) {
      return false;
    }
  }

  // 2. Verificar local de treino e equipamentos disponíveis
  if (perfil.localTreino === 'academia') {
    return true; // Academia possui máquinas, halteres e peso corporal
  }

  const equipsUsuario = new Set(perfil.equipamentosDisponiveis);
  equipsUsuario.add('nenhum'); // Peso corporal sempre disponível

  return ex.equipamentosNecessarios.every((req) => equipsUsuario.has(req));
}

function mapExerciseToPlanItem(
  ex: ExerciseDefinition,
  perfil: UserProfile
): WorkoutExercisePlan {
  const seriesBase =
    perfil.nivelExperiencia === 'iniciante'
      ? Math.max(2, ex.seriesRecomendadas - 1)
      : perfil.nivelExperiencia === 'avancado'
      ? ex.seriesRecomendadas + 1
      : ex.seriesRecomendadas;

  const seriesAjustadasTempo =
    perfil.tempoSessaoMinutos <= 30 ? Math.max(2, seriesBase - 1) : seriesBase;

  return {
    exerciseId: ex.id,
    nome: ex.nome,
    grupoMuscularPrincipal: ex.grupoMuscularPrincipal,
    series: seriesAjustadasTempo,
    repeticoes: ex.repeticoesRecomendadas,
    descansoSegundos: ex.descansoSegundos,
    cargaSugeridaKg: ex.equipamentosNecessarios.includes('nenhum') ? 0 : 8,
    concluidoHoje: false,
    observacaoProgressao:
      'Mantenha 1 a 2 repetições na reserva (RPE 7–8). Só aumente a carga de forma gradual (5% a 10%) quando completar todas as séries com técnica limpa.',
  };
}

export function generateWorkoutPlan(perfil: UserProfile): WorkoutPlan {
  const compativeis = EXERCISE_DATABASE.filter((ex) =>
    isExerciseCompatibleWithProfile(ex, perfil)
  );
  // Se restrições filtrarem demais, garante exercícios de peso corporal de baixo impacto
  const poolSegura =
    compativeis.length >= 4
      ? compativeis
      : EXERCISE_DATABASE.filter((ex) => ex.evitarEmLimitacoes.length === 0);

  const diasSemana = Math.min(6, Math.max(1, perfil.diasTreinoPorSemana || 3));
  const duracaoSessao = perfil.tempoSessaoMinutos || 45;
  const maxExerciciosPorSessao = duracaoSessao <= 25 ? 4 : duracaoSessao <= 40 ? 5 : 6;

  const porGrupo = (grupos: ExerciseDefinition['grupoMuscularPrincipal'][]) =>
    poolSegura.filter((ex) => grupos.includes(ex.grupoMuscularPrincipal));

  const aquecimentoPadrao = [
    '3 min de marcha estacionária leve ou mobilidade articular dinâmica',
    '15 círculos escapulares e rotações suaves de tronco sem dor',
    '1 série de reconhecimento com 50% da carga habitual no primeiro exercício',
  ];

  const mobilidadePosPadrao = [
    'Alongamento suave de peitoral, dorsal e flexores de quadril (30s por posição)',
    'Respiração diafragmática lenta por 2 minutos para retorno à calma',
  ];

  const dias: WorkoutDay[] = [];

  if (diasSemana <= 3) {
    // Divisão Full Body (Corpo Inteiro equilibrado A / B / C)
    const codigos = ['Treino A', 'Treino B', 'Treino C'].slice(0, diasSemana);
    codigos.forEach((codigo, idx) => {
      const peito = porGrupo(['peito'])[idx % Math.max(1, porGrupo(['peito']).length)];
      const costas = porGrupo(['costas'])[idx % Math.max(1, porGrupo(['costas']).length)];
      const quadriceps =
        porGrupo(['pernas_quadriceps'])[idx % Math.max(1, porGrupo(['pernas_quadriceps']).length)];
      const posterior =
        porGrupo(['posterior_gluteos'])[idx % Math.max(1, porGrupo(['posterior_gluteos']).length)];
      const ombrosBracos =
        porGrupo(['ombros', 'biceps_triceps'])[
          idx % Math.max(1, porGrupo(['ombros', 'biceps_triceps']).length)
        ];
      const core =
        porGrupo(['core_abdomen', 'corpo_todo'])[
          idx % Math.max(1, porGrupo(['core_abdomen', 'corpo_todo']).length)
        ];

      const selecionados = [peito, costas, quadriceps, posterior, ombrosBracos, core]
        .filter((e): e is ExerciseDefinition => Boolean(e))
        .slice(0, maxExerciciosPorSessao);

      dias.push({
        id: `workout_day_${idx + 1}`,
        codigoDia: codigo,
        titulo: `${codigo} — Corpo Inteiro Funcional & Força`,
        foco: 'Estímulo global equilibrado com recuperação ideal entre sessões',
        duracaoEstimadaMin: duracaoSessao,
        aquecimento: aquecimentoPadrao,
        exercicios: selecionados.map((ex) => mapExerciseToPlanItem(ex, perfil)),
        mobilidadePosTreino: mobilidadePosPadrao,
      });
    });
  } else {
    // Divisão Upper / Lower (Superior / Inferior) para 4 a 6 dias
    const templates = [
      {
        codigo: 'Treino A',
        titulo: 'Treino A — Membros Superiores (Empurrar & Puxar)',
        foco: 'Peitoral, Costas, Ombros e Braços',
        grupos: ['peito', 'costas', 'ombros', 'biceps_triceps'] as ExerciseDefinition['grupoMuscularPrincipal'][],
      },
      {
        codigo: 'Treino B',
        titulo: 'Treino B — Membros Inferiores & Core Estabilizador',
        foco: 'Quadríceps, Glúteos, Posteriores e Abdômen',
        grupos: ['pernas_quadriceps', 'posterior_gluteos', 'core_abdomen'] as ExerciseDefinition['grupoMuscularPrincipal'][],
      },
      {
        codigo: 'Treino C',
        titulo: 'Treino C — Condicionamento, Mobilidade & Pontos Focais',
        foco: 'Foco nos grupos prioritários + saúde cardiorrespiratória',
        grupos: [
          ...perfil.gruposMuscularesFoco,
          'corpo_todo',
          'core_abdomen',
        ] as ExerciseDefinition['grupoMuscularPrincipal'][],
      },
    ];

    for (let i = 0; i < diasSemana; i++) {
      const tpl = templates[i % templates.length];
      const candidatos = porGrupo(tpl.grupos);
      const listaFinal = (candidatos.length >= 3 ? candidatos : poolSegura).slice(
        0,
        maxExerciciosPorSessao
      );

      dias.push({
        id: `workout_day_${i + 1}`,
        codigoDia: `Dia ${i + 1} (${tpl.codigo})`,
        titulo: tpl.titulo,
        foco: tpl.foco,
        duracaoEstimadaMin: duracaoSessao,
        aquecimento: aquecimentoPadrao,
        exercicios: listaFinal.map((ex) => mapExerciseToPlanItem(ex, perfil)),
        mobilidadePosTreino: mobilidadePosPadrao,
      });
    }
  }

  let avisoSeguranca =
    'Progressão responsável: evite treinar até a falha concêntrica em todas as séries e nunca realize saltos bruscos de carga.';
  if (
    perfil.limitacoesMovimento.some((l) => l !== 'nenhuma') ||
    perfil.observacoesTreino.trim().length > 0
  ) {
    avisoSeguranca =
      'Seu treino foi filtrado para respeitar as limitações informadas. Caso sinta dor articular aguda ou persistente durante qualquer movimento, interrompa o exercício imediatamente e busque avaliação de médico do esporte, fisioterapeuta ou profissional de Educação Física.';
  }

  const localTexto =
    perfil.localTreino === 'academia'
      ? 'Academia'
      : perfil.localTreino === 'casa'
      ? 'Em Casa'
      : 'Ao Ar Livre';

  return {
    id: `wplan_${Date.now()}`,
    tituloPlano: `Programa PULSE ${localTexto} (${diasSemana}x/semana)`,
    descricao: `Adaptado para nível ${perfil.nivelExperiencia}, sessões de ~${duracaoSessao} min e objetivo de ${perfil.objetivoPrincipal.replace('_', ' ')}.`,
    frequenciaSemanal: diasSemana,
    avisoSeguranca,
    dias,
  };
}

export function swapExerciseInWorkoutDay(
  planoAtual: WorkoutPlan,
  workoutDayId: string,
  oldExerciseId: string,
  newExerciseId: string,
  perfil: UserProfile
): WorkoutPlan {
  const novoDef = findExerciseById(newExerciseId);
  if (!novoDef) return planoAtual;

  return {
    ...planoAtual,
    dias: planoAtual.dias.map((dia) => {
      if (dia.id !== workoutDayId) return dia;
      return {
        ...dia,
        exercicios: dia.exercicios.map((exItem) =>
          exItem.exerciseId === oldExerciseId
            ? mapExerciseToPlanItem(novoDef, perfil)
            : exItem
        ),
      };
    }),
  };
}
