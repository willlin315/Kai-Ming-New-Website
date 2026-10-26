"""PostgreSQL CMS with separate draft/published snapshots and revision protection.
The standalone bearer credential is for development only; company SSO is required
before a production rollout. Never expose DATABASE_URL or the token to public builds.
"""
import base64
import binascii
import io
import warnings
import copy
import hashlib
import hmac
import json
import os
import re
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal
from uuid import uuid4
from urllib.request import Request as HookRequest, urlopen

from fastapi import BackgroundTasks, Depends, FastAPI, Header, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from PIL import Image, ImageOps, UnidentifiedImageError
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import JSON, DateTime, Integer, String, UniqueConstraint, create_engine, select
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column

ROOT = Path(__file__).resolve().parents[1]
Kind = Literal['posts', 'people', 'pages']

def now():
    return datetime.now(timezone.utc)

class Base(DeclarativeBase):
    pass

class Document(Base):
    __tablename__ = 'cms_documents'
    kind: Mapped[str] = mapped_column(String(16), primary_key=True)
    id: Mapped[str] = mapped_column(String(150), primary_key=True)
    revision: Mapped[int] = mapped_column(Integer, default=1)
    draft: Mapped[dict] = mapped_column(JSON)
    published: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    published_revision: Mapped[int | None] = mapped_column(Integer, nullable=True)
    published_slug: Mapped[str | None] = mapped_column(String(180), nullable=True)
    published_locale: Mapped[str | None] = mapped_column(String(20), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    __table_args__ = (UniqueConstraint('kind', 'published_locale', 'published_slug', name='cms_public_slug'),)

class Audit(Base):
    __tablename__ = 'cms_audit'
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    kind: Mapped[str] = mapped_column(String(16))
    document_id: Mapped[str] = mapped_column(String(150))
    action: Mapped[str] = mapped_column(String(24))
    revision: Mapped[int] = mapped_column(Integer)
    snapshot: Mapped[dict] = mapped_column(JSON)
    actor: Mapped[str] = mapped_column(String(100), default='development-editor')
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

class Media(Base):
    __tablename__ = 'cms_media'
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(180))
    alt: Mapped[str] = mapped_column(String(500), default='')
    width: Mapped[int] = mapped_column(Integer)
    height: Mapped[int] = mapped_column(Integer)
    size: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

class MediaBody(BaseModel):
    model_config = ConfigDict(extra='forbid')
    name: str = Field(min_length=1, max_length=180)
    alt: str = Field(default='', max_length=500)
    data: str = Field(max_length=1_400_000)

class WriteBody(BaseModel):
    model_config = ConfigDict(extra='forbid')
    expected_revision: int = Field(ge=0)
    content: dict

class RevisionBody(BaseModel):
    model_config = ConfigDict(extra='forbid')
    expected_revision: int = Field(ge=1)

POST_FIELDS = {'translations','title','slug','language','image','summary','body','bodyHtml','sourceUrl'}
PEOPLE_FIELDS = {'translations','name','title','center','department','email','phone','photo','bio','order','featured','placements','sourceUrl','sourcePhoto'}

def initial_people():
    return json.loads((ROOT / 'content/people.json').read_text())

