/* ============================================================
   PULSO JFS — app.js
   Núcleo da PWA: token, fila offline (IndexedDB), autoavaliação.
   ============================================================ */

// >>> COLE AQUI O URL DO APPS SCRIPT (termina em /exec) <<<
const API_URL = https://script.google.com/macros/s/AKfycbzBreSCJ6tSVYfzKzmOUgWm2UpGdBfoUYQEKlg57k4KQTdZbikGeXB29jt8BHFh09YA/exec;

// ---- Conteúdo do formulário (espelha o procedimento IT_RH_28) ----
const COMPETENCIAS = [
  ['Liderança', 'Inspiro a equipa, comunico a importância do trabalho e mantenho o moral elevado, mesmo em períodos de maior exigência.'],
  ['Comunicação', 'Transmito instruções e expectativas de forma clara, concisa e eficaz a todos os níveis da equipa.'],
  ['Planeamento e organização', 'Planeio, disponibilizo recursos e priorizo as actividades de forma eficaz, garantindo que os prazos sejam cumpridos.'],
  ['Aderência a normas', 'Actuo de forma preventiva, identificando e comunicando riscos, falhas ou desvios nos processos existentes.'],
  ['Ética e integridade', 'Demonstro consistentemente altos padrões de ética e integridade no meu trabalho.'],
  ['Colaboração e visão sistémica', 'Colaboro eficazmente com outros departamentos e percebo os impactos da minha actuação no resultado da Organização.'],
  ['Responsabilidade e compromisso', 'Sou comprometido com os resultados e assumo com seriedade os deveres que me são confiados.'],
  ['Visão do negócio e inovação', 'Compreendo o mercado, identifico riscos e proponho melhorias que agregam valor ao negócio.'],
  ['Resiliência e coragem', 'Ajo de forma positiva e produtiva diante de pressões, frustrações e situações desafiadoras.'],
  ['Autoconhecimento', 'Sou aberto a ouvir e considerar críticas construtivas, buscando continuamente aprimorar as minhas competências.']
];
const ESCALA = ['1 · Discordo', '2 · Discordo parcialmente', '3 · Concordo', '4 · Concordo absolutamente'];

// ---- Estado ----
let TOKEN = null;
let ME = null;
let respostas = new Array(COMPETENCIAS.length).fill(null);
let idx = 0;

// ============================================================
//  ARRANQUE
// ============================================================
window.addEventListener('load', init);

async function init() {
  // regista o service worker (PWA)
  if ('serviceWorker' in navigator) {
    try { await navigator.serviceWorker.register('./sw.js'); } catch (e) {}
  }

  // token: vem do link (?t=...) ou do armazenamento (se já foi aberto antes)
  const url = new URL(location.href);
  const tokenNoLink = url.searchParams.get('t');
  const modoPartilhado = url.searchParams.get('shared') === '1';

  if (tokenNoLink) {
    TOKEN = tokenNoLink;
    if (!modoPartilhado) localStorage.setItem('pulso_token', TOKEN);
  } else if (!modoPartilhado) {
    TOKEN = localStorage.getItem('pulso_token');
  }

  // tenta enviar o que ficou em fila da última vez
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
    renderHome();
  } catch (e) {
    // offline e sem dados — mostra menu na mesma, deixa preencher e enfileira
    mostrar('tela-erro');
    document.getElementById('erro-msg').textContent = 'Sem ligação. Ligue-se à internet uma vez para carregar os seus dados.';
  }
}

function renderHome() {
  const p = ME.pessoa;
  document.getElementById('home-nome').textContent = 'Olá, ' + p.nome.split(' ')[0] + '!';
  document.getElementById('home-cargo').textContent = p.cargo + ' · ' + p.unidade;

  const cards = [];
  // autoavaliação
  const feita = ME.tarefas.autoavaliacao.feita;
  cards.push(cardHTML('auto', '&#9733;', 'Autoavaliação',
    feita ? 'Já submetida — obrigado!' : '10 competências · 5 min',
    feita ? 'Concluída' : 'Aberta', feita));

  // avaliar terceiros
  const nAval = ME.tarefas.avaliar.length;
  if (nAval > 0) {
    cards.push(cardHTML('aval', '&#9678;', 'Avaliar a minha equipa',
      nAval + (nAval === 1 ? ' pessoa para avaliar' : ' pessoas para avaliar'), 'Aberta', false));
  }

  document.getElementById('home-cards').innerHTML = cards.join('');
  mostrar('tela-home');
}

