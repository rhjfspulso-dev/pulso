/* ============================================================
   PULSO JFS — metas.js
   Definição e Avaliação de Metas (procedimento + Excel da Sandra)
   Papéis: gestor (define/avalia) e colaborador (aceita/consulta).
   Âmbito: lideranças (360º/270º) + níveis V e superiores.
   ============================================================ */

// >>> URL do Apps Script (termina em /exec) <<<
const API_URL = 'https://script.google.com/macros/s/AKfycbzBreSCJ6tSVYfzKzmOUgWm2UpGdBfoUYQEKlg57k4KQTdZbikGeXB29jt8BHFh09YA/exec';

const TIPOS = ['Quantitativa', 'Qualitativa'];
const FASE_NOME = { definicao: 'Definição de metas', acompanhamento: 'Acompanhamento', avaliacao: 'Avaliação de resultados' };

let TOKEN = null;
let ME = null;
let edMetas = [];        // editor de metas (gestor)
let alvoAtual = null;    // liderado em edição/avaliação

// ============================================================
function apiUrlValida() { return /^https:\/\/script\.google\.com\/macros\/s\/.+\/exec$/.test(API_URL); }
window.addEventListener('load', init);

async function init() {
  if ('serviceWorker' in navigator) { try { await navigator.serviceWorker.register('./sw.js'); } catch (e) {} }
  if (!apiUrlValida()) { return erro('Configuração em falta: o endereço do servidor não está correto. Contacte o RH.'); }
  const url = new URL(location.href);
  TOKEN = url.searchParams.get('t') || localStorage.getItem('pulso_token_metas');
  if (url.searchParams.get('t')) localStorage.setItem('pulso_token_metas', TOKEN);
  sincronizarFila();
  if (!TOKEN) { mostrar('tela-sem-token'); return; }
  await carregar();
}

async function carregar() {
  mostrar('tela-loading');
  try {
    const r = await apiGet('metas_me', { t: TOKEN });
    if (!r.ok) return erro(r.error === 'token_invalido' ? 'Este link não é válido. Contacte o RH.' : 'Ocorreu um erro. Tente novamente.');
    ME = r;
    if (!ME.colaborador && !ME.gestor) { mostrar('tela-nao-elegivel'); return; }
    renderHome();
  } catch (e) { erro('Sem ligação. Ligue-se à internet uma vez para carregar os seus dados.'); }
}
function erro(msg) { mostrar('tela-erro'); document.getElementById('erro-msg').textContent = msg; }

// ============================================================
//  HOME
// ============================================================
function renderHome() {
  const p = ME.pessoa;
  document.getElementById('home-nome').textContent = 'Olá, ' + p.nome.split(' ')[0] + '!';
  document.getElementById('home-cargo').textContent = p.cargo + ' · ' + p.unidade;
  document.getElementById('home-fase').textContent = 'Ciclo ' + ME.ciclo + ' · ' + (FASE_NOME[ME.fase] || ME.fase);

  const cards = [];
  if (ME.colaborador) {
    const c = ME.colaborador;
    let sub, badge, done = false;
    if (ME.fase === 'avaliacao') {
      sub = c.resultado ? 'Resultado disponível' : 'A aguardar avaliação do gestor';
      badge = c.resultado ? 'Ver' : 'Pendente'; done = false;
    } else {
      if (!c.metas.length) { sub = 'O seu gestor ainda não definiu as suas metas'; badge = 'A aguardar'; }
      else if (c.aceite) { sub = c.metas.length + ' metas · aceites'; badge = 'Concluída'; done = false; }
      else { sub = c.metas.length + ' metas · rever e aceitar'; badge = 'Aberta'; }
    }
    cards.push(card('minhas', '&#9873;', 'As minhas metas', sub, badge, done));
  }
  if (ME.gestor) {
    const eq = ME.gestor.equipa;
    let pend;
    if (ME.fase === 'avaliacao') pend = eq.filter(e => !e.avaliado).length;
    else pend = eq.filter(e => !e.metas.length || Math.abs(e.pesoTotal - (1 - ME.pesoComp)) > 0.005 || !e.aceite).length;
    cards.push(card('equipa', '&#128101;', 'Metas da minha equipa',
      pend === 0 ? 'Tudo tratado — obrigado!' : pend + (pend === 1 ? ' pessoa a tratar' : ' pessoas a tratar'),
      pend === 0 ? 'Concluída' : 'Aberta', false));
  }
  document.getElementById('home-cards').innerHTML = cards.join('');
  mostrar('tela-home');
}
function card(acao, ic, tit, sub, badge, done) {
  const cls = (badge === 'Concluída') ? 'hcb feito' : 'hcb';
  return `<div class="hc" onclick="abrir('${acao}')"><div class="hci">${ic}</div>
    <div><div class="hct">${tit}</div><div class="hcs">${sub}</div></div><div class="${cls}">${badge}</div></div>`;
}
function irHome() { renderHome(); }
function abrir(a) { if (a === 'minhas') renderMinhas(); if (a === 'equipa') renderEquipa(); }

