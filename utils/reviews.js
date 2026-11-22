import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
export const validPhotoId=id=>/^\d{13}-[a-f0-9]{6}$/.test(id);
export function createReviewStore(photos) {
  const directory=path.join(path.dirname(photos),'reviews');fs.mkdirSync(directory,{recursive:true});
  const file=id=>path.join(directory,`${id}.json`);
  const write=record=>{const target=file(record.id);fs.writeFileSync(`${target}.tmp`,JSON.stringify(record,null,2));fs.renameSync(`${target}.tmp`,target);return record;};
  const get=id=>{
    if(!validPhotoId(id)) return null;
    if(fs.existsSync(file(id))) return JSON.parse(fs.readFileSync(file(id),'utf8'));
    if(fs.existsSync(path.join(photos,`${id}.jpg`))) return {id,status:'completed',legacy:true,prompt:null,createdAt:new Date(Number(id.split('-')[0])).toISOString(),hasSource:fs.existsSync(path.join(photos,`${id}-source.jpg`)),rating:null};
    return null;
  };
  return {
    get,
    start(record,input,reference) {
      fs.writeFileSync(path.join(directory,`${record.id}-input.jpg`),input);
      if(reference) fs.writeFileSync(path.join(directory,`${record.id}-reference.jpg`),reference);
      return write({...record,status:'processing',legacy:false,hasSource:true,hasReference:Boolean(reference),createdAt:new Date().toISOString(),inputSha256:crypto.createHash('sha256').update(input).digest('hex'),referenceSha256:reference?crypto.createHash('sha256').update(reference).digest('hex'):null,rating:null});
    },
    finish(id,status,details={}) {const record=get(id);if(record&&!record.legacy)write({...record,...details,status,finishedAt:new Date().toISOString()});},
    list() {
      const ids=new Set(fs.readdirSync(directory).filter(n=>/^\d{13}-[a-f0-9]{6}\.json$/.test(n)).map(n=>n.slice(0,-5)));
      fs.readdirSync(photos).filter(n=>/^\d{13}-[a-f0-9]{6}\.jpg$/.test(n)).forEach(n=>ids.add(n.slice(0,-4)));
      return [...ids].sort().reverse().map(get);
    },
    rate(id,rating) {
      const record=get(id);if(!record)return null;
      if(!rating || typeof rating!=='object') throw Object.assign(new Error('Invalid review rating.'),{status:400});
      if(!['','clearly-me','mostly-me','not-me'].includes(rating.likeness??'') || !['','correct','minor-issues','wrong'].includes(rating.bottle??'') || !Number.isInteger(rating.quality) || rating.quality<0 || rating.quality>5 || typeof rating.notes!=='string' || rating.notes.length>4000 || !Array.isArray(rating.issues) || rating.issues.some(x=>!['face-shape','eyes','nose','lips','age','skin','hair','missing-person'].includes(x))) throw Object.assign(new Error('Invalid review rating.'),{status:400});
      return write({...record,rating:{likeness:rating.likeness||'',bottle:rating.bottle||'',quality:rating.quality,notes:rating.notes,issues:[...new Set(rating.issues)],updatedAt:new Date().toISOString()}});
    },
    asset(id,kind) {
      const record=get(id);if(!record)return null;
      if(kind==='input')return record.legacy?(record.hasSource?path.join(photos,`${id}-source.jpg`):null):path.join(directory,`${id}-input.jpg`);
      if(kind==='reference'&&record.hasReference)return path.join(directory,`${id}-reference.jpg`);
      if(kind==='output')return path.join(photos,`${id}.jpg`);
      return null;
    },
  };
}
export function mountReviews(app,store,token) {
  app.use('/api/reviews',(req,res,next)=>{
    res.setHeader('Cache-Control','no-store');
    if(!token)return res.status(503).json({message:'Review access is not configured.'});
    const supplied=Buffer.from(req.get('authorization')||'');const expected=Buffer.from(`Bearer ${token}`);
    if(supplied.length!==expected.length || !crypto.timingSafeEqual(supplied,expected))return res.status(401).json({message:'Enter the review access code.'});
    next();
  });
  app.get('/api/reviews',(req,res)=>res.json({reviews:store.list()}));
  app.get('/api/reviews/:id/assets/:kind',(req,res)=>{
    const asset=store.asset(req.params.id,req.params.kind);
    if(!asset || !fs.existsSync(asset))return res.status(404).json({message:'Image unavailable.'});
    res.sendFile(path.resolve(asset));
  });
  app.put('/api/reviews/:id/rating',(req,res,next)=>{
    try {const record=store.rate(req.params.id,req.body);if(!record)return res.status(404).json({message:'Generation not found.'});res.json(record);}
    catch(error){next(error);}
  });
}
