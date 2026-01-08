import { toast } from './ui.js';

export async function promptBanOptions({ title, defaultReason='', allowNone=true }){
  // Простой UX без зависимостей: 2 prompt подряд.
  // Позже можно заменить на нормальный modal/bottom-sheet.

  const reason = window.prompt(title + '\n\nПричина (можно пусто):', defaultReason) ?? null;
  if(reason === null) return null; // cancel

  const hint = allowNone
    ? 'Срок (можно пусто): NONE, 1h, 6h, 12h, 1d, 7d, 30d или minutes=120'
    : 'Срок: 1h, 6h, 12h, 1d, 7d, 30d или minutes=120';

  const exp = window.prompt(hint, 'NONE') ?? null;
  if(exp === null) return null;

  const expiresAt = parseExpiresAt(exp);
  if(expiresAt === 'ERR'){
    toast('Неверный формат срока','err');
    return null;
  }

  return {
    reason: (reason || '').trim(),
    expiresAt
  };
}

export function parseExpiresAt(input){
  const s = String(input ?? '').trim().toLowerCase();
  if(!s || s === 'none' || s === '0') return undefined;

  const now = Date.now();

  const presets = {
    '1h': 60,
    '6h': 360,
    '12h': 720,
    '1d': 1440,
    '7d': 10080,
    '30d': 43200
  };
  if(presets[s]) return now + presets[s]*60*1000;

  const m1 = s.match(/^minutes=(\d{1,7})$/);
  if(m1){
    const mins = Number(m1[1]);
    if(!Number.isFinite(mins) || mins <= 0) return 'ERR';
    return now + mins*60*1000;
  }

  const m2 = s.match(/^(\d{1,7})(m|h|d)$/);
  if(m2){
    const n = Number(m2[1]);
    const unit = m2[2];
    if(!Number.isFinite(n) || n <= 0) return 'ERR';
    const mins = unit === 'm' ? n : unit === 'h' ? n*60 : n*1440;
    return now + mins*60*1000;
  }

  return 'ERR';
}

