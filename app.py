from flask import Flask, jsonify
from flask_cors import CORS  # Importa a biblioteca CORS
from queries import fetch_table_data

# Inicializa o aplicativo Flask
app = Flask(__name__)

# Habilita o CORS para a origem específica do localhost onde o app Next.js está rodando.
# Isso é mais seguro que permitir '*', mas resolve o problema em desenvolvimento.
CORS(app, resources={r"/api/*": {"origins": "http://localhost:777"}})

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
    from flask import request
    if request.method == 'HEAD':
        return '', 200

    dados_da_tabela = fetch_table_data()
    
    if isinstance(dados_da_tabela, dict) and 'error' in dados_da_tabela:
        return jsonify(dados_da_tabela), 500
    
    return jsonify(dados_da_tabela)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080, debug=True)
