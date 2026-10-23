# Site-wide QA: serve the static build on :3100 (python3 -m http.server 3100 -d out), then run this.
# Checks status, horizontal overflow, broken images, alt text, accessible names, labels,
# duplicate ids, html lang, one main heading, console errors, keyboard focus and internal links.
import json, os, re, sys, urllib.request
from urllib.parse import urlparse, urljoin
from playwright.sync_api import sync_playwright
BASE='http://localhost:3100'
routes=json.load(open('content/routes.json'))
paths=[]
for loc in ['en','zh','es']:
    for r in routes:
        k=r['key']; s=r.get('slug') or k
        paths.append(f'/{loc}/' if k=='home' else f'/{loc}/{s}/')
    for st in ['test-post','kron4']: paths.append(f'/{loc}/stories/{st}/')
issues=[]; links=set(); people=set()
def add(p,vp,kind,detail): issues.append({'path':p,'viewport':vp,'kind':kind,'detail':detail})
with sync_playwright() as pw:
    b=pw.chromium.launch()
    for vp,size in [('desktop',(1440,900)),('mobile',(390,844))]:
        ctx=b.new_context(viewport={'width':size[0],'height':size[1]})
        for p in paths:
            pg=ctx.new_page(); errs=[]
            pg.on('console',lambda m: errs.append(m.text) if m.type=='error' else None)
            pg.on('pageerror',lambda e: errs.append('PAGEERROR '+str(e)))
            r=pg.goto(BASE+p,wait_until='networkidle')
            if r.status!=200: add(p,vp,'status',r.status); pg.close(); continue
            pg.evaluate("async()=>{for(let y=0;y<document.body.scrollHeight;y+=600){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,60))}window.scrollTo(0,0)}")
            pg.wait_for_timeout(500)
            d=pg.evaluate("""()=>{
              const vis=e=>{const r=e.getBoundingClientRect();const s=getComputedStyle(e);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none'};
              const name=e=>(e.getAttribute('aria-label')||e.getAttribute('aria-labelledby')&&document.getElementById(e.getAttribute('aria-labelledby'))?.textContent||e.innerText||e.getAttribute('title')||[...e.querySelectorAll('img')].map(i=>i.alt).join('')||e.querySelector('svg title')?.textContent||'').trim();
              const over=[...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect();return vis(e)&&r.right>document.documentElement.clientWidth+2&&getComputedStyle(e).position!=='fixed'}).filter(e=>!e.closest('[style*="overflow"],.overflow-hidden')).slice(0,5).map(e=>e.tagName+'.'+(e.className||'').toString().slice(0,40)+' r='+Math.round(e.getBoundingClientRect().right));
              const ids={};document.querySelectorAll('[id]').forEach(e=>ids[e.id]=(ids[e.id]||0)+1);
              return {lang:document.documentElement.lang,title:document.title,h1:document.querySelectorAll('h1,[role=heading][aria-level="1"]').length,
               scrollW:document.documentElement.scrollWidth,clientW:document.documentElement.clientWidth,over,
               broken:[...document.images].filter(i=>i.complete&&i.naturalWidth===0&&i.getAttribute('src')).map(i=>i.currentSrc||i.src),
               noalt:[...document.images].filter(i=>!i.hasAttribute('alt')).map(i=>i.src.slice(-60)),
               unnamed:[...document.querySelectorAll('a[href],button,[role=button]')].filter(e=>vis(e)&&!name(e)).map(e=>e.outerHTML.slice(0,120)),
               inputs:[...document.querySelectorAll('input:not([type=hidden]),select,textarea')].filter(e=>vis(e)&&!(e.labels?.length||e.getAttribute('aria-label')||e.getAttribute('aria-labelledby')||e.title)).map(e=>e.outerHTML.slice(0,120)),
               dupIds:Object.entries(ids).filter(([k,v])=>v>1).map(([k])=>k),
               links:[...document.querySelectorAll('a[href]')].map(a=>a.href),
               people:[...document.images].map(i=>i.getAttribute('src')||'').filter(s=>s.includes('/media/people/'))}}""")
            if d['scrollW']>d['clientW']+1: add(p,vp,'overflow',f"{d['scrollW']}>{d['clientW']} {d['over']}")
            for k in ['broken','noalt','unnamed','inputs','dupIds']:
                if d[k]: add(p,vp,k,d[k][:6])
            exp={'en':'en','zh':'zh-HK','es':'es'}[p.split('/')[1]]
            if d['lang']!=exp: add(p,vp,'lang',d['lang'])
            if d['h1']!=1: add(p,vp,'h1count',d['h1'])
            if errs: add(p,vp,'console',[e[:160] for e in errs[:4]])
            links.update(d['links']); people.update(d['people'])
            # keyboard: first 12 tab stops should be visible and show a focus indicator
            if vp=='desktop' and p.endswith(('/en/','/en/blog/','/en/eligibility/')) or vp=='desktop' and p.count('/')==2:
                bad=[]
                for i in range(15):
                    pg.keyboard.press('Tab')
                    f=pg.evaluate("()=>{const e=document.activeElement;if(!e||e===document.body)return null;const s=getComputedStyle(e);const r=e.getBoundingClientRect();return {t:e.outerHTML.slice(0,80),vis:r.width>0&&r.height>0,ring:(s.outlineStyle!=='none'&&parseFloat(s.outlineWidth)>0)||s.boxShadow!=='none'}}")
                    if f and (not f['vis'] or not f['ring']): bad.append(f)
                if bad: add(p,vp,'focus',bad[:4])
            pg.close()
        ctx.close()
    b.close()
bad=[]
for l in sorted(links):
    u=urlparse(l)
    if u.netloc!='localhost:3100': continue
    try:
        r=urllib.request.urlopen(BASE+u.path,timeout=10); 
    except Exception as e: bad.append((u.path,str(e)[:60]))
json.dump({'issues':issues,'brokenLinks':bad,'people':sorted(people),'external':sorted({l for l in links if urlparse(l).netloc not in ('localhost:3100','')})},open('qa-report.json','w'),indent=1,ensure_ascii=False)
from collections import Counter
print(len(paths)*2,'page views;',Counter(i['kind'] for i in issues)); print('broken links',bad[:20]); print('people photos',len(people))
