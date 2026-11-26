import React, {useState} from 'react';
import {simulateEvidenceGatedScenario} from './digitalTwinApi.js';

/**
 * Embed as a tab in the EXISTING DeputyDigitalTwinLabV8P63 route.
 * Scenario must come from explicitly authorized municipal workspace (not query string).
 * Rendering a demo is not a real-world value-creation claim.
 */
export default function DigitalTwinEvidencePanel({scenario, onSimulation}) {
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const canSimulate = !!scenario && !busy;
  async function run() {
    setBusy(true); setError(''); setResult(null);
    try {
      const r = await simulateEvidenceGatedScenario(scenario);
      setResult(r);
      if (onSimulation) onSimulation(r); // informational callback; never a governed handoff
    } catch (e) { setError(`${e.code || 'ERROR'}: ${e.message}`); }
    finally { setBusy(false); }
  }
  const money = x => typeof x === 'number' ? new Intl.NumberFormat('fa-IR', {maximumFractionDigits:0}).format(x) : '—';
  const number = x => typeof x === 'number' ? new Intl.NumberFormat('fa-IR', {maximumFractionDigits:2}).format(x) : '—';
  const box = {border:'1px solid #b9cedd', borderRadius:12, padding:16, marginBlock:12, background:'#fff'};
  const small = {fontSize:13, color:'#41586d'};
  return <section lang="fa" dir="rtl" aria-label="آزمایشگاه سناریوی مبتنی بر شواهد" style={{maxWidth:1100, margin:'auto', fontFamily:'inherit'}}>
    <div style={{...box, borderInlineStart:'5px solid #a86e17'}}>
      <h2 style={{marginTop:0}}>آزمایشگاه دوقلوی دیجیتال — V8P6.8</h2>
      <p style={small}>پیش‌بینی و تحلیل؛ بدون اجرای عملیات شهری، بدون ارسال مجوز، و بدون شروع خودکار Workflow در Temporal.</p>
      <strong>همه نتایج این بخش «شبیه‌سازی» هستند، نه ارزش عمومی تحقق‌یافته یا مستقلاً تأییدشده.</strong>
    </div>
    <div style={box}>
      <h3>سناریوی انتخاب‌شده</h3>
      <p>{scenario?.name || 'سناریویی از میزکار مجاز انتخاب نشده است.'}</p>
      <p style={small}>دامنه: {scenario?.domain || '—'} | حالت داده: {scenario?.demo ? 'صرفاً آزمایشی و مصنوعی' : 'داده مستند؛ در صورت کسب مجوز مجزا'}</p>
      <button type="button" disabled={!canSimulate} onClick={run} style={{cursor:canSimulate?'pointer':'not-allowed',padding:'10px 18px',borderRadius:8,border:0,background:'#146b8b',color:'white'}}>
        {busy ? 'در حال محاسبه…' : 'محاسبه سناریو — بدون اقدام اجرایی'}
      </button>
      {error && <p role="alert" style={{color:'#ad2424'}}>{error}</p>}
    </div>
    {result && <div style={box}>
      <h3>خروجی موتور سناریو</h3>
      <p><b>وضعیت:</b> {result.status} | <b>شناسه:</b> <code dir="ltr">{result.simulationId}</code></p>
      {result.status === 'INSUFFICIENT_EVIDENCE' ?
        <p role="status">شواهد برای محاسبه کافی نیست: {result.missingEvidence?.join('، ')}. هیچ عدد پیش‌بینی نشده است.</p> :
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:12}}>
          <article style={box}><b>صرفه‌جویی احتمالی سالانه</b><p>{money(result.forecast?.annualScenarioForecast?.costSavingsIRR)} ریال</p><small>بازه فرضی ۵–۹۵٪: {money(result.forecast?.forecastIntervalP05P95?.costSavingsIRR?.[0])} تا {money(result.forecast?.forecastIntervalP05P95?.costSavingsIRR?.[1])}</small></article>
          <article style={box}><b>کاهش انتشار پیش‌بینی‌شده</b><p>{number(result.forecast?.annualScenarioForecast?.kgCo2eReduction)} کیلوگرم CO₂e/سال</p><small>خروجی محاسبه، نه اندازه‌گیری محیطی</small></article>
        </div>}
      <h4>ردیابی شواهد و فرض‌ها</h4>
      <ul>
        <li>مرجع مبنا: {result.provenance?.baseline?.map(x => x.id).join('، ') || 'ندارد'}</li>
        <li>لایه GIS: {result.provenance?.gis?.map(x => x.id).join('، ') || 'ندارد'}</li>
        <li>روش کالیبراسیون اظهارشده: {result.calibration?.method || 'نامشخص'}</li>
      </ul>
      <p style={{...small, background:'#f5f7f8', padding:12}}>
        مجوز انسانی: {result.governance?.humanApprovalStatus}؛ Temporal: {result.governance?.temporalWorkflowStatus}؛
        ارزش عمومی تأییدشده: <b>خیر</b>؛ اثر اجرایی: <b>هیچ</b>
      </p>
    </div>}
  </section>;
}