// ============================================================
//  COLABORADOR — as minhas metas
// ============================================================
function renderMinhas() {
  const c = ME.colaborador, pcPct = Math.round(ME.pesoComp * 100);
  document.getElementById('minhas-sub').textContent = 'As minhas metas · ciclo ' + ME.ciclo;
  let h = '';
  if (!c.metas.length) {
    h = '<div class="q-desc">O seu gestor ainda não definiu as suas metas para este ciclo. Volte mais tarde.</div>';
    document.getElementById('minhas-corpo').innerHTML = h;
    document.getElementById('minhas-pe').innerHTML = '<button class="btn-primario" onclick="irHome()">Voltar ao início</button>';
    mostrar('tela-minhas'); return;
  }

  // lista das metas
  c.metas.forEach(m => {
    h += metaCardHTML(m, c.resultado);
  });
  // linha das competências (20%)
  h += `<div class="meta-card" style="border-style:dashed">
    <div class="meta-top"><div class="meta-n">★</div><div class="meta-tit">Avaliação de Competências</div><div class="meta-peso">${pcPct}%</div></div>
    <div class="meta-desc">Nota consolidada do processo de Avaliação de Desempenho (escala 1–4).</div>
    <div class="meta-linha"><span><b>Nota atual:</b> ${c.notaComp != null ? c.notaComp.toFixed(2) + ' / 4' : 'ainda não consolidada'}</span></div></div>`;

  // rodapé por fase
  let pe = '';
  if (ME.fase === 'avaliacao' && c.resultado) {
    h += resultadoHTML(c.resultado, c.comentarioGestor);
    h += `<div class="campo" style="margin-top:14px"><label>O seu comentário (opcional)</label><textarea id="col-coment" rows="3" placeholder="Comentário sobre a sua avaliação…"></textarea></div>`;
    pe = `<button class="btn-sec" onclick="irHome()">Voltar</button><button class="btn-primario" style="flex:1.5" onclick="enviarComentario()">Enviar comentário</button>`;
  } else {
    if (c.aceite) {
      h += '<div class="pinfo ok" style="margin-top:14px"><span>&#10003;</span> Já aceitou estas metas. Bom ciclo!</div>';
      pe = '<button class="btn-primario" onclick="irHome()">Voltar ao início</button>';
    } else {
      h += `<div class="campo" style="margin-top:14px"><label>Comentário (opcional)</label><textarea id="col-coment" rows="2" placeholder="Algo a registar sobre as metas…"></textarea></div>`;
      pe = `<button class="btn-sec" onclick="irHome()">Voltar</button><button class="btn-primario" id="btn-aceitar" style="flex:1.5" onclick="aceitar()">Aceitar metas</button>`;
    }
  }
  document.getElementById('minhas-corpo').innerHTML = h;
  document.getElementById('minhas-pe').innerHTML = pe;
  mostrar('tela-minhas');
}
function metaCardHTML(m, resultado) {
  const pct = Math.round((m.peso || 0) * 100);
  return `<div class="meta-card"><div class="meta-top"><div class="meta-n">${m.num}</div>
    <div class="meta-tit">${esc(m.titulo)}</div><div class="meta-peso">${pct}%</div></div>
    ${m.descricao ? `<div class="meta-desc">${esc(m.descricao)}</div>` : ''}
    <div class="meta-linha"><span><b>Tipo:</b> ${esc(m.tipo || '—')}</span><span><b>Meta/alvo:</b> ${esc(m.alvo)}</span><span><b>Prazo:</b> ${esc(m.prazo || '—')}</span></div></div>`;
}
function resultadoHTML(r, comentarioGestor) {
  const pct = Math.round(r.pct * 100);
  let h = `<div class="tot-caixa"><div style="font-size:11px;font-weight:700;color:var(--azul);text-transform:uppercase;letter-spacing:.5px">Atingimento final</div>
    <div class="tot-num">${pct}%</div><div class="tot-cls">${r.classificacao}</div>
    ${!r.completo ? '<div style="font-size:11px;color:var(--amarelo);margin-top:6px">Resultado parcial — ainda faltam dados.</div>' : ''}</div>`;
  h += '<div style="font-size:12px;font-weight:700;color:var(--txt-2);margin:4px 0 8px">Detalhe por meta</div>';
  r.detalhe.forEach(d => {
    const cp = d.contrib != null ? Math.round(d.contrib * 100) : null;
    h += `<div class="res-row" style="grid-template-columns:1fr auto"><div>${d.num}. ${esc(d.titulo)} <span style="color:var(--txt-3)">(peso ${Math.round(d.peso * 100)}%)</span><div class="meta-linha"><span>alvo ${esc(d.alvo)} · resultado ${d.resultado != null ? esc(d.resultado) : '–'}</span></div></div>
      <div style="font-weight:800;color:var(--azul)">${cp != null ? cp + '%' : '–'}</div></div>`;
  });
  if (comentarioGestor) h += `<div class="pinfo neutro" style="margin-top:12px;text-align:left"><span>&#128172;</span> <b>Gestor:</b> ${esc(comentarioGestor)}</div>`;
  return h;
}
async function aceitar() {
  const btn = document.getElementById('btn-aceitar'); btn.disabled = true; btn.textContent = 'A enviar…';
  const com = (document.getElementById('col-coment') || {}).value || '';
  const res = await enviarOuEnfileirar({ action: 'submit_metas_acordo', token: TOKEN, comentario: com.trim() });
  if (ME.colaborador) ME.colaborador.aceite = true;
  fim('Metas aceites!', res.enviado);
}
async function enviarComentario() {
  const com = (document.getElementById('col-coment') || {}).value || '';
  const res = await enviarOuEnfileirar({ action: 'submit_metas_acordo', token: TOKEN, comentario: com.trim() });
  fim('Comentário registado!', res.enviado);
}

