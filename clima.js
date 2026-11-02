/* ============================================================
   PULSO JFS — clima.js
   Pesquisa de Satisfação (FR.RH.23-1 · R3) · anónima · sem token

   R3 (nov/2026 — versão aprovada pelo CA):
   - 26 afirmações em 7 dimensões (texto e estrutura revistos).
   - Escala com rótulo + emoji e opção "Não sei / Não se aplica".
   - "O que mais valoriza": lista nova, máximo 3 (+ Outro).
   - Dados demográficos no fim (facultativos): área, unidade,
     antiguidade, idade, género. Grupos < 7 nunca são divulgados.
   - Resposta repetida continua bloqueada por token (sem quebrar o anonimato).
   ============================================================ */

// >>> URL do Apps Script (termina em /exec) <<<
const API_URL = 'https://script.google.com/macros/s/AKfycbwd9mBgSSfNix5LyWzfqAvbU_HZ2vppUUkckbgj8iJXGOp7nCBfJeKd0n_tm6yR-dQ5/exec';

const CHAVE_RASCUNHO = 'pulso_clima_rascunho';

// ---- 26 afirmações em 7 dimensões (R3) ----
const DIMENSOES = [
  { nome: 'A Empresa', num: 'I', itens: [
    'Os valores da empresa estão alinhados com os meus valores pessoais.',
    'Tenho orgulho em trabalhar nesta empresa.',
    'Recomendaria esta empresa a um amigo como local para trabalhar.'
  ]},
  { nome: 'Condições de Trabalho', num: 'II', itens: [
    'Os meios e equipamentos de trabalho são adequados à minha função.',
    'A política de higiene e segurança é adequada para prevenir riscos e acidentes.',
    'O horário de trabalho é adequado.',
    'Sou tratado(a) com respeito no meu local de trabalho.'
  ]},
  { nome: 'Remuneração e Benefícios', num: 'III', itens: [
    'A minha remuneração é justa face ao trabalho que faço.',
    'A minha remuneração é compatível com a praticada por outras empresas do mesmo ramo.',
    'O refeitório e/ou o subsídio de alimentação são adequados.',
    'O fundo social responde às necessidades dos trabalhadores.'
  ]},
  { nome: 'O Meu Superior Directo', num: 'IV', itens: [
    'O meu superior directo estimula a cooperação e o trabalho de equipa.',
    'O meu superior directo trata os conflitos com imparcialidade.',
    'O meu superior directo reconhece o meu trabalho quando faço bem.',
    'Recebo feedback do meu superior directo sobre o meu desempenho.',
    'Sinto-me à vontade para dar a minha opinião ao meu superior directo, mesmo quando é diferente da dele.'
  ]},
  { nome: 'Comunicação', num: 'V', itens: [
    'As decisões que afectam o meu trabalho são-me explicadas com clareza.',
    'Sinto-me bem informado(a) sobre os assuntos mais importantes da empresa.',
    'Conheço as actividades das outras empresas do Grupo JFS.'
  ]},
  { nome: 'Carreira e Desenvolvimento', num: 'VI', itens: [
    'Sei o que se espera do meu trabalho.',
    'Recebo a formação de que preciso para fazer bem o meu trabalho.',
    'Tenho capacidade para assumir mais responsabilidades do que as que tenho hoje.',
    'Gostaria de usar parte do meu tempo de trabalho para aprender e desenvolver novas competências.',
    'A empresa dá oportunidades de progressão na carreira de acordo com as competências de cada um.',
    'Vi mudanças na empresa em resultado da última pesquisa de satisfação.'
  ]},
  { nome: 'Satisfação Global', num: 'VII', itens: [
    'No geral, estou satisfeito(a) por trabalhar nesta empresa.'
  ]}
];

// Escala R3: valor 1..4 + Não sei/N/A (guardado como 0). "null" = ainda não respondeu.
const ESCALA = [
  { v: 1, emo: '😟', lbl: 'Discordo totalmente', cls: 'o1' },
  { v: 2, emo: '🙁', lbl: 'Discordo',            cls: 'o2' },
  { v: 3, emo: '🙂', lbl: 'Concordo',            cls: 'o3' },
  { v: 4, emo: '😄', lbl: 'Concordo totalmente', cls: 'o4' },
  { v: 0, emo: '🤷', lbl: 'Não sei / Não se aplica', cls: 'ona' }
];