def validate(kind, payload, document_id, original=None):
    if kind == 'pages':
        if document_id != 'home':
            raise HTTPException(422, 'Only the Home page is editable in this version.')
        fields = json.loads((ROOT / 'content/home-fields.json').read_text())
        values = payload.get('values')
        if not isinstance(values, dict) or set(values) != {f['id'] for f in fields}:
            raise HTTPException(422, 'Home fields must match the current template.')
        for field in fields:
            value = values[field['id']]
            keys = {'en','zh-Hant','es'} if field['type']=='text' else {'src','alt','position'}
            if not isinstance(value,dict) or set(value)!=keys or any(not isinstance(v,str) or len(v)>20_000 for v in value.values()):
                raise HTTPException(422,'Invalid Home field value.')
            if field['type']=='image':
                if value['src'] and not (value['src'].startswith('/media/') or value['src'].startswith('https://')):
                    raise HTTPException(422,'Use an uploaded image or HTTPS image URL.')
                if not re.fullmatch(r'(?:100|[0-9]{1,2})% (?:100|[0-9]{1,2})%', value['position']):
                    raise HTTPException(422,'Invalid photo crop position.')
        return {'title':'Home','values':copy.deepcopy(values)}
    allowed = POST_FIELDS if kind == 'posts' else PEOPLE_FIELDS
    result = {k: v for k, v in payload.items() if k in allowed}
    for key, value in result.items():
        if key == 'translations':
            fields={'title','summary','bodyHtml','body'} if kind=='posts' else {'name','title','bio'}
            if not isinstance(value,dict) or any(locale not in ['en','zh-Hant','es'] or not isinstance(values,dict) or any(k not in fields or not isinstance(v,str) or len(v)>600_000 for k,v in values.items()) for locale,values in value.items()):
                raise HTTPException(422,'Invalid translated content.')
            continue
        if key == 'placements':
            continue
        if key == 'order':
            if not isinstance(value, int) or isinstance(value, bool) or value < 0:
                raise HTTPException(422, 'Order must be a non-negative integer.')
        elif key == 'featured':
            if not isinstance(value, bool):
                raise HTTPException(422, 'Featured must be true or false.')
        elif not isinstance(value, str) or len(value) > 600_000:
            raise HTTPException(422, f'Invalid {key}.')
    name = 'title' if kind == 'posts' else 'name'
    if not result.get(name, '').strip() or not result.get('title', '').strip():
        raise HTTPException(422, 'Name and title are required.')
    if len(result[name]) > 180:
        raise HTTPException(422, 'Name or title is too long.')
    if kind == 'posts':
        if result.get('language') not in ['en','zh-Hant','es']:
            raise HTTPException(422, 'Unsupported content language.')
        if result.get('slug') and not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', result['slug']):
            raise HTTPException(422, 'Use a lowercase URL slug with hyphens.')
    else:
        # Slots are server-owned so editing never silently moves an existing person.
        source = next((p for p in initial_people() if p['id'] == document_id), None)
        result['placements'] = copy.deepcopy((source or original or {}).get('placements', []))
    return result

def snapshot(doc):
    return {**doc.draft, 'id': doc.id, '_revision': doc.revision,
            '_published_revision': doc.published_revision,
            '_has_changes': doc.revision != doc.published_revision}

def audit(session, doc, action):
    session.add(Audit(kind=doc.kind, document_id=doc.id, action=action,
                      revision=doc.revision, snapshot=copy.deepcopy(doc.draft)))

# Migration provenance (original Wix URLs) stays in the CMS but is not published.
PRIVATE_FIELDS = {'sourceUrl', 'sourcePhoto'}

def public_record(doc):
    return {**{k: v for k, v in doc.published.items() if k not in PRIVATE_FIELDS}, 'id': doc.id}

def seed_database(engine):
    """Idempotent initial import. Existing drafts and published versions are untouched."""
    people = initial_people()
    posts = [{**p, 'id': f'legacy-{i}', 'slug': '', 'language': 'en',
              'image': p['image'].replace('__BASE__',''), 'sourceUrl': p['href'],
              'summary': '', 'body': '', 'bodyHtml': ''}
             for i,p in enumerate(json.loads((ROOT/'content/blog-posts.json').read_text()))]
    with Session(engine) as session, session.begin():
        for kind, records in [('people', people), ('posts', posts), ('pages', [json.loads((ROOT/'content/home-content.json').read_text())])]:
            for record in records:
                key = record['id']
                if session.get(Document, (kind, key)):
                    continue
                content = validate(kind, record, key)
                doc = Document(kind=kind, id=key, revision=1, draft=content,
                               published=copy.deepcopy(content), published_revision=1)
                session.add(doc)
                audit(session, doc, 'initial-import')

