/* ============================================================
   PULSO JFS — app.js
   Núcleo da PWA: token, fila offline (IndexedDB), autoavaliação
   e avaliação da equipa.

   NOVO (out/2026):
   - Competências corretas por NÍVEL do avaliado (IT_RH_28):
       • Não-gestor (90º)  -> conjunto operacional
       • Gestor c/ liderados (360º) -> conjunto de gestão (Liderança)
       • Gestor s/ liderados (270º) -> conjunto de gestão (Influência)
     O formulário segue sempre a metodologia de QUEM está a ser avaliado.
   - Correção: a autoavaliação deixa de "reabrir" depois de submetida.
   ============================================================ */

// >>> COLE AQUI O URL DO APPS SCRIPT (termina em /exec) <<<
const API_URL = 'https://script.google.com/macros/s/AKfycbzBreSCJ6tSVYfzKzmOUgWm2UpGdBfoUYQEKlg57k4KQTdZbikGeXB29jt8BHFh09YA/exec';

const ESCALA = ['1 · Discordo', '2 · Discordo parcialmente', '3 · Concordo', '4 · Concordo absolutamente'];

/* ============================================================
   CONJUNTOS DE COMPETÊNCIAS (do procedimento IT_RH_28)
   Cada conjunto tem:
     auto     -> 1ª pessoa (quando a pessoa se avalia a si própria)
     terceiro -> 3ª pessoa (quando se avalia outra pessoa)
   ============================================================ */
