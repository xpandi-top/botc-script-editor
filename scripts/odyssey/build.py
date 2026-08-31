import json,glob,re,os,collections
R='/Users/dimo/projects/hyp/botc_webapp'
cs=json.load(open('chars.json'))

TEAM={'镇民':'townsfolk','外来者':'outsider','爪牙':'minion','恶魔':'demon','传奇':'fabled','奇遇':'loric'}
def team_of(d):
    t=d['info'].get('角色类型','')
    for k,v in TEAM.items():
        if k in t: return v
    if '恶魔' in t: return 'demon'
    return None

def mkid(en):
    s=en.strip().lower()
    s=s.replace("'",'')
    s=re.sub(r'[^a-z0-9]+','_',s)
    return s.strip('_')

recs=[]
for d in cs:
    en=(d['info'].get('英文名') or '').strip()
    zh=re.sub(r'^\d+\s+','',d['title']).split(' ')[0].strip()
    cid=mkid(en)
    team=team_of(d)
    ability=' '.join((d.get('角色能力') or '').split())
    # reminders
    rems=[]
    for l in (d.get('提示标记') or '').split('\n'):
        l=l.strip()
        if not l or l in ('无','暂无','/','​'): continue
        if re.match(r'^(放置时机|放置条件|移除时机|备注)',l): continue
        rems.append(l)
    exp=[]
    for r in rems:
        m=re.match(r'^(.*?)[\*x×](\d+)$',r)
        if m: exp += [m.group(1).strip()]*int(m.group(2))
        else: exp.append(r)
    fn=d['night']['first']; on=d['night']['other']
    def val(b,k):
        v=(b.get(k) or '').strip()
        return None if v in ('','/','无','暂无') else v
    recs.append(dict(slug=d['slug'],cid=cid,en=en,zh=zh,team=team,ability=ability,
        num=d['info'].get('角色ID') or '',
        flavor=' '.join((d.get('背景故事') or '').split()),
        setup=('[' in ability),
        reminders=exp,
        icon=d['icon'],
        fnPrompt=val(fn,'行动提示'),fnPrev=val(fn,'前位角色'),fnNum=val(fn,'夜序数值'),
        onPrompt=val(on,'行动提示'),onPrev=val(on,'前位角色'),onNum=val(on,'夜序数值'),
        howto=' '.join((d.get('运作方式') or '').split()),
        details=(d.get('规则细节') or ''),
    ))
# uniqueness
c=collections.Counter(r['cid'] for r in recs)
print('dup ids:',[k for k,v in c.items() if v>1])
existing=set()
for f in glob.glob(R+'/assets/characters/individual/*.json'):
    existing.add(json.load(open(f))['id'])
print('collide w/ existing:',sorted(set(r['cid'] for r in recs)&existing))
print('no team:',[r['en'] for r in recs if not r['team']])
print('total',len(recs),collections.Counter(r['team'] for r in recs))
print('no icon:',[r['en'] for r in recs if not r['icon']])
json.dump(recs,open('recs.json','w'),ensure_ascii=False,indent=1)