def slugify(title: str = '', key: str = '') -> str:
    """Title -> lowercase ASCII hyphenated slug. Mirrors lib/slug.js."""
    import unicodedata
    text = unicodedata.normalize('NFKD', str(title or ''))
    text = ''.join(c for c in text if not unicodedata.combining(c)).lower().replace('&', ' and ')
    slug = re.sub(r'[^a-z0-9]+', '-', text).strip('-')
    if len(slug) > 80:
        cut = slug[:80]
        slug = cut.rsplit('-', 1)[0] if '-' in cut else cut
    slug = slug.rstrip('-')
    if slug:
        return slug
    suffix = re.sub(r'[^a-z0-9]', '', str(key).lower())[:8]
    return f'post-{suffix}' if suffix else 'post'

def unique_slug(session, base: str, language: str, key: str) -> str:
    taken = set()
    for doc in session.scalars(select(Document).where(Document.kind == 'posts', Document.id != key)):
        if doc.published_locale == language and doc.published_slug:
            taken.add(doc.published_slug)
        for content in (doc.draft, doc.published):
            if content and content.get('language', 'en') == language and content.get('slug'):
                taken.add(content['slug'])
    slug, n = base, 2
    while slug in taken:
        slug, n = f'{base}-{n}', n + 1
    return slug

def backfill_post_slugs(engine):
    """Give every post without a URL slug one generated from its title."""
    with Session(engine) as session, session.begin():
        for doc in session.scalars(select(Document).where(Document.kind == 'posts').with_for_update()):
            if doc.draft.get('slug') and (doc.published is None or doc.published.get('slug')):
                continue
            same = doc.draft == doc.published
            source = doc.published if doc.published and doc.published.get('slug') else doc.draft
            slug = source.get('slug') or unique_slug(session, slugify(source.get('title', ''), doc.id), source.get('language', 'en'), doc.id)
            doc.draft = {**doc.draft, 'slug': doc.draft.get('slug') or slug}
            if doc.published is not None:
                doc.published = {**doc.published, 'slug': slug}
                doc.published_slug = slug
                doc.published_locale = doc.published.get('language', 'en')
            doc.revision += 1
            if same and doc.published is not None:
                doc.published_revision = doc.revision
            audit(session, doc, 'generate-slug')
            session.flush()

FILENAME_ALT = re.compile(r'(\.(jpe?g|png|webp|gif)$)|^(screenshot|image by|img_|dsc)', re.I)

def backfill_home_alts(engine):
    """Replace empty or file-name image alt text on Home with the descriptive defaults."""
    defaults = json.loads((ROOT / 'content/home-content.json').read_text())['values']
    def fix(content):
        if not content or not isinstance(content.get('values'), dict):
            return content
        result = copy.deepcopy(content)
        for key, value in result['values'].items():
            seed = defaults.get(key) or {}
            if key.startswith('image-') and isinstance(value, dict) and value.get('src') == seed.get('src') \
                    and seed.get('alt') and (not value.get('alt', '').strip() or FILENAME_ALT.search(value.get('alt', '').strip())):
                value['alt'] = seed['alt']
        return result
    with Session(engine) as session, session.begin():
        doc = session.scalar(select(Document).where(Document.kind == 'pages', Document.id == 'home').with_for_update())
        if not doc:
            return
        same = doc.draft == doc.published
        draft, published = fix(doc.draft), fix(doc.published)
        if draft != doc.draft or published != doc.published:
            doc.draft, doc.published = draft, published
            doc.revision += 1
            if same and published is not None:
                doc.published_revision = doc.revision
            audit(session, doc, 'fix-image-alt')

