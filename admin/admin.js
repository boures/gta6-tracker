const API=(window.CONFIG.API_URL||'').replace(/\/$/,'');
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let token=sessionStorage.getItem('t'),data=null,sha=null,dirty=false,view='overview';
const ST=[['active','В работе'],['early','Ранняя стадия'],['stalled','Заморожен'],['playable','Запускается']];
const SCHEMA={
 projects:{title:'Проекты',one:'проект',cols:['name','developer','progress','status','rating','updated'],fields:[
  ['name','Название','text'],['developer','Разработчик','text'],['progress','Прогресс, %','number'],['status','Статус','select',ST],
  ['category','Категория','select',[['gta6','Только GTA VI'],['layer','Слой для любых игр']]],['description','Описание','textarea'],
  ['updated','Дата последнего обновления','date'],['url','Ссылка на источник','url'],['stars','Звёзды','number'],['rating','Рейтинг (0–10)','number']]},
 news:{title:'Новости',one:'новость',cols:['title','date','status'],fields:[
  ['title','Заголовок','text'],['summary','Описание','textarea'],['date','Дата публикации','date'],['url','Ссылка на источник','url'],
  ['media','Изображение или видео (ссылка на .jpg/.png/.mp4)','url'],['status','Статус','select',[['published','Опубликовано'],['draft','Черновик']]]]},
 watchlist:{title:'Watchlist',one:'запись',cols:['name','status'],fields:[
  ['name','Название','text'],['status','Статус','select',ST],['description','Описание','textarea'],['comment','Комментарий','textarea'],['url','Ссылка','url']]},
 toolkit:{title:'Инструменты',one:'инструмент',cols:['name','description'],fields:[['name','Название','text'],['description','Описание','textarea'],['url','Ссылка','url']]}};
const LBL={name:'Название',developer:'Разработчик',progress:'Прогресс',status:'Статус',rating:'Рейтинг',updated:'Обновлён',title:'Заголовок',date:'Дата',description:'Описание'};
const SECT={race:'Гонка проектов',news:'Новости',watchlist:'Watchlist',toolkit:'Инструменты',method:'Методология',safety:'Блок безопасности'};
function toast(m,err){const t=document.createElement('div');t.className='toast'+(err?' err':'');t.textContent=m;$('#toasts').append(t);setTimeout(()=>t.remove(),4000)}
async function api(path,opt={}){
  const r=await fetch(API+path,{...opt,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})}});
  const j=await r.json().catch(()=>({}));
  if(r.status===401&&token){logout();throw new Error('Сессия истекла, войдите снова')}
  if(!r.ok)throw new Error(j.error||'Ошибка '+r.status);return j}
function logout(){token=null;sessionStorage.removeItem('t');loginUI()}
function loginUI(){
  $('#root').innerHTML=`<div class="login"><form class="card" id="lf"><h2>Вход в админ-панель</h2><input type="password" id="pw" placeholder="Пароль" autocomplete="current-password" required><button class="btn">Войти</button></form></div>`;
  $('#lf').onsubmit=async e=>{e.preventDefault();try{const j=await api('/api/login',{method:'POST',body:JSON.stringify({password:$('#pw').value})});token=j.token;sessionStorage.setItem('t',token);await load()}catch(x){toast(x.message,1)}}}
async function load(){try{const j=await api('/api/data');data=j.data;sha=j.sha;dirty=false;shell()}catch(x){toast(x.message,1);if(!token)loginUI()}}
function shell(){
  const nav=[['overview','Обзор'],['projects','Проекты'],['news','Новости'],['watchlist','Watchlist'],['toolkit','Инструменты'],['stats','Статистика и секции']];
  $('#root').innerHTML=`<div class="app"><aside class="side"><div class="logo" style="padding:8px 12px 16px">GTA VI <b>ADMIN</b></div>${nav.map(n=>`<a data-v="${n[0]}" class="${view===n[0]?'on':''}">${n[1]}</a>`).join('')}<a id="out" style="margin-top:auto">Выйти</a></aside><div class="main" id="main"></div></div>`;
  document.querySelectorAll('[data-v]').forEach(a=>a.onclick=()=>{view=a.dataset.v;shell()});$('#out').onclick=logout;page()}
