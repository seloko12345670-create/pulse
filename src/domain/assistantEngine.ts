import { findFoodById, matchFoodFromNaturalName } from './foodDatabase';
import {
  AssistantActionProposal,
  AssistantMessage,
  PulseDatabaseState,
} from './types';
import { calculateNutritionTargets } from './nutritionCalculator';
import {
  generateDietPlan,
  generateShoppingList,
  swapMealInPlan,
} from './dietGenerator';
import { generateWorkoutPlan } from './workoutGenerator';

/**
 * Motor Conversacional Determinístico Local do PULSE AI
 * Funciona 100% offline e também serve como base estruturada para propostas de alteração no plano real.
 */

export function generateLocalAssistantResponse(
  mensagemUsuario: string,
  estado: PulseDatabaseState
): {
  textoResposta: string;
  propostaAcao?: AssistantActionProposal;
} {
  const texto = mensagemUsuario.trim().toLowerCase();
  const { perfil, metasNutricionais, planoAlimentar, listaCompras } = estado;
  const itensDespensaNomes =
    perfil.despensa.map((d) => `${d.nome} (${d.quantidadeGramas}g)`).join(', ') ||
    'nenhum item cadastrado ainda';

  // 1. Caso de Orçamento de Emergência ("Só tenho R$ 20 para comida até amanhã" / "pouco dinheiro")
  const matchReais = texto.match(/r\$\s*(\d+(?:[.,]\d+)?)|tenho\s+(\d+)\s*reais/);
  if (
    matchReais ||
    texto.includes('pouco dinheiro') ||
    texto.includes('sem dinheiro') ||
    texto.includes('orçamento') ||
    texto.includes('orcamento')
  ) {
    const valorDetectado = matchReais
      ? Number((matchReais[1] || matchReais[2]).replace(',', '.'))
      : 15;

    return {
      textoResposta:
        `Analisei seu perfil atual (meta de **${metasNutricionais.caloriasMetaKcal} kcal** e **${metasNutricionais.proteinasGramas}g de proteína**) e sua despensa em casa (${itensDespensaNomes}).\n\n` +
        `Com **R$ ${valorDetectado.toFixed(2)}** disponíveis:\n` +
        `1. **Priorize 100% do que já está na sua despensa** para não gastar com o que já tem.\n` +
        `2. **Foco de compra imediata (preços médios aproximados)**: 1 dúzia de ovos (~R$ 10–12, rende 6 refeições proteicas) + 1 kg de banana ou pacote de flocão de milho/aveia (~R$ 5–7).\n` +
        `3. Posso ativar o **Modo Econômico Restrito** com orçamento ajustado para R$ ${valorDetectado.toFixed(2)}/dia e recalcular suas refeições agora mesmo. Deseja aplicar essa atualização no seu plano?`,
      propostaAcao: {
        tipo: 'atualizar_orcamento',
        resumoAcao: `Ajustar orçamento diário para R$ ${valorDetectado.toFixed(2)}, ativar Modo Econômico e recalcular plano alimentar`,
        parametros: {
          orcamentoValor: valorDetectado,
          orcamentoPeriodo: 'dia',
          modoEconomicoAtivo: true,
        },
        executada: false,
      },
    };
  }

  // 2. Caso "Tenho ovos e arroz. O que consigo preparar?" / consulta de ingredientes em casa
  if (
    texto.includes('o que consigo preparar') ||
    texto.includes('tenho ovos') ||
    texto.includes('tenho arroz') ||
    texto.includes('com o que tenho')
  ) {
    const arroz = findFoodById('arroz_branco_cozido')!;
    const ovo = findFoodById('ovo_galinha_cozido')!;
    const feijao = findFoodById('feijao_carioca_cozido')!;
    const kcalCombinacao = Math.round(
      arroz.kcalPor100g * 1.8 + ovo.kcalPor100g * 1.5 + feijao.kcalPor100g * 1.0
    );
    const protCombinacao = (
      arroz.proteinaPor100g * 1.8 +
      ovo.proteinaPor100g * 1.5 +
      feijao.proteinaPor100g * 1.0
    ).toFixed(1);

    return {
      textoResposta:
        `Consultei a base TACO/UNICAMP e sua despensa atual (${itensDespensaNomes}):\n\n` +
        `• **Prato Rápido Proteico (Arroz + Ovos Mexidos Cremosos)**:\n` +
        `  - **180g de arroz cozido** (4 colheres de servir) + **3 ovos médios (150g)** (+ 100g de feijão se tiver).\n` +
        `  - **Total nutricional**: ~**${kcalCombinacao} kcal** e **${protCombinacao}g de proteínas** de alto valor biológico.\n` +
        `  - **Modo de preparo (10 min)**: Aqueça o arroz com alho/cebola, adicione os ovos batidos em fogo baixo mexendo até ficarem úmidos.\n\n` +
        `Quer que eu registre esses ingredientes na sua despensa e recalcule o plano alimentar priorizando eles?`,
      propostaAcao: {
        tipo: 'adicionar_despensa',
        resumoAcao: 'Garantir Ovos e Arroz na despensa e recalcular o plano alimentar do dia',
        parametros: {
          foodIds: ['arroz_branco_cozido', 'ovo_galinha_cozido'],
        },
        executada: false,
      },
    };
  }

  // 3. Caso "Troca meu almoço por uma opção sem frango" ou trocar refeição
  if (texto.includes('troca') || texto.includes('sem frango') || texto.includes('substituir')) {
    const almoco =
      planoAlimentar.refeicoes.find((r) => r.tituloSlot.toLowerCase().includes('almoço')) ??
      planoAlimentar.refeicoes[1] ??
      planoAlimentar.refeicoes[0];

    return {
      textoResposta:
        `Verifiquei seu **${almoco?.tituloSlot ?? 'Almoço'}** atual (*${almoco?.nomeRefeicao}* — ${almoco?.caloriasTotais} kcal).\n\n` +
        `Posso trocar imediatamente por **Arroz, Feijão, Ovos e Legumes da Estação** (sem frango, mantendo o aporte proteico e energético equivalente) e recalcular sua Lista de Compras. Confirma a alteração?`,
      propostaAcao: {
        tipo: 'trocar_refeicao',
        resumoAcao: `Trocar ${almoco?.tituloSlot ?? 'Almoço'} por opção sem frango (Ovos + Feijão + Arroz)`,
        parametros: {
          mealId: almoco?.id ?? 'meal_2',
          alternativeId: 'alt_princ_1',
        },
        executada: false,
      },
    };
  }

  // 4. Caso "Não gosto de leite. Quais alternativas posso usar?"
  if (texto.includes('não gosto de') || texto.includes('nao gosto de') || texto.includes('alternativas')) {
    const mencionaLeite = texto.includes('leite');
    const alimentoEvitar = mencionaLeite ? 'leite' : 'alimento citado';
    return {
      textoResposta:
        `Entendido! Você nunca precisa consumir alimentos que não gosta no PULSE.\n\n` +
        (mencionaLeite
          ? `Para substituir o **leite** conforme seu objetivo (${perfil.objetivoPrincipal.replace('_', ' ')}):\n` +
            `• **Para proteína e cálcio**: Iogurte natural integral (170g = 7g proteína) ou Queijo minas frescal.\n` +
            `• **Se preferir zero laticínios**: Mingau de aveia preparado com água + banana amassada + 1 colher de pasta de amendoim ou ovos mexidos à parte.\n\n`
          : `Posso adicionar esse item à sua lista de alimentos que não come e regerar seu cardápio sem ele.\n\n`) +
        `Deseja adicionar **"${alimentoEvitar}"** à sua lista de exclusão e atualizar seu plano alimentar agora?`,
      propostaAcao: {
        tipo: 'remover_alimento_nao_gosta',
        resumoAcao: `Adicionar "${alimentoEvitar}" aos alimentos que não come e recalcular plano alimentar`,
        parametros: {
          alimentoExcluido: alimentoEvitar,
        },
        executada: false,
      },
    };
  }

  // 5. Caso "Tenho 30 minutos para treinar" / "Preciso de um treino para fazer em casa"
  if (texto.includes('treino') || texto.includes('treinar') || texto.includes('minutos')) {
    const emCasa = texto.includes('casa');
    const matchMin = texto.match(/(\d+)\s*min/);
    const minutos = matchMin ? Number(matchMin[1]) : 30;
    const novoLocal = emCasa ? 'casa' : perfil.localTreino;

    return {
      textoResposta:
        `Consultei sua ficha atual (${estado.planoTreino.tituloPlano}) e suas limitações (${perfil.limitacoesMovimento.join(', ')}).\n\n` +
        `Para uma sessão eficiente de **${minutos} minutos** ${emCasa ? '**em casa**' : ''}:\n` +
        `• Focaremos em **4 exercícios compostos** em formato dinâmico (descanso controlado de 60s), preservando a qualidade técnica sem pressa e sem treinar até a exaustão.\n\n` +
        `Quer que eu atualize seu plano de treino ativo para sessões de **${minutos} min (${novoLocal === 'casa' ? 'Em Casa' : 'Local atual'})**?`,
      propostaAcao: {
        tipo: 'gerar_treino_rapido',
        resumoAcao: `Adaptar plano de treino para ${minutos} min (${novoLocal === 'casa' ? 'Em Casa' : perfil.localTreino})`,
        parametros: {
          tempoSessaoMinutos: minutos,
          localTreino: novoLocal,
        },
        executada: false,
      },
    };
  }

  // 6. Caso "Não consegui seguir a dieta hoje. Como posso ajustar o restante do dia?"
  if (texto.includes('não consegui seguir') || texto.includes('furei a dieta') || texto.includes('ajustar o restante')) {
    return {
      textoResposta:
        `Fique tranquilo(a): um episódio fora do planejado não anula sua evolução. **Jamais faça jejum punitivo ou corte drástico de calorias** para compensar.\n\n` +
        `**Como ajustar o restante de hoje com equilíbrio:**\n` +
        `1. **Hidratação**: Beba água normalmente ao longo das próximas horas (sua referência diária é ~${metasNutricionais.hidratacaoLitrosReferencia}L).\n` +
        `2. **Próxima refeição normal**: Volte imediatamente para sua próxima refeição planejada priorizando proteínas magras (ovos, frango ou feijão) e vegetais/fibras para estabilizar a saciedade.\n` +
        `3. **Sem culpa**: A consistência semanal importa muito mais do que um único dia perfeito.`,
    };
  }

  // 7. Caso "Monta uma lista de compras econômica"
  if (texto.includes('lista de compras') || texto.includes('mercado')) {
    const faltantes = listaCompras.itens.filter((i) => !i.comprado && i.quantidadeFaltanteGramas > 0);
    const resumoItens =
      faltantes
        .slice(0, 5)
        .map((i) => `• ${i.nome}: ${i.quantidadeFaltanteGramas}g (~R$ ${i.custoEstimadoFaltanteBRL.toFixed(2)})`)
        .join('\n') || '• Todos os ingredientes principais já constam na sua despensa!';

    return {
      textoResposta:
        `Aqui está o resumo da sua **Lista de Compras Econômica (${listaCompras.periodoDias} dias)** descontando o que você já tem em casa:\n\n` +
        `${resumoItens}\n\n` +
        `• **Custo estimado dos itens essenciais faltantes**: R$ ${listaCompras.custoItensEssenciaisBRL.toFixed(2)} *(estimativa média nacional)*.\n` +
        `• **Economia potencial com substituições sugeridas**: R$ ${listaCompras.economiaPotencialSubstituicoesBRL.toFixed(2)}.\n\n` +
        `Você pode abrir a tela **Lista de Compras** na aba Dieta para editar preços locais ou marcar itens comprados.`,
    };
  }

  // 8. Caso "Quero mudar meu objetivo"
  if (texto.includes('mudar meu objetivo') || texto.includes('mudar objetivo')) {
    const novoObj = texto.includes('massa')
      ? 'ganhar_massa'
      : texto.includes('emagrecer')
      ? 'emagrecer'
      : 'recomposicao_corporal';

    return {
      textoResposta:
        `Seu objetivo atual está configurado como **${perfil.objetivoPrincipal.replace('_', ' ')}** (${metasNutricionais.caloriasMetaKcal} kcal/dia).\n\n` +
        `Posso alterar seu objetivo principal para **${novoObj.replace('_', ' ')}**, recalcular suas metas energéticas, macronutrientes, plano alimentar e treino. Deseja confirmar?`,
      propostaAcao: {
        tipo: 'mudar_objetivo',
        resumoAcao: `Alterar objetivo principal para "${novoObj.replace('_', ' ')}" e recalcular plano completo`,
        parametros: {
          objetivoPrincipal: novoObj,
        },
        executada: false,
      },
    };
  }

  // Resposta padrão contextualizada com dados reais do usuário
  return {
    textoResposta:
      `Estou analisando seu contexto atual no PULSE:\n` +
      `• **Objetivo**: ${perfil.objetivoPrincipal.replace('_', ' ')} (${metasNutricionais.caloriasMetaKcal} kcal | P: ${metasNutricionais.proteinasGramas}g | C: ${metasNutricionais.carboidratosGramas}g | G: ${metasNutricionais.gordurasGramas}g)\n` +
      `• **Despensa em casa**: ${itensDespensaNomes}\n` +
      `• **Custo estimado do plano atual**: R$ ${planoAlimentar.totaisPlano.custoDiarioEstimadoBRL.toFixed(2)}/dia\n\n` +
      `Você pode me pedir ações diretas como:\n` +
      `- *"Só tenho R$ 20 para comida até amanhã"*\n` +
      `- *"Tenho ovos e arroz. O que consigo preparar?"*\n` +
      `- *"Troca meu almoço por uma opção sem frango"*\n` +
      `- *"Tenho 30 minutos para treinar em casa"*`,
  };
}

