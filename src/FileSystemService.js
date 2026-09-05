/**
 * Serviço para integração com a File System Access API.
 * Gerencia a seleção de diretórios e gravação direta de arquivos no sistema de arquivos local.
 */
export class FileSystemService {
  constructor() {
    this.dirHandle = null;
  }

  /**
   * Solicita permissão ao usuário para selecionar uma pasta local.
   */
  async selecionarDiretorio() {
    try {
      this.dirHandle = await window.showDirectoryPicker({
        mode: 'readwrite'
      });
      return true;
    } catch (erro) {
      if (erro.name !== 'AbortError') {
        console.error('Erro ao selecionar diretório:', erro);
      }
      return false;
    }
  }

  /**
   * Salva ou atualiza um arquivo individual (.md ou .json) na pasta/subpasta correspondente.
   * @param {string} subpasta - Nome da subpasta (ex: 'sermoes', 'estudos', 'devocionais') ou '' para raiz.
   * @param {string} nomeArquivo - Nome do arquivo (ex: 'sermao_123.md')
   * @param {string} conteudo - Conteúdo em texto puro ou Markdown a ser gravado.
   */
  async salvarArquivo(subpasta, nomeArquivo, conteudo) {
    if (!this.dirHandle) return;

    try {
      let pastaAlvo = this.dirHandle;

      if (subpasta) {
        pastaAlvo = await this.dirHandle.getDirectoryHandle(subpasta, { create: true });
      }

      const fileHandle = await pastaAlvo.getFileHandle(nomeArquivo, { create: true });
      const writable = await fileHandle.createWritable();
      
      await writable.write(conteudo);
      await writable.close();
    } catch (erro) {
      console.error(`Erro ao salvar arquivo ${nomeArquivo}:`, erro);
    }
  }

  /**
   * Remove um arquivo do sistema de arquivos quando ele for excluído no app.
   */
  async removerArquivo(subpasta, nomeArquivo) {
    if (!this.dirHandle) return;

    try {
      let pastaAlvo = this.dirHandle;

      if (subpasta) {
        pastaAlvo = await this.dirHandle.getDirectoryHandle(subpasta, { create: true });
      }

      await pastaAlvo.removeEntry(nomeArquivo);
    } catch (erro) {
      console.error(`Erro ao remover arquivo ${nomeArquivo}:`, erro);
    }
  }
}

export default FileSystemService;