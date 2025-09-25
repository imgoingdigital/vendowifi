import fs from 'fs';
import path from 'path';
import { logAudit } from './audit';

const logDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
  try { fs.mkdirSync(logDir); } catch {}
}
const logFile = path.join(logDir, 'app.log');

function writeLine(line: string) {
  fs.appendFile(logFile, line + '\n', err => { if (err) console.error('log write error', err); });
}

export interface LogMeta { [k: string]: any }

export async function appLog(level: 'info'|'warn'|'error'|'debug', message: string, meta?: LogMeta) {
  const entry = { ts: new Date().toISOString(), level, message, meta };
  writeLine(JSON.stringify(entry));
  // Also persist to audit table for info/warn/error (avoid debug noise)
  if (level !== 'debug') {
    await logAudit({ action: `log.${level}`, meta: { message, ...meta } });
  }
}

export const logInfo = (m: string, meta?: LogMeta) => appLog('info', m, meta);
export const logWarn = (m: string, meta?: LogMeta) => appLog('warn', m, meta);
export const logError = (m: string, meta?: LogMeta) => appLog('error', m, meta);
export const logDebug = (m: string, meta?: LogMeta) => appLog('debug', m, meta);
