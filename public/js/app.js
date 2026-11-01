const LOGO='img/logo.png';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)],API=location.protocol==='file:'?'http://localhost:3000':'';
let lang=localStorage.lang||'fa',mode='signup';
const S={fa:{login:'ورود',out:'خروج',signup:'ثبت‌نام',sending:'در حال ارسال...',ok:'پیام شما ارسال شد ✅',hi:'خوش آمدید!',err:'خطایی رخ داد، دوباره تلاش کنید',live:'مشاهده زنده',prev:'قبلی',next:'بعدی',other:'EN'},
 en:{login:'Login',out:'Logout',signup:'Sign Up',sending:'Sending...',ok:'Message sent ✅',hi:'Welcome!',err:'Something went wrong. Try again',live:'Live Demo',prev:'Previous',next:'Next',other:'فا'}};
const NAV=[['index','خانه','Home'],['services','خدمات','Services'],['portfolio','نمونه‌کارها','Portfolio'],['about','درباره ما','About'],['contact','تماس با ما','Contact']];
const DEMOS=[
 ['doctor','دکتر من','Doctor Man','سلامت','Health','سایت معرفی خدمات سلامت، نوبت‌دهی پزشکان و مشاوره آنلاین.','Healthcare services site with doctor booking and online consultation.',['HTML','CSS','JS']],
 ['coffee','قهوه سحرگاه','Sahargah Coffee','کافه','Café','سایت کافه با منوی کامل، معرفی و ثبت سفارش.','Café website with full menu, story and ordering.',['HTML','CSS','JS']],
 ['learnix','Learnix','Learnix','آموزش','Education','پلتفرم آموزش برنامه‌نویسی با دوره‌ها و مسیر یادگیری.','Coding education platform with courses and learning paths.',['HTML','CSS','UI/UX']]];
const user=()=>{try{return JSON.parse(localStorage.user)}catch{return null}};

