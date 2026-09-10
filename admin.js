const IDR=new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0});
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
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
function statusClass(v){return String(v||'Pending').toLowerCase()}
function toast(message){const el=$('#toast');if(!el)return;el.textContent=message;el.classList.add('show');clearTimeout(window.__zuzuToast);window.__zuzuToast=setTimeout(()=>el.classList.remove('show'),1800)}

const titles={overview:'Business overview',reservations:'Reservations',finance:'Finance',marketing:'Marketing',settings:'Rates & tax'};
function setView(view,updateHash=true){if(!titles[view])view='overview';$$('.admin-view').forEach(el=>el.hidden=el.id!==`view-${view}`);$$('[data-view]').forEach(el=>el.classList.toggle('active',el.dataset.view===view));const title=$('#viewTitle');if(title)title.textContent=titles[view];if(updateHash)history.replaceState(null,'',`#${view}`);window.scrollTo({top:0,behavior:'smooth'});}
function setupViews(){$$('[data-view]').forEach(el=>el.addEventListener('click',e=>{e.preventDefault();setView(el.dataset.view)}));$$('[data-go]').forEach(el=>el.addEventListener('click',()=>setView(el.dataset.go)));setView(location.hash.replace('#','')||'overview',false)}

function renderChart(){const now=new Date(),months=[];for(let i=5;i>=0;i--){const d=new Date(now.getFullYear(),now.getMonth()-i,1);months.push({key:monthKey(d),label:new Intl.DateTimeFormat('en',{month:'short'}).format(d),value:0})}reservations().filter(r=>r.status==='Paid').forEach(r=>{const source=String(r.checkin||r.createdAt||'').slice(0,7),m=months.find(x=>x.key===source);if(m)m.value+=Number(r.total||0)});const max=Math.max(...months.map(x=>x.value),1),chart=$('#revenueChart');if(!chart)return;chart.innerHTML=months.map(m=>`<div class="chart-col"><div class="chart-value">${m.value?IDR.format(m.value):'—'}</div><div class="chart-bar-track"><div class="chart-bar" style="height:${m.value?Math.max(10,Math.round(m.value/max*100)):4}%"></div></div><span>${m.label}</span></div>`).join('')}

function renderRecent(){const box=$('#recentReservations');if(!box)return;const items=reservations().slice(0,3);box.innerHTML=items.length?items.map(x=>`<div class="recent-item"><div><strong>${esc(x.name||'Guest')}</strong><small>${esc(x.id||'—')} · ${fmtDate(x.checkin)}</small></div><div><small>${fmtDate(x.checkin)} → ${fmtDate(x.checkout)}</small><span class="status-pill ${statusClass(x.status)}">${esc(x.status||'Pending')}</span></div><div class="recent-total">${IDR.format(Number(x.total||0))}</div></div>`).join(''):'<div class="empty-state"><strong>No reservation activity yet</strong><span>New guest requests from the website will appear here.</span></div>'}

function renderReservations(){const all=reservations(),q=String($('#reservationSearch')?.value||'').trim().toLowerCase(),filter=$('#reservationFilter')?.value||'All';const rows=all.filter(x=>{const hay=[x.id,x.name,x.email,x.source].join(' ').toLowerCase();return(!q||hay.includes(q))&&(filter==='All'||x.status===filter)});const count=$('#reservationCount');if(count)count.textContent=`${rows.length} of ${all.length} record${all.length===1?'':'s'}`;const tbody=$('#reservationRows');if(!tbody)return;tbody.innerHTML=rows.length?rows.map(x=>`<tr><td data-label="Reference"><strong>${esc(x.id)}</strong><small>${fmtDate(String(x.createdAt||'').slice(0,10))}</small></td><td data-label="Guest">${esc(x.name||'—')}<small>${esc(x.email||'')}</small></td><td data-label="Stay">${fmtDate(x.checkin)}<small>to ${fmtDate(x.checkout)}</small></td><td data-label="Guests">${esc(x.guests||'—')}</td><td data-label="Total"><strong>${IDR.format(Number(x.total||0))}</strong></td><td data-label="Source">${esc(x.source||'Direct')}</td><td data-label="Status"><select class="status-select ${statusClass(x.status)}" onchange="setStatus('${esc(x.id)}',this.value)"><option ${x.status==='Pending'?'selected':''}>Pending</option><option ${x.status==='Paid'?'selected':''}>Paid</option><option ${x.status==='Cancelled'?'selected':''}>Cancelled</option></select></td></tr>`).join(''):'<tr><td colspan="7"><div class="empty-state"><strong>No matching reservations</strong><span>Try another search or status filter.</span></div></td></tr>'}

