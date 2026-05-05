function showTab(t){
  document.getElementById('formLogin').style.display  = t==='login'  ? '' : 'none';
  document.getElementById('formSignup').style.display = t==='signup' ? '' : 'none';
  document.getElementById('tabLogin').className  = 'auth-tab' + (t==='login'  ? ' active' : '');
  document.getElementById('tabSignup').className = 'auth-tab' + (t==='signup' ? ' active' : '');
  hideErr();
}

function showErr(msg){ const e=document.getElementById('errMsg'); e.textContent=msg; e.classList.add('show'); }
function hideErr(){ document.getElementById('errMsg').classList.remove('show'); }

async function doLogin(){
  const user=document.getElementById('lUser').value.trim();
  const pass=document.getElementById('lPass').value;
  if(!user||!pass){ showErr('Please fill all fields'); return; }
  hideErr();
  try{
    const r=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:user,password:pass})});
    const d=await r.json();
    if(d.success) window.location.href='/';
    else showErr(d.error||'Login failed');
  }catch(e){ showErr('Server error. Is the app running?'); }
}

async function doSignup(){
  const name=document.getElementById('sName').value.trim();
  const user=document.getElementById('sUser').value.trim();
  const pass=document.getElementById('sPass').value;
  if(!name||!user||!pass){ showErr('Please fill all fields'); return; }
  hideErr();
  try{
    const r=await fetch('/api/signup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({display_name:name,username:user,password:pass})});
    const d=await r.json();
    if(d.success) window.location.href='/';
    else showErr(d.error||'Signup failed');
  }catch(e){ showErr('Server error. Is the app running?'); }
}

// Enter key support
document.addEventListener('keydown', e => { if(e.key==='Enter'){ const t=document.getElementById('formSignup').style.display==='none'?'Login':'Signup'; t==='Login'?doLogin():doSignup(); } });

// Particles
(function(){
  const c=document.getElementById('particles');
  const shapes=['🌸','⭐','✨','💫','🌟'];
  const colors=['#FF6B9D','#7EC8E3','#FFD166','#C77DFF'];
  for(let i=0;i<16;i++){
    const p=document.createElement('div');
    if(Math.random()>.45){
      p.textContent=shapes[Math.floor(Math.random()*shapes.length)];
      p.style.cssText=`position:absolute;font-size:${Math.random()*12+7}px;left:${Math.random()*100}%;animation:fp ${Math.random()*14+9}s ${Math.random()*10}s linear infinite;opacity:0`;
    }else{
      const sz=Math.random()*3+2;
      p.style.cssText=`position:absolute;width:${sz}px;height:${sz}px;border-radius:50%;background:${colors[Math.floor(Math.random()*colors.length)]};left:${Math.random()*100}%;animation:fp ${Math.random()*16+9}s ${Math.random()*10}s linear infinite;opacity:0`;
    }
    c.appendChild(p);
  }
})();