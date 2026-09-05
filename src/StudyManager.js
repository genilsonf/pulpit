import { db } from './db.js';
import { sincronizarEntidadeComArquivo } from './sync.js';

export class StudyManager {
  constructor(tabManager, sermonManager) {
    this.tabManager = tabManager;
    this.sermonManager = sermonManager;
    this.ESTUDO_ATUAL_ID = null;
    this.tempoEsperaEstudo = null;
    this.CAMPOS_ESTUDO = [
      'texto', 'genero', 'diagramacao', 'palavrasChave', 'termosRelacionados', 
      'passagensRelacionadas', 'doutrinasRelacionadas', 'resumo', 'insightsDuvidas', 
      'fcd', 'relevancia', 'ict', 'tese', 'propositoBasico', 'propositosEspecificos', 'tema'
    ];
    this.TEXTOS_PROPOSITO = {
      Evangelístico: "Ajuda os pecadores a firmarem um compromisso com Jesus, aceitando-o como Senhor e Salvador pessoal. É a mensagem de salvação.",
      Devocional: "Motiva os crentes a aprofundar seu relacionamento com Jesus, amando-O mais e mais e buscando crescer na Graça e conhecimento dEle; apresenta os desafios do seguir a Cristo. É a mensagem da comunhão com Deus.",
      Missionário: "Desafia os crentes a uma entrega de seus dons e talentos a serviço do Senhor, a uma resposta missionária. É a mensagem da consagração.",
      Pastoral: "Apresenta o bálsamo de Cristo nos momentos de dificuldade e crises; tem um grande alcance. Deve ser pregado sempre e não apenas nas catástrofes. É a mensagem de alento ou conforto. Também pode ser uma mensagem exortativa.",
      Ético: "Persuade a uma melhor comunhão com el próximo, pelo exemplo de Cristo, desafiando os ouvintes a vivenciarem o amor e o justiça em seus relacionamentos. É a mensagem do amor ao próximo.",
      Doutrinário: "Enfoca, de modo especial, uma Doutrina bíblica. Tem sido chamado de informativo, uma vez que visa informar, esclarecer, infundir convicção bíblica. É a mensagem elucidadora."
    };
  }

  init() {
    this.CAMPOS_ESTUDO.forEach(campo => {
      const el = document.getElementById(`est-${campo}`);
      if (el) {
        el.addEventListener('input', () => this.dispararAutoSaveEstudo());
        if (el.tagName === 'SELECT') {
          el.addEventListener('change', () => {
            if (campo === 'propositoBasico') this.atualizarDescricaoProposito();
            this.dispararAutoSaveEstudo();
          });
        }
      }
    });

    document.getElementById('btn-novo-estudo-vazio')?.addEventListener('click', () => this.criarNovoEstudoVazio());
    document.getElementById('btn-gerar-sermao-estudo')?.addEventListener('click', () => this.gerarSermaoAPartirDoEstudo());
  }

  atualizarDescricaoProposito() {
    const valor = document.getElementById('est-propositoBasico').value;
    const box = document.getElementById('desc-proposito-basico');
    if (box) box.innerText = this.TEXTOS_PROPOSITO[valor] || "Selecione uma opção acima para visualizar o significado.";
  }

  async salvarEstudoLocalmente() {
    if (!this.ESTUDO_ATUAL_ID) return;

    const estudoObjeto = {
      id: this.ESTUDO_ATUAL_ID,
      atualizadoEm: new Date().toISOString()
    };

    this.CAMPOS_ESTUDO.forEach(campo => {
      const el = document.getElementById(`est-${campo}`);
      if (el) estudoObjeto[campo] = el.value;
    });

    await db.estudos.put(estudoObjeto);
    await sincronizarEntidadeComArquivo('estudos', estudoObjeto);

    const statusEl = document.getElementById('status-salvamento');
    if (statusEl) statusEl.innerText = `Estudo salvo às ${new Date().toLocaleTimeString()}`;
  }

  dispararAutoSaveEstudo() {
    const statusEl = document.getElementById('status-salvamento');
    if (statusEl) statusEl.innerText = "Salvando estudo...";
    clearTimeout(this.tempoEsperaEstudo);
    this.tempoEsperaEstudo = setTimeout(() => this.salvarEstudoLocalmente(), 800);
  }

  async carregarEstudoNoEditor(id) {
    this.ESTUDO_ATUAL_ID = id;
    const estudo = await db.estudos.get(id);

    if (estudo) {
      this.CAMPOS_ESTUDO.forEach(campo => {
        const el = document.getElementById(`est-${campo}`);
        if (el) el.value = estudo[campo] || '';
      });
      this.atualizarDescricaoProposito();
    }
    this.tabManager.trocarAba('estudo-editor');
  }

  async criarNovoEstudoVazio() {
    const novoId = 'estudo_' + Date.now();
    this.ESTUDO_ATUAL_ID = novoId;

    this.CAMPOS_ESTUDO.forEach(campo => {
      const el = document.getElementById(`est-${campo}`);
      if (el) el.value = '';
    });
    this.atualizarDescricaoProposito();

    await this.salvarEstudoLocalmente();
    this.tabManager.trocarAba('estudo-editor');
  }

