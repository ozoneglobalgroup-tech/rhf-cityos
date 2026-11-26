// RHF V8P5.3 — strictly self-contained deterministic SYNTHETIC PRESENTATION DATA.
// Never present as city facts, measured outcomes, external PUC+ records or independent verification.
export const BRAND=Object.freeze({red:'#E42527',green:'#089949',blue:'#226DB4',yellow:'#F9B21D',white:'#FFFFFF'});
export const VERSION='RHF-DEPUTY-PERFORMANCE-V8P5.3';
export const WEIGHTS=Object.freeze({P:0.35,U:0.25,C:0.20,Plus:0.20});
export const PERIODS=Object.freeze(['خرداد','تیر','مرداد','شهریور','مهر','آبان']);
export const REGIONS=Object.freeze(['منطقه ۱','منطقه ۲','منطقه ۳','منطقه ۴','منطقه ۵','منطقه ۶','منطقه ۷','منطقه ۸','منطقه ۹','منطقه ۱۰','منطقه ۱۱','ناحیه ویژه باغات']);
export const ORGS=Object.freeze([
 ['WASTE','سازمان مدیریت پسماند','خدمات جمع‌آوری، بازیافت، مراکز پردازش',86,78,92,75,['جمع‌آوری و حمل','تفکیک و بازیافت','پردازش و دفع'],1430,97],
 ['GREEN','فضای سبز و باغات','آبیاری، نگهداشت، صیانت باغات',82,81,88,91,['باغات قصردشت','درختان و هرس','آبیاری و نگهداشت'],1190,94],
 ['CEMETERY','سازمان مدیریت آرامستان‌ها','خدمات و زیرساخت آرامستان',77,83,90,70,['خدمات مراجعان','نگهداشت آرامستان','توسعه زیرساخت'],630,92],
 ['MARKETS','میادین و ساماندهی مشاغل','بهداشت، بازرسی و مدیریت مراکز',81,79,85,74,['بازرسی میادین','مدیریت غرفه‌ها','ساماندهی مشاغل'],860,89],
 ['BEAUTIFICATION','زیباسازی و منظر شهری','مبلمان، نورپردازی و بهسازی منظر',75,82,76,86,['نورپردازی شهری','مبلمان شهری','بهسازی منظر'],740,88],
 ['PUBLIC','خدمات عمومی و نظافت','نظافت، شست‌وشو و رسیدگی عمومی',89,85,88,83,['نظافت معابر','تجهیزات خدمات عمومی','رسیدگی ۱۳۷'],1740,96],
 ['ENV','محیط‌زیست شهری','آلودگی، کنترل و پایش محیطی',83,75,91,79,['پایش آلودگی','کنترل محیطی','پایش شکایات'],690,91],
 ['FIRE','ایمنی و آتش‌نشانی (در صورت تابعه بودن)','ایمنی، پیشگیری و آمادگی',85,80,93,77,['آمادگی و پاسخ','پیشگیری','آموزش ایمنی'],710,95],
 ['FLEET','ناوگان و ماشین‌آلات','آماده‌به‌کاری، تعمیرات و مصرف سوخت',79,73,84,87,['تعمیرات و نگهداشت','تخصیص ناوگان','پایش سوخت'],810,86],
 ['CONTRACT','نظارت بر پیمانکاران','SLA، قراردادها و پایش خدمت',72,78,46,69,['کنترل SLA','رسیدگی به صورت‌وضعیت','نظارت میدانی'],970,78],
 ['CITIZEN','آموزش و مشارکت شهروندی','مشارکت و آموزش شهروندان',90,87,92,85,['برنامه‌های آموزشی','ارتباطات ۱۳۷','مشارکت داوطلبانه'],980,97],
 ['STAFF','ستاد و پشتیبانی معاونت','بودجه، برنامه و منابع انسانی',80,84,95,76,['منابع انسانی','برنامه و بودجه','تحلیل و گزارش'],1130,93]
]);
export const round=x=>Math.round(x);
export function puc({P,U,C,Plus}){const values=[P,U,C,Plus];if(values.some(v=>typeof v!=='number'||!Number.isFinite(v)||v<0||v>100))throw Error('INVALID_PUC');return round(P*.35+U*.25+C*.2+Plus*.2);}
export const veto=x=>x.C<50;
export function syntheticPortfolio(){return ORGS.map(([id,name,mission,P,U,C,Plus,units,casesCount,sla],i)=>{
 const dimensions={P,U,C,Plus};const score=puc(dimensions);
 const trend=PERIODS.map((_,j)=>Math.min(100,Math.max(0,score+Math.round((j-4)*1.65+Math.sin((i+2)*(j+1))*(2.4+(i%3))))));
 return Object.freeze({id,name,mission,dimensions,score,veto:veto(dimensions),units:units.map((title,k)=>({id:`${id}-${k+1}`,title,score:Math.max(0,Math.min(100,score-5+(k*4)+(i%4))),sampleCount:35+(i*9)+(k*4)})),casesCount,sla,trend,alerts:(i%4)+1,source:'SYNTHETIC_PRESENTATION',region:REGIONS[i%REGIONS.length]});});}
export function summarize(rows){if(!rows?.length)return {average:null,vetoCount:0,coverage:0,unitCount:0,examples:0,high:0};const active=rows.filter(x=>!x.veto);return {average:round(rows.reduce((s,r)=>s+r.score,0)/rows.length),vetoCount:rows.filter(x=>x.veto).length,coverage:rows.length,unitCount:rows.reduce((s,r)=>s+(r.units?.length||0),0),examples:rows.reduce((s,r)=>s+(r.casesCount||0),0),high:active.filter(x=>x.score>=85).length};}
export function dimensionAverages(rows){const keys=['P','U','C','Plus'];return Object.fromEntries(keys.map(k=>[k,rows.length?round(rows.reduce((s,r)=>s+r.dimensions[k],0)/rows.length):null]));}
export function fromConnector(data){if(!data||data.state!=='CONNECTED'||data.source!=='EXTERNAL_AGGREGATE'||data.schema!=='RHF_PUC_AGGREGATE_V1'||!/^20\d{2}-(0[1-9]|1[0-2])$/.test(data.period)||!Array.isArray(data.organizations)||data.organizations.length>12)return null;
 const seen=new Set();const rows=[];
 for(const r of data.organizations){const org=ORGS.find(x=>x[0]===r.orgKey);if(!org||seen.has(r.orgKey)||!Number.isSafeInteger(r.sampleSize)||r.sampleSize<5)return null;
 const dimensions={P:r.P,U:r.U,C:r.C,Plus:r.Plus};try{const score=puc(dimensions);if(r.score!==score||r.veto!==veto(dimensions))return null;rows.push({id:r.orgKey,name:org[1],mission:org[2],dimensions,score,veto:veto(dimensions),units:[],casesCount:null,sla:null,trend:[],alerts:0,source:'EXTERNAL_AGGREGATE',sampleCount:r.sampleSize});seen.add(r.orgKey);}catch{return null;}}
 return rows.length?rows:null;
}
export function status(row){return row.veto?'VETO — انطباق کمتر از ۵۰':row.score>=85?'عملکرد برتر':row.score>=75?'قابل قبول':'نیازمند بهبود';}
