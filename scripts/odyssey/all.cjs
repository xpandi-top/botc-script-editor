const fs=require('fs');
const {toc}=JSON.parse(fs.readFileSync('toc.json','utf8'));
fs.mkdirSync('txt',{recursive:true});
function clean(c){
c=c.replace(/<card[^>]*name="image"[^>]*value="([^"]*)"[^>]*>/g,(m,v)=>{try{const o=JSON.parse(decodeURIComponent(v.replace(/^data:/,'')));return `\n[IMG ${o.src} name=${o.name||''}]\n`;}catch(e){return '[IMG?]';}});
c=c.replace(/<card[^>]*>/g,'');
c=c.replace(/<\/?(p|div|h1|h2|h3|h4|li|tr)[^>]*>/g,'\n');
c=c.replace(/<\/td>/g,' | ');
c=c.replace(/<br\s*\/?>/g,'\n');
c=c.replace(/<[^>]+>/g,'');
c=c.replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#(\d+);/g,(m,d)=>String.fromCharCode(d));
return c.replace(/\n{3,}/g,'\n\n').trim();
}
let idx=[];
for(const t of toc){ if(t.type!=='DOC'||!t.url) continue;
  const p=`docs/${t.url}.json`; if(!fs.existsSync(p))continue;
  const j=JSON.parse(fs.readFileSync(p,'utf8'));
  const txt=clean(j.data.content||'');
  fs.writeFileSync(`txt/${t.url}.txt`,`=== ${j.data.title} ===\n`+txt);
  idx.push({slug:t.url,title:t.title,len:txt.length});
}
fs.writeFileSync('index.json',JSON.stringify(idx,null,2));
console.log('wrote',idx.length);
