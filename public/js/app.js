const LOGO='img/logo.webp';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)],API=location.protocol==='file:'?'http://localhost:3000':'';
let lang=localStorage.lang||'fa',mode='signup';
const S={fa:{login:'ورود',out:'خروج',signup:'ثبت‌نام',sending:'در حال ارسال...',ok:'پیام شما ارسال شد ✅',hi:'خوش آمدید!',err:'خطایی رخ داد، دوباره تلاش کنید',live:'مشاهده زنده',other:'EN'},
 en:{login:'Login',out:'Logout',signup:'Sign Up',sending:'Sending...',ok:'Message sent ✅',hi:'Welcome!',err:'Something went wrong. Try again',live:'Live Demo',other:'فا'}};
const NAV=[['index','خانه','Home'],['services','خدمات','Services'],['portfolio','نمونه‌کارها','Portfolio'],['about','درباره ما','About'],['contact','تماس با ما','Contact']];
const DEMOS=[
 ['doctor','دکتر من','Doctor Man','سلامت','Health','سایت معرفی خدمات سلامت، نوبت‌دهی پزشکان و مشاوره آنلاین.','Healthcare services site with doctor booking and online consultation.',['HTML','CSS','JS']],
 ['coffee','قهوه سحرگاه','Sahargah Coffee','کافه','Café','سایت کافه با منوی کامل، معرفی و ثبت سفارش.','Café website with full menu, story and ordering.',['HTML','CSS','JS']],
 ['learnix','Learnix','Learnix','آموزش','Education','پلتفرم آموزش برنامه‌نویسی با دوره‌ها و مسیر یادگیری.','Coding education platform with courses and learning paths.',['HTML','CSS','UI/UX']]];
const user=()=>{try{return JSON.parse(localStorage.user)}catch{return null}};
function layout(){
 const cur=(location.pathname.split('/').pop()||'index.html').replace('.html','');
 $('#hdr').innerHTML=`<a href="index.html" aria-label="Codin"><img src="${LOGO}" alt="Codin" width="90" height="40"></a><nav id="nav">${NAV.map(n=>`<a href="${n[0]}.html" data-fa="${n[1]}" data-en="${n[2]}"${cur==n[0]?' class="on"':''}></a>`).join('')}</nav><div class="hb"><button class="b o" id="auth"></button><button class="b" id="lang"></button><button id="mb" aria-label="menu"><b></b><b></b><b></b></button></div>`;
 $('#ftr').innerHTML=`<div class="w"><div><img src="${LOGO}" alt="Codin" width="90" height="40" loading="lazy"><p data-fa="راهکارهای دیجیتال امن، سریع و مقیاس‌پذیر." data-en="Secure, fast, scalable digital solutions."></p></div><ul>${NAV.map(n=>`<li><a href="${n[0]}.html" data-fa="${n[1]}" data-en="${n[2]}"></a></li>`).join('')}</ul><ul dir="ltr"><li>Codin.co@gmail.com</li><li>+98 912 100 0100</li></ul></div><p class="cp" data-fa="© ۲۰۲۶ Codin. تمامی حقوق محفوظ است." data-en="© 2026 Codin. All rights reserved."></p>`;
 document.body.insertAdjacentHTML('beforeend',`<dialog id="dlg"><div class="tabs"><button id="tS" type="button"></button><button id="tL" type="button"></button></div><form data-api id="af"><div id="nm"><label data-fa="نام و نام خانوادگی" data-en="Full name"></label><input name="name" minlength="2"></div><label data-fa="ایمیل" data-en="Email"></label><input name="email" type="email" required><label data-fa="رمز عبور (حداقل ۸ کاراکتر)" data-en="Password (min 8 chars)"></label><input name="password" type="password" minlength="8" required><button class="b"></button><div class="msg"></div></form></dialog>`);
 $('#mb').onclick=()=>document.body.classList.toggle('mo');$$('#nav a').forEach(a=>a.onclick=()=>document.body.classList.remove('mo'));document.addEventListener('click',e=>{if(document.body.classList.contains('mo')&&!e.target.closest('#nav,#mb'))document.body.classList.remove('mo')});document.addEventListener('keydown',e=>e.key=='Escape'&&document.body.classList.remove('mo'));
 $('#lang').onclick=()=>{lang=lang=='fa'?'en':'fa';localStorage.lang=lang;apply()};
 $('#auth').onclick=()=>user()?(localStorage.removeItem('token'),localStorage.removeItem('user'),apply(),document.dispatchEvent(new Event('authchange'))):$('#dlg').showModal();
 $('#tS').onclick=()=>setMode('signup');$('#tL').onclick=()=>setMode('login');
 $('#dlg').onclick=e=>e.target.id=='dlg'&&e.target.close();
}
function setMode(m){mode=m;apply()}
function apply(){
 document.documentElement.lang=lang;document.documentElement.dir=lang=='fa'?'rtl':'ltr';document.body.classList.toggle('en',lang=='en');
 $$('[data-en]').forEach(e=>{e.dataset.fa??=e.textContent;e.textContent=e.dataset[lang]});
 const s=S[lang],u=user();$('#lang').textContent=s.other;$('#auth').textContent=u?`${u.name} · ${s.out}`:s.login;
 $('#tS').textContent=s.signup;$('#tL').textContent=s.login;$('#tS').className=mode=='signup'?'on':'';$('#tL').className=mode=='login'?'on':'';
 $('#nm').style.display=mode=='signup'?'block':'none';$('#nm input').required=mode=='signup';
 $('#af').dataset.api=mode=='signup'?'/api/register':'/api/login';$('#af .b').textContent=mode=='signup'?s.signup:s.login;
 $$('[data-demos]').forEach(box=>{const n=+box.dataset.demos||9;box.innerHTML=DEMOS.slice(0,n).map(d=>{const i=lang=='fa'?0:1;return `<article class="card demo"><div class="shot"><span class="cat">${d[3+i]}</span><iframe src="demos/${d[0]}.html" loading="lazy" tabindex="-1" title="${d[1+i]}"></iframe><a href="demos/${d[0]}.html" aria-label="${d[1+i]}"></a></div><div class="in"><h3>${d[1+i]}</h3><p>${d[5+i]}</p><div class="tags">${d[7].map(t=>`<span>${t}</span>`).join('')}</div><a class="b" href="demos/${d[0]}.html">${s.live}</a></div></article>`}).join('')});
}
// all forms with data-api post JSON to the backend
document.addEventListener('submit',async e=>{
 const f=e.target;if(f.dataset.api===undefined)return;e.preventDefault();
 const m=f.querySelector('.msg'),btn=f.querySelector('.b'),s=S[lang];btn.disabled=true;m.className='msg';m.textContent=s.sending;
 try{
  const r=await fetch(API+f.dataset.api,{method:'POST',headers:{'content-type':'application/json','accept-language':lang},body:JSON.stringify(Object.fromEntries(new FormData(f)))});
  const j=await r.json().catch(()=>({}));if(!r.ok)throw Error(j.error||s.err);
  if(j.token){localStorage.token=j.token;localStorage.user=JSON.stringify(j.user)}
  m.className='msg ok';m.textContent=j.token?s.hi:s.ok;f.reset();
  if(j.token)setTimeout(()=>{$('#dlg').close();apply();document.dispatchEvent(new Event('authchange'))},700);
 }catch(x){m.className='msg er';m.textContent=x.message==='Failed to fetch'?s.err:x.message}
 btn.disabled=false;
});
layout();apply();

