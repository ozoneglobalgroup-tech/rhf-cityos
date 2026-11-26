import React,{useEffect,useMemo,useState} from 'react';

const isUuid=s=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(s||''));
const border='1px solid #cbd5e1';
const cell={padding:'8px 10px',borderBottom:border,textAlign:'right',verticalAlign:'top'};

/** Non-mutating companion panel to DV32D. All city scope is selected explicitly or inherited from a valid parent prop. */
export default function Dv32ECapacityGovernance({cityId:parentCityId,municipalityId,selectedCityId,activeCityId}) {
  const inherited=[parentCityId,municipalityId,selectedCityId,activeCityId].find(isUuid) || '';
  const [cities,setCities]=useState([]);
  const [cityId,setCityId]=useState(inherited);
  const [data,setData]=useState(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  useEffect(()=>{if(inherited)setCityId(inherited);},[inherited]);
  useEffect(()=>{
    const abort=new AbortController();
    fetch('/api/v1/municipalities',{credentials:'same-origin',signal:abort.signal})
      .then(async r=>{if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.json();})
      .then(x=>{if(!abort.signal.aborted)setCities(Array.isArray(x)?x:[]);})
      .catch(e=>{if(!abort.signal.aborted)setError('فهرست شهرداری‌های مجاز در دسترس نیست: '+e.message);});
    return ()=>abort.abort();
  },[]);
  useEffect(()=>{
    setData(null);setError('');
    if(!isUuid(cityId))return;
    const abort=new AbortController();setLoading(true);
    fetch(`/api/v1/cities/${encodeURIComponent(cityId)}/dv32e-capacity-governance`,{credentials:'same-origin',signal:abort.signal})
      .then(async r=>{if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.json();})
      .then(x=>{if(!abort.signal.aborted)setData(x);})
      .catch(e=>{if(!abort.signal.aborted)setError('دریافت داده‌های حکمرانی ظرفیت ناموفق بود: '+e.message);})
      .finally(()=>{if(!abort.signal.aborted)setLoading(false);});
    return ()=>abort.abort();
  },[cityId]);
  const rows=useMemo(()=>data?.opportunities?.slice(0,200)||[],[data]);
  return <section dir="rtl" aria-label="حکمرانی ظرفیت و شواهد ارزش شهری" style={{border,padding:16,borderRadius:12,margin:'16px 0',background:'#fff',color:'#0f172a'}}>
    <h3 style={{margin:'0 0 6px'}}>DV32E | حکمرانی ظرفیت و شواهد خلق ارزش</h3>
    <p style={{margin:'0 0 12px',fontSize:13}}>فقط تحلیل و پیشنهاد مستند؛ هر تخصیص واقعی نیازمند تأیید انسانی در DV32D است. اعزام خودکار مجاز نیست.</p>
    <label style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>شهرداری
      <select aria-label="انتخاب شهرداری" value={cityId} onChange={e=>setCityId(e.target.value)} style={{padding:8,border,borderRadius:6,minWidth:200}}>
        <option value="">انتخاب کنید</option>
        {cities.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}
        {!!cityId&&!cities.some(x=>x.id===cityId)&&<option value={cityId}>شهرداری انتخاب‌شده</option>}
      </select>
    </label>
    {loading&&<p role="status">در حال خواندن ظرفیت‌های مجاز…</p>}
    {!!error&&<p role="alert" style={{color:'#991b1b'}}>{error}</p>}
    {!!data&&<>
      <p style={{marginBottom:12,fontSize:13}}>مخازن ظرفیت: <strong>{data.summary.resourcePools}</strong> | قابل بررسی: <strong>{data.summary.reviewCandidates}</strong> | تعارض ظرفیت: <strong>{data.summary.capacityConflicts}</strong> | پرونده‌های باز شهر: <strong>{data.summary.openServiceCases}</strong></p>
      {data.summary.truncated&&<p role="alert">فهرست به ۲۰۰ منبع محدود شده است؛ این گزارش جامع نیست.</p>}
      <div style={{overflowX:'auto'}}><table style={{borderCollapse:'collapse',width:'100%',fontSize:13}}><thead><tr><th style={cell}>منبع تجمیعی</th><th style={cell}>نوع و واحد</th><th style={cell}>ظرفیت قابل بررسی</th><th style={cell}>کیفیت</th><th style={cell}>وضعیت</th><th style={cell}>شواهد و ارزیابی</th></tr></thead><tbody>
        {rows.map(x=><tr key={x.resourceId}><td style={cell}>{x.name} ({x.code})</td><td style={cell}>{x.resourceKind} / {x.unit}</td><td style={cell}>{x.headroomQuantity}</td><td style={cell}>{x.qualityBps/100}%</td><td style={cell}>{x.classification}</td><td style={cell}><code>{x.resourceId}</code><div>ارزش تأییدشده: خیر</div><div>خط مبنا، پیگیری و بازبین مستقل: الزامی</div></td></tr>)}
        {rows.length===0&&<tr><td colSpan={6} style={cell}>برای این شهرداری منبع ظرفیتی ثبت نشده است.</td></tr>}
      </tbody></table></div>
      <p style={{fontSize:12,marginBottom:0}}>تعداد پرونده‌های باز، به‌تنهایی نشان‌دهنده تقاضای واقعی برای منابع بالا نیست. ارزش مالی یا اجتماعی تا زمان بررسی مستقل قابل ادعا نیست.</p>
    </>}
  </section>;
}