// "O que mais valoriza" — máximo 3 (R3). "Outro" abre campo de texto.
const MOTIVOS = [
  'Bom ambiente e boas relações de trabalho',
  'Chefia competente',
  'Remuneração',
  'Benefícios sociais / fundo social',
  'Boas condições de trabalho',
  'Trabalho interessante',
  'Reconhecimento do meu trabalho',
  'Oportunidades de aprender e progredir',
  'Estabilidade e segurança no emprego',
  'Organização sólida',
  'Imagem e reputação da empresa',
  'Desafios e responsabilidades',
  'Outro'
];
const MAX_MOTIVOS = 3;

// Áreas e unidades (R3). Imobiliária e Serviços Centrais não têm sub-unidades definidas na R3.
const AREAS = ['Automóvel', 'Agrícola e negócio rural', 'Imobiliária', 'Serviços Centrais'];
const UNIDADES = {
  'Automóvel': ['TI Mitsubishi', 'TI FCA / Jetour', 'TI Versalhes', 'FAW', 'Promotors', 'TI Beira', 'TI Tete', 'TI Nampula', 'TI Pemba', 'Sodauto Maputo', 'Sodauto Pemba'],
  'Agrícola e negócio rural': ['SAN', 'Geba', 'Fábrica de Óleo', 'Citrinos de Chimoio', 'Projecto TotalEnergies', 'João Agricultor', 'João Energia'],
  'Imobiliária': ['Imobiliária'],
  'Serviços Centrais': ['Serviços Centrais']
};

// ---- estado ----
const OFFSETS = [];
(function () { let o = 0; DIMENSOES.forEach(d => { OFFSETS.push(o); o += d.itens.length; }); })();
const TOTAL_AFIRM = DIMENSOES.reduce((a, d) => a + d.itens.length, 0); // 26

let respostas = new Array(TOTAL_AFIRM).fill(null);
let dimIdx = 0;
let motivosSel = [];
let TOKEN = null;

function rascunhoKey() { return CHAVE_RASCUNHO + '_' + (TOKEN || 'x'); }

// ============================================================
//  ARRANQUE
// ============================================================
window.addEventListener('load', async () => {
  if ('serviceWorker' in navigator) { navigator.serviceWorker.register('./sw.js').catch(() => {}); }
  sincronizarFila();

  if (!apiUrlValida()) { return mostrarErro('Configuração em falta: o endereço do servidor não está correto. Contacte o RH.'); }

  const url = new URL(location.href);
  TOKEN = url.searchParams.get('t') || localStorage.getItem('pulso_token_clima');
  if (url.searchParams.get('t')) { try { localStorage.setItem('pulso_token_clima', TOKEN); } catch (e) {} }
  if (!TOKEN) { mostrar('tela-sem-token'); return; }

  construirAreas();

  mostrar('tela-loading');
  try {
    const r = await apiGet('clima_me', { t: TOKEN });
    if (!r.ok) { return mostrarErro(r.error === 'token_invalido' ? 'Este link não é válido. Contacte o RH.' : 'Ocorreu um erro. Tente novamente.'); }
    if (r.jaRespondeu) { mostrar('tela-ja'); return; }
    if (localStorage.getItem(rascunhoKey())) { mostrar('tela-rascunho'); return; }
    mostrar('tela-intro');
  } catch (e) {
    if (localStorage.getItem(rascunhoKey())) { mostrar('tela-rascunho'); return; }
    mostrar('tela-intro');
  }
});
function mostrarErro(msg) { mostrar('tela-erro'); var el = document.getElementById('erro-msg'); if (el) el.textContent = msg; }

// ---- áreas / unidades ----
function construirAreas() {
  const sa = document.getElementById('i-area');
  if (sa && sa.options.length <= 1) {
    sa.innerHTML = '<option value="">Seleccione…</option>' + AREAS.map(a => `<option>${a}</option>`).join('');
  }
}
document.getElementById('i-area').addEventListener('change', function () { preencherUnidades(this.value); });
function preencherUnidades(area, selecionada) {
  const sel = document.getElementById('i-unidade');
  const lista = UNIDADES[area] || [];
  sel.innerHTML = '<option value="">Seleccione…</option>' + lista.map(u => `<option ${u === selecionada ? 'selected' : ''}>${u}</option>`).join('');
}

// ---- navegação inicial ----
function apiUrlValida() { return /^https:\/\/script\.google\.com\/macros\/s\/.+\/exec$/.test(API_URL); }
function comecar() {
  if (!apiUrlValida()) { alert('Configuração em falta: o endereço do servidor (API_URL) não está correto. Contacte o RH.'); return; }
  dimIdx = 0; renderDimensao(); mostrar('tela-dim');
}

