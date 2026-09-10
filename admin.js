const IDR=new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0});
const $=(s)=>document.querySelector(s);
function parse(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}}
function reservations(){return parse('zuzu_reservations',[])}
function expenses(){return parse('zuzu_expenses',[])}
function ads(){return parse('zuzu_ads',{meta:0,instagram:0,google:0})}
function settings(){return parse('zuzu_settings',{nightlyRate:3500000,serviceRate:.05,taxRate:0})}
function paidRevenue(){return reservations().filter(x=>x.status==='Paid').reduce((a,b)=>a+Number(b.total||0),0)}
function pendingRevenue(){return reservations().filter(x=>x.status!=='Cancelled'&&x.status!=='Paid').reduce((a,b)=>a+Number(b.total||0),0)}
function totalExpenses(){return expenses().reduce((a,b)=>a+Number(b.amount||0),0)}
function totalAds(){const a=ads();return Number(a.meta||0)+Number(a.instagram||0)+Number(a.google||0)}
function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function fmtDate(v){if(!v)return '—';return new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'2-digit'}).format(new Date(v+'T00:00:00'))}
function monthKey(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`}
function renderChart(){
  const now=new Date(),months=[];for(let i=5;i>=0;i--){const d=new Date(now.getFullYear(),now.getMonth()-i,1);months.push({key:monthKey(d),label:new Intl.DateTimeFormat('en',{month:'short'}).format(d),value:0})}
  reservations().filter(r=>r.status==='Paid').forEach(r=>{const k=String(r.createdAt||'').slice(0,7),m=months.find(x=>x.key===k);if(m)m.value+=Number(r.total||0)});
  const max=Math.max(...months.map(x=>x.value),1),chart=$('#revenueChart');
  chart.innerHTML=months.map(m=>`<div class="chart-col"><div class="chart-value">${m.value?IDR.format(m.value):'—'}</div><div class="chart-bar-track"><div class="chart-bar" style="height:${m.value?Math.max(10,Math.round(m.value/max*100)):4}%"></div></div><span>${m.label}</span></div>`).join('')
}
function renderExpenses(){const list=$('#expenseList'),items=expenses().slice().reverse().slice(0,5);list.innerHTML=items.length?items.map(x=>`<div class="expense-item"><div><strong>${esc(x.category)}</strong><span>${fmtDate(x.date)}</span></div><b>${IDR.format(Number(x.amount||0))}</b></div>`).join(''):'<div class="empty-row">No operating expenses logged yet.</div>'}
function render(){
  const r=reservations(),gross=paidRevenue(),exp=totalExpenses(),ad=totalAds(),net=gross-exp-ad,roas=ad?gross/ad:0;
  $('#kGross').textContent=IDR.format(gross);$('#kNet').textContent=IDR.format(net);$('#kPending').textContent=IDR.format(pendingRevenue());$('#kRoas').textContent=roas?roas.toFixed(1)+'×':'—';
  $('#reservationCount').textContent=`${r.length} record${r.length===1?'':'s'}`;
  $('#reservationRows').innerHTML=r.length?r.map(x=>`<tr><td><strong>${esc(x.id)}</strong><small>${fmtDate(String(x.createdAt||'').slice(0,10))}</small></td><td>${esc(x.name||'—')}<small>${esc(x.email||'')}</small></td><td>${fmtDate(x.checkin)}<small>to ${fmtDate(x.checkout)}</small></td><td>${esc(x.guests||'—')}</td><td><strong>${IDR.format(Number(x.total||0))}</strong></td><td>${esc(x.source||'Direct')}</td><td><select class="status-select ${String(x.status||'').toLowerCase()}" onchange="setStatus('${esc(x.id)}',this.value)"><option ${x.status==='Pending'?'selected':''}>Pending</option><option ${x.status==='Paid'?'selected':''}>Paid</option><option ${x.status==='Cancelled'?'selected':''}>Cancelled</option></select></td></tr>`).join(''):'<tr><td colspan="7"><div class="empty-state"><strong>No reservations yet</strong><span>New stay requests will appear here.</span></div></td></tr>';
  const a=ads();$('#metaSpend').textContent=IDR.format(Number(a.meta||0));$('#igSpend').textContent=IDR.format(Number(a.instagram||0));$('#googleSpend').textContent=IDR.format(Number(a.google||0));
  $('#financeGross').textContent=IDR.format(gross);$('#financeAds').textContent=IDR.format(ad);$('#financeExpenses').textContent=IDR.format(exp);$('#financeNet').textContent=IDR.format(net);
  const s=settings();$('#nightlyRate').value=s.nightlyRate;$('#serviceRate').value=(s.serviceRate*100);$('#taxRate').value=(s.taxRate*100);
  renderChart();renderExpenses();
}
function setStatus(id,status){const list=reservations(),x=list.find(r=>r.id===id);if(x)x.status=status;localStorage.setItem('zuzu_reservations',JSON.stringify(list));render()}
function saveExpense(e){e.preventDefault();const f=new FormData(e.target),list=expenses();list.push({date:f.get('date'),category:String(f.get('category')||'').trim(),amount:Number(f.get('amount'))||0});localStorage.setItem('zuzu_expenses',JSON.stringify(list));e.target.reset();render()}
function saveAds(e){e.preventDefault();const f=new FormData(e.target);localStorage.setItem('zuzu_ads',JSON.stringify({meta:Number(f.get('meta'))||0,instagram:Number(f.get('instagram'))||0,google:Number(f.get('google'))||0}));render()}
function saveSettings(e){e.preventDefault();const f=new FormData(e.target);localStorage.setItem('zuzu_settings',JSON.stringify({nightlyRate:Number(f.get('nightlyRate'))||3500000,serviceRate:(Number(f.get('serviceRate'))||0)/100,taxRate:(Number(f.get('taxRate'))||0)/100}));render()}
function exportCSV(){const rows=[['Booking ID','Created','Guest','Email','Phone','Check-in','Check-out','Guests','Nights','Subtotal','Service','Tax','Total','Status','Source','Campaign'],...reservations().map(x=>[x.id,x.createdAt,x.name,x.email,x.phone,x.checkin,x.checkout,x.guests,x.nights,x.subtotal,x.service,x.tax,x.total,x.status,x.source,x.campaign])];const csv=rows.map(r=>r.map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(',')).join('\n');const b=new Blob([csv],{type:'text/csv;charset=utf-8'}),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download=`zuzu-reservations-${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(u)}
document.addEventListener('DOMContentLoaded',()=>{$('#expenseForm').addEventListener('submit',saveExpense);$('#adsForm').addEventListener('submit',saveAds);$('#settingsForm').addEventListener('submit',saveSettings);render()});
