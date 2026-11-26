import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

/**
 * Reads key=value pairs from a local .env file into process.env
 * without overwriting variables already set by the OS/hosting environment.
 */
export function loadEnvFile(envPath = path.join(PROJECT_ROOT, '.env')) {
  if (!fs.existsSync(envPath)) {
    return;
  }

  const content = fs.readFileSync(envPath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const eqIndex = line.indexOf('=');
    if (eqIndex <= 0) continue;

    const key = line.slice(0, eqIndex).trim();
    let value = line.slice(eqIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

/**
 * Returns sanitized server configuration.
 * Never send secret fields (like geminiApiKey) to frontend responses.
 */
export function getConfig() {
  loadEnvFile();

  const port = Number.parseInt(process.env.PORT || '3000', 10);
  const defaultAqiMode = process.env.DEFAULT_AQI_MODE === 'live' ? 'live' : 'demo';

  return {
    port: Number.isFinite(port) && port > 0 ? port : 3000,
    geminiApiKey: (process.env.GEMINI_API_KEY || '').trim(),
    geminiModel: (process.env.GEMINI_MODEL || 'gemini-2.5-flash').trim(),
    defaultAqiMode,
  };
}
