import json,glob,re,os,subprocess,collections
R='/Users/dimo/projects/hyp/botc_webapp'
recs=json.load(open('recs.json'))
IND=R+'/assets/characters/individual'

# ---------- 1. character json ----------
for r in recs:
    zh={'name':r['zh'],'ability':r['ability'],'revisions':{'v1':r['ability']}}
    if r['fnPrompt']: zh['firstNightReminder']=r['fnPrompt']
    if r['onPrompt']: zh['otherNightReminder']=r['onPrompt']
    obj={'id':r['cid'],'team':r['team'],'edition':'odyssey','current_revision':'v1','setup':r['setup']}
    if r['reminders']: obj['reminders']=r['reminders']
    obj['revisions']=[{'id':'v1','note':''}]
    obj['en']={'name':r['en']}
    obj['zh']=zh
    with open(f"{IND}/{r['cid']}.json",'w') as f:
        json.dump(obj,f,ensure_ascii=False,indent=2); f.write('\n')
print('wrote',len(recs),'character files')

# ---------- 2. icons ----------
for r in recs:
    src=f"icons/{r['cid']}.png"; dst=f"{R}/assets/icons/{r['cid']}.png"
    subprocess.run(['magick',src,'-resize','400x400','-strip','-dither','FloydSteinberg','-colors','256','PNG8:'+dst],check=True)
print('wrote icons')

# ---------- 3. night order ----------
byzh={}
for f in glob.glob(IND+'/*.json'):
    d=json.load(open(f))
    n=d.get('zh',{}).get('name')
    if n and n not in byzh: byzh[n]=d['id']
SPECIAL={'黄昏':'DUSK','黎明':'DAWN','恶魔信息':'DEMON_INFO','爪牙信息':'DEMON_INFO','买花女孩':'flowergirl','卖花女孩':'flowergirl'}
def resolve(name):
    name=(name or '').strip().strip('​')
    name=re.split(r'[、,/（(]',name)[0].strip()
    if not name: return None
    return SPECIAL.get(name) or byzh.get(name)
no=json.load(open(R+'/assets/characters/night-order.json'))
report={'first':[],'other':[]}
for key,listkey,prevk,numk in (('first','first_night','fnPrev','fnNum'),('other','other_nights','onPrev','onNum')):
    lst=no[listkey]
    items=[r for r in recs if r[prevk]]
    items.sort(key=lambda r:int(re.sub(r'\D','',r[numk] or '0') or 0))
    for r in items:
        if r['cid'] in lst: continue
        a=resolve(r[prevk])
        if a is None or a not in lst:
            lst.append(r['cid']); report[key].append((r['cid'],r[prevk],'APPENDED'))
        else:
            lst.insert(lst.index(a)+1,r['cid'])
json.dump(no,open(R+'/assets/characters/night-order.json','w'),ensure_ascii=False,indent=2)
print('night order first',len(no['first_night']),'other',len(no['other_nights']))
print('fallback appends:',report)

# ---------- 4. script ----------
order={'townsfolk':0,'outsider':1,'minion':2,'demon':3,'fabled':4,'loric':5}
srt=sorted(recs,key=lambda r:(order[r['team']],int(re.sub(r'\D','',r['num']) or 9999)))
script=[{'id':'_meta','name_zh':'奥德赛角色包','name':'Odyssey','author':'太一','logo':''}]+[r['cid'] for r in srt]
json.dump(script,open(R+'/assets/scripts/odyssey.json','w'),ensure_ascii=False,indent=2)
print('script chars',len(script)-1)
