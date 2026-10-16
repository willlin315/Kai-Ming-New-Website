"""Run isolated, persistent local PostgreSQL-compatible storage + FastAPI + Next.js.
Install backend/requirements-dev.txt into your active Python environment first.
"""
import os
from pathlib import Path
import secrets
import socket
import subprocess
import sys
import time

ROOT=Path(__file__).resolve().parents[1]
folder=ROOT/'.cms-data'
folder.mkdir(exist_ok=True)
token_file=folder/'dev-token.txt'
if not token_file.exists():
    token_file.write_text(secrets.token_urlsafe(40))
    token_file.chmod(0o600)
env={**os.environ,'CMS_ENV':'development','CMS_DEV_TOKEN':token_file.read_text().strip(),
     'DATABASE_URL':'postgresql+psycopg://postgres:postgres@127.0.0.1:55432/postgres?sslmode=disable',
     'CMS_ALLOWED_ORIGINS':'http://localhost:3000,http://127.0.0.1:3000',
     'NEXT_PUBLIC_CMS_API_URL':'http://127.0.0.1:8000'}
processes=[]
def wait_port(port):
    for _ in range(200):
        if any(p.poll() is not None for p in processes): raise RuntimeError('A development service exited.')
        try:
            with socket.create_connection(('127.0.0.1',port),timeout=.2): return
        except OSError: time.sleep(.1)
    raise RuntimeError(f'Port {port} did not become ready.')
try:
    processes.append(subprocess.Popen(['node','scripts/cms-dev-db.mjs'],cwd=ROOT,env=env))
    wait_port(55432)
    processes.append(subprocess.Popen([sys.executable,'-m','uvicorn','backend.asgi:app','--host','127.0.0.1','--port','8000'],cwd=ROOT,env=env))
    wait_port(8000)
    processes.append(subprocess.Popen(['npm','run','dev','--','--hostname','127.0.0.1'],cwd=ROOT,env=env))
    print('\nCMS: http://localhost:3000/admin/\nAPI: http://127.0.0.1:8000\nDevelopment token is in .cms-data/dev-token.txt (never commit or share it).\nUse Connect development API in the CMS. Ctrl-C stops all services.\n',flush=True)
    while all(p.poll() is None for p in processes): time.sleep(.5)
except KeyboardInterrupt:
    pass
finally:
    for p in reversed(processes):
        p.terminate()
    for p in reversed(processes):
        try: p.wait(timeout=5)
        except subprocess.TimeoutExpired:p.kill();p.wait()
