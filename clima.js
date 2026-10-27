/* ============================================================
   PULSO JFS — clima.js
   Pesquisa de Satisfação (FR_RH_23-1_R2) · anónima · sem token

   NOVO (out/2026):
   - Navegação por DIMENSÃO (6 ecrãs) em vez de 25 ecrãs soltos.
   - Guardar rascunho automático (continuar de onde parou).
   - Bloqueio de resposta repetida no mesmo aparelho.
   - Unidades atualizadas + opção "Grupo (Corporativo)".
   O instrumento oficial (25 afirmações / 6 dimensões) mantém-se íntegro.
   ============================================================ */

// >>> COLE AQUI O URL DO APPS SCRIPT (termina em /exec) <<<
const API_URL = 'https://script.google.com/macros/s/AKfycbwd9mBgSSfNix5LyWzfqAvbU_HZ2vppUUkckbgj8iJXGOp7nCBfJeKd0n_tm6yR-dQ5/exec';

const CHAVE_RASCUNHO = 'pulso_clima_rascunho';
const CHAVE_FEITO    = 'pulso_clima_feito_2026';

// ---- 25 afirmações em 6 dimensões (questionário oficial) ----
const DIMENSOES = [
  { nome: 'Negócio e Alinhamento', num: 'I', itens: [
    'Eu conheço os valores da empresa.',
    'A missão e os valores da empresa estão alinhados com o que eu valorizo.',
    'Eu conheço as áreas de negócio da empresa.',
    'Eu conheço os objectivos da minha função.',
    'Eu tenho orgulho de trabalhar para a empresa.'
  ]},
  { nome: 'Condições de Trabalho & Equilíbrio', num: 'II', itens: [
    'Os meios e equipamentos de trabalho são adequados à minha função.',
    'A política de higiene e segurança adoptada pela empresa é adequada para prevenir riscos.',
    'Considero o horário de trabalho adoptado pela empresa adequado.'
  ]},
  { nome: 'Salários & Benefícios', num: 'III', itens: [
    'Considero o meu salário compatível com o que é praticado no mercado para a mesma função.',
    'O plano de saúde oferecido pela empresa é adequado.',
    'Considero o serviço de refeitório adequado.',
    'Valorizo a acção da empresa em conceder apoio, através do fundo social, para atender a prioridades pessoais.'
  ]},
  { nome: 'Liderança', num: 'IV', itens: [
    'O meu líder estimula a cooperação e o trabalho de equipa na minha área.',
    'O meu superior imediato age de acordo com o que fala.',
    'O meu superior trata as situações de conflito com transparência e imparcialidade.',
    'O meu líder inspira-me.',
    'Eu sinto que recebo feedback do meu líder sobre o meu trabalho e desempenho.'
  ]},
  { nome: 'Comunicação', num: 'V', itens: [
    'A Empresa comunica de forma transparente.',
    'Sinto-me bem informado sobre os assuntos relevantes da Empresa.',
    'Na Empresa, posso expressar as minhas opiniões sem receio.',
    'A comunicação, orientação e apoio recebidos do meu líder directo são positivos e transmitem confiança.'
  ]},
  { nome: 'Carreira e Desempenho', num: 'VI', itens: [
    'Eu conheço o meu descritivo de funções.',
    'As minhas tarefas e metas são claras e devidamente comunicadas.',
    'Eu procuro aprender para melhorar as minhas habilidades e desempenho.',
    'Eu considero que a empresa dá oportunidades de progressão na carreira aos trabalhadores.'
  ]}
];
const ESCALA = ['Discordo totalmente', 'Discordo', 'Concordo', 'Concordo totalmente'];

const MOTIVOS = [
  'Bom ambiente de trabalho', 'Chefia exemplar/competente', 'Benefícios sociais', 'Remuneração',
  'Boas condições de trabalho', 'Falta de melhor emprego', 'Trabalho interessante', 'Organização sólida',
  'Fundo Social', 'Lealdade à empresa', 'Sentimento de realização', 'Reconhecimento por parte da empresa',
  'Desafios e responsabilidades proporcionadas', 'Estabilidade e segurança no emprego', 'Dedicação à empresa',
  'Boas relações de trabalho', 'Imagem e reputação da empresa'
];

