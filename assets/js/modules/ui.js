let toastTimer;

export function setStatus(el, msg, ok){
  if(!el) return;
  el.textContent = msg;
  el.className = 'status ' + (ok===true?'ok':ok===false?'err':'');
}

export function toast(msg, kind){
  const t = document.createElement('div');
  t.className = 'toast'+(kind? ' '+kind:'');
  t.textContent = msg;
  document.body.appendChild(t);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>{ t.remove(); }, 2200);
}

export function updateApiBadge(kind, status){
  const b = document.getElementById('apiBadge');
  if(!b) return;
  b.classList.remove('ok','err','muted');
  if(kind === 'ok'){
    b.classList.add('ok');
    b.textContent = 'API: OK';
    b.title = 'API доступно';
    return;
  }
  if(kind === 'err'){
    b.classList.add('err');
    b.textContent = 'API: ERR'+(status?(' '+status):'');
    b.title = 'Ошибка подключения/авторизации';
    return;
  }
  if(kind === 'noauth'){
    b.classList.add('muted');
    b.textContent = 'API: —';
    b.title = 'Нужен логин/пароль';
    return;
  }
  b.classList.add('muted');
  b.textContent = 'API: …';
  b.title = 'Проверка…';
}

