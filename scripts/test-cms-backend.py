"""Start an isolated PostgreSQL-compatible PGlite test instance, run integration tests, remove it."""
import os
from pathlib import Path
import shutil
import socket
import subprocess
import sys
import tempfile
import time

root=Path(__file__).resolve().parents[1]
folder=tempfile.mkdtemp(prefix='km-cms-test-')
env={**os.environ,'CMS_DEV_DB_DIR':folder,'CMS_DEV_DB_PORT':'55433'}
server=subprocess.Popen(['node','scripts/cms-dev-db.mjs'],cwd=root,env=env,stdout=subprocess.DEVNULL)
try:
    for attempt in range(120):
        if server.poll() is not None: raise RuntimeError('Test database exited before startup.')
        try:
            with socket.create_connection(('127.0.0.1',55433),timeout=.2): break
        except OSError: time.sleep(.1)
    else: raise RuntimeError('Test database did not become ready.')
    env['TEST_DATABASE_URL']='postgresql+psycopg://postgres:postgres@127.0.0.1:55433/postgres?sslmode=disable'
    result=subprocess.run([sys.executable,'-m','pytest','backend/tests','-q','--tb=short'],cwd=root,env=env)
    sys.exit(result.returncode)
finally:
    server.terminate()
    try: server.wait(timeout=5)
    except subprocess.TimeoutExpired: server.kill();server.wait()
    shutil.rmtree(folder,ignore_errors=True)