const COMPETENCIAS_SETS = {

  // ---------- NÃO-GESTOR (metodologia 90º) ----------
  naoGestor: {
    auto: [
      ['Orientação para resultados', 'Cumpro metas e entrego resultados de qualidade dentro dos prazos estabelecidos, demonstrando comprometimento com os objectivos da equipa e da empresa.'],
      ['Trabalho em equipa', 'Colaboro activamente com os colegas para atingir objectivos comuns, demonstro respeito e abertura a diferentes opiniões e contribuo para um ambiente de trabalho positivo e cooperativo.'],
      ['Comunicação eficaz', 'Expresso as minhas ideias de forma clara e objectiva, escuto atentamente antes de responder ou agir e adapto a minha comunicação ao perfil do interlocutor.'],
      ['Proatividade', 'Tomo iniciativa para resolver problemas sem esperar instruções, identifico e proponho melhorias em processos ou actividades e demonstro atitude positiva diante de desafios.'],
      ['Responsabilidade e compromisso', 'Cumpro prazos e compromissos assumidos, assumo os meus erros e busco corrigi-los com maturidade, e zelo pelos recursos e informações sob a minha responsabilidade.'],
      ['Aprendizagem contínua', 'Demonstro interesse em aprender e desenvolver novas competências, aplico os conhecimentos adquiridos no trabalho diário e busco feedback para melhorar o meu desempenho.'],
      ['Adaptabilidade e resiliência', 'Ajusto-me facilmente a novas situações e prioridades, mantenho o bom desempenho em contextos de mudança e enfrento imprevistos com equilíbrio, reagindo de forma positiva a pressões e frustrações.'],
      ['Coragem', 'Ajo com firmeza e determinação mesmo diante de riscos ou situações desafiadoras, mantenho-me fiel aos meus princípios e exprimo opiniões de forma assertiva e respeitosa, assumindo decisões difíceis quando necessário.'],
      ['Planeamento e organização', 'Organizo o trabalho de forma eficiente e estruturada, defino prioridades com clareza e cumpro prazos, entregando resultados de forma consistente.'],
      ['Inovação e melhoria contínua', 'Proponho ideias e soluções para melhorar os processos, mostro abertura para experimentar novas abordagens e contribuo para simplificar e optimizar o trabalho da equipa.']
    ],
    terceiro: [
      ['Orientação para resultados', 'Cumpre metas e entrega resultados de qualidade dentro dos prazos estabelecidos, demonstrando comprometimento com os objectivos da equipa e da empresa.'],
      ['Trabalho em equipa', 'Colabora activamente com os colegas para atingir objectivos comuns, demonstra respeito e abertura a diferentes opiniões e contribui para um ambiente de trabalho positivo e cooperativo.'],
      ['Comunicação eficaz', 'Expressa as suas ideias de forma clara e objectiva, escuta atentamente antes de responder ou agir e adapta a comunicação ao perfil do interlocutor.'],
      ['Proatividade', 'Toma iniciativa para resolver problemas sem esperar instruções, identifica e propõe melhorias em processos ou actividades e demonstra atitude positiva diante de desafios.'],
      ['Responsabilidade e compromisso', 'Cumpre prazos e compromissos assumidos, assume os seus erros e busca corrigi-los com maturidade, e zela pelos recursos e informações sob a sua responsabilidade.'],
      ['Aprendizagem contínua', 'Demonstra interesse em aprender e desenvolver novas competências, aplica os conhecimentos adquiridos no trabalho diário e busca feedback para melhorar o seu desempenho.'],
      ['Adaptabilidade e resiliência', 'Ajusta-se facilmente a novas situações e prioridades, mantém o bom desempenho em contextos de mudança e enfrenta imprevistos com equilíbrio, reagindo de forma positiva a pressões e frustrações.'],
      ['Coragem', 'Age com firmeza e determinação mesmo diante de riscos ou situações desafiadoras, mantém-se fiel aos seus princípios e exprime opiniões de forma assertiva e respeitosa, assumindo decisões difíceis quando necessário.'],
      ['Planeamento e organização', 'Organiza o trabalho de forma eficiente e estruturada, define prioridades com clareza e cumpre prazos, entregando resultados de forma consistente.'],
      ['Inovação e melhoria contínua', 'Propõe ideias e soluções para melhorar os processos, mostra abertura para experimentar novas abordagens e contribui para simplificar e optimizar o trabalho da equipa.']
    ]
  },

  // ---------- GESTOR COM LIDERADOS (metodologia 360º) ----------
  gestor360: {
    auto: [
      ['Liderança', 'Inspiro a equipa, comunico a importância do trabalho e mantenho a moral elevada, mesmo em períodos de maior exigência.'],
      ['Comunicação', 'Transmito instruções e expectativas de forma clara, concisa e eficaz a todos os níveis da equipa.'],
      ['Planeamento e organização', 'Planeio, disponibilizo recursos e priorizo as actividades de forma eficaz, garantindo que os prazos sejam cumpridos.'],
      ['Aderência a normas ou conformidade', 'Actuo de forma preventiva, identificando e comunicando riscos, falhas ou desvios nos processos existentes antes que causem problemas.'],
      ['Ética e integridade', 'Demonstro consistentemente altos padrões de ética e integridade no meu trabalho.'],
      ['Colaboração e visão sistémica', 'Colaboro eficazmente com outros departamentos e equipas e percebo os impactos da minha actuação no resultado da Organização.'],
      ['Responsabilidade e compromisso', 'Sou comprometido com os resultados e tomo as providências necessárias para atingir objectivos, assumindo com seriedade os deveres que me são confiados, com qualidade e dentro dos prazos.'],
      ['Visão do negócio e inovação', 'Compreendo o mercado e as suas mudanças, identifico e mapeio riscos e proponho melhorias ou inovações que agregam valor ao negócio.'],
      ['Resiliência e coragem', 'Ajo de forma positiva e produtiva diante de pressões, frustrações e fortes impactos emocionais, mostrando firmeza e determinação para agir mesmo diante de riscos ou situações desafiadoras.'],
      ['Autoconhecimento e autodesenvolvimento', 'Sou aberto a ouvir e considerar críticas construtivas, buscando continuamente aprimorar as minhas habilidades e competências.']
    ],
    terceiro: [
      ['Liderança', 'Inspira a equipa, comunica a importância do trabalho e mantém a moral elevada, mesmo em períodos de maior exigência.'],
      ['Comunicação', 'Transmite instruções e expectativas de forma clara, concisa e eficaz a todos os níveis da equipa.'],
      ['Planeamento e organização', 'Planeia, disponibiliza recursos e prioriza as actividades de forma eficaz, garantindo que os prazos sejam cumpridos.'],
      ['Aderência a normas ou conformidade', 'Actua de forma preventiva, identificando e comunicando riscos, falhas ou desvios nos processos existentes antes que causem problemas.'],
      ['Ética e integridade', 'Demonstra consistentemente altos padrões de ética e integridade no seu trabalho.'],
      ['Colaboração e visão sistémica', 'Colabora eficazmente com outros departamentos e equipas e percebe os impactos da sua actuação no resultado da Organização.'],
      ['Responsabilidade e compromisso', 'É comprometido com os resultados e toma as providências necessárias para atingir objectivos, assumindo com seriedade os deveres que lhe são confiados, com qualidade e dentro dos prazos.'],
      ['Visão do negócio e inovação', 'Compreende o mercado e as suas mudanças, identifica e mapeia riscos e propõe melhorias ou inovações que agregam valor ao negócio.'],
      ['Resiliência e coragem', 'Age de forma positiva e produtiva diante de pressões, frustrações e fortes impactos emocionais, mostrando firmeza e determinação para agir mesmo diante de riscos ou situações desafiadoras.'],
      ['Autoconhecimento e autodesenvolvimento', 'É aberto a ouvir e considerar críticas construtivas, buscando continuamente aprimorar as suas habilidades e competências.']
    ]
  },

  // ---------- GESTOR SEM LIDERADOS (metodologia 270º) ----------
  gestor270: {
    auto: [
      ['Influência', 'Consigo influenciar decisões, alinhar stakeholders e mobilizar pessoas para atingir objectivos comuns, mesmo sem exercer autoridade hierárquica directa.'],
      ['Comunicação', 'Transmito instruções e expectativas de forma clara, concisa e eficaz a todos os níveis da organização.'],
      ['Planeamento e organização', 'Planeio, disponibilizo recursos e priorizo as actividades de forma eficaz, garantindo que os prazos sejam cumpridos.'],
      ['Aderência a normas ou conformidade', 'Actuo de forma preventiva, identificando e comunicando riscos, falhas ou desvios nos processos existentes antes que causem problemas.'],
      ['Ética e integridade', 'Demonstro consistentemente altos padrões de ética e integridade no meu trabalho e no trabalho da equipa.'],
      ['Colaboração e visão sistémica', 'Colaboro eficazmente com outros departamentos e equipas e percebo os impactos da minha actuação no resultado da Organização.'],
      ['Responsabilidade e compromisso', 'Mostro compromisso com os resultados e tomo as providências necessárias para atingir os objectivos, assumindo com seriedade os deveres que me são confiados, com qualidade e dentro dos prazos.'],
      ['Visão do negócio e inovação', 'Demonstro habilidade em compreender o mercado, identificar e mapear riscos e propor melhorias ou inovações que agregam valor ao negócio.'],
      ['Resiliência e coragem', 'Ajo de forma positiva e produtiva diante de pressões e frustrações, demonstrando firmeza e determinação para agir mesmo diante de riscos ou situações desafiadoras.'],
      ['Autoconhecimento e autodesenvolvimento', 'Demonstro abertura para ouvir e considerar críticas construtivas, buscando continuamente aprimorar as minhas habilidades e competências.']
    ],
    terceiro: [
      ['Influência', 'Consegue influenciar decisões, alinhar stakeholders e mobilizar pessoas para atingir objectivos comuns, mesmo sem exercer autoridade hierárquica directa.'],
      ['Comunicação', 'Transmite instruções e expectativas de forma clara, concisa e eficaz a todos os níveis da organização.'],
      ['Planeamento e organização', 'Planeia, disponibiliza recursos e prioriza as actividades de forma eficaz, garantindo que os prazos sejam cumpridos.'],
      ['Aderência a normas ou conformidade', 'Actua de forma preventiva, identificando e comunicando riscos, falhas ou desvios nos processos existentes antes que causem problemas.'],
      ['Ética e integridade', 'Demonstra consistentemente altos padrões de ética e integridade no seu trabalho e no trabalho da equipa.'],
      ['Colaboração e visão sistémica', 'Colabora eficazmente com outros departamentos e equipas e percebe os impactos da sua actuação no resultado da Organização.'],
      ['Responsabilidade e compromisso', 'Mostra compromisso com os resultados e toma as providências necessárias para atingir os objectivos, assumindo com seriedade os deveres que lhe são confiados, com qualidade e dentro dos prazos.'],
      ['Visão do negócio e inovação', 'Demonstra habilidade em compreender o mercado, identificar e mapear riscos e propor melhorias ou inovações que agregam valor ao negócio.'],
      ['Resiliência e coragem', 'Age de forma positiva e produtiva diante de pressões e frustrações, demonstrando firmeza e determinação para agir mesmo diante de riscos ou situações desafiadoras.'],
      ['Autoconhecimento e autodesenvolvimento', 'Demonstra abertura para ouvir e considerar críticas construtivas, buscando continuamente aprimorar as suas habilidades e competências.']
    ]
  }
};

