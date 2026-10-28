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

// Student portal: Student ID + registered phone. Photo is stored as a bounded data URL in the student's application row.
const lf=$('#student-login-form');
if(lf)lf.addEventListener('submit',async e=>{
 e.preventDefault();
 const st=$('#login-status'),btn=lf.querySelector('[type="submit"]');
 if(!db){status(st,'Supabase সংযোগ তৈরি হয়নি। config.js ও Supabase CDN যাচাই করুন।',true);return}
 const studentId=$('#student-id')?.value?.trim(),phone=$('#student-phone')?.value?.trim();
 if(!studentId||!phone){status(st,'Student ID ও মোবাইল নম্বর লিখুন।',true);return}
 if(btn){btn.disabled=true;btn.textContent='যাচাই হচ্ছে…'}
 try{
   const {data,error}=await db.rpc('student_portal_lookup',{p_student_id:studentId,p_phone:phone});
   if(error)throw error;
   const student=Array.isArray(data)?data[0]:data;
   if(!student){status(st,'Student ID ও মোবাইল নম্বর মেলেনি, অথবা আবেদন অনুমোদিত হয়নি।',true);return}
   renderStudentPortal(student,studentId,phone);
   status(st,'লগইন সফল হয়েছে।');
 }catch(err){status(st,'Student Login করা যায়নি: '+(err?.message||'Supabase SQL setup যাচাই করুন।'),true)}
 finally{if(btn){btn.disabled=false;btn.textContent='Student ID দিয়ে প্রবেশ করুন'}}
});
function renderStudentPortal(student,studentId,phone){
 const box=$('#student-dashboard');if(!box)return;
 box.classList.remove('hidden');
 const photo=typeof student.profile_photo_data==='string'&&student.profile_photo_data.startsWith('data:image/')?student.profile_photo_data:'';
 box.innerHTML='<div class="card"><div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;margin-bottom:18px"><img id="student-own-photo" src="'+(photo?esc(photo):'')+'" alt="প্রোফাইল ছবি" style="width:104px;height:104px;object-fit:cover;border-radius:50%;border:2px solid #dbe5f5;'+(photo?'':'display:none')+'"><div><h2>'+esc(student.full_name||'শিক্ষার্থী')+'</h2><p>Student ID: <b>'+esc(student.student_id||'—')+'</b></p></div></div><section class="notice-item"><h3>নিজের প্রোফাইল ছবি</h3><p>JPG, PNG বা WebP; সর্বোচ্চ ৫ MB।</p><form id="student-photo-form"><input id="student-photo-file" type="file" accept="image/jpeg,image/png,image/webp" required><button class="btn" type="submit" style="margin-top:10px">ছবি আপলোড / পরিবর্তন করুন</button></form><div id="student-photo-status" class="status hidden" role="status"></div></section><p>কোর্স: '+esc(student.course||'—')+'</p><p>শাখা: '+esc(student.branch||'—')+'</p><p>আবেদনের অবস্থা: <b>'+esc(student.status||'—')+'</b></p><p class="note">এই পোর্টালটি Student ID ও ভর্তি আবেদনে দেওয়া মোবাইল নম্বর দিয়ে যাচাই করে।</p><h3>অনলাইন ক্লাস</h3><div id="student-online-class" class="notice-box">লিংক লোড হচ্ছে…</div><h3 style="margin-top:20px">সর্বশেষ নোটিশ</h3><div id="student-notices">নোটিশ লোড হচ্ছে…</div><button class="btn outline" id="student-logout" type="button" style="margin-top:16px">লগআউট</button></div>';
 $('#student-photo-form')?.addEventListener('submit',async e=>{
   e.preventDefault();const file=$('#student-photo-file')?.files?.[0],photoStatus=$('#student-photo-status'),uploadBtn=e.target.querySelector('[type="submit"]');
   if(!file)return;
   if(!['image/jpeg','image/png','image/webp'].includes(file.type)){status(photoStatus,'শুধু JPG, PNG বা WebP ছবি দিন।',true);return}
   if(file.size>5*1024*1024){status(photoStatus,'ছবির সাইজ সর্বোচ্চ ৫ MB হতে পারবে। ছোট ছবি নির্বাচন করুন।',true);return}
   uploadBtn.disabled=true;uploadBtn.textContent='আপলোড হচ্ছে…';
   try{
     const dataUrl=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('ছবি পড়া যায়নি।'));reader.readAsDataURL(file)});
     const {data,error}=await db.rpc('student_portal_save_photo',{p_student_id:studentId,p_phone:phone,p_photo_data:dataUrl});
     if(error)throw error;if(data!==true)throw new Error('Student ID/মোবাইল যাচাই হয়নি অথবা আবেদন অনুমোদিত নয়।');
     const img=$('#student-own-photo');if(img){img.src=dataUrl;img.style.display='block'}
     status(photoStatus,'প্রোফাইল ছবি সফলভাবে আপলোড হয়েছে।');
   }catch(err){status(photoStatus,'ছবি আপলোড হয়নি: '+(err.message||'Supabase SQL setup চালানো হয়েছে কি না যাচাই করুন।'),true)}
   finally{uploadBtn.disabled=false;uploadBtn.textContent='ছবি আপলোড / পরিবর্তন করুন'}
 });
 $('#student-logout').onclick=()=>{box.classList.add('hidden');box.innerHTML='';lf.reset();status($('#login-status'),'আপনি লগআউট করেছেন।')};
 (async()=>{
   const {data:siteRows}=await db.from('site_content').select('key,value').in('key',['online_class_url']);
   const siteMap=Object.fromEntries((siteRows||[]).map(x=>[x.key,x.value]));
   const online=$('#student-online-class');
   if(online)online.innerHTML=siteMap.online_class_url?'<a class="btn" href="'+esc(siteMap.online_class_url)+'" target="_blank" rel="noopener">অনলাইন ক্লাসে যোগ দিন</a>':'Admin এখনো অনলাইন ক্লাসের লিংক যোগ করেননি।';
   const {data:ns,error:ne}=await db.from('notices').select('title,body,created_at').eq('active',true).order('created_at',{ascending:false}).limit(20);
   const noticeHost=$('#student-notices');
   if(noticeHost)noticeHost.innerHTML=ne?'<p>নোটিশ লোড করা যায়নি।</p>':(ns||[]).map(n=>'<article class="notice-item"><small>'+new Date(n.created_at).toLocaleDateString('bn-BD')+'</small><h3>'+esc(n.title)+'</h3><p>'+esc(n.body)+'</p></article>').join('')||'<p>এখনো কোনো নোটিশ নেই।</p>';
 })();
}
// Only show courses that the admin has added in Supabase. Both pages use the same data.
async function loadPublicCourses(){
 const hosts=[$('#public-courses'),$('#homepage-courses')].filter(Boolean);
 if(!hosts.length)return;
 if(!db){hosts.forEach(h=>h.innerHTML='<p class="muted">কোর্স দেখতে ইন্টারনেট সংযোগ প্রয়োজন।</p>');return}
 const {data,error}=await db.from('courses').select('*').eq('active',true).order('created_at',{ascending:false});
 if(error){hosts.forEach(h=>h.innerHTML='<p class="muted">কোর্স লোড করা যায়নি। পরে আবার চেষ্টা করুন।</p>');return}
 const cards=(data||[]).map(c=>'<article class="course-card course-card-clickable">'+(c.image_url?'<img class="course-card-image" loading="lazy" src="'+esc(c.image_url)+'" alt="'+esc(c.title_bn||c.title)+'">':'<div class="course-card-image course-card-image-placeholder">KAZI IT</div>')+'<div class="course-card-body"><div class="course-icon">▤</div><h3>'+esc(c.title_bn||c.title)+'</h3><p>'+esc(c.description||'কোর্সের বিস্তারিত জানতে ক্লিক করুন।')+'</p><div class="tags"><span class="tag">'+esc(c.fee||'ফি জানতে যোগাযোগ করুন')+'</span><span class="tag">'+esc(c.duration||'সময়কাল জানতে যোগাযোগ করুন')+'</span></div><a class="link" href="course-details.html?slug='+encodeURIComponent(c.slug)+'">বিস্তারিত দেখুন →</a></div></article>').join('');
 hosts.forEach(h=>h.innerHTML=cards||'<p class="muted">এখনো কোনো কোর্স যোগ করা হয়নি। নতুন কোর্স শিগগিরই প্রকাশ করা হবে।</p>');
 const select=$('#course');
 if(select){const requested=new URLSearchParams(location.search).get('course');(data||[]).forEach(c=>{if(![...select.options].some(o=>o.value===c.title)){const op=document.createElement('option');op.value=c.title;op.textContent=c.title_bn||c.title;select.appendChild(op)}});const chosen=(data||[]).find(c=>c.slug===requested);if(chosen)select.value=chosen.title}
}
loadPublicCourses();

