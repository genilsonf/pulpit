/**
 * Serviço para gerenciamento de importação e exportação de backups em formato JSON.
 * Suporta: Sermões, Estudos, Devocionais, Agenda e Configurações.
 */
export class StorageBackupService {
  /**
   * Exporta todos os dados da aplicação para um arquivo .json baixável.
   * @param {Object} payload - Objeto contendo os dados do aplicativo.
   * @param {Array} [payload.sermoes]
   * @param {Array} [payload.estudos]
   * @param {Array} [payload.devocionais]
   * @param {Array} [payload.agenda]
   * @param {Object} [payload.configuracoes]
   */
  static exportarBackup({
    sermoes = [],
    estudos = [],
    devocionais = [],
    agenda = [],
    configuracoes = {}
  } = {}) {
    const dataHoraIso = new Date().toISOString();
    const dataFormatadaArquivo = dataHoraIso.split('T')[0];

    const conteudoBackup = {
      versaoSchema: "1.1.0",
      dataExportacao: dataHoraIso,
      origem: "PWA-Pulpit",
      dados: {
        sermoes,
        estudos,
        devocionais,
        agenda,
        configuracoes
      }
    };

    const jsonString = JSON.stringify(conteudoBackup, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const linkDownload = document.createElement("a");
    linkDownload.href = url;
    linkDownload.download = `pulpit_backup_${dataFormatadaArquivo}.json`;
    
    document.body.appendChild(linkDownload);
    linkDownload.click();
    
    document.body.removeChild(linkDownload);
    URL.revokeObjectURL(url);
  }

  /**
   * Lê e valida um arquivo .json de backup selecionado pelo usuário.
   * @param {File} file - Arquivo vindo de um <input type="file">
   * @returns {Promise<Object>} Promessa com os dados extraídos e validados.
   */
  static async importarBackup(file) {
    return new Promise((resolve, reject) => {
      if (!file || (file.type !== "application/json" && !file.name.endsWith(".json"))) {
        return reject(new Error("Por favor, selecione um arquivo de backup no formato .json válido."));
      }

      const leitor = new FileReader();

      leitor.onload = (event) => {
        try {
          const conteudo = JSON.parse(event.target.result);

          // Validação da estrutura mínima esperada
          if (!conteudo.dados || typeof conteudo.dados !== "object") {
            throw new Error("O arquivo fornecido não possui a estrutura de dados esperada pelo aplicativo.");
          }

          resolve({
            sermoes: Array.isArray(conteudo.dados.sermoes) ? conteudo.dados.sermoes : [],
            estudos: Array.isArray(conteudo.dados.estudos) ? conteudo.dados.estudos : [],
            devocionais: Array.isArray(conteudo.dados.devocionais) ? conteudo.dados.devocionais : [],
            agenda: Array.isArray(conteudo.dados.agenda) ? conteudo.dados.agenda : [],
            configuracoes: conteudo.dados.configuracoes || {},
            dataExportacao: conteudo.dataExportacao || null,
            versaoSchema: conteudo.versaoSchema || "1.0.0"
          });
        } catch (err) {
          reject(new Error(`Erro ao processar o arquivo de backup: ${err.message}`));
        }
      };

      leitor.onerror = () => reject(new Error("Erro na leitura do arquivo físico."));
      leitor.readAsText(file);
    });
  }
}

export default StorageBackupService;