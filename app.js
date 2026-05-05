const CATS_EXP=[
  {id:'bus',name:'Bus',emoji:'🚌',color:'#4A90D9'},
  {id:'cab',name:'Cab/Auto',emoji:'🚕',color:'#FFD166'},
  {id:'metro',name:'Metro',emoji:'🚇',color:'#C77DFF'},
  {id:'food',name:'Food',emoji:'🍜',color:'#FF6B9D'},
  {id:'grocery',name:'Grocery',emoji:'🛒',color:'#06D6A0'},
  {id:'theater',name:'Theater',emoji:'🎬',color:'#C77DFF'},
  {id:'cafe',name:'Café',emoji:'☕',color:'#F4A726'},
  {id:'shopping',name:'Shopping',emoji:'🛍️',color:'#FF8C42'},
  {id:'medical',name:'Medical',emoji:'💊',color:'#06D6A0'},
  {id:'gym',name:'Gym',emoji:'💪',color:'#4A90D9'},
  {id:'online',name:'Online',emoji:'💻',color:'#FF6B9D'},
  {id:'other',name:'Other',emoji:'💰',color:'#8B949E'},
];
const CATS_INC=[
  {id:'salary',name:'Salary',emoji:'💼',color:'#4CAF50'},
  {id:'freelance',name:'Freelance',emoji:'💻',color:'#7EC8E3'},
  {id:'pocket',name:'Pocket',emoji:'👛',color:'#FFD166'},
  {id:'gift',name:'Gift',emoji:'🎁',color:'#FF6B9D'},
  {id:'invest',name:'Returns',emoji:'📈',color:'#06D6A0'},
  {id:'other_in',name:'Other',emoji:'💰',color:'#8B949E'},
];
const MN=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MF=['January','February','March','April','May','June','July','August','September','October','November','December'];
const MASCOTS={bus:'🚌',cab:'🚕',metro:'🚇',food:'🍱',grocery:'🛒',theater:'🎭',cafe:'☕',shopping:'👜',medical:'🏥',gym:'🏋️',online:'💻',other:'🌸',salary:'💼',freelance:'🖥️',pocket:'👛',gift:'🎁',invest:'📈',other_in:'🌸'};

let currentMonth='', entryType='expense', selExp='bus', selInc='salary';
let cachedEntries=[], cachedBudget=0;

function fmt(n){return Math.round(n).toLocaleString('en-IN')}
function loading(show){document.getElementById('loadingOverlay').className=show?'loading':'loading hidden'}

async function api(url,opts={}){
  const r=await fetch(url,{credentials:'include',headers:{'Content-Type':'application/json'},...opts});
  if(r.status===401){window.location.href='/';return null}
  return r.json();
}

function init(){
  const now=new Date();
  currentMonth=now.toISOString().slice(0,7);
  document.getElementById('monthPicker').value=currentMonth;
  document.getElementById('dateIn').value=now.toISOString().slice(0,10);
  document.getElementById('dateStr').textContent=now.toLocaleDateString('en-IN',{weekday:'long',month:'long',day:'numeric'});
  document.getElementById('yearPick').value=now.getFullYear();

  // Set user display
  const name='{{ username }}';
  document.getElementById('userName').textContent=name;
  document.getElementById('userAvatar').textContent=name.charAt(0).toUpperCase();

  const [y,m]=currentMonth.split('-');
  document.getElementById('budgetMonthLbl').textContent=MF[parseInt(m)-1]+' '+y;

  renderCats();
  spawnParticles();
  loadMonth();

  document.getElementById('monthPicker').addEventListener('change',e=>{
    currentMonth=e.target.value;
    const [y2,m2]=currentMonth.split('-');
    document.getElementById('budgetMonthLbl').textContent=MF[parseInt(m2)-1]+' '+y2;
    loadMonth();
  });
  document.getElementById('yearPick').addEventListener('change',loadYear);
  document.getElementById('budgetModal').addEventListener('click',function(e){if(e.target===this)closeModal()});
}

function switchTab(t){
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c=>c.classList.remove('active'));
  document.getElementById('tab-'+t).classList.add('active');
  document.getElementById('content-'+t).classList.add('active');
  if(t==='year')loadYear();
}

function setType(t){
  entryType=t;
  const isE=t==='expense';
  document.getElementById('ttExp').className='tt'+(isE?' ae':'');
  document.getElementById('ttInc').className='tt'+(!isE?' ai':'');
  document.getElementById('subBtn').className='btn-sub '+(isE?'es':'is');
  document.getElementById('subBtn').textContent=isE?'＋ Add Expense':'＋ Add Income';
  renderCats();
}

