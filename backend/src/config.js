import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

try {
  process.loadEnvFile(path.join(raiz, '.env'));
} catch {
  // Sem arquivo .env: usa as variáveis de ambiente já definidas.
}

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL não definida. Copie backend/.env.example para backend/.env e ajuste a senha do PostgreSQL.');
  process.exit(1);
}

if (!process.env.JWT_SECRET) {
  console.warn('Aviso: JWT_SECRET não definido no .env — usando um segredo padrão (não use assim em produção).');
}

export const config = {
  port: Number(process.env.PORT || 3333),
  databaseUrl: process.env.DATABASE_URL,
  timezone: process.env.TIMEZONE || 'America/Sao_Paulo',
  jwtSecret: process.env.JWT_SECRET || 'chamados-ti-segredo-de-desenvolvimento',
  uploadDir: path.join(raiz, 'uploads'),
  frontendDist: path.resolve(raiz, '..', 'frontend', 'dist'),
};
