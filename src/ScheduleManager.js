import { db } from './db.js';
import { sincronizarEntidadeComArquivo } from './sync.js';

export class ScheduleManager {
  constructor(sermonManager) {
    this.sermonManager = sermonManager;
    this.calendarInstance = null;
  }

  init() {
    const form = document.getElementById('form-programar');
    if (form) {
      form.addEventListener('submit', (e) => this.salvarProgramacaoRapida(e));
    }
  }

  async salvarProgramacaoRapida(e) {
    e.preventDefault();
    const novoId = 'sermao_' + Date.now();
    const titulo = document.getElementById('prog-titulo').value;
    const dataPregacao = document.getElementById('prog-data').value;
    const horarioPregacao = document.getElementById('prog-horario').value;
    const local = document.getElementById('prog-local').value;
    const ocasio = document.getElementById('prog-ocasio').value;
    const passagem = document.getElementById('prog-passagem').value;

    const blocosIniciais = [
      { id: 'bloco_' + Date.now() + '_1', tituloBloco: 'Introdução', conteudoHtml: '' },
      { id: 'bloco_' + Date.now() + '_2', tituloBloco: 'Desenvolvimento', conteudoHtml: '' },
      { id: 'bloco_' + Date.now() + '_3', tituloBloco: 'Conclusão', conteudoHtml: '' }
    ];

    const sermaoObjeto = {
      id: novoId,
      titulo, dataPregacao, horarioPregacao, local, ocasio, passagem,
      blocos: blocosIniciais,
      atualizadoEm: new Date().toISOString()
    };

    await db.sermoes.put(sermaoObjeto);
    await sincronizarEntidadeComArquivo('sermoes', sermaoObjeto);

    document.getElementById('form-programar').reset();
    this.carregarCalendario();
    alert('Pregação agendada com sucesso!');
  }

  async carregarCalendario() {
    const calendarEl = document.getElementById('calendar');
    if (!calendarEl) return;

    // Define uma altura mínima direta no elemento para evitar recolhimento de layout (0px)
    calendarEl.style.minHeight = '500px';

    const sermoes = await db.sermoes.toArray();
    const eventos = sermoes
      .filter(s => s.dataPregacao)
      .map(s => ({
        id: s.id,
        title: `${s.titulo || 'Sem Título'}${s.horarioPregacao ? ` [${s.horarioPregacao}]` : ''}`,
        start: s.horarioPregacao ? `${s.dataPregacao}T${s.horarioPregacao}` : s.dataPregacao,
        color: '#2c3e50'
      }));

    /* global FullCalendar */
    if (typeof FullCalendar === 'undefined') {
      console.error('Biblioteca FullCalendar não encontrada.');
      return;
    }

    // Se o calendário já foi instanciado, apenas atualize as dimensões e eventos
    if (this.calendarInstance) {
      this.calendarInstance.removeAllEvents();
      this.calendarInstance.addEventSource(eventos);
      setTimeout(() => {
        this.calendarInstance.updateSize();
      }, 100);
      return;
    }

    // Primeira renderização com pequeno atraso para renderização do DOM
    setTimeout(() => {
      this.calendarInstance = new FullCalendar.Calendar(calendarEl, {
        locale: 'pt-br',
        initialView: 'dayGridMonth',
        headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek' },
        events: eventos,
        eventClick: (info) => this.sermonManager.visualizarSermaoCompleto(info.event.id)
      });
      
      this.calendarInstance.render();

      // Força o ajuste do tamanho após renderizar
      setTimeout(() => {
        this.calendarInstance.updateSize();
      }, 150);
    }, 100);
  }
}