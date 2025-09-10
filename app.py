from flask import Flask, jsonify
from flask_cors import CORS  # Importa a biblioteca CORS
from queries import fetch_table_data

# Inicializa o aplicativo Flask
app = Flask(__name__)

# Habilita o CORS para toda a aplicação, permitindo qualquer origem.
# Isso é ideal para desenvolvimento e resolverá o problema de acesso.
CORS(app)

# Rota de teste para verificar se o servidor está no ar
@app.route('/')
def test_route():
    return ('O servidor está rodando o app.py correto!')

# Rota principal da API para buscar os dados
@app.route('/api/dados', methods=['GET', 'HEAD']) # Adicionado o método HEAD
def get_dados():
    """
    Endpoint para buscar os dados da tabela Convenio.
    Retorna os dados em formato JSON ou um erro 500 em caso de falha.
    """
    # Para requisições HEAD (usadas no teste de conexão), 
    # apenas retornamos uma resposta de sucesso sem corpo.
    from flask import request
    if request.method == 'HEAD':
        return '', 200

    dados_da_tabela = fetch_table_data()
    
    # Se a função de busca retornar um dicionário com a chave 'error', 
    # a API retornará uma resposta de erro com status 500.
    if isinstance(dados_da_tabela, dict) and 'error' in dados_da_tabela:
        return jsonify(dados_da_tabela), 500
    
    # Caso contrário, retorna os dados com status 200 (OK).
    return jsonify(dados_da_tabela)

# Bloco para rodar o app diretamente (apenas para desenvolvimento)
if __name__ == '__main__':
    # O host '0.0.0.0' torna o servidor acessível na sua rede local.
    app.run(host='0.0.0.0', port=8080, debug=True)