// metodologia (texto da Base Mestra) -> chave do conjunto de competências
function chaveConjunto(metodologia) {
  const m = String(metodologia || '').toLowerCase();
  if (m.indexOf('360') >= 0) return 'gestor360';
  if (m.indexOf('270') >= 0) return 'gestor270';
  return 'naoGestor'; // 90º e qualquer outro caso
}

// ---- Estado ----
let TOKEN = null;
let ME = null;
let MEU_CONJUNTO = 'naoGestor';     // conjunto da PRÓPRIA pessoa (autoavaliação)
let ATIVO_AUTO = [];                // competências da autoavaliação em curso
let respostas = [];
let idx = 0;

// ============================================================
//  ARRANQUE
// ============================================================
window.addEventListener('load', init);

function apiUrlValida() {
  return /^https:\/\/script\.google\.com\/macros\/s\/.+\/exec$/.test(API_URL);
}

async function init() {
  if ('serviceWorker' in navigator) {
    try { await navigator.serviceWorker.register('./sw.js'); } catch (e) {}
  }

  // salvaguarda: URL do Apps Script em falta ou incompleto
  if (!apiUrlValida()) {
    mostrar('tela-erro');
    document.getElementById('erro-msg').textContent =
      'Configuração em falta: o endereço do servidor (API_URL) não está correto. Contacte o RH.';
    return;
  }

  const url = new URL(location.href);
  const tokenNoLink = url.searchParams.get('t');
  const modoPartilhado = url.searchParams.get('shared') === '1';

  if (tokenNoLink) {
    TOKEN = tokenNoLink;
    if (!modoPartilhado) localStorage.setItem('pulso_token', TOKEN);
  } else if (!modoPartilhado) {
    TOKEN = localStorage.getItem('pulso_token');
  }

  sincronizarFilaSeguro();

  if (!TOKEN) { mostrar('tela-sem-token'); return; }

  await carregarPessoa();
}