// ============================================================
//  GESTOR — equipa
// ============================================================
function renderEquipa() {
  const eq = ME.gestor.equipa;
  document.getElementById('equipa-nota').textContent = ME.fase === 'avaliacao'
    ? 'Insira os resultados de cada colaborador. A nota de competências (20%) entra automaticamente.'
    : 'Defina as metas de cada liderado (3 a 5, pesos a somar 80%). O colaborador depois aceita.';
  const alvo = 1 - ME.pesoComp;
  document.getElementById('equipa-lista').innerHTML = eq.map(e => {
    let badge, sub;
    if (ME.fase === 'avaliacao') {
      badge = e.avaliado ? '<span class="badge-st st-ok">avaliado</span>' : '<span class="badge-st st-pend">por avaliar</span>';
      sub = e.metas.length + ' metas' + (e.avaliado ? '' : ' · inserir resultados');
    } else {
      const okPeso = e.metas.length && Math.abs(e.pesoTotal - alvo) <= 0.005;
      badge = !e.metas.length ? '<span class="badge-st st-pend">sem metas</span>'
        : !okPeso ? '<span class="badge-st st-pend">pesos ≠ 80%</span>'
        : e.aceite ? '<span class="badge-st st-ok">aceite</span>' : '<span class="badge-st st-pend">a aguardar aceite</span>';
      sub = e.metas.length ? (e.metas.length + ' metas · ' + Math.round(e.pesoTotal * 100) + '%') : 'definir metas';
    }
    return `<div class="hc" onclick="abrirLiderado('${e.token}')"><div class="hci">&#9679;</div>
      <div><div class="hct">${esc(e.nome)}</div><div class="hcs">${esc(e.cargo)} · ${sub}</div></div>${badge}</div>`;
  }).join('');
  mostrar('tela-equipa');
}
function abrirLiderado(token) {
  alvoAtual = ME.gestor.equipa.find(e => e.token === token);
  if (ME.fase === 'avaliacao') renderAvaliar(); else renderDefinir();
}
function voltarEquipa() { renderEquipa(); }

