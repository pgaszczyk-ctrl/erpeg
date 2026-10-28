#!/usr/bin/env python3
from pathlib import Path
import subprocess,sys,shutil
root=Path(__file__).resolve().parent;src=root/'44_ruchome_3d/src'
for name in ['build_models.py','build_batch2.py','build_batch3.py','build_batch4.py','build_viewer.py','render_models.py','validate.py','check_batch2.py','check_batch3.py','check_batch4.py','check_style.py']:
 subprocess.run([sys.executable,str(src/name)],cwd=root,check=True)
if shutil.which('node'):
 subprocess.run(['node',str(src/'check_viewer.cjs')],cwd=root,check=True)
 subprocess.run([sys.executable,str(src/'check_cross_runtime.py')],cwd=root,check=True)
subprocess.run([sys.executable,str(src/'check_gait.py')],cwd=root,check=True)
subprocess.run([sys.executable,str(src/'check_jump.py')],cwd=root,check=True)
if '--gifs' in sys.argv:
 subprocess.run([sys.executable,str(src/'build_animation.py')],cwd=root,check=True)
 subprocess.run([sys.executable,str(src/'render_batch2.py'),'--gifs'],cwd=root,check=True)
 subprocess.run([sys.executable,str(src/'render_batch3.py'),'--gifs'],cwd=root,check=True)
else:
 subprocess.run([sys.executable,str(src/'render_batch2.py')],cwd=root,check=True)
 subprocess.run([sys.executable,str(src/'render_batch3.py')],cwd=root,check=True)
subprocess.run([sys.executable,str(src/'render_batch4.py')]+(['--gifs'] if '--gifs' in sys.argv else []),cwd=root,check=True)
subprocess.run([sys.executable,str(src/'render_style.py')]+(['--gifs'] if '--gifs' in sys.argv else []),cwd=root,check=True)
print('Rebuild finished. No real browser/GPU validation was performed.')
