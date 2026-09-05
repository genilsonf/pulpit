import { db } from './db.js';

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

    const blocosIniciais = this.sermonManager.ESTRUTURA_PADRAO.map(b => ({
      id: 'bloco_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      tituloBloco: b,
      conteudoHtml: ''
    }));

    await db.sermoes.put({
      id: novoId,
      titulo, dataPregacao, horarioPregacao, local, ocasio, passagem,
      blocos: blocosIniciais,
      atualizadoEm: new Date().toISOString()
    });

    document.getElementById('form-programar').reset();
    this.carregarCalendario();
    alert('Pregação agendada com sucesso!');
  }

  async carregarCalendario() {
    const sermoes = await db.sermoes.toArray();
    const eventos = sermoes
      .filter(s => s.dataPregacao)
      .map(s => ({
        id: s.id,
        title: `${s.titulo || 'Sem Título'}${s.horarioPregacao ? ` [${s.horarioPregacao}]` : ''}`,
        start: s.horarioPregacao ? `${s.dataPregacao}T${s.horarioPregacao}` : s.dataPregacao,
        color: '#2c3e50'
      }));

    const calendarEl = document.getElementById('calendar');
    if (this.calendarInstance) this.calendarInstance.destroy();

    /* global FullCalendar */
    this.calendarInstance = new FullCalendar.Calendar(calendarEl, {
      locale: 'pt-br',
      initialView: 'dayGridMonth',
      headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek' },
      events: eventos,
      eventClick: (info) => this.sermonManager.visualizarSermaoCompleto(info.event.id)
    });
    this.calendarInstance.render();
  }
}