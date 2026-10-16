// Screenshot bytes in short log chunks let the reviewer inspect CI images when
// their workspace cannot download the artifact ZIP. All images use mocked RPCs.
import { readFile, readdir } from 'node:fs/promises';
for(const name of (await readdir('.cache')).filter(n=>/^combat-(phone-turn|desktop-turn|phone-boss|desktop-boss|failure)\.png$/.test(n))){
  const data=(await readFile(`.cache/${name}`)).toString('base64');
  console.log(`COMBAT_SHOT_BEGIN ${name}`);
  for(let i=0;i<data.length;i+=16000)console.log(`COMBAT_SHOT_DATA ${data.slice(i,i+16000)}`);
  console.log('COMBAT_SHOT_END');
}
