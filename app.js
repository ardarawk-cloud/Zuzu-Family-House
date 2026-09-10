const IDR = new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0});
const DEFAULT_SETTINGS={nightlyRate:3500000,serviceRate:.05,taxRate:0};
const $=(s)=>document.querySelector(s);

function safeParse(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}}
function getSettings(){return safeParse('zuzu_settings',DEFAULT_SETTINGS)}
function nightsBetween(a,b){if(!a||!b)return 0;const d1=new Date(a+'T00:00:00'),d2=new Date(b+'T00:00:00');return Math.max(0,Math.round((d2-d1)/86400000))}
function fmtDate(v){if(!v)return '';return new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric'}).format(new Date(v+'T00:00:00'))}
function updateDatePlaceholders(){[['#checkin'],['#checkout']].forEach(([input])=>{const el=$(input);el?.closest('.date-input-wrap')?.classList.toggle('has-value',Boolean(el.value))})}
function updateSummary(){
  const ci=$('#checkin')?.value||'',co=$('#checkout')?.value||'',guests=Number($('#guests')?.value||2),s=getSettings();
  const nights=nightsBetween(ci,co),subtotal=nights*s.nightlyRate,service=subtotal*s.serviceRate,tax=(subtotal+service)*s.taxRate,total=subtotal+service+tax;
  const values={sumNights:nights?`${nights} night${nights===1?'':'s'}`:'—',sumGuests:`${guests} guest${guests===1?'':'s'}`,sumSubtotal:IDR.format(subtotal),sumService:IDR.format(service),sumTax:IDR.format(tax),sumTotal:IDR.format(total)};
  Object.entries(values).forEach(([id,v])=>{const e=document.getElementById(id);if(e)e.textContent=v});
  const stay=$('#selectedStay');if(stay){const strong=stay.querySelector('strong');if(strong)strong.textContent=ci&&co&&nights?`${fmtDate(ci)} — ${fmtDate(co)} · ${guests} guest${guests===1?'':'s'}`:'Select arrival and departure above'}
  updateDatePlaceholders();
  return {ci,co,guests,nights,subtotal,service,tax,total};
}
function setDateLimits(){const today=new Date();today.setHours(0,0,0,0);const min=`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;$('#checkin')?.setAttribute('min',min);$('#checkout')?.setAttribute('min',min)}
function syncCheckoutMin(){const ci=$('#checkin')?.value;if(!ci)return;const next=new Date(ci+'T00:00:00');next.setDate(next.getDate()+1);const v=`${next.getFullYear()}-${String(next.getMonth()+1).padStart(2,'0')}-${String(next.getDate()).padStart(2,'0')}`;$('#checkout')?.setAttribute('min',v);if($('#checkout')?.value&&$('#checkout').value<v)$('#checkout').value=''}
function saveBooking(e){
  e.preventDefault();const x=updateSummary(),notice=$('#bookingNotice'),success=$('#bookingSuccess');
  if(x.nights<1){notice.textContent='Please select a departure date after your arrival date.';notice.classList.add('show');success.classList.remove('show');return}
  notice.classList.remove('show');const f=new FormData(e.target),q=new URLSearchParams(location.search);
  const booking={id:'ZUZU-'+Date.now().toString().slice(-7),createdAt:new Date().toISOString(),name:String(f.get('name')||'').trim(),email:String(f.get('email')||'').trim(),phone:String(f.get('phone')||'').trim(),notes:String(f.get('notes')||'').trim(),checkin:x.ci,checkout:x.co,guests:x.guests,nights:x.nights,subtotal:x.subtotal,service:x.service,tax:x.tax,total:x.total,status:'Pending',source:q.get('utm_source')||'Direct',campaign:q.get('utm_campaign')||''};
  const list=safeParse('zuzu_reservations',[]);list.unshift(booking);localStorage.setItem('zuzu_reservations',JSON.stringify(list));
  success.innerHTML=`Reservation request created.<br><strong>Reference ${booking.id}</strong>`;success.classList.add('show');e.target.reset();success.scrollIntoView({behavior:'smooth',block:'nearest'});
}
function setupMenu(){const btn=$('#menuToggle'),menu=$('#mobileMenu');if(!btn||!menu)return;btn.addEventListener('click',()=>{const open=menu.classList.toggle('open');btn.classList.toggle('open',open);btn.setAttribute('aria-expanded',String(open))});menu.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{menu.classList.remove('open');btn.classList.remove('open');btn.setAttribute('aria-expanded','false')}))}
function setupMobileReserve(){
  const cta=$('#mobileReserve'),hero=$('#home'),book=$('#book'),footer=$('#siteFooter');if(!cta||!hero||!book||!footer)return;
  let heroVisible=true,bookVisible=false,footerVisible=false;
  const refresh=()=>cta.classList.toggle('visible',!heroVisible&&!bookVisible&&!footerVisible);
  const observer=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.target===hero)heroVisible=entry.isIntersecting;if(entry.target===book)bookVisible=entry.isIntersecting;if(entry.target===footer)footerVisible=entry.isIntersecting});refresh()},{threshold:.08});
  [hero,book,footer].forEach(el=>observer.observe(el));
}
function setupFaq(){document.querySelectorAll('.faq details').forEach(d=>d.addEventListener('toggle',()=>{if(!d.open)return;document.querySelectorAll('.faq details').forEach(other=>{if(other!==d)other.open=false})}))}

document.addEventListener('DOMContentLoaded',()=>{
  setDateLimits();setupMenu();setupMobileReserve();setupFaq();
  const year=document.getElementById('year');if(year)year.textContent=new Date().getFullYear();
  ['checkin','checkout','guests'].forEach(id=>document.getElementById(id)?.addEventListener('change',()=>{if(id==='checkin')syncCheckoutMin();updateSummary()}));
  $('#checkAvailability')?.addEventListener('click',()=>{const x=updateSummary();if(x.nights<1){const notice=$('#bookingNotice');notice.textContent='Select your arrival and departure dates first.';notice.classList.add('show')}document.getElementById('book')?.scrollIntoView({behavior:'smooth'})});
  $('#bookingForm')?.addEventListener('submit',saveBooking);updateSummary();
});
