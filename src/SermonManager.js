import { db } from './db.js';

export class SermonManager {
  constructor(tabManager) {
    this.tabManager = tabManager;
    this.SERMAO_ATUAL_ID = null;
    this.editoresQuill = {};
    this.tempoEsperaSermao = null;
  }

  init() {
    ['titulo', 'passagem', 'dataPregacao', 'horarioPregacao', 'local', 'ocasio'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', () => this.dispararAutoSaveSermao());
    });

    document.getElementById('btn-add-bloco')?.addEventListener('click', () => this.adicionarNovoBloco());
    document.getElementById('btn-export-pdf')?.addEventListener('click', () => this.exportarParaPDF());
    document.getElementById('btn-novo-sermao-vazio')?.addEventListener('click', () => this.criarNovoSermaoVazio());
  }

  formatarDataEHoraBR(dataIso, hora) {
    if (!dataIso) return 'Sem data';
    const partes = dataIso.split('-');
    let dataFormatada = dataIso;
    if (partes.length === 3) {
      dataFormatada = `${partes[2]}/${partes[1]}/${partes[0]}`;
    }
    return hora ? `${dataFormatada} às ${hora}` : dataFormatada;
  }

  criarElementoBloco(idBloco, tituloBloco = '', conteudoHtml = '') {
  const container = document.getElementById('lista-blocos');
  const divBloco = document.createElement('div');
  divBloco.className = 'bloco-card';
  divBloco.id = `card-${idBloco}`;
  
  divBloco.innerHTML = `
    <div class="bloco-header">
      <input type="text" class="titulo-bloco" value="${tituloBloco}" placeholder="Nome do Bloco (ex: Introdução, Ponto 1)...">
      <div class="controles-bloco">
        <button class="btn-acao btn-subir" title="Mover para cima">▲</button>
        <button class="btn-acao btn-descer" title="Mover para baixo">▼</button>
        <button class="btn-acao btn-remover" title="Excluir Bloco">✕</button>
      </div>
    </div>
    <div id="editor-${idBloco}" class="editor-container"></div>
  `;

  container.appendChild(divBloco);

  /* global Quill */
  // Inicialização independente do Quill para cada bloco
  const quill = new Quill(`#editor-${idBloco}`, {
    theme: 'snow',
    placeholder: `Escreva sobre ${tituloBloco || 'este bloco'}...`,
    modules: {
      toolbar: [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        ['blockquote', 'code-block'],
        ['clean']
      ]
    }
  });

  if (conteudoHtml) {
    quill.root.innerHTML = conteudoHtml;
  }

  // Eventos de alteração e botões do bloco
  quill.on('text-change', () => this.dispararAutoSaveSermao());
  
  const inputTitulo = divBloco.querySelector('.titulo-bloco');
  inputTitulo.addEventListener('input', () => this.dispararAutoSaveSermao());

  divBloco.querySelector('.btn-subir').addEventListener('click', () => this.moverBloco(idBloco, -1));
  divBloco.querySelector('.btn-descer').addEventListener('click', () => this.moverBloco(idBloco, 1));
  divBloco.querySelector('.btn-remover').addEventListener('click', () => this.removerBloco(idBloco));

  this.editoresQuill[idBloco] = quill;
}

  moverBloco(idBloco, direcao) {
    const card = document.getElementById(`card-${idBloco}`);
    if (!card) return;
    if (direcao === -1 && card.previousElementSibling) {
      card.parentNode.insertBefore(card, card.previousElementSibling);
      this.dispararAutoSaveSermao();
    } else if (direcao === 1 && card.nextElementSibling) {
      card.parentNode.insertBefore(card.nextElementSibling, card);
      this.dispararAutoSaveSermao();
    }
  }

  adicionarNovoBloco(titulo = '', conteudo = '') {
    const idBloco = 'bloco_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
    this.criarElementoBloco(idBloco, titulo, conteudo);
    this.dispararAutoSaveSermao();
  }

  removerBloco(idBloco) {
    const card = document.getElementById(`card-${idBloco}`);
    if (card) {
      card.remove();
      delete this.editoresQuill[idBloco];
      this.dispararAutoSaveSermao();
    }
  }

  async salvarSermaoLocalmente() {
  if (!this.SERMAO_ATUAL_ID) return;

  const titulo = document.getElementById('titulo')?.value || '';
  const passagem = document.getElementById('passagem')?.value || '';
  const dataPregacao = document.getElementById('dataPregacao')?.value || '';
  const horarioPregacao = document.getElementById('horarioPregacao')?.value || '';
  const local = document.getElementById('local')?.value || '';
  const ocasio = document.getElementById('ocasio')?.value || '';
  
  const blocosData = [];
  document.querySelectorAll('.bloco-card').forEach(card => {
    const idBloco = card.id.replace('card-', '');
    const tituloBloco = card.querySelector('.titulo-bloco')?.value || '';
    const conteudoHtml = this.editoresQuill[idBloco] ? this.editoresQuill[idBloco].root.innerHTML : '';
    blocosData.push({ id: idBloco, tituloBloco, conteudoHtml });
  });

  await db.sermoes.put({
    id: this.SERMAO_ATUAL_ID,
    titulo, passagem, dataPregacao, horarioPregacao, local, ocasio,
    blocos: blocosData,
    atualizadoEm: new Date().toISOString()
  });

  const statusEl = document.getElementById('status-salvamento');
  if (statusEl) statusEl.innerText = `Sermão salvo às ${new Date().toLocaleTimeString()}`;
  }

  dispararAutoSaveSermao() {
    document.getElementById('status-salvamento').innerText = "Salvando sermão...";
    clearTimeout(this.tempoEsperaSermao);
    this.tempoEsperaSermao = setTimeout(() => this.salvarSermaoLocalmente(), 800);
  }

