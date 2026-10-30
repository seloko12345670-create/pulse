import { NutritionTargets, UserProfile } from './types';

/**
 * Motor Determinístico de Cálculo Nutricional do PULSE
 * Separado da interface, 100% reproduzível e testável.
 */

export interface ProfileValidationResult {
  valido: boolean;
  erros: string[];
}

export function validateUserProfile(perfil: Partial<UserProfile>): ProfileValidationResult {
  const erros: string[] = [];

  if (perfil.idade === undefined || Number.isNaN(perfil.idade) || perfil.idade < 12 || perfil.idade > 110) {
    erros.push('Informe uma idade válida entre 12 e 110 anos.');
  }
  if (
    perfil.alturaCm === undefined ||
    Number.isNaN(perfil.alturaCm) ||
    perfil.alturaCm < 110 ||
    perfil.alturaCm > 240
  ) {
    erros.push('Informe uma altura válida entre 110 cm e 240 cm.');
  }
  if (
    perfil.pesoAtualKg === undefined ||
    Number.isNaN(perfil.pesoAtualKg) ||
    perfil.pesoAtualKg < 30 ||
    perfil.pesoAtualKg > 300
  ) {
    erros.push('Informe um peso atual válido entre 30 kg e 300 kg.');
  }
  if (
    perfil.pesoDesejadoKg !== undefined &&
    perfil.pesoDesejadoKg > 0 &&
    (perfil.pesoDesejadoKg < 35 || perfil.pesoDesejadoKg > 250)
  ) {
    erros.push('O peso desejado informado está fora de uma faixa fisiológica plausível (35 kg a 250 kg).');
  }
  if (perfil.orcamentoValor !== undefined && perfil.orcamentoValor < 0) {
    erros.push('O orçamento alimentar não pode ser negativo.');
  }
  if (
    perfil.refeicoesPorDia !== undefined &&
    (perfil.refeicoesPorDia < 2 || perfil.refeicoesPorDia > 7)
  ) {
    erros.push('O número de refeições por dia deve estar entre 2 e 7.');
  }

  return {
    valido: erros.length === 0,
    erros,
  };
}

const ACTIVITY_MULTIPLIERS: Record<UserProfile['nivelAtividade'], number> = {
  sedentario: 1.2,
  levemente_ativo: 1.375,
  moderadamente_ativo: 1.55,
  muito_ativo: 1.725,
  extremamente_ativo: 1.9,
};