def backfill_translations(engine):
    """Add exact-source translations once; preserve edits and pending drafts."""
    dictionary=json.loads((ROOT / 'content/i18n/site.json').read_text())
    def enrich(content,kind):
        if kind=='pages':
            return content
        if content is None:
            return None
        result=copy.deepcopy(content)
        translated=result.setdefault('translations',{})
        for locale in ['zh-Hant','es']:
            values=translated.setdefault(locale,{})
            for field in (['title','summary','bodyHtml','body'] if kind=='posts' else ['name','title','bio']):
                source=result.get(field,'')
                text=dictionary.get(source,{}).get(locale)
                if text and field not in values:
                    values[field]=text
        return result
    with Session(engine) as session, session.begin():
        for doc in session.scalars(select(Document).with_for_update()):
            same=doc.draft==doc.published
            draft=enrich(doc.draft,doc.kind)
            published=enrich(doc.published,doc.kind)
            if draft!=doc.draft or published!=doc.published:
                doc.draft=draft
                doc.published=published
                doc.revision+=1
                if same and published is not None:
                    doc.published_revision=doc.revision
                audit(session,doc,'add-translations')

def deploy_hook_urls():
    """Build hooks (for example Vercel Deploy Hooks) called after publish/unpublish."""
    return [v.strip() for v in os.environ.get('CMS_DEPLOY_HOOK_URLS', '').split(',') if v.strip().startswith('https://')]

def trigger_deploy_hooks():
    """Ask the static site to rebuild so it includes the newly published content."""
    for url in deploy_hook_urls():
        try:
            with urlopen(HookRequest(url, data=b'', method='POST'), timeout=10) as response:
                response.read()
        except Exception as error:  # A failed rebuild request must not undo the publish.
            warnings.warn(f'Deploy hook failed: {error.__class__.__name__}')

