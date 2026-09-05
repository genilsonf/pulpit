export default class BibleTextService {
  constructor(traducaoPasta = "Bíblia-NVI") {
    this.traducaoPasta = traducaoPasta;
  }

  // Mapeamento dos nomes dos livros para as pastas numeradas
  static PASTA_LIVROS = {
    "Gênesis": "01-Gênesis", "Êxodo": "02-Êxodo", "Levítico": "03-Levítico", "Números": "04-Números",
    "Deuteronômio": "05-Deuteronômio", "Josué": "06-Josué", "Juízes": "07-Juízes", "Rute": "08-Rute",
    "1 Samuel": "09-1 Samuel", "2 Samuel": "10-2 Samuel", "1 Reis": "11-1 Reis", "2 Reis": "12-2 Reis",
    "1 Crônicas": "13-1 Crônicas", "2 Crônicas": "14-2 Crônicas", "Esdras": "15-Esdras", "Neemias": "16-Neemias",
    "Ester": "17-Ester", "Jó": "18-Jó", "Salmos": "19-Salmos", "Provérbios": "20-Provérbios",
    "Eclesiastes": "21-Eclesiastes", "Cânticos": "22-Cânticos", "Isaías": "23-Isaías", "Jeremias": "24-Jeremias",
    "Lamentações": "25-Lamentações", "Ezequiel": "26-Ezequiel", "Daniel": "27-Daniel", "Oséias": "28-Oséias",
    "Joel": "29-Joel", "Amós": "30-Amós", "Obadias": "31-Obadias", "Jonas": "32-Jonas",
    "Miquéias": "33-Miquéias", "Naum": "34-Naum", "Habacuque": "35-Habacuque", "Sofonias": "36-Sofonias",
    "Ageu": "37-Ageu", "Zacarias": "38-Zacarias", "Malaquias": "39-Malaquias", "Mateus": "40-Mateus",
    "Marcos": "41-Marcos", "Lucas": "42-Lucas", "João": "43-João", "Atos": "44-Atos",
    "Romanos": "45-Romanos", "1 Coríntios": "46-1 Coríntios", "2 Coríntios": "47-2 Coríntios",
    "Gálatas": "48-Gálatas", "Efésios": "49-Efésios", "Filipenses": "50-Filipenses", "Colossenses": "51-Colossenses",
    "1 Tessalonicenses": "52-1 Tessalonicenses", "2 Tessalonicenses": "53-2 Tessalonicenses",
    "1 Timóteo": "54-1 Timóteo", "2 Timóteo": "55-2 Timóteo", "Tito": "56-Tito", "Filemom": "57-Filemom",
    "Hebreus": "58-Hebreus", "Tiago": "59-Tiago", "1 Pedro": "60-1 Pedro", "2 Pedro": "61-2 Pedro",
    "1 João": "62-1 João", "2 João": "63-2 João", "3 João": "64-3 João", "Judas": "65-Judas", "Apocalipse": "66-Apocalipse"
  };

  // Ajuste no regex para aceitar livros de 1 capítulo e variações de espaço/formato
parseReferencia(referenciaStr) {
  console.log("Referência recebida para parse:", referenciaStr); // LOG DE VERIFICAÇÃO
    if (!referenciaStr) return null;

  // Regex ajustado para capturar: Nome do Livro + Capítulo/Versículos
  const regex = /^([1-3]?\s?[A-Za-zÀ-ÿ]+)\s+(\d+)(?::(\d+))?(?:-(?:(\d+):)?(\d+))?$/;
  const match = referenciaStr.trim().match(regex);

  if (!match) return null;

  const livro = match[1].trim();
  const capInicio = parseInt(match[2]);
  const vsoInicio = match[3] ? parseInt(match[3]) : null;

  let capFim = capInicio;
  let vsoFim = null;

  if (match[4]) {
    capFim = parseInt(match[4]);
    vsoFim = parseInt(match[5]);
  } else if (match[5]) {
    vsoFim = parseInt(match[5]);
  }

  return { livro, capInicio, vsoInicio, capFim, vsoFim };
}

  async obterTextoCapitulo(livro, capitulo) {
    const pastaLivro = BibleTextService.PASTA_LIVROS[livro];
    if (!pastaLivro) throw new Error(`Livro não encontrado: ${livro}`);

    const caminho = `/${this.traducaoPasta}/${pastaLivro}/${livro} ${capitulo}.md`;
    const res = await fetch(caminho);
    if (!res.ok) throw new Error(`Não foi possível abrir ${caminho}`);

    const markdown = await res.text();
    
    // Limpa linhas em branco extras
    const linhas = markdown
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0);

    const versiculosFormatados = [];

    // Agrupa o número (linha N) com o texto correspondente (linha N+1)
    for (let i = 0; i < linhas.length; i++) {
      const linhaAtual = linhas[i];
      const proximaLinha = linhas[i + 1];

      // Verifica se a linha atual é apenas um número de versículo
      if (/^\d+$/.test(linhaAtual) && proximaLinha) {
        versiculosFormatados.push(`${linhaAtual} ${proximaLinha}`);
        i++; // Pula a próxima linha pois já foi processada junto com o número
      } else {
        versiculosFormatados.push(linhaAtual);
      }
    }

    return versiculosFormatados;
  }

  async obterTexto(referenciaStr) {
    const ref = this.parseReferencia(referenciaStr);
    if (!ref || !BibleTextService.PASTA_LIVROS[ref.livro]) {
      throw new Error("Referência bíblica inválida.");
    }

    // Se a referência abranger capítulos diferentes (ex: Efésios 1:15-2:10)
    if (ref.capInicio !== ref.capFim) {
      let resultado = [];
      
      for (let cap = ref.capInicio; cap <= ref.capFim; cap++) {
        const linhas = await this.obterTextoCapitulo(ref.livro, cap);
        
        const filtradas = linhas.filter((_, idx) => {
          const vso = idx + 1;
          if (cap === ref.capInicio) return vso >= (ref.vsoInicio || 1);
          if (cap === ref.capFim) return vso <= (ref.vsoFim || linhas.length);
          return true;
        });

        resultado.push(`--- Capítulo ${cap} ---`, ...filtradas);
      }
      
      return resultado.join('\n');
    }

    // Mesmo capítulo
    const linhas = await this.obterTextoCapitulo(ref.livro, ref.capInicio);

    if (!ref.vsoInicio) return linhas.join('\n');

    const vsoMin = ref.vsoInicio;
    const vsoMax = ref.vsoFim || vsoMin;

    return linhas
      .filter((_, idx) => (idx + 1) >= vsoMin && (idx + 1) <= vsoMax)
      .join('\n');
  }
}