// ---- definir metas ----
function renderDefinir() {
  document.getElementById('definir-quem').textContent = 'Metas de ' + alvoAtual.nome;
  // pré-preenche com metas existentes (peso fração -> %)
  edMetas = (alvoAtual.metas || []).map(m => ({ titulo: m.titulo, descricao: m.descricao, tipo: m.tipo || 'Quantitativa', peso: Math.round((m.peso || 0) * 100), alvo: m.alvo, prazo: m.prazo }));
  while (edMetas.length < 3) edMetas.push({ titulo: '', descricao: '', tipo: 'Quantitativa', peso: '', alvo: '', prazo: '' });
  renderEdMetas();
  mostrar('tela-definir');
}
function renderEdMetas() {
  document.getElementById('ed-metas').innerHTML = edMetas.map((m, i) => `
    <div class="ed-meta">
      ${edMetas.length > 1 ? `<button class="ed-rm" onclick="rmMeta(${i})">&times;</button>` : ''}
      <div class="campo"><label>Meta ${i + 1} · título</label><input value="${attr(m.titulo)}" oninput="setMeta(${i},'titulo',this.value)" placeholder="Ex.: Aumentar vendas da unidade"></div>
      <div class="campo"><label>Descrição</label><textarea rows="2" oninput="setMeta(${i},'descricao',this.value)" placeholder="O que se espera, de forma SMART…">${esc(m.descricao || '')}</textarea></div>
      <div class="campo-grid">
        <div class="campo"><label>Tipo</label><select onchange="setMeta(${i},'tipo',this.value)">${TIPOS.map(t => `<option ${m.tipo === t ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
        <div class="campo"><label>Peso %</label><input type="number" min="0" max="100" value="${attr(m.peso)}" oninput="setMeta(${i},'peso',this.value)"></div>
        <div class="campo"><label>Alvo</label><input value="${attr(m.alvo)}" oninput="setMeta(${i},'alvo',this.value)" placeholder="Ex.: 100"></div>
      </div>
      <div class="campo"><label>Prazo</label><input value="${attr(m.prazo)}" oninput="setMeta(${i},'prazo',this.value)" placeholder="Ex.: Dez 2026"></div>
    </div>`).join('');
  atualizarPesos();
}
function setMeta(i, k, v) { edMetas[i][k] = v; if (k === 'peso') atualizarPesos(); }
function addMetaVazia() { if (edMetas.length >= 10) return; edMetas.push({ titulo: '', descricao: '', tipo: 'Quantitativa', peso: '', alvo: '', prazo: '' }); renderEdMetas(); }
function rmMeta(i) { edMetas.splice(i, 1); renderEdMetas(); }
function somaPesos() { return edMetas.reduce((a, m) => a + (Number(m.peso) || 0), 0); }
function atualizarPesos() {
  const alvo = Math.round((1 - ME.pesoComp) * 100);
  const s = somaPesos();
  const bar = document.getElementById('pesos-bar');
  bar.innerHTML = `<span>Soma dos pesos</span><span>${s}% / ${alvo}%</span>`;
  bar.className = 'pesos-bar ' + (s === alvo ? 'ok' : 'erro');
}
async function submeterDef() {
  const alvo = Math.round((1 - ME.pesoComp) * 100);
  const av = document.getElementById('definir-aviso');
  if (edMetas.length < 1 || edMetas.length > 10) { av.textContent = 'Defina entre 1 e 10 metas.'; return; }
  for (const m of edMetas) {
    if (!String(m.titulo).trim()) { av.textContent = 'Todas as metas precisam de um título.'; return; }
    if (!(Number(m.peso) > 0)) { av.textContent = 'Cada meta precisa de um peso maior que 0.'; return; }
    if (!(Number(m.alvo) > 0)) { av.textContent = 'Cada meta precisa de um alvo numérico maior que 0.'; return; }
  }
  if (somaPesos() !== alvo) { av.textContent = `Os pesos devem somar ${alvo}% (está em ${somaPesos()}%).`; return; }

  const metas = edMetas.map(m => ({ titulo: m.titulo.trim(), descricao: (m.descricao || '').trim(), tipo: m.tipo, peso: Number(m.peso) / 100, alvo: Number(m.alvo), prazo: (m.prazo || '').trim() }));
  const btn = document.getElementById('btn-def'); btn.disabled = true; btn.textContent = 'A guardar…';
  const res = await enviarOuEnfileirar({ action: 'submit_metas_def', token: TOKEN, tokenColab: alvoAtual.token, metas: metas });
  // atualiza em memória
  alvoAtual.metas = metas.map((m, i) => ({ num: i + 1, titulo: m.titulo, descricao: m.descricao, tipo: m.tipo, peso: m.peso, alvo: m.alvo, prazo: m.prazo }));
  alvoAtual.pesoTotal = metas.reduce((a, m) => a + m.peso, 0); alvoAtual.aceite = false;
  fim('Metas guardadas para ' + alvoAtual.nome.split(' ')[0] + '!', res.enviado);
}

// ---- avaliar metas ----
let avResultados = {};
function renderAvaliar() {
  document.getElementById('avaliar-quem').textContent = 'Avaliar ' + alvoAtual.nome;
  avResultados = {};
  (alvoAtual.resultados || []).forEach(r => { avResultados[r.num] = r.resultado; });
  if (!alvoAtual.metas.length) {
    document.getElementById('av-metas').innerHTML = '<div class="q-desc">Este colaborador ainda não tem metas definidas.</div>';
  } else {
    document.getElementById('av-metas').innerHTML = alvoAtual.metas.map(m => `
      <div class="res-row"><div>${m.num}. ${esc(m.titulo)} <span style="color:var(--txt-3)">(peso ${Math.round(m.peso * 100)}% · alvo ${esc(m.alvo)})</span></div>
        <input class="res-in" type="number" value="${avResultados[m.num] != null ? attr(avResultados[m.num]) : ''}" oninput="setResultado(${m.num},this.value)" placeholder="result."></div>`).join('');
  }
  document.getElementById('av-nota').textContent = alvoAtual.notaComp != null
    ? 'Competências (20%): nota ' + alvoAtual.notaComp.toFixed(2) + '/4'
    : 'Competências (20%): ainda não consolidada';
  calcularAv();
  mostrar('tela-avaliar');
}
function setResultado(num, v) { avResultados[num] = v === '' ? null : Number(v); calcularAv(); }
function calcularAv() {
  let soma = 0, completo = true;
  alvoAtual.metas.forEach(m => {
    const r = avResultados[m.num];
    if (r != null && m.alvo > 0) soma += (r / m.alvo) * m.peso; else completo = false;
  });
  let total = soma;
  if (alvoAtual.notaComp != null) total += (alvoAtual.notaComp / 4) * ME.pesoComp; else completo = false;
  document.getElementById('av-total').textContent = Math.round(total * 100) + '%';
  document.getElementById('av-cls').textContent = classificar(total);
}
function classificar(p) {
  if (p > 1.01) return 'Supera as expectativas';
  if (p >= 1.00) return 'Atende as expectativas';
  if (p > 0.70) return 'Parcialmente atinge as expectativas';
  if (p >= 0.50) return 'Insatisfatório';
  return 'Deficiente / Não atingiu';
}
async function submeterAval() {
  const resultados = alvoAtual.metas
    .filter(m => avResultados[m.num] != null)
    .map(m => ({ num: m.num, resultado: Number(avResultados[m.num]) }));
  if (!resultados.length) { document.getElementById('av-cls').textContent = 'Insira pelo menos um resultado.'; return; }
  const btn = document.getElementById('btn-av'); btn.disabled = true; btn.textContent = 'A registar…';
  const res = await enviarOuEnfileirar({ action: 'submit_metas_aval', token: TOKEN, tokenColab: alvoAtual.token,
    resultados: resultados, comentarioGestor: (document.getElementById('av-coment').value || '').trim() });
  alvoAtual.avaliado = true; alvoAtual.resultados = resultados;
  fim('Avaliação de ' + alvoAtual.nome.split(' ')[0] + ' registada!', res.enviado);
}

// ============================================================
//  FIM
// ============================================================
function fim(titulo, enviado) {
  document.getElementById('fim-t').textContent = titulo;
  document.getElementById('fim-sync').innerHTML = enviado
    ? '<span>&#9729;</span> Enviado ao servidor do RH'
    : '<span>&#8987;</span> Guardado — será enviado assim que houver ligação à internet';
  document.getElementById('fim-sync').className = 'pinfo ' + (enviado ? 'ok' : 'wait');
  mostrar('tela-fim');
}

// ============================================================
//  FILA OFFLINE / API
// ============================================================
function abrirDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('pulso', 1);
    req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains('fila')) req.result.createObjectStore('fila', { keyPath: 'id', autoIncrement: true }); };
    req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error);
  });
}
async function enfileirar(payload) {
  const db = await abrirDB();
  return new Promise((resolve) => { const tx = db.transaction('fila', 'readwrite'); tx.objectStore('fila').add({ payload, ts: Date.now() }); tx.oncomplete = () => resolve(); });
}
async function enviarOuEnfileirar(payload) {
  try { const r = await apiPost(payload); if (r && (r.ok || r.error === 'ja_submetido')) return { enviado: true, resp: r }; throw new Error('nao_ok'); }
  catch (e) { await enfileirar(payload); return { enviado: false }; }
}
let _sync = false;
async function sincronizarFila() {
  if (_sync) return; _sync = true;
  try {
    let db; try { db = await abrirDB(); } catch (e) { return; }
    const itens = await new Promise((resolve) => { const tx = db.transaction('fila', 'readonly'); const g = tx.objectStore('fila').getAll(); g.onsuccess = () => resolve(g.result || []); g.onerror = () => resolve([]); });
    for (const item of itens) {
      try { const r = await apiPost(item.payload);
        if (r && (r.ok || r.error === 'ja_submetido')) { await new Promise((resolve) => { const tx = db.transaction('fila', 'readwrite'); tx.objectStore('fila').delete(item.id); tx.oncomplete = () => resolve(); tx.onerror = () => resolve(); }); }
      } catch (e) { break; }
    }
  } finally { _sync = false; }
}
window.addEventListener('online', sincronizarFila);
setInterval(sincronizarFila, 30000);

async function apiGet(action, params) {
  const u = new URL(API_URL); u.searchParams.set('action', action);
  Object.keys(params || {}).forEach(k => u.searchParams.set(k, params[k]));
  const r = await fetch(u.toString()); return r.json();
}
async function apiPost(payload) {
  const r = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) });
  return r.json();
}

// ============================================================
function mostrar(id) {
  document.querySelectorAll('.tela').forEach(t => t.classList.remove('ativa'));
  document.getElementById(id).classList.add('ativa');
  const w = document.querySelector('.wrap'); if (w) w.scrollTop = 0;
}
function esc(s) { return (s === null || s === undefined) ? '' : (''+ s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
function attr(s) { return (s === null || s === undefined) ? '' : (''+s).replace(/"/g, '&quot;'); }