function head(title,extra=''){return `<div class="bar2"><h2>${title}</h2>${dirty?'<span class="dirty">● Есть несохранённые изменения</span>':''}${extra}<button class="btn ghost" id="pv">Предпросмотр</button><button class="btn" id="sv">Сохранить изменения</button></div>`}
function bind(){$('#pv').onclick=preview;$('#sv').onclick=save}
function page(){
  const m=$('#main');
  if(view==='overview'){const s=data.stats;
    m.innerHTML=head('Обзор')+`<div class="grid"><div class="card"><h3>${s.overall}%</h3><p>Общий прогресс</p></div><div class="card"><h3>${data.projects.length}</h3><p>Проектов</p></div><div class="card"><h3>${data.news.filter(n=>n.status==='published').length} / ${data.news.filter(n=>n.status==='draft').length}</h3><p>Новости: опубликовано / черновики</p></div><div class="card"><h3>${data.watchlist.length}</h3><p>В Watchlist</p></div></div><p class="sub" style="margin-top:20px">Правки применяются на сайте после кнопки «Сохранить изменения» (обычно через 1–2 минуты). Кнопка «Предпросмотр» показывает сайт с текущими правками до публикации.</p>`}
  else if(view==='stats'){const s=data.stats,sec=data.sections;
    m.innerHTML=head('Статистика и секции')+`<div class="card form"><label>Заголовок<input id="s_headline" value="${esc(s.headline)}"></label><label>Подзаголовок<textarea id="s_subline">${esc(s.subline)}</textarea></label><label>Общий прогресс, %<input type="number" min="0" max="100" id="s_overall" value="${+s.overall||0}"></label><label>Дальняя веха<input id="s_furthest" value="${esc(s.furthest)}"></label><label>Запуск GTA VI<input id="s_boot" value="${esc(s.boot)}"></label><label>Подпись обратного отсчёта<input id="s_cl" value="${esc(s.countdownLabel)}"></label><label>Дата обратного отсчёта (пусто — скрыть)<input type="datetime-local" id="s_ct" value="${esc((s.countdownTarget||'').slice(0,16))}"></label><label>Дата «данные обновлены»<input type="date" id="s_upd" value="${esc(data.meta.updated)}"></label><label class="chk"><input type="checkbox" id="s_demo" ${data.meta.demo?'checked':''}> Показывать плашку «демонстрационные данные»</label><h3>Отображение секций</h3>${Object.keys(SECT).map(k=>`<label class="chk"><input type="checkbox" data-sec="${k}" ${data.sections[k]!==false?'checked':''}> ${SECT[k]}</label>`).join('')}<div><button class="btn ghost" id="ap">Применить</button></div></div>`;
    $('#ap').onclick=()=>{const g=i=>$('#'+i).value;Object.assign(data.stats,{headline:g('s_headline'),subline:g('s_subline'),overall:Math.min(100,Math.max(0,+g('s_overall')||0)),furthest:g('s_furthest'),boot:g('s_boot'),countdownLabel:g('s_cl'),countdownTarget:g('s_ct')?new Date(g('s_ct')).toISOString():''});data.meta.updated=g('s_upd');data.meta.demo=$('#s_demo').checked;document.querySelectorAll('[data-sec]').forEach(c=>data.sections[c.dataset.sec]=c.checked);dirty=true;toast('Применено. Не забудьте сохранить');shell()}}
  else{const S=SCHEMA[view];
    m.innerHTML=head(S.title,'<button class="btn" id="add">+ Добавить</button>')+`<div class="tw"><table><thead><tr>${S.cols.map(c=>`<th>${LBL[c]||c}</th>`).join('')}<th></th></tr></thead><tbody>${data[view].map((r,i)=>`<tr>${S.cols.map(c=>`<td>${c==='status'?esc((ST.concat([['published','Опубликовано'],['draft','Черновик']]).find(x=>x[0]===r[c])||[0,r[c]])[1]):esc(r[c])}</td>`).join('')}<td style="white-space:nowrap"><button class="btn ghost sm" data-e="${i}">Изменить</button> <button class="btn danger sm" data-d="${i}">Удалить</button></td></tr>`).join('')||'<tr><td>Пусто</td></tr>'}</tbody></table></div>`;
    $('#add').onclick=()=>edit(-1);document.querySelectorAll('[data-e]').forEach(b=>b.onclick=()=>edit(+b.dataset.e));
    document.querySelectorAll('[data-d]').forEach(b=>b.onclick=()=>confirmDel(+b.dataset.d))}
  bind()}
