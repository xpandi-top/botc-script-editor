const fs=require('fs'),cp=require('child_process');
const {bookId,toc}=JSON.parse(fs.readFileSync('toc.json','utf8'));
const docs=toc.filter(t=>t.type==='DOC'&&t.url);
console.log('docs',docs.length);
let n=0;
for(const d of docs){
  const f=`docs/${d.url}.json`;
  if(fs.existsSync(f)&&fs.statSync(f).size>500){n++;continue;}
  const cmd=`curl -s -H 'x-requested-with: XMLHttpRequest' -H 'referer: https://www.yuque.com/u48069482/taiyi' -A 'Mozilla/5.0' 'https://www.yuque.com/api/docs/${d.url}?book_id=${bookId}&merge_dynamic_data=false' -o ${f}`;
  try{cp.execSync(cmd);}catch(e){console.log('ERR',d.url);}
  n++;
  if(n%10===0)console.log(n,d.title);
  cp.execSync('sleep 0.4');
}
console.log('done',n);
