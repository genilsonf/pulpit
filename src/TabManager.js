export class TabManager {
  constructor() {
    this.callbacks = {};
  }

  init() {
    // Adiciona o evento de clique em todos os botões/links da navegação principal
    document.querySelectorAll('.nav-btn, .nav-link, [data-aba]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        // Identifica o ID da aba a partir do atributo data-aba ou do href/id do botão
        const targetAba = btn.getAttribute('data-aba') || btn.dataset.target;
        if (targetAba) {
          this.trocarAba(targetAba);
        }
      });
    });
  }

  onTabChange(idAba, callback) {
    this.callbacks[idAba] = callback;
  }

  trocarAba(idAbaTarget) {
    // 1. Normaliza o ID do contêiner de conteúdo
    let idConteudo = idAbaTarget;
    if (!idConteudo.startsWith('aba-')) {
      idConteudo = `aba-${idAbaTarget}`;
    }

    const elTarget = document.getElementById(idConteudo);

    if (!elTarget) {
      console.warn(`Elemento de conteúdo com ID '${idConteudo}' não foi encontrado.`);
      return;
    }

    // 2. Esconde todas as áreas de conteúdo
    document.querySelectorAll('.aba-conteudo').forEach(aba => {
      aba.style.display = 'none';
    });

    // 3. Exibe o conteúdo da aba selecionada
    elTarget.style.display = 'block';

    // 4. ATUALIZA A SELEÇÃO VISUAL DOS BOTÕES DO MENU
    // Remove a classe 'active' de todos os botões de navegação
    document.querySelectorAll('.nav-btn, .nav-link, [data-aba]').forEach(btn => {
      btn.classList.remove('active');
    });

    // Procura o botão associado a esta aba e adiciona a classe 'active'
    const idLimpo = idAbaTarget.replace('aba-', '');
    const btnAtivo = document.querySelector(`[data-aba="${idLimpo}"], [data-aba="${idConteudo}"]`);
    
    if (btnAtivo) {
      btnAtivo.classList.add('active');
    }

    // 5. Executa os callbacks cadastrados
    if (this.callbacks[idAbaTarget]) {
      this.callbacks[idAbaTarget]();
    } else if (this.callbacks[idLimpo]) {
      this.callbacks[idLimpo]();
    }
  }
}