export function calculateNutritionTargets(perfil: UserProfile): NutritionTargets {
  const validacao = validateUserProfile(perfil);
  if (!validacao.valido) {
    throw new Error(`Dados de perfil inválidos: ${validacao.erros.join(' ')}`);
  }

  const avisosSeguranca: string[] = [];
  const variaveisEntraramCalculo: string[] = [
    `Peso atual (${perfil.pesoAtualKg} kg)`,
    `Altura (${perfil.alturaCm} cm)`,
    `Idade (${perfil.idade} anos)`,
    `Nível de atividade (${perfil.nivelAtividade})`,
  ];

  // 1. Verificar condições clínicas, gravidez/lactação, histórico de transtorno alimentar ou menor de idade
  const ehMenorDeIdade = perfil.idade < 18;
  const temGestacaoLactacao = perfil.condicoesSaude.includes('gestante_lactante');
  const temTranstornoAlimentar = perfil.condicoesSaude.includes('historico_transtorno_alimentar');
  const temCondicaoClinica =
    perfil.condicoesSaude.includes('diabetes_resistencia_insulina') ||
    perfil.condicoesSaude.includes('hipertensao_cardiovascular') ||
    perfil.condicoesSaude.includes('doenca_renal_hepatica');

  const modoSeguroEducativo =
    ehMenorDeIdade || temGestacaoLactacao || temTranstornoAlimentar || temCondicaoClinica;

  if (ehMenorDeIdade) {
    avisosSeguranca.push(
      'Por você ter menos de 18 anos, o PULSE desativa déficits energéticos restritivos para proteger o crescimento e desenvolvimento saudável. Recomendamos acompanhamento com nutricionista ou pediatra.'
    );
  }
  if (temGestacaoLactacao) {
    avisosSeguranca.push(
      'Para gestantes ou lactantes, dietas restritivas são contraindicadas. O plano foi ajustado para manutenção nutricional segura. Consulte seu obstetra ou nutricionista materno-infantil.'
    );
  }
  if (temTranstornoAlimentar) {
    avisosSeguranca.push(
      'Priorizamos uma relação acolhedora e segura com a comida: sem cortes calóricos agressivos ou metas rígidas. Recomendamos suporte profissional multidisciplinar.'
    );
  }
  if (temCondicaoClinica) {
    avisosSeguranca.push(
      'Você declarou condição clínica que pode alterar necessidades metabólicas ou de micronutrientes. As estimativas são educativas e não substituem prescrição clínica individualizada.'
    );
  }

  // 2. Estimativa da Taxa Metabólica de Repouso (BMR) via Equação de Mifflin-St Jeor (1990)
  // Base: (10 * pesoKg) + (6.25 * alturaCm) - (5 * idade) + constante_fisiologica
  const baseMifflin = 10 * perfil.pesoAtualKg + 6.25 * perfil.alturaCm - 5 * perfil.idade;
  let bmrBruto = 0;
  let bmrIncertezaKcal = 85;
  let formulaUsada = '';

  if (perfil.variavelFisiologica === 'masculino') {
    bmrBruto = baseMifflin + 5;
    formulaUsada = 'Equação de Mifflin-St Jeor (1990) — perfil fisiológico masculino (+5 kcal)';
    variaveisEntraramCalculo.push('Variável fisiológica declarada: masculino');
  } else if (perfil.variavelFisiologica === 'feminino') {
    bmrBruto = baseMifflin - 161;
    formulaUsada = 'Equação de Mifflin-St Jeor (1990) — perfil fisiológico feminino (-161 kcal)';
    variaveisEntraramCalculo.push('Variável fisiológica declarada: feminino');
  } else {
    // Sem suposição silenciosa: utiliza a constante intermediária neutra (-78 kcal) e amplia a faixa de incerteza (±120 kcal)
    bmrBruto = baseMifflin - 78;
    bmrIncertezaKcal = 120;
    formulaUsada =
      'Equação de Mifflin-St Jeor (1990) — estimativa neutra ponderada sem assumir variável fisiológica (±120 kcal)';
    variaveisEntraramCalculo.push(
      'Variável fisiológica: estimativa neutra (opção de não informar ou estimativa média selecionada)'
    );
    avisosSeguranca.push(
      'Como a variável fisiológica da equação foi definida como estimativa neutra/não informada, exibimos uma margem de variação de ±120 kcal.'
    );
  }

  const bmrEstimadoKcal = Math.round(Math.max(1050, bmrBruto));
  const multiplicadorAtividade = ACTIVITY_MULTIPLIERS[perfil.nivelAtividade] ?? 1.375;
  const tdeeEstimadoKcal = Math.round(bmrEstimadoKcal * multiplicadorAtividade);

  // 3. Análise do Peso Desejado (não tratado como meta automaticamente segura)
  const alturaMetros = perfil.alturaCm / 100;
  let analisePesoDesejado: string | undefined;

  if (perfil.pesoDesejadoKg && perfil.pesoDesejadoKg > 0) {
    const imcDesejado = perfil.pesoDesejadoKg / (alturaMetros * alturaMetros);
    const diferencaKg = perfil.pesoDesejadoKg - perfil.pesoAtualKg;
    const percentualMudanca = Math.abs(diferencaKg) / perfil.pesoAtualKg;

    if (imcDesejado < 18.5) {
      analisePesoDesejado = `Atenção: o peso desejado (${perfil.pesoDesejadoKg} kg) resultaria em um IMC estimado de ${imcDesejado.toFixed(1)} kg/m², abaixo da faixa de referência de saúde (18,5 kg/m²). O PULSE não utiliza esse valor como meta automática e mantém suas recomendações em faixa segura.`;
      avisosSeguranca.push(analisePesoDesejado);
    } else if (percentualMudanca > 0.15) {
      analisePesoDesejado = `O peso desejado (${perfil.pesoDesejadoKg} kg) representa uma variação de ${Math.abs(diferencaKg).toFixed(1)} kg. Recomendamos dividir a jornada em etapas graduais de 4% a 6% do peso corporal, sem pressa ou restrições severas.`;
    } else {
      analisePesoDesejado = `Peso de referência anotado (${perfil.pesoDesejadoKg} kg). Lembre-se de que composição corporal (músculo vs. gordura) importa mais do que apenas o número na balança.`;
    }
  }

  // 4. Adaptação segura da meta energética conforme objetivo
  let caloriasAlvo = tdeeEstimadoKcal;

  if (modoSeguroEducativo) {
    // Em modo seguro/educativo, nunca aplica déficit restritivo
    if (perfil.objetivoPrincipal === 'ganhar_massa') {
      caloriasAlvo = Math.round(tdeeEstimadoKcal + 200);
    } else {
      caloriasAlvo = tdeeEstimadoKcal;
    }
  } else {
    switch (perfil.objetivoPrincipal) {
      case 'emagrecer': {
        // Déficit moderado e seguro (~15% a 17%, limitado a no máximo 450 kcal e nunca abaixo da TMB ou 1300 kcal)
        const deficitModerado = Math.min(450, Math.round(tdeeEstimadoKcal * 0.16));
        const pisoSeguro = Math.max(1300, bmrEstimadoKcal);
        caloriasAlvo = Math.max(pisoSeguro, tdeeEstimadoKcal - deficitModerado);
        break;
      }
      case 'ganhar_massa': {
        // Superávit controlado (+250 a +300 kcal) para hipertrofia limpa
        const superavit = perfil.nivelExperiencia === 'iniciante' ? 280 : 240;
        caloriasAlvo = tdeeEstimadoKcal + superavit;
        break;
      }
      case 'recomposicao_corporal': {
        // Leve ajuste (-5% ou manutenção com alta disponibilidade proteica)
        caloriasAlvo = Math.round(tdeeEstimadoKcal * 0.96);
        break;
      }
      case 'melhorar_resistencia': {
        // Disponibilidade energética para suportar o volume aeróbico/condicionamento
        caloriasAlvo = Math.round(tdeeEstimadoKcal * 1.03);
        break;
      }
      case 'manter_condicionamento':
      case 'habitos_saudaveis':
      default: {
        caloriasAlvo = tdeeEstimadoKcal;
        break;
      }
    }
  }

  // 5. Cálculo de Macronutrientes individualizado e matematicamente consistente
  // Usamos peso de referência ajustado quando IMC > 30 para não superestimar proteína por kg de tecido adiposo
  const imcAtual = perfil.pesoAtualKg / (alturaMetros * alturaMetros);
  const pesoReferenciaCalculoKg =
    imcAtual > 30 ? 25 * (alturaMetros * alturaMetros) + (perfil.pesoAtualKg - 25 * (alturaMetros * alturaMetros)) * 0.25 : perfil.pesoAtualKg;

  let proteinaPorKg = 1.6;
  let gorduraPorKg = 0.9;

  if (modoSeguroEducativo && perfil.condicoesSaude.includes('doenca_renal_hepatica')) {
    proteinaPorKg = 1.1; // Evita sobrecarga proteica em condição renal declarada
  } else if (perfil.objetivoPrincipal === 'recomposicao_corporal' || perfil.objetivoPrincipal === 'emagrecer') {
    proteinaPorKg = 1.85;
    gorduraPorKg = 0.85;
  } else if (perfil.objetivoPrincipal === 'ganhar_massa') {
    proteinaPorKg = 1.8;
    gorduraPorKg = 0.95;
  } else if (perfil.objetivoPrincipal === 'melhorar_resistencia') {
    proteinaPorKg = 1.55;
    gorduraPorKg = 0.85;
  } else {
    proteinaPorKg = 1.5;
    gorduraPorKg = 0.9;
  }

  let proteinasGramas = Math.round(pesoReferenciaCalculoKg * proteinaPorKg);
  let gordurasGramas = Math.round(pesoReferenciaCalculoKg * gorduraPorKg);

  // Garantir piso mínimo de gorduras essenciais (20% das calorias ou 40g)
  const gordurasMinimas = Math.max(40, Math.round((caloriasAlvo * 0.2) / 9));
  if (gordurasGramas < gordurasMinimas) {
    gordurasGramas = gordurasMinimas;
  }

  // Carboidratos preenchem o restante energético garantindo consistência matemática: 4*P + 9*G + 4*C = caloriasMetaKcal
  const kcalProteinaEGordura = proteinasGramas * 4 + gordurasGramas * 9;
  let kcalRestanteCarbo = caloriasAlvo - kcalProteinaEGordura;

  if (kcalRestanteCarbo < caloriasAlvo * 0.35) {
    // Ajusta suavemente para manter pelo menos 35% de energia vinda de carboidratos
    kcalRestanteCarbo = Math.round(caloriasAlvo * 0.4);
    proteinasGramas = Math.round((caloriasAlvo * 0.32) / 4);
    gordurasGramas = Math.round((caloriasAlvo * 0.28) / 9);
  }

  const carboidratosGramas = Math.max(90, Math.round(kcalRestanteCarbo / 4));
  // Recalcula caloriasMetaKcal exata a partir dos macros arredondados para 100% de consistência matemática
  const caloriasMetaKcal = proteinasGramas * 4 + carboidratosGramas * 4 + gordurasGramas * 9;

  const proteinasMin = Math.round(pesoReferenciaCalculoKg * Math.max(1.2, proteinaPorKg - 0.2));
  const proteinasMax = Math.round(pesoReferenciaCalculoKg * (proteinaPorKg + 0.2));

  // Fibras: ~14g a cada 1000 kcal (limitado entre 22g e 38g)
  const fibrasGramas = Math.min(38, Math.max(22, Math.round((caloriasMetaKcal / 1000) * 14)));

  // Hidratação como orientação geral (~32 ml/kg)
  const hidratacaoLitrosReferencia = Number(((perfil.pesoAtualKg * 32) / 1000).toFixed(1));

  avisosSeguranca.push(
    'Estes números são estimativas calculadas por equações populacionais. O gasto energético real varia conforme genética, sono, rotina e adaptação metabólica.'
  );

  return {
    bmrEstimadoKcal,
    bmrIncertezaKcal,
    tdeeEstimadoKcal,
    caloriasMetaKcal,
    faixaCaloriasMin: Math.round(caloriasMetaKcal - bmrIncertezaKcal),
    faixaCaloriasMax: Math.round(caloriasMetaKcal + bmrIncertezaKcal),
    proteinasGramas,
    proteinasFaixaGramas: [proteinasMin, proteinasMax],
    carboidratosGramas,
    gordurasGramas,
    fibrasGramas,
    hidratacaoLitrosReferencia,
    formulaUsada,
    variaveisEntraramCalculo,
    modoSeguroEducativo,
    avisosSeguranca,
    analisePesoDesejado,
  };
}
