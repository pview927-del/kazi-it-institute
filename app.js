(()=> {
const C=window.KAZI_CONFIG||{},$=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const ready=C.SUPABASE_URL&&C.SUPABASE_ANON_KEY&&window.supabase;
const db=ready?window.supabase.createClient(C.SUPABASE_URL,C.SUPABASE_ANON_KEY):null;
const wa=C.WHATSAPP_NUMBER||'8801701090350';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function status(el,msg,err=false){if(!el)return;el.textContent=msg;el.classList.remove('hidden','error');if(err)el.classList.add('error')}
function csvDownload(rows,name){const csv='\ufeff'+rows.map(r=>r.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\r\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));a.download=name;a.click();URL.revokeObjectURL(a.href)}
const menu=$('#menu'),nav=$('#links');if(menu&&nav)menu.onclick=()=>{nav.classList.toggle('open');menu.setAttribute('aria-expanded',String(nav.classList.contains('open')))};
$$('#links a').forEach(a=>a.addEventListener('click',()=>nav?.classList.remove('open')));
if($('#year'))$('#year').textContent=new Date().getFullYear();
$$('[data-whatsapp]').forEach(a=>a.href='https://wa.me/'+wa);
$$('[data-course]').forEach(a=>a.addEventListener('click',()=>{const s=$('#course');if(s)s.value=a.dataset.course}));
const ef=$('#enquiry-form');if(ef)ef.onsubmit=e=>{e.preventDefault();const d=Object.fromEntries(new FormData(ef));window.open('https://wa.me/'+wa+'?text='+encodeURIComponent('KAZI IT AND INSTITUTE\n'+Object.entries(d).map(x=>x[0]+': '+x[1]).join('\n')),'_blank','noopener')};

// Online application: student account + guardian details + auto Student ID from database trigger.
const af=$('#application-form');if(af)af.onsubmit=async e=>{
 e.preventDefault();const d=Object.fromEntries(new FormData(af)),st=$('#form-status');
 if(!db){status(st,'আবেদন জমা দিতে Supabase সংযোগ প্রয়োজন। WhatsApp-এ যোগাযোগ করুন।',true);return}
 const submit=af.querySelector('[type=submit]');if(submit){submit.disabled=true;submit.textContent='জমা হচ্ছে…'}
 try{
   const {data:signup,error:signErr}=await db.auth.signUp({email:d.email,password:d.password,options:{data:{full_name:d.full_name,phone:d.phone,father_name:d.father_name,mother_name:d.mother_name,course:d.course,branch:d.branch}}});
   if(signErr)throw signErr;
   const userId=signup.user?.id||null;
   const {data:appRows,error:appErr}=await db.rpc('submit_kazi_application',{
    p_full_name:d.full_name,p_phone:d.phone,p_father_name:d.father_name,p_mother_name:d.mother_name,
    p_email:d.email,p_occupation:d.occupation,p_age:Number(d.age),p_gender:d.gender,p_address:d.address,
    p_course:d.course,p_branch:d.branch
   });
   if(appErr)throw appErr;
   const app={student_id:appRows?.[0]?.student_id};
   if(!app.student_id)throw new Error('Student ID তৈরি হয়নি। Supabase SQL upgrade চালানো হয়েছে কি না যাচাই করুন।');
   if(signup.session&&userId){
    await db.from('profiles').update({full_name:d.full_name,phone:d.phone,father_name:d.father_name,mother_name:d.mother_name,course:d.course,branch:d.branch,student_id:app.student_id}).eq('id',userId);
   }
   const msg=signup.session
    ? 'অভিনন্দন! আবেদন ও Student account তৈরি হয়েছে। আপনার Student ID: '+app.student_id+'। এটি কপি করে রাখুন। এখন Student Login-এ একই ইমেইল ও পাসওয়ার্ড দিয়ে ঢুকতে পারবেন।'
    : 'আবেদন জমা হয়েছে! আপনার Student ID: '+app.student_id+'। ইমেইলে account confirmation চাইলে আগে ইমেইল confirm করুন। এরপর Student Login-এ ঢুকুন। Student ID কপি করে রাখুন।';
   status(st,msg);let out=$('#generated-student-id');if(!out){out=document.createElement('div');out.id='generated-student-id';out.className='card';st.after(out)}out.innerHTML='<h3>আপনার Student ID</h3><p style="font-size:24px;font-weight:800;color:#356dff">'+esc(app.student_id)+'</p><button class="btn" type="button" id="copy-student-id">Student ID কপি করুন</button>';$('#copy-student-id').onclick=()=>navigator.clipboard.writeText(app.student_id);
   af.reset();
   location.href='student-profile.html?id='+encodeURIComponent(app.student_id);
 }catch(err){status(st,'আবেদন সম্পন্ন হয়নি: '+(err.message||'আবার চেষ্টা করুন'),true)}
 finally{if(submit){submit.disabled=false;submit.textContent='আবেদন জমা দিন'}}
};

// Student portal: email/password account, profile photo, personal notices.
const lf=$('#student-login-form');if(lf)lf.onsubmit=async e=>{
 e.preventDefault();const st=$('#login-status');if(!db){status(st,'Supabase সেটআপ প্রয়োজন।',true);return}
 const email=$('#student-email')?.value?.trim(),password=$('#student-password')?.value;
 if(!email||!password){status(st,'ইমেইল ও পাসওয়ার্ড লিখুন।',true);return}
 const {data,error}=await db.auth.signInWithPassword({email,password});if(error){status(st,'লগইন হয়নি: '+error.message,true);return}
 await renderStudentPortal(data.user);
};
async function renderStudentPortal(user){
 const st=$('#login-status');if(!db||!user)return;
 const {data:p,error}=await db.from('profiles').select('*').eq('id',user.id).single();
 if(error){status(st,'প্রোফাইল লোড হয়নি: '+error.message,true);return}
 let box=$('#student-dashboard');if(!box){box=document.createElement('section');box.id='student-dashboard';box.className='card';$('#student-login-form').after(box)}box.classList.remove('hidden');
 box.innerHTML='<div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap"><img id="student-photo-preview" src="'+esc(p.profile_photo_url||'https://placehold.co/96x96?text=Student')+'" alt="Profile photo" class="profile-avatar"><div><h2>'+esc(p.full_name||user.email)+'</h2><p>Student ID: <b>'+esc(p.student_id||'ID তৈরি হচ্ছে')+'</b></p><button class="btn outline" id="copy-own-id" type="button">ID কপি</button></div></div><hr><label>প্রোফাইল ছবি আপলোড <input id="student-photo" type="file" accept="image/png,image/jpeg,image/webp"></label><div id="photo-status" class="status hidden"></div><h3 style="margin-top:20px">আমার তথ্য</h3><div class="admin-table-wrap"><table class="admin-table"><tbody><tr><th>ইমেইল</th><td>'+esc(user.email)+'</td></tr><tr><th>মোবাইল</th><td>'+esc(p.phone||'—')+'</td></tr><tr><th>পিতার নাম</th><td>'+esc(p.father_name||'—')+'</td></tr><tr><th>মাতার নাম</th><td>'+esc(p.mother_name||'—')+'</td></tr><tr><th>কোর্স</th><td>'+esc(p.course||'—')+'</td></tr><tr><th>শাখা</th><td>'+esc(p.branch||'—')+'</td></tr><tr><th>যোগদানের তারিখ</th><td>'+new Date(p.joined_at||p.created_at||Date.now()).toLocaleDateString('bn-BD')+'</td></tr></tbody></table></div><h3 style="margin-top:20px">আমার নোটিশ</h3><div id="student-notices">লোড হচ্ছে…</div><button class="btn outline" id="student-logout" type="button" style="margin-top:16px">লগআউট</button>';
 $('#copy-own-id').onclick=()=>navigator.clipboard.writeText(p.student_id||'');
 $('#student-logout').onclick=async()=>{await db.auth.signOut();box.remove();status(st,'আপনি লগআউট করেছেন।')};
 $('#student-photo').onchange=async ev=>{const f=ev.target.files?.[0],ps=$('#photo-status');if(!f)return;if(f.size>3*1024*1024){status(ps,'ছবির সাইজ ৩ MB-এর মধ্যে রাখুন।',true);return}const ext=(f.name.split('.').pop()||'jpg').toLowerCase(),path=user.id+'/profile-'+Date.now()+'.'+ext;const {error:upErr}=await db.storage.from('student-photos').upload(path,f,{upsert:true,contentType:f.type});if(upErr){status(ps,'ছবি আপলোড হয়নি। '+upErr.message,true);return}const {data:pub}=db.storage.from('student-photos').getPublicUrl(path);const {error:saveErr}=await db.from('profiles').update({profile_photo_url:pub.publicUrl}).eq('id',user.id);if(saveErr){status(ps,saveErr.message,true);return}$('#student-photo-preview').src=pub.publicUrl;status(ps,'প্রোফাইল ছবি আপডেট হয়েছে।')};
 const {data:ns,error:ne}=await db.from('notices').select('title,body,created_at,student_id').eq('active',true).or('student_id.is.null,student_id.eq.'+(p.student_id||'NONE')).order('created_at',{ascending:false}).limit(30);
 $('#student-notices').innerHTML=ne?'<p>নোটিশ লোড হয়নি।</p>':(ns||[]).map(n=>'<article class="notice-item"><small>'+new Date(n.created_at).toLocaleDateString('bn-BD')+'</small><h3>'+esc(n.title)+'</h3><p>'+esc(n.body)+'</p></article>').join('')||'<p>এখনো কোনো নোটিশ নেই।</p>';
}
if(db)db.auth.getSession().then(({data})=>{if(data.session&&$('#student-login-form'))renderStudentPortal(data.session.user)});

// Render database-managed courses on the public courses page while keeping existing course pages intact.
async function loadPublicCourses(){const host=$('#public-courses');if(!db)return;const {data,error}=await db.from('courses').select('*').eq('active',true).order('created_at',{ascending:false});if(error||!data?.length)return;if(host)host.insertAdjacentHTML('beforeend',data.map(c=>'<article class="course-card"><div class="course-icon">▤</div><h3>'+esc(c.title_bn||c.title)+'</h3><p>'+esc(c.description||'কোর্সের বিস্তারিত জানতে যোগাযোগ করুন।')+'</p><div class="tags"><span class="tag">'+esc(c.fee)+'</span><span class="tag">'+esc(c.duration)+'</span></div><p class="small">'+esc(c.conditions||'')+'</p><a class="link" href="apply.html?course='+encodeURIComponent(c.slug)+'">এই কোর্সে ভর্তি →</a></article>').join(''));const select=$('#course');if(select){const requested=new URLSearchParams(location.search).get('course');data.forEach(c=>{if(![...select.options].some(o=>o.value===c.title)){const op=document.createElement('option');op.value=c.title;op.textContent=c.title_bn||c.title;select.appendChild(op)}});const chosen=data.find(c=>c.slug===requested);if(chosen)select.value=chosen.title}}
loadPublicCourses();

// Public banner carousel; target_url is the click-through destination.
async function loadBanners(){const host=$('#public-banners');if(!host||!db)return;const {data:pins,error:pinErr}=await db.from('photo_album').select('*').eq('active',true).eq('pinned',true).order('created_at',{ascending:false}).limit(2);if(!pinErr&&pins?.length){host.innerHTML=pins.map(b=>'<a class="site-banner" href="'+esc(b.target_url||'about.html')+'"><img src="'+esc(b.image_url)+'" alt="'+esc(b.title||'প্রতিষ্ঠানের ছবি')+'"><span>'+esc(b.title)+'</span></a>').join('');return}const {data,error}=await db.from('banners').select('*').eq('active',true).order('created_at',{ascending:false}).limit(10);if(error||!data?.length)return;host.innerHTML=data.map(b=>'<a class="site-banner" href="'+esc(b.target_url)+'" target="_blank" rel="noopener"><img src="'+esc(b.image_url)+'" alt="'+esc(b.title||'প্রচার ব্যানার')+'"><span>'+esc(b.title)+'</span></a>').join('')}
loadBanners();

// Admin dashboard
const login=$('#admin-login-form');if(login){
 const area=$('#admin-login-area'),panel=$('#admin-panel');let st=$('#admin-login-status');
 login.onsubmit=async e=>{
  e.preventDefault();if(!db){status(st,'Supabase সংযোগ নেই।',true);return}
  const {data,error}=await db.auth.signInWithPassword({email:$('#admin-email').value,password:$('#admin-password').value});if(error){status(st,'লগইন হয়নি: '+error.message,true);return}
  const {data:ok,error:ce}=await db.rpc('verify_kazi_admin_code',{p_code:$('#admin-code').value});if(ce||ok!==true){await db.auth.signOut();status(st,'নিরাপত্তা কোড সঠিক নয়।',true);return}
  const {data:prof,error:pe}=await db.from('profiles').select('role').eq('id',data.user.id).single();if(pe||prof?.role!=='admin'){await db.auth.signOut();status(st,'এই অ্যাকাউন্টে Admin permission নেই।',true);return}
  area.classList.add('hidden');panel.classList.remove('hidden');st=$('#admin-panel-status');await loadAdmin();
 };
 async function loadAdmin(){await Promise.all([loadApplications(),loadAdminNotices(),loadCourses(),loadAdminBanners(),loadHomeEditor(),loadAdminAlbum()])}
 async function loadApplications(){
  const host=$('#admin-applications');if(!host)return;
  const {data,error}=await db.from('applications').select('*').order('created_at',{ascending:false}).limit(100);
  if(error){host.innerHTML='<p class="status error">'+esc(error.message)+'</p>';return}
  window.__kaziApps=data||[];
  const {data:profiles}=await db.from('profiles').select('id,student_id,profile_photo_url');
  const profById=Object.fromEntries((profiles||[]).map(p=>[p.id,p]));
  host.innerHTML='<div class="admin-section-head"><div><h3>শিক্ষার্থী ডাটাবেস</h3><p class="muted">Excel-এর মতো টেবিল · মোট '+data.length+' জন</p></div><button class="btn outline" id="export-students">Excel/CSV ডাউনলোড</button></div><div style="overflow:auto"><table class="admin-table"><thead><tr><th>ছবি</th><th>Student ID</th><th>নাম</th><th>মোবাইল</th><th>পিতা</th><th>মাতা</th><th>কোর্স / শাখা</th><th>যোগদানের তারিখ</th><th>অবস্থা</th><th>ব্যক্তিগত নোটিশ</th></tr></thead><tbody>'+data.map(a=>'<tr><td>'+(profById[a.profile_id]?.profile_photo_url?'<img class="student-avatar-small" src="'+esc(profById[a.profile_id].profile_photo_url)+'" alt="ছবি">':'<span class="student-avatar-small" style="display:inline-grid;place-items:center;background:#edf2ff">'+esc((a.full_name||'শি').slice(0,1))+'</span>')+'</td><td><b>'+esc(a.student_id||'—')+'</b><br><a href="student-profile.html?id='+encodeURIComponent(a.student_id||'')+'" target="_blank">প্রোফাইল</a></td><td>'+esc(a.full_name)+'<td>'+esc(a.phone)+'</td><td>'+esc(a.father_name||'—')+'</td><td>'+esc(a.mother_name||'—')+'</td><td>'+esc(a.course)+'<br>'+esc(a.branch)+'</td><td>'+new Date(a.created_at).toLocaleDateString('bn-BD')+'</td><td><select data-status="'+a.id+'"><option value="approved" '+(a.status==='approved'?'selected':'')+'>সক্রিয়</option><option value="pending" '+(a.status==='pending'?'selected':'')+'>অপেক্ষমাণ</option><option value="rejected" '+(a.status==='rejected'?'selected':'')+'>বন্ধ</option></select></td><td><button class="btn outline" data-personal="'+a.id+'">নোটিশ</button></td></tr>').join('')+'</tbody></table></div>';
  $('#export-students').onclick=()=>csvDownload([['Student ID','Name','Phone','Father','Mother','Course','Branch','Joined','Status'],...data.map(a=>[a.student_id,a.full_name,a.phone,a.father_name,a.mother_name,a.course,a.branch,new Date(a.created_at).toLocaleDateString('en-CA'),a.status])],'kazi-students.csv');
  host.querySelectorAll('[data-status]').forEach(s=>s.onchange=async()=>{const {error}=await db.from('applications').update({status:s.value}).eq('id',s.dataset.status);if(error)status(st,error.message,true);else status(st,'শিক্ষার্থীর অবস্থা আপডেট হয়েছে।')});
  host.querySelectorAll('[data-personal]').forEach(b=>b.onclick=async()=>{const a=data.find(x=>x.id===b.dataset.personal);const title=prompt(a.full_name+'-এর নোটিশের শিরোনাম লিখুন');if(!title)return;const body=prompt('নোটিশের বিস্তারিত লিখুন');if(!body)return;const {error}=await db.from('notices').insert([{title,body,active:true,student_id:a.student_id}]);if(error)status(st,error.message,true);else status(st,'শিক্ষার্থীর ব্যক্তিগত নোটিশ পাঠানো হয়েছে।')});
 }
 async function loadAdminNotices(){const host=$('#admin-notices');if(!host)return;const {data,error}=await db.from('notices').select('*').order('created_at',{ascending:false}).limit(50);if(error){host.innerHTML=esc(error.message);return}host.innerHTML=(data||[]).map(n=>'<article class="notice-item"><b>'+esc(n.title)+'</b>'+(n.student_id?'<small> · Student ID '+esc(n.student_id)+'</small>':'')+'<p>'+esc(n.body)+'</p><button class="btn outline" data-del-notice="'+n.id+'">মুছুন</button></article>').join('');host.querySelectorAll('[data-del-notice]').forEach(b=>b.onclick=async()=>{if(confirm('নোটিশ মুছবেন?')){const {error}=await db.from('notices').delete().eq('id',b.dataset.delNotice);if(error)status(st,error.message,true);else loadAdminNotices()}})}
 $('#notice-form')?.addEventListener('submit',async e=>{e.preventDefault();const {error}=await db.from('notices').insert([{title:$('#notice-title').value,body:$('#notice-body').value,active:true,student_id:null}]);if(error)status(st,error.message,true);else{e.target.reset();status(st,'সবার জন্য নোটিশ প্রকাশিত হয়েছে।');loadAdminNotices()}});
 async function loadCourses(){const host=$('#admin-courses-list');if(!host)return;const {data,error}=await db.from('courses').select('*').order('created_at',{ascending:false});if(error){host.innerHTML=esc(error.message);return}host.innerHTML=(data||[]).map(c=>'<article class="notice-item"><b>'+esc(c.title)+'</b> · '+esc(c.title_bn)+'<p>ফি: '+esc(c.fee)+' · সময়: '+esc(c.duration)+'</p><button class="btn outline" data-edit-course="'+c.id+'">এডিট</button> <button class="btn outline" data-delete-course="'+c.id+'">মুছুন</button></article>').join('')||'<p>এখনো কোনো কাস্টম কোর্স যোগ করা হয়নি।</p>';host.querySelectorAll('[data-edit-course]').forEach(b=>b.onclick=()=>{const c=data.find(x=>x.id===b.dataset.editCourse);for(const k of ['slug','title','title_bn','description','fee','duration','conditions'])if($('#course-'+k))$('#course-'+k).value=c[k]||'';$('#course-id').value=c.id;$('#course-submit').textContent='কোর্স আপডেট করুন'});host.querySelectorAll('[data-delete-course]').forEach(b=>b.onclick=async()=>{if(confirm('এই কোর্স মুছবেন?')){const {error}=await db.from('courses').delete().eq('id',b.dataset.deleteCourse);if(error)status(st,error.message,true);else loadCourses()}})}
 $('#course-admin-form')?.addEventListener('submit',async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target));const id=d.id;delete d.id;d.active=true;let q=id?db.from('courses').update(d).eq('id',id):db.from('courses').insert([d]);const {error}=await q;if(error)status(st,'কোর্স সেভ হয়নি: '+error.message,true);else{e.target.reset();$('#course-id').value='';$('#course-submit').textContent='কোর্স যোগ করুন';status(st,'কোর্স সেভ হয়েছে।');loadCourses()}});
 async function loadAdminBanners(){const host=$('#admin-banners-list');if(!host)return;const {data,error}=await db.from('banners').select('*').order('created_at',{ascending:false});if(error){host.innerHTML=esc(error.message);return}host.innerHTML=(data||[]).map(b=>'<article class="notice-item"><b>'+esc(b.title)+'</b><p><a target="_blank" rel="noopener" href="'+esc(b.target_url)+'">ব্যানারের লিংক</a></p><img src="'+esc(b.image_url)+'" alt="" style="width:100%;max-width:300px;border-radius:10px"><br><button class="btn outline" data-toggle-banner="'+b.id+'" data-active="'+b.active+'">'+(b.active?'লুকান':'প্রকাশ করুন')+'</button> <button class="btn outline" data-delete-banner="'+b.id+'">মুছুন</button></article>').join('')||'<p>কোনো ব্যানার নেই।</p>';host.querySelectorAll('[data-toggle-banner]').forEach(b=>b.onclick=async()=>{const {error}=await db.from('banners').update({active:b.dataset.active!=='true'}).eq('id',b.dataset.toggleBanner);if(error)status(st,error.message,true);else loadAdminBanners()});host.querySelectorAll('[data-delete-banner]').forEach(b=>b.onclick=async()=>{if(confirm('ব্যানার মুছবেন?')){const {error}=await db.from('banners').delete().eq('id',b.dataset.deleteBanner);if(error)status(st,error.message,true);else loadAdminBanners()}})}
 $('#banner-form')?.addEventListener('submit',async e=>{e.preventDefault();const f=$('#banner-image').files?.[0],title=$('#banner-title').value.trim(),url=$('#banner-url').value.trim();if(!f||!url){status(st,'ছবি ও ক্লিকের লিংক দিন।',true);return}if(f.size>5*1024*1024){status(st,'ছবির সাইজ সর্বোচ্চ ৫ MB হতে পারবে।',true);return}const ext=(f.name.split('.').pop()||'jpg').toLowerCase(),path=Date.now()+'-'+Math.random().toString(36).slice(2)+'.'+ext;const {error:upErr}=await db.storage.from('site-banners').upload(path,f,{contentType:f.type,upsert:false});if(upErr){status(st,'ব্যানার আপলোড হয়নি: '+upErr.message,true);return}const {data:pub}=db.storage.from('site-banners').getPublicUrl(path);const {error}=await db.from('banners').insert([{title,image_url:pub.publicUrl,target_url:url,active:true}]);if(error)status(st,'ছবি আপলোড হয়েছে কিন্তু ব্যানার সেভ হয়নি: '+error.message,true);else{e.target.reset();status(st,'ব্যানার প্রকাশিত হয়েছে।');loadAdminBanners()}});

 async function loadHomeEditor(){
  const host=$('#home-content-fields');if(!host)return;
  const fields=[['hero_title','হোমপেজের প্রধান শিরোনাম'],['hero_tagline','শিরোনামের ছোট লাইন'],['hero_description','প্রধান পরিচিতি'],['courses_heading','কোর্স সেকশনের শিরোনাম'],['courses_description','কোর্স সেকশনের বিবরণ']];
  const {data,error}=await db.from('site_content').select('key,value');
  if(error){host.innerHTML='<p class="status error">হোমপেজ লেখা লোড হয়নি: '+esc(error.message)+'</p>';return}
  const values=Object.fromEntries((data||[]).map(x=>[x.key,x.value]));
  host.innerHTML=fields.map(([key,label])=>'<label class="field full home-editor-field"><span>'+esc(label)+'</span><textarea name="'+key+'" required>'+esc(values[key]||'')+'</textarea></label>').join('');
 }
 $('#home-content-form')?.addEventListener('submit',async e=>{e.preventDefault();const rows=[...new FormData(e.target)].map(([key,value])=>({key,value:String(value).trim(),updated_at:new Date().toISOString()}));const {error}=await db.from('site_content').upsert(rows,{onConflict:'key'});if(error)status(st,'হোমপেজ লেখা সেভ হয়নি: '+error.message,true);else status(st,'হোমপেজের লেখা সেভ হয়েছে। ওয়েবসাইট রিফ্রেশ করে দেখুন।')});
 async function loadAdminAlbum(){
  const host=$('#admin-album-list');if(!host)return;
  const {data,error}=await db.from('photo_album').select('*').order('created_at',{ascending:false});
  if(error){host.innerHTML='<p class="status error">অ্যালবাম লোড হয়নি: '+esc(error.message)+'</p>';return}
  host.innerHTML=(data||[]).map(a=>'<article class="notice-item"><img src="'+esc(a.image_url)+'" alt="" style="width:100%;max-width:260px;height:150px;object-fit:cover;border-radius:12px"><p><b>'+esc(a.title)+'</b> '+(a.pinned?'<span class="tag">হোমপেজে Pin করা</span>':'')+'</p><button type="button" class="btn outline" data-pin-photo="'+a.id+'" data-pinned="'+a.pinned+'">'+(a.pinned?'Unpin করুন':'হোমপেজে Pin করুন')+'</button> <button type="button" class="btn outline" data-del-photo="'+a.id+'">মুছুন</button></article>').join('')||'<p>অ্যালবামে এখনো ছবি নেই।</p>';
  host.querySelectorAll('[data-pin-photo]').forEach(b=>b.onclick=async()=>{const pin=b.dataset.pinned!=='true';if(pin){const {data:pinned}=await db.from('photo_album').select('id').eq('pinned',true).eq('active',true);if((pinned||[]).length>=2){status(st,'একসঙ্গে সর্বোচ্চ ২টি ছবি Pin করা যাবে। আগে একটি Unpin করুন।',true);return}}const {error}=await db.from('photo_album').update({pinned:pin}).eq('id',b.dataset.pinPhoto);if(error)status(st,'Pin/Unpin হয়নি: '+error.message,true);else{status(st,pin?'ছবি হোমপেজে Pin হয়েছে।':'ছবি Unpin হয়েছে।');await loadAdminAlbum();await loadBanners()}});
  host.querySelectorAll('[data-del-photo]').forEach(b=>b.onclick=async()=>{if(confirm('এই ছবি অ্যালবাম থেকে মুছবেন?')){const {error}=await db.from('photo_album').delete().eq('id',b.dataset.delPhoto);if(error)status(st,'ছবি মুছতে সমস্যা: '+error.message,true);else loadAdminAlbum()}});
 }
 $('#album-form')?.addEventListener('submit',async e=>{e.preventDefault();const f=$('#album-image').files?.[0],title=$('#album-title').value.trim(),target=$('#album-url').value.trim()||'about.html';if(!f)return;if(f.size>5*1024*1024){status(st,'ছবির সাইজ সর্বোচ্চ ৫ MB হতে পারবে।',true);return}const btn=e.target.querySelector('[type=submit]');btn.disabled=true;btn.textContent='আপলোড হচ্ছে…';try{const ext=(f.name.split('.').pop()||'jpg').toLowerCase(),path='album/'+Date.now()+'-'+Math.random().toString(36).slice(2)+'.'+ext;const {error:upErr}=await db.storage.from('site-album').upload(path,f,{contentType:f.type,upsert:false});if(upErr)throw upErr;const {data:pub}=db.storage.from('site-album').getPublicUrl(path);const {error}=await db.from('photo_album').insert([{title,image_url:pub.publicUrl,target_url:target,active:true,pinned:false}]);if(error)throw error;e.target.reset();status(st,'ছবি Photo Album-এ যোগ হয়েছে।');await loadAdminAlbum()}catch(err){status(st,'ছবি আপলোড হয়নি: '+(err.message||'Supabase Storage policy বা bucket সেটিং পরীক্ষা করুন।'),true)}finally{btn.disabled=false;btn.textContent='অ্যালবামে ছবি যোগ করুন'}});
 $('#admin-logout')?.addEventListener('click',async()=>{await db.auth.signOut();panel.classList.add('hidden');area.classList.remove('hidden')});
}
async function loadHomeContent(){if(!db)return;const {data}=await db.from('site_content').select('key,value');(data||[]).forEach(x=>document.querySelectorAll('[data-site-key="'+x.key+'"]')?.forEach(el=>el.textContent=x.value))}loadHomeContent();
async function loadPublicAlbum(){const host=$('#public-album');if(!host||!db)return;const {data,error}=await db.from('photo_album').select('title,image_url,target_url').eq('active',true).order('created_at',{ascending:false});if(error){host.innerHTML='<p class="muted">অ্যালবাম এখন লোড করা যাচ্ছে না।</p>';return}host.innerHTML=(data||[]).map(a=>'<a class="album-card" href="'+esc(a.target_url||a.image_url)+'" target="_blank" rel="noopener"><img loading="lazy" src="'+esc(a.image_url)+'" alt="'+esc(a.title)+'"><div class="album-caption">'+esc(a.title)+'</div></a>').join('')||'<p class="muted">শিগগিরই ছবি যোগ করা হবে।</p>'}loadPublicAlbum();
const createdId=new URLSearchParams(location.search).get('id');if(createdId&&$('#profile-page-id')){$('#profile-page-id').textContent=createdId;$('#copy-created-id')?.addEventListener('click',()=>navigator.clipboard.writeText(createdId))}
const publicNotices=$('#public-notices');if(publicNotices&&db)db.from('notices').select('title,body,created_at').is('student_id',null).eq('active',true).order('created_at',{ascending:false}).then(({data})=>{if(data?.length)publicNotices.innerHTML=data.map(n=>'<article class="notice-item"><small>'+new Date(n.created_at).toLocaleDateString('bn-BD')+'</small><h3>'+esc(n.title)+'</h3><p>'+esc(n.body)+'</p></article>').join('')});
const branchCards=$$('.branch-card');branchCards.forEach((el,i)=>{const b=C.BRANCHES?.[i];if(b){const name=el.querySelector('[data-branch-name]'),addr=el.querySelector('[data-branch-address]'),map=el.querySelector('iframe');if(name)name.textContent=b.name;if(addr)addr.textContent=b.address;if(map)map.src='https://maps.google.com/maps?q='+encodeURIComponent(b.mapQuery)+'&output=embed'}});
})();