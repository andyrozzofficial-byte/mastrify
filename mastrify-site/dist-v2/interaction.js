/* Event-driven touch feedback; no animation loop or layout reads per frame. */
(() => {
  'use strict';
  const selector='button,.button,.text-link,.file-label,summary,.style-option,.target-choice,.target-row label,.header nav a,.brand';
  let pressed=null, pointer=null, startX=0, startY=0;
  function clear(){pressed?.classList.remove('is-pressing');pressed=null;pointer=null;}
  document.addEventListener('pointerdown',event=>{
    if(!event.isPrimary||event.button!==0)return;
    const control=event.target.closest(selector);
    if(!control||control.matches(':disabled')||control.querySelector('input:disabled'))return;
    clear();pressed=control;pointer=event.pointerId;startX=event.clientX;startY=event.clientY;
    pressed.classList.add('is-pressing');
  },{passive:true});
  document.addEventListener('pointermove',event=>{
    if(event.pointerId===pointer&&Math.hypot(event.clientX-startX,event.clientY-startY)>12)clear();
  },{passive:true});
  for(const name of ['pointerup','pointercancel','dragstart'])document.addEventListener(name,clear,{passive:true});
  document.addEventListener('keydown',event=>{
    if((event.key===' '||event.key==='Enter')&&!event.repeat){const control=event.target.closest(selector);if(control&&!control.matches(':disabled')){clear();pressed=control;pressed.classList.add('is-pressing');}}
  });
  document.addEventListener('keyup',clear);
  document.addEventListener('contextmenu',event=>{if(event.target.closest(selector))event.preventDefault();});
  window.addEventListener('blur',clear);
  window.addEventListener('pagehide',clear);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)clear();});
})();