// ---- home showcase slider: intro video + live demos, auto-advancing ----
const SL={i:0,tm:0,hover:false,vis:true,bound:false,sw:false};
function renderSlider(box){
 const L=lang=='fa'?0:1,s=S[lang],n=DEMOS.length+1,reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
 const chev='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>';
 box.innerHTML=`<div class="slv" tabindex="0" role="region" aria-roledescription="carousel" aria-label="Codin"><div class="sl"><video poster="video/intro-poster.jpg" muted playsinline preload="auto" aria-label="Codin intro"><source src="video/intro.mp4" type="video/mp4"></video></div>${DEMOS.map(d=>`<div class="sl"><iframe data-src="demos/${d[0]}.html" tabindex="-1" title="${d[1+L]}"></iframe><a class="ov" href="demos/${d[0]}.html" aria-label="${d[1+L]}"></a><div class="cap"><span class="cat">${d[3+L]}</span><h3>${d[1+L]}</h3><p>${d[5+L]}</p><a class="b" href="demos/${d[0]}.html">${s.live}</a></div></div>`).join('')}<button type="button" class="ar pv" aria-label="${s.prev}">${chev}</button><button type="button" class="ar nx" aria-label="${s.next}">${chev}</button></div><div class="dots">${Array.from({length:n},(_,k)=>`<button type="button" aria-label="${k+1}"></button>`).join('')}</div>`;
 const slv=box.querySelector('.slv'),slides=[...box.querySelectorAll('.sl')],dots=[...box.querySelectorAll('.dots button')],v=box.querySelector('video');
 v.muted=true;if(reduced)v.controls=true;
 const fit=()=>{const w=slv.clientWidth,h=slv.clientHeight,k=w/1280;slides.forEach(sl=>{const f=sl.querySelector('iframe');if(f){f.style.width='1280px';f.style.height=(h/k)+'px';f.style.transform=`scale(${k})`}})};
 const stop=()=>clearTimeout(SL.tm);
 const play=()=>{stop();if(reduced||SL.hover||!SL.vis||document.hidden)return;SL.tm=setTimeout(()=>go(SL.i+1),SL.i==0?12000:6000)};
 function go(k){
  SL.i=(k+n)%n;
  slides.forEach((sl,j)=>{let o=j-SL.i;if(o>n/2)o-=n;if(o<-n/2)o+=n;sl.style.setProperty('--o',o);sl.classList.toggle('on',o==0);sl.inert=o!=0;
   const f=sl.querySelector('iframe');if(f&&!f.src&&Math.abs(o)<=1)f.src=f.dataset.src});
  dots.forEach((d,j)=>d.classList.toggle('on',j==SL.i));
  v.pause();if(SL.i==0&&!reduced){v.currentTime=0;v.play().catch(()=>{})}
  play();
 }
 SL.go=go;SL.play=play;SL.stop=stop;
 box.querySelector('.pv').addEventListener('click',()=>go(SL.i-1));
 box.querySelector('.nx').addEventListener('click',()=>go(SL.i+1));
 dots.forEach((d,j)=>d.addEventListener('click',()=>go(j)));
 v.addEventListener('ended',()=>{if(SL.i==0&&!SL.hover&&!reduced)go(1)});
 slv.addEventListener('mouseenter',()=>{SL.hover=true;stop()});
 slv.addEventListener('mouseleave',()=>{SL.hover=false;play()});
 slv.addEventListener('keydown',e=>{if(e.key=='ArrowRight'||e.key=='ArrowLeft'){const r=document.documentElement.dir=='rtl';go(SL.i+((e.key=='ArrowRight')!=r?1:-1))}});
 let x0=null;
 slv.addEventListener('pointerdown',e=>{x0=e.clientX});
 slv.addEventListener('pointerup',e=>{if(x0==null)return;const dx=e.clientX-x0;x0=null;if(Math.abs(dx)>50){SL.sw=true;setTimeout(()=>SL.sw=false,80);go(SL.i+((dx<0)==(lang=='en')?1:-1))}});
 slv.addEventListener('click',e=>{if(SL.sw){e.preventDefault();e.stopPropagation()}},true);
 new ResizeObserver(fit).observe(slv);fit();
 if(!SL.bound){SL.bound=true;
  new IntersectionObserver(es=>{SL.vis=es[0].isIntersecting;if(SL.vis)SL.go(SL.i);else{SL.stop();document.querySelector('.slv video')?.pause()}}).observe(box);
  document.addEventListener('visibilitychange',()=>{if(document.hidden){SL.stop();document.querySelector('.slv video')?.pause()}else if(SL.vis)SL.go(SL.i)})}
 go(SL.i);
}
function layout(){
 const cur=(location.pathname.split('/').pop()||'index.html').replace('.html','');
 $('#hdr').innerHTML=`<a href="index.html" aria-label="Codin"><img src="${LOGO}" alt="Codin" width="132" height="44"></a><nav id="nav">${NAV.map(n=>`<a href="${n[0]}.html" data-fa="${n[1]}" data-en="${n[2]}"${cur==n[0]?' class="on"':''}></a>`).join('')}</nav><div class="hb"><button class="b o" id="auth"></button><button class="b" id="lang"></button><button id="mb" aria-label="menu"><b></b><b></b><b></b></button></div>`;
 $('#ftr').innerHTML=`<div class="w"><div><img src="${LOGO}" alt="Codin" width="132" height="44" loading="lazy"><p data-fa="راهکارهای دیجیتال امن، سریع و مقیاس‌پذیر." data-en="Secure, fast, scalable digital solutions."></p></div><ul>${NAV.map(n=>`<li><a href="${n[0]}.html" data-fa="${n[1]}" data-en="${n[2]}"></a></li>`).join('')}</ul><ul dir="ltr"><li>Codin.co@gmail.com</li><li>+98 912 100 0100</li></ul></div><p class="cp" data-fa="© ۲۰۲۶ Codin. تمامی حقوق محفوظ است." data-en="© 2026 Codin. All rights reserved."></p>`;
 document.body.insertAdjacentHTML('beforeend',`<dialog id="dlg"><div class="tabs"><button id="tS" type="button"></button><button id="tL" type="button"></button></div><form data-api id="af"><div id="nm"><label data-fa="نام و نام خانوادگی" data-en="Full name"></label><input name="name" minlength="2"></div><label data-fa="ایمیل" data-en="Email"></label><input name="email" type="email" required><label data-fa="رمز عبور (حداقل ۸ کاراکتر)" data-en="Password (min 8 chars)"></label><input name="password" type="password" minlength="8" required><button class="b"></button><div class="msg"></div></form></dialog>`);
 $('#mb').onclick=()=>document.body.classList.toggle('mo');$$('#nav a').forEach(a=>a.onclick=()=>document.body.classList.remove('mo'));document.addEventListener('click',e=>{if(document.body.classList.contains('mo')&&!e.target.closest('#nav,#mb'))document.body.classList.remove('mo')});document.addEventListener('keydown',e=>e.key=='Escape'&&document.body.classList.remove('mo'));
 $('#lang').onclick=()=>{lang=lang=='fa'?'en':'fa';localStorage.lang=lang;apply()};
 $('#auth').onclick=()=>user()?(localStorage.removeItem('token'),localStorage.removeItem('user'),apply(),document.dispatchEvent(new Event('authchange'))):$('#dlg').showModal();
 $('#tS').onclick=()=>setMode('signup');$('#tL').onclick=()=>setMode('login');
 $('#dlg').onclick=e=>{if(e.target.id=='dlg')e.target.close()};
}
function setMode(m){mode=m;apply()}
function apply(){
 document.documentElement.lang=lang;document.documentElement.dir=lang=='fa'?'rtl':'ltr';document.body.classList.toggle('en',lang=='en');
 $$('[data-en]').forEach(e=>{e.dataset.fa??=e.textContent;e.textContent=e.dataset[lang]});
 const s=S[lang],u=user();$('#lang').textContent=s.other;$('#auth').textContent=u?`${u.name} · ${s.out}`:s.login;
 $('#tS').textContent=s.signup;$('#tL').textContent=s.login;$('#tS').className=mode=='signup'?'on':'';$('#tL').className=mode=='login'?'on':'';
 $('#nm').style.display=mode=='signup'?'block':'none';$('#nm input').required=mode=='signup';
 $('#af').dataset.api=mode=='signup'?'/api/register':'/api/login';$('#af .b').textContent=mode=='signup'?s.signup:s.login;
 $$('[data-slider]').forEach(renderSlider);
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

// ---- extra visual effects (v4) ----
(()=>{
 const reduced=matchMedia('(prefers-reduced-motion:reduce)').matches,fine=matchMedia('(hover:hover)').matches,q=s=>document.querySelector(s);
 const st=document.createElement('style');st.textContent=`
 #spl{position:fixed;inset:0;z-index:9999;display:grid;place-items:center;background:#0b0d17;transition:opacity .6s,visibility .6s}#spl.x{opacity:0;visibility:hidden}
 #spl img{width:min(240px,60vw);background:#fff;border-radius:18px;padding:12px 18px;animation:spi 1s ease-out both}@keyframes spi{from{opacity:0;transform:scale(.8)}}
 #spl i{position:absolute;bottom:18%;width:120px;height:3px;border-radius:3px;background:var(--g);animation:spb .9s ease-in-out infinite alternate}@keyframes spb{to{transform:scaleX(.2)}}
 .aur{position:fixed;inset:0;z-index:-1;overflow:hidden;pointer-events:none}.aur b{position:absolute;width:46vmax;height:46vmax;border-radius:50%;filter:blur(90px);opacity:.28;animation:au 22s ease-in-out infinite alternate}
 .aur b:nth-child(1){background:#9d00ff;top:-15%;left:-10%}.aur b:nth-child(2){background:#00d2ff;bottom:-20%;right:-10%;animation-delay:-8s}.aur b:nth-child(3){background:#3b5bff;top:35%;left:40%;opacity:.16;animation-delay:-14s}
 @keyframes au{to{transform:translate(12vw,8vh) scale(1.2)}}
 #cg{position:fixed;left:0;top:0;width:340px;height:340px;margin:-170px 0 0 -170px;border-radius:50%;pointer-events:none;z-index:60;background:radial-gradient(circle,rgba(0,210,255,.13),rgba(157,0,255,.07) 45%,transparent 70%);mix-blend-mode:screen;will-change:transform}
 #up{position:fixed;bottom:22px;inset-inline-end:22px;z-index:55;width:48px;height:48px;border-radius:50%;border:0;cursor:pointer;color:#fff;background:conic-gradient(var(--b) calc(var(--p,0)*1%),rgba(255,255,255,.12) 0);display:grid;place-items:center;opacity:0;visibility:hidden;transform:translateY(20px);transition:.35s}
 #up:after{content:"";position:absolute;inset:3px;border-radius:50%;background:#0b0d17}#up svg{position:relative;z-index:1;width:20px;height:20px}#up.on{opacity:1;visibility:visible;transform:none}
 .rot{font:800 clamp(1.2rem,2.6vw,1.7rem) Vazirmatn,sans-serif;margin:-6px 0 16px;min-height:2.2rem;background:var(--g);-webkit-background-clip:text;background-clip:text;color:transparent;width:max-content;max-width:100%}.rot i{display:inline-block;width:3px;height:1.1em;margin-inline-start:4px;vertical-align:-.15em;background:var(--b);animation:bl .8s steps(1) infinite}@keyframes bl{50%{opacity:0}}
 .tsl{display:flex!important;gap:22px;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;padding:6px 2px 10px}.tsl::-webkit-scrollbar{display:none}.tsl>.card{flex:0 0 min(360px,85%);scroll-snap-align:start}
 .tdots{display:flex;justify-content:center;gap:8px;margin-top:16px}.tdots button{width:10px;height:10px;padding:0;border:0;border-radius:10px;background:rgba(255,255,255,.25);cursor:pointer;transition:.3s}.tdots .on{width:32px;background:var(--g)}
 .b.big{will-change:transform}.tsl>.card{opacity:1!important;transform:none!important}
 @media(max-width:850px){#cg{display:none}}`;document.head.appendChild(st);
 // splash (once per session)
 if(!sessionStorage.spl&&!reduced){sessionStorage.spl=1;const d=document.createElement('div');d.id='spl';d.innerHTML=`<img src="${LOGO}" alt="Codin"><i></i>`;document.body.appendChild(d);const hide=()=>{d.classList.add('x');setTimeout(()=>d.remove(),700)};setTimeout(hide,1100);setTimeout(hide,3000)}
 // aurora background
 document.body.insertAdjacentHTML('afterbegin','<div class="aur"><b></b><b></b><b></b></div>');
 // soft cursor glow
 if(fine&&!reduced){const g=document.createElement('div');g.id='cg';document.body.appendChild(g);let tx=-999,ty=-999,x=tx,y=ty;addEventListener('pointermove',e=>{tx=e.clientX;ty=e.clientY},{passive:true});
  (function f(){x+=(tx-x)*.14;y+=(ty-y)*.14;g.style.transform=`translate(${x}px,${y}px)`;requestAnimationFrame(f)})();
  // magnetic big buttons
  document.addEventListener('pointermove',e=>{document.querySelectorAll('.b.big').forEach(b=>{const r=b.getBoundingClientRect(),dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2);b.style.transform=Math.hypot(dx,dy)<90?`translate(${dx*.25}px,${dy*.35}px)`:''})},{passive:true})}
 // back-to-top with progress ring
 const up=document.createElement('button');up.id='up';up.setAttribute('aria-label','Top');up.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 15l6-6 6 6"/></svg>';document.body.appendChild(up);
 up.addEventListener('click',()=>scrollTo({top:0,behavior:'smooth'}));
 addEventListener('scroll',()=>{up.style.setProperty('--p',Math.round(scrollY/Math.max(1,document.documentElement.scrollHeight-innerHeight)*100));up.classList.toggle('on',scrollY>500)},{passive:true});
 // rotating typewriter line under the hero title
 const rot=q('.rot');if(rot){const W={fa:['وب‌سایت اختصاصی','اپلیکیشن موبایل','امنیت و شبکه','هوش مصنوعی'],en:['Custom websites','Mobile apps','Security & networks','AI solutions']};let wi=0,ci=0,del=false;const t=document.createElement('span');rot.prepend(t);
  (function tick(){const w=W[lang][wi%4];if(reduced){t.textContent=w;return}t.textContent=w.slice(0,ci);let d=del?35:80;if(!del&&ci==w.length){del=true;d=1400}else if(del&&ci==0){del=false;wi++;d=300}else ci+=del?-1:1;setTimeout(tick,d)})()}
 // auto-sliding testimonials
 const ts=q('.tsl');if(ts){const cs=[...ts.children],dots=document.createElement('div');dots.className='tdots';cs.forEach((c,i)=>{const b=document.createElement('button');b.type='button';b.setAttribute('aria-label',i+1);b.onclick=()=>go(i);dots.appendChild(b)});ts.after(dots);
  let cur=0,hold=false;const mark=()=>[...dots.children].forEach((d,i)=>d.classList.toggle('on',i==cur));
  const go=i=>{cur=(i+cs.length)%cs.length;const a=ts.getBoundingClientRect(),c=cs[cur].getBoundingClientRect(),rtl=getComputedStyle(ts).direction=='rtl';ts.scrollBy({left:rtl?c.right-a.right:c.left-a.left,behavior:'smooth'});mark()};mark();
  ts.addEventListener('scroll',()=>{const r=ts.getBoundingClientRect();let best=0,bd=1e9;cs.forEach((c,i)=>{const d=Math.abs(c.getBoundingClientRect().left-r.left),e=Math.abs(c.getBoundingClientRect().right-r.right),m=Math.min(d,e);if(m<bd){bd=m;best=i}});if(best!=cur){cur=best;mark()}},{passive:true});
  ['pointerenter','pointerdown','focusin'].forEach(e=>ts.addEventListener(e,()=>hold=true));['pointerleave','focusout'].forEach(e=>ts.addEventListener(e,()=>hold=false));
  if(!reduced)setInterval(()=>{if(!hold&&!document.hidden)go(cur+1)},4200)}
})();