if('IntersectionObserver'in window){const o=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');o.unobserve(e.target)}}),{threshold:.1});$$('.card:not(.demo),.st,.ss').forEach(e=>{e.classList.add('rv');o.observe(e)})}

// ---- special effects ----
const calm=matchMedia('(prefers-reduced-motion:reduce)').matches,hov=matchMedia('(hover:hover)').matches;
// scroll progress bar
document.body.insertAdjacentHTML('afterbegin','<div id="sp"></div>');
addEventListener('scroll',()=>{$('#sp').style.transform=`scaleX(${scrollY/Math.max(1,document.documentElement.scrollHeight-innerHeight)})`},{passive:true});
// cursor spotlight on cards + 3D tilt on window/demo cards
document.addEventListener('pointermove',e=>{
 const c=e.target.closest&&e.target.closest('.card');if(c){const r=c.getBoundingClientRect();c.style.setProperty('--x',e.clientX-r.left+'px');c.style.setProperty('--y',e.clientY-r.top+'px')}
 if(!hov||calm)return;
 $$('.win,.demo').forEach(t=>{if(t.matches(':hover')){const r=t.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;t.style.transform=`perspective(900px) rotateY(${x*9}deg) rotateX(${-y*9}deg) translateY(-4px)`}else t.style.transform=''})
});
// animated counters
$$('.stats h3').forEach(h=>{const t=h.textContent,m=t.match(/[۰-۹]+/);if(!m||t.includes('/')||calm)return;
 const n=+m[0].replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d)),f=v=>String(v).replace(/\d/g,d=>'۰۱۲۳۴۵۶۷۸۹'[d]);
 new IntersectionObserver((es,o)=>es.forEach(e=>{if(!e.isIntersecting)return;o.disconnect();const s=performance.now(),k=now=>{const p=Math.min(1,(now-s)/1400);h.textContent=t.replace(m[0],f(Math.round(n*(1-Math.pow(1-p,3)))));p<1&&requestAnimationFrame(k)};requestAnimationFrame(k)})).observe(h)});
// hero particle network (follows the pointer, pauses off-screen)
const hero=$('.hero');if(hero&&!calm){
 const cv=document.createElement('canvas');cv.className='pc';hero.prepend(cv);const x=cv.getContext('2d');let W,H,ps=[],mx=-999,my=-999,run=true;
 const size=()=>{W=cv.width=hero.clientWidth;H=cv.height=hero.clientHeight;const n=W<600?26:55;ps=Array.from({length:n},()=>({x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-.5)*.5,vy:(Math.random()-.5)*.5}))};size();addEventListener('resize',size);
 hero.addEventListener('pointermove',e=>{const r=hero.getBoundingClientRect();mx=e.clientX-r.left;my=e.clientY-r.top});hero.addEventListener('pointerleave',()=>mx=my=-999);
 new IntersectionObserver(es=>{run=es[0].isIntersecting;run&&draw()}).observe(hero);
 function draw(){if(!run)return;x.clearRect(0,0,W,H);
  for(const p of ps){p.x+=p.vx;p.y+=p.vy;if(p.x<0||p.x>W)p.vx*=-1;if(p.y<0||p.y>H)p.vy*=-1;const dx=p.x-mx,dy=p.y-my,d=Math.hypot(dx,dy);if(d<130){p.x+=dx/d*1.2;p.y+=dy/d*1.2}x.fillStyle='rgba(0,210,255,.8)';x.beginPath();x.arc(p.x,p.y,1.8,0,6.3);x.fill()}
  for(let i=0;i<ps.length;i++)for(let j=i+1;j<ps.length;j++){const d=Math.hypot(ps[i].x-ps[j].x,ps[i].y-ps[j].y);if(d<120){x.strokeStyle=`rgba(${j%2?157:0},${j%2?0:210},255,${.35*(1-d/120)})`;x.beginPath();x.moveTo(ps[i].x,ps[i].y);x.lineTo(ps[j].x,ps[j].y);x.stroke()}}
  requestAnimationFrame(draw)}}
