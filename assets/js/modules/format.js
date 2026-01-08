export function fmtDate(ms){
  if(ms==null) return '';
  const d = new Date(Number(ms));
  if(isNaN(d)) return '';
  return d.toLocaleString();
}

export function ipFromNum(n){
  if(n==null) return '';
  let v = Number(n);
  if(!isFinite(v) || v<0) return '';
  v = (v >>> 0);
  return [(v>>>24)&255,(v>>>16)&255,(v>>>8)&255,(v)&255].join('.');
}

export function isIpv4(s){
  if(!s) return false;
  if(!/^\d{1,3}(?:\.\d{1,3}){3}$/.test(s)) return false;
  return s.split('.').every(x=>{ const n = Number(x); return n>=0 && n<=255; });
}

export function isValidSubnet(s){
  if(!s || typeof s !== 'string') return false;
  const m = s.match(/^(\d{1,3}(?:\.\d{1,3}){3})\/(\d{1,2})$/);
  if(!m) return false;
  if(!isIpv4(m[1])) return false;
  const mask = Number(m[2]);
  return Number.isInteger(mask) && mask>=0 && mask<=32;
}

export function normAsn(s){
  if(!s) return null;
  const m = String(s).trim().toUpperCase().match(/^(?:AS)?(\d{1,10})$/);
  if(!m) return null;
  return 'AS'+String(Number(m[1]));
}

export function isValidUsername(s){
  if(!s) return false;
  if(/\s/.test(s)) return false;
  return s.length>0 && s.length<=64;
}

export function countryFlagEmoji(countryCode){
  if(!countryCode) return '';
  const cc = String(countryCode).trim().toUpperCase();
  if(!/^[A-Z]{2}$/.test(cc)) return '';
  // Regional Indicator Symbols: A=0x1F1E6
  const A = 0x1F1E6;
  const c1 = cc.charCodeAt(0) - 65;
  const c2 = cc.charCodeAt(1) - 65;
  if(c1<0 || c1>25 || c2<0 || c2>25) return '';
  return String.fromCodePoint(A + c1) + String.fromCodePoint(A + c2);
}
