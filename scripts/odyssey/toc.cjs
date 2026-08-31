const fs=require('fs');
const h=fs.readFileSync('book.html','utf8');
const i=h.indexOf('window.appData');
const q=h.indexOf('"',i); let j=q+1,out='';
while(j<h.length){const c=h[j]; if(c==='\\'){out+=h[j]+h[j+1]; j+=2; continue;} if(c==='"')break; out+=c; j++;}
let raw=JSON.parse('"'+out+'"');
if(raw.startsWith('%'))raw=decodeURIComponent(raw);
const d=JSON.parse(raw);
fs.writeFileSync('toc.json',JSON.stringify({bookId:d.book.id,toc:d.book.toc},null,2));
console.log('bookId',d.book.id,'toc',d.book.toc.length);
