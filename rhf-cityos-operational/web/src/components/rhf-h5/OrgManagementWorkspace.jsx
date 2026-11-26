import React,{useState,useEffect} from 'react';

const style={
  panel:{background:'var(--surface,#fff)',border:'1px solid #a0a0a044',borderRadius:16,padding:20,marginBottom:20},
  btn:{padding:'9px 14px',borderRadius:9,cursor:'pointer',margin:4},
  muted:{color:'var(--muted,#777)'}
};

export default function OrgManagementWorkspace({
  city,cityName,units,cases,navigate,api
}){
  const [tab,setTab]=useState('list');
  const [search,setSearch]=useState('');
  const [selected,setSelected]=useState(null);
  const [remote,setRemote]=useState(null);

  useEffect(()=>{
    let active=true;
    setRemote(null);
    setSelected(null);
    setSearch('');
    if(city && typeof api==='function'){
      Promise.resolve()
        .then(()=>api(`/cities/${city}/org-creation`))
        .then(data=>{if(active)setRemote(data)})
        .catch(()=>{if(active)setRemote({mode:'NOT_DEPLOYED'})});
    }
    return()=>{active=false};
  },[city]);

  const rows=(Array.isArray(units)?units:[])
    .filter(u=>u && (!u.municipality_id || u.municipality_id===city));

  const visible=rows.filter(u=>
    `${u.name_fa||u.name||''} ${u.code||''}`
      .toLocaleLowerCase('fa')
      .includes(search.toLocaleLowerCase('fa'))
  ).slice(0,150);

  const open=new Set([
    'RECEIVED','TRIAGED','ASSIGNED',
    'IN_PROGRESS','AWAITING_ACCEPTANCE'
  ]);

  const assigned=Array.isArray(cases)
    ?cases.filter(c=>
      open.has(c.status) &&
      rows.some(u=>u.id===(c.unit_id||c.unitId))
    ).length:null;

  const chosen=rows.find(u=>u.id===selected);
  const ready=remote?.mode==='READY';

  const number=n=>n===null?'—':n.toLocaleString('fa-IR');

  return <section dir="rtl" style={style.panel}
    data-rhf-org-operations="f12e5b-direct-readonly-v0.1">

    <small style={style.muted}>RHF City OS | معاونت خدمات شهری</small>
    <h2>مدیریت سازمان‌ها و واحدهای تابعه</h2>
    <p>{cityName||'شهرداری منتخب'} — ساختار رسمی، واحدها، پرونده‌ها و گردش تصویب</p>

    <div style={{...style.panel,background:'var(--surface-secondary,#f4f6f8)'}}>
      <strong>واحدهای ثبت‌شده: {number(rows.length)}</strong>
      <p>پرونده‌های باز قابل انتساب: {number(assigned)}</p>
      <p>درگاه ایجاد و تصویب: {ready?'متصل':'هنوز منتشر نشده'}</p>
      <p style={style.muted}>
        ثبت و تصویب رسمی فقط پس از آماده‌شدن API امن و تأیید مستقل فعال می‌شود.
      </p>
    </div>

    <div>
      <button style={style.btn} onClick={()=>setTab('list')}>
        سازمان‌های موجود
      </button>
      <button style={style.btn} onClick={()=>setTab('create')}>
        درخواست ایجاد سازمان
      </button>
      <button style={style.btn} onClick={()=>setTab('review')}>
        صندوق بررسی و تصویب
      </button>
    </div>

    {tab==='list'&&<>
      <p><input aria-label="جست‌وجوی سازمان" value={search}
        placeholder="جست‌وجوی نام یا کد سازمان"
        onChange={e=>setSearch(e.target.value)}
        style={{padding:10,maxWidth:400,width:'100%'}}/></p>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(230px,1fr))',gap:12}}>
        <div>
          {visible.map(u=><button key={u.id} style={{...style.btn,display:'block',width:'95%',textAlign:'right'}}
            onClick={()=>setSelected(u.id)}>
            <strong>{u.name_fa||u.name||'بدون نام'}</strong>
            <div style={style.muted}>{u.code||'بدون کد'} · {u.kind||'نامشخص'}</div>
          </button>)}
          {!visible.length&&<p>واحدی برای نمایش یافت نشد.</p>}
        </div>
        <aside style={style.panel}>
          <h3>شناسنامه واحد</h3>
          {chosen?<div>
            <p>نام: {chosen.name_fa||chosen.name}</p>
            <p>کد: {chosen.code||'—'}</p>
            <p>نوع: {chosen.kind||'—'}</p>
            <p>وضعیت: {chosen.active===false?'غیرفعال':'فعال'}</p>
            <p>بالادستی: {rows.find(u=>u.id===chosen.parent_id)?.name_fa||'نامشخص'}</p>
            <p>پیشرفت پروژه: فاقد داده تأییدشده</p>
          </div>:<p>برای مشاهده جزئیات، یک واحد را انتخاب کنید.</p>}
          <button style={style.btn} onClick={()=>navigate?.('cases')}>
            مشاهده پرونده‌های خدمات شهری
          </button>
        </aside>
      </div>
    </>}

    {tab==='create'&&<div style={style.panel}>
      <h3>درخواست ایجاد سازمان یا اداره</h3>
      <p>شامل آرامستان‌ها، میادین، پسماند، فضای سبز و سایر واحدهای مصوب.</p>
      <p>برای ثبت رسمی، مستند تشکیلاتی و تأیید مستقل الزامی است.</p>
      <button disabled>ثبت درخواست — در انتظار فعال‌سازی امن</button>
    </div>}

    {tab==='review'&&<div style={style.panel}>
      <h3>صندوق تصویب مستقل</h3>
      {ready?<p>درگاه متصل است؛ نمایش و اجرای تصمیم نیازمند تکمیل فرم امن است.</p>
        :<p>API تصویب هنوز در نسخه عملیاتی نصب نشده است.</p>}
      <button disabled>تصویب یا رد — غیرفعال</button>
    </div>}
  </section>;
}