function cardHTML(acao, icone, titulo, sub, badge, done) {
  const onclick = done ? '' : `onclick="abrir('${acao}')"`;
  const op = done ? 'opacity:.6' : '';
  return `<div class="hc" ${onclick} style="${op}">
    <div class="hci">${icone}</div>
    <div><div class="hct">${titulo}</div><div class="hcs">${sub}</div></div>
    <div class="hcb">${badge}</div></div>`;
}

function abrir(acao) {
  if (acao === 'auto') { idx = 0; respostas.fill(null); renderAuto(); mostrar('tela-auto'); }
  if (acao === 'aval') { /* módulo de avaliação de terceiros — próximo bloco */ alert('Módulo de avaliação da equipa — em construção.'); }
}

// ============================================================
//  AUTOAVALIAÇÃO
// ============================================================
function renderAuto() {
  const [nome, desc] = COMPETENCIAS[idx];
  document.getElementById('a-progresso').textContent = `Competência ${idx + 1} de ${COMPETENCIAS.length}`;
  document.getElementById('a-nome').textContent = nome;
  document.getElementById('a-desc').textContent = desc;
  document.getElementById('a-barra').style.width = (idx / COMPETENCIAS.length * 100) + '%';

  document.getElementById('a-opcoes').innerHTML = ESCALA.map((e, j) => {
    const sel = respostas[idx] === j + 1;
    return `<div class="opt ${sel ? 'sel' : ''}" onclick="escolher(${j + 1})">${e}</div>`;
  }).join('');

  document.getElementById('a-prox').disabled = !respostas[idx];
  document.getElementById('a-prox').textContent = idx === COMPETENCIAS.length - 1 ? 'Submeter' : 'Próxima';
  document.getElementById('a-ant').textContent = idx === 0 ? 'Voltar' : 'Anterior';
}
function escolher(v) { respostas[idx] = v; renderAuto(); }
function autoAnterior() { if (idx === 0) renderHome(), mostrar('tela-home'); else { idx--; renderAuto(); } }
async function autoProxima() {
  if (idx < COMPETENCIAS.length - 1) { idx++; renderAuto(); return; }
  // submeter
  const media = respostas.reduce((a, b) => a + b, 0) / respostas.length;
  const payload = { action: 'submit_auto', token: TOKEN, respostas: respostas.slice() };

  const btn = document.getElementById('a-prox');
  btn.disabled = true; btn.textContent = 'A enviar…';

  const res = await enviarOuEnfileirar(payload);
  const faixa = classificar(media);
  document.getElementById('auto-resultado').innerHTML =
    `A sua autoavaliação registou média <b>${media.toFixed(2)}</b> — ${faixa}.`;
  document.getElementById('auto-sync').innerHTML = res.enviado
    ? '<span>&#9729;</span> Enviado ao servidor do RH'
    : '<span>&#8987;</span> Guardado no telemóvel — será enviado quando houver rede';
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
    req.onupgradeneeded = () => req.result.createObjectStore('fila', { keyPath: 'id', autoIncrement: true });
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
    // servidor respondeu erro lógico (ex. já submetido) — não vale enfileirar
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

  // 1) lê tudo o que está em fila (transação curta, fecha logo)
  const itens = await new Promise((resolve) => {
    const tx = db.transaction('fila', 'readonly');
    const g = tx.objectStore('fila').getAll();
    g.onsuccess = () => resolve(g.result || []);
    g.onerror = () => resolve([]);
  });
  if (!itens.length) return;

  // 2) tenta enviar cada um; só apaga (nova transação) após confirmação do servidor
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
    } catch (e) {
      // ainda offline — para aqui e tenta tudo de novo na próxima
      break;
    }
  }
}
// tenta esvaziar a fila em três momentos:
//  1. quando o browser deteta que a rede voltou
//  2. a cada 30s enquanto a app está aberta (rede pode voltar sem disparar 'online')
//  3. no arranque (chamado em init)
let _aSincronizar = false;
async function sincronizarFilaSeguro() {
  if (_aSincronizar) return;      // evita duas sincronizações ao mesmo tempo
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
  // text/plain evita o preflight de CORS do Apps Script
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