// Admin-added course details page. The slug resolves the selected database course.
async function loadCourseDetails(){
 const host=$('#course-detail-content');if(!host)return;
 const slug=new URLSearchParams(location.search).get('slug');
 if(!slug){host.innerHTML='<p class="muted">কোনো কোর্স নির্বাচন করা হয়নি। <a href="courses.html">সব কোর্স দেখুন</a></p>';return}
 if(!db){host.innerHTML='<p class="muted">কোর্সের তথ্য লোড করতে Supabase সংযোগ প্রয়োজন।</p>';return}
 const {data:c,error}=await db.from('courses').select('*').eq('slug',slug).eq('active',true).maybeSingle();
 if(error||!c){host.innerHTML='<div class="card"><h2>কোর্সটি পাওয়া যায়নি</h2><p>কোর্সটি মুছে ফেলা হয়েছে অথবা এখন প্রকাশিত নেই।</p><a class="btn" href="courses.html">সব কোর্স দেখুন</a></div>';return}
 document.title=(c.title_bn||c.title)+' | KAZI IT AND INSTITUTE';
 host.innerHTML='<div class="card course-detail-card">'+(c.image_url?'<img class="course-detail-image" src="'+esc(c.image_url)+'" alt="'+esc(c.title_bn||c.title)+'">':'')+'<div class="kicker">COURSE DETAILS</div><h1>'+esc(c.title_bn||c.title)+'</h1><p class="course-detail-lead">'+esc(c.description||'এই কোর্সে ব্যবহারিক দক্ষতা শেখানো হবে। বিস্তারিত জানতে প্রতিষ্ঠানে যোগাযোগ করুন।')+'</p><div class="course-detail-facts"><div><small>কোর্স ফি</small><b>'+esc(c.fee||'অফিসে যোগাযোগ করুন')+'</b></div><div><small>সময়কাল</small><b>'+esc(c.duration||'অফিসে যোগাযোগ করুন')+'</b></div></div><h2>কোর্স সম্পর্কে বিস্তারিত</h2><p>'+esc(c.description||'কোর্সের বিস্তারিত তথ্য জানতে প্রতিষ্ঠানের সঙ্গে যোগাযোগ করুন।')+'</p><h3>ভর্তির শর্ত ও প্রয়োজনীয় তথ্য</h3><p>'+esc(c.conditions||'ভর্তি, ক্লাসের সময় ও অন্যান্য শর্ত জানতে প্রতিষ্ঠানে সরাসরি যোগাযোগ করুন।')+'</p><div class="actions"><a class="btn" href="apply.html?course='+encodeURIComponent(c.slug)+'">এই কোর্সে ভর্তি আবেদন</a><a class="btn outline" href="https://wa.me/'+wa+'?text='+encodeURIComponent('KAZI IT AND INSTITUTE - '+(c.title_bn||c.title)+' কোর্স সম্পর্কে জানতে চাই।')+'">বিস্তারিত জানতে যোগাযোগ</a></div></div>';
}
loadCourseDetails();

