// RHF City OS · Municipality branding scoped to the authenticated city.
// Does NOT change appointment authorization, municipality membership, or value attestation.
export const MUNICIPAL_BRANDING_PARTS = Object.freeze(['municipality-branding','municipality-brand-assets']);
const MAX_BYTES = 2 * 1024 * 1024;
export class BrandingError extends Error {constructor(message,status=400){super(message);this.status=status;this.rhfIamError=true;}}
const fields = Object.freeze({
 displayName:150, province:100, cityCode:40, address:250, telephone:60,
 website:240, motto:180, about:1200, accentColor:7,
 heroCategory:16, heroTitle:150, imageCredit:240, imageLicense:160
});
function normalize(body){
 if(!body || typeof body!=='object' || Array.isArray(body)) throw new BrandingError('اطلاعات پروفایل نامعتبر است');
 const p={};
 for(const [key,value] of Object.entries(body)){
  if(!(key in fields) || typeof value!=='string' || value.trim().length>fields[key]) throw new BrandingError('فیلد یا طول مقدار نامعتبر: '+key);
  p[key]=value.trim();
 }
 if(!Object.keys(p).length)throw new BrandingError('حداقل یک فیلد وارد کنید');
 if(p.accentColor && !/^#[0-9a-fA-F]{6}$/.test(p.accentColor))throw new BrandingError('کد رنگ باید شش رقم هگزادسیمال باشد');
 if(p.heroCategory && !['LANDMARK','PERSON','NATURE','OTHER'].includes(p.heroCategory))throw new BrandingError('دسته تصویر نامعتبر است');
 if(p.website && !/^https:\/\/[\w.-]+(?::\d{1,5})?(?:\/[\w~!$&'()*+,;=:@%./?#-]*)?$/.test(p.website))throw new BrandingError('نشانی وب‌سایت باید HTTPS معتبر باشد');
 return p;
}
function columnize(profile){const cols={displayName:'display_name',province:'province',cityCode:'city_code',address:'address',telephone:'telephone',website:'website',motto:'motto',about:'about',accentColor:'accent_color',heroCategory:'hero_category',heroTitle:'hero_title',imageCredit:'image_credit',imageLicense:'image_license'};return Object.fromEntries(Object.entries(profile).map(([k,v])=>[cols[k],v]));}
function identifyImage(bytes,type){
 if(type==='image/png' && bytes.length>=8 && bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return type;
 if(type==='image/jpeg'&&bytes.length>=4&&bytes[0]===255&&bytes[1]===216&&bytes[bytes.length-2]===255&&bytes[bytes.length-1]===217)return type;
 if(type==='image/webp'&&bytes.length>=12&&bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP')return type;
 throw new BrandingError('فقط PNG، JPEG یا WebP واقعی قابل بارگذاری است',415);
}
async function readImage(req){
 const parts=[];let total=0;
 for await (const chunk of req){total+=chunk.length;if(total>MAX_BYTES)throw new BrandingError('تصویر بزرگ‌تر از ۲ مگابایت است',413);parts.push(chunk);}
 if(total<12)throw new BrandingError('فایل تصویر معتبر نیست',415);
 return Buffer.concat(parts,total);
}
function mapProfile(row,city,canEdit,assets){
 const p=row||{};const id=encodeURIComponent(city.id);
 return {
  municipalityId:city.id,tenantId:city.tenant_id,cityName:city.name,
  displayName:p.display_name||city.name,province:p.province||'',cityCode:p.city_code||'',
  address:p.address||'',telephone:p.telephone||'',website:p.website||'',
  motto:p.motto||'',about:p.about||'',accentColor:p.accent_color||'#0b6372',
  heroCategory:p.hero_category||'LANDMARK',heroTitle:p.hero_title||'',
  imageCredit:p.image_credit||'',imageLicense:p.image_license||'',
  logoUrl:assets.includes('LOGO')?`/api/v1/cities/${id}/municipality-brand-assets/LOGO`:null,
  heroUrl:assets.includes('HERO')?`/api/v1/cities/${id}/municipality-brand-assets/HERO`:null,
  canEdit,updatedAt:p.updated_at||null
 };
}
export async function municipalityBrandingRoute({part,resourceId,method,req,res,cityId,user,withScope,readBody,json,audit,canManage}){
 if(!MUNICIPAL_BRANDING_PARTS.includes(part))throw new BrandingError('مسیر ناشناخته',404);
 if(part==='municipality-branding'){
  if(resourceId)throw new BrandingError('مسیر ناشناخته',404);
  if(method==='GET')return json(200,await withScope(cityId,user,'read',async(client,city,role)=>{
   const p=await client.query('SELECT * FROM municipality_branding WHERE municipality_id=$1',[city.id]);
   const a=await client.query('SELECT slot FROM municipality_brand_assets WHERE municipality_id=$1',[city.id]);
   return mapProfile(p.rows[0],city,!!user.is_system_admin||canManage(role),a.rows.map(x=>x.slot));
  }));
  if(method==='PATCH'){
   const input=normalize(await readBody(req));
   return json(200,await withScope(cityId,user,'manage',async(client,city)=>{
    const p=columnize(input),keys=Object.keys(p),vals=Object.values(p);
    await client.query('INSERT INTO municipality_branding(tenant_id,municipality_id) VALUES($1,$2) ON CONFLICT (municipality_id) DO NOTHING',[city.tenant_id,city.id]);
    const sets=keys.map((k,i)=>`"${k}"=$${i+2}`).join(',');
    await client.query(`UPDATE municipality_branding SET ${sets}, updated_at=now() WHERE municipality_id=$1`,[city.id,...vals]);
    await audit(client,city,user,'MUNICIPALITY_BRAND',city.id,'UPDATE_PROFILE',{fields:keys});
    const row=(await client.query('SELECT * FROM municipality_branding WHERE municipality_id=$1',[city.id])).rows[0];
    const assets=(await client.query('SELECT slot FROM municipality_brand_assets WHERE municipality_id=$1',[city.id])).rows.map(x=>x.slot);
    return mapProfile(row,city,true,assets);
   }));
  }
  throw new BrandingError('روش درخواست پشتیبانی نمی‌شود',405);
 }
 if(!['LOGO','HERO'].includes(resourceId))throw new BrandingError('نوع تصویر یافت نشد',404);
 if(method==='GET'){
  const row=await withScope(cityId,user,'read',async(client,city)=>{
   const result=await client.query('SELECT mime_type,image_bytes FROM municipality_brand_assets WHERE municipality_id=$1 AND slot=$2',[city.id,resourceId]);
   return result.rows[0]||null;
  });
  if(!row)throw new BrandingError('تصویر ثبت نشده است',404);
  res.writeHead(200,{'Content-Type':row.mime_type,'Content-Length':row.image_bytes.length,'Cache-Control':'private, max-age=60','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox"});
  res.end(row.image_bytes);return;
 }
 if(method==='PUT'){
  // Assert management permission BEFORE accepting untrusted large uploads.
  await withScope(cityId,user,'manage',async()=>true);
  const mime=String(req.headers['content-type']||'').split(';')[0].trim().toLowerCase();
  const bytes=await readImage(req);identifyImage(bytes,mime);
  return json(200,await withScope(cityId,user,'manage',async(client,city)=>{
   await client.query(`INSERT INTO municipality_brand_assets(tenant_id,municipality_id,slot,mime_type,image_bytes,uploaded_by)
     VALUES($1,$2,$3,$4,$5,$6)
     ON CONFLICT (municipality_id,slot) DO UPDATE SET mime_type=EXCLUDED.mime_type,image_bytes=EXCLUDED.image_bytes,uploaded_by=EXCLUDED.uploaded_by,uploaded_at=now()`,
     [city.tenant_id,city.id,resourceId,mime,bytes,user.id]);
   await audit(client,city,user,'MUNICIPALITY_BRAND_ASSET',city.id,'UPLOAD_'+resourceId,{mime,size:bytes.length});
   return {ok:true,slot:resourceId,bytes:bytes.length};
  }));
 }
 if(method==='DELETE')return json(200,await withScope(cityId,user,'manage',async(client,city)=>{
  await client.query('DELETE FROM municipality_brand_assets WHERE municipality_id=$1 AND slot=$2',[city.id,resourceId]);
  await audit(client,city,user,'MUNICIPALITY_BRAND_ASSET',city.id,'DELETE_'+resourceId);
  return {ok:true,slot:resourceId};
 }));
 throw new BrandingError('روش درخواست پشتیبانی نمی‌شود',405);
}
export const brandingInternalsForTest = {normalize,identifyImage,mapProfile,MAX_BYTES};
