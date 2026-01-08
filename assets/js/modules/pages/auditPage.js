import { $, on, escapeHtml } from '../dom.js';
import { fmtDate, ipFromNum, isIpv4, countryFlagEmoji } from '../format.js';
import { toast } from '../ui.js';
import { promptBanOptions } from '../overlay.js';

export function initAuditPage({ api, ensureAuth, ctxMenu, onChangePass, resolveAuditMeta, setAuditMeta }){
  const state = { q:'', limit: Number(($('audLimit')&&$('audLimit').value)||20), offset:0, loading:false, end:false, initialLoaded:false, newestId:null };

  function rowClass(code){
    switch(code){
      case 'CREATED_ACCOUNT': return 'row-created';
      case 'FAILED': return 'row-failed';
      case 'JOINED_WITH_PASSWORD':
      case 'JOINED_WITHOUT_PASSWORD': return 'row-joined';
      default: return '';
    }
  }

  function renderChecksCell(){
    // два индикатора: IPHub и ASN-list
    // начальное состояние: «…»
    return `<span class="checks" title="Проверки: IPHub / ASN">
      <span class="chk" data-chk="iphub" title="IPHub">…</span>
      <span class="chk" data-chk="asn" title="ASN (hosting/vpn) | datamining">…</span>
    </span>`;
  }

  function setCheck(tr, key, value, title){
    const el = tr.querySelector(`[data-chk="${key}"]`);
    if(!el) return;
    el.classList.remove('ok','bad','unk');
    if(value === true){ el.textContent = '✓'; el.classList.add('ok'); }
    else if(value === false){ el.textContent = '✗'; el.classList.add('bad'); }
    else { el.textContent = '…'; el.classList.add('unk'); }
    if(title) el.title = title;
  }

  function applyChecks(tr, checks){
    if(!checks){
      setCheck(tr,'iphub', null, 'IPHub: нет данных');
      setCheck(tr,'asn', null, 'ASN: нет данных');
      return;
    }
    // iphubOk: true если safe, false если non-residential, null если не удалось
    const iphubOk = (typeof checks.iphubOk === 'boolean') ? checks.iphubOk : null;
    const iphubTitle = checks.iphubBlock ? `IPHub: ${checks.iphubBlock} (${checks.iphubBlockCode ?? '—'})` : 'IPHub: нет данных';
    setCheck(tr,'iphub', iphubOk, iphubTitle);

    // asnOk: true если ASN не в списках vpn/hosting и asn>0
    const asnOk = (typeof checks.asnOk === 'boolean') ? checks.asnOk : null;
    const asnTitle = (checks.badAsn===true) ? `ASN запрещён: hosting=${!!checks.asnHosting}, vpn=${!!checks.asnVpn}` : 'ASN: ок';
    setCheck(tr,'asn', asnOk, asnTitle);
  }

  function renderRow(x){
    const cls = rowClass(x.joincode);
    const uname = x.username ?? '';
    const ip = ipFromNum(x.ipNum);
    return `<tr class="${cls}" data-username="${escapeHtml(uname)}" data-id="${x.id??''}" data-ip="${escapeHtml(ip)}">\n`+
      `  <td class="center">${renderChecksCell()}</td>\n`+
      `  <td>${uname}</td>\n`+
      `  <td class="mono">${ip}</td>\n`+
      `  <td class="muted" data-col="country">—</td>\n`+
      `  <td class="mono" data-col="asn">—</td>\n`+
      `  <td>${fmtDate(x.createdAt)}</td>\n`+
      `</tr>`;
  }

  async function hydrateMetaForVisibleRows({ retryErr=false } = {}){
    const tb = $('audTbody');
    if(!tb) return;
    const rows = Array.from(tb.querySelectorAll('tr[data-ip]'));

    for(const tr of rows){
      const ip = tr.getAttribute('data-ip') || '';
      const username = tr.getAttribute('data-username') || '';
      if(!ip) continue;

      const metaState = tr.getAttribute('data-meta');
      if(metaState === 'loading') continue;
      if(metaState === 'ok') continue;
      if(metaState === 'err' && !retryErr) continue;

      const cEl = tr.querySelector('[data-col="country"]');
      const aEl = tr.querySelector('[data-col="asn"]');

      const cached = resolveAuditMeta ? resolveAuditMeta({ username, ip }) : null;
      if(cached){
        const cc = cached.countryCode || '';
        const asnNum = Number(cached.asn);
        if(cEl) cEl.textContent = cc ? `${countryFlagEmoji(cc)} ${cc}`.trim() : '—';
        if(aEl) aEl.textContent = (asnNum && asnNum > 0) ? ('AS'+String(asnNum).replace(/\D/g,'')) : '—';
        applyChecks(tr, cached.checks);

        const hasUseful = (cc && cc !== 'UNKNOWN') || (asnNum && asnNum > 0);
        tr.setAttribute('data-meta', hasUseful ? 'ok' : '');
        continue;
      }

      tr.setAttribute('data-meta','loading');

      const r = await api.get('/audit-meta/meta', { ip });
      if(r.ok && r.data){
        try{ setAuditMeta && setAuditMeta({ username, ip }, r.data); }catch(_){ /* ignore */ }
        const cc = (r.data.countryCode || '').trim();
        const asnNum = Number(r.data.asn);
        if(cEl) cEl.textContent = cc ? `${countryFlagEmoji(cc)} ${cc}`.trim() : '—';
        if(aEl) aEl.textContent = (asnNum && asnNum > 0) ? ('AS'+String(asnNum).replace(/\D/g,'')) : '—';
        applyChecks(tr, r.data.checks);

        const hasUseful = (cc && cc !== 'UNKNOWN') || (asnNum && asnNum > 0);
        tr.setAttribute('data-meta', hasUseful ? 'ok' : '');
      } else {
        tr.setAttribute('data-meta','err');
      }
    }
  }

  function scheduleHydrate(){
    // просим браузер сначала отрисовать вставленные строки
    requestAnimationFrame(()=>{
      hydrateMetaForVisibleRows();
      // повторная попытка для err строк, чтобы убрать «иногда остаются прочерки» при временных сетевых сбоях
      setTimeout(()=>hydrateMetaForVisibleRows({ retryErr:true }), 1200);
    });
  }

  async function loadPage(initial){
    if(state.loading || state.end) return 0;
    state.loading = true;

    const sc = $('audScroll');
    const tb = $('audTbody');
    if(initial && tb && tb.children.length===0){
      tb.innerHTML = '<tr><td colspan="6" class="muted">Загрузка…</td></tr>';
    }

    let ep='/audit', params={limit:state.limit, offset:state.offset};
    if(state.q){
      if(isIpv4(state.q)){ ep='/audit/ip'; params.ip=state.q; }
      else { ep='/audit/user'; params.username=state.q; }
    }

    try{
      const r = await api.get(ep, params);
      if(!r.ok){
        if(tb){
          const msg = r.status===401? 'Не авторизовано. Проверьте логин/пароль во вкладке Настройки.' : (r.status===0? 'Сетевая ошибка. Проверьте base URL во вкладке Настройки.' : `Ошибка загрузки (${r.status})`);
          tb.innerHTML = `<tr><td colspan="6" class="muted">${msg}</td></tr>`;
        }
        state.end=true;
        return 0;
      }

      const arr = Array.isArray(r.data) ? r.data : [];
      if(initial && tb) tb.innerHTML='';
      if(arr.length===0){
        if(initial && tb) tb.innerHTML = '<tr><td colspan="6" class="muted">Нет данных</td></tr>';
        state.end=true;
        return 0;
      }

      const rows = arr.slice().reverse();
      if(initial && !state.initialLoaded){
        tb?.insertAdjacentHTML('beforeend', rows.map(renderRow).join(''));
        state.newestId = rows.length ? (rows[rows.length-1].id ?? state.newestId) : state.newestId;
        await new Promise(rf=>requestAnimationFrame(rf));
        if(sc) sc.scrollTop = sc.scrollHeight;
        state.initialLoaded=true;
      } else {
        const prev = sc? sc.scrollHeight:0;
        tb?.insertAdjacentHTML('afterbegin', rows.map(renderRow).join(''));
        const next = sc? sc.scrollHeight:0;
        if(sc) sc.scrollTop += (next - prev);
      }

      state.offset += arr.length;
      if(arr.length < state.limit) state.end = true;
      return arr.length;
    } finally {
      state.loading=false;
    }
  }

  async function ensureScrollable(){
    const sc = $('audScroll');
    for(let i=0;i<10;i++){
      if(state.end) break;
      await new Promise(r=>requestAnimationFrame(r));
      if(sc && sc.scrollHeight > sc.clientHeight + 8) break;
      const n = await loadPage(false);
      if(!n) break;
      scheduleHydrate();
    }
  }

  function resetAndLoad(){
    if(!ensureAuth()) return;
    state.offset=0; state.end=false; state.loading=false; state.initialLoaded=false; state.newestId=null;
    const tb=$('audTbody'); if(tb) tb.innerHTML='';
    loadPage(true).then(()=>{ scheduleHydrate(); });
    setTimeout(ensureScrollable, 60);
  }

  async function pullNew(){
    if(!ensureAuth()) return;
    if(state.q) return;

    const sc = $('audScroll');
    const tb = $('audTbody');
    if(!tb) return;

    const prevTop = sc ? sc.scrollTop : 0;
    const nearBottom = sc ? (sc.scrollHeight - (sc.scrollTop + sc.clientHeight) < 50) : true;

    let totalAdded = 0;
    let offset = 0;
    while(offset < 1000){
      const r = await api.get('/audit', { limit:50, offset });
      if(!r.ok) return;
      const arr = Array.isArray(r.data)? r.data: [];
      if(arr.length===0) break;
      const rows = arr.slice().reverse();

      if(state.newestId == null){
        state.newestId = rows.length ? (rows[rows.length-1].id ?? null) : null;
        break;
      }

      const stopIdx = rows.findIndex(x => (x.id ?? null) === state.newestId);
      const slice = stopIdx >= 0 ? rows.slice(stopIdx + 1) : rows;
      if(slice.length){
        tb.insertAdjacentHTML('beforeend', slice.map(renderRow).join(''));
        totalAdded += slice.length;
      }
      if(stopIdx >= 0) break;

      offset += arr.length;
      if(arr.length < 50) break;
    }

    if(totalAdded){
      const last = tb.lastElementChild;
      if(last?.getAttribute) state.newestId = Number(last.getAttribute('data-id')) || state.newestId;
      if(sc){
        sc.scrollTop = nearBottom ? sc.scrollHeight : prevTop;
      }
      $('audHint') && ($('audHint').textContent = `Добавлено новых: ${totalAdded}`);
      toast(`Аудит: +${totalAdded}`,'ok');
      scheduleHydrate();
    }
  }

  async function banWithOptions({ type, value, title }){
    const opts = await promptBanOptions({ title });
    if(!opts) return;
    const body = { type, value };
    if(opts.reason) body.reason = opts.reason;
    if(opts.expiresAt !== undefined) body.expiresAt = opts.expiresAt;
    const r = await api.post('/bans/add', body);
    if(r.ok) toast('Бан добавлен','ok');
    else toast('Ошибка бана ('+r.status+')','err');
  }

  async function banComboUsernameIp(username, ip){
    const opts = await promptBanOptions({ title: `Комбо-бан USERNAME + IP для “${username}” (${ip})` });
    if(!opts) return;

    const body = {
      reason: opts.reason || null,
      expiresAt: opts.expiresAt !== undefined ? opts.expiresAt : null,
      entries: [
        { type: 'USERNAME', value: username },
        { type: 'IP', value: ip }
      ]
    };

    // убираем null-поля, чтобы не шуметь
    if(body.reason == null) delete body.reason;
    if(body.expiresAt == null) delete body.expiresAt;

    const r = await api.post('/bans/add-combo', body);
    if(r.ok) toast(`Комбо-бан добавлен (detailId ${r.data?.detailId ?? '—'})`,'ok');
    else toast('Комбо-бан: ошибка ('+r.status+')','err');
  }

  // UI bindings
  on($('audLimit'),'change', ()=>{ state.limit = Number($('audLimit').value)||20; resetAndLoad(); });

  let deb;
  on($('audSearch'),'input', ()=>{
    clearTimeout(deb);
    deb = setTimeout(()=>{
      state.q = ($('audSearch').value||'').trim();
      resetAndLoad();
    }, 400);
  });

  on($('audRefresh'),'click', resetAndLoad);

  on($('audScroll'),'scroll', ()=>{
    const sc = $('audScroll');
    if(sc && sc.scrollTop <= 30){
      loadPage(false).then(()=> scheduleHydrate());
    }
  });

  // Context menu
  ctxMenu.attachRowContextMenu($('audTbody'), (tr)=>{
    const username = tr.getAttribute('data-username') || (tr.children[1] && tr.children[1].textContent) || '';
    const ip = tr.getAttribute('data-ip') || '';

    const meta = resolveAuditMeta ? resolveAuditMeta({ username, ip }) : null;
    const asn = meta && meta.asn ? String(meta.asn) : '';
    const country = meta && meta.countryCode ? String(meta.countryCode) : '';

    const items = [];

    if(username){
      items.push({ label:`Забанить username… (${username})`, onClick: ()=>banWithOptions({ type:'USERNAME', value: username, title:`Бан USERNAME для “${username}”` }) });
    }
    if(ip){
      const suffix = country ? ` (${ip}, ${country})` : ` (${ip})`;
      items.push({ label:`Забанить IP…${suffix}`, onClick: ()=>banWithOptions({ type:'IP', value: ip, title:`Бан IP ${ip}` }) });
    }

    if(ip){
      if(asn){
        const asnValue = String(asn).replace(/^AS/i,'').replace(/\D/g,'');
        items.push({ label:`Забанить ASN… (AS${asnValue})`, onClick: ()=>banWithOptions({ type:'ASN', value: 'AS'+asnValue, title:`Бан ASN AS${asnValue}` }) });
      } else {
        items.push({ label:'Забанить ASN… (получить по IP)', onClick: async ()=>{
          if(!ensureAuth()) return;
          const r = await api.get('/audit-meta/meta', { ip });
          if(r.ok && r.data){
            try{ setAuditMeta && setAuditMeta({ username, ip }, r.data); }catch(_){ /* ignore */ }
            const asnNum = r.data.asn;
            if(!asnNum || Number(asnNum) <= 0){ toast('ASN не найден','err'); return; }
            const asnValue = String(asnNum).replace(/\D/g,'');
            await banWithOptions({ type:'ASN', value: 'AS'+asnValue, title:`Бан ASN AS${asnValue}` });
          } else {
            toast('Не удалось получить ASN','err');
          }
        }});
      }
    }

    if(username && ip){
      items.push({ type:'sep' });
      items.push({ label:'Комбо-бан username + IP…', onClick: ()=>banComboUsernameIp(username, ip) });
    }

    if(username){
      items.push({ type:'sep' });
      items.push({ label: 'Сменить пароль…', onClick: ()=> onChangePass(username) });
    }

    return items;
  });

  return { resetAndLoad, pullNew };
}
