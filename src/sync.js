import { fileSystemService } from './main.js';

/**
 * Converte HTML dos editores para Markdown limpo utilizando a API DOM do navegador
 */
function converterHtmlParaMarkdown(html) {
  if (!html) return '';

  // Cria um documento DOM temporário para interpretar o HTML de forma segura
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Converte títulos
  doc.querySelectorAll('h1').forEach(el => el.replaceWith(`# ${el.textContent}\n\n`));
  doc.querySelectorAll('h2').forEach(el => el.replaceWith(`## ${el.textContent}\n\n`));
  doc.querySelectorAll('h3').forEach(el => el.replaceWith(`### ${el.textContent}\n\n`));

  // Converte formatações de texto
  doc.querySelectorAll('b, strong').forEach(el => el.replaceWith(`**${el.textContent}**`));
  doc.querySelectorAll('i, em').forEach(el => el.replaceWith(`*${el.textContent}*`));
  doc.querySelectorAll('li').forEach(el => el.replaceWith(`- ${el.textContent}\n`));
  doc.querySelectorAll('p').forEach(el => el.replaceWith(`${el.textContent}\n\n`));
  doc.querySelectorAll('br').forEach(el => el.replaceWith('\n'));

  // Retorna apenas o texto resultante da árvore limpa
  return (doc.body.textContent || '').trim();
}

/**
 * Método utilitário para exportar os arquivos Markdown (.md)
 */
export async function sincronizarEntidadeComArquivo(tipo, entidade) {
  if (!fileSystemService || !fileSystemService.dirHandle) return;

  const subpasta = tipo;
  const nomeArquivo = `${tipo}_${entidade.id}.md`;
  
  let corpoTexto = '';

  // 1. Processamento de Sermões
  if (tipo === 'sermoes' && Array.isArray(entidade.blocos)) {
    corpoTexto = entidade.blocos
      .map(bloco => {
        const titulo = bloco.tituloBloco ? `## ${bloco.tituloBloco}\n\n` : '';
        const texto = converterHtmlParaMarkdown(bloco.conteudoHtml);
        return `${titulo}${texto}`;
      })
      .filter(texto => texto.trim() !== '')
      .join('\n\n---\n\n');
  } 
  // 2. Processamento de Estudos
  else if (tipo === 'estudos') {
    const camposEstudo = [
      ['Gênero Literário', entidade.genero],
      ['Diagramação', entidade.diagramacao],
      ['Palavras-chave', entidade.palavrasChave],
      ['Termos Relacionados', entidade.termosRelacionados],
      ['Passagens Relacionadas', entidade.passagensRelacionadas],
      ['Doutrinas Relacionadas', entidade.doutrinasRelacionadas],
      ['Resumo', entidade.resumo],
      ['Insights e Dúvidas', entidade.insightsDuvidas],
      ['Foco da Condição Decaída (FCD)', entidade.fcd],
      ['Relevância', entidade.relevancia],
      ['Ideia Central do Texto (ICT)', entidade.ict],
      ['Tese', entidade.tese],
      ['Propósito Básico', entidade.propositoBasico],
      ['Propósitos Específicos', entidade.propositosEspecificos],
      ['Tema', entidade.tema]
    ];

    corpoTexto = camposEstudo
      .filter(([_, valor]) => valor)
      .map(([rotulo, valor]) => `## ${rotulo}\n\n${valor}`)
      .join('\n\n');
  }
  // 3. Processamento de Devocionais
  else {
    const licao = entidade.licao ? `## Lição\n${entidade.licao}\n\n` : '';
    const aplicacao = entidade.aplicacao ? `## Aplicação\n${entidade.aplicacao}\n\n` : '';
    const oracao = entidade.oracao ? `## Oração\n${entidade.oracao}\n\n` : '';
    
    corpoTexto = (licao + aplicacao + oracao) || entidade.conteudoMarkdown || entidade.conteudo || '';
  }

  const conteudoMarkdown = `# ${entidade.titulo || entidade.texto || 'Sem Título'}\n\n` +
    `**Referência:** ${entidade.passagem || entidade.texto || 'N/A'}\n` +
    `**Data:** ${entidade.dataPregacao || entidade.data || entidade.atualizadoEm || new Date().toISOString()}\n\n` +
    `---\n\n` +
    `${corpoTexto}`;

  try {
    await fileSystemService.salvarArquivo(subpasta, nomeArquivo, conteudoMarkdown);
  } catch (err) {
    console.error("Erro ao sincronizar arquivo com pasta local:", err);
  }
}