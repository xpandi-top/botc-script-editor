import json,re,os
idx=json.load(open('index.json'))
SECS=['背景故事','角色简介','角色能力','角色信息','范例','运作方式','夜晚行动顺序','提示标记','规则细节','设计要点解析','游玩与对抗技巧','伪装成该角色','出现剧本','整体设计','创意来源','图标画师']
out=[]
for e in idx:
    raw=open('txt/'+e['slug']+'.txt',encoding='utf8').read()
    lines=[l.rstrip() for l in raw.split('\n')]
    if '角色能力' not in lines: continue
    imgs=[m.group(1) for m in re.finditer(r'\[IMG (\S+) name=([^\]]*)\]',raw)]
    d={'slug':e['slug'],'title':e['title'],'icon':imgs[0] if imgs else None,'images':imgs}
    cur=None;buf=[]
    for l in lines:
        s=l.strip()
        if s in SECS:
            if cur: d[cur]='\n'.join(buf).strip()
            cur=s;buf=[]
        elif cur is not None:
            buf.append(l)
    if cur: d[cur]='\n'.join(buf).strip()
    # parse 角色信息 key:value
    info={}
    for l in (d.get('角色信息') or '').split('\n'):
        m=re.match(r'^\s*([^：:]+)[：:]\s*(.*)$',l.strip())
        if m: info[m.group(1).strip()]=m.group(2).strip()
    d['info']=info
    # night order
    no=d.get('夜晚行动顺序','')
    def blk(name):
        m=re.search(re.escape(name)+r'\n(.*?)(?=\n(?:首个夜晚|其他夜晚)\n|$)',no,re.S)
        if not m: return {}
        r={}
        for l in m.group(1).split('\n'):
            mm=re.match(r'^\s*([^：:]+)[：:]\s*(.*)$',l.strip())
            if mm: r[mm.group(1).strip()]=mm.group(2).strip()
        return r
    d['night']={'first':blk('首个夜晚'),'other':blk('其他夜晚')}
    out.append(d)
json.dump(out,open('chars.json','w'),ensure_ascii=False,indent=1)
print(len(out))
# compact summary
sm=[]
for d in out:
    i=d['info']
    sm.append({'t':d['title'],'slug':d['slug'],'en':i.get('英文名'),'no':i.get('角色ID'),'team':i.get('角色类型'),
      'ability':d.get('角色能力','').replace('\n',' ')[:400],
      'fn':d['night']['first'].get('夜序数值'),'fnprev':d['night']['first'].get('前位角色'),
      'on':d['night']['other'].get('夜序数值'),'onprev':d['night']['other'].get('前位角色'),
      'rem':[x for x in (d.get('提示标记') or '').split('\n') if x.strip()][:1],
      'ico':d['icon']})
json.dump(sm,open('summary.json','w'),ensure_ascii=False,indent=1)
