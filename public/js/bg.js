/* پس‌زمینه ویدیویی: ابتدا فقط پوستر کوچک (۹KB)، ویدیو بعد از لود کامل صفحه و در زمان بیکاری */
(function(){var d=document,c=navigator.connection||{},
slow=matchMedia('(prefers-reduced-motion:reduce)').matches||c.saveData||/^(slow-)?2g$/.test(c.effectiveType||''),
w=d.createElement('div'),v=d.createElement('video');
w.id='bgv';w.setAttribute('aria-hidden','true');
v.muted=v.defaultMuted=v.loop=v.playsInline=true;v.preload='none';v.tabIndex=-1;v.disablePictureInPicture=true;
v.setAttribute('muted','');v.setAttribute('playsinline','');v.poster='img/bg-poster.webp';
w.appendChild(v);d.body.insertBefore(w,d.body.firstChild);
if(slow)return;
function go(){v.preload='auto';v.src='video/bg-loop.mp4';var p=v.play();p&&p.catch(function(){})}
function idle(){window.requestIdleCallback?requestIdleCallback(go,{timeout:2500}):setTimeout(go,800)}
d.readyState==='complete'?idle():addEventListener('load',idle);
d.addEventListener('visibilitychange',function(){if(!v.getAttribute('src'))return;if(d.hidden)v.pause();else{var p=v.play();p&&p.catch(function(){})}})})();
