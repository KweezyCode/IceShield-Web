import { toast } from './ui.js';

const THEME_KEY = 'is.theme';

export function applyTheme(theme){
  const t = theme || 'auto';
  if(t === 'dark') document.documentElement.setAttribute('data-theme','dark');
  else if(t === 'light') document.documentElement.removeAttribute('data-theme');
  else {
    const mq = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
    if(mq && mq.matches) document.documentElement.setAttribute('data-theme','dark');
    else document.documentElement.removeAttribute('data-theme');
  }
}

export function initTheme(){
  const v = localStorage.getItem(THEME_KEY) || 'auto';
  applyTheme(v);
  const mq = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
  if(mq){
    mq.addEventListener?.('change', ()=>{
      const cur = localStorage.getItem(THEME_KEY) || 'auto';
      if(cur === 'auto') applyTheme('auto');
    });
  }
}

export function toggleTheme(){
  const cur = localStorage.getItem(THEME_KEY) || 'auto';
  const next = cur === 'auto' ? 'dark' : cur === 'dark' ? 'light' : 'auto';
  localStorage.setItem(THEME_KEY, next);
  applyTheme(next);
  toast(next==='auto' ? 'Тема: как в системе' : next==='dark' ? 'Тема: тёмная' : 'Тема: светлая','ok');
}

