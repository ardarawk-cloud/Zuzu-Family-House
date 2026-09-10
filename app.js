const IDR = new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0});
const DEFAULT_RATE = 3500000;
const DEFAULT_SERVICE = 0.05;
const DEFAULT_TAX = 0.00; // configure with accountant / applicable local rules
function nightsBetween(a,b){if(!a||!b)return 0;const d1=new Date(a+'T00:00:00');const d2=new Date(b+'T00:00:00');return Math.max(0,Math.round((d2-d1)/86400000));}
function getSettings(){return JSON.parse(localStorage.getItem('zuzu_settings')||'null')||{nightlyRate:DEFAULT_RATE,serviceRate:DEFAULT_SERVICE,taxRate:DEFAULT_TAX};}
function updateSummary(){
  const ci=document.querySelector('#checkin')?.value; const co=document.querySelector('#checkout')?.value; const guests=Number(document.querySelector('#guests')?.value||2); const s=getSettings();
  const nights=nightsBetween(ci,co); const subtotal=nights*s.nightlyRate; const service=subtotal*s.serviceRate; const tax=(subtotal+service)*s.taxRate; const total=subtotal+service+tax;
  const set=(id,val)=>{const e=document.querySelector(id);if(e)e.textContent=val};
  set('#sumNights',nights?`${nights} night${nights>1?'s':''}`:'—'); set('#sumGuests',`${guests} guest${guests>1?'s':''}`); set('#sumSubtotal',IDR.format(subtotal)); set('#sumService',IDR.format(service)); set('#sumTax',IDR.format(tax)); set('#sumTotal',IDR.format(total));
  return {nights,subtotal,service,tax,total,guests,ci,co};
}
function seedReservations(){if(localStorage.getItem('zuzu_reservations'))return;localStorage.setItem('zuzu_reservations',JSON.stringify([]));}
function submitBooking(e){e.preventDefault(); const x=updateSummary(); const notice=document.querySelector('#bookingNotice'); const success=document.querySelector('#bookingSuccess');
  if(x.nights<1){notice.textContent='Check-out must be after check-in.';notice.classList.add('show');return}
  notice.classList.remove('show'); seedReservations(); const form=new FormData(e.target); const booking={id:'ZUZU-'+Date.now().toString().slice(-7),createdAt:new Date().toISOString(),name:form.get('name'),email:form.get('email'),phone:form.get('phone'),checkin:x.ci,checkout:x.co,guests:x.guests,nights:x.nights,subtotal:x.subtotal,service:x.service,tax:x.tax,total:x.total,status:'Pending',source:new URLSearchParams(location.search).get('utm_source')||'Direct',campaign:new URLSearchParams(location.search).get('utm_campaign')||''};
  const list=JSON.parse(localStorage.getItem('zuzu_reservations')||'[]');list.unshift(booking);localStorage.setItem('zuzu_reservations',JSON.stringify(list));
  success.innerHTML=`Booking request saved. Reference: <strong>${booking.id}</strong>.`;success.classList.add('show');e.target.reset();updateSummary();
}
document.addEventListener('DOMContentLoaded',()=>{seedReservations();['checkin','checkout','guests'].forEach(id=>document.getElementById(id)?.addEventListener('change',updateSummary));document.querySelector('#bookingForm')?.addEventListener('submit',submitBooking);updateSummary();});
