import React, { useState } from 'react';
import { PulseDatabaseState, UserProfile } from '../domain/types';
import {
  Download,
  Edit3,
  FileJson,
  Lock,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Trash2,
  User,
} from 'lucide-react';

interface ProfileSettingsViewProps {
  estado: PulseDatabaseState;
  onReopenOnboardingToEdit: (step?: number) => void;
  onQuickRecalculateAll: (novoPerfil: UserProfile) => void;
  onResetAllPersonalData: () => void;
}

export const ProfileSettingsView: React.FC<ProfileSettingsViewProps> = ({
  estado,
  onReopenOnboardingToEdit,
  onQuickRecalculateAll,
  onResetAllPersonalData,
}) => {
  const { perfil, metasNutricionais, historicoAlteracoes } = estado;
  const [abaPerfil, setAbaPerfil] = useState<'resumo' | 'configuracoes' | 'privacidade'>('resumo');
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);

  const handleExportarDadosJSON = () => {
    const jsonString = JSON.stringify(estado, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pulse-dados-pessoais-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Navegação entre Resumo do Perfil, Configurações e Privacidade/Dados */}
      <div className="flex items-center gap-1.5 p-1.5 bg-[#121212] border border-white/10 rounded-2xl overflow-x-auto">
        {[
          { id: 'resumo', label: 'Resumo do Perfil & Fórmulas', icon: User },
          { id: 'configuracoes', label: 'Configurações & Android', icon: Smartphone },
          { id: 'privacidade', label: 'Privacidade e Gerenciamento de Dados', icon: Lock },
        ].map((tab) => {
          const Icon = tab.icon;
          const ativo = abaPerfil === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setAbaPerfil(tab.id as typeof abaPerfil)}
              className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer ${
                ativo ? 'bg-[#FF2D8D] text-white' : 'text-[#B3B3B3] hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ABA 1: RESUMO DO PERFIL E TRANSPARÊNCIA MATEMÁTICA */}
      {abaPerfil === 'resumo' && (
        <div className="space-y-5">
          <div className="bg-[#1B1B1B] border border-white/10 rounded-3xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="font-display text-xl font-bold text-white">
                  Perfil de {perfil.nome}
                </h1>
                <p className="text-xs text-[#B3B3B3]">
                  {perfil.idade} anos · {perfil.alturaCm} cm · Peso atual: {perfil.pesoAtualKg} kg ·
                  Objetivo: {perfil.objetivoPrincipal.replace('_', ' ')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onReopenOnboardingToEdit(1)}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-[#FF2D8D] hover:bg-[#FF65AD] text-white text-xs font-semibold flex items-center gap-2 cursor-pointer"
              >
                <Edit3 className="w-4 h-4" />
                <span>Revisar Onboarding Completo</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="bg-[#121212] p-4 rounded-2xl space-y-2 text-xs">
                <p className="font-semibold text-white">Auditoria do Cálculo Energético</p>
                <p className="text-[#B3B3B3]">
                  <strong className="text-white">Equação utilizada:</strong>{' '}
                  {metasNutricionais.formulaUsada}
                </p>
                <p className="text-[#B3B3B3]">
                  <strong className="text-white">TMB Estimada:</strong> ~{metasNutricionais.bmrEstimadoKcal} kcal (±{metasNutricionais.bmrIncertezaKcal} kcal)
                </p>
                <p className="text-[#B3B3B3]">
                  <strong className="text-white">Gasto Diário Total (TDEE):</strong> ~{metasNutricionais.tdeeEstimadoKcal} kcal
                </p>
                <p className="text-[#B3B3B3]">
                  <strong className="text-white">Variáveis consideradas:</strong>{' '}
                  {metasNutricionais.variaveisEntraramCalculo.join(' · ')}
                </p>
              </div>

              <div className="bg-[#121212] p-4 rounded-2xl space-y-2 text-xs">
                <p className="font-semibold text-white">Orçamento, Rotina e Preferências</p>
                <p className="text-[#B3B3B3]">
                  <strong className="text-white">Orçamento declarado:</strong>{' '}
                  {perfil.semDinheiroExtraCompras
                    ? 'R$ 0 para compras extras (uso exclusivo da despensa)'
                    : `R$ ${perfil.orcamentoValor} por ${perfil.orcamentoPeriodo}`}
                </p>
                <p className="text-[#B3B3B3]">
                  <strong className="text-white">Padrão alimentar:</strong> {perfil.padraoAlimentar} ({perfil.refeicoesPorDia} refeições/dia)
                </p>
                <p className="text-[#B3B3B3]">
                  <strong className="text-white">Alimentos excluídos:</strong>{' '}
                  {perfil.alimentosNaoCome.join(', ') || 'Nenhum'}
                </p>
                <p className="text-[#B3B3B3]">
                  <strong className="text-white">Sono habitual:</strong> {perfil.horarioDormir} às{' '}
                  {perfil.horarioAcordar}
                </p>
              </div>
            </div>
          </div>

          {/* Ajuste Rápido de Peso e Orçamento */}
          <div className="bg-[#1B1B1B] border border-white/10 rounded-3xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-white">
              Atualização Rápida de Metas e Recálculo
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label htmlFor="quick-peso" className="block text-xs text-[#B3B3B3] mb-1">
                  Peso atual (kg)
                </label>
                <input
                  id="quick-peso"
                  type="number"
                  step="0.1"
                  value={perfil.pesoAtualKg}
                  onChange={(e) =>
                    onQuickRecalculateAll({
                      ...perfil,
                      pesoAtualKg: Math.max(30, Number(e.target.value) || 70),
                    })
                  }
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#121212] border border-white/15 text-sm text-white font-mono-num"
                />
              </div>

              <div>
                <label htmlFor="quick-orc" className="block text-xs text-[#B3B3B3] mb-1">
                  Orçamento ({perfil.orcamentoPeriodo}) em R$
                </label>
                <input
                  id="quick-orc"
                  type="number"
                  min={0}
                  value={perfil.orcamentoValor}
                  onChange={(e) =>
                    onQuickRecalculateAll({
                      ...perfil,
                      orcamentoValor: Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#121212] border border-white/15 text-sm text-white font-mono-num"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => onQuickRecalculateAll(perfil)}
                  className="w-full min-h-[44px] px-4 py-2 rounded-xl bg-[#121212] hover:bg-white/10 border border-white/15 text-xs font-semibold text-[#FF65AD] flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Regerar Dieta e Treino</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ABA 2: CONFIGURAÇÕES E EXECUÇÃO NO ANDROID */}
      {abaPerfil === 'configuracoes' && (
        <div className="space-y-5">
          <div className="bg-[#1B1B1B] border border-white/10 rounded-3xl p-5 space-y-4">
            <h1 className="font-display text-xl font-bold text-white">
              Configurações do Aplicativo e Instalação Android
            </h1>
            <p className="text-xs text-[#B3B3B3]">
              O PULSE opera com persistência offline-first no dispositivo, permitindo consultar seu
              plano alimentar, tabela TACO/TBCA, lista de compras e treinos mesmo sem internet.
            </p>

            <div className="bg-[#121212] p-4 rounded-2xl space-y-2 text-xs text-[#B3B3B3]">
              <p className="font-semibold text-white">Como instalar no celular Android (PWA / APK):</p>
              <p>
                1. <strong>Instalação Direta no Android (Chrome):</strong> Abra este aplicativo no
                Google Chrome do Android, toque no menu (⋮) e selecione{' '}
                <strong className="text-white">&ldquo;Instalar aplicativo&rdquo;</strong> ou{' '}
                <strong className="text-white">&ldquo;Adicionar à tela inicial&rdquo;</strong>. Ele
                abrirá em tela cheia como app nativo.
              </p>
              <p>
                2. <strong>Empacotamento APK (Capacitor Android):</strong> O código-fonte inclui a
                documentação completa no arquivo <code>README.md</code> para gerar o pacote APK via
                Capacitor/Android Studio (<code>npx cap add android</code>).
              </p>
            </div>
          </div>

          {/* Histórico de Alterações Auditável */}
          <div className="bg-[#1B1B1B] border border-white/10 rounded-3xl p-5 space-y-3">
            <h2 className="text-sm font-semibold text-white">Histórico Recente de Alterações</h2>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {historicoAlteracoes.map((item) => (
                <div
                  key={item.id}
                  className="bg-[#121212] px-3.5 py-2.5 rounded-xl text-xs flex items-center justify-between gap-2"
                >
                  <div>
                    <span className="text-[#FF65AD] font-semibold">{item.modulo}: </span>
                    <span className="text-white">{item.descricao}</span>
                  </div>
                  <span className="text-[10px] text-[#B3B3B3] font-mono-num shrink-0">
                    {item.dataISO.slice(0, 10)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ABA 3: PRIVACIDADE, RESPONSABILIDADE CLÍNICA E GERENCIAMENTO DE DADOS */}
      {abaPerfil === 'privacidade' && (
        <div className="space-y-5">
          <div className="bg-[#1B1B1B] border border-white/10 rounded-3xl p-5 space-y-4">
            <h1 className="font-display text-xl font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#FF2D8D]" />
              <span>Privacidade, Segurança e Gerenciamento de Dados</span>
            </h1>

            <div className="bg-[#121212] p-4 rounded-2xl space-y-2 text-xs text-[#B3B3B3]">
              <p className="font-semibold text-white">Aviso de Responsabilidade Clínica e Nutricional</p>
              <p>
                • As metas energéticas, de macronutrientes e de hidratação apresentadas no PULSE são{' '}
                <strong>estimativas populacionais</strong> e não medições laboratoriais exatas.
              </p>
              <p>
                • O PULSE não realiza diagnósticos médicos, não prescreve tratamentos clínicos, não
                incentiva restrição calórica extrema e <strong>não substitui</strong> o
                acompanhamento individualizado de nutricionista, médico ou profissional de Educação
                Física.
              </p>
              <p>
                • Seus dados corporais, alimentares e de rotina pertencem exclusivamente a você e
                podem ser exportados ou apagados permanentemente a qualquer momento abaixo.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={handleExportarDadosJSON}
                className="flex-1 min-h-[48px] px-4 py-3 rounded-xl bg-[#121212] hover:bg-white/10 border border-white/15 text-xs font-semibold text-white flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4 text-[#FF65AD]" />
                <span>Exportar Todos os Meus Dados (.JSON)</span>
              </button>

              {!confirmarExclusao ? (
                <button
                  type="button"
                  onClick={() => setConfirmarExclusao(true)}
                  className="min-h-[48px] px-4 py-3 rounded-xl bg-[#121212] hover:bg-[#FF2D8D]/20 border border-[#FF2D8D]/50 text-xs font-semibold text-[#FF65AD] flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Excluir Todos os Dados Pessoais</span>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onResetAllPersonalData();
                      setConfirmarExclusao(false);
                    }}
                    className="min-h-[48px] px-4 py-3 rounded-xl bg-[#FF2D8D] text-xs font-bold text-white cursor-pointer"
                  >
                    Confirmar Exclusão Total
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmarExclusao(false)}
                    className="min-h-[48px] px-3 py-3 rounded-xl bg-[#121212] text-xs text-[#B3B3B3] cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
