import { updateApiBadge } from './ui.js';

export class ApiClient {
  constructor(getConfig){
    this.getConfig = getConfig;
  }

  hasAuth(){
    const c = this.getConfig();
    return !!(c && c.user && c.pass);
  }

  buildUrl(path){
    const p = path.startsWith('/') ? path : '/' + path;
    const c = this.getConfig();
    const base = (c.baseUrl || '').trim();
    if (/^https?:\/\//i.test(base)) return base.replace(/\/?$/, '') + p;
    if (window.location && /^https?:\/\//i.test(window.location.origin || '')) return window.location.origin + base.replace(/\/?$/, '') + p;
    return 'http://localhost:8080' + base.replace(/\/?$/, '') + p;
  }

  headers(){
    const c = this.getConfig();
    const h = { 'Content-Type':'application/json' };
    if(c.user || c.pass){
      h['Authorization'] = 'Basic ' + btoa(c.user + ':' + c.pass);
    }
    return h;
  }

  async request(method, path, params, body){
    if(!this.hasAuth() && method !== 'OPTIONS'){
      updateApiBadge('noauth');
      return { ok:false, status:401, data:{ error:'no_auth' } };
    }

    const urlObj = new URL(this.buildUrl(path));
    if(params){
      for(const [k,v] of Object.entries(params)){
        if(v!==undefined && v!==null && String(v).length){
          urlObj.searchParams.set(k, v);
        }
      }
    }

    try{
      const res = await fetch(urlObj.toString(), {
        method,
        headers: this.headers(),
        body: body ? JSON.stringify(body) : undefined
      });

      const text = await res.text();
      let data = text;
      try{ data = text ? JSON.parse(text) : null; }catch(_){ /* ignore */ }

      if(res.ok) updateApiBadge('ok');
      else if(res.status === 401) updateApiBadge('err', 401);
      else updateApiBadge('err', res.status);

      return { ok: res.ok, status: res.status, data };
    } catch(e){
      updateApiBadge('err', 'NET');
      return { ok:false, status:0, data:{ error:'network_error', message: (e && e.message) || 'network error' } };
    }
  }

  get(path, params){ return this.request('GET', path, params); }
  post(path, body){ return this.request('POST', path, null, body); }
  del(path, params){ return this.request('DELETE', path, params); }
}

