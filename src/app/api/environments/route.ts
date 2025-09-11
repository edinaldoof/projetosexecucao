import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

// O caminho para o nosso arquivo de configuração "banco de dados"
const configPath = path.resolve(process.cwd(), 'src/lib/environments-config.json');

/**
 * Lida com requisições GET para buscar as configurações de ambiente.
 */
export async function GET() {
  try {
    const fileContent = await fs.readFile(configPath, 'utf-8');
    const data = JSON.parse(fileContent);
    return NextResponse.json(data);
  } catch (error: any) {
    // Se o arquivo não existir, retorna um array vazio.
    if (error.code === 'ENOENT') {
      return NextResponse.json([]);
    }
    console.error('Failed to read environments config:', error);
    return NextResponse.json({ message: 'Error reading configuration file' }, { status: 500 });
  }
}

/**
 * Lida com requisições POST para salvar as configurações de ambiente.
 */
export async function POST(request: Request) {
  try {
    const newEnvironments = await request.json();
    // Formata o JSON com indentação para facilitar a leitura humana
    const fileContent = JSON.stringify(newEnvironments, null, 2); 
    await fs.writeFile(configPath, fileContent, 'utf-8');
    return NextResponse.json({ message: 'Configuration saved successfully' });
  } catch (error) {
    console.error('Failed to write environments config:', error);
    return NextResponse.json({ message: 'Error writing configuration file' }, { status: 500 });
  }
}
