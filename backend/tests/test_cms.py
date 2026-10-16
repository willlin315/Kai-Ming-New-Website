import os
import uuid
import pytest
from fastapi.testclient import TestClient
from backend.main import create_app

TOKEN='test-only-token-'+'x'*40
URL=os.environ.get('TEST_DATABASE_URL')
pytestmark=pytest.mark.skipif(not URL,reason='Set TEST_DATABASE_URL to an isolated PostgreSQL test database.')

@pytest.fixture(scope='module')
def api():
    app=create_app(URL,TOKEN)
    with TestClient(app) as client:
        yield client,app

@pytest.fixture
def auth():
    return {'Authorization':'Bearer '+TOKEN}

def test_authentication_and_seed(api,auth):
    client,_=api
    assert client.get('/admin/content').status_code==401
    content=client.get('/admin/content',headers=auth).json()
    assert len(content['people'])==33
    assert len(content['posts'])>=3
    assert len(client.get('/public/people').json())==33

def test_draft_isolation_publish_conflict_and_history(api,auth):
    client,_=api
    key='test-'+uuid.uuid4().hex
    post={'title':'Private draft','slug':key,'language':'en','bodyHtml':'<p>Draft content</p>'}
    saved=client.put('/admin/posts/'+key,headers=auth,json={'expected_revision':0,'content':post})
    assert saved.status_code==200,saved.text
    assert client.get('/public/posts/'+key).status_code==404
    assert client.post('/admin/posts/'+key+'/publish',headers=auth,json={'expected_revision':9}).status_code==409
    published=client.post('/admin/posts/'+key+'/publish',headers=auth,json={'expected_revision':1})
    assert published.status_code==200,published.text
    assert client.get('/public/posts/'+key).json()['title']=='Private draft'
    post['title']='Unpublished revision'
    assert client.put('/admin/posts/'+key,headers=auth,json={'expected_revision':1,'content':post}).status_code==200
    assert client.get('/public/posts/'+key).json()['title']=='Private draft'
    assert client.put('/admin/posts/'+key,headers=auth,json={'expected_revision':1,'content':post}).status_code==409
    assert client.post('/admin/posts/'+key+'/publish',headers=auth,json={'expected_revision':2}).status_code==200
    assert client.get('/public/posts/'+key).json()['title']=='Unpublished revision'
    actions=client.get('/admin/history/posts/'+key,headers=auth).json()
    assert [a['action'] for a in actions].count('publish')==2
    assert client.post('/admin/posts/'+key+'/unpublish',headers=auth,json={'expected_revision':2}).status_code==200
    assert client.get('/public/posts/'+key).status_code==404

def test_people_slots_cannot_be_moved(api,auth):
    client,_=api
    person=next(p for p in client.get('/admin/content',headers=auth).json()['people'] if p['name']=='Sherry Tao')
    old=person['placements']
    person['placements']=[{'page':'wrong-page'}]
    person['bio']='Development preview test'
    saved=client.put('/admin/people/'+person['id'],headers=auth,json={'expected_revision':person['_revision'],'content':person})
    assert saved.status_code==200,saved.text
    assert saved.json()['placements']==old
    public=next(p for p in client.get('/public/people').json() if p['id']==person['id'])
    assert public['bio']!='Development preview test'
    assert client.post('/admin/people/'+person['id']+'/unpublish',headers=auth,json={'expected_revision':saved.json()['_revision']}).status_code==422

def test_slug_uniqueness_and_invalid_payloads(api,auth):
    client,_=api
    slug='unique-'+uuid.uuid4().hex
    for i in range(2):
        key='duplicate-'+uuid.uuid4().hex
        assert client.put('/admin/posts/'+key,headers=auth,json={'expected_revision':0,'content':{'title':'Same slug','slug':slug,'language':'en','bodyHtml':'<p>Content</p>'}}).status_code==200
        result=client.post('/admin/posts/'+key+'/publish',headers=auth,json={'expected_revision':1})
        assert result.status_code==(200 if i==0 else 409),result.text
    assert client.put('/admin/posts/invalid',headers=auth,json={'expected_revision':0,'content':{'title':'Invalid','language':'en','slug':'Bad Slug'}}).status_code==422

def test_public_records_do_not_contain_draft_metadata(api):
    client,_=api
    for item in client.get('/public/people').json():
        assert '_revision' not in item
        assert 'draft' not in item

def test_seed_is_idempotent(api,auth):
    from backend.main import seed_database
    client,app=api
    before=client.get('/admin/content',headers=auth).json()
    seed_database(app.state.engine)
    assert before==client.get('/admin/content',headers=auth).json()

def test_media_storage_validation_and_persistence(monkeypatch,tmp_path,auth,api):
    api[1].state.engine.dispose()
    import base64
    import io
    from PIL import Image
    monkeypatch.setenv('CMS_MEDIA_DIR',str(tmp_path))
    monkeypatch.setenv('CMS_PUBLIC_URL','https://cms.example.test')
    out=io.BytesIO()
    Image.new('RGB',(20,15),'blue').save(out,format='PNG')
    body={'name':'sample.png','alt':'Blue test image','data':'data:image/png;base64,'+base64.b64encode(out.getvalue()).decode()}
    with TestClient(create_app(URL,TOKEN)) as client:
        assert client.post('/admin/media/upload',json=body).status_code==401
        assert client.post('/admin/media/upload',headers=auth,json={**body,'data':'data:image/png;base64,PHN2Zz4='}).status_code==422
        uploaded=client.post('/admin/media/upload',headers=auth,json=body)
        assert uploaded.status_code==200,uploaded.text
        item=uploaded.json()
        assert item['width']==20 and item['height']==15
        assert item['alt']=='Blue test image'
        assert item['url'].startswith('https://cms.example.test/media/')
        path='/media/'+item['id']+'.jpg'
        response=client.get(path)
        assert response.status_code==200 and response.headers['content-type']=='image/jpeg'
        assert client.get('/media/invalid.jpg').status_code==404
        assert client.post('/admin/media/upload',headers=auth,json=body).json()['id']==item['id']
        assert any(m['id']==item['id'] for m in client.get('/admin/media',headers=auth).json())
    with TestClient(create_app(URL,TOKEN)) as restarted:
        assert restarted.get(path).content==response.content
