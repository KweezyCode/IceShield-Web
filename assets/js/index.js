(function(){
  'use strict';
  const $ = (id)=>document.getElementById(id);

  // ====== Тема ======
  const THEME_KEY = 'is.theme';
  function applyTheme(theme){
    const t = theme || 'auto';
    if(t === 'dark') document.documentElement.setAttribute('data-theme','dark');
    else if(t === 'light') document.documentElement.removeAttribute('data-theme');
    else {
      // auto
      const mq = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
      if(mq && mq.matches) document.documentElement.setAttribute('data-theme','dark');
      else document.documentElement.removeAttribute('data-theme');
    }
  }
  function toggleTheme(){
    const cur = localStorage.getItem(THEME_KEY) || 'auto';
    const next = cur === 'auto' ? 'dark' : cur === 'dark' ? 'light' : 'auto';
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
    toast(next==='auto' ? 'Тема: как в системе' : next==='dark' ? 'Тема: тёмная' : 'Тема: светлая','ok');
  }
  applyTheme(localStorage.getItem(THEME_KEY) || 'auto');
  const btnTheme = $('btnTheme');
  if(btnTheme) btnTheme.addEventListener('click', toggleTheme);

  // ====== Глобальные настройки ======
  const state = {
    baseUrl: localStorage.getItem('is.baseUrl') || '/api',
    user: localStorage.getItem('is.user') || '',
    pass: localStorage.getItem('is.pass') || ''
  };
  function applyInputs(){ const bu=$('baseUrl'), au=$('authUser'), ap=$('authPass'); if(bu) bu.value = state.baseUrl; if(au) au.value = state.user; if(ap) ap.value = state.pass; }
  function saveCfg(){ state.baseUrl = ($('baseUrl').value||'/api').trim(); state.user = ($('authUser').value||'').trim(); state.pass = $('authPass').value||''; localStorage.setItem('is.baseUrl',state.baseUrl); localStorage.setItem('is.user',state.user); localStorage.setItem('is.pass',state.pass); }
  function hasAuth(){ return (state.user && state.pass); }
  function ensureAuthOrOpenSettings(){ if(!hasAuth()){ activateTab('sec-settings'); const s=$('cfgStatus'); if(s) setStatus(s,'Укажите логин и пароль', false); updateApiBadge('noauth'); return false; } return true; }

  function buildUrl(path){
    const p = path.startsWith('/') ? path : '/' + path;
    const base = (state.baseUrl || '').trim();
    if (/^https?:\/\//i.test(base)) return base.replace(/\/?$/, '') + p;
    if (window.location && /^https?:\/\//i.test(window.location.origin || '')) return window.location.origin + base.replace(/\/?$/, '') + p;
    return 'http://localhost:8080' + base.replace(/\/?$/, '') + p;
  }
  function headers(){ const h={'Content-Type':'application/json'}; if(state.user||state.pass){ h['Authorization']='Basic '+btoa(state.user+':'+state.pass);} return h; }

  function updateApiBadge(kind, status){
    const b = $('apiBadge');
    if(!b) return;
    b.classList.remove('ok','err','muted');
    if(kind === 'ok'){ b.classList.add('ok'); b.textContent = 'API: OK'; b.title = 'API доступно'; return; }
    if(kind === 'err'){ b.classList.add('err'); b.textContent = 'API: ERR'+(status?(' '+status):''); b.title = 'Ошибка подключения/авторизации'; return; }
    if(kind === 'noauth'){ b.classList.add('muted'); b.textContent = 'API: —'; b.title = 'Нужен логин/пароль'; return; }
    b.classList.add('muted'); b.textContent = 'API: …'; b.title = 'Проверка…';
  }

  async function api(method, path, params, body){
    if(!hasAuth() && method!== 'OPTIONS'){ ensureAuthOrOpenSettings(); throw new Error('no-auth'); }
    const urlObj = new URL(buildUrl(path));
    if(params) for(const [k,v] of Object.entries(params)) if(v!==undefined&&v!==null&&String(v).length) urlObj.searchParams.set(k,v);
    try{
      const res = await fetch(urlObj.toString(), { method, headers: headers(), body: body?JSON.stringify(body):undefined });
      const text = await res.text();
      let data = text; try{ data = text? JSON.parse(text): null; }catch(_){ /* not json */ }
      if(res.ok) updateApiBadge('ok');
      else if(res.status === 401) updateApiBadge('err', 401);
      else updateApiBadge('err', res.status);
      return { ok: res.ok, status: res.status, data };
    } catch(e){
      updateApiBadge('err', 'NET');
      return { ok:false, status:0, data:{ error:'network_error', message: (e && e.message) || 'network error' } };
    }
  }

  function fmtDate(ms){ if(ms==null) return ''; const d=new Date(Number(ms)); if(isNaN(d)) return ''; return d.toLocaleString(); }
  function ipFromNum(n){ if(n==null) return ''; let v = Number(n); if(!isFinite(v) || v<0) return ''; v = (v >>> 0); return [(v>>>24)&255,(v>>>16)&255,(v>>>8)&255,(v)&255].join('.'); }
  function setStatus(el,msg,ok){ el.textContent = msg; el.className = 'status ' + (ok===true?'ok':ok===false?'err':''); }

  // Простые уведомления
  function toast(msg, kind){
    const t = document.createElement('div');
    t.className = 'toast'+(kind? ' '+kind:'');
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(()=>{ t.remove(); }, 2200);
  }
  // Безопасное экранирование
  function escapeHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;').replace(/'/g,'&#39;'); }

  // ====== Навигация вкладок (верх / низ) ======
  function setActiveTabButtons(id){
    document.querySelectorAll('.tab, .btab').forEach(x=>{
      const tgt = x.dataset && x.dataset.target;
      x.classList.toggle('active', tgt === id);
    });
  }
  function activateTab(id){
    document.querySelectorAll('.section').forEach(x=>x.classList.remove('active'));
    const sec = document.getElementById(id);
    if(sec) sec.classList.add('active');
    setActiveTabButtons(id);
    // скрыть открытое контекстное меню при переключении
    hideCtxMenu();
    if(id==='sec-audit') resetAndLoadAudit();
    if(id==='sec-bans') resetAndLoadBans();
    if(id==='sec-settings') applyInputs();
  }
  function bindTabButtons(selector){
    document.querySelectorAll(selector).forEach(t=>{
      t.addEventListener('click',()=>{
        const id = t.dataset.target;
        if(id!=='sec-settings' && !hasAuth()){ ensureAuthOrOpenSettings(); return; }
        activateTab(id);
      });
    });
  }
  bindTabButtons('.tab');
  bindTabButtons('.btab');

  // Настройки
  const saveBtn=$('saveCfg'); if(saveBtn) saveBtn.onclick = ()=>{ saveCfg(); const s=$('cfgStatus'); if(s) setStatus(s,'Сохранено', true); updateApiBadge('unknown'); };
  const testBtn=$('testCfg'); if(testBtn) testBtn.onclick = async ()=>{ saveCfg(); const s=$('cfgStatus'); if(s) setStatus(s,'Проверка…'); updateApiBadge('unknown'); try{ const r = await api('GET','/audit',{limit:1}); if(s) setStatus(s, (r.ok? 'OK ':'Ошибка ')+'('+r.status+')', r.ok); }catch(e){ if(s) setStatus(s,'Сбой запроса', false);} };

  // ====== Аудит ======
  const audit = { q:'', limit: Number(($('audLimit')&&$('audLimit').value)||20), offset:0, loading:false, end:false, initialLoaded:false, newestId:null };
  function isIpv4(s){ if(!s) return false; if(!/^\d{1,3}(?:\.\d{1,3}){3}$/.test(s)) return false; return s.split('.').every(x=>{const n=Number(x); return n>=0 && n<=255;}); }
  function resetAndLoadAudit(){
    if(!ensureAuthOrOpenSettings()) return;
    audit.offset=0; audit.end=false; audit.loading=false; audit.initialLoaded=false; audit.newestId=null;
    const tb=$('audTbody'); if(tb) tb.innerHTML='';
    loadAuditPage(true);
  }
  const audLimitEl=$('audLimit'); if(audLimitEl) audLimitEl.onchange = ()=>{ audit.limit = Number(audLimitEl.value)||20; resetAndLoadAudit(); };
  let audDebounce; const audSearch=$('audSearch'); if(audSearch) audSearch.addEventListener('input', ()=>{ clearTimeout(audDebounce); audDebounce = setTimeout(()=>{ audit.q = audSearch.value.trim(); resetAndLoadAudit(); }, 400); });

  const audRefresh = $('audRefresh');
  if(audRefresh) audRefresh.addEventListener('click', ()=> resetAndLoadAudit());

  function auditRowClass(code){
    switch(code){
      case 'CREATED_ACCOUNT': return 'row-created';
      case 'FAILED': return 'row-failed';
      case 'JOINED_WITH_PASSWORD':
      case 'JOINED_WITHOUT_PASSWORD': return 'row-joined';
      default: return '';
    }
  }

  function renderAuditRow(x){
    const rowCls = auditRowClass(x.joincode);
    const uname = x.username??'';
    return `<tr class="${rowCls}" data-username="${escapeHtml(uname)}" data-id="${x.id??''}">\n      <td class="mono">${x.id??''}</td>\n      <td>${uname}</td>\n      <td class="mono">${ipFromNum(x.ipNum)}</td>\n      <td>${fmtDate(x.createdAt)}</td>\n    </tr>`;
  }

  async function loadAuditPage(initial){
    if(audit.loading||audit.end) return 0; audit.loading=true;
    const sc = $('audScroll'); const tb = $('audTbody');
    if(initial && tb && tb.children.length===0){ tb.innerHTML = '<tr><td colspan="4" class="muted">Загрузка…</td></tr>'; }
    let ep='/audit', params={limit:audit.limit, offset:audit.offset};
    if(audit.q){ if(isIpv4(audit.q)){ ep='/audit/ip'; params.ip=audit.q; } else { ep='/audit/user'; params.username=audit.q; } }
    try{
      const r = await api('GET', ep, params);
      if(!r.ok){
        if(tb){
          const msg = r.status===401? 'Не авторизовано. Проверьте логин/пароль во вкладке Настройки.' : (r.status===0? 'Сетевая ошибка. Проверьте base URL во вкладке Настройки.' : `Ошибка загрузки (${r.status})`);
          tb.innerHTML = `<tr><td colspan="4" class="muted">${msg}</td></tr>`;
        }
        audit.end = true;
        return 0;
      }
      const arr = Array.isArray(r.data)? r.data: [];
      if(initial && tb) tb.innerHTML='';
      if(arr.length===0){ if(initial && tb) tb.innerHTML = '<tr><td colspan="4" class="muted">Нет данных</td></tr>'; audit.end=true; return 0; }

      const rows = arr.slice().reverse();
      if(initial && !audit.initialLoaded){
        if(tb) tb.insertAdjacentHTML('beforeend', rows.map(renderAuditRow).join(''));
        audit.newestId = rows.length ? (rows[rows.length-1].id ?? audit.newestId) : audit.newestId;
        await new Promise(rf=>requestAnimationFrame(rf));
        if(sc) sc.scrollTop = sc.scrollHeight;
        audit.initialLoaded=true;
      } else {
        const prev = sc? sc.scrollHeight:0;
        if(tb) tb.insertAdjacentHTML('afterbegin', rows.map(renderAuditRow).join(''));
        const next = sc? sc.scrollHeight:0;
        if(sc) sc.scrollTop += (next - prev);
      }
      audit.offset += arr.length;
      if(arr.length < audit.limit) audit.end = true;
      return arr.length;
    } finally { audit.loading=false; }
  }

  // Подтянуть новые записи (пока не упремся в тот newestId, который был при первичной загрузке)
  async function pullNewAudit(){
    if(!ensureAuthOrOpenSettings()) return;
    if(audit.q) return; // для поиска не делаем авто-пул
    const sc = $('audScroll');
    const tb = $('audTbody');
    if(!tb) return;

    const prevTop = sc ? sc.scrollTop : 0;
    const nearBottom = sc ? (sc.scrollHeight - (sc.scrollTop + sc.clientHeight) < 50) : true;

    let totalAdded = 0;
    let offset = 0;
    while(offset < 1000){
      const r = await api('GET','/audit',{limit:50, offset});
      if(!r.ok) return;
      const arr = Array.isArray(r.data)? r.data: [];
      if(arr.length===0) break;
      const rows = arr.slice().reverse();
      // если это первый раз - обновим newestId
      if(audit.newestId == null){
        audit.newestId = rows.length ? (rows[rows.length-1].id ?? null) : null;
        break;
      }
      const stopIdx = rows.findIndex(x => (x.id ?? null) === audit.newestId);
      const slice = stopIdx >= 0 ? rows.slice(stopIdx + 1) : rows;
      if(slice.length){
        tb.insertAdjacentHTML('beforeend', slice.map(renderAuditRow).join(''));
        totalAdded += slice.length;
      }
      if(stopIdx >= 0) break;
      offset += arr.length;
      if(arr.length < 50) break;
    }

    if(totalAdded){
      // обновляем newestId на самый новый (последняя строка внизу)
      const last = tb.lastElementChild;
      if(last && last.getAttribute) audit.newestId = Number(last.getAttribute('data-id')) || audit.newestId;
      if(sc){
        if(nearBottom) sc.scrollTop = sc.scrollHeight;
        else sc.scrollTop = prevTop; // не дергаем пользователя
      }
      const hint = $('audHint');
      if(hint) hint.textContent = `Добавлено новых: ${totalAdded}`;
      toast(`Аудит: +${totalAdded}`,'ok');
    }
  }

  async function ensureScrollableAudit(){
    const sc = $('audScroll');
    for(let i=0;i<10;i++){
      if(audit.end) break;
      await new Promise(r=>requestAnimationFrame(r));
      if(sc && sc.scrollHeight > sc.clientHeight + 8) break;
      const n = await loadAuditPage(false);
      if(!n) break;
    }
  }
  const audScroll=$('audScroll'); if(audScroll) audScroll.addEventListener('scroll', ()=>{ if(audScroll.scrollTop <= 30){ loadAuditPage(false); } });

  // ====== Баны ======
  const bans = {
    type: ($('banType')&&$('banType').value)||'',
    valueLike: ($('banFilterValue')&&$('banFilterValue').value)||'',
    reasonLike: ($('banFilterReason')&&$('banFilterReason').value)||'',
    byLike: ($('banFilterBy')&&$('banFilterBy').value)||'',
    activeOnly: !!($('banActiveOnly')&&$('banActiveOnly').checked),
    limit: Number(($('banLimit')&&$('banLimit').value)||20),
    offset:0, loading:false, end:false, initialLoaded:false, newestDetailId:null
  };
  function resetAndLoadBans(){
    if(!ensureAuthOrOpenSettings()) return;
    bans.offset=0; bans.end=false; bans.loading=false; bans.initialLoaded=false; bans.newestDetailId=null;
    const tb=$('banTbody'); if(tb) tb.innerHTML='';
    loadBansPage(true);
  }
  const banTypeEl=$('banType'); if(banTypeEl) banTypeEl.onchange=()=>{ bans.type=banTypeEl.value; resetAndLoadBans(); };
  const banLimitEl=$('banLimit'); if(banLimitEl) banLimitEl.onchange=()=>{ bans.limit=Number(banLimitEl.value)||20; resetAndLoadBans(); };
  const banActiveEl=$('banActiveOnly'); if(banActiveEl) banActiveEl.addEventListener('change', ()=>{ bans.activeOnly=!!banActiveEl.checked; resetAndLoadBans(); });
  let banDebounce;
  const bfValue=$('banFilterValue'); if(bfValue) bfValue.addEventListener('input', ()=>{ clearTimeout(banDebounce); banDebounce=setTimeout(()=>{ bans.valueLike=bfValue.value.trim(); resetAndLoadBans(); }, 350); });
  const bfReason=$('banFilterReason'); if(bfReason) bfReason.addEventListener('input', ()=>{ clearTimeout(banDebounce); banDebounce=setTimeout(()=>{ bans.reasonLike=bfReason.value.trim(); resetAndLoadBans(); }, 350); });
  const bfBy=$('banFilterBy'); if(bfBy) bfBy.addEventListener('input', ()=>{ clearTimeout(banDebounce); banDebounce=setTimeout(()=>{ bans.byLike=bfBy.value.trim(); resetAndLoadBans(); }, 350); });

  const banRefresh = $('banRefresh');
  if(banRefresh) banRefresh.addEventListener('click', ()=> resetAndLoadBans());

  function renderBanRow(x){
    const gid = (typeof x.detailId === 'number' ? x.detailId : parseInt(x.detailId||'0',10)) || 0;
    const gcls = 'ban-group g'+(Math.abs(gid)%12);
    const hasTypeAndEntry = (x && x.type && (x.entryId!==undefined && x.entryId!==null && String(x.entryId).length>0));
    const attrs = `data-detail-id="${x.detailId??''}" data-type="${x.type||''}" data-entry-id="${hasTypeAndEntry?x.entryId:''}"`;
    return `<tr class="${gcls}" ${attrs} data-detail="${x.detailId??''}">\n      <td class="mono">${x.detailId??''}</td>\n      <td>${x.type||''}</td>\n      <td class="mono">${x.value||''}</td>\n      <td>${x.reason||''}</td>\n      <td>${x.bannedBy||''}</td>\n      <td>${fmtDate(x.bannedAt)}</td>\n      <td>${x.expiresAt?fmtDate(x.expiresAt):''}</td>\n    </tr>`;
  }

  async function loadBansPage(initial){
    if(bans.loading||bans.end) return 0; bans.loading=true;
    const sc = $('banScroll'); const tb = $('banTbody');
    if(initial && tb && tb.children.length===0){ tb.innerHTML = '<tr><td colspan="7" class="muted">Загрузка…</td></tr>'; }
    const params = { limit:bans.limit, offset:bans.offset };
    if(bans.type) params.type = bans.type;
    if(bans.valueLike) params.value = bans.valueLike;
    if(bans.reasonLike) params.reason = bans.reasonLike;
    if(bans.byLike) params.bannedBy = bans.byLike;
    if(bans.activeOnly) params.active = '1';
    const r = await api('GET','/bans/list', params);
    if(!r.ok){
      if(tb){
        const msg = r.status===401? 'Не авторизовано. Проверьте логин/пароль во вкладке Настройки.' : (r.status===0? 'Сетевая ошибка. Проверьте base URL во вкладке Настройки.' : `Ошибка загрузки (${r.status})`);
        tb.innerHTML = `<tr><td colspan="7" class="muted">${msg}</td></tr>`;
      }
      bans.end = true; bans.loading=false; return 0;
    }
    const arr = Array.isArray(r.data)? r.data: [];
    if(initial && tb) tb.innerHTML='';
    if(arr.length===0){ if(initial && tb) tb.innerHTML = '<tr><td colspan="7" class="muted">Нет данных</td></tr>'; bans.end=true; bans.loading=false; return 0; }
    const rows = arr.slice().reverse();
    if(initial && !bans.initialLoaded){
      if(tb) tb.insertAdjacentHTML('beforeend', rows.map(renderBanRow).join(''));
      bans.newestDetailId = rows.length ? (rows[rows.length-1].detailId ?? bans.newestDetailId) : bans.newestDetailId;
      await new Promise(rf=>requestAnimationFrame(rf));
      if(sc) sc.scrollTop = sc.scrollHeight;
      bans.initialLoaded=true;
    } else {
      const prev = sc? sc.scrollHeight:0;
      if(tb) tb.insertAdjacentHTML('afterbegin', rows.map(renderBanRow).join(''));
      const next = sc? sc.scrollHeight:0; if(sc) sc.scrollTop += (next - prev);
    }
    bans.offset += arr.length;
    if(arr.length < bans.limit) bans.end = true;
    bans.loading=false;
    return arr.length;
  }

  async function pullNewBans(){
    if(!ensureAuthOrOpenSettings()) return;
    const hasFilters = !!(bans.type || bans.valueLike || bans.reasonLike || bans.byLike || bans.activeOnly);
    if(hasFilters) return;
    const tb = $('banTbody');
    const sc = $('banScroll');
    if(!tb) return;

    const prevTop = sc ? sc.scrollTop : 0;
    const nearBottom = sc ? (sc.scrollHeight - (sc.scrollTop + sc.clientHeight) < 50) : true;

    let totalAdded = 0;
    let offset = 0;
    while(offset < 2000){
      const r = await api('GET','/bans/list',{limit:50, offset});
      if(!r.ok) return;
      const arr = Array.isArray(r.data)? r.data: [];
      if(arr.length===0) break;
      const rows = arr.slice().reverse();
      if(bans.newestDetailId == null){
        bans.newestDetailId = rows.length ? (rows[rows.length-1].detailId ?? null) : null;
        break;
      }
      const stopIdx = rows.findIndex(x => (x.detailId ?? null) === bans.newestDetailId);
      const slice = stopIdx >= 0 ? rows.slice(stopIdx + 1) : rows;
      if(slice.length){
        tb.insertAdjacentHTML('beforeend', slice.map(renderBanRow).join(''));
        totalAdded += slice.length;
      }
      if(stopIdx >= 0) break;
      offset += arr.length;
      if(arr.length < 50) break;
    }

    if(totalAdded){
      const last = tb.lastElementChild;
      if(last && last.getAttribute) bans.newestDetailId = Number(last.getAttribute('data-detail')) || bans.newestDetailId;
      if(sc){
        if(nearBottom) sc.scrollTop = sc.scrollHeight;
        else sc.scrollTop = prevTop;
      }
      const hint = $('banHint');
      if(hint) hint.textContent = `Добавлено новых: ${totalAdded}`;
      toast(`Баны: +${totalAdded}`,'ok');
    }
  }

  async function ensureScrollableBans(){
    const sc = $('banScroll');
    for(let i=0;i<10;i++){
      if(bans.end) break;
      await new Promise(r=>requestAnimationFrame(r));
      if(sc && sc.scrollHeight > sc.clientHeight + 8) break;
      const n = await loadBansPage(false);
      if(!n) break;
    }
  }
  const banScroll=$('banScroll'); if(banScroll) banScroll.addEventListener('scroll', ()=>{ if(banScroll.scrollTop <= 30){ loadBansPage(false); } });

  // ====== Валидация и пресеты для Добавить бан ======
  const addTypeEl = $('addType');
  const addValueEl = $('addValue');
  const addReasonEl = $('addReason');
  const addPresetEl = $('addExpirePreset');
  const addExpIsoEl = $('addExpIso');
  const addStatus = $('addStatus');

  function isValidSubnet(s){
    if(!s || typeof s!=='string') return false;
    const m = s.match(/^(\d{1,3}(?:\.\d{1,3}){3})\/(\d{1,2})$/);
    if(!m) return false;
    if(!isIpv4(m[1])) return false;
    const mask = Number(m[2]);
    return Number.isInteger(mask) && mask>=0 && mask<=32;
  }
  function normAsn(s){
    if(!s) return null;
    const m = String(s).trim().toUpperCase().match(/^(?:AS)?(\d{1,10})$/);
    if(!m) return null;
    return 'AS'+String(Number(m[1]));
  }
  function isValidUsername(s){
    if(!s) return false;
    if(/\s/.test(s)) return false;
    return s.length>0 && s.length<=64;
  }
  function updateValuePlaceholder(){
    const t = addTypeEl && addTypeEl.value;
    if(!addValueEl) return;
    switch(t){
      case 'IP': addValueEl.placeholder = '1.2.3.4'; break;
      case 'SUBNET': addValueEl.placeholder = '1.2.3.0/24'; break;
      case 'ASN': addValueEl.placeholder = 'AS12345 или 12345'; break;
      case 'USERNAME':
      default: addValueEl.placeholder = 'username';
    }
  }
  function applyPresetState(){
    if(!addPresetEl || !addExpIsoEl) return;
    const v = addPresetEl.value;
    const custom = (v==='CUSTOM');
    addExpIsoEl.disabled = !custom;
    if(!custom) addExpIsoEl.value='';
  }
  if(addTypeEl) addTypeEl.addEventListener('change', ()=>{ updateValuePlaceholder(); if(addStatus) setStatus(addStatus,''); });
  if(addPresetEl) addPresetEl.addEventListener('change', ()=>{ applyPresetState(); if(addStatus) setStatus(addStatus,''); });
  updateValuePlaceholder(); applyPresetState();

  function computeExpiresAtFromPreset(){
    if(!addPresetEl) return undefined;
    const now = Date.now();
    switch(addPresetEl.value){
      case 'WEEK': return now + 7*24*3600*1000;
      case 'MONTH': return now + 30*24*3600*1000;
      case 'YEAR': return now + 365*24*3600*1000;
      case 'CUSTOM':{
        const iso = addExpIsoEl && addExpIsoEl.value;
        if(!iso) return 'ERR:date_required';
        const t = Date.parse(iso);
        if(!isFinite(t)) return 'ERR:bad_date';
        if(t <= now) return 'ERR:past_date';
        return t;
      }
      case 'NONE':
      default: return undefined;
    }
  }
  function validateBanInput(type, value){
    switch(type){
      case 'IP': return isIpv4(value) ? null : 'Неверный IPv4 адрес';
      case 'SUBNET': return isValidSubnet(value) ? null : 'Ожидается подсеть в формате 1.2.3.0/24';
      case 'ASN': return normAsn(value) ? null : 'ASN должен быть числом или в формате AS12345';
      case 'USERNAME':
      default: return isValidUsername(value) ? null : 'Укажите корректный username (без пробелов)';
    }
  }

  // Добавление бана
  const btnAdd=$('btnAdd'); if(btnAdd) btnAdd.onclick = async ()=>{
    if(!ensureAuthOrOpenSettings()) return;
    const type = addTypeEl.value;
    let value = (addValueEl.value||'').trim();
    const reason = (addReasonEl.value||'').trim();

    if(type==='ASN'){ const n = normAsn(value); if(!n){ if(addStatus) setStatus(addStatus,'ASN должен быть числом или AS12345', false); return; } value = n; }
    const err = validateBanInput(type, value);
    if(err){ if(addStatus) setStatus(addStatus, err, false); return; }

    const exp = computeExpiresAtFromPreset();
    if(typeof exp === 'string'){
      const code = exp.split(':')[1];
      const msg = code==='date_required'? 'Укажите дату истечения' : code==='bad_date'? 'Некорректная дата' : 'Дата в прошлом';
      if(addStatus) setStatus(addStatus, msg, false);
      return;
    }

    const body = { type, value, reason };
    if(exp !== undefined) body.expiresAt = exp;

    if(addStatus) setStatus(addStatus,'Отправка…');
    try{
      const r = await api('POST','/bans/add',null,body);
      if(addStatus) setStatus(addStatus, r.ok? 'Добавлено' : `Ошибка (${r.status})`, r.ok);
      if(r.ok){
        addValueEl.value='';
        addReasonEl.value='';
        if(addPresetEl){ addPresetEl.value='NONE'; }
        if(addExpIsoEl){ addExpIsoEl.value=''; addExpIsoEl.disabled=true; }
        resetAndLoadBans();
      }
    }catch(e){ if(addStatus) setStatus(addStatus,'Ошибка запроса', false); }
  };

  // Проверка бана (backend: /bans/check с одним query)
  const btnChkIp=$('btnChkIp'); if(btnChkIp) btnChkIp.onclick = async ()=>{ if(!ensureAuthOrOpenSettings()) return; const ip=$('chkIp').value.trim(); const r=await api('GET','/bans/check',{ip}); $('chkOut').textContent = JSON.stringify(r.data, null, 2); };
  const btnChkUser=$('btnChkUser'); if(btnChkUser) btnChkUser.onclick = async ()=>{ if(!ensureAuthOrOpenSettings()) return; const username=$('chkUser').value.trim(); const r=await api('GET','/bans/check',{username}); $('chkOut').textContent = JSON.stringify(r.data, null, 2); };
  const btnChkAsn=$('btnChkAsn'); if(btnChkAsn) btnChkAsn.onclick = async ()=>{ if(!ensureAuthOrOpenSettings()) return; const asn=$('chkAsn').value.trim(); const r=await api('GET','/bans/check',{asn}); $('chkOut').textContent = JSON.stringify(r.data, null, 2); };

  // ====== Пользователи ======
  const btnChangePass=$('btnChangePass'); if(btnChangePass) btnChangePass.onclick = async ()=>{
    if(!ensureAuthOrOpenSettings()) return; const us=$('userStatus'); if(us) setStatus(us,'Отправка…');
    const username = $('chUser').value.trim();
    const password = $('chPass').value;
    try{
      const r = await api('POST','/users/change-password', null, { username, password });
      if(us) setStatus(us, r.ok? 'Сменён' : `Ошибка (${r.status})`, r.ok);
      if(r.ok) $('chPass').value='';
    } catch(e){ if(us) setStatus(us,'Ошибка запроса', false); }
  };

  // ====== Контекстное меню ======
  let ctxMenuEl;
  function ensureCtxMenu(){
    if(!ctxMenuEl){
      ctxMenuEl = document.createElement('div');
      ctxMenuEl.className = 'ctx-menu';
      document.body.appendChild(ctxMenuEl);
    }
    return ctxMenuEl;
  }
  function hideCtxMenu(){ if(ctxMenuEl){ ctxMenuEl.classList.remove('open'); ctxMenuEl.style.left='-9999px'; ctxMenuEl.innerHTML=''; } }
  function showCtxMenu(items, x, y){
    const el = ensureCtxMenu();
    el.innerHTML = '';
    items.forEach((it, idx)=>{
      if(!it) return;
      if(it.type === 'sep'){ const s=document.createElement('div'); s.className='sep'; el.appendChild(s); return; }
      const b = document.createElement('button');
      b.textContent = it.label || ('Действие '+(idx+1));
      if(it.disabled) b.disabled = true;
      b.addEventListener('click', async ()=>{
        hideCtxMenu();
        try{ await it.onClick && it.onClick(); }catch(e){ console.error(e); toast('Ошибка действия','err'); }
      });
      el.appendChild(b);
    });
    el.classList.add('open');
    const pad = 6; const vw = window.innerWidth, vh = window.innerHeight;
    el.style.left = x+'px'; el.style.top = y+'px';
    requestAnimationFrame(()=>{
      const rect = el.getBoundingClientRect();
      let nx = x, ny = y;
      if(rect.right > vw - pad) nx = Math.max(pad, vw - rect.width - pad);
      if(rect.bottom > vh - pad) ny = Math.max(pad, vh - rect.height - pad);
      el.style.left = nx+'px'; el.style.top = ny+'px';
    });
  }
  document.addEventListener('mousedown', (e)=>{ if(ctxMenuEl && ctxMenuEl.classList.contains('open')){ if(!ctxMenuEl.contains(e.target)) hideCtxMenu(); } });
  window.addEventListener('scroll', hideCtxMenu, true);
  window.addEventListener('resize', hideCtxMenu);
  document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') hideCtxMenu(); });

  function attachRowContextMenu(tbody, buildItems){
    if(!tbody) return;
    const handler = (e)=>{
      const tr = e.target && (e.target.closest ? e.target.closest('tr') : null);
      if(!tr) return;
      if(e.type === 'contextmenu') e.preventDefault();
      if(!ensureAuthOrOpenSettings()) return;
      const items = buildItems(tr);
      showCtxMenu(items && items.length? items : [{ label:'Нет действий', onClick:()=>{}, disabled:true }], e.clientX, e.clientY);
    };
    tbody.addEventListener('contextmenu', handler);
    tbody.addEventListener('click', handler);
  }

  function buildBanMenuItems(tr){
    const detailId = tr.getAttribute('data-detail-id');
    const type = tr.getAttribute('data-type');
    const entryId = tr.getAttribute('data-entry-id');
    const items = [];
    if(detailId){
      items.push({ label: `Удалить бан (detailId ${detailId})`, onClick: async ()=>{
        const r=await api('DELETE','/bans/by-detail',{ detailId });
        if(r.ok){ toast('Бан удалён','ok'); resetAndLoadBans(); } else { toast('Ошибка удаления ('+r.status+')','err'); }
      }});
    }
    if(type && entryId){
      items.push({ label: `Удалить бан (type ${type} + entryId ${entryId})`, onClick: async ()=>{
        const r=await api('DELETE','/bans/by-type',{ type, entryId });
        if(r.ok){ toast('Бан удалён','ok'); resetAndLoadBans(); } else { toast('Ошибка удаления ('+r.status+')','err'); }
      }});
    }
    items.push({ type:'sep' });
    if(tr.children && tr.children[2]){
      const v = (tr.children[2].textContent||'').trim();
      if(v) items.push({ label:'Скопировать значение', onClick: async ()=>{ try{ await navigator.clipboard.writeText(v); toast('Скопировано','ok'); }catch(_){ toast('Не удалось скопировать','err'); } } });
    }
    return items;
  }

  function buildAuditMenuItems(tr){
    const username = tr.getAttribute('data-username') || (tr.children[1] && tr.children[1].textContent) || '';
    const items = [];
    if(username){
      items.push({ label: `Заблокировать “${username}”`, onClick: async ()=>{
        const r = await api('POST','/bans/add', null, { type:'USERNAME', value: username });
        if(r.ok){ toast('Пользователь заблокирован','ok'); resetAndLoadBans(); } else { toast('Ошибка блокировки ('+r.status+')','err'); }
      }});
      items.push({ type:'sep' });
      items.push({ label: 'Сменить пароль…', onClick: ()=>{ activateTab('sec-users'); const chU=$('chUser'); if(chU) chU.value = username; const chP=$('chPass'); if(chP) chP.focus(); } });
    }
    return items;
  }

  attachRowContextMenu($('banTbody'), buildBanMenuItems);
  attachRowContextMenu($('audTbody'), buildAuditMenuItems);

  // Хуки автодогрузки при коротких списках
  const oldResetAudit = resetAndLoadAudit; resetAndLoadAudit = function(){ oldResetAudit(); setTimeout(ensureScrollableAudit, 60); };
  const oldResetBans = resetAndLoadBans; resetAndLoadBans = function(){ oldResetBans(); setTimeout(ensureScrollableBans, 60); };

  // Автообновление (pull)
  let autoTimer;
  function setupAutoRefresh(){
    if(autoTimer) clearInterval(autoTimer);
    autoTimer = setInterval(async ()=>{
      const activeSec = document.querySelector('.section.active');
      const id = activeSec && activeSec.id;
      if(!id) return;
      if(!ensureAuthOrOpenSettings()) return;
      if(id === 'sec-audit'){
        const sw = $('audAuto');
        if(sw && sw.checked) await pullNewAudit();
      }
      if(id === 'sec-bans'){
        const sw = $('banAuto');
        if(sw && sw.checked) await pullNewBans();
      }
    }, 5000);
  }
  const audAuto=$('audAuto'); if(audAuto) audAuto.addEventListener('change', setupAutoRefresh);
  const banAuto=$('banAuto'); if(banAuto) banAuto.addEventListener('change', setupAutoRefresh);
  setupAutoRefresh();

  // Первый показ вкладки
  if(!hasAuth()) { updateApiBadge('noauth'); activateTab('sec-settings'); }
  else { updateApiBadge('unknown'); activateTab('sec-audit'); }
})();
