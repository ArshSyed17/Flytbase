import path from 'node:path';

// Automatically load .env if AQ_TOKEN is not already defined
if (!process.env.AQ_TOKEN && typeof process.loadEnvFile === 'function') {
  const candidates = [
    '.env',
    'server/.env',
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), 'server', '.env'),
    new URL('../.env', import.meta.url)
  ];

  for (const candidate of candidates) {
    try {
      process.loadEnvFile(candidate);
      if (process.env.AQ_TOKEN) break;
    } catch {
      // Continue to next candidate
    }
  }
}

