import os
import requests
from bs4 import BeautifulSoup

# Configurações
base_url = "https://www.bibliaonline.com.br/nvi/jd/"  # Substitua pelo seu padrão de URL
start_index = 1
end_index = 1 # Quantidade de páginas a visitar
output_dir = "cap-md"  # Pasta de saída

# Cria a pasta se não existir
os.makedirs(output_dir, exist_ok=True)

# Função para extrair o texto do site
def extrair_texto(url):
    try:
        resposta = requests.get(url)
        resposta.raise_for_status()
        soup = BeautifulSoup(resposta.text, "html.parser")
        
        # Aqui você deve adaptar para o conteúdo que deseja extrair
        # Exemplo: extrair todo o texto do body
        texto = soup.find("div", class_="FragmentView_text__g6Uq2 FragmentView_verseByVerse__l1TB0").get_text(separator="\n", strip=True)
        return texto
    except Exception as e:
        print(f"Erro ao acessar {url}: {e}")
        return None

# Loop pelos sites
for i in range(start_index, end_index + 1):
    url = f"{base_url}{i}.html"  # ou outro padrão como /cap{i}/
    print(f"Acessando {url}...")
    
    conteudo = extrair_texto(url)
    
    if conteudo:
        caminho_arquivo = os.path.join(output_dir, f"Judas {i}.md")
        with open(caminho_arquivo, "w", encoding="utf-8") as f:
            f.write(conteudo)
        print(f"Salvo em {caminho_arquivo}")
    else:
        print(f"Conteúdo não encontrado para {url}")


