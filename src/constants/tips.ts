// Banco de dicas estratégicas — foco em mais clientes, retenção e lucro.
// Rotaciona uma por dia (baseado no dia do ano), sem precisar de IA.

export interface Tip {
  emoji: string;
  title: string;
  text: string;
}

export const TIPS: Tip[] = [
  {
    emoji: '📸',
    title: 'Poste o antes e depois',
    text: 'Fotos de antes/depois no Instagram e Status do WhatsApp atraem muito mais do que só o resultado final. Mostra sua evolução como profissional.',
  },
  {
    emoji: '🎁',
    title: 'Programa de indicação',
    text: 'Ofereça um desconto ou mimo para cliente que indicar uma amiga. É a forma mais barata de conseguir clientes novas — elas já confiam em você.',
  },
  {
    emoji: '💬',
    title: 'Mensagem de retorno',
    text: 'Cliente que não vem há 30+ dias? Mande uma mensagem carinhosa perguntando como ela está, sem parecer cobrança. Muitas só esqueceram de agendar.',
  },
  {
    emoji: '⏰',
    title: 'Lembrete de horário',
    text: 'Manda uma mensagem 1 dia antes confirmando o horário. Reduz falta e mostra profissionalismo — cliente sente que é bem cuidada.',
  },
  {
    emoji: '✨',
    title: 'Ofereça um upgrade',
    text: 'Na hora do atendimento, sugira um complemento (nail art simples, hidratação). Aumenta o ticket médio sem parecer "empurrar venda".',
  },
  {
    emoji: '🗓️',
    title: 'Já agende o retorno',
    text: 'Ao final do atendimento, pergunte "posso já te encaixar daqui 3 semanas?". Cliente que sai com data marcada retorna muito mais.',
  },
  {
    emoji: '🌟',
    title: 'Peça uma avaliação',
    text: 'Cliente satisfeita? Peça para deixar uma avaliação no Google ou compartilhar nos stories marcando você. Prova social vale mais que qualquer anúncio.',
  },
  {
    emoji: '🎂',
    title: 'Lembre aniversários',
    text: 'Mandar "Feliz aniversário 🎉 que tal comemorar com uma unha nova?" com um desconto especial é uma isca poderosa de reativação.',
  },
  {
    emoji: '📦',
    title: 'Combos fecham mais',
    text: 'Criar um "combo mensal" (ex: manutenção + esmaltação) garante recorrência e previsibilidade de renda — melhor que atendimentos avulsos.',
  },
  {
    emoji: '🕐',
    title: 'Horários nobres',
    text: 'Fim de tarde e sábado costumam ser os mais disputados. Considere uma pequena taxa de "horário nobre" — quem valoriza, paga com prazer.',
  },
  {
    emoji: '💅',
    title: 'Capriche na 1ª impressão',
    text: 'Cliente nova decide se volta nos primeiros 10 minutos. Ambiente limpo, pontualidade e um sorriso genuíno valem mais que qualquer técnica.',
  },
  {
    emoji: '📲',
    title: 'Grupo de transmissão',
    text: 'Crie uma lista de transmissão no WhatsApp para avisar sobre horários vagos de última hora ou promoções relâmpago. Direto, sem parecer spam.',
  },
  {
    emoji: '🤝',
    title: 'Parcerias locais',
    text: 'Combine indicação mútua com um salão de cabelo ou esteticista da região. Vocês compartilham clientes sem gastar em anúncio.',
  },
  {
    emoji: '📋',
    title: 'Anote preferências',
    text: 'Guarde nas observações da cliente o que ela gosta (cor, formato, papo vs silêncio). Esse cuidado é o que faz ela dizer "só confio em você".',
  },
  {
    emoji: '🏆',
    title: 'Reconheça as fiéis',
    text: 'Cliente com 10+ visitas merece um agrado especial de vez em quando. Fidelidade se cultiva — não espere ela "descobrir" que é especial.',
  },
  {
    emoji: '💡',
    title: 'Justifique o valor',
    text: 'Ao invés de só falar o preço, mencione o que está incluso (produtos de qualidade, tempo dedicado, higiene). Preço sem contexto parece caro.',
  },
  {
    emoji: '📅',
    title: 'Evite buracos na agenda',
    text: 'Um horário vago é dinheiro perdido para sempre. Ofereça esse horário com um pequeno desconto para quem topar mudar o dia.',
  },
  {
    emoji: '🎯',
    title: 'Foque no seu diferencial',
    text: 'O que só você oferece? Pode ser um traço de design, um atendimento mais calmo, produtos veganos. Comunique isso — não compita só por preço.',
  },
];

export function getTodayTip(): Tip {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  return TIPS[dayOfYear % TIPS.length];
}
