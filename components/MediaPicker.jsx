'use client';
import {useState} from 'react';
import {requestCms} from '../lib/cms-api';
export default function MediaPicker({connection,onSelect}) {
 const [open,setOpen]=useState(false),[items,setItems]=useState([]),[query,setQuery]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function load(){setOpen(true);setBusy(true);setError('');try{setItems(await requestCms(connection.url,'/admin/media',connection.token))}catch(e){setError(e.message)}finally{setBusy(false)}}
 if(!connection)return null;
 return <section className="cms-media-picker"><button type="button" onClick={()=>open?setOpen(false):load()}>{open?'Close media library':'Choose from media library'}</button>{open&&<div><h3>Media library</h3><p>Uploaded images are public. Saving a draft does not publish the article. Existing image links stay valid.</p><input aria-label="Search media" placeholder="Search filename or description…" value={query} onChange={e=>setQuery(e.target.value)}/><button type="button" disabled={busy} onClick={load}>Refresh images</button>{busy&&<p role="status">Loading images…</p>}{error&&<p role="alert">{error}</p>}<div className="cms-media-grid">{items.filter(m=>(m.name+' '+m.alt).toLowerCase().includes(query.toLowerCase())).map(m=><button type="button" key={m.id} onClick={()=>{onSelect(m);setOpen(false)}}><img src={m.url} alt={m.alt||m.name}/><strong>{m.name}</strong><small>{m.width} × {m.height} · {Math.round(m.size/1024)} KB</small></button>)}</div>{!busy&&!error&&!items.length&&<p>No images yet. Upload a cover, photo or inline image to add one.</p>}</div>}</section>
}