// ---- mobile experience (v5): app-like tab bar, bottom sheet, haptics, ripple, swipe services ----
(()=>{
 const mq=matchMedia('(max-width:850px)'),page=location.pathname.split('/').pop()||'index.html',fa=lang=='fa';
 const st=document.createElement('style');st.textContent=`
 .rp{position:absolute;border-radius:50%;pointer-events:none;background:rgba(255,255,255,.35);transform:scale(0);animation:rp .6s ease-out forwards}@keyframes rp{to{transform:scale(1);opacity:0}}
 .b,.tb a,.tb button{position:relative;overflow:hidden}
 .tb{display:none}
 @media(max-width:850px){
  html,body{overflow-x:clip}body{padding-bottom:calc(84px + env(safe-area-inset-bottom))}
  .tb{display:flex;position:fixed;z-index:58;inset:auto 12px calc(12px + env(safe-area-inset-bottom)) 12px;height:64px;padding:6px;border-radius:22px;background:rgba(17,20,36,.82);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border:1px solid rgba(0,210,255,.25);box-shadow:0 10px 40px rgba(0,0,0,.55);transition:transform .35s cubic-bezier(.2,.8,.2,1)}
  .tb.h{transform:translateY(calc(100% + 24px))}
  .tb a,.tb button{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;border:0;background:none;color:var(--m);font:600 .68rem Vazirmatn,sans-serif;border-radius:16px;cursor:pointer;text-decoration:none;-webkit-tap-highlight-color:transparent;transition:.25s}
  .tb svg{width:22px;height:22px;transition:.25s}.tb .on{color:#fff;background:linear-gradient(135deg,rgba(0,210,255,.22),rgba(157,0,255,.28))}.tb .on svg{color:var(--b);transform:translateY(-2px) scale(1.12)}
  #up{bottom:calc(92px + env(safe-area-inset-bottom))}
  #dlg{margin:auto 0 0;width:100%;max-width:100%;border-radius:26px 26px 0 0;padding-top:38px;animation:sh .4s cubic-bezier(.2,.8,.2,1);touch-action:pan-x}
  #dlg:before{content:"";position:absolute;top:11px;left:50%;width:46px;height:5px;margin-left:-23px;border-radius:5px;background:rgba(255,255,255,.28)}
  @keyframes sh{from{transform:translateY(100%)}}
  .hs{display:flex!important;gap:16px;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;margin-inline:-20px;padding:6px 20px 12px;scroll-padding-inline:20px}.hs::-webkit-scrollbar{display:none}
  .hs>.card{flex:0 0 82%;scroll-snap-align:start;opacity:1!important;transform:none!important}
  button,a,.card{-webkit-tap-highlight-color:transparent}.card:active{transform:scale(.985)}
 }`;document.head.appendChild(st);
 // tab bar
 const I={h:'<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',s:'<path d="M12 3l2.6 5.6 6 .8-4.4 4.2 1.1 6L12 16.7 6.7 19.6l1.1-6L3.4 9.4l6-.8z"/>',w:'<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',c:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',u:'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>'};
 const T=[['index.html','h','خانه','Home'],['services.html','s','خدمات','Services'],['portfolio.html','w','نمونه‌کار','Work'],['contact.html','c','تماس','Contact'],[0,'u','حساب','Account']];
 const nav=document.createElement('nav');nav.className='tb';nav.setAttribute('aria-label','Tabs');
 nav.innerHTML=T.map(([href,k,f,e])=>{const ic=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${I[k]}</svg>`,lb=`<span data-fa="${f}" data-en="${e}">${fa?f:e}</span>`;return href?`<a href="${href}" class="${href==page?'on':''}">${ic}${lb}</a>`:`<button type="button" id="tbu">${ic}${lb}</button>`}).join('');
 document.body.appendChild(nav);
 nav.querySelector('#tbu').addEventListener('click',()=>document.getElementById('auth').click());
 // hide on scroll down, show on scroll up
 let ly=scrollY;addEventListener('scroll',()=>{const y=scrollY;if(Math.abs(y-ly)>8){nav.classList.toggle('h',y>ly&&y>200);ly=y}},{passive:true});
 // haptics + ripple
 document.addEventListener('click',e=>{if(e.target.closest('button,a.b,.tb a,.dots,.ar'))navigator.vibrate?.(8)},true);
 document.addEventListener('pointerdown',e=>{const t=e.target.closest('.b,.tb a,.tb button');if(!t)return;const r=t.getBoundingClientRect(),d=Math.max(r.width,r.height)*2,s=document.createElement('span');s.className='rp';s.style.cssText=`width:${d}px;height:${d}px;left:${e.clientX-r.left-d/2}px;top:${e.clientY-r.top-d/2}px`;t.appendChild(s);setTimeout(()=>s.remove(),650)});
 // bottom-sheet: drag handle area down to close
 const dlg=document.getElementById('dlg');let y0=null,dy=0;
 dlg.addEventListener('touchstart',e=>{if(!mq.matches)return;const r=dlg.getBoundingClientRect();y0=e.touches[0].clientY-r.top<56?e.touches[0].clientY:null;dy=0},{passive:true});
 dlg.addEventListener('touchmove',e=>{if(y0==null)return;dy=Math.max(0,e.touches[0].clientY-y0);dlg.style.transition='none';dlg.style.transform=`translateY(${dy}px)`},{passive:true});
 dlg.addEventListener('touchend',()=>{if(y0==null)return;dlg.style.transition='transform .25s';dlg.style.transform='';if(dy>110)dlg.close();y0=null});
})();