function renderCats(){
  const cats=entryType==='expense'?CATS_EXP:CATS_INC;
  const sel=entryType==='expense'?selExp:selInc;
  document.getElementById('catGrid').innerHTML=cats.map(c=>`
    <button class="cb${c.id===sel?' act':''}" onclick="selCat('${c.id}')">
      <span class="ce">${c.emoji}</span><span class="cn">${c.name}</span>
    </button>`).join('');
  const cat=cats.find(c=>c.id===sel)||cats[0];
  document.getElementById('catPrev').textContent=cat.emoji;
  document.getElementById('mascot').textContent=MASCOTS[sel]||'🌸';
}

function selCat(id){if(entryType==='expense')selExp=id;else selInc=id;renderCats()}

async function loadMonth(){
  loading(true);
  try{
    const [summary,entries]=await Promise.all([
      api(`/api/summary?month=${currentMonth}`),
      api(`/api/entries?month=${currentMonth}`)
    ]);
    if(!summary||!entries){return}
    cachedBudget=summary.budget||0;
    cachedEntries=entries;
    renderAll(summary,entries);
  }finally{loading(false)}
}

function renderAll(summary,entries){
  const budget=summary.budget||0;
  const spent=summary.spent||0;
  const income=summary.income||0;
  const effective=Math.max(budget,income)||budget;
  const remaining=effective-spent;
  const pct=effective>0?Math.min(Math.round(spent/effective*100),100):0;

  document.getElementById('budgetNum').textContent='₹'+fmt(budget);
  document.getElementById('incNum').textContent='₹'+fmt(income);
  document.getElementById('spentNum').textContent='₹'+fmt(spent);
  document.getElementById('remNum').textContent=fmt(remaining);
  document.getElementById('pctNum').textContent=pct+'%';
  document.getElementById('progLabel').textContent=`₹${fmt(spent)} / ₹${fmt(budget)}`;

  const pf=document.getElementById('progFill');
  pf.style.width=pct+'%';
  pf.className='pf'+(pct>=90?' danger':pct>=70?' warn':'');

  const today=new Date().toISOString().slice(0,10);
  const todaySpent=entries.filter(e=>e.type==='expense'&&(e.expense_date||'').slice(0,10)===today).reduce((s,e)=>s+e.amount,0);
  document.getElementById('todayNum').textContent='₹'+fmt(todaySpent);

  const exps=entries.filter(e=>e.type==='expense');
  const incs=entries.filter(e=>e.type==='income');
  const sorted=[...entries].sort((a,b)=>(b.expense_date||'').localeCompare(a.expense_date||''));

  renderList('recentList',sorted.slice(0,40));
  renderList('expList',[...exps].sort((a,b)=>(b.expense_date||'').localeCompare(a.expense_date||'')));
  renderList('incList',[...incs].sort((a,b)=>(b.expense_date||'').localeCompare(a.expense_date||'')));

  document.getElementById('cntBadge').textContent=entries.length;
  document.getElementById('expBadge').textContent=exps.length;
  document.getElementById('incBadge').textContent=incs.length;

  // Breakdown
  const byCat={};
  exps.forEach(e=>{byCat[e.category]=(byCat[e.category]||0)+e.amount});
  const bkEl=document.getElementById('breakdown');
  if(!Object.keys(byCat).length){bkEl.innerHTML='<div class="empty" style="padding:10px"><p style="font-size:12px">No data ✨</p></div>';return}
  const maxV=Math.max(...Object.values(byCat));
  bkEl.innerHTML=Object.entries(byCat).sort((a,b)=>b[1]-a[1]).map(([cat,total])=>{
    const c=CATS_EXP.find(x=>x.id===cat)||CATS_EXP[CATS_EXP.length-1];
    const pct=maxV>0?(total/maxV*100).toFixed(1):0;
    return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:7px">
      <span style="font-size:16px;width:22px;text-align:center">${c.emoji}</span>
      <div style="flex:1">
        <div style="font-size:11px;font-weight:700;margin-bottom:3px">${c.name}</div>
        <div style="height:4px;background:rgba(255,255,255,.06);border-radius:100px;overflow:hidden"><div style="width:${pct}%;height:100%;border-radius:100px;background:${c.color}"></div></div>
      </div>
      <div style="font-size:11px;font-weight:800;color:var(--gold);white-space:nowrap">₹${fmt(total)}</div>
    </div>`;
  }).join('');
}

function renderList(cid,entries){
  const el=document.getElementById(cid);
  if(!entries.length){el.innerHTML='<div class="empty"><div class="ei">🌙</div><p style="font-size:12px">Nothing yet~</p></div>';return}
  const bd={};
  entries.forEach(e=>{const d=(e.expense_date||'').slice(0,10);if(!bd[d])bd[d]=[];bd[d].push(e)});
  el.innerHTML=Object.keys(bd).sort((a,b)=>b.localeCompare(a)).map(date=>{
    const items=bd[date];
    const dE=items.filter(e=>e.type==='expense').reduce((s,e)=>s+e.amount,0);
    const dI=items.filter(e=>e.type==='income').reduce((s,e)=>s+e.amount,0);
    const dlbl=new Date(date+'T00:00:00').toLocaleDateString('en-IN',{weekday:'short',month:'short',day:'numeric'});
    const tags=(dE>0?`<span class="dtag cp">-₹${fmt(dE)}</span>`:'')+
               (dI>0?`<span class="dtag cg"> +₹${fmt(dI)}</span>`:'');
    return `<div class="dlbl">${dlbl} ${tags}</div>${items.map(e=>itemHTML(e,dlbl)).join('')}`;
  }).join('');
}

function itemHTML(e,dlbl){
  const isI=e.type==='income';
  const cats=isI?CATS_INC:CATS_EXP;
  const c=cats.find(x=>x.id===e.category)||cats[cats.length-1];
  const sign=isI?'+':'-';
  const eid='ei'+e.id;
  return `
    <div class="eitem${isI?' ii':''}" id="${eid}">
      <div class="eico" style="background:${c.color}22;border:1px solid ${c.color}44">${c.emoji}</div>
      <div class="einfo">
        <div class="edesc">${e.description||c.name}</div>
        <div class="emeta">${c.name} · ${dlbl}</div>
      </div>
      <div class="eamt ${isI?'ai':'ae'}">${sign}₹${fmt(e.amount)}</div>
      <button class="bico ed" onclick="toggleEdit(${e.id})" title="Edit">✏️</button>
      <button class="bico" onclick="delEntry(${e.id})" title="Delete">✕</button>
    </div>
    <div class="edit-row" id="er${e.id}">
      <input class="ei2" id="ed${e.id}d" value="${(e.description||'').replace(/"/g,'&quot;')}" placeholder="Description">
      <input class="ei2" id="ed${e.id}a" type="number" value="${e.amount}" style="max-width:85px">
      <button class="bsv" onclick="saveEdit(${e.id})">Save</button>
      <button class="bcx" onclick="toggleEdit(${e.id})">Cancel</button>
    </div>`;
}

function toggleEdit(id){document.getElementById('er'+id)?.classList.toggle('open')}

async function saveEdit(id){
  const desc=document.getElementById('ed'+id+'d')?.value.trim();
  const amt=parseFloat(document.getElementById('ed'+id+'a')?.value);
  if(!amt||amt<=0){showToast('Invalid amount!',true);return}
  loading(true);
  const r=await api(`/api/entries/${id}`,{method:'PUT',body:JSON.stringify({description:desc,amount:amt})});
  if(r?.success){showToast('Updated! ✨');await loadMonth()}
  else{loading(false);showToast('Update failed',true)}
}

async function addEntry(){
  const amt=parseFloat(document.getElementById('amtIn').value);
  const desc=document.getElementById('descIn').value.trim();
  const date=document.getElementById('dateIn').value;
  const catId=entryType==='expense'?selExp:selInc;
  const cats=entryType==='expense'?CATS_EXP:CATS_INC;
  const cat=cats.find(c=>c.id===catId);
  if(!amt||amt<=0){showToast('Enter a valid amount!',true);return}
  if(!date){showToast('Pick a date!',true);return}
  loading(true);
  const r=await api('/api/entries',{method:'POST',body:JSON.stringify({month:currentMonth,type:entryType,category:catId,description:desc,amount:amt,date})});
  if(r?.success){
    document.getElementById('amtIn').value='';
    document.getElementById('descIn').value='';
    showToast(`${entryType==='expense'?'Expense':'Income'} ₹${fmt(amt)} saved! ${cat?.emoji||''}`);
    await loadMonth();
  }else{loading(false);showToast('Failed to save',true)}
}

async function delEntry(id){
  loading(true);
  const r=await api(`/api/entries/${id}`,{method:'DELETE'});
  if(r?.success){showToast('Removed! 🗑️');await loadMonth()}
  else{loading(false);showToast('Delete failed',true)}
}

function openBudgetModal(){
  document.getElementById('budgetIn').value=cachedBudget||'';
  document.getElementById('budgetModal').classList.add('active');
}
function closeModal(){document.getElementById('budgetModal').classList.remove('active')}

async function saveBudget(){
  const amt=parseFloat(document.getElementById('budgetIn').value);
  if(!amt||amt<=0){showToast('Enter a valid budget!',true);return}
  loading(true);
  const r=await api('/api/budget',{method:'POST',body:JSON.stringify({month:currentMonth,amount:amt})});
  if(r?.success){closeModal();showToast(`Budget ₹${fmt(amt)} set! ✨`);await loadMonth()}
  else{loading(false);showToast('Failed to save budget',true)}
}

async function loadYear(){
  const year=document.getElementById('yearPick').value;
  loading(true);
  const data=await api(`/api/year?year=${year}`);
  loading(false);
  if(!data)return;
  let totalInc=0,totalSp=0;
  const mdata=[];
  for(let m=1;m<=12;m++){
    const key=`${year}-${String(m).padStart(2,'0')}`;
    const d=data[key]||{budget:0,spent:0,income:0};
    totalInc+=d.income;totalSp+=d.spent;
    mdata.push({name:MN[m-1],...d});
  }
  const net=totalInc-totalSp;
  document.getElementById('yrInc').textContent='₹'+fmt(totalInc);
  document.getElementById('yrSp').textContent='₹'+fmt(totalSp);
  const yrN=document.getElementById('yrNet');
  yrN.textContent=(net>=0?'+':'-')+' ₹'+fmt(Math.abs(net));
  yrN.className='yn '+(net>=0?'cm':'cp');

  document.getElementById('moGrid').innerHTML=mdata.map(m=>{
    const eff=Math.max(m.budget,m.income)||0;
    const pct=eff>0?Math.min(Math.round(m.spent/eff*100),100):0;
    const has=m.budget>0||m.income>0||m.spent>0;
    return `<div class="mocard" style="${!has?'opacity:.35':''}">
      <div class="mn">${m.name}</div>
      <div class="mb">${m.budget>0?'₹'+fmt(m.budget):'<span style="color:var(--muted);font-size:10px">No budget</span>'}</div>
      ${m.income>0?`<div class="mi">+₹${fmt(m.income)}</div>`:''}
      ${m.spent>0?`<div class="ms">-₹${fmt(m.spent)}${eff>0?' ('+pct+'%)':''}</div>`:`<div class="ms" style="opacity:.3">No expenses</div>`}
      <div class="mbar"><div class="mfill${pct>=100?' over':''}" style="width:${pct}%"></div></div>
    </div>`;
  }).join('');

  if(totalInc>0||totalSp>0){
    document.getElementById('roBox').style.display='block';
    document.getElementById('roNum').textContent=(net>=0?'+':'-')+' ₹'+fmt(Math.abs(net));
    document.getElementById('roSub').textContent=net>=0?`🎉 Saved ₹${fmt(net)} in ${year}!`:`⚠️ Overspent ₹${fmt(Math.abs(net))} in ${year}`;
    const sr=totalInc>0?Math.round(net/totalInc*100):0;
    const avg=Math.round(totalSp/12);
    const top=mdata.reduce((a,b)=>b.spent>a.spent?b:a,mdata[0]);
    document.getElementById('roGrid').innerHTML=`
      <div class="roc"><div class="rocn co">₹${fmt(avg)}</div><div class="rocl">Avg/Month</div></div>
      <div class="roc"><div class="rocn ${sr>=0?'cm':'cp'}">${sr}%</div><div class="rocl">Savings Rate</div></div>
      <div class="roc"><div class="rocn cp">${top.name}</div><div class="rocl">Most Spent</div></div>`;
  }else{document.getElementById('roBox').style.display='none'}
}

async function doLogout(){
  await api('/api/logout',{method:'POST'});
  window.location.href='/';
}

function showToast(msg,isErr=false){
  const t=document.getElementById('toast');
  document.getElementById('tMsg').textContent=msg;
  document.getElementById('tIcon').textContent=isErr?'❌':'✅';
  t.className='toast'+(isErr?' err':'')+' show';
  setTimeout(()=>t.classList.remove('show'),3000);
}

function spawnParticles(){
  const c=document.getElementById('particles');
  const sh=['🌸','⭐','✨','💫'];
  const cl=['#FF6B9D','#7EC8E3','#FFD166','#C77DFF','#06D6A0'];
  for(let i=0;i<14;i++){
    const p=document.createElement('div');
    if(Math.random()>.5){p.textContent=sh[Math.floor(Math.random()*sh.length)];p.style.cssText=`position:absolute;font-size:${Math.random()*10+7}px;left:${Math.random()*100}%;animation:fp ${Math.random()*14+9}s ${Math.random()*9}s linear infinite;opacity:0;pointer-events:none`}
    else{const sz=Math.random()*3+2;p.style.cssText=`position:absolute;width:${sz}px;height:${sz}px;border-radius:50%;background:${cl[Math.floor(Math.random()*cl.length)]};left:${Math.random()*100}%;animation:fp ${Math.random()*16+9}s ${Math.random()*9}s linear infinite;opacity:0;pointer-events:none`}
    c.appendChild(p);
  }
}

init();