// Public banner carousel; target_url is the click-through destination.
async function loadBanners(){const host=$('#public-banners');if(!host||!db)return;const {data:pins,error:pinErr}=await db.from('photo_album').select('*').eq('active',true).eq('pinned',true).order('created_at',{ascending:false}).limit(2);if(!pinErr&&pins?.length){host.innerHTML=pins.map(b=>'<a class="site-banner" href="'+esc(b.target_url||'about.html')+'"><img src="'+esc(b.image_url)+'" alt="'+esc(b.title||'প্রতিষ্ঠানের ছবি')+'"><span>'+esc(b.title)+'</span></a>').join('');return}const {data,error}=await db.from('banners').select('*').eq('active',true).order('created_at',{ascending:false}).limit(10);if(error||!data?.length)return;host.innerHTML=data.map(b=>'<a class="site-banner" href="'+esc(b.target_url)+'" target="_blank" rel="noopener"><img src="'+esc(b.image_url)+'" alt="'+esc(b.title||'প্রচার ব্যানার')+'"><span>'+esc(b.title)+'</span></a>').join('')}
loadBanners();

// Admin dashboard
const login=$('#admin-login-form');if(login){
 const area=$('#admin-login-area'),panel=$('#admin-panel');let st=$('#admin-login-status');
 login.addEventListener('submit',async e=>{
  e.preventDefault();const btn=login.querySelector('[type="submit"]');
  if(!db){status(st,'Supabase সংযোগ তৈরি হয়নি। পেজ রিফ্রেশ করুন; config.js ও Supabase CDN যাচাই করতে হবে।',true);return}
  const email=$('#admin-email')?.value?.trim(),password=$('#admin-password')?.value;
  if(!email||!password){status(st,'অ্যাডমিন ইমেইল ও পাসওয়ার্ড লিখুন।',true);return}
  if(btn){btn.disabled=true;btn.textContent='লগইন হচ্ছে…'}
  try{
   const {data,error}=await db.auth.signInWithPassword({email,password});if(error)throw error;
   const {data:prof,error:pe}=await db.from('profiles').select('role').eq('id',data.user.id).single();
   if(pe)throw new Error('লগইন হয়েছে, কিন্তু Admin অনুমতি যাচাই করা যায়নি: '+pe.message);
   if(prof?.role!=='admin'){await db.auth.signOut();throw new Error('এই অ্যাকাউন্টে Admin permission নেই। Supabase profiles টেবিলে role = admin সেট করতে হবে।')}
   area.classList.add('hidden');panel.classList.remove('hidden');st=$('#admin-panel-status');await loadAdmin();
  }catch(err){status(st,'Admin Login ব্যর্থ: '+(err?.message||'অজানা সমস্যা'),true)}
  finally{if(btn){btn.disabled=false;btn.textContent='নিরাপদে লগইন করুন'}}
 });
 // Restore the existing Supabase admin session when a dashboard section link reloads admin.html.
 // Without this check, every section link returns the visitor to the login form.
 if(db){
  db.auth.getSession().then(async ({data,error})=>{
   if(error||!data?.session)return;
   try{
    const {data:prof,error:pe}=await db.from('profiles').select('role').eq('id',data.session.user.id).single();
    if(pe||prof?.role!=='admin')return;
    area.classList.add('hidden');
    panel.classList.remove('hidden');
    st=$('#admin-panel-status');
    await loadAdmin();
   }catch(err){console.error('Admin session restore failed:',err)}
  });
 }
 async function loadAdmin(){const section=new URLSearchParams(location.search).get('section');const map={students:'admin-applications',courses:'course-admin-section',notices:'notice-admin-section',banners:'banner-admin-section',album:'album-admin-section',homepage:'home-content-admin-section',branding:'branding-admin-section',about:'about-content-admin-section',online:'online-class-admin-section'};if(section&&map[section])document.querySelectorAll('#admin-panel .admin-main>section').forEach(el=>el.classList.toggle('hidden',el.id!==map[section]));await Promise.all([loadApplications(),loadAdminNotices(),loadCourses(),loadAdminBanners(),loadHomeEditor(),loadAdminAlbum(),loadLogoEditor(),loadAboutEditor(),loadOnlineClassEditor()])}
 async function loadApplications(){
  const host=$('#admin-applications');if(!host)return;
  const {data,error}=await db.from('applications').select('*').order('created_at',{ascending:false}).limit(100);
  if(error){host.innerHTML='<p class="status error">'+esc(error.message)+'</p>';return}
  window.__kaziApps=data||[];
  const {data:profiles}=await db.from('profiles').select('id,student_id,profile_photo_url');
  const profById=Object.fromEntries((profiles||[]).map(p=>[p.id,p]));
  host.innerHTML='<div class="admin-section-head"><div><h3>শিক্ষার্থী ডাটাবেস</h3><p class="muted">Excel-এর মতো টেবিল · মোট '+data.length+' জন</p></div><button class="btn outline" id="export-students">Excel/CSV ডাউনলোড</button></div><div style="overflow:auto"><table class="admin-table"><thead><tr><th>ছবি</th><th>Student ID</th><th>নাম</th><th>মোবাইল</th><th>পিতা</th><th>মাতা</th><th>কোর্স / শাখা</th><th>যোগদানের তারিখ</th><th>অবস্থা</th><th>ব্যক্তিগত নোটিশ</th></tr></thead><tbody>'+data.map(a=>'<tr><td>'+(profById[a.profile_id]?.profile_photo_url?'<img class="student-avatar-small" src="'+esc(profById[a.profile_id].profile_photo_url)+'" alt="ছবি">':'<span class="student-avatar-small" style="display:inline-grid;place-items:center;background:#edf2ff">'+esc((a.full_name||'শি').slice(0,1))+'</span>')+'</td><td><b>'+esc(a.student_id||'—')+'</b><br><a href="student-profile.html?id='+encodeURIComponent(a.student_id||'')+'&admin=1" target="_blank">প্রোফাইল</a></td><td>'+esc(a.full_name)+'</td><td>'+esc(a.phone)+'</td><td>'+esc(a.father_name||'—')+'</td><td>'+esc(a.mother_name||'—')+'</td><td>'+esc(a.course)+'<br>'+esc(a.branch)+'</td><td>'+new Date(a.created_at).toLocaleDateString('bn-BD')+'</td><td><select data-status="'+a.id+'"><option value="approved" '+(a.status==='approved'?'selected':'')+'>সক্রিয়</option><option value="pending" '+(a.status==='pending'?'selected':'')+'>অপেক্ষমাণ</option><option value="rejected" '+(a.status==='rejected'?'selected':'')+'>প্রত্যাখ্যাত</option><option value="blocked" '+(a.status==='blocked'?'selected':'')+'>ব্লক করা</option></select></td><td><button class="btn outline" data-personal="'+a.id+'">নোটিশ</button></td></tr>').join('')+'</tbody></table></div>';
  $('#export-students').onclick=()=>csvDownload([['Student ID','Name','Phone','Father','Mother','Course','Branch','Joined','Status'],...data.map(a=>[a.student_id,a.full_name,a.phone,a.father_name,a.mother_name,a.course,a.branch,new Date(a.created_at).toLocaleDateString('en-CA'),a.status])],'kazi-students.csv');
  host.querySelectorAll('[data-status]').forEach(s=>s.onchange=async()=>{const {error}=await db.from('applications').update({status:s.value}).eq('id',s.dataset.status);if(error)status(st,error.message,true);else status(st,s.value==='blocked'?'শিক্ষার্থী ব্লক করা হয়েছে।':'শিক্ষার্থীর অবস্থা আপডেট হয়েছে।')});
  host.querySelectorAll('[data-personal]').forEach(b=>b.onclick=async()=>{const a=data.find(x=>x.id===b.dataset.personal);const title=prompt(a.full_name+'-এর নোটিশের শিরোনাম লিখুন');if(!title)return;const body=prompt('নোটিশের বিস্তারিত লিখুন');if(!body)return;const {error}=await db.from('notices').insert([{title,body,active:true,student_id:a.student_id}]);if(error)status(st,error.message,true);else status(st,'শিক্ষার্থীর ব্যক্তিগত নোটিশ পাঠানো হয়েছে।')});
 }
 async function loadAdminNotices(){const host=$('#admin-notices');if(!host)return;const {data,error}=await db.from('notices').select('*').order('created_at',{ascending:false}).limit(50);if(error){host.innerHTML=esc(error.message);return}host.innerHTML=(data||[]).map(n=>'<article class="notice-item"><b>'+esc(n.title)+'</b>'+(n.student_id?'<small> · Student ID '+esc(n.student_id)+'</small>':'')+'<p>'+esc(n.body)+'</p><button class="btn outline" data-del-notice="'+n.id+'">মুছুন</button></article>').join('');host.querySelectorAll('[data-del-notice]').forEach(b=>b.onclick=async()=>{if(confirm('নোটিশ মুছবেন?')){const {error}=await db.from('notices').delete().eq('id',b.dataset.delNotice);if(error)status(st,error.message,true);else loadAdminNotices()}})}
 $('#notice-form')?.addEventListener('submit',async e=>{e.preventDefault();const title=$('#notice-title').value.trim(),body=$('#notice-body').value.trim();const {error}=await db.from('notices').insert([{title,body,active:true,student_id:null}]);if(error){status(st,error.message,true);return}e.target.reset();loadAdminNotices();try{const {data,error:pushError}=await db.functions.invoke('send-notification',{body:{title,body,url:'./notices.html'}});if(pushError)throw pushError;status(st,'সবার জন্য নোটিশ প্রকাশিত হয়েছে। Push notification: '+(data?.sent??0)+'টি ডিভাইসে পাঠানো হয়েছে।')}catch(pushErr){status(st,'নোটিশ প্রকাশিত হয়েছে, তবে Push notification পাঠানো যায়নি। Supabase Edge Function ও VAPID setup যাচাই করুন। ('+(pushErr.message||'setup pending')+')',true)}});
 async function loadCourses(){const host=$('#admin-courses-list');if(!host)return;const {data,error}=await db.from('courses').select('*').order('created_at',{ascending:false});if(error){host.innerHTML=esc(error.message);return}host.innerHTML=(data||[]).map(c=>'<article class="notice-item"><b>'+esc(c.title)+'</b> · '+esc(c.title_bn)+'<p>ফি: '+esc(c.fee)+' · সময়: '+esc(c.duration)+'</p><button class="btn outline" data-edit-course="'+c.id+'">এডিট</button> <button class="btn outline" data-delete-course="'+c.id+'">মুছুন</button></article>').join('')||'<p>এখনো কোনো কাস্টম কোর্স যোগ করা হয়নি।</p>';host.querySelectorAll('[data-edit-course]').forEach(b=>b.onclick=()=>{const c=data.find(x=>x.id===b.dataset.editCourse);for(const k of ['slug','title','title_bn','description','fee','duration','conditions'])if($('#course-'+k))$('#course-'+k).value=c[k]||'';const preview=$('#course-image-preview');if(preview){preview.src=c.image_url||'';preview.classList.toggle('hidden',!c.image_url)}$('#course-id').value=c.id;$('#course-submit').textContent='কোর্স আপডেট করুন'});host.querySelectorAll('[data-delete-course]').forEach(b=>b.onclick=async()=>{if(confirm('এই কোর্স মুছবেন?')){const {error}=await db.from('courses').delete().eq('id',b.dataset.deleteCourse);if(error)status(st,error.message,true);else loadCourses()}})}
 $('#course-admin-form')?.addEventListener('submit',async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target));const id=d.id;delete d.id;d.active=true;const file=$('#course-image')?.files?.[0];try{if(file){if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5242880)throw new Error('JPG/PNG/WebP ছবি দিন, সর্বোচ্চ ৫ MB।');const ext=(file.name.split('.').pop()||'jpg').toLowerCase(),path='courses/'+Date.now()+'.'+ext;const {error:upErr}=await db.storage.from('site-assets').upload(path,file,{contentType:file.type});if(upErr)throw upErr;d.image_url=db.storage.from('site-assets').getPublicUrl(path).data.publicUrl}const q=id?await db.from('courses').update(d).eq('id',id):await db.from('courses').insert([d]);if(q.error)throw q.error;e.target.reset();$('#course-id').value='';$('#course-submit').textContent='কোর্স যোগ করুন';$('#course-image-preview')?.classList.add('hidden');status(st,'কোর্স সেভ হয়েছে।');await loadCourses();await loadPublicCourses()}catch(err){status(st,'কোর্স সেভ হয়নি: '+err.message,true)}});
 async function loadAdminBanners(){const host=$('#admin-banners-list');if(!host)return;const {data,error}=await db.from('banners').select('*').order('created_at',{ascending:false});if(error){host.innerHTML=esc(error.message);return}host.innerHTML=(data||[]).map(b=>'<article class="notice-item"><b>'+esc(b.title)+'</b><p><a target="_blank" rel="noopener" href="'+esc(b.target_url)+'">ব্যানারের লিংক</a></p><img src="'+esc(b.image_url)+'" alt="" style="width:100%;max-width:300px;border-radius:10px"><br><button class="btn outline" data-toggle-banner="'+b.id+'" data-active="'+b.active+'">'+(b.active?'লুকান':'প্রকাশ করুন')+'</button> <button class="btn outline" data-delete-banner="'+b.id+'">মুছুন</button></article>').join('')||'<p>কোনো ব্যানার নেই।</p>';host.querySelectorAll('[data-toggle-banner]').forEach(b=>b.onclick=async()=>{const {error}=await db.from('banners').update({active:b.dataset.active!=='true'}).eq('id',b.dataset.toggleBanner);if(error)status(st,error.message,true);else loadAdminBanners()});host.querySelectorAll('[data-delete-banner]').forEach(b=>b.onclick=async()=>{if(confirm('ব্যানার মুছবেন?')){const {error}=await db.from('banners').delete().eq('id',b.dataset.deleteBanner);if(error)status(st,error.message,true);else loadAdminBanners()}})}
 $('#banner-form')?.addEventListener('submit',async e=>{e.preventDefault();const f=$('#banner-image').files?.[0],title=$('#banner-title').value.trim(),url=$('#banner-url').value.trim(),btn=e.target.querySelector('[type=submit]');if(!f||!url){status(st,'ব্যানারের ছবি ও ক্লিকের লিংক দিন।',true);return}if(!['image/jpeg','image/png','image/webp'].includes(f.type)){status(st,'শুধু JPG, PNG অথবা WebP ছবি আপলোড করুন।',true);return}if(f.size>5*1024*1024){status(st,'ছবির সাইজ সর্বোচ্চ ৫ MB হতে পারবে।',true);return}btn.disabled=true;btn.textContent='আপলোড হচ্ছে…';try{const {data:sessionData}=await db.auth.getSession();if(!sessionData.session){throw new Error('Admin session শেষ হয়েছে। আবার লগইন করুন।')}const ext=(f.name.split('.').pop()||'jpg').toLowerCase(),path=Date.now()+'-'+Math.random().toString(36).slice(2)+'.'+ext;const {error:upErr}=await db.storage.from('site-banners').upload(path,f,{contentType:f.type,upsert:false});if(upErr)throw new Error('Storage upload: '+upErr.message+' — Supabase SQL policy ও site-banners bucket যাচাই করুন।');const {data:pub}=db.storage.from('site-banners').getPublicUrl(path);const {error}=await db.from('banners').insert([{title,image_url:pub.publicUrl,target_url:url,active:true}]);if(error)throw new Error('ছবি আপলোড হয়েছে, কিন্তু banner record save হয়নি: '+error.message);e.target.reset();status(st,'ব্যানার সফলভাবে প্রকাশিত হয়েছে। হোমপেজ রিফ্রেশ করে দেখুন।');await loadAdminBanners();await loadBanners()}catch(err){status(st,'ব্যানার আপলোড হয়নি: '+(err.message||'অজানা সমস্যা'),true)}finally{btn.disabled=false;btn.textContent='ব্যানার প্রকাশ করুন'}});

 async function loadLogoEditor(){const host=$('#logo-preview-area');if(!host||!db)return;const {data}=await db.from('site_content').select('value').eq('key','site_logo').maybeSingle();host.innerHTML=data?.value?'<p>বর্তমান Logo</p><img class="course-image-preview" src="'+esc(data.value)+'" alt="Logo">':'<p class="muted">কাস্টম Logo যোগ করা হয়নি।</p>'}