def create_app(database_url=None, token=None, *, initialize=True):
    url = database_url or os.environ.get('DATABASE_URL', '')
    credential = token or os.environ.get('CMS_DEV_TOKEN', '')
    if not url.startswith('postgresql+psycopg://'):
        raise RuntimeError('Set DATABASE_URL to a PostgreSQL psycopg URL.')
    if os.environ.get('CMS_ENV', 'development') != 'development':
        raise RuntimeError('Standalone token mode is development-only. Configure company SSO before production.')
    if len(credential) < 32:
        raise RuntimeError('Set a random CMS_DEV_TOKEN of at least 32 characters.')
    engine = create_engine(url, pool_pre_ping=True)
    @asynccontextmanager
    async def lifespan(app):
        if initialize:
            Base.metadata.create_all(engine)
            seed_database(engine)
            backfill_translations(engine)
            backfill_post_slugs(engine)
            backfill_home_alts(engine)
        yield
        engine.dispose()
    app = FastAPI(title='Kai Ming development CMS', lifespan=lifespan)
    app.state.engine = engine
    origins = [v.strip() for v in os.environ.get('CMS_ALLOWED_ORIGINS','http://localhost:3000').split(',') if v.strip()]
    app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=False,
                       allow_methods=['GET','PUT','POST'], allow_headers=['Authorization','Content-Type'])
    bearer = HTTPBearer(auto_error=False)
    def editor(auth: HTTPAuthorizationCredentials | None = Depends(bearer)):
        if not auth or not hmac.compare_digest(auth.credentials.encode(), credential.encode()):
            raise HTTPException(401, 'A valid development CMS token is required.')
    @app.middleware('http')
    async def headers(request: Request, call_next):
        # Bound writes even if Content-Length is absent or untrusted.
        if request.method in ('PUT','POST'):
            raw = await request.body()
            if len(raw) > 1_500_000:
                return Response('Request exceeds 1.5 MB.', status_code=413)
        response = await call_next(request)
        response.headers['Cache-Control'] = 'no-store'
        response.headers['X-Content-Type-Options'] = 'nosniff'
        return response
    def locked(session, kind, key, expected):
        doc = session.scalar(select(Document).where(Document.kind==kind, Document.id==key).with_for_update())
        if not doc:
            raise HTTPException(404, 'Content not found.')
        if doc.revision != expected:
            raise HTTPException(409, 'This record changed. Reload the latest version before saving or publishing.')
        return doc
    @app.get('/health')
    def health():
        with engine.connect() as conn:
            conn.exec_driver_sql('SELECT 1')
        return {'status':'ok','environment':'development'}
    # Explicit persistent storage is required: never silently write to container disk.
    media_dir = os.environ.get('CMS_MEDIA_DIR', '')
    media_origin = os.environ.get('CMS_PUBLIC_URL', '').rstrip('/')
    def storage():
        if not media_dir or not media_origin.startswith(('https://', 'http://127.0.0.1', 'http://localhost')):
            raise HTTPException(503, 'Persistent media storage is not configured.')
        folder = Path(media_dir)
        folder.mkdir(parents=True, exist_ok=True)
        return folder
    def media_snapshot(item):
        return {'id':item.id, 'name':item.name, 'alt':item.alt,
                'width':item.width, 'height':item.height, 'size':item.size,
                'url':f'{media_origin}/media/{item.id}.jpg'}
    @app.get('/admin/media', dependencies=[Depends(editor)])
    def media_list():
        storage()
        with Session(engine) as session:
            return [media_snapshot(m) for m in session.scalars(select(Media).order_by(Media.created_at.desc()).limit(1000))]
    @app.post('/admin/media/upload', dependencies=[Depends(editor)])
    def media_upload(body: MediaBody):
        folder = storage()
        try:
            if not re.fullmatch(r'data:image/(jpeg|png|webp|gif);base64,[A-Za-z0-9+/=]+',body.data):
                raise ValueError()
            raw=base64.b64decode(body.data.split(',',1)[1],validate=True)
            with warnings.catch_warnings():
                warnings.simplefilter('error',Image.DecompressionBombWarning)
                with Image.open(io.BytesIO(raw)) as source:
                    if source.format not in ('JPEG','PNG','WEBP','GIF') or source.width*source.height>20_000_000:
                        raise ValueError()
                    source.load()
                    image=ImageOps.exif_transpose(source).convert('RGB')
                    image.thumbnail((1600,1600))
                    output=io.BytesIO()
                    image.save(output,format='JPEG',quality=85)
            blob=output.getvalue()
        except (ValueError, binascii.Error, UnidentifiedImageError, OSError, Image.DecompressionBombError, Image.DecompressionBombWarning):
            raise HTTPException(422,'Choose a valid raster image smaller than 20 megapixels.')
        key=hashlib.sha256(blob).hexdigest()
        path=folder / (key+'.jpg')
        # Hash-addressed immutable files remain valid across editorial revisions.
        with Session(engine) as session, session.begin():
            existing=session.get(Media,key)
            if existing:
                return media_snapshot(existing)
            if len(list(folder.glob('*.jpg'))) >= 1000:
                raise HTTPException(409,'Media storage limit reached. Contact your administrator.')
            if not path.exists():
                temp=folder / (uuid4().hex+'.tmp')
                try:
                    temp.write_bytes(blob)
                    os.replace(temp,path)
                finally:
                    temp.unlink(missing_ok=True)
            item=Media(id=key,name=body.name,alt=body.alt,width=image.width,height=image.height,size=len(blob))
            session.add(item)
            session.flush()
            return media_snapshot(item)
    @app.get('/media/{filename}')
    def media_file(filename: str):
        if not re.fullmatch(r'[a-f0-9]{64}\.jpg', filename):
            raise HTTPException(404,'Image not found.')
        path=storage() / filename
        if not path.is_file():
            raise HTTPException(404,'Image not found.')
        return FileResponse(path,media_type='image/jpeg',headers={'Content-Disposition':'inline'})
    @app.get('/admin/content', dependencies=[Depends(editor)])
    def content():
        with Session(engine) as session:
            docs = session.scalars(select(Document).order_by(Document.kind,Document.id)).all()
            return {kind:[snapshot(d) for d in docs if d.kind==kind] for kind in ['posts','people','pages']}
    @app.put('/admin/{kind}/{key}', dependencies=[Depends(editor)])
    def save(kind: Kind, key: str, body: WriteBody):
        if len(key)>150 or not re.fullmatch(r'[a-zA-Z0-9_-]+',key):
            raise HTTPException(422,'Invalid record ID.')
        with Session(engine) as session, session.begin():
            if body.expected_revision==0:
                if session.get(Document,(kind,key)):
                    raise HTTPException(409,'This record already exists. Reload before saving.')
                doc=Document(kind=kind,id=key,revision=1,draft=validate(kind,body.content,key))
                session.add(doc)
            else:
                doc=locked(session,kind,key,body.expected_revision)
                doc.draft=validate(kind,body.content,key,doc.draft)
                doc.revision+=1
                doc.updated_at=now()
            audit(session,doc,'save-draft')
            session.flush()
            result=snapshot(doc)
        return result
    @app.post('/admin/{kind}/{key}/publish', dependencies=[Depends(editor)])
    def publish(kind: Kind, key: str, body: RevisionBody, tasks: BackgroundTasks):
        from sqlalchemy.exc import IntegrityError
        try:
            with Session(engine) as session, session.begin():
                doc=locked(session,kind,key,body.expected_revision)
                if kind=='posts':
                    if not doc.draft.get('slug'):
                        language=doc.draft.get('language','en')
                        doc.draft={**doc.draft,'slug':unique_slug(session,slugify(doc.draft.get('title',''),key),language,key)}
                    if not (doc.draft.get('bodyHtml','').strip() or doc.draft.get('body','').strip()):
                        raise HTTPException(422,'Article content is required before publishing.')
                    duplicate=session.scalar(select(Document).where(Document.kind=='posts',Document.published_slug==doc.draft['slug'],Document.published_locale==doc.draft['language'],Document.id!=key))
                    if duplicate:
                        raise HTTPException(409,'Another published post uses this slug and language.')
                    doc.published_slug=doc.draft['slug']
                    doc.published_locale=doc.draft['language']
                elif kind=='people' and not doc.draft.get('placements'):
                    raise HTTPException(422,'This person has no existing page slot. Configure a placement before publishing.')
                doc.published=copy.deepcopy(doc.draft)
                doc.published_revision=doc.revision
                audit(session,doc,'publish')
                session.flush()
                result=snapshot(doc)
            tasks.add_task(trigger_deploy_hooks)
            return result
        except IntegrityError:
            raise HTTPException(409,'Another published post uses this slug and language.')
    @app.post('/admin/{kind}/{key}/unpublish', dependencies=[Depends(editor)])
    def unpublish(kind: Kind, key: str, body: RevisionBody, tasks: BackgroundTasks):
        if kind in ['people','pages']:
            raise HTTPException(422,'Unpublishing fixed website content is disabled.')
        with Session(engine) as session, session.begin():
            doc=locked(session,kind,key,body.expected_revision)
            doc.published=None
            doc.published_revision=None
            doc.published_slug=None
            doc.published_locale=None
            audit(session,doc,'unpublish')
            result=snapshot(doc)
        tasks.add_task(trigger_deploy_hooks)
        return result
    @app.get('/admin/history/{kind}/{key}', dependencies=[Depends(editor)])
    def history(kind: Kind,key: str):
        with Session(engine) as session:
            rows=session.scalars(select(Audit).where(Audit.kind==kind,Audit.document_id==key).order_by(Audit.created_at.desc()).limit(100)).all()
            return [{'action':r.action,'revision':r.revision,'created_at':r.created_at,'actor':r.actor} for r in rows]
    @app.get('/public/{kind}')
    def public(kind: Kind):
        with Session(engine) as session:
            docs=session.scalars(select(Document).where(Document.kind==kind,Document.published.is_not(None)).order_by(Document.id)).all()
            # JSON null can be represented differently across DB drivers; filter explicitly.
            return [public_record(d) for d in docs if isinstance(d.published,dict)]
    @app.get('/public/posts/{slug}')
    def article(slug: str, language: str='en'):
        with Session(engine) as session:
            doc=session.scalar(select(Document).where(Document.kind=='posts',Document.published_slug==slug,Document.published_locale==language))
            if not doc or not isinstance(doc.published,dict):
                raise HTTPException(404,'Published article not found.')
            return public_record(doc)
    return app
