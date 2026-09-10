const IDR=new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0});
function res(){return JSON.parse(localStorage.getItem('zuzu_reservations')||'[]')}
function expenses(){return JSON.parse(localStorage.getItem('zuzu_expenses')||'[]')}
function ads(){return JSON.parse(localStorage.getItem('zuzu_ads')||'null')||{meta:0,instagram:0,google:0}}
function settings(){return JSON.parse(localStorage.getItem('zuzu_settings')||'null')||{nightlyRate:3500000,serviceRate:.05,taxRate:0}}
function paidRevenue(){return res().filter(x=>x.status==='Paid').reduce((a,b)=>a+Number(b.total||0),0)}
function pendingRevenue(){return res().filter(x=>x.status!=='Cancelled'&&x.status!=='Paid').reduce((a,b)=>a+Number(b.total||0),0)}
function totalExpenses(){return expenses().reduce((a,b)=>a+Number(b.amount||0),0)}
function totalAds(){const a=ads();return Number(a.meta)+Number(a.instagram)+Number(a.google)}
function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}

function render(){
  const r=res(),gross=paidRevenue(),exp=totalExpenses(),ad=totalAds(),net=gross-exp-ad;
  const roas=ad?gross/ad:0;
  document.getElementById('kGross').textContent=IDR.format(gross);
  document.getElementById('kNet').textContent=IDR.format(net);
  document.getElementById('kPending').textContent=IDR.format(pendingRevenue());
  document.getElementById('kRoas').textContent=roas?roas.toFixed(1)+'×':'—';

  const body=document.getElementById('reservationRows');
  body.innerHTML=r.length?r.map(x=>`<tr>
    <td>${escapeHtml(x.id)}</td>
    <td>${escapeHtml(x.name)}</td>
    <td>${escapeHtml(x.checkin)}</td>
    <td>${escapeHtml(x.checkout)}</td>
    <td>${escapeHtml(x.guests)}</td>
    <td>${IDR.format(x.total||0)}</td>
    <td>${escapeHtml(x.source||'Direct')}</td>
    <td><select onchange="setStatus('${escapeHtml(x.id)}',this.value)">
      <option ${x.status==='Pending'?'selected':''}>Pending</option>
      <option ${x.status==='Paid'?'selected':''}>Paid</option>
      <option ${x.status==='Cancelled'?'selected':''}>Cancelled</option>
    </select></td>
  </tr>`).join(''):'<tr><td colspan="8">No reservations yet. Submit a test request from the guest website.</td></tr>';

  const a=ads();
  document.getElementById('metaSpend').textContent=IDR.format(a.meta);
  document.getElementById('igSpend').textContent=IDR.format(a.instagram);
  document.getElementById('googleSpend').textContent=IDR.format(a.google);
  document.getElementById('financeGross').textContent=IDR.format(gross);
  document.getElementById('financeAds').textContent=IDR.format(ad);
  document.getElementById('financeExpenses').textContent=IDR.format(exp);
  document.getElementById('financeNet').textContent=IDR.format(net);

  const s=settings();
  document.getElementById('nightlyRate').value=s.nightlyRate;
  document.getElementById('serviceRate').value=s.serviceRate*100;
  document.getElementById('taxRate').value=s.taxRate*100;

  const heights=[35,55,44,70,62,78,68,86];
  document.getElementById('bars').innerHTML=heights.map((h,i)=>`<div class="bar" style="height:${Math.max(18,h+(r.length?Math.min(r.length*2,10):0))}%" title="Period ${i+1}"></div>`).join('');
}
function setStatus(id,status){
  const a=res();
  const x=a.find(r=>r.id===id);
  if(x)x.status=status;
  localStorage.setItem('zuzu_reservations',JSON.stringify(a));
  render();
}
function saveExpense(e){
  e.preventDefault();
  const f=new FormData(e.target),a=expenses();
  a.push({date:f.get('date'),category:f.get('category'),amount:Number(f.get('amount'))||0});
  localStorage.setItem('zuzu_expenses',JSON.stringify(a));
  e.target.reset();
  render();
}
function saveAds(e){
  e.preventDefault();
  const f=new FormData(e.target);
  localStorage.setItem('zuzu_ads',JSON.stringify({
    meta:Number(f.get('meta'))||0,
    instagram:Number(f.get('instagram'))||0,
    google:Number(f.get('google'))||0
  }));
  render();
}
function saveSettings(e){
  e.preventDefault();
  const f=new FormData(e.target);
  localStorage.setItem('zuzu_settings',JSON.stringify({
    nightlyRate:Number(f.get('nightlyRate'))||3500000,
    serviceRate:(Number(f.get('serviceRate'))||0)/100,
    taxRate:(Number(f.get('taxRate'))||0)/100
  }));
  render();
}
function exportCSV(){
  const rows=[['Booking ID','Created','Guest','Email','Phone','Notes','Check-in','Check-out','Guests','Nights','Subtotal','Service','Tax','Total','Status','Source','Campaign'],
    ...res().map(x=>[x.id,x.createdAt,x.name,x.email,x.phone,x.notes,x.checkin,x.checkout,x.guests,x.nights,x.subtotal,x.service,x.tax,x.total,x.status,x.source,x.campaign])];
  const csv=rows.map(r=>r.map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(',')).join('\n');
  const b=new Blob([csv],{type:'text/csv;charset=utf-8'}),u=URL.createObjectURL(b),a=document.createElement('a');
  a.href=u;a.download='zuzu-reservations.csv';a.click();URL.revokeObjectURL(u);
}
document.addEventListener('DOMContentLoaded',()=>{
  document.getElementById('expenseForm')?.addEventListener('submit',saveExpense);
  document.getElementById('adsForm')?.addEventListener('submit',saveAds);
  document.getElementById('settingsForm')?.addEventListener('submit',saveSettings);
  render();
});