async carregarSermaoNoEditor(id) {
  this.SERMAO_ATUAL_ID = id;
  const listaBlocos = document.getElementById('lista-blocos');
  if (listaBlocos) listaBlocos.innerHTML = '';
  this.editoresQuill = {};

  const sermao = await db.sermoes.get(id);
  if (sermao) {
    if (document.getElementById('titulo')) document.getElementById('titulo').value = sermao.titulo || '';
    if (document.getElementById('passagem')) document.getElementById('passagem').value = sermao.passagem || '';
    if (document.getElementById('dataPregacao')) document.getElementById('dataPregacao').value = sermao.dataPregacao || '';
    if (document.getElementById('horarioPregacao')) document.getElementById('horarioPregacao').value = sermao.horarioPregacao || '';
    if (document.getElementById('local')) document.getElementById('local').value = sermao.local || '';
    if (document.getElementById('ocasio')) document.getElementById('ocasio').value = sermao.ocasio || '';

    if (sermao.blocos && sermao.blocos.length > 0) {
      sermao.blocos.forEach(b => this.criarElementoBloco(b.id, b.tituloBloco, b.conteudoHtml));
    }
  }

  // AJUSTADO: Passando 'aba-editor' com o prefixo exato do HTML
  this.tabManager.trocarAba('aba-editor');
}