// ============================================================
//  RESOLVER TOKEN — quem sou eu e o que tenho para fazer
// ============================================================
async function carregarPessoa() {
  mostrar('tela-loading');
  try {
    const r = await apiGet('me', { t: TOKEN });
    if (!r.ok) {
      document.getElementById('erro-msg').textContent =
        r.error === 'token_invalido' ? 'Este link não é válido. Contacte o RH.' : 'Ocorreu um erro. Tente novamente.';
      mostrar('tela-erro');
      return;
    }
    ME = r;
    MEU_CONJUNTO = chaveConjunto(ME.pessoa.metodologia);
    renderHome();
  } catch (e) {
    mostrar('tela-erro');
    document.getElementById('erro-msg').textContent = 'Sem ligação. Ligue-se à internet uma vez para carregar os seus dados.';
  }
}

function renderHome() {
  const p = ME.pessoa;
  document.getElementById('home-nome').textContent = 'Olá, ' + p.nome.split(' ')[0] + '!';
  document.getElementById('home-cargo').textContent = p.cargo + ' · ' + p.unidade;

  const nComp = COMPETENCIAS_SETS[MEU_CONJUNTO].auto.length;
  const cards = [];

  const feita = ME.tarefas.autoavaliacao.feita;
  cards.push(cardHTML('auto', '&#9733;', 'Autoavaliação',
    feita ? 'Já submetida — obrigado!' : nComp + ' competências · 5 min',
    feita ? 'Concluída' : 'Aberta', feita));

  const nAval = ME.tarefas.avaliar.length;
  if (nAval > 0) {
    const faltam = ME.tarefas.avaliar.filter(x => !x.feita).length;
    cards.push(cardHTML('aval', '&#9678;', 'Avaliar a minha equipa',
      faltam === 0 ? 'Equipa avaliada — obrigado!' : faltam + (faltam === 1 ? ' pessoa por avaliar' : ' pessoas por avaliar'),
      faltam === 0 ? 'Concluída' : 'Aberta', faltam === 0));
  }

  document.getElementById('home-cards').innerHTML = cards.join('');
  mostrar('tela-home');
}

