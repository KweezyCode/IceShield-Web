const KEY_BASE_URL = 'is.baseUrl';
const KEY_USER = 'is.user';
const KEY_PASS = 'is.pass';

export function loadConfig(){
  return {
    baseUrl: localStorage.getItem(KEY_BASE_URL) || '/api',
    user: localStorage.getItem(KEY_USER) || '',
    pass: localStorage.getItem(KEY_PASS) || ''
  };
}

export function saveConfig(cfg){
  localStorage.setItem(KEY_BASE_URL, (cfg.baseUrl || '/api').trim());
  localStorage.setItem(KEY_USER, (cfg.user || '').trim());
  localStorage.setItem(KEY_PASS, cfg.pass || '');
}

export function hasAuth(cfg){
  return !!(cfg && cfg.user && cfg.pass);
}

