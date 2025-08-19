(function(){
  'use strict';
  const $ = (id)=>document.getElementById(id);
  // ====== Глобальные настройки ======
  const state = {
    baseUrl: localStorage.getItem('is.baseUrl') || '/api',
    user: localStorage.getItem('is.user') || '',
    pass: localStorage.getItem('is.pass') || ''
  };
  function applyInputs(){ const bu=$('baseUrl'), au=$('authUser'), ap=$('authPass'); if(bu) bu.value = state.baseUrl; if(au) au.value = state.user; if(ap) ap.value = state.pass; }
  function saveCfg(){ state.baseUrl = ($('baseUrl').value||'/api').trim(); state.user = ($('authUser').value||'').trim(); state.pass = $('authPass').value||''; localStorage.setItem('is.baseUrl',state.baseUrl); localStorage.setItem('is.user',state.user); localStorage.setItem('is.pass',state.pass); }
  function hasAuth(){ return (state.user && state.pass); }
  function ensureAuthOrOpenSettings(){ if(!hasAuth()){ activateTab('sec-settings'); const s=$('cfgStatus'); if(s) setStatus(s,'Укажите логин и пароль', false); return false; } return true; }
  function buildUrl(path){
    const p = path.startsWith('/') ? path : '/' + path;
    const base = (state.baseUrl || '').trim();
    if (/^https?:\/\//i.test(base)) return base.replace(/\/?$/, '') + p;
    if (window.location && /^https?:\/\//i.test(window.location.origin || '')) return window.location.origin + base.replace(/\/?$/, '') + p;
    return 'http://localhost:8080' + base.replace(/\/?$/, '') + p;
  }
  function headers(){ const h={'Content-Type':'application/json'}; if(state.user||state.pass){ h['Authorization']='Basic '+btoa(state.user+':'+state.pass);} return h; }
  async function api(method, path, params, body){
    if(!hasAuth() && method!== 'OPTIONS'){ ensureAuthOrOpenSettings(); throw new Error('no-auth'); }
    const urlObj = new URL(buildUrl(path));
    if(params) for(const [k,v] of Object.entries(params)) if(v!==undefined&&v!==null&&String(v).length) urlObj.searchParams.set(k,v);
    try{
      const res = await fetch(urlObj.toString(), { method, headers: headers(), body: body?JSON.stringify(body):undefined });
      const text = await res.text();
      let data = text; try{ data = text? JSON.parse(text): null; }catch(_){ /* not json */ }
      return { ok: res.ok, status: res.status, data };
    } catch(e){ return { ok:false, status:0, data:{ error:'network_error', message: (e && e.message) || 'network error' } }; }
  }
  function fmtDate(ms){ if(ms==null) return ''; const d=new Date(Number(ms)); if(isNaN(d)) return ''; return d.toLocaleString(); }
  function ipFromNum(n){ if(n==null) return ''; let v = Number(n); if(!isFinite(v) || v<0) return ''; v = (v >>> 0); return [(v>>>24)&255,(v>>>16)&255,(v>>>8)&255,(v)&255].join('.'); }
  function setStatus(el,msg,ok){ el.textContent = msg; el.className = 'status ' + (ok===true?'ok':ok===false?'err':''); }

  // ====== Навигация вкладок ======
  function activateTab(id){
    document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
    document.querySelectorAll('.section').forEach(x=>x.classList.remove('active'));
    const tab = document.querySelector(`.tab[data-target="${id}"]`);
    const sec = document.getElementById(id);
    if(tab) tab.classList.add('active');
    if(sec) sec.classList.add('active');
    if(id==='sec-audit') resetAndLoadAudit();
    if(id==='sec-bans') resetAndLoadBans();
    if(id==='sec-settings') applyInputs();
  }
  document.querySelectorAll('.tab').forEach(t=>{
    t.addEventListener('click',()=>{
      const id = t.dataset.target;
      if(id!=='sec-settings' && !hasAuth()){ ensureAuthOrOpenSettings(); return; }
      activateTab(id);
    });
  });

  // Настройки
  const saveBtn=$('saveCfg'); if(saveBtn) saveBtn.onclick = ()=>{ saveCfg(); const s=$('cfgStatus'); if(s) setStatus(s,'Сохранено', true); };
  const testBtn=$('testCfg'); if(testBtn) testBtn.onclick = async ()=>{ saveCfg(); const s=$('cfgStatus'); if(s) setStatus(s,'Проверка…'); try{ const r = await api('GET','/audit',{limit:1}); if(s) setStatus(s, (r.ok? 'OK ':'Ошибка ')+'('+r.status+')', r.ok); }catch(e){ if(s) setStatus(s,'Сбой запроса', false);} };

  // ====== Аудит с автоподгрузкой вверх ======
  const audit = { q:'', limit: Number(($('audLimit')&&$('audLimit').value)||20), offset:0, loading:false, end:false, initialLoaded:false };
  function isIpv4(s){ if(!s) return false; if(!/^\d{1,3}(?:\.\d{1,3}){3}$/.test(s)) return false; return s.split('.').every(x=>{const n=Number(x); return n>=0 && n<=255;}); }
  function resetAndLoadAudit(){ if(!ensureAuthOrOpenSettings()) return; audit.offset=0; audit.end=false; audit.loading=false; audit.initialLoaded=false; const tb=$('audTbody'); if(tb) tb.innerHTML=''; loadAuditPage(true); }
  const audLimitEl=$('audLimit'); if(audLimitEl) audLimitEl.onchange = ()=>{ audit.limit = Number(audLimitEl.value)||20; resetAndLoadAudit(); };
  let audDebounce; const audSearch=$('audSearch'); if(audSearch) audSearch.addEventListener('input', ()=>{ clearTimeout(audDebounce); audDebounce = setTimeout(()=>{ audit.q = audSearch.value.trim(); resetAndLoadAudit(); }, 400); });

  function auditRowClass(code){
    switch(code){
      case 'CREATED_ACCOUNT': return 'row-created';
      case 'FAILED': return 'row-failed';
      case 'JOINED_WITH_PASSWORD':
      case 'JOINED_WITHOUT_PASSWORD': return 'row-joined';
      default: return '';
    }
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
        if(tb){ const msg = r.status===401? 'Не авторизовано. Проверьте логин/пароль во вкладке Настройки.' : (r.status===0? 'Сетевая ошибка. Проверьте base URL во вкладке Настройки.' : `Ошибка загрузки (${r.status})`); tb.innerHTML = `<tr><td colspan="4" class="muted">${msg}</td></tr>`; }
        audit.end = true; return 0;
      }
      const arr = Array.isArray(r.data)? r.data: [];
      if(initial && tb) tb.innerHTML='';
      if(arr.length===0){ if(initial && tb) tb.innerHTML = '<tr><td colspan="4" class="muted">Нет данных</td></tr>'; audit.end=true; return 0; }
      const rows = arr.slice().reverse();
      if(initial && !audit.initialLoaded){
        if(tb) tb.insertAdjacentHTML('beforeend', rows.map(renderAuditRow).join(''));
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
  function renderAuditRow(x){
    const rowCls = auditRowClass(x.joincode);
    return `<tr class="${rowCls}">
      <td class="mono">${x.id??''}</td>
      <td>${x.username??''}</td>
      <td class="mono">${ipFromNum(x.ipNum)}</td>
      <td>${fmtDate(x.createdAt)}</td>
    </tr>`;
  }
  const audScroll=$('audScroll'); if(audScroll) audScroll.addEventListener('scroll', ()=>{ if(audScroll.scrollTop <= 30){ loadAuditPage(false); } });

  // ====== Баны с автоподгрузкой вверх ======
  const bans = {
    type: ($('banType')&&$('banType').value)||'',
    valueLike: ($('banFilterValue')&&$('banFilterValue').value)||'',
    reasonLike: ($('banFilterReason')&&$('banFilterReason').value)||'',
    byLike: ($('banFilterBy')&&$('banFilterBy').value)||'',
    activeOnly: !!($('banActiveOnly')&&$('banActiveOnly').checked),
    limit: Number(($('banLimit')&&$('banLimit').value)||20),
    offset:0, loading:false, end:false, initialLoaded:false
  };
  function resetAndLoadBans(){ if(!ensureAuthOrOpenSettings()) return; bans.offset=0; bans.end=false; bans.loading=false; bans.initialLoaded=false; const tb=$('banTbody'); if(tb) tb.innerHTML=''; loadBansPage(true); }
  const banTypeEl=$('banType'); if(banTypeEl) banTypeEl.onchange=()=>{ bans.type=banTypeEl.value; resetAndLoadBans(); };
  const banLimitEl=$('banLimit'); if(banLimitEl) banLimitEl.onchange=()=>{ bans.limit=Number(banLimitEl.value)||20; resetAndLoadBans(); };
  const banActiveEl=$('banActiveOnly'); if(banActiveEl) banActiveEl.addEventListener('change', ()=>{ bans.activeOnly=!!banActiveEl.checked; resetAndLoadBans(); });
  let banDebounce;
  const bfValue=$('banFilterValue'); if(bfValue) bfValue.addEventListener('input', ()=>{ clearTimeout(banDebounce); banDebounce=setTimeout(()=>{ bans.valueLike=bfValue.value.trim(); resetAndLoadBans(); }, 350); });
  const bfReason=$('banFilterReason'); if(bfReason) bfReason.addEventListener('input', ()=>{ clearTimeout(banDebounce); banDebounce=setTimeout(()=>{ bans.reasonLike=bfReason.value.trim(); resetAndLoadBans(); }, 350); });
  const bfBy=$('banFilterBy'); if(bfBy) bfBy.addEventListener('input', ()=>{ clearTimeout(banDebounce); banDebounce=setTimeout(()=>{ bans.byLike=bfBy.value.trim(); resetAndLoadBans(); }, 350); });

  async function loadBansPage(initial){
    if(bans.loading||bans.end) return 0; bans.loading=true;
    const sc = $('banScroll'); const tb = $('banTbody');
    if(initial && tb && tb.children.length===0){ tb.innerHTML = '<tr><td colspan="8" class="muted">Загрузка…</td></tr>'; }
    const params = { limit:bans.limit, offset:bans.offset };
    if(bans.type) params.type = bans.type;
    if(bans.valueLike) params.value = bans.valueLike;
    if(bans.reasonLike) params.reason = bans.reasonLike;
    if(bans.byLike) params.bannedBy = bans.byLike;
    if(bans.activeOnly) params.active = '1';
    const r = await api('GET','/bans/list', params);
    if(!r.ok){ if(tb){ const msg = r.status===401? 'Не авторизовано. Проверьте логин/пароль во вкладке Настройки.' : (r.status===0? 'Сетевая ошибка. Проверьте base URL во вкладке Настройки.' : `Ошибка загрузки (${r.status})`); tb.innerHTML = `<tr><td colspan="8" class="muted">${msg}</td></tr>`; } bans.end = true; bans.loading=false; return 0; }
    const arr = Array.isArray(r.data)? r.data: [];
    if(initial && tb) tb.innerHTML='';
    if(arr.length===0){ if(initial && tb) tb.innerHTML = '<tr><td colspan="8" class="muted">Нет данных</td></tr>'; bans.end=true; bans.loading=false; return 0; }
    const rows = arr.slice().reverse();
    if(initial && !bans.initialLoaded){
      if(tb) tb.insertAdjacentHTML('beforeend', rows.map(renderBanRow).join(''));
      await new Promise(rf=>requestAnimationFrame(rf));
      if(sc) sc.scrollTop = sc.scrollHeight;
      bindBanDeleteButtons();
      bans.initialLoaded=true;
    } else {
      const prev = sc? sc.scrollHeight:0;
      if(tb) tb.insertAdjacentHTML('afterbegin', rows.map(renderBanRow).join(''));
      const next = sc? sc.scrollHeight:0; if(sc) sc.scrollTop += (next - prev);
      bindBanDeleteButtons();
    }
    bans.offset += arr.length;
    if(arr.length < bans.limit) bans.end = true;
    bans.loading=false;
    return arr.length;
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
  function renderBanRow(x){
    const gid = (typeof x.detailId === 'number' ? x.detailId : parseInt(x.detailId||'0',10)) || 0;
    const gcls = 'ban-group g'+(Math.abs(gid)%12);
    return `<tr class="${gcls}">
      <td class="mono">${x.detailId??''}</td>
      <td>${x.type||''}</td>
      <td class="mono">${x.value||''}</td>
      <td>${x.reason||''}</td>
      <td>${x.bannedBy||''}</td>
      <td>${fmtDate(x.bannedAt)}</td>
      <td>${x.expiresAt?fmtDate(x.expiresAt):''}</td>
      <td><button class="secondary" data-del="${x.detailId}">Удалить</button></td>
    </tr>`;
  }
  function bindBanDeleteButtons(){
    document.querySelectorAll('#banTbody button[data-del]').forEach(btn=>{
      if(btn._bound) return; btn._bound = true;
      btn.addEventListener('click', async ()=>{
        const id = btn.getAttribute('data-del');
        btn.disabled = true; const old = btn.textContent; btn.textContent='Удаление…';
        try{ await api('DELETE','/bans/by-detail/'+encodeURIComponent(id)); resetAndLoadBans(); }
        finally { btn.disabled=false; btn.textContent=old; }
      });
    });
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
    return s.length>0 && s.length<=64; // мягкая проверка без лишних ограничений
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

    // нормализация и валидация значения
    if(type==='ASN'){ const n = normAsn(value); if(!n){ if(addStatus) setStatus(addStatus,'ASN должен быть числом или AS12345', false); return; } value = n; }
    const err = validateBanInput(type, value);
    if(err){ if(addStatus) setStatus(addStatus, err, false); return; }

    // срок
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

  // Проверка бана
  const btnChkIp=$('btnChkIp'); if(btnChkIp) btnChkIp.onclick = async ()=>{ if(!ensureAuthOrOpenSettings()) return; const ip=$('chkIp').value.trim(); const r=await api('GET','/bans/check/ip',{ip}); $('chkOut').textContent = JSON.stringify(r.data, null, 2); };
  const btnChkUser=$('btnChkUser'); if(btnChkUser) btnChkUser.onclick = async ()=>{ if(!ensureAuthOrOpenSettings()) return; const username=$('chkUser').value.trim(); const r=await api('GET','/bans/check/user',{username}); $('chkOut').textContent = JSON.stringify(r.data, null, 2); };
  const btnChkAsn=$('btnChkAsn'); if(btnChkAsn) btnChkAsn.onclick = async ()=>{ if(!ensureAuthOrOpenSettings()) return; const asn=$('chkAsn').value.trim(); const r=await api('GET','/bans/check/asn',{asn}); $('chkOut').textContent = JSON.stringify(r.data, null, 2); };

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

  // Хуки автодогрузки при коротких списках (до первого activateTab)
  const oldResetAudit = resetAndLoadAudit; resetAndLoadAudit = function(){ oldResetAudit(); setTimeout(ensureScrollableAudit, 50); };
  const oldResetBans = resetAndLoadBans; resetAndLoadBans = function(){ oldResetBans(); setTimeout(ensureScrollableBans, 50); };

  // Первый показ вкладки
  if(!hasAuth()) activateTab('sec-settings'); else activateTab('sec-audit');
})();
