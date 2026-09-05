import { db } from './db.js';

export class DevotionalManager {
  constructor(tabManager) {
    this.tabManager = tabManager;
    this.DEVOCIONAL_ATUAL_ID = null;
    this.tempoEsperaDevocional = null;
    this.CAMPOS_DEVOCIONAL = ['texto', 'data', 'licao', 'aplicacao', 'oracao'];
  }

  init() {
    this.CAMPOS_DEVOCIONAL.forEach(campo => {
      const el = document.getElementById(`dev-${campo}`);
      if (el) el.addEventListener('input', () => this.dispararAutoSaveDevocional());
    });

    document.getElementById('btn-nova-devocional-vazia')?.addEventListener('click', () => this.criarNovaDevocionalVazia());
  }

  formatarDataEHoraBR(dataIso) {
    if (!dataIso) return 'Sem data';
    const partes = dataIso.split('-');
    return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : dataIso;
  }

  async salvarDevocionalLocalmente() {
    if (!this.DEVOCIONAL_ATUAL_ID) return;

    const devObjeto = {
      id: this.DEVOCIONAL_ATUAL_ID,
      atualizadoEm: new Date().toISOString()
    };

    this.CAMPOS_DEVOCIONAL.forEach(campo => {
      const el = document.getElementById(`dev-${campo}`);
      if (el) devObjeto[campo] = el.value;
    });

    await db.devocionais.put(devObjeto);
    document.getElementById('status-salvamento').innerText = `Devocional salva às ${new Date().toLocaleTimeString()}`;
  }

  dispararAutoSaveDevocional() {
    document.getElementById('status-salvamento').innerText = "Salvando devocional...";
    clearTimeout(this.tempoEsperaDevocional);
    this.tempoEsperaDevocional = setTimeout(() => this.salvarDevocionalLocalmente(), 800);
  }

  async carregarDevocionalNoEditor(id) {
    this.DEVOCIONAL_ATUAL_ID = id;
    const dev = await db.devocionais.get(id);

    if (dev) {
      this.CAMPOS_DEVOCIONAL.forEach(campo => {
        const el = document.getElementById(`dev-${campo}`);
        if (el) el.value = dev[campo] || '';
      });
    }
    this.tabManager.trocarAba('devocional-editor');
  }

  async criarNovaDevocionalVazia() {
    const novoId = 'devocional_' + Date.now();
    this.DEVOCIONAL_ATUAL_ID = novoId;

    this.CAMPOS_DEVOCIONAL.forEach(campo => {
      const el = document.getElementById(`dev-${campo}`);
      if (el) el.value = '';
    });

    document.getElementById('dev-data').value = new Date().toISOString().split('T')[0];

    await this.salvarDevocionalLocalmente();
    this.tabManager.trocarAba('devocional-editor');
  }

  async excluirDevocional(id) {
    const dev = await db.devocionais.get(id);
    const nome = dev ? dev.texto || 'esta devocional' : 'esta devocional';
    
    if (confirm(`Tem certeza que deseja excluir a devocional de "${nome}"?`)) {
      await db.devocionais.delete(id);
      if (this.DEVOCIONAL_ATUAL_ID === id) this.DEVOCIONAL_ATUAL_ID = null;
      this.carregarListaDevocionais();
    }
  }

  async carregarListaDevocionais() {
    const container = document.getElementById('container-lista-devocionais');
    container.innerHTML = '';
    const devocionais = await db.devocionais.toArray();

    if (devocionais.length === 0) {
      container.innerHTML = '<p style="color:#666;">Nenhuma devocional registrada.</p>';
      return;
    }

    devocionais.forEach(d => {
      const item = document.createElement('div');
      item.className = 'item-card card-devocional';
      item.innerHTML = `
        <div class="item-info">
          <h3>📖 ${d.texto || 'Sem passagem'}</h3>
          <div class="item-detalhes">
            <span>📅 ${this.formatarDataEHoraBR(d.data)}</span>
          </div>
        </div>
        <div class="item-acoes">
          <button class="btn-info btn-viz">👁️ Visualizar</button>
          <button class="btn-devocional btn-edit">✏️ Editar</button>
          <button class="btn-perigo btn-del">🗑️ Excluir</button>
        </div>
      `;

      item.querySelector('.btn-viz').addEventListener('click', () => this.visualizarDevocionalCompleta(d.id));
      item.querySelector('.btn-edit').addEventListener('click', () => this.carregarDevocionalNoEditor(d.id));
      item.querySelector('.btn-del').addEventListener('click', () => this.excluirDevocional(d.id));

      container.appendChild(item);
    });
  }

  async visualizarDevocionalCompleta(id) {
    const d = await db.devocionais.get(id);
    if (!d) return;

    document.getElementById('modal-titulo').innerText = `Devocional: ${d.texto || 'Sem passagem'}`;

    const html = `
      <div style="font-size:0.9rem; margin-bottom:15px; color:#666;">📅 Data: ${this.formatarDataEHoraBR(d.data)}</div>
      <div class="bloco-visualizacao">
        <div class="bloco-visualizacao-titulo" style="color:var(--devocional-color);">Lição do Texto</div>
        <div class="bloco-visualizacao-conteudo">${d.licao || 'N/A'}</div>
      </div>
      <div class="bloco-visualizacao">
        <div class="bloco-visualizacao-titulo" style="color:var(--devocional-color);">Aplicação Pessoal</div>
        <div class="bloco-visualizacao-conteudo">${d.aplicacao || 'N/A'}</div>
      </div>
      <div class="bloco-visualizacao">
        <div class="bloco-visualizacao-titulo" style="color:var(--devocional-color);">Motivos de Oração</div>
        <div class="bloco-visualizacao-conteudo">${d.oracao || 'N/A'}</div>
      </div>
    `;

    document.getElementById('modal-corpo').innerHTML = html;
    document.getElementById('modal-visualizar').style.display = 'flex';
  }
}