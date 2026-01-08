import { $ } from './modules/dom.js';
import { loadConfig, saveConfig, hasAuth } from './modules/storage.js';
import { updateApiBadge, setStatus, toast } from './modules/ui.js';
import { initTheme, toggleTheme } from './modules/theme.js';
import { ApiClient } from './modules/apiClient.js';
import { activateSection, bindNav } from './modules/navigation.js';
import { createContextMenu } from './modules/contextMenu.js';
import { Poller } from './modules/poller.js';

import { initSettingsPage } from './modules/pages/settingsPage.js';
import { initAuditPage } from './modules/pages/auditPage.js';
import { initBansPage } from './modules/pages/bansPage.js';
import { initUsersPage } from './modules/pages/usersPage.js';

// Приложение без фреймворка, но с модульной архитектурой:
// - ApiClient / storage / theme / navigation / pages
// - каждая страница управляет только своими DOM-элементами

let cfg = loadConfig();
const api = new ApiClient(()=>cfg);
const ctxMenu = createContextMenu();

// Временный кэш метаданных аудита.
const auditMetaCache = new Map(); // key: `${username}|${ip}` => { asn, countryCode, countryName, city, isp, badASN }
function metaKey({ username, ip }){ return `${username||''}|${ip||''}`; }
function resolveAuditMeta({ username, ip }){
  return auditMetaCache.get(metaKey({ username, ip })) || null;
}
function setAuditMeta({ username, ip }, data){
  if(!data) return;
  auditMetaCache.set(metaKey({ username, ip }), {
    asn: data.asn,
    countryCode: data.countryCode,
    countryName: data.countryName,
    city: data.city,
    isp: data.isp,
    badASN: (typeof data.badASN === 'boolean') ? data.badASN : null
  });
}

function ensureAuthOrOpenSettings(){
  if(hasAuth(cfg)) return true;
  activate('sec-settings');
  setStatus($('cfgStatus'), 'Укажите логин и пароль', false);
  updateApiBadge('noauth');
  return false;
}

function setConfig(next){
  cfg = { ...cfg, ...next };
  saveConfig(cfg);
}

function activate(id){
  // guard
  if(id !== 'sec-settings' && !hasAuth(cfg)){
    ensureAuthOrOpenSettings();
    return;
  }

  ctxMenu.hide();
  activateSection(id);

  if(id === 'sec-settings') settingsPage.applyInputs();
  if(id === 'sec-audit') auditPage.resetAndLoad();
  if(id === 'sec-bans') bansPage.resetAndLoad();
}

// Theme
initTheme();
$('btnTheme')?.addEventListener('click', toggleTheme);

// Pages
const settingsPage = initSettingsPage({
  getConfig: ()=>cfg,
  setConfig,
  api
});

const usersPage = initUsersPage({ api, ensureAuth: ensureAuthOrOpenSettings });

const auditPage = initAuditPage({
  api,
  ensureAuth: ensureAuthOrOpenSettings,
  ctxMenu,
  resolveAuditMeta,
  setAuditMeta,
  onChangePass: (username)=>{
    activate('sec-users');
    usersPage.prefillUsername(username);
  }
});

const bansPage = initBansPage({
  api,
  ensureAuth: ensureAuthOrOpenSettings,
  ctxMenu
});

// Navigation
bindNav((id)=>activate(id));

// Auto refresh
const poller = new Poller(5000, async ()=>{
  const activeSec = document.querySelector('.section.active');
  const id = activeSec?.id;
  if(!id) return;
  if(!hasAuth(cfg)) return;

  if(id === 'sec-audit'){
    const sw = $('audAuto');
    if(sw?.checked) await auditPage.pullNew();
  }
  if(id === 'sec-bans'){
    const sw = $('banAuto');
    if(sw?.checked) await bansPage.pullNew();
  }
});
poller.start();

// First view
if(!hasAuth(cfg)){
  updateApiBadge('noauth');
  activate('sec-settings');
} else {
  updateApiBadge('unknown');
  activate('sec-audit');
}