// ============================================================
//  RASCUNHO
// ============================================================
function guardarRascunho() {
  try {
    const dados = {
      respostas: respostas, motivos: motivosSel, dimIdx: dimIdx,
      outro: val('m-outro'), mel1: val('mel1'), mel2: val('mel2'), mel3: val('mel3'), comentario: val('comentario'),
      area: val('i-area'), unidade: val('i-unidade'), antig: val('i-antig'), idade: val('i-idade'), genero: val('i-genero')
    };
    localStorage.setItem(rascunhoKey(), JSON.stringify(dados));
  } catch (e) {}
}
function retomarRascunho() {
  try {
    const d = JSON.parse(localStorage.getItem(rascunhoKey()) || '{}');
    if (d.respostas && d.respostas.length === TOTAL_AFIRM) respostas = d.respostas;
    if (d.motivos) motivosSel = d.motivos;
    setVal('m-outro', d.outro); setVal('mel1', d.mel1); setVal('mel2', d.mel2); setVal('mel3', d.mel3); setVal('comentario', d.comentario);
    construirAreas();
    setVal('i-area', d.area); preencherUnidades(d.area, d.unidade);
    setVal('i-antig', d.antig); setVal('i-idade', d.idade); setVal('i-genero', d.genero);
    dimIdx = d.dimIdx || 0;
    renderDimensao();
    mostrar('tela-dim');
  } catch (e) { mostrar('tela-intro'); }
}
function descartarRascunho() {
  localStorage.removeItem(rascunhoKey());
  respostas = new Array(TOTAL_AFIRM).fill(null);
  motivosSel = [];
  mostrar('tela-intro');
}
function val(id) { const el = document.getElementById(id); return el ? el.value : ''; }
function setVal(id, v) { const el = document.getElementById(id); if (el && v != null) el.value = v; }

// ============================================================
//  DIMENSÃO
// ============================================================
function renderDimensao() {
  const dim = DIMENSOES[dimIdx];
  const off = OFFSETS[dimIdx];
  const total = DIMENSOES.length;
  document.getElementById('d-badge').textContent = `Parte ${dim.num} de ${romano(total)}`;
  document.getElementById('d-titulo').textContent = dim.nome;
  document.getElementById('d-sub').textContent = dim.itens.length + (dim.itens.length === 1 ? ' pergunta' : ' perguntas') + ' · escolha a opção que melhor o descreve';
  document.getElementById('d-barra').style.width = (dimIdx / total * 100) + '%';

  document.getElementById('d-afirmacoes').innerHTML = dim.itens.map((txt, i) => {
    const g = off + i;
    const opcoes = ESCALA.map(o => {
      const sel = respostas[g] === o.v ? 'sel ' + o.cls : '';
      return `<div class="opt ${sel}" onclick="responder(${g},${o.v})">
                <span class="emo">${o.emo}</span><span class="lbl">${o.lbl}</span>
              </div>`;
    }).join('');
    return `<div class="afirm"><div class="afirm-txt">${g + 1}. ${txt}</div><div class="opcoes">${opcoes}</div></div>`;
  }).join('');

  document.getElementById('d-aviso').textContent = '';
  document.getElementById('d-prox').textContent = dimIdx === DIMENSOES.length - 1 ? 'Continuar' : 'Próxima';
  document.getElementById('d-ant').textContent = dimIdx === 0 ? 'Voltar' : 'Anterior';
}
function romano(n) { return ['0','I','II','III','IV','V','VI','VII','VIII'][n] || String(n); }
function voltarDimensoes() { dimIdx = DIMENSOES.length - 1; renderDimensao(); mostrar('tela-dim'); }
function responder(g, v) { respostas[g] = v; guardarRascunho(); renderDimensao(); }
function dimCompleta() {
  const off = OFFSETS[dimIdx];
  const n = DIMENSOES[dimIdx].itens.length;
  for (let i = 0; i < n; i++) if (respostas[off + i] === null) return false; // 0 (N/A) conta como respondido
  return true;
}
function dimAnterior() {
  if (dimIdx === 0) { mostrar('tela-intro'); return; }
  dimIdx--; renderDimensao(); guardarRascunho();
}
function dimProxima() {
  if (!dimCompleta()) {
    document.getElementById('d-aviso').textContent = 'Por favor responda a todas as perguntas desta parte antes de continuar.';
    return;
  }
  if (dimIdx < DIMENSOES.length - 1) { dimIdx++; renderDimensao(); guardarRascunho(); return; }
  renderMotivos();
  mostrar('tela-motivos');
}