/**
 * Executa de verdade uma proposta de ação confirmada pelo usuário no banco de dados do PULSE
 */
export function executeAssistantAction(
  estadoAtual: PulseDatabaseState,
  proposta: AssistantActionProposal
): PulseDatabaseState {
  let novoPerfil = { ...estadoAtual.perfil };
  let novasMetas = estadoAtual.metasNutricionais;
  let novoPlanoAlimentar = estadoAtual.planoAlimentar;
  let novoPlanoTreino = estadoAtual.planoTreino;
  let descricaoAuditoria = proposta.resumoAcao;

  switch (proposta.tipo) {
    case 'atualizar_orcamento': {
      novoPerfil = {
        ...novoPerfil,
        orcamentoValor: Number(proposta.parametros.orcamentoValor ?? 15),
        orcamentoPeriodo: (proposta.parametros.orcamentoPeriodo as 'dia' | 'semana' | 'mes') ?? 'dia',
        modoEconomicoAtivo: true,
        semDinheiroExtraCompras: Number(proposta.parametros.orcamentoValor ?? 15) === 0,
      };
      novasMetas = calculateNutritionTargets(novoPerfil);
      novoPlanoAlimentar = generateDietPlan(novoPerfil, novasMetas);
      break;
    }
    case 'adicionar_despensa': {
      const foodIds = (proposta.parametros.foodIds as string[]) ?? ['arroz_branco_cozido', 'ovo_galinha_cozido'];
      const despensaAtualizada = [...novoPerfil.despensa];
      for (const fid of foodIds) {
        const food = findFoodById(fid) ?? matchFoodFromNaturalName(fid);
        if (!food) continue;
        const existente = despensaAtualizada.find((d) => d.foodId === food.id);
        if (existente) {
          existente.quantidadeGramas = Math.max(existente.quantidadeGramas, 600);
        } else {
          despensaAtualizada.push({
            id: `pantry_${food.id}`,
            foodId: food.id,
            nome: food.nome,
            quantidadeGramas: 600,
            medidaAproximada: 'Estoque disponível em casa',
            jaComprado: true,
          });
        }
      }
      novoPerfil = { ...novoPerfil, despensa: despensaAtualizada };
      novoPlanoAlimentar = generateDietPlan(novoPerfil, novasMetas);
      break;
    }
    case 'trocar_refeicao': {
      const mealId = String(proposta.parametros.mealId ?? 'meal_2');
      const alternativeId = String(proposta.parametros.alternativeId ?? 'alt_princ_1');
      novoPlanoAlimentar = swapMealInPlan(
        estadoAtual.planoAlimentar,
        mealId,
        alternativeId,
        novoPerfil,
        novasMetas
      );
      break;
    }
    case 'remover_alimento_nao_gosta': {
      const excluido = String(proposta.parametros.alimentoExcluido ?? 'leite');
      const naoCome = Array.from(new Set([...novoPerfil.alimentosNaoCome, excluido]));
      novoPerfil = { ...novoPerfil, alimentosNaoCome: naoCome };
      novoPlanoAlimentar = generateDietPlan(novoPerfil, novasMetas);
      break;
    }
    case 'mudar_objetivo': {
      const novoObj = (proposta.parametros.objetivoPrincipal as UserProfile['objetivoPrincipal']) ?? 'recomposicao_corporal';
      novoPerfil = { ...novoPerfil, objetivoPrincipal: novoObj };
      novasMetas = calculateNutritionTargets(novoPerfil);
      novoPlanoAlimentar = generateDietPlan(novoPerfil, novasMetas);
      novoPlanoTreino = generateWorkoutPlan(novoPerfil);
      break;
    }
    case 'gerar_treino_rapido': {
      const min = Number(proposta.parametros.tempoSessaoMinutos ?? 30);
      const local = (proposta.parametros.localTreino as UserProfile['localTreino']) ?? novoPerfil.localTreino;
      novoPerfil = {
        ...novoPerfil,
        tempoSessaoMinutos: min,
        localTreino: local,
      };
      novoPlanoTreino = generateWorkoutPlan(novoPerfil);
      break;
    }
    default:
      break;
  }

  const novaListaCompras = generateShoppingList(
    novoPlanoAlimentar,
    novoPerfil,
    estadoAtual.listaCompras.periodoDias
  );

  const confirmacaoMsg: AssistantMessage = {
    id: `msg_${Date.now()}_confirm`,
    remetente: 'assistente',
    texto: `Pronto! Executei a atualização no seu aplicativo: **${descricaoAuditoria}**. Seus planos e lista de compras já foram recalculados.`,
    criadoEmISO: new Date().toISOString(),
    origem: 'motor_local_deterministico',
  };

  return {
    ...estadoAtual,
    perfil: novoPerfil,
    metasNutricionais: novasMetas,
    planoAlimentar: novoPlanoAlimentar,
    listaCompras: novaListaCompras,
    planoTreino: novoPlanoTreino,
    mensagensAssistente: estadoAtual.mensagensAssistente
      .map((m) =>
        m.propostaAcao && m.propostaAcao.resumoAcao === proposta.resumoAcao
          ? { ...m, propostaAcao: { ...m.propostaAcao, executada: true } }
          : m
      )
      .concat(confirmacaoMsg),
    historicoAlteracoes: [
      {
        id: `audit_${Date.now()}`,
        dataISO: new Date().toISOString(),
        modulo: 'PULSE AI',
        descricao: descricaoAuditoria,
      },
      ...estadoAtual.historicoAlteracoes,
    ],
  };
}
