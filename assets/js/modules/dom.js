export const $ = (id) => document.getElementById(id);

export function on(el, event, handler, options){
  if(!el) return;
  el.addEventListener(event, handler, options);
}

export function qs(sel, root=document){
  return root.querySelector(sel);
}

export function qsa(sel, root=document){
  return Array.from(root.querySelectorAll(sel));
}

export function escapeHtml(s){
  return String(s)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/\"/g,'&quot;')
    .replace(/'/g,'&#39;');
}