function modal(html,wide){const d=document.createElement('div');d.className='modal'+(wide?' wide':'');d.innerHTML='<div>'+html+'</div>';d.onclick=e=>{if(e.target===d)d.remove()};document.body.append(d);return d}
function edit(i){
  const S=SCHEMA[view],r=i<0?{id:crypto.randomUUID(),status:S.fields.find(f=>f[0]==='status')?.[3][0][0]}:{...data[view][i]};
  if(i<0&&view==='news')r.date=new Date().toISOString().slice(0,10);
  const m=modal(`<h3>${i<0?'Добавить':'Изменить'}: ${S.one}</h3><form class="form" id="ef">${S.fields.map(([k,l,t,o])=>`<label>${l}${t==='textarea'?`<textarea name="${k}" rows="4">${esc(r[k])}</textarea>`:t==='select'?`<select name="${k}">${o.map(x=>`<option value="${x[0]}" ${r[k]===x[0]?'selected':''}>${x[1]}</option>`).join('')}</select>`:`<input name="${k}" type="${t}" value="${esc(r[k])}" ${t==='number'?'step="any"':''}>`}</label>`).join('')}<div style="display:flex;gap:10px;justify-content:flex-end"><button type="button" class="btn ghost" id="cx">Отмена</button><button class="btn">Готово</button></div></form>`);
  $('#cx').onclick=()=>m.remove();
  $('#ef').onsubmit=e=>{e.preventDefault();const f=new FormData(e.target);S.fields.forEach(([k,,t])=>{let v=f.get(k);if(t==='number')v=v===''?0:+v;if(t==='url'&&v&&!/^https?:\/\//i.test(v)){toast('Ссылка должна начинаться с http:// или https://',1);throw 0}r[k]=v});
    if(view==='projects')r.progress=Math.min(100,Math.max(0,r.progress));
    i<0?data[view].push(r):data[view][i]=r;dirty=true;m.remove();toast('Изменено. Нажмите «Сохранить изменения»');page()}}
function confirmDel(i){const m=modal(`<h3>Удалить?</h3><p>Запись «${esc(data[view][i].name||data[view][i].title)}» будет удалена после сохранения.</p><div style="display:flex;gap:10px;justify-content:flex-end"><button class="btn ghost" id="n">Отмена</button><button class="btn danger" id="y">Удалить</button></div>`);$('#n').onclick=()=>m.remove();$('#y').onclick=()=>{data[view].splice(i,1);dirty=true;m.remove();page()}}
function preview(){const m=modal(`<iframe src="../index.html?preview=1"></iframe>`,true);const f=m.querySelector('iframe');f.onload=()=>f.contentWindow.postMessage({type:'preview',data},location.origin)}
async function save(){const b=$('#sv');b.disabled=true;b.textContent='Сохраняю…';
  try{const j=await api('/api/data',{method:'PUT',body:JSON.stringify({data,sha})});sha=j.sha;dirty=false;toast('Сохранено! Сайт обновится через 1–2 минуты');shell()}
  catch(x){toast(x.message,1);b.disabled=false;b.textContent='Сохранить изменения'}}
addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue=''}});
token?load():loginUI();
