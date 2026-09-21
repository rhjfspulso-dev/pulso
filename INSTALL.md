# Pulso JFS — Instalação da Fundação Técnica

## Parte 1 — Backend (Apps Script) na conta Gmail do RH

1. Abra a folha de cálculo **Pulso_Base_Mestra.xlsx** no Google Drive do RH
   (faça upload e abra como Google Sheets).
2. Menu **Extensões → Apps Script**.
3. Apague o conteúdo e cole o ficheiro **Codigo.gs**. Guarde.
4. Na lista de funções, escolha **setupAbas** e clique em **Executar**.
   (autorize quando pedir). Isto cria as abas de respostas.
5. **Implementar → Nova implementação → App da Web**
   - Executar como: **Eu**
   - Quem tem acesso: **Qualquer pessoa**
6. Copie o **URL do app da Web** (termina em `/exec`).

## Parte 2 — Frontend (PWA)

1. Abra **app.js** e cole o URL copiado em `API_URL` (linha no topo).
2. Suba a pasta inteira para o **GitHub Pages** (repositório da conta do RH),
   ou qualquer alojamento estático HTTPS.
3. O endereço público (ex. `https://rh-jfs.github.io/pulso/`) é a base dos links.

## Parte 3 — Links pessoais

Cada colaborador recebe: `SEU_ENDERECO/index.html?t=TOKEN`
onde TOKEN é a coluna **Token** da Base Mestra.
- Dispositivo partilhado (tablet da unidade): acrescente `&shared=1` ao link.

## Ficheiros
- `Codigo.gs` — backend (cola no Apps Script)
- `index.html`, `app.js`, `estilo.css` — a PWA
- `sw.js`, `manifest.json` — o que a torna instalável e offline
- `icon-192.png`, `icon-512.png` — ícones (substituíveis pelo logo real)
