import { $, on, escapeHtml } from '../dom.js';
import { fmtDate, normAsn, isValidSubnet, isIpv4, isValidUsername } from '../format.js';
import { toast, setStatus } from '../ui.js';

export function initBansPage({ api, ensureAuth, ctxMenu }){
  const state = {
    type: ($('banType')&&$('banType').value)||'',
    valueLike: ($('banFilterValue')&&$('banFilterValue').value)||'',
    reasonLike: ($('banFilterReason')&&$('banFilterReason').value)||'',
    byLike: ($('banFilterBy')&&$('banFilterBy').value)||'',
    activeOnly: !!($('banActiveOnly')&&$('banActiveOnly').checked),
    limit: Number(($('banLimit')&&$('banLimit').value)||20),
    offset:0, loading:false, end:false, initialLoaded:false, newestDetailId:null,
    expanded: new Set(),
    touched: new Set(), // detailId, которые пользователь явно трогал (чтобы не авто-раскрывать)
    lastItems: null,
    lastDigest: null,
    lastFetchAt: 0,
  };

  function groupKey(detailId){
    return String(detailId ?? '');
  }

  function ensureExpanded(detailId){
    const k = groupKey(detailId);
    if(!k) return;
    // По умолчанию раскрываем только те группы, которых пользователь ещё не трогал.
    if(state.touched.has(k)) return;
    if(!state.expanded.has(k)) state.expanded.add(k);
  }

  function toggleExpanded(detailId){
    const k = groupKey(detailId);
    if(!k) return;
    state.touched.add(k);
    if(state.expanded.has(k)) state.expanded.delete(k);
    else state.expanded.add(k);
  }

  function renderGroupHeader(detailId, meta){
    const k = groupKey(detailId);
    const isOpen = state.expanded.has(k);
    const cnt = meta.count || 0;
    const reason = meta.reason || '';
    const by = meta.bannedBy || '';
    const exp = meta.expiresAt ? fmtDate(meta.expiresAt) : '';
    const badge = isOpen ? '▼' : '▶';
    const title = `detailId ${detailId}`;

    return `<tr class="ban-detail-header" data-detail-group="${detailId}">
      <td class="mono">${badge} ${detailId}</td>
      <td colspan="2" class="muted">${escapeHtml(meta.summary || (cnt? (cnt+' записей') : ''))}</td>
      <td class="muted">${escapeHtml(reason)}</td>
      <td class="muted">${escapeHtml(by)}</td>
      <td class="muted">${meta.bannedAt ? fmtDate(meta.bannedAt) : ''}</td>
      <td class="muted">${escapeHtml(exp)}</td>
    </tr>`;
  }

  function renderEntryRow(x){
    const gid = (typeof x.detailId === 'number' ? x.detailId : parseInt(x.detailId||'0',10)) || 0;
    const gcls = 'ban-group g'+(Math.abs(gid)%12);
    const hasTypeAndEntry = (!!x && !!x.type && (x.entryId!==undefined && x.entryId!==null && String(x.entryId).length>0));
    const attrs = `data-detail-id=\"${x.detailId??''}\" data-type=\"${x.type||''}\" data-entry-id=\"${hasTypeAndEntry?x.entryId:''}\" data-detail=\"${x.detailId??''}\" data-detail-item=\"${x.detailId??''}\"`;

    return `<tr class=\"${gcls} ban-detail-item\" ${attrs}>\n`+
      `  <td class=\"mono\">${x.detailId??''}</td>\n`+
      `  <td>${x.type||''}</td>\n`+
      `  <td class=\"mono\">${x.value||''}</td>\n`+
      `  <td>${x.reason||''}</td>\n`+
      `  <td>${x.bannedBy||''}</td>\n`+
      `  <td>${fmtDate(x.bannedAt)}</td>\n`+
      `  <td>${x.expiresAt?fmtDate(x.expiresAt):''}</td>\n`+
      `</tr>`;
  }

  function groupByDetailId(items){
    const map = new Map();
    for(const x of items){
      const id = x.detailId;
      const k = groupKey(id);
      if(!k) continue;
      const g = map.get(k) || { detailId: id, entries: [], meta: { count:0 } };
      g.entries.push(x);
      g.meta.count++;
      // метаданные detail повторяются в каждой записи — берём первое нормальное
      g.meta.reason = g.meta.reason || x.reason || '';
      g.meta.bannedBy = g.meta.bannedBy || x.bannedBy || '';
      g.meta.bannedAt = g.meta.bannedAt || x.bannedAt || null;
      g.meta.expiresAt = g.meta.expiresAt || x.expiresAt || null;
      map.set(k, g);
    }
    return Array.from(map.values()).sort((a,b)=> (b.meta.bannedAt||0) - (a.meta.bannedAt||0));
  }

  async function renderList(initial, arr){
    const tb = $('banTbody');
    if(!tb) return;

    if(initial) tb.innerHTML='';

    const groups = groupByDetailId(arr);
    const html = [];
    for(const g of groups){
      ensureExpanded(g.detailId);
      html.push(renderGroupHeader(g.detailId, { ...g.meta, summary: `${g.meta.count} записей` }));
      const open = state.expanded.has(groupKey(g.detailId));
      if(open){
        for(const it of g.entries){
          html.push(renderEntryRow(it));
        }
      }
    }
    tb.insertAdjacentHTML('beforeend', html.join(''));

    bindGroupToggles();
  }

  async function rerenderFromCache(){
    const tb = $('banTbody');
    if(!tb) return;
    if(!Array.isArray(state.lastItems)) return;
    await renderList(true, state.lastItems.slice().reverse());
  }

  function bindGroupToggles(){
    const tb = $('banTbody');
    if(!tb) return;
    tb.querySelectorAll('tr.ban-detail-header').forEach(tr=>{
      if(tr.__bound) return;
      tr.__bound = true;
      tr.addEventListener('click', async (e)=>{
        e.stopPropagation();
        // если вдруг клик был не ЛКМ — игнор
        if(e.button !== undefined && e.button !== 0) return;
        const id = tr.getAttribute('data-detail-group');
        toggleExpanded(id);
        await rerenderFromCache();
      });
      // ПКМ по заголовку НЕ должен открывать контекстное меню таблицы
      tr.addEventListener('contextmenu', (e)=>{
        e.preventDefault();
        e.stopPropagation();
      });
    });
  }

  function digestList(list){
    // Дешёвый детерминированный отпечаток: сравниваем первые N элементов.
    // Этого достаточно, чтобы не мигал тост при одинаковых данных.
    const arr = Array.isArray(list) ? list : [];
    const N = Math.min(60, arr.length);
    let s = String(arr.length);
    for(let i=0;i<N;i++){
      const x = arr[i] || {};
      s += `|${x.detailId ?? ''},${x.type ?? ''},${x.value ?? ''},${x.entryId ?? ''},${x.bannedAt ?? ''},${x.expiresAt ?? ''}`;
    }
    return s;
  }

  async function fetchBansList(){
    const params = { limit:state.limit, offset:state.offset };
    if(state.type) params.type = state.type;
    if(state.valueLike) params.value = state.valueLike;
    if(state.reasonLike) params.reason = state.reasonLike;
    if(state.byLike) params.bannedBy = state.byLike;
    if(state.activeOnly) params.active = '1';

    const r = await api.get('/bans/list', params);
    return r;
  }

  async function loadPage(initial){
    if(state.loading||state.end) return 0;
    state.loading=true;

    const sc = $('banScroll');
    const tb = $('banTbody');
    if(initial && tb && tb.children.length===0){ tb.innerHTML = '<tr><td colspan="7" class="muted">Загрузка…</td></tr>'; }

    const prevDigest = state.lastDigest;

    try{
      const r = await fetchBansList();
      if(!r.ok){
        if(tb){
          const msg = r.status===401? 'Не авторизовано. Проверьте логин/пароль во вкладке Настройки.' : (r.status===0? 'Сетевая ошибка. Проверьте base URL во вкладке Настройки.' : `Ошибка загрузки (${r.status})`);
          tb.innerHTML = `<tr><td colspan="7" class="muted">${msg}</td></tr>`;
        }
        state.end=true;
        return 0;
      }

      const arr = Array.isArray(r.data)? r.data: [];
      const newDigest = digestList(arr);
      state.lastItems = arr;
      state.lastDigest = newDigest;
      state.lastFetchAt = Date.now();

      if(arr.length===0){
        if(initial && tb) tb.innerHTML = '<tr><td colspan="7" class="muted">Нет данных</td></tr>';
        state.end=true;
        return 0;
      }

      await renderList(initial, arr.slice().reverse());

      if(!initial && prevDigest != null && prevDigest !== newDigest){
        toast('Баны: обновлено','ok');
      }

      if(initial && !state.initialLoaded){
        await new Promise(rf=>requestAnimationFrame(rf));
        if(sc) sc.scrollTop = sc.scrollHeight;
        state.initialLoaded=true;
      }

      state.offset += arr.length;
      if(arr.length < state.limit) state.end=true;
      return arr.length;
    } finally {
      state.loading=false;
    }
  }

  async function ensureScrollable(){
    const sc = $('banScroll');
    for(let i=0;i<10;i++){
      if(state.end) break;
      await new Promise(r=>requestAnimationFrame(r));
      if(sc && sc.scrollHeight > sc.clientHeight + 8) break;
      const n = await loadPage(false);
      if(!n) break;
    }
  }

  function resetAndLoad(){
    if(!ensureAuth()) return;
    state.offset=0; state.end=false; state.loading=false; state.initialLoaded=false; state.newestDetailId=null;
    const tb=$('banTbody'); if(tb) tb.innerHTML='';
    loadPage(true);
    setTimeout(ensureScrollable, 60);
  }

  async function pullNew(){
    if(!ensureAuth()) return;
    const hasFilters = !!(state.type || state.valueLike || state.reasonLike || state.byLike || state.activeOnly);
    if(hasFilters) return;

    // Не спамим сетью слишком часто, если юзер много кликает по UI и poller совпадает.
    const now = Date.now();
    if(state.lastFetchAt && (now - state.lastFetchAt) < 1500) return;

    const r = await api.get('/bans/list', { limit: state.limit, offset: 0 });
    if(!r.ok) return;

    const arr = Array.isArray(r.data) ? r.data : [];
    const dig = digestList(arr);

    // Первый раз просто фиксируем отпечаток (без тоста)
    if(state.lastDigest == null){
      state.lastDigest = dig;
      state.lastItems = arr;
      state.lastFetchAt = now;
      await rerenderFromCache();
      return;
    }

    if(dig !== state.lastDigest){
      state.lastDigest = dig;
      state.lastItems = arr;
      state.lastFetchAt = now;
      await rerenderFromCache();
      toast('Баны: обновлено','ok');
    } else {
      // данные те же — не трогаем DOM и не показываем тост
      state.lastFetchAt = now;
    }
  }

  // Filters
  on($('banType'),'change', ()=>{ state.type = $('banType').value; resetAndLoad(); });
  on($('banLimit'),'change', ()=>{ state.limit = Number($('banLimit').value)||20; resetAndLoad(); });
  on($('banActiveOnly'),'change', ()=>{ state.activeOnly = !!$('banActiveOnly').checked; resetAndLoad(); });

  let deb;
  const debounce = (fn)=>{ clearTimeout(deb); deb = setTimeout(fn, 350); };
  on($('banFilterValue'),'input', ()=>debounce(()=>{ state.valueLike = ($('banFilterValue').value||'').trim(); resetAndLoad(); }));
  on($('banFilterReason'),'input', ()=>debounce(()=>{ state.reasonLike = ($('banFilterReason').value||'').trim(); resetAndLoad(); }));
  on($('banFilterBy'),'input', ()=>debounce(()=>{ state.byLike = ($('banFilterBy').value||'').trim(); resetAndLoad(); }));

  on($('banRefresh'),'click', resetAndLoad);
  on($('banScroll'),'scroll', ()=>{ const sc=$('banScroll'); if(sc && sc.scrollTop<=30) loadPage(false); });

  // Add ban
  function computeExpiresAt(){
    const preset = $('addExpirePreset')?.value;
    const expIsoEl = $('addExpIso');
    const now = Date.now();
    switch(preset){
      case 'WEEK': return now + 7*24*3600*1000;
      case 'MONTH': return now + 30*24*3600*1000;
      case 'YEAR': return now + 365*24*3600*1000;
      case 'CUSTOM':{
        const iso = expIsoEl?.value;
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

  function validate(type, value){
    switch(type){
      case 'IP': return isIpv4(value) ? null : 'Неверный IPv4 адрес';
      case 'SUBNET': return isValidSubnet(value) ? null : 'Ожидается подсеть в формате 1.2.3.0/24';
      case 'ASN': return normAsn(value) ? null : 'ASN должен быть числом или в формате AS12345';
      case 'USERNAME':
      default: return isValidUsername(value) ? null : 'Укажите корректный username (без пробелов)';
    }
  }

  function applyPresetState(){
    const v = $('addExpirePreset')?.value;
    const custom = (v==='CUSTOM');
    if($('addExpIso')){
      $('addExpIso').disabled = !custom;
      if(!custom) $('addExpIso').value='';
    }
  }

  on($('addExpirePreset'),'change', applyPresetState);
  applyPresetState();

  on($('btnAdd'),'click', async ()=>{
    if(!ensureAuth()) return;
    const type = $('addType')?.value || 'IP';
    let value = ($('addValue')?.value || '').trim();
    const reason = ($('addReason')?.value || '').trim();

    if(type==='ASN'){
      const n = normAsn(value);
      if(!n){ setStatus($('addStatus'),'ASN должен быть числом или AS12345', false); return; }
      value = n;
    }

    const err = validate(type, value);
    if(err){ setStatus($('addStatus'), err, false); return; }

    const exp = computeExpiresAt();
    if(typeof exp === 'string'){
      const code = exp.split(':')[1];
      const msg = code==='date_required'? 'Укажите дату истечения' : code==='bad_date'? 'Некорректная дата' : 'Дата в прошлом';
      setStatus($('addStatus'), msg, false);
      return;
    }

    setStatus($('addStatus'),'Отправка…');
    const body = { type, value, reason };
    if(exp !== undefined) body.expiresAt = exp;

    const r = await api.post('/bans/add', body);
    setStatus($('addStatus'), r.ok? 'Добавлено' : `Ошибка (${r.status})`, r.ok);
    if(r.ok){
      if($('addValue')) $('addValue').value='';
      if($('addReason')) $('addReason').value='';
      if($('addExpirePreset')) $('addExpirePreset').value='NONE';
      if($('addExpIso')){ $('addExpIso').value=''; $('addExpIso').disabled=true; }
      resetAndLoad();
    }
  });

  // Check
  on($('btnChkIp'),'click', async ()=>{
    if(!ensureAuth()) return;
    const ip = ($('chkIp')?.value || '').trim();
    const r = await api.get('/bans/check', { ip });
    if($('chkOut')) $('chkOut').textContent = JSON.stringify(r.data, null, 2);
  });
  on($('btnChkUser'),'click', async ()=>{
    if(!ensureAuth()) return;
    const username = ($('chkUser')?.value || '').trim();
    const r = await api.get('/bans/check', { username });
    if($('chkOut')) $('chkOut').textContent = JSON.stringify(r.data, null, 2);
  });
  on($('btnChkAsn'),'click', async ()=>{
    if(!ensureAuth()) return;
    const asn = ($('chkAsn')?.value || '').trim();
    const r = await api.get('/bans/check', { asn });
    if($('chkOut')) $('chkOut').textContent = JSON.stringify(r.data, null, 2);
  });

  // Context menu
  ctxMenu.attachRowContextMenu($('banTbody'), (tr)=>{
    const detailId = tr.getAttribute('data-detail-id');
    const type = tr.getAttribute('data-type');
    const entryId = tr.getAttribute('data-entry-id');
    const items = [];

    if(detailId){
      items.push({ label:`Удалить бан (detailId ${detailId})`, onClick: async ()=>{
        const r = await api.del('/bans/by-detail', { detailId });
        if(r.ok){ toast('Бан удалён','ok'); resetAndLoad(); } else { toast('Ошибка удаления ('+r.status+')','err'); }
      }});
    }

    if(type && entryId){
      items.push({ label:`Удалить бан (type ${type} + entryId ${entryId})`, onClick: async ()=>{
        const r = await api.del('/bans/by-type', { type, entryId });
        if(r.ok){ toast('Бан удалён','ok'); resetAndLoad(); } else { toast('Ошибка удаления ('+r.status+')','err'); }
      }});
    }

    items.push({ type:'sep' });
    if(tr.children && tr.children[2]){
      const v = (tr.children[2].textContent||'').trim();
      if(v){
        items.push({ label:'Скопировать значение', onClick: async ()=>{
          try{ await navigator.clipboard.writeText(v); toast('Скопировано','ok'); }
          catch(_){ toast('Не удалось скопировать','err'); }
        }});
      }
    }

    return items;
  });

  return { resetAndLoad, pullNew };
}

