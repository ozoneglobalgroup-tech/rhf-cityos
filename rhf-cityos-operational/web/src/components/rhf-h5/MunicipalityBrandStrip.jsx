import React,{useEffect,useState} from 'react';
import './municipality-branding.css';

const categories={LANDMARK:'بنای شاخص',PERSON:'شخصیت شناخته‌شده',NATURE:'طبیعت و منظر',OTHER:'نماد فرهنگی'};
const defaults={displayName:'',province:'',cityCode:'',address:'',telephone:'',website:'',motto:'',about:'',accentColor:'#0b6372',heroCategory:'LANDMARK',heroTitle:'',imageCredit:'',imageLicense:''};
function messages(error){return error?.message || 'درخواست ناموفق بود';}

export default function MunicipalityBrandStrip({cityId,cityName,api,isSystemAdmin,onCreated}){
 const [brandState,setBrandState]=useState({cityId:null,data:null}),[draft,setDraft]=useState(defaults),[open,setOpen]=useState(false);
 const brand=brandState.cityId===cityId?brandState.data:null;
 const [creating,setCreating]=useState(false),[newCity,setNewCity]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[info,setInfo]=useState(''),[rev,setRev]=useState(0);
 useEffect(()=>{
  let live=true;setBrandState({cityId,data:null});setError('');
  api(`/cities/${cityId}/municipality-branding`).then(result=>{
   if(live){
    if(result?.municipalityId!==cityId){setError('BRANDING_CITY_SCOPE_MISMATCH');return;}
    setBrandState({cityId,data:result});setDraft({...defaults,...result});
   }
  }).catch(err=>{if(live)setError(messages(err));});
  return ()=>{live=false;};
 },[cityId,rev,api]);
 const title=brand?.displayName||cityName||'شهرداری انتخاب‌شده';
 const safeSite=(()=>{try{const u=new URL(brand?.website||'');return u.protocol==='https:'?u.href:null;}catch{return null;}})();
 const safePhone=/^[+0-9()\s-]{5,30}$/.test(brand?.telephone||'')?brand.telephone:null;
 const isDemo=/(?:دمو|آزمایش|آزماي)/.test(`${title} ${cityName||''}`);
 
 const accent=/^#[0-9a-f]{6}$/i.test(brand?.accentColor||'')?brand.accentColor:'#0b6372';
 const url=(path)=>path ? `${path}?revision=${encodeURIComponent(brand?.updatedAt||'new')}-${rev}`:null;
 async function save(e){
  e.preventDefault();if(!brand?.canEdit)return;
  setBusy(true);setError('');setInfo('');
  try{
   const payload=Object.fromEntries(Object.keys(defaults).map(k=>[k,String(draft[k]??'')]));
   await api(`/cities/${cityId}/municipality-branding`,'PATCH',payload);
   setInfo('اطلاعات هویت شهرداری ذخیره شد.');setRev(v=>v+1);
  }catch(err){setError(messages(err));}finally{setBusy(false);}
 }
 async function upload(slot,file){
  if(!file||!brand?.canEdit)return;
  const supported=['image/png','image/jpeg','image/webp'];
  if(!supported.includes(file.type)||file.size>2097152){setError('فقط PNG، JPEG یا WebP تا حجم ۲ مگابایت مجاز است.');return;}
  setBusy(true);setError('');setInfo('');
  try{
   const response=await fetch(`/api/v1/cities/${encodeURIComponent(cityId)}/municipality-brand-assets/${slot}`,{
    method:'PUT',credentials:'same-origin',headers:{'Content-Type':file.type},body:file
   });
   const data=await response.json().catch(()=>({}));
   if(!response.ok)throw new Error(data.error||`HTTP ${response.status}`);
   setInfo(slot==='LOGO'?'لوگوی شهر بارگذاری شد.':'تصویر شاخص شهر بارگذاری شد.');setRev(v=>v+1);
  }catch(err){setError(messages(err));}finally{setBusy(false);}
 }
 async function removeImage(slot){
  if(!brand?.canEdit||!window.confirm('تصویر انتخاب‌شده حذف شود؟'))return;
  setBusy(true);setError('');
  try{await api(`/cities/${cityId}/municipality-brand-assets/${slot}`,'DELETE');setRev(v=>v+1);}
  catch(err){setError(messages(err));}finally{setBusy(false);}
 }
 async function createCity(e){
  e.preventDefault();if(!isSystemAdmin||newCity.trim().length<3)return;
  setBusy(true);setError('');setInfo('');
  try{
   const created=await api('/municipalities','POST',{name:newCity.trim()});
   setCreating(false);setOpen(false);setNewCity('');onCreated?.(created);
  }catch(err){setError(messages(err));}finally{setBusy(false);}
 }
 return <div id="rhf-city-brand-strip" className={"rhf-city-brand"+(brand?.heroUrl?" rhf-city-brand--with-hero":"")} dir="rtl" style={{'--rhf-city-accent':accent}}>
  {brand?.heroUrl&&<img className="rhf-city-brand__backdrop" src={url(brand.heroUrl)} alt="" aria-hidden="true"/>}
  <div className="rhf-city-brand__identity">
   {brand?.logoUrl?<img className="rhf-city-brand__logo" src={url(brand.logoUrl)} alt={`لوگوی ${title}`}/>:<span className="rhf-city-brand__logo rhf-city-brand__fallback" aria-hidden="true">🏛</span>}
   <div className="rhf-city-brand__title"><strong>{title}</strong><small>{brand?.province?`استان ${brand.province}`:'هویت مستقل شهرداری'}{brand?.cityCode?` · کد ${brand.cityCode}`:''}</small></div>
  </div>
  {brand?.heroUrl?<div className="rhf-city-brand__hero rhf-city-brand__hero--caption"><span>{brand?.heroTitle||categories[brand?.heroCategory]||'نماد شهر'}</span></div>:<div className="rhf-city-brand__hero rhf-city-brand__no-photo"><span>{brand?.heroTitle||'تصویر شاخص شهر قابل انتخاب است'}</span></div>}
  <div className="rhf-city-brand__motto" title={brand?.about||''}>{brand?.motto||'حکمرانی داده‌محور، خدمات شهری هوشمند، ارزش پایدار'}</div>
  <div className="rhf-city-brand__contacts" aria-label="اطلاعات پایه و تماس شهرداری">
    {isDemo&&<span className="rhf-city-brand__environment">دمو</span>}
    {safePhone&&<a href={`tel:${safePhone.replace(/[^+0-9]/g,'')}`} title="تماس با شهرداری">{safePhone}</a>}
    {safeSite&&<a href={safeSite} target="_blank" rel="noopener noreferrer" title="وب‌سایت رسمی شهرداری">وب‌سایت</a>}
   </div>
  {(brand?.canEdit||isSystemAdmin)&&<button type="button" className="rhf-city-brand__edit" onClick={()=>{setOpen(true);setCreating(false);setError('');}} aria-label="شخصی‌سازی هویت شهرداری">شخصی‌سازی</button>}
  <span className="rhf-city-brand__platform">RHF CITY OS</span>
  {open&&<div className="rhf-city-brand__overlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setOpen(false)}}>
   <section className="rhf-city-brand__dialog" role="dialog" aria-modal="true" aria-label="شخصی‌سازی هویت شهرداری">
    <header><h2>هویت و تنظیمات شهرداری</h2><button type="button" onClick={()=>setOpen(false)} aria-label="بستن">×</button></header>
    <p className="rhf-city-brand__hint">تنظیمات و تصاویر فقط به شهرداری انتخاب‌شده اعمال می‌شود. بارگذاری تصاویر نیازمند حق استفاده قانونی است.</p>
    {error&&<p role="alert" className="rhf-city-brand__error">{error}</p>}
    {info&&<p role="status" className="rhf-city-brand__success">{info}</p>}
    {isSystemAdmin&&<div className="rhf-city-brand__tabbar"><button onClick={()=>setCreating(false)} type="button" aria-pressed={!creating}>ویرایش شهر جاری</button><button onClick={()=>setCreating(true)} type="button" aria-pressed={creating}>تعریف شهرداری جدید</button></div>}
    {creating?<form className="rhf-city-brand__form" onSubmit={createCity}><label>نام رسمی شهرداری<input minLength={3} maxLength={150} value={newCity} onChange={e=>setNewCity(e.target.value)} required/></label><p className="rhf-city-brand__hint">پس از ایجاد شهر، همان شهر انتخاب می‌شود و می‌توانید لوگو، اطلاعات و تصویر شاخص را وارد کنید. اتصال سرویس‌های تخصصی و تعیین کاربران مرحله جداگانه دارد.</p><button type="submit" disabled={busy}>ثبت شهرداری و انتخاب آن</button></form>
     :<><form className="rhf-city-brand__form" onSubmit={save}>
       {[['displayName','عنوان نمایشی'],['province','استان'],['cityCode','کد شهرداری'],['address','نشانی'],['telephone','شماره تماس'],['website','وب‌سایت رسمی HTTPS'],['motto','شعار شهر'],['heroTitle','عنوان بنای شاخص یا شخصیت'],['imageCredit','نام عکاس / منبع'],['imageLicense','مجوز یا حق استفاده تصویر']].map(([key,label])=><label key={key}>{label}<input maxLength={key==='address'?250:key==='website'?240:180} value={draft[key]||''} onChange={e=>setDraft(x=>({...x,[key]:e.target.value}))}/></label>)}
       <label>معرفی کوتاه شهر<textarea maxLength={1200} rows={3} value={draft.about||''} onChange={e=>setDraft(x=>({...x,about:e.target.value}))}/></label>
       <label>دسته تصویر شاخص<select value={draft.heroCategory||'LANDMARK'} onChange={e=>setDraft(x=>({...x,heroCategory:e.target.value}))}>{Object.entries(categories).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
       <label>رنگ سازمانی شهر<input type="color" value={draft.accentColor||'#0b6372'} onChange={e=>setDraft(x=>({...x,accentColor:e.target.value}))}/></label>
       <button type="submit" disabled={busy||!brand?.canEdit}>ذخیره هویت شهرداری</button>
      </form>
      <div className="rhf-city-brand__assets"><label>لوگو (PNG / JPEG / WebP، حداکثر ۲ مگابایت)<input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy||!brand?.canEdit} onChange={e=>{upload('LOGO',e.target.files?.[0]);e.target.value='';}}/></label>{brand?.logoUrl&&<button type="button" disabled={busy} onClick={()=>removeImage('LOGO')}>حذف لوگو</button>}
       <label>تصویر شاخص بنا یا شخصیت<input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy||!brand?.canEdit} onChange={e=>{upload('HERO',e.target.files?.[0]);e.target.value='';}}/></label>{brand?.heroUrl&&<button type="button" disabled={busy} onClick={()=>removeImage('HERO')}>حذف تصویر شاخص</button>}
      </div></>}
   </section>
  </div>}
 </div>;
}
