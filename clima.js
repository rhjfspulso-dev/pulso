/* ============================================================
   PULSO JFS — clima.js
   Pesquisa de Satisfação (FR_RH_23-1_R2) · anónima · sem token
   ============================================================ */

// >>> COLE AQUI O URL DO APPS SCRIPT (termina em /exec) <<<
const API_URL = 'https://script.google.com/macros/s/AKfycbzBreSCJ6tSVYfzKzmOUgWm2UpGdBfoUYQEKlg57k4KQTdZbikGeXB29jt8BHFh09YA/exec';

// ---- 25 afirmações em 6 dimensões (questionário oficial) ----
const DIMENSOES = [
  { nome: 'I. Negócio e Alinhamento', itens: [
    'Eu conheço os valores da empresa.',
    'A missão e os valores da empresa estão alinhados com o que eu valorizo.',
    'Eu conheço as áreas de negócio da empresa.',
    'Eu conheço os objectivos da minha função.',
    'Eu tenho orgulho de trabalhar para a empresa.'
  ]},
  { nome: 'II. Condições de Trabalho & Equilíbrio', itens: [
    'Os meios e equipamentos de trabalho são adequados à minha função.',
    'A política de higiene e segurança adoptada pela empresa é adequada para prevenir riscos.',
    'Considero o horário de trabalho adoptado pela empresa adequado.'
  ]},
  { nome: 'III. Salários & Benefícios', itens: [
    'Considero o meu salário compatível com o que é praticado no mercado para a mesma função.',
    'O plano de saúde oferecido pela empresa é adequado.',
    'Considero o serviço de refeitório adequado.',
    'Valorizo a acção da empresa em conceder apoio, através do fundo social, para atender a prioridades pessoais.'
  ]},
  { nome: 'IV. Liderança', itens: [
    'O meu líder estimula a cooperação e o trabalho de equipa na minha área.',
    'O meu superior imediato age de acordo com o que fala.',
    'O meu superior trata as situações de conflito com transparência e imparcialidade.',
    'O meu líder inspira-me.',
    'Eu sinto que recebo feedback do meu líder sobre o meu trabalho e desempenho.'
  ]},
  { nome: 'V. Comunicação', itens: [
    'A Empresa comunica de forma transparente.',
    'Sinto-me bem informado sobre os assuntos relevantes da Empresa.',
    'Na Empresa, posso expressar as minhas opiniões sem receio.',
    'A comunicação, orientação e apoio recebidos do meu líder directo são positivos e transmitem confiança.'
  ]},
  { nome: 'VI. Carreira e Desempenho', itens: [
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

// unidades por área de negócio
const UNIDADES = {
  'Automóvel': ['TI Mitsubishi', 'TI FCA', 'TI Versalhes', 'Forjadora', 'Promotors', 'TI Beira', 'TI Tete', 'TI Nampula', 'TI Pemba', 'Sodauto Maputo', 'Sodauto Tete', 'Sodauto Pemba'],
  'Agrícola': ['SAN e Mozaco', 'Companhia Agrícola', 'CIJFS (Fábrica de Óleo)', 'Citrinos', 'Projecto Total (Palma)', 'João Agricultor'],
  'Imobiliária': ['Imobiliária'],
  'Serviços Centrais': ['Serviços Centrais']
};

// ---- estado ----
let planas = [];   // lista achatada de {dim, texto} para navegar 1 a 1
let respostas = [];
let idx = 0;
let motivosSel = [];

// achatar as dimensões numa lista única
DIMENSOES.forEach(d => d.itens.forEach(t => planas.push({ dim: d.nome, texto: t })));
respostas = new Array(planas.length).fill(null);

window.addEventListener('load', () => {
  if ('serviceWorker' in navigator) { navigator.serviceWorker.register('./sw.js').catch(() => {}); }
  sincronizarFila();
});

// ---- navegação inicial ----
function irIdentificacao() { mostrar('tela-ident'); }

document.getElementById('i-area').addEventListener('change', function () {
  const sel = document.getElementById('i-unidade');
  const lista = UNIDADES[this.value] || [];
  sel.innerHTML = '<option value="">Seleccione…</option>' + lista.map(u => `<option>${u}</option>`).join('');
});

function iniciarPerguntas() {
  idx = 0;
  renderPergunta();
  mostrar('tela-pergunta');
}

// ---- afirmações (escala) ----
function renderPergunta() {
  const p = planas[idx];
  document.getElementById('p-dim').textContent = p.dim;
  document.getElementById('p-num').textContent = `Afirmação ${idx + 1} de ${planas.length}`;
  document.getElementById('p-texto').textContent = p.texto;
  document.getElementById('p-barra').style.width = (idx / planas.length * 100) + '%';
  document.getElementById('p-opcoes').innerHTML = ESCALA.map((e, j) => {
    const sel = respostas[idx] === j + 1;
    return `<div class="opt ${sel ? 'sel' : ''}" onclick="escolher(${j + 1})">${e}</div>`;
  }).join('');
  document.getElementById('p-prox').disabled = !respostas[idx];
  document.getElementById('p-prox').textContent = idx === planas.length - 1 ? 'Continuar' : 'Próxima';
  document.getElementById('p-ant').textContent = idx === 0 ? 'Voltar' : 'Anterior';
}
function escolher(v) { respostas[idx] = v; renderPergunta(); }
function pergAnterior() {
  if (idx === 0) { mostrar('tela-ident'); }
  else { idx--; renderPergunta(); }
}
function pergProxima() {
  if (idx < planas.length - 1) { idx++; renderPergunta(); return; }
  // acabaram as afirmações -> motivos
  renderMotivos();
  mostrar('tela-motivos');
}
function voltarParaUltimaPergunta() { idx = planas.length - 1; renderPergunta(); mostrar('tela-pergunta'); }

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
  renderMotivos();
}
function atualizarContador() {
  document.getElementById('motivos-cont').textContent = motivosSel.length + ' de 5 seleccionados';
}

// ---- submeter ----
async function submeter() {
  const payload = {
    action: 'submit_clima',
    area: document.getElementById('i-area').value,
    unidade: document.getElementById('i-unidade').value,
    antiguidade: document.getElementById('i-antig').value,
    idade: document.getElementById('i-idade').value,
    respostas: respostas.map(r => r || 0),
    motivos: motivosSel,
    naoIdeal: document.getElementById('m-naoideal').value.trim(),
    melhorias: [
      document.getElementById('mel1').value.trim(),
      document.getElementById('mel2').value.trim(),
      document.getElementById('mel3').value.trim()
    ],
    comentario: document.getElementById('comentario').value.trim()
  };
  const btn = document.getElementById('btn-submeter');
  btn.disabled = true; btn.textContent = 'A enviar…';

  const res = await enviarOuEnfileirar(payload);
  document.getElementById('fim-sync').innerHTML = res.enviado
    ? '<span>&#9729;</span> Enviado — obrigado pela sua participação!'
    : '<span>&#8987;</span> Guardado no telemóvel — será enviado quando houver rede';
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