// unidades por área de negócio (atualizado out/2026)
const UNIDADES = {
  'Automóvel': ['TI Mitsubishi', 'TI FCA', 'TI Versalhes', 'Matola FAW', 'Promotors', 'TI Beira', 'TI Tete', 'TI Nampula', 'TI Pemba', 'Sodauto Maputo', 'Sodauto Tete', 'Sodauto Pemba'],
  'Agrícola': ['SAN e Mozaco', 'Companhia Agrícola', 'CIJFS (Fábrica de Óleo)', 'Citrinos', 'Projecto Total (Palma)', 'João Agricultor', 'João Energia'],
  'Imobiliária': ['Maputo', 'Beira', 'Nacala', 'Ilha de Moçambique', 'Pemba', 'Tete', 'Lichinga'],
  'Serviços Centrais': ['Serviços Centrais'],
  'Grupo (Corporativo)': ['Grupo (Corporativo)']
};

// ---- estado ----
// índices globais 0..24 das afirmações (na ordem das dimensões)
const OFFSETS = [];
(function () { let o = 0; DIMENSOES.forEach(d => { OFFSETS.push(o); o += d.itens.length; }); })();
const TOTAL_AFIRM = DIMENSOES.reduce((a, d) => a + d.itens.length, 0); // 25

let respostas = new Array(TOTAL_AFIRM).fill(null);
let dimIdx = 0;
let motivosSel = [];

// ============================================================
//  ARRANQUE
// ============================================================
window.addEventListener('load', () => {
  if ('serviceWorker' in navigator) { navigator.serviceWorker.register('./sw.js').catch(() => {}); }
  sincronizarFila();

  // já respondeu neste aparelho?
  if (localStorage.getItem(CHAVE_FEITO)) { mostrar('tela-ja'); return; }
  // tem rascunho guardado?
  if (localStorage.getItem(CHAVE_RASCUNHO)) { mostrar('tela-rascunho'); return; }
  // caso contrário fica no intro (já ativo)
});

document.getElementById('i-area').addEventListener('change', function () {
  preencherUnidades(this.value);
});
function preencherUnidades(area, selecionada) {
  const sel = document.getElementById('i-unidade');
  const lista = UNIDADES[area] || [];
  sel.innerHTML = '<option value="">Seleccione…</option>' + lista.map(u => `<option ${u === selecionada ? 'selected' : ''}>${u}</option>`).join('');
}

// ---- navegação inicial ----
function apiUrlValida() {
  return /^https:\/\/script\.google\.com\/macros\/s\/.+\/exec$/.test(API_URL);
}
function comecar() {
  if (!apiUrlValida()) {
    alert('Configuração em falta: o endereço do servidor (API_URL) não está correto. Contacte o RH.');
    return;
  }
  mostrar('tela-ident');
}

function iniciarDimensoes() {
  dimIdx = 0;
  renderDimensao();
  mostrar('tela-dim');
}

// ============================================================
//  RASCUNHO (guardar / retomar)
// ============================================================
function guardarRascunho() {
  try {
    const dados = {
      area: val('i-area'), unidade: val('i-unidade'), antig: val('i-antig'), idade: val('i-idade'),
      respostas: respostas, motivos: motivosSel, dimIdx: dimIdx,
      naoideal: val('m-naoideal'), mel1: val('mel1'), mel2: val('mel2'), mel3: val('mel3'), comentario: val('comentario')
    };
    localStorage.setItem(CHAVE_RASCUNHO, JSON.stringify(dados));
  } catch (e) {}
}
function retomarRascunho() {
  try {
    const d = JSON.parse(localStorage.getItem(CHAVE_RASCUNHO) || '{}');
    if (d.respostas && d.respostas.length === TOTAL_AFIRM) respostas = d.respostas;
    if (d.motivos) motivosSel = d.motivos;
    setVal('i-area', d.area); preencherUnidades(d.area, d.unidade);
    setVal('i-antig', d.antig); setVal('i-idade', d.idade);
    setVal('m-naoideal', d.naoideal); setVal('mel1', d.mel1); setVal('mel2', d.mel2); setVal('mel3', d.mel3); setVal('comentario', d.comentario);
    dimIdx = d.dimIdx || 0;
    renderDimensao();
    mostrar('tela-dim');
  } catch (e) { mostrar('tela-ident'); }
}
function descartarRascunho() {
  localStorage.removeItem(CHAVE_RASCUNHO);
  respostas = new Array(TOTAL_AFIRM).fill(null);
  motivosSel = [];
  mostrar('tela-ident');
}
function val(id) { const el = document.getElementById(id); return el ? el.value : ''; }
function setVal(id, v) { const el = document.getElementById(id); if (el && v != null) el.value = v; }

