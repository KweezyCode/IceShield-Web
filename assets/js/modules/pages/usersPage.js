import { $, on } from '../dom.js';
import { setStatus } from '../ui.js';

export function initUsersPage({ api, ensureAuth }){
  on($('btnChangePass'),'click', async ()=>{
    if(!ensureAuth()) return;
    setStatus($('userStatus'),'Отправка…');
    const username = ($('chUser')?.value || '').trim();
    const password = $('chPass')?.value || '';
    const r = await api.post('/users/change-password', { username, password });
    setStatus($('userStatus'), r.ok? 'Сменён' : `Ошибка (${r.status})`, r.ok);
    if(r.ok && $('chPass')) $('chPass').value='';
  });

  function prefillUsername(username){
    if($('chUser')) $('chUser').value = username || '';
    $('chPass')?.focus?.();
  }

  return { prefillUsername };
}

