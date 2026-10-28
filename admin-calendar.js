
(function(){
  const API=String(window.ZUZU_CONFIG&&window.ZUZU_CONFIG.apiBase||'').replace(/\/+$/,'');
  let calendarDate=new Date();
  let reservations=[];
  let blocks=[];
  const q=s=>document.querySelector(s);
  const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const token=()=>sessionStorage.getItem('zuzu_admin_token')||'';
  const statusClass=v=>String(v||'Pending').toLowerCase();
  const iso=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  const fmt=v=>v?new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'2-digit'}).format(new Date(v+'T00:00:00')):'—';
  async function call(path,options){
    if(!API)throw new Error('Production API is not configured.');
    const opts=options||{};
    const headers=Object.assign({'Content-Type':'application/json'},opts.headers||{});
    if(token())headers.Authorization='Bearer '+token();
    const res=await fetch(API+path,Object.assign({},opts,{headers}));
    let data={};try{data=await res.json()}catch(e){}
    if(!res.ok)throw new Error(data.error||('Request failed ('+res.status+')'));
    return data;
  }
  function notify(message){if(typeof toast==='function')toast(message);else alert(message)}
  function makeUI(){
    const nav=q('.side-nav');
    if(nav&&!q('[data-view="calendar"]')){
      const link=document.createElement('a');
      link.className='side-link';
      link.href='#calendar';
      link.dataset.view='calendar';
      link.innerHTML='<span>02</span>Calendar';
      const reservation=q('[data-view="reservations"]');
      nav.insertBefore(link,reservation||nav.children[1]||null);
      Array.from(nav.querySelectorAll('.side-link')).forEach((a,i)=>{const n=a.querySelector('span');if(n)n.textContent=String(i+1).padStart(2,'0')});
      link.addEventListener('click',e=>{e.preventDefault();openCalendarView()});
    }
    if(q('#view-calendar'))return;
    const section=document.createElement('section');
    section.className='admin-view';
    section.id='view-calendar';
    section.hidden=true;
    section.innerHTML=[
      '<div class="calendar-layout">',
      '<article class="admin-panel calendar-panel">',
      '<div class="panel-head calendar-head"><div><span class="panel-kicker">Manual booking calendar</span><h2 id="calendarTitle">Calendar</h2></div><div class="calendar-nav"><button class="ghost-btn" id="calendarPrev" type="button">←</button><button class="ghost-btn" id="calendarToday" type="button">Today</button><button class="ghost-btn" id="calendarNext" type="button">→</button></div></div>',
      '<div class="calendar-legend"><span><i class="cal-dot pending"></i>Pending</span><span><i class="cal-dot confirmed"></i>Confirmed</span><span><i class="cal-dot paid"></i>Paid</span><span><i class="cal-dot blocked"></i>Blocked</span></div>',
      '<div class="calendar-weekdays"><span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span></div>',
      '<div class="calendar-grid" id="bookingCalendar"></div>',
      '</article>',
      '<div class="calendar-side">',
      '<article class="admin-panel"><div class="panel-head"><div><span class="panel-kicker">Add booking</span><h2>Manual reservation</h2></div></div>',
      '<form id="manualBookingForm" class="admin-form calendar-form">',
      '<label>Guest name<input name="name" required placeholder="Guest name"></label>',
      '<label>WhatsApp / phone<input name="phone" required placeholder="+62 ..."></label>',
      '<label>Email<input name="email" type="email" placeholder="Optional"></label>',
      '<label>Guests<input name="guests" type="number" min="1" max="12" value="2" required></label>',
      '<label>Check-in<input name="checkin" type="date" required></label>',
      '<label>Check-out<input name="checkout" type="date" required></label>',
      '<label>Status<select name="status"><option>Pending</option><option selected>Confirmed</option><option>Paid</option></select></label>',
      '<label>Notes<input name="notes" placeholder="Booking note / source"></label>',
      '<button class="save-btn" type="submit">Add booking</button>',
      '</form></article>',
      '<article class="admin-panel"><div class="panel-head"><div><span class="panel-kicker">Owner block</span><h2>Block dates</h2></div></div>',
      '<form id="manualBlockForm" class="admin-form calendar-form">',
      '<label>Start date<input name="startDate" type="date" required></label>',
      '<label>End date<input name="endDate" type="date" required></label>',
      '<label style="grid-column:1/-1">Reason<input name="note" placeholder="Maintenance / owner stay / hold"></label>',
      '<button class="dark-btn" type="submit">Block dates</button>',
      '</form></article>',
      '</div></div>',
      '<article class="admin-panel calendar-list-panel"><div class="panel-head"><div><span class="panel-kicker">This month</span><h2>Bookings & blocked dates</h2></div></div><div id="calendarEntries" class="calendar-entry-list"></div></article>'
    ].join('');
    const reservationsView=q('#view-reservations');
    reservationsView.parentNode.insertBefore(section,reservationsView);
    q('#calendarPrev').addEventListener('click',()=>moveMonth(-1));
    q('#calendarNext').addEventListener('click',()=>moveMonth(1));
    q('#calendarToday').addEventListener('click',()=>{calendarDate=new Date();render()});
    q('#manualBookingForm').addEventListener('submit',addBooking);
    q('#manualBlockForm').addEventListener('submit',addBlock);
  }
  function openCalendarView(){
    document.querySelectorAll('.admin-view').forEach(el=>el.hidden=el.id!=='view-calendar');
    document.querySelectorAll('[data-view]').forEach(el=>el.classList.toggle('active',el.dataset.view==='calendar'));
    const t=q('#viewTitle');if(t)t.textContent='Booking calendar';
    history.replaceState(null,'','#calendar');
    window.scrollTo({top:0,behavior:'smooth'});
    refresh();
  }
  async function refresh(){
    if(!token())return;
    try{
      const data=await Promise.all([call('/api/admin/reservations'),call('/api/admin/blocks')]);
      reservations=(data[0].reservations||[]).map(x=>({id:x.id,name:x.name||'Guest',phone:x.phone||'',email:x.email||'',checkin:x.checkin,checkout:x.checkout,guests:Number(x.guests||0),status:x.status||'Pending',total:Number(x.total||0)}));
      blocks=(data[1].blocks||[]).map(x=>({id:Number(x.id),startDate:x.start_date,endDate:x.end_date,note:x.note||'',source:x.source||'Owner'}));
      render();
    }catch(e){console.warn('Calendar load failed',e)}
  }
  function inRange(date,start,end){return date>=start&&date<end}
  function render(){
    const box=q('#bookingCalendar'),title=q('#calendarTitle'),list=q('#calendarEntries');
    if(!box)return;
    const year=calendarDate.getFullYear(),month=calendarDate.getMonth();
    if(title)title.textContent=new Intl.DateTimeFormat('en',{month:'long',year:'numeric'}).format(new Date(year,month,1));
    const first=new Date(year,month,1),start=new Date(year,month,1-first.getDay());
    const today=iso(new Date()),cells=[];
    for(let i=0;i<42;i++){
      const d=new Date(start);d.setDate(start.getDate()+i);
      const day=iso(d),same=d.getMonth()===month;
      const rs=reservations.filter(r=>r.status!=='Cancelled'&&inRange(day,r.checkin,r.checkout));
      const bs=blocks.filter(b=>inRange(day,b.startDate,b.endDate));
      const chips=[];
      rs.slice(0,2).forEach(r=>chips.push('<span class="cal-chip '+statusClass(r.status)+'" title="'+esc(r.name)+'">'+esc(r.name)+'</span>'));
      bs.slice(0,1).forEach(b=>chips.push('<span class="cal-chip blocked" title="'+esc(b.note||'Blocked')+'">'+esc(b.note||'Blocked')+'</span>'));
      const more=Math.max(0,rs.length+bs.length-chips.length);
      cells.push('<div class="cal-day '+(same?'':'muted')+(day===today?' today':'')+'"><div class="cal-day-num">'+d.getDate()+'</div><div class="cal-chips">'+chips.join('')+(more?'<span class="cal-more">+'+more+' more</span>':'')+'</div></div>');
    }
    box.innerHTML=cells.join('');
    const ms=iso(first),me=iso(new Date(year,month+1,1));
    const rs=reservations.filter(r=>r.checkout>ms&&r.checkin<me).sort((a,b)=>a.checkin.localeCompare(b.checkin));
    const bs=blocks.filter(b=>b.endDate>ms&&b.startDate<me).sort((a,b)=>a.startDate.localeCompare(b.startDate));
    if(!list)return;
    list.innerHTML='';
    rs.forEach(r=>{
      const row=document.createElement('div');row.className='calendar-entry';
      row.innerHTML='<div><strong>'+esc(r.name)+'</strong><span>'+fmt(r.checkin)+' → '+fmt(r.checkout)+' · '+r.guests+' guest'+(r.guests===1?'':'s')+'</span></div><div class="calendar-entry-actions"><span class="status-pill '+statusClass(r.status)+'">'+esc(r.status)+'</span></div>';
      const sel=document.createElement('select');sel.className='status-select '+statusClass(r.status);
      ['Pending','Confirmed','Paid','Cancelled'].forEach(s=>{const o=document.createElement('option');o.textContent=s;o.selected=s===r.status;sel.appendChild(o)});
      sel.addEventListener('change',()=>changeStatus(r.id,sel.value));
      row.querySelector('.calendar-entry-actions').appendChild(sel);
      list.appendChild(row);
    });
    bs.forEach(b=>{
      const row=document.createElement('div');row.className='calendar-entry blocked-entry';
      row.innerHTML='<div><strong>Blocked</strong><span>'+fmt(b.startDate)+' → '+fmt(b.endDate)+' · '+esc(b.note||b.source)+'</span></div>';
      const btn=document.createElement('button');btn.className='ghost-btn';btn.type='button';btn.textContent='Remove';btn.addEventListener('click',()=>removeBlock(b.id));row.appendChild(btn);list.appendChild(row);
    });
    if(!rs.length&&!bs.length)list.innerHTML='<div class="empty-state"><strong>No bookings this month</strong><span>Manual reservations and blocked dates will appear here.</span></div>';
  }
  function moveMonth(delta){calendarDate=new Date(calendarDate.getFullYear(),calendarDate.getMonth()+delta,1);render()}
  async function addBooking(e){
    e.preventDefault();const f=new FormData(e.target);
    const body={name:String(f.get('name')||'').trim(),phone:String(f.get('phone')||'').trim(),email:String(f.get('email')||'').trim()||'manual@zuzu.local',guests:Number(f.get('guests')||1),checkin:String(f.get('checkin')||''),checkout:String(f.get('checkout')||''),notes:String(f.get('notes')||'').trim(),source:'Manual',campaign:'Owner Suite'};
    const status=String(f.get('status')||'Confirmed');
    try{
      const av=await call('/api/availability?checkin='+encodeURIComponent(body.checkin)+'&checkout='+encodeURIComponent(body.checkout));
      if(!av.available)throw new Error('Those dates are already occupied or blocked.');
      const made=await call('/api/reservations',{method:'POST',body:JSON.stringify(body)});
      const id=made.reservation&&made.reservation.id;
      if(id&&status!=='Pending')await call('/api/admin/reservations/'+encodeURIComponent(id)+'/status',{method:'PATCH',body:JSON.stringify({status:status})});
      e.target.reset();
      if(typeof refreshAll==='function')await refreshAll().catch(()=>{});
      await refresh();notify('Manual booking added');
    }catch(err){notify(err.message||'Unable to add booking')}
  }
  async function addBlock(e){
    e.preventDefault();const f=new FormData(e.target);
    try{
      await call('/api/admin/blocks',{method:'POST',body:JSON.stringify({startDate:String(f.get('startDate')||''),endDate:String(f.get('endDate')||''),source:'Owner',note:String(f.get('note')||'').trim()})});
      e.target.reset();await refresh();notify('Dates blocked');
    }catch(err){notify(err.message||'Unable to block dates')}
  }
  async function removeBlock(id){
    if(!confirm('Remove this blocked date range?'))return;
    try{await call('/api/admin/blocks/'+encodeURIComponent(id),{method:'DELETE'});await refresh();notify('Block removed')}catch(err){notify(err.message||'Unable to remove block')}
  }
  async function changeStatus(id,status){
    try{
      await call('/api/admin/reservations/'+encodeURIComponent(id)+'/status',{method:'PATCH',body:JSON.stringify({status:status})});
      if(typeof refreshAll==='function')await refreshAll().catch(()=>{});
      await refresh();notify('Reservation marked '+status);
    }catch(err){notify(err.message||'Unable to update reservation');await refresh()}
  }
  document.addEventListener('DOMContentLoaded',()=>{
    makeUI();
    if(location.hash==='#calendar')openCalendarView();
    q('#adminAuthForm')&&q('#adminAuthForm').addEventListener('submit',()=>setTimeout(refresh,500));
    if(token())refresh();
  });
})();
