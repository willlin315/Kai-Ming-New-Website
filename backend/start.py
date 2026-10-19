"""Prepare the mounted media directory, then start the API as the cms user."""
import os
import pwd
from pathlib import Path

if os.geteuid() == 0:
    account = pwd.getpwnam('cms')
    directory = os.environ.get('CMS_MEDIA_DIR')
    if directory:
        folder = Path(directory)
        if not folder.is_absolute() or folder.is_symlink():
            raise RuntimeError('CMS_MEDIA_DIR must be an absolute non-symlink directory.')
        folder.mkdir(parents=True, exist_ok=True)
        os.chown(folder, account.pw_uid, account.pw_gid)
    os.setgroups([])
    os.setgid(account.pw_gid)
    os.setuid(account.pw_uid)

os.execvp('uvicorn', ['uvicorn', 'backend.asgi:app', '--host', '0.0.0.0',
                      '--port', os.environ.get('PORT', '8000')])
