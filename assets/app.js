
(function(){
  const state = { data:null, tab:'home', token:null, coin:null, audit:null };

  function tokenFromHash(){
    const m = location.hash.match(/[#&]t=([^&]+)/);
    return m ? decodeURIComponent(m[1]) : localStorage.getItem('desk_app_token');
  }
  function dataPathFromHash(){
    const m = location.hash.match(/[#&]d=([^&]+)/);
    if (m) {
      const v = decodeURIComponent(m[1]);
      try { localStorage.setItem('desk_data_path', v); } catch (_) {}
      return v;
    }
    try { return localStorage.getItem('desk_data_path'); } catch (_) { return null; }
  }
  state.token = tokenFromHash();
  if (state.token) localStorage.setItem('desk_app_token', state.token);

  function rel(path){
    // Project Pages live under /<repo>/ — avoid leading "/" so assets resolve.
    return path.replace(/^\//, '');
  }

  document.querySelectorAll('nav button').forEach(btn=>{
    btn.onclick = ()=>{
      document.querySelectorAll('nav button').forEach(b=>b.classList.remove('active'));
      document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-'+btn.dataset.tab).classList.add('active');
      state.tab = btn.dataset.tab;
      render();
    };
  });

  async function load(){
    const dp = dataPathFromHash() || window.__DESK_DATA_PATH__;
    try {
      let data = null;
      if (state.token) {
        try {
          const r = await fetch(rel('/api/state'), { headers: { Authorization: 'Bearer '+state.token }});
          if (r.status === 401) throw new Error('401');
          if (r.ok) data = await r.json();
        } catch (_) { /* Pages has no /api — fall through to Plan B JSON */ }
      }
      if (!data && dp) {
        const r = await fetch(rel('/d/'+dp+'/state.json') + '?_=' + Date.now());
        if (!r.ok) throw new Error('state');
        data = await r.json();
      }
      if (!data) throw new Error('no data');
      state.data = data;
      document.getElementById('homeError').classList.add('hidden');
      render();
    } catch (e) {
      document.getElementById('homeError').classList.remove('hidden');
    }
  }

  function render(){
    const d = state.data; if (!d) return;
    document.getElementById('modePill').textContent = d.mode || 'PAPER';
    document.getElementById('modePill').className = 'pill '+(d.mode==='LIVE'?'live':'paper');
    document.getElementById('stackLine').textContent = 'stack $'+Number(d.stack||0).toFixed(2);

    const act = d.activity || [];
    const feed = document.getElementById('activity');
    feed.innerHTML = act.map(a=>{
      const kill = (a.kind||'').includes('kill') || (a.kind||'').includes('reject');
      return `<div class="row ${kill?'kill':''}" data-mint="${a.mint||''}">
        <div><div class="title">${esc(a.title||'')}</div>
        <div class="muted">${esc(a.kind||'')} · ${(a.ts||'').slice(11,19)}</div></div>
        <div class="reason">${esc(a.detail||'')}</div></div>`;
    }).join('');
    document.getElementById('homeEmpty').classList.toggle('hidden', act.length>0);
    feed.querySelectorAll('.row').forEach(row=>{
      row.onclick = ()=>{ state.coin = row.dataset.mint; document.querySelector('nav [data-tab=coin]').click(); };
    });

    const cards = document.getElementById('agentCards');
    const hb = d.agents || {};
    const now = Date.now()/1000;
    const names = ['scanner','auditor','analyst','executor','risk'];
    cards.innerHTML = names.map(n=>{
      const age = hb[n] ? (now - hb[n]) : 999;
      const live = age < 120;
      return `<div class="card"><h3>${n}</h3>
        <div class="big">${live?'live':'—'}</div>
        <div class="muted">${live?('hb '+Math.round(age)+'s'):'no heartbeat'}</div></div>`;
    }).join('');

    const layers = (state.audit && state.audit.layers) || [
      {n:1,name:'Mint authority',value:'—'},{n:2,name:'Freeze authority',value:'—'},
      {n:3,name:'Dev wallet',value:'—'},{n:4,name:'Top 10 holders',value:'—'},
      {n:5,name:'Liquidity',value:'—'},{n:6,name:'Pool age',value:'—'},
      {n:7,name:'Bundled wallets',value:'—'},{n:8,name:'Delegations',value:'—'}
    ];
    document.getElementById('auditLayers').innerHTML = layers.map(l=>{
      const cls = l.value==='not checked'||l.value==='—'?'':(l.pass?'ok':'bad');
      return `<div class="layer ${cls}"><div class="n">${l.n}. ${esc(l.name)}</div><div>${esc(l.value)}</div></div>`;
    }).join('');

    const coin = (d.positions||[]).find(p=>p.mint===state.coin) || (d.waiting||[]).find(p=>p.mint===state.coin);
    const panel = document.getElementById('coinPanel');
    if (!state.coin) panel.innerHTML = '<div class="empty">Pick a coin from Activity.</div>';
    else {
      const url = (coin && coin.link) || (window.deskCoinUrl ? window.deskCoinUrl(state.coin,'solana') : '#');
      panel.innerHTML = `<div class="card"><h3>${esc((coin&&coin.name)||state.coin.slice(0,8))}</h3>
        <div class="muted">${esc(state.coin)}</div>
        <p><a href="${url}">Open on FOMO</a></p>
        <div class="muted">Risk trailing stop drawn as orange dashed line on live candles (Plan B JSON).</div>
      </div>`;
    }

    const s = d.settings || {};
    const ap = document.getElementById('accountPanel');
    const rows = [];
    function add(sec, key, label){
      const v = (s[sec]||{})[key];
      rows.push(`<div class="setting"><span>${label}</span><strong>${esc(String(v))}</strong></div>`);
    }
    add('desk','mode','Mode'); add('desk','stack','Stack'); add('desk','fomo_handle','FOMO handle');
    add('analyst','mode','Analyst mode'); add('risk','stop_pct','Stop %'); add('risk','trail_pct','Trail %');
    add('executor','stack_pct','Stack %'); add('executor','min_ticket_usd','Min ticket');
    add('executor','below_min','Below min'); add('scanner','min_liquidity_usd','Min liq');
    const su = d.signup_url || window.DESK_SIGNUP_URL || '';
    ap.innerHTML = rows.join('') + `<p class="muted" style="margin-top:12px">Signup: <a href="${su}">${su.replace(/^https:\/\//,'')}</a></p>`;
  }

  function esc(s){ return String(s).replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }

  load();
  setInterval(load, 5000);
})();
