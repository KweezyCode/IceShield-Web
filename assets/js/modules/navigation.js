import { qsa } from './dom.js';

export function setActiveTabButtons(id){
  qsa('.tab, .btab').forEach(x=>{
    const tgt = x.dataset && x.dataset.target;
    x.classList.toggle('active', tgt === id);
  });
}

export function activateSection(id){
  qsa('.section').forEach(x=>x.classList.remove('active'));
  const sec = document.getElementById(id);
  if(sec) sec.classList.add('active');
  setActiveTabButtons(id);
}

export function bindNav(onActivate){
  qsa('.tab, .btab').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const id = btn.dataset.target;
      onActivate(id);
    });
  });
}

