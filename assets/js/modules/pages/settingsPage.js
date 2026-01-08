import { $, on } from '../dom.js';
import { setStatus, updateApiBadge } from '../ui.js';

export function initSettingsPage({ getConfig, setConfig, api }){
  function applyInputs(){
    const cfg = getConfig();
    const bu=$('baseUrl'), au=$('authUser'), ap=$('authPass');
    if(bu) bu.value = cfg.baseUrl;
    if(au) au.value = cfg.user;
    if(ap) ap.value = cfg.pass;
  }

  function saveFromInputs(){
    const next = {
      baseUrl: ($('baseUrl')?.value || '/api').trim(),
      user: ($('authUser')?.value || '').trim(),
      pass: $('authPass')?.value || ''
    };
    setConfig(next);
  }

  on($('saveCfg'),'click', ()=>{
    saveFromInputs();
    setStatus($('cfgStatus'),'Сохранено', true);
    updateApiBadge('unknown');
  });

  on($('testCfg'),'click', async ()=>{
    saveFromInputs();
    setStatus($('cfgStatus'),'Проверка…');
    updateApiBadge('unknown');
    const r = await api.get('/audit', { limit:1 });
    setStatus($('cfgStatus'), (r.ok? 'OK ':'Ошибка ')+'('+r.status+')', r.ok);
  });

  return { applyInputs, saveFromInputs };
}