async criarNovoSermaoVazio() {
  const novoId = 'sermao_' + Date.now();
  this.SERMAO_ATUAL_ID = novoId;

  if (document.getElementById('titulo')) document.getElementById('titulo').value = '';
  if (document.getElementById('passagem')) document.getElementById('passagem').value = '';
  if (document.getElementById('dataPregacao')) document.getElementById('dataPregacao').value = '';
  if (document.getElementById('horarioPregacao')) document.getElementById('horarioPregacao').value = '';
  if (document.getElementById('local')) document.getElementById('local').value = '';
  if (document.getElementById('ocasio')) document.getElementById('ocasio').value = '';

  const listaBlocos = document.getElementById('lista-blocos');
  if (listaBlocos) listaBlocos.innerHTML = '';
  this.editoresQuill = {};

  await db.sermoes.put({
    id: novoId,
    titulo: '',
    passagem: '',
    dataPregacao: '',
    horarioPregacao: '',
    local: '',
    ocasio: '',
    blocos: [],
    atualizadoEm: new Date().toISOString()
  });

  // AJUSTADO: Passando 'aba-editor'
  this.tabManager.trocarAba('aba-editor');
}

  async excluirSermao(id) {
    const sermao = await db.sermoes.get(id);
    const nome = sermao ? sermao.titulo || 'este sermão' : 'este sermão';
    
    if (confirm(`Tem certeza que deseja excluir "${nome}"? Esta ação não poderá ser desfeita.`)) {
      await db.sermoes.delete(id);
      if (this.SERMAO_ATUAL_ID === id) this.SERMAO_ATUAL_ID = null;
      this.carregarListaSermoes();
    }
  }

  async carregarListaSermoes() {
    const container = document.getElementById('container-lista-sermoes');
    container.innerHTML = '';
    const sermoes = await db.sermoes.toArray();

    if (sermoes.length === 0) {
      container.innerHTML = '<p style="color:#666;">Nenhum sermão encontrado.</p>';
      return;
    }

    sermoes.forEach(s => {
      const item = document.createElement('div');
      item.className = 'item-card';
      item.innerHTML = `
        <div class="item-info">
          <h3>${s.titulo || 'Sem Título'}</h3>
          <div class="item-detalhes">
            <span>📖 ${s.passagem || 'N/A'}</span>
            <span>📅 ${this.formatarDataEHoraBR(s.dataPregacao, s.horarioPregacao)}</span>
            <span>📍 ${s.local || 'Sem local'}</span>
          </div>
        </div>
        <div class="item-acoes">
          <button class="btn-info btn-viz">👁️ Visualizar</button>
          <button class="btn-primario btn-edit">✏️ Editar</button>
          <button class="btn-perigo btn-del">🗑️ Excluir</button>
        </div>
      `;

      item.querySelector('.btn-viz').addEventListener('click', () => this.visualizarSermaoCompleto(s.id));
      item.querySelector('.btn-edit').addEventListener('click', () => this.carregarSermaoNoEditor(s.id));
      item.querySelector('.btn-del').addEventListener('click', () => this.excluirSermao(s.id));

      container.appendChild(item);
    });
  }

  async visualizarSermaoCompleto(id) {
    const sermao = await db.sermoes.get(id);
    if (!sermao) return;

    document.getElementById('modal-titulo').innerText = sermao.titulo || 'Sem Título';
    
    let html = `
      <div class="modal-info-grid" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:10px; margin-bottom:15px; font-size:0.9rem;">
        <div style="background:#f8f9fa; padding:8px; border-radius:4px;">📖 <strong>Passagem:</strong> ${sermao.passagem || 'N/A'}</div>
        <div style="background:#f8f9fa; padding:8px; border-radius:4px;">📅 <strong>Data:</strong> ${this.formatarDataEHoraBR(sermao.dataPregacao, sermao.horarioPregacao)}</div>
        <div style="background:#f8f9fa; padding:8px; border-radius:4px;">📍 <strong>Local:</strong> ${sermao.local || 'N/A'}</div>
      </div>
      <hr style="border:0; border-top:1px solid #eee; margin:15px 0;">
    `;

    if (sermao.blocos && sermao.blocos.length > 0) {
      sermao.blocos.forEach(b => {
        html += `
          <div class="bloco-visualizacao">
            <div class="bloco-visualizacao-titulo">${b.tituloBloco}</div>
            <div class="bloco-visualizacao-conteudo">${b.conteudoHtml || '<em>Sem conteúdo</em>'}</div>
          </div>
        `;
      });
    }

    document.getElementById('modal-corpo').innerHTML = html;
    document.getElementById('modal-visualizar').style.display = 'flex';
  }

  exportarParaPDF() {
    const titulo = document.getElementById('titulo').value || 'Sem Título';
    const passagem = document.getElementById('passagem').value || 'N/A';
    const data = this.formatarDataEHoraBR(
      document.getElementById('dataPregacao').value,
      document.getElementById('horarioPregacao').value
    );
    const local = document.getElementById('local').value || 'N/A';
    const ocasio = document.getElementById('ocasio').value || 'N/A';

    let pdfHtml = `
      <div class="pdf-header">
        <h1 class="pdf-titulo">${titulo}</h1>
        <div class="pdf-meta-box">
          <strong>Passagem:</strong> ${passagem} | <strong>Data/Hora:</strong> ${data} | 
          <strong>Local:</strong> ${local} | <strong>Ocasião:</strong> ${ocasio}
        </div>
      </div>
    `;

    document.querySelectorAll('.bloco-card').forEach(card => {
      const idBloco = card.id.replace('card-', '');
      const tituloBloco = card.querySelector('.titulo-bloco').value;
      const conteudoHtml = this.editoresQuill[idBloco] ? this.editoresQuill[idBloco].root.innerHTML : '';

      pdfHtml += `
        <div class="pdf-bloco">
          <div class="pdf-bloco-titulo">${tituloBloco}</div>
          <div class="pdf-bloco-conteudo">${conteudoHtml}</div>
        </div>
      `;
    });

    const element = document.getElementById('pdf-template');
    element.innerHTML = pdfHtml;
    element.style.display = 'block';

    /* global html2pdf */
    const opt = {
      margin: [15, 15, 15, 15],
      filename: `${titulo.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_sermao.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save().then(() => {
      element.style.display = 'none';
    });
  }
}