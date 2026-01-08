import { toast } from './ui.js';

export function createContextMenu(){
  let el;

  function ensure(){
    if(!el){
      el = document.createElement('div');
      el.className = 'ctx-menu';
      document.body.appendChild(el);
    }
    return el;
  }

  function hide(){
    if(!el) return;
    el.classList.remove('open');
    el.style.left='-9999px';
    el.innerHTML='';
  }

  function show(items, x, y){
    const menu = ensure();
    menu.innerHTML='';

    items.forEach((it, idx)=>{
      if(!it) return;
      if(it.type === 'sep'){
        const s=document.createElement('div');
        s.className='sep';
        menu.appendChild(s);
        return;
      }
      const b=document.createElement('button');
      b.textContent = it.label || ('Действие '+(idx+1));
      if(it.disabled) b.disabled=true;
      b.addEventListener('click', async ()=>{
        hide();
        try{ await it.onClick?.(); }catch(e){ console.error(e); toast('Ошибка действия','err'); }
      });
      menu.appendChild(b);
    });

    menu.classList.add('open');
    const pad = 6; const vw = window.innerWidth, vh = window.innerHeight;
    menu.style.left = x+'px'; menu.style.top = y+'px';
    requestAnimationFrame(()=>{
      const rect = menu.getBoundingClientRect();
      let nx = x, ny = y;
      if(rect.right > vw - pad) nx = Math.max(pad, vw - rect.width - pad);
      if(rect.bottom > vh - pad) ny = Math.max(pad, vh - rect.height - pad);
      menu.style.left = nx+'px'; menu.style.top = ny+'px';
    });
  }

  document.addEventListener('mousedown', (e)=>{
    if(el && el.classList.contains('open')){
      if(!el.contains(e.target)) hide();
    }
  });
  window.addEventListener('scroll', hide, true);
  window.addEventListener('resize', hide);
  document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') hide(); });

  function attachRowContextMenu(tbody, buildItems){
    if(!tbody) return;
    const handler = (e)=>{
      const tr = e.target && (e.target.closest ? e.target.closest('tr') : null);
      if(!tr) return;
      // только ПКМ
      e.preventDefault();
      const items = buildItems(tr) || [];
      show(items.length? items : [{ label:'Нет действий', onClick:()=>{}, disabled:true }], e.clientX, e.clientY);
    };
    tbody.addEventListener('contextmenu', handler);
  }

  return { show, hide, attachRowContextMenu };
}
