const IDR = new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0});
const DEFAULT_RATE = 3500000;
const DEFAULT_SERVICE = 0.05;
const DEFAULT_TAX = 0;

function nightsBetween(a,b){
  if(!a||!b)return 0;
  const d1=new Date(a+'T00:00:00');
  const d2=new Date(b+'T00:00:00');
  return Math.max(0,Math.round((d2-d1)/86400000));
}
function isoDate(d){return d.toISOString().slice(0,10)}
function getSettings(){
  return JSON.parse(localStorage.getItem('zuzu_settings')||'null')||
    {nightlyRate:DEFAULT_RATE,serviceRate:DEFAULT_SERVICE,taxRate:DEFAULT_TAX};
}
function updateDateUI(){
  ['checkin','checkout'].forEach(id=>{
    const input=document.getElementById(id);
    const wrap=input?.closest('.date-input-wrap');
    if(wrap)wrap.classList.toggle('has-value',Boolean(input.value));
  });
}
function updateSummary(){
  const ci=document.querySelector('#checkin')?.value;
  const co=document.querySelector('#checkout')?.value;
  const guests=Number(document.querySelector('#guests')?.value||2);
  const s=getSettings();
  const nights=nightsBetween(ci,co);
  const subtotal=nights*s.nightlyRate;
  const service=subtotal*s.serviceRate;
  const tax=(subtotal+service)*s.taxRate;
  const total=subtotal+service+tax;
  const set=(id,val)=>{const e=document.querySelector(id);if(e)e.textContent=val};
  set('#sumNights',nights?`${nights} night${nights>1?'s':''}`:'—');
  set('#sumGuests',`${guests} guest${guests>1?'s':''}`);
  set('#sumSubtotal',IDR.format(subtotal));
  set('#sumService',IDR.format(service));
  set('#sumTax',IDR.format(tax));
  set('#sumTotal',IDR.format(total));
  updateDateUI();
  return {nights,subtotal,service,tax,total,guests,ci,co};
}
function seedReservations(){
  if(!localStorage.getItem('zuzu_reservations'))localStorage.setItem('zuzu_reservations','[]');
}
function submitBooking(e){
  e.preventDefault();
  const x=updateSummary();
  const notice=document.querySelector('#bookingNotice');
  const success=document.querySelector('#bookingSuccess');
  if(x.nights<1){
    notice.textContent='Please select a check-in date and a check-out date after it.';
    notice.classList.add('show');
    success.classList.remove('show');
    return;
  }
  notice.classList.remove('show');
  seedReservations();
  const form=new FormData(e.target);
  const qs=new URLSearchParams(location.search);
  const booking={
    id:'ZUZU-'+Date.now().toString().slice(-7),
    createdAt:new Date().toISOString(),
    name:form.get('name'),
    email:form.get('email'),
    phone:form.get('phone'),
    notes:form.get('notes')||'',
    checkin:x.ci,
    checkout:x.co,
    guests:x.guests,
    nights:x.nights,
    subtotal:x.subtotal,
    service:x.service,
    tax:x.tax,
    total:x.total,
    status:'Pending',
    source:qs.get('utm_source')||'Direct',
    campaign:qs.get('utm_campaign')||''
  };
  const list=JSON.parse(localStorage.getItem('zuzu_reservations')||'[]');
  list.unshift(booking);
  localStorage.setItem('zuzu_reservations',JSON.stringify(list));
  success.innerHTML=`Stay request saved. Your reference is <strong>${booking.id}</strong>. ZUZU can use this reference when confirming availability.`;
  success.classList.add('show');
  e.target.reset();
}
function initDates(){
  const today=new Date();
  today.setMinutes(today.getMinutes()-today.getTimezoneOffset());
  const min=isoDate(today);
  const ci=document.getElementById('checkin');
  const co=document.getElementById('checkout');
  if(ci)ci.min=min;
  if(co)co.min=min;
  ci?.addEventListener('change',()=>{
    if(co){
      co.min=ci.value||min;
      if(co.value && co.value<=ci.value)co.value='';
    }
    updateSummary();
  });
  co?.addEventListener('change',updateSummary);
}
function initMenu(){
  const toggle=document.getElementById('menuToggle');
  const menu=document.getElementById('mobileMenu');
  if(!toggle||!menu)return;
  toggle.addEventListener('click',()=>{
    const open=menu.classList.toggle('open');
    toggle.setAttribute('aria-expanded',String(open));
    toggle.textContent=open?'×':'☰';
  });
  menu.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{
    menu.classList.remove('open');
    toggle.setAttribute('aria-expanded','false');
    toggle.textContent='☰';
  }));
}
function initAvailability(){
  document.getElementById('guests')?.addEventListener('change',updateSummary);
  document.getElementById('checkAvailability')?.addEventListener('click',()=>{
    const x=updateSummary();
    const notice=document.getElementById('bookingNotice');
    if(x.nights<1){
      document.getElementById('checkin')?.focus();
      return;
    }
    notice?.classList.remove('show');
    document.getElementById('book')?.scrollIntoView({behavior:'smooth'});
  });
}
document.addEventListener('DOMContentLoaded',()=>{
  seedReservations();
  initDates();
  initMenu();
  initAvailability();
  document.querySelector('#bookingForm')?.addEventListener('submit',submitBooking);
  updateSummary();
});