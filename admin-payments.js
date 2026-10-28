
(function(){
  const KEY='zuzu_payment_config_v1';
  const defaults={mode:'manual',provider:'none',merchantId:'',publicKey:'',successUrl:'https://zuzu.nadmo.id/',cancelUrl:'https://zuzu.nadmo.id/',enabled:false};
  const q=s=>document.querySelector(s);
  const read=()=>{try{return Object.assign({},defaults,JSON.parse(localStorage.getItem(KEY)||'{}'))}catch(e){return Object.assign({},defaults)}};
  const write=v=>localStorage.setItem(KEY,JSON.stringify(v));
  function renumber(){
    const nav=q('.side-nav');if(!nav)return;
    Array.from(nav.querySelectorAll('.side-link')).forEach((a,i)=>{const n=a.querySelector('span');if(n)n.textContent=String(i+1).padStart(2,'0')});
  }
  function makeUI(){
    const nav=q('.side-nav');
    if(nav&&!q('[data-view="payments"]')){
      const link=document.createElement('a');
      link.className='side-link';link.href='#payments';link.dataset.view='payments';link.innerHTML='<span>00</span>Payments';
      const channels=q('[data-view="channels"]');nav.insertBefore(link,channels||null);renumber();
      link.addEventListener('click',e=>{e.preventDefault();openView()});
    }
    if(q('#view-payments'))return;
    const section=document.createElement('section');section.className='admin-view';section.id='view-payments';section.hidden=true;
    section.innerHTML=[
      '<div class="payment-grid">',
      '<article class="admin-panel">',
      '<div class="panel-head"><div><span class="panel-kicker">Payment setup</span><h2>Payments</h2></div><span id="paymentBadge" class="payment-badge">Manual / OFF</span></div>',
      '<div class="payment-status"><div><strong id="paymentStatusTitle">Manual payments</strong><span id="paymentStatusText">Gateway not connected</span></div></div>',
      '<form id="paymentForm" class="payment-form">',
      '<label>Payment mode<select name="mode"><option value="manual">Manual</option><option value="gateway">Payment Gateway</option></select></label>',
      '<label>Provider<select name="provider"><option value="none">Not selected</option><option value="xendit">Xendit</option><option value="ipaymu">iPaymu</option><option value="doku">DOKU</option><option value="shopeepay">ShopeePay Merchant</option><option value="other">Other</option></select></label>',
      '<label>Merchant / Account ID<input name="merchantId" placeholder="Merchant ID"></label>',
      '<label>Public / Client Key<input name="publicKey" placeholder="Public key if used"></label>',
      '<label class="full">API Key<input name="apiKey" type="password" placeholder="Stored securely in Cloudflare when connected" disabled></label>',
      '<label class="full">Secret Key<input name="secretKey" type="password" placeholder="Stored securely in Cloudflare when connected" disabled></label>',
      '<label class="full">Webhook URL<input readonly value="https://zuzu-api.nadmo.id/api/payments/webhook"></label>',
      '<label>Success URL<input name="successUrl"></label>',
      '<label>Cancel / Failed URL<input name="cancelUrl"></label>',
      '<label class="payment-switch full"><span>Enable online payment on public website</span><input name="enabled" type="checkbox" disabled></label>',
      '<div class="payment-actions"><button class="save-btn" type="submit">Save setup</button><button id="paymentTestBtn" class="ghost-btn" type="button" disabled>Test connection</button></div>',
      '</form>',
      '<p class="payment-note">Current production mode stays manual. Saving this panel does not expose or enable payment on the public website.</p>',
      '</article>',
      '<article class="admin-panel payment-security">',
      '<div class="security-card"><strong>Secrets stay server-side.</strong><p>API keys and secret keys are never stored in the browser or regular database. When a gateway is approved, credentials will be connected through Cloudflare secure secrets.</p></div>',
      '<div><span class="panel-kicker">Activation checklist</span><ul><li>Choose payment provider</li><li>Enter merchant/account ID</li><li>Connect API credentials securely</li><li>Verify webhook</li><li>Test payment</li><li>Only then enable online payment</li></ul></div>',
      '</article>',
      '</div>'
    ].join('');
    const channels=q('#view-channels');channels.parentNode.insertBefore(section,channels);
    q('#paymentForm').addEventListener('submit',save);
    load();
  }
  function openView(){
    document.querySelectorAll('.admin-view').forEach(el=>el.hidden=el.id!=='view-payments');
    document.querySelectorAll('[data-view]').forEach(el=>el.classList.toggle('active',el.dataset.view==='payments'));
    const t=q('#viewTitle');if(t)t.textContent='Payments';
    history.replaceState(null,'','#payments');
    window.scrollTo({top:0,behavior:'smooth'});
    load();
  }
  function load(){
    const f=q('#paymentForm');if(!f)return;const c=read();
    f.elements.mode.value=c.mode;f.elements.provider.value=c.provider;f.elements.merchantId.value=c.merchantId;f.elements.publicKey.value=c.publicKey;f.elements.successUrl.value=c.successUrl;f.elements.cancelUrl.value=c.cancelUrl;f.elements.enabled.checked=!!c.enabled;
    const online=c.mode==='gateway'&&c.enabled;
    const badge=q('#paymentBadge');badge.textContent=online?'Gateway ON':'Manual / OFF';badge.classList.toggle('online',online);
    q('#paymentStatusTitle').textContent=online?'Online payment enabled':'Manual payments';
    q('#paymentStatusText').textContent=c.provider!=='none'?'Provider selected: '+c.provider:'Gateway not connected';
  }
  function save(e){
    e.preventDefault();const f=new FormData(e.target);
    const c={mode:String(f.get('mode')||'manual'),provider:String(f.get('provider')||'none'),merchantId:String(f.get('merchantId')||'').trim(),publicKey:String(f.get('publicKey')||'').trim(),successUrl:String(f.get('successUrl')||defaults.successUrl).trim(),cancelUrl:String(f.get('cancelUrl')||defaults.cancelUrl).trim(),enabled:false};
    write(c);load();
    if(typeof toast==='function')toast('Payment setup saved · manual mode remains active');
  }
  document.addEventListener('DOMContentLoaded',()=>{makeUI();if(location.hash==='#payments')openView()});
})();
