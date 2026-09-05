import { db } from './db.js';
import { TabManager } from './TabManager.js';
import { SermonManager } from './SermonManager.js';
import { StudyManager } from './StudyManager.js';
import { DevotionalManager } from './DevotionalManager.js';
import { ScheduleManager } from './ScheduleManager.js';
import { BibleSelectorManager } from './BibleSelectorManager.js';
import BibleTextService from './BibleTextService.js';
import StorageBackupService from './StorageBackupService.js';

document.addEventListener('DOMContentLoaded', async () => {
  const btnExportar = document.getElementById('btn-exportar-backup');
  const inputImportar = document.getElementById('input-importar-backup');

  const tabManager = new TabManager();
  const sermonManager = new SermonManager(tabManager);
  const studyManager = new StudyManager(tabManager, sermonManager);
  const devotionalManager = new DevotionalManager(tabManager);
  const scheduleManager = new ScheduleManager(sermonManager);
  const bibleSelector = new BibleSelectorManager();
  const bibleService = new BibleTextService();

  tabManager.init();
  sermonManager.init();
  studyManager.init();
  devotionalManager.init();
  scheduleManager.init();
  bibleSelector.init();

  tabManager.onTabChange('lista', () => sermonManager.carregarListaSermoes());
  tabManager.onTabChange('estudo-lista', () => studyManager.carregarListaEstudos());
  tabManager.onTabChange('devocional-lista', () => devotionalManager.carregarListaDevocionais());
  tabManager.onTabChange('agenda', () => scheduleManager.carregarCalendario());

  document.getElementById('btn-fechar-modal')?.addEventListener('click', () => {
    document.getElementById('modal-visualizar').style.display = 'none';
  });

  document.getElementById('btn-carregar-texto-biblia')?.addEventListener('click', async () => {
    const refInput = document.getElementById('biblia-leitor-input');
    const conteinerTexto = document.getElementById('conteudo-texto-biblico');

    if (!refInput.value) {
      conteinerTexto.innerHTML = `<p style="color: red;">Por favor, selecione uma passagem primeiro.</p>`;
      return;
    }

    conteinerTexto.innerHTML = "Carregando...";
    const texto = await bibleService.obterTexto(refInput.value);

    // Formata a exibição linha por linha (uma para cada versículo)
    const htmlFormatado = texto
      .split('\n')
      .map(linha => `<p style="margin: 0 0 8px 0;">${linha}</p>`)
      .join('');

    conteinerTexto.innerHTML = htmlFormatado;
  });

  // Integre os eventos de backup dentro do escopo onde os elementos foram selecionados
  btnExportar?.addEventListener('click', async () => {
    try {
      // Extrai os dados atualizados das tabelas do IndexedDB (db)
      const sermoes = await db.sermoes?.toArray() || [];
      const estudos = await db.estudos?.toArray() || [];
      const devocionais = await db.devocionais?.toArray() || [];
      const agenda = await db.agenda?.toArray() || [];
      const configuracoes = JSON.parse(localStorage.getItem('pulpit_config') || '{}');

      StorageBackupService.exportarBackup({
        sermoes,
        estudos,
        devocionais,
        agenda,
        configuracoes
      });
    } catch (erro) {
      alert(`Erro ao gerar backup: ${erro.message}`);
    }
  });

  inputImportar?.addEventListener('change', async (event) => {
    const arquivo = event.target.files[0];
    if (!arquivo) return;

    try {
      const dadosImportados = await StorageBackupService.importarBackup(arquivo);

      const confirma = confirm(
        `Deseja importar este backup?\n\n` +
        `• Sermões: ${dadosImportados.sermoes.length}\n` +
        `• Estudos: ${dadosImportados.estudos.length}\n` +
        `• Devocionais: ${dadosImportados.devocionais.length}\n` +
        `• Agenda: ${dadosImportados.agenda.length}\n\n` +
        `Atenção: Os dados no banco local serão atualizados!`
      );

      if (confirma) {
        // Atualiza a base do IndexedDB
        if (db.sermoes) { await db.sermoes.clear(); await db.sermoes.bulkAdd(dadosImportados.sermoes); }
        if (db.estudos) { await db.estudos.clear(); await db.estudos.bulkAdd(dadosImportados.estudos); }
        if (db.devocionais) { await db.devocionais.clear(); await db.devocionais.bulkAdd(dadosImportados.devocionais); }
        if (db.agenda) { await db.agenda.clear(); await db.agenda.bulkAdd(dadosImportados.agenda); }
        
        if (dadosImportados.configuracoes) {
          localStorage.setItem('pulpit_config', JSON.stringify(dadosImportados.configuracoes));
        }

        alert('Backup importado com sucesso! A página será recarregada.');
        window.location.reload();
      }
    } catch (erro) {
      alert(`Falha na importação: ${erro.message}`);
    } finally {
      event.target.value = '';
    }
  });

  // Carrega o sermão existente ou cria um limpo sem blocos padrão
  const sermoes = await db.sermoes.toArray();
  if (sermoes.length > 0) {
    await sermonManager.carregarSermaoNoEditor(sermoes[0].id);
  } else {
    await sermonManager.criarNovoSermaoVazio();
  }

  const estudos = await db.estudos.toArray();
  if (estudos.length > 0) {
    studyManager.ESTUDO_ATUAL_ID = estudos[0].id;
  } else {
    await studyManager.criarNovoEstudoVazio();
  }

  const devocionais = await db.devocionais.toArray();
  if (devocionais.length > 0) {
    devotionalManager.DEVOCIONAL_ATUAL_ID = devocionais[0].id;
  } else {
    await devotionalManager.criarNovaDevocionalVazia();
  }
});