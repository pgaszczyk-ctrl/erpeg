import base64
s=open('szablon3.html').read()
b=lambda f:'data:image/png;base64,'+base64.b64encode(open(f,'rb').read()).decode()
s=s.replace('@@GEN@@',open('gen.js').read()).replace('@@DANE@@',b('r2_dane.png')).replace('@@WYS@@',b('r2_wys.png')).replace('@@POSTAC@@',b('ranger96.png')).replace('@@REG@@',open('region2.json').read())
open('makieta-gory3.html','w').write(s)
open('test3.html','w').write('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>'+s+'</body></html>')
import os;print(os.path.getsize('makieta-gory3.html'))