async function saveSiteValue(key,value){const {error}=await db.from('site_content').upsert({key,value,updated_at:new Date().toISOString()},{onConflict:'key'});if(error)throw error}
$('#logo-form')?.addEventListener('submit',async e=>{e.preventDefault();const f=$('#site-logo-file')?.files?.[0],st=$('#admin-panel-status');if(!f)return;if(!['image/jpeg','image/png','image/webp'].includes(f.type)||f.size>5242880){status(st,'JPG/PNG/WebP ছবি দিন, সর্বোচ্চ ৫ MB।',true);return}try{const ext=(f.name.split('.').pop()||'png').toLowerCase(),path='branding/logo-'+Date.now()+'.'+ext;const {error}=await db.storage.from('site-assets').upload(path,f,{contentType:f.type});if(error)throw error;const url=db.storage.from('site-assets').getPublicUrl(path).data.publicUrl;await saveSiteValue('site_logo',url);document.querySelectorAll('.brand img').forEach(img=>img.src=url);status(st,'Logo পরিবর্তন হয়েছে।');await loadLogoEditor()}catch(err){status(st,'Logo পরিবর্তন হয়নি: '+err.message,true)}});
async function loadAboutEditor(){const host=$('#about-content-fields');if(!host||!db)return;const keys=[['about_title','About Us শিরোনাম'],['about_intro','About Us পরিচিতি'],['about_details','About Us বিস্তারিত'],['about_mission','আমাদের লক্ষ্য'],['student_id_reminder','Student ID সতর্কবার্তা']];const {data}=await db.from('site_content').select('key,value');const values=Object.fromEntries((data||[]).map(x=>[x.key,x.value]));host.innerHTML=keys.map(([k,label])=>'<div class="field full"><label>'+label+'</label><textarea name="'+k+'" rows="3">'+esc(values[k]||'')+'</textarea></div>').join('')}
$('#about-content-form')?.addEventListener('submit',async e=>{e.preventDefault();const st=$('#admin-panel-status');try{for(const [key,value] of Object.entries(Object.fromEntries(new FormData(e.target))))await saveSiteValue(key,value);status(st,'About Us ও Student ID বার্তা সেভ হয়েছে।')}catch(err){status(st,'সেভ হয়নি: '+err.message,true)}});
async function loadOnlineClassEditor(){const input=$('#online-class-url');if(!input||!db)return;const {data}=await db.from('site_content').select('value').eq('key','online_class_url').maybeSingle();input.value=data?.value||''}
$('#online-class-form')?.addEventListener('submit',async e=>{e.preventDefault();try{await saveSiteValue('online_class_url',$('#online-class-url').value.trim());status($('#admin-panel-status'),'অনলাইন ক্লাসের লিংক সেভ হয়েছে।')}catch(err){status($('#admin-panel-status'),'লিংক সেভ হয়নি: '+err.message,true)}});
$('#make-admin-qr')?.addEventListener('click',()=>{const id=$('#qr-student-id')?.value?.trim(),host=$('#admin-qr-result');if(!host)return;if(!id){host.textContent='Student ID লিখুন।';return}host.innerHTML='<div id="admin-qr-canvas"></div><p>'+esc(id)+'</p><button class="btn outline" id="download-admin-qr" type="button">QR ডাউনলোড</button>';new QRCode(host.querySelector('#admin-qr-canvas'),{text:id,width:220,height:220});host.querySelector('#download-admin-qr').onclick=()=>{const im=host.querySelector('img'),cv=host.querySelector('canvas'),url=im?.src||cv?.toDataURL();if(url){const link=document.createElement('a');link.href=url;link.download='student-id-qr.png';link.click()}}});
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
 $('#album-form')?.addEventListener('submit',async e=>{e.preventDefault();const f=$('#album-image').files?.[0],title=$('#album-title').value.trim();if(!f)return;if(f.size>5*1024*1024){status(st,'ছবির সাইজ সর্বোচ্চ ৫ MB হতে পারবে।',true);return}const btn=e.target.querySelector('[type=submit]');btn.disabled=true;btn.textContent='আপলোড হচ্ছে…';try{const ext=(f.name.split('.').pop()||'jpg').toLowerCase(),path='album/'+Date.now()+'-'+Math.random().toString(36).slice(2)+'.'+ext;const {error:upErr}=await db.storage.from('site-album').upload(path,f,{contentType:f.type,upsert:false});if(upErr)throw upErr;const {data:pub}=db.storage.from('site-album').getPublicUrl(path);const {error}=await db.from('photo_album').insert([{title,image_url:pub.publicUrl,active:true,pinned:false}]);if(error)throw error;e.target.reset();status(st,'ছবি Photo Album-এ যোগ হয়েছে।');await loadAdminAlbum()}catch(err){status(st,'ছবি আপলোড হয়নি: '+(err.message||'Supabase Storage policy বা bucket সেটিং পরীক্ষা করুন।'),true)}finally{btn.disabled=false;btn.textContent='অ্যালবামে ছবি যোগ করুন'}});
 $('#admin-logout')?.addEventListener('click',async()=>{await db.auth.signOut();panel.classList.add('hidden');area.classList.remove('hidden')});
}
async function loadHomeContent(){if(!db)return;const {data}=await db.from('site_content').select('key,value');(data||[]).forEach(x=>{document.querySelectorAll('[data-site-key="'+x.key+'"],[data-about-key="'+x.key+'"]').forEach(el=>el.textContent=x.value);if(x.key==='site_logo')document.querySelectorAll('.brand img').forEach(img=>img.src=x.value)})}loadHomeContent();
async function loadPublicAlbum(){const host=$('#public-album');if(!host||!db)return;const {data,error}=await db.from('photo_album').select('title,image_url').eq('active',true).order('created_at',{ascending:false});if(error){host.innerHTML='<p class="muted">অ্যালবাম এখন লোড করা যাচ্ছে না।</p>';return}host.innerHTML=(data||[]).map(a=>'<div class="album-card"><img loading="lazy" src="'+esc(a.image_url)+'" alt="'+esc(a.title)+'"><div class="album-caption">'+esc(a.title)+'</div></div>').join('')||'<p class="muted">শিগগিরই ছবি যোগ করা হবে।</p>'}loadPublicAlbum();
// Admin-only student profile lookup: requires an already authenticated Admin session.
const profileParams=new URLSearchParams(location.search);
if($('#profile-page-id')&&profileParams.get('admin')==='1'){
 const form=$('#student-login-form'),host=$('#student-dashboard'),id=profileParams.get('id')?.trim();
 if(form)form.classList.add('hidden');
 if(host){host.classList.remove('hidden');host.innerHTML='<p class="muted">Admin session যাচাই হচ্ছে…</p>'}
 (async()=>{
  if(!db||!id){if(host)host.innerHTML='<p class="status error">Student ID পাওয়া যায়নি। Admin Panel থেকে আবার খুলুন।</p>';return}
  try{
   const {data:sessionData,error:sessionError}=await db.auth.getSession();
   if(sessionError||!sessionData?.session)throw new Error('Admin হিসেবে লগইন করুন, তারপর Admin Panel থেকে Student Profile খুলুন।');
   const {data:adminProfile,error:roleError}=await db.from('profiles').select('role').eq('id',sessionData.session.user.id).single();
   if(roleError||adminProfile?.role!=='admin')throw new Error('এই পেজটি শুধু অনুমোদিত Admin দেখতে পারবেন।');
   const {data:student,error}=await db.from('applications').select('*').eq('student_id',id).maybeSingle();
   if(error)throw error;
   if(!student)throw new Error('এই Student ID-তে কোনো শিক্ষার্থী পাওয়া যায়নি।');
   const {data:profile}=await db.from('profiles').select('profile_photo_url').eq('student_id',id).maybeSingle();
   const photo=profile?.profile_photo_url||'';
   const row=(label,value)=>'<div class="notice-item"><small class="muted">'+label+'</small><div><b>'+esc(value||'—')+'</b></div></div>';
   host.innerHTML='<div class="card"><div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">'+(photo?'<img src="'+esc(photo)+'" alt="Student photo" style="width:100px;height:100px;object-fit:cover;border-radius:50%">':'')+'<div><h2>'+esc(student.full_name||'শিক্ষার্থী')+'</h2><p>Student ID: <b>'+esc(student.student_id||id)+'</b></p><span class="tag">Admin View</span></div></div><div class="fields" style="margin-top:18px">'+row('Student ID',student.student_id)+row('পূর্ণ নাম',student.full_name)+row('মোবাইল নম্বর',student.phone)+row('ইমেইল',student.email)+row('পিতার নাম',student.father_name)+row('মাতার নাম',student.mother_name)+row('বয়স',student.age)+row('লিঙ্গ',student.gender)+row('পেশা',student.occupation)+row('ঠিকানা',student.address)+row('কোর্স',student.course)+row('শাখা',student.branch)+row('আবেদনের অবস্থা',student.status)+row('আবেদনের তারিখ',student.created_at?new Date(student.created_at).toLocaleDateString('bn-BD'):'—')+'</div><p class="note">এই তথ্য অনুমোদিত Admin session দিয়ে দেখা হচ্ছে। শিক্ষার্থীর ইমেইল বা পাসওয়ার্ড দিয়ে লগইন করার প্রয়োজন নেই।</p><a class="btn" href="admin.html?section=students">Admin Panel-এ ফিরুন</a></div>';
  }catch(err){if(host)host.innerHTML='<div class="status error">'+esc(err.message||'Student profile খোলা যায়নি।')+'</div><a class="btn outline" href="admin.html?section=students">Admin Panel-এ ফিরুন</a>'}
 })();
}
const createdId=new URLSearchParams(location.search).get('id');if(createdId&&$('#profile-page-id')){$('#profile-page-id').textContent=createdId;$('#copy-created-id')?.addEventListener('click',()=>navigator.clipboard.writeText(createdId))}
const publicNotices=$('#public-notices');if(publicNotices&&db)db.from('notices').select('title,body,created_at').is('student_id',null).eq('active',true).order('created_at',{ascending:false}).then(({data})=>{if(data?.length)publicNotices.innerHTML=data.map(n=>'<article class="notice-item"><small>'+new Date(n.created_at).toLocaleDateString('bn-BD')+'</small><h3>'+esc(n.title)+'</h3><p>'+esc(n.body)+'</p></article>').join('')});
const branchCards=$$('.branch-card');branchCards.forEach((el,i)=>{const b=C.BRANCHES?.[i];if(b){const name=el.querySelector('[data-branch-name]'),addr=el.querySelector('[data-branch-address]'),map=el.querySelector('iframe');if(name)name.textContent=b.name;if(addr)addr.textContent=b.address;if(map)map.src='https://maps.google.com/maps?q='+encodeURIComponent(b.mapQuery)+'&output=embed'}});

