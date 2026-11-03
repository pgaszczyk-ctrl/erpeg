import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import vm from 'node:vm';
let code=stripTypeScriptTypes(readFileSync('src/fpslog.ts','utf8'),{mode:'transform'}).replace(/^import .*$/mg,'').replaceAll('export ','');
code=code.replace('const cpu = [];','const cpu = []; globalThis.samples = cpu;');
let frame,clock=1,paused=true;
const handlers={}, game={events:{on:(event,fn)=>handlers[event]=fn},loop:{running:true},scene:{isActive:()=>true,isPaused:()=>paused}};
const context=vm.createContext({performance:{now:()=>clock},document:{hidden:false,addEventListener(){}},window:{},loadingGame:()=>false,requestAnimationFrame:fn=>frame=fn});
vm.runInContext(code,context);context.installFpsLog(game);
for(let i=0;i<10000;i++){handlers.prestep();clock+=1;handlers.postrender();}
assert.equal(context.samples.length,0,'long paused dialogs never accumulate CPU samples');
paused=false;
for(let i=0;i<10;i++){handlers.prestep();clock+=1;handlers.postrender();}
assert.equal(context.samples.length,10,'actual gameplay is sampled');
paused=true;frame(clock);
assert.equal(context.samples.length,0,'pause clears an unfinished measurement window');
console.log('PASS: 10,000 paused renders retain no samples; gameplay still sampled');