function renderExpenses(){const list=$('#expenseList');if(!list)return;const items=expenses().slice().reverse().slice(0,8);list.innerHTML=items.length?items.map(x=>`<div class="expense-item"><div><strong>${esc(x.category)}</strong><span>${fmtDate(x.date)}</span></div><b>${IDR.format(Number(x.amount||0))}</b></div>`).join(''):'<div class="empty-row">No operating expenses logged yet.</div>'}

function render(){const r=reservations(),gross=paidRevenue(),exp=totalExpenses(),ad=totalAds(),net=gross-exp-ad,roas=ad?gross/ad:0,pending=r.filter(x=>x.status!=='Cancelled'&&x.status!=='Paid').length,paid=r.filter(x=>x.status==='Paid').length,s=settings();
  $('#kGross').textContent=IDR.format(gross);$('#kNet').textContent=IDR.format(net);$('#kPending').textContent=IDR.format(pendingRevenue());$('#kRoas').textContent=roas?roas.toFixed(1)+'×':'—';
  $('#kPaidCount').textContent=paid;$('#kPendingCount').textContent=pending;$('#kNightly').textContent=IDR.format(Number(s.nightlyRate||0));
  const a=ads();$('#metaSpend').textContent=IDR.format(Number(a.meta||0));$('#igSpend').textContent=IDR.format(Number(a.instagram||0));$('#googleSpend').textContent=IDR.format(Number(a.google||0));
  $('#financeGross').textContent=IDR.format(gross);$('#financeAds').textContent=IDR.format(ad);$('#financeExpenses').textContent=IDR.format(exp);$('#financeNet').textContent=IDR.format(net);
  $('#nightlyRate').value=s.nightlyRate;$('#serviceRate').value=s.serviceRate*100;$('#taxRate').value=s.taxRate*100;
  const adsForm=$('#adsForm');if(adsForm){adsForm.elements.meta.value=a.meta||0;adsForm.elements.instagram.value=a.instagram||0;adsForm.elements.google.value=a.google||0}
  const period=$('#reportPeriod');if(period)period.textContent=`Updated ${new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric'}).format(new Date())}`;
  renderChart();renderRecent();renderReservations();renderExpenses();
}

function setStatus(id,status){const list=reservations(),x=list.find(r=>r.id===id);if(x)x.status=status;localStorage.setItem('zuzu_reservations',JSON.stringify(list));render();toast(`Reservation marked ${status}`)}
function saveExpense(e){e.preventDefault();const f=new FormData(e.target),list=expenses();list.push({date:f.get('date'),category:String(f.get('category')||'').trim(),amount:Number(f.get('amount'))||0});localStorage.setItem('zuzu_expenses',JSON.stringify(list));e.target.reset();render();toast('Expense added')}
function saveAds(e){e.preventDefault();const f=new FormData(e.target);localStorage.setItem('zuzu_ads',JSON.stringify({meta:Number(f.get('meta'))||0,instagram:Number(f.get('instagram'))||0,google:Number(f.get('google'))||0}));render();toast('Marketing spend updated')}
function saveSettings(e){e.preventDefault();const f=new FormData(e.target);localStorage.setItem('zuzu_settings',JSON.stringify({nightlyRate:Number(f.get('nightlyRate'))||3500000,serviceRate:(Number(f.get('serviceRate'))||0)/100,taxRate:(Number(f.get('taxRate'))||0)/100}));render();toast('Pricing settings saved')}
function exportCSV(){const rows=[['Booking ID','Created','Guest','Email','Phone','Check-in','Check-out','Guests','Nights','Subtotal','Service','Tax','Total','Status','Source','Campaign'],...reservations().map(x=>[x.id,x.createdAt,x.name,x.email,x.phone,x.checkin,x.checkout,x.guests,x.nights,x.subtotal,x.service,x.tax,x.total,x.status,x.source,x.campaign])];const csv=rows.map(r=>r.map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(',')).join('\n');const b=new Blob([csv],{type:'text/csv;charset=utf-8'}),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download=`zuzu-reservations-${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(u);toast('CSV exported')}

document.addEventListener('DOMContentLoaded',()=>{setupViews();$('#expenseForm')?.addEventListener('submit',saveExpense);$('#adsForm')?.addEventListener('submit',saveAds);$('#settingsForm')?.addEventListener('submit',saveSettings);$('#reservationSearch')?.addEventListener('input',renderReservations);$('#reservationFilter')?.addEventListener('change',renderReservations);render()});