// ---- O que mais valoriza (máx 3) ----
function renderMotivos() {
  document.getElementById('motivos-lista').innerHTML = MOTIVOS.map((m, i) => {
    const sel = motivosSel.indexOf(m) >= 0;
    return `<div class="motivo ${sel ? 'sel' : ''}" onclick="toggleMotivo(${i})">
      <div class="cx">${sel ? '&#10003;' : ''}</div><div>${m}</div></div>`;
  }).join('');
  atualizarContador();
  toggleOutroCampo();
}
function toggleMotivo(i) {
  const m = MOTIVOS[i];
  const pos = motivosSel.indexOf(m);
  if (pos >= 0) motivosSel.splice(pos, 1);
  else { if (motivosSel.length >= MAX_MOTIVOS) return; motivosSel.push(m); }
  guardarRascunho();
  renderMotivos();
}
function atualizarContador() {
  document.getElementById('motivos-cont').textContent = motivosSel.length + ' de ' + MAX_MOTIVOS + ' seleccionados';
}
function toggleOutroCampo() {
  const wrap = document.getElementById('m-outro-wrap');
  if (wrap) wrap.style.display = motivosSel.indexOf('Outro') >= 0 ? 'block' : 'none';
}

// ---- submeter ----
async function submeter() {
  // junta "Outro: <texto>" aos motivos, se aplicável
  const motivosFinais = motivosSel.map(m => (m === 'Outro' && val('m-outro').trim()) ? ('Outro: ' + val('m-outro').trim()) : m);
  const payload = {
    action: 'submit_clima',
    token: TOKEN,                         // só controla participação; não é guardado com as respostas
    respostas: respostas.map(r => (r === null ? 0 : r)),  // 0 = Não sei/N/A
    motivos: motivosFinais,
    melhorias: [val('mel1').trim(), val('mel2').trim(), val('mel3').trim()],
    comentario: val('comentario').trim(),
    area: val('i-area'),
    unidade: val('i-unidade'),
    antiguidade: val('i-antig'),
    idade: val('i-idade'),
    genero: val('i-genero')
  };
  const btn = document.getElementById('btn-submeter');
  btn.disabled = true; btn.textContent = 'A enviar…';

  const res = await enviarOuEnfileirar(payload);
  try { localStorage.removeItem(rascunhoKey()); } catch (e) {}

  if (res.erro === 'ja_respondeu') { mostrar('tela-ja'); return; }

  document.getElementById('fim-sync').innerHTML = res.enviado
    ? '<span>&#9729;</span> Enviado — obrigado pela sua participação!'
    : '<span>&#8987;</span> Resposta guardada — será enviada assim que houver ligação à internet';
  document.getElementById('fim-sync').className = 'pinfo ' + (res.enviado ? 'ok' : 'wait');
  mostrar('tela-fim');
}

// ============================================================
//  FILA OFFLINE
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
    if (r && r.ok) return { enviado: true };
    if (r && (r.error === 'ja_respondeu' || r.error === 'token_invalido')) return { enviado: true, erro: r.error };
    throw new Error('nao_ok');
  } catch (e) {
    await enfileirar(payload);
    return { enviado: false };
  }
}
let _sync = false;
async function sincronizarFila() {
  if (_sync) return; _sync = true;
  try {
    let db; try { db = await abrirDB(); } catch (e) { return; }
    const itens = await new Promise((resolve) => {
      const tx = db.transaction('fila', 'readonly');
      const g = tx.objectStore('fila').getAll();
      g.onsuccess = () => resolve(g.result || []);
      g.onerror = () => resolve([]);
    });
    for (const item of itens) {
      try {
        const r = await apiPost(item.payload);
        if (r && (r.ok || r.error === 'ja_respondeu' || r.error === 'token_invalido')) {
          await new Promise((resolve) => {
            const tx = db.transaction('fila', 'readwrite');
            tx.objectStore('fila').delete(item.id);
            tx.oncomplete = () => resolve(); tx.onerror = () => resolve();
          });
        }
      } catch (e) { break; }
    }
  } finally { _sync = false; }
}
window.addEventListener('online', sincronizarFila);
setInterval(sincronizarFila, 30000);

async function apiPost(payload) {
  const r = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) });
  return r.json();
}
async function apiGet(action, params) {
  const u = new URL(API_URL);
  u.searchParams.set('action', action);
  Object.keys(params || {}).forEach(k => u.searchParams.set(k, params[k]));
  const r = await fetch(u.toString());
  return r.json();
}

// ---- navegação ----
function mostrar(id) {
  document.querySelectorAll('.tela').forEach(t => t.classList.remove('ativa'));
  document.getElementById(id).classList.add('ativa');
  const wrap = document.querySelector('.wrap');
  if (wrap) wrap.scrollTop = 0;
}