  async excluirEstudo(id) {
    const estudo = await db.estudos.get(id);
    const nome = estudo ? estudo.texto || 'este estudo' : 'este estudo';
    
    if (confirm(`Tem certeza que deseja excluir o estudo de "${nome}"?`)) {
      await db.estudos.delete(id);
      if (this.ESTUDO_ATUAL_ID === id) this.ESTUDO_ATUAL_ID = null;
      this.carregarListaEstudos();
    }
  }

  async carregarListaEstudos() {
    const container = document.getElementById('container-lista-estudos');
    container.innerHTML = '';
    const estudos = await db.estudos.toArray();

    if (estudos.length === 0) {
      container.innerHTML = '<p style="color:#666;">Nenhum estudo bíblico encontrado.</p>';
      return;
    }

    estudos.forEach(e => {
      const item = document.createElement('div');
      item.className = 'item-card card-estudo';
      item.innerHTML = `
        <div class="item-info">
          <h3>📖 ${e.texto || 'Passagem sem nome'}</h3>
          <div class="item-detalhes">
            <span><strong>Gênero:</strong> ${e.genero || 'N/A'}</span>
            <span><strong>Tema:</strong> ${e.tema || 'Sem tema'}</span>
            <span><strong>Propósito:</strong> ${e.propositoBasico || 'N/A'}</span>
          </div>
        </div>
        <div class="item-acoes">
          <button class="btn-info btn-viz">👁️ Visualizar</button>
          <button class="btn-estudo btn-edit">✏️ Editar</button>
          <button class="btn-perigo btn-del">🗑️ Excluir</button>
        </div>
      `;

      item.querySelector('.btn-viz').addEventListener('click', () => this.visualizarEstudoCompleto(e.id));
      item.querySelector('.btn-edit').addEventListener('click', () => this.carregarEstudoNoEditor(e.id));
      item.querySelector('.btn-del').addEventListener('click', () => this.excluirEstudo(e.id));

      container.appendChild(item);
    });
  }

  async visualizarEstudoCompleto(id) {
    const e = await db.estudos.get(id);
    if (!e) return;

    document.getElementById('modal-titulo').innerText = `Estudo: ${e.texto || 'Sem texto'}`;

    const labels = {
      genero: 'Gênero Literário', diagramacao: 'Diagramação', palavrasChave: 'Palavras-chave',
      termosRelacionados: 'Termos Relacionados', passagensRelacionadas: 'Passagens Relacionadas',
      doutrinasRelacionadas: 'Doutrinas Relacionadas', resumo: 'Resumo da Passagem',
      insightsDuvidas: 'Insights e Dúvidas', fcd: 'Foco da Condição Decaída (FCD)',
      relevancia: 'Relevância da Passagem', ict: 'Ideia Central do Texto (ICT)', tese: 'Tese',
      propositoBasico: 'Propósito Básico', propositosEspecificos: 'Propósitos Específicos', tema: 'Tema'
    };

    let html = '';
    this.CAMPOS_ESTUDO.forEach(campo => {
      if (campo === 'texto') return;
      const valor = e[campo];
      if (valor) {
        html += `
          <div class="bloco-visualizacao">
            <div class="bloco-visualizacao-titulo">${labels[campo]}</div>
            <div class="bloco-visualizacao-conteudo">${valor}</div>
          </div>
        `;
      }
    });

    document.getElementById('modal-corpo').innerHTML = html || '<p>Estudo sem conteúdo preenchido.</p>';
    document.getElementById('modal-visualizar').style.display = 'flex';
  }

  async gerarSermaoAPartirDoEstudo() {
    const texto = document.getElementById('est-texto').value;
    const tema = document.getElementById('est-tema').value;

    const novoId = 'sermao_' + Date.now();

    const blocosIniciais = [
      { id: 'bloco_' + Date.now() + '_1', tituloBloco: 'Introdução', conteudoHtml: '' },
      { id: 'bloco_' + Date.now() + '_2', tituloBloco: 'Elucidação / Ideia Central', conteudoHtml: '' },
      { id: 'bloco_' + Date.now() + '_3', tituloBloco: 'Ponto Principal 1', conteudoHtml: '' },
      { id: 'bloco_' + Date.now() + '_4', tituloBloco: 'Aplicações Práticas', conteudoHtml: '' },
      { id: 'bloco_' + Date.now() + '_5', tituloBloco: 'Conclusão', conteudoHtml: '' }
    ];

    const sermaoObjeto = {
      id: novoId,
      titulo: tema || texto || 'Novo Sermão',
      passagem: texto || '',
      dataPregacao: '',
      horarioPregacao: '',
      local: '',
      ocasio: '',
      blocos: blocosIniciais,
      atualizadoEm: new Date().toISOString()
    };

    await db.sermoes.put(sermaoObjeto);
    await sincronizarEntidadeComArquivo('sermoes', sermaoObjeto);

    await this.sermonManager.carregarSermaoNoEditor(novoId);
    alert('Sermão criado com sucesso a partir dos dados do seu estudo!');
  }
}