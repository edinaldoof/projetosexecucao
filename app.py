
from flask import Flask, jsonify
from flask_cors import CORS  # Importa a biblioteca CORS
from queries import fetch_table_data
from flask import request

# Inicializa o aplicativo Flask
app = Flask(__name__)

# Habilita o CORS de forma mais explícita para garantir a comunicação
# com o painel. Isso permite a origem específica, os métodos GET e HEAD,
# e os cabeçalhos comuns.
CORS(app, resources={r"/api/*": {
    "origins": "http://192.168.3.31:777",
    "methods": ["GET", "HEAD"],
    "allow_headers": ["Content-Type"]
}})

# Rota de teste para verificar se o servidor está no ar
@app.route('/')
def test_route():
    return ('O servidor está rodando o app.py correto!')

# Rota principal da API para buscar os dados
@app.route('/api/dados', methods=['GET', 'HEAD'])
def get_dados():
    """
    Endpoint para buscar os dados da tabela Convenio.
    Retorna os dados em formato JSON ou um erro 500 em caso de falha.
    """
    # Se a requisição for do tipo HEAD (do teste de conexão),
    # retorna uma resposta de sucesso vazia imediatamente.
    if request.method == 'HEAD':
        return '', 200

    dados_da_tabela = fetch_table_data()
    
    if isinstance(dados_da_tabela, dict) and 'error' in dados_da_tabela:
        return jsonify(dados_da_tabela), 500
    
    return jsonify(dados_da_tabela)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080, debug=True)