// ============================================================
//  DIMENSÃO — mostra todas as afirmações da dimensão atual
// ============================================================
function renderDimensao() {
  const dim = DIMENSOES[dimIdx];
  const off = OFFSETS[dimIdx];
  document.getElementById('d-badge').textContent = `Dimensão ${dim.num} de VI`;
  document.getElementById('d-titulo').textContent = dim.nome;
  document.getElementById('d-sub').textContent = dim.itens.length + (dim.itens.length === 1 ? ' afirmação' : ' afirmações') + ' · assinale o seu grau de concordância';
  document.getElementById('d-barra').style.width = (dimIdx / DIMENSOES.length * 100) + '%';

  document.getElementById('d-afirmacoes').innerHTML = dim.itens.map((txt, i) => {
    const g = off + i;
    const botoes = [1, 2, 3, 4].map(v => {
      const sel = respostas[g] === v;
      return `<div class="eb ${sel ? 'sel' : ''}" onclick="responder(${g},${v})">${v}</div>`;
    }).join('');
    return `<div class="afirm"><div class="afirm-txt">${txt}</div><div class="escala-btns">${botoes}</div></div>`;
  }).join('');

  document.getElementById('d-aviso').textContent = '';
  document.getElementById('d-prox').textContent = dimIdx === DIMENSOES.length - 1 ? 'Continuar' : 'Próxima dimensão';
  document.getElementById('d-ant').textContent = dimIdx === 0 ? 'Voltar' : 'Anterior';
}
function responder(g, v) {
  respostas[g] = v;
  guardarRascunho();
  renderDimensao();
}
function dimCompleta() {
  const off = OFFSETS[dimIdx];
  const n = DIMENSOES[dimIdx].itens.length;
  for (let i = 0; i < n; i++) if (!respostas[off + i]) return false;
  return true;
}
function dimAnterior() {
  if (dimIdx === 0) { mostrar('tela-ident'); return; }
  dimIdx--; renderDimensao(); guardarRascunho();
}
function dimProxima() {
  if (!dimCompleta()) {
    document.getElementById('d-aviso').textContent = 'Por favor responda a todas as afirmações desta dimensão antes de continuar.';
    return;
  }
  if (dimIdx < DIMENSOES.length - 1) { dimIdx++; renderDimensao(); guardarRascunho(); return; }
  renderMotivos();
  mostrar('tela-motivos');
}

// ---- VII. motivos ----
function renderMotivos() {
  document.getElementById('motivos-lista').innerHTML = MOTIVOS.map((m, i) => {
    const sel = motivosSel.indexOf(m) >= 0;
    return `<div class="motivo ${sel ? 'sel' : ''}" onclick="toggleMotivo(${i})">
      <div class="cx">${sel ? '&#10003;' : ''}</div><div>${m}</div></div>`;
  }).join('');
  atualizarContador();
}
function toggleMotivo(i) {
  const m = MOTIVOS[i];
  const pos = motivosSel.indexOf(m);
  if (pos >= 0) motivosSel.splice(pos, 1);
  else { if (motivosSel.length >= 5) return; motivosSel.push(m); }
  guardarRascunho();
  renderMotivos();
}
function atualizarContador() {
  document.getElementById('motivos-cont').textContent = motivosSel.length + ' de 5 seleccionados';
}

// ---- submeter ----
async function submeter() {
  const payload = {
    action: 'submit_clima',
    area: val('i-area'),
    unidade: val('i-unidade'),
    antiguidade: val('i-antig'),
    idade: val('i-idade'),
    respostas: respostas.map(r => r || 0),
    motivos: motivosSel,
    naoIdeal: val('m-naoideal').trim(),
    melhorias: [val('mel1').trim(), val('mel2').trim(), val('mel3').trim()],
    comentario: val('comentario').trim()
  };
  const btn = document.getElementById('btn-submeter');
  btn.disabled = true; btn.textContent = 'A enviar…';

  const res = await enviarOuEnfileirar(payload);

  // marca como respondido neste aparelho e limpa o rascunho
  try { localStorage.setItem(CHAVE_FEITO, new Date().toISOString()); localStorage.removeItem(CHAVE_RASCUNHO); } catch (e) {}

  document.getElementById('fim-sync').innerHTML = res.enviado
    ? '<span>&#9729;</span> Enviado — obrigado pela sua participação!'
    : '<span>&#8987;</span> Resposta guardada — será enviada assim que houver ligação à internet';
  document.getElementById('fim-sync').className = 'pinfo ' + (res.enviado ? 'ok' : 'wait');
  mostrar('tela-fim');
}

// ============================================================
//  FILA OFFLINE (igual à app principal)
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
        if (r && r.ok) {
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
  const r = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload)
  });
  return r.json();
}

// ---- navegação ----
function mostrar(id) {
  document.querySelectorAll('.tela').forEach(t => t.classList.remove('ativa'));
  document.getElementById(id).classList.add('ativa');
  const wrap = document.querySelector('.wrap');
  if (wrap) wrap.scrollTop = 0;
}