/* Premium inline graphic icons: replace emoji characters with clean SVG line icons. */
const iconPaths={
 menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
 sparkles:'<path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3Z"/><path d="m19 14 1.1 2.9L23 18l-2.9 1.1L19 22l-1.1-2.9L15 18l2.9-1.1L19 14Z"/>',
 book:'<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z"/><path d="M4 5.5v16M8 7h8M8 11h8"/>',
 monitor:'<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',
 palette:'<path d="M12 3a9 9 0 1 0 0 18h1.2a2 2 0 0 0 1.5-3.3 1.8 1.8 0 0 1 1.4-3H18a3 3 0 0 0 3-3c0-4.8-4-8.7-9-8.7Z"/><path d="M7.5 10h.01M10 7.5h.01M14 7.5h.01M16.5 10h.01"/>',
 globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/>',
 users:'<path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
 bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
 pin:'<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
 file:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h8"/>',
 check:'<circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/>',
 arrow:'<path d="M7 17 17 7M7 7h10v10"/>'
};
const svgIcon=(name,cls='graphic-icon')=>'<svg class="'+cls+'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(iconPaths[name]||iconPaths.sparkles)+'</svg>';
const emojiIconName=ch=>{const n=ch.codePointAt(0);if(n>=0x1F4DA&&n<=0x1F4F0)return 'book';if(n>=0x1F4BB&&n<=0x1F4EF)return 'monitor';if(n>=0x1F3A8&&n<=0x1F3AD)return 'palette';if(n>=0x1F30D&&n<=0x1F320)return 'globe';if(n>=0x1F465&&n<=0x1F487)return 'users';if(n>=0x1F514&&n<=0x1F51B)return 'bell';if(n>=0x1F4CD&&n<=0x1F4CE)return 'pin';if(n>=0x1F4C4&&n<=0x1F4C8)return 'file';if(n>=0x1F680&&n<=0x1F6FF)return 'arrow';return 'sparkles'};
function replaceEmojiWithIcons(root=document.body){
 if(!root)return;
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode(node){if(!node.nodeValue||!/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(node.nodeValue))return NodeFilter.FILTER_REJECT;const p=node.parentElement;if(!p||p.closest('script,style,textarea,input,code,pre,svg,.graphic-icon'))return NodeFilter.FILTER_REJECT;return NodeFilter.FILTER_ACCEPT}});
 const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
 const re=/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/gu;
 nodes.forEach(node=>{const text=node.nodeValue;const frag=document.createDocumentFragment();let last=0,m;re.lastIndex=0;while((m=re.exec(text))){frag.append(document.createTextNode(text.slice(last,m.index)));const holder=document.createElement('span');holder.innerHTML=svgIcon(emojiIconName(m[0]));frag.append(holder.firstChild);last=m.index+m[0].length}frag.append(document.createTextNode(text.slice(last)));node.replaceWith(frag)});
}
function setupGraphicIcons(){
 if(!document.getElementById('kazi-graphic-icon-style')){const st=document.createElement('style');st.id='kazi-graphic-icon-style';st.textContent='.graphic-icon{display:inline-block;width:1.12em;height:1.12em;vertical-align:-.18em;flex:none;color:currentColor}button.menu .graphic-icon{width:22px;height:22px;vertical-align:middle}.check{display:flex;align-items:center;gap:9px}.check-graphic-icon{width:18px;height:18px;color:var(--blue,#356dff)}';document.head.appendChild(st)}
 const menuButton=document.querySelector('#menu');
 if(menuButton&&menuButton.textContent.trim()==='☰'){menuButton.textContent='';menuButton.insertAdjacentHTML('afterbegin',svgIcon('menu'))}
 replaceEmojiWithIcons();
 document.querySelectorAll('.check').forEach((el,i)=>{if(!el.querySelector('.check-graphic-icon')){const names=['check','book','monitor','globe','users','pin'];el.insertAdjacentHTML('afterbegin',svgIcon(names[i%names.length],'graphic-icon check-graphic-icon'))}});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setupGraphicIcons,{once:true});else setupGraphicIcons();
new MutationObserver(()=>replaceEmojiWithIcons()).observe(document.body,{childList:true,subtree:true,characterData:true});

})();