function cardHTML(acao, icone, titulo, sub, badge, done) {
  const onclick = done ? '' : `onclick="abrir('${acao}')"`;
  const op = done ? 'opacity:.6' : '';
  const cls = done ? 'hcb feito' : 'hcb';
  return `<div class="hc" ${onclick} style="${op}">
    <div class="hci">${icone}</div>
    <div><div class="hct">${titulo}</div><div class="hcs">${sub}</div></div>
    <div class="${cls}">${badge}</div></div>`;
}

function abrir(acao) {
  if (acao === 'auto') {
    ATIVO_AUTO = COMPETENCIAS_SETS[MEU_CONJUNTO].auto;
    respostas = new Array(ATIVO_AUTO.length).fill(null);
    idx = 0;
    renderAuto();
    mostrar('tela-auto');
  }
  if (acao === 'aval') { renderListaAvaliar(); mostrar('tela-lista-aval'); }
}

// ============================================================
//  AVALIAÇÃO DA EQUIPA — lista de quem avaliar
// ============================================================
let avaliadoAtual = null;    // {token, nome, cargo, metodologia}
let ATIVO_AVAL = [];         // competências (3ª pessoa) do avaliado em curso
let respAval = [];
let idxAval = 0;

function renderListaAvaliar() {
  const lista = ME.tarefas.avaliar;
  document.getElementById('lista-aval-corpo').innerHTML = lista.map(p => {
    const feita = p.feita;
    const badge = feita
      ? '<div class="hcb feito">Avaliado</div>'
      : '<div class="hcb">Pendente</div>';
    const onclick = feita ? '' : `onclick="abrirAvaliacao('${p.token}','${escapar(p.nome)}','${escapar(p.cargo)}','${escapar(p.metodologia || '')}')"`;
    const op = feita ? 'style="opacity:.55"' : '';
    return `<div class="hc" ${onclick} ${op}>
      <div class="hci">&#9679;</div>
      <div><div class="hct">${p.nome}</div><div class="hcs">${p.cargo}</div></div>
      ${badge}</div>`;
  }).join('');
}
function escapar(s) { return String(s).replace(/'/g, "\\'"); }

function abrirAvaliacao(token, nome, cargo, metodologia) {
  avaliadoAtual = { token, nome, cargo, metodologia };
  // o formulário segue a metodologia de QUEM está a ser avaliado
  ATIVO_AVAL = COMPETENCIAS_SETS[chaveConjunto(metodologia)].terceiro;
  respAval = new Array(ATIVO_AVAL.length).fill(null);
  idxAval = 0;
  document.getElementById('aval-quem').textContent = 'A avaliar: ' + nome;
  renderAval();
  mostrar('tela-aval');
}

function renderAval() {
  const [nome, desc] = ATIVO_AVAL[idxAval];
  const total = ATIVO_AVAL.length;
  document.getElementById('av-progresso').textContent = `Competência ${idxAval + 1} de ${total}`;
  document.getElementById('av-nome').textContent = nome;
  document.getElementById('av-desc').textContent = desc;
  document.getElementById('av-barra').style.width = (idxAval / total * 100) + '%';
  document.getElementById('av-opcoes').innerHTML = ESCALA.map((e, j) => {
    const sel = respAval[idxAval] === j + 1;
    return `<div class="opt ${sel ? 'sel' : ''}" onclick="escolherAval(${j + 1})">${e}</div>`;
  }).join('');
  document.getElementById('av-prox').disabled = !respAval[idxAval];
  document.getElementById('av-prox').textContent = idxAval === total - 1 ? 'Submeter' : 'Próxima';
  document.getElementById('av-ant').textContent = idxAval === 0 ? 'Voltar' : 'Anterior';
}
function escolherAval(v) { respAval[idxAval] = v; renderAval(); }
function avalAnterior() {
  if (idxAval === 0) { renderListaAvaliar(); mostrar('tela-lista-aval'); }
  else { idxAval--; renderAval(); }
}
async function avalProxima() {
  const total = ATIVO_AVAL.length;
  if (idxAval < total - 1) { idxAval++; renderAval(); return; }
  const payload = {
    action: 'submit_aval',
    token: TOKEN,
    tokenAvaliado: avaliadoAtual.token,
    relacao: 'gestor',
    respostas: respAval.slice()
  };
  const btn = document.getElementById('av-prox');
  btn.disabled = true; btn.textContent = 'A enviar…';

  const res = await enviarOuEnfileirar(payload);
  const alvo = ME.tarefas.avaliar.find(p => p.token === avaliadoAtual.token);
  if (alvo) alvo.feita = true;

  document.getElementById('aval-fim-nome').textContent = avaliadoAtual.nome;
  document.getElementById('aval-fim-sync').innerHTML = res.enviado
    ? '<span>&#9729;</span> Enviado ao servidor do RH'
    : '<span>&#8987;</span> Resposta guardada — será enviada assim que houver ligação à internet';
  document.getElementById('aval-fim-sync').className = 'pinfo ' + (res.enviado ? 'ok' : 'wait');

  const faltam = ME.tarefas.avaliar.filter(p => !p.feita).length;
  document.getElementById('aval-fim-faltam').textContent = faltam === 0
    ? 'Avaliou toda a sua equipa. Obrigado!'
    : (faltam === 1 ? 'Falta avaliar 1 colaborador.' : `Falta avaliar ${faltam} colaboradores.`);
  mostrar('tela-aval-fim');
}

// ============================================================
//  AUTOAVALIAÇÃO
// ============================================================
function renderAuto() {
  const [nome, desc] = ATIVO_AUTO[idx];
  const total = ATIVO_AUTO.length;
  document.getElementById('a-progresso').textContent = `Competência ${idx + 1} de ${total}`;
  document.getElementById('a-nome').textContent = nome;
  document.getElementById('a-desc').textContent = desc;
  document.getElementById('a-barra').style.width = (idx / total * 100) + '%';

  document.getElementById('a-opcoes').innerHTML = ESCALA.map((e, j) => {
    const sel = respostas[idx] === j + 1;
    return `<div class="opt ${sel ? 'sel' : ''}" onclick="escolher(${j + 1})">${e}</div>`;
  }).join('');

  document.getElementById('a-prox').disabled = !respostas[idx];
  document.getElementById('a-prox').textContent = idx === total - 1 ? 'Submeter' : 'Próxima';
  document.getElementById('a-ant').textContent = idx === 0 ? 'Voltar' : 'Anterior';
}
function escolher(v) { respostas[idx] = v; renderAuto(); }
function autoAnterior() { if (idx === 0) { renderHome(); mostrar('tela-home'); } else { idx--; renderAuto(); } }
async function autoProxima() {
  const total = ATIVO_AUTO.length;
  if (idx < total - 1) { idx++; renderAuto(); return; }

  const media = respostas.reduce((a, b) => a + b, 0) / respostas.length;
  const payload = { action: 'submit_auto', token: TOKEN, respostas: respostas.slice() };

  const btn = document.getElementById('a-prox');
  btn.disabled = true; btn.textContent = 'A enviar…';

  const res = await enviarOuEnfileirar(payload);

  // CORREÇÃO: marca a autoavaliação como feita para o cartão não reabrir
  if (ME && ME.tarefas && ME.tarefas.autoavaliacao) ME.tarefas.autoavaliacao.feita = true;

  const faixa = classificar(media);
  document.getElementById('auto-resultado').innerHTML =
    `<div class="media-caixa">
       <div class="media-rotulo">A sua autopercepção</div>
       <div class="media-num">${media.toFixed(2)}<span class="media-max"> / 4</span></div>
       <div class="media-faixa">${faixa}</div>
     </div>
     <p class="media-nota">Esta é a média da <b>sua própria avaliação</b>. Não é a nota final — o resultado consolidado inclui a avaliação do seu gestor e será apresentado na reunião de feedback.</p>`;
  document.getElementById('auto-sync').innerHTML = res.enviado
    ? '<span>&#9729;</span> Enviado ao servidor do RH'
    : '<span>&#8987;</span> Resposta guardada — será enviada assim que houver ligação à internet';
  document.getElementById('auto-sync').className = 'pinfo ' + (res.enviado ? 'ok' : 'wait');
  mostrar('tela-auto-fim');
}

function classificar(m) {
  if (m >= 3.5) return 'Excede à expectativa';
  if (m >= 2.5) return 'Atende à expectativa';
  if (m >= 1.5) return 'Abaixo da expectativa';
  return 'Insatisfatório';
}

// ============================================================
//  FILA OFFLINE (IndexedDB) — o coração do "funciona sem rede"
// ============================================================
function abrirDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('pulso', 1);
    req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains('fila')) req.result.createObjectStore('fila', { keyPath: 'id', autoIncrement: true }); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function enfileirar(payload) {
  const db = await abrirDB();
  return new Promise((resolve) => {
    const tx = db.transaction('fila', 'readwrite');
    tx.objectStore('fila').add({ payload, ts: Date.now() });
    tx.oncomplete = () => resolve();
  });
}
async function enviarOuEnfileirar(payload) {
  try {
    const r = await apiPost(payload);
    if (r && r.ok) return { enviado: true, resp: r };
    if (r && r.error === 'ja_submetido') return { enviado: true, resp: r };
    throw new Error('resposta_nao_ok');
  } catch (e) {
    await enfileirar(payload);
    return { enviado: false };
  }
}
async function sincronizarFila() {
  let db;
  try { db = await abrirDB(); } catch (e) { return; }

  const itens = await new Promise((resolve) => {
    const tx = db.transaction('fila', 'readonly');
    const g = tx.objectStore('fila').getAll();
    g.onsuccess = () => resolve(g.result || []);
    g.onerror = () => resolve([]);
  });
  if (!itens.length) return;

  for (const item of itens) {
    try {
      const r = await apiPost(item.payload);
      if (r && (r.ok || r.error === 'ja_submetido')) {
        await new Promise((resolve) => {
          const tx = db.transaction('fila', 'readwrite');
          tx.objectStore('fila').delete(item.id);
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        });
      }
    } catch (e) { break; }
  }
}
let _aSincronizar = false;
async function sincronizarFilaSeguro() {
  if (_aSincronizar) return;
  _aSincronizar = true;
  try { await sincronizarFila(); } finally { _aSincronizar = false; }
}
window.addEventListener('online', sincronizarFilaSeguro);
setInterval(sincronizarFilaSeguro, 30000);

// ============================================================
//  CHAMADAS À API
// ============================================================
async function apiGet(action, params) {
  const u = new URL(API_URL);
  u.searchParams.set('action', action);
  Object.keys(params || {}).forEach(k => u.searchParams.set(k, params[k]));
  const r = await fetch(u.toString(), { method: 'GET' });
  return r.json();
}
async function apiPost(payload) {
  const r = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload)
  });
  return r.json();
}

// ============================================================
//  NAVEGAÇÃO
// ============================================================
function mostrar(id) {
  document.querySelectorAll('.tela').forEach(t => t.classList.remove('ativa'));
  document.getElementById(id).classList.add('ativa');
  const wrap = document.querySelector('.wrap');
  if (wrap) wrap.scrollTop = 0;
}
