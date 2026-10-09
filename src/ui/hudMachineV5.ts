import type { HudView } from './hud';

type Parts = {
  m: HTMLDivElement; heal: HTMLButtonElement; hp: HTMLButtonElement; xp: HTMLButtonElement;
  count: HTMLDivElement; wpn: HTMLButtonElement; wpnImg: HTMLImageElement;
  wcount: HTMLDivElement; avPic: HTMLCanvasElement;
  vehicles: Record<'rower' | 'hulajnoga', HTMLButtonElement>;
};
type Portrait = { src: CanvasImageSource; sx: number; sy: number; sw: number; sh: number } | null;
const BASE = `${import.meta.env.BASE_URL || '/'}hud/v5/`;
const HP = [[85,53,8,7],[97,53,8,7],[109,53,8,7],[120,53,8,7],[131,53,8,7]];
const XP = [[85,70,12,4],[101,70,10,4],[114,70,10,4],[129,70,10,4]];

/** Artist's original parts, with independent 48px targets; legacy HUD remains available. */
export function createMachineV5(p: Parts) {
  const oldCanvas = p.m.querySelector('canvas')!;
  oldCanvas.style.display = 'none';
  const canvas = document.createElement('canvas');
  p.m.prepend(canvas);
  const c = canvas.getContext('2d')!;
  const images: Record<string, HTMLImageElement> = {};
  let last: HudView | null = null;
  let portrait: Portrait = null;
  let s = 1, narrow = false, shift = 0, height = 120;
  let sockets: number[][] = [];
  let alive = true;
  const names = ['zbiorniki','leczenie_ramka','rurki','zawor','manometr','jablko','mikstura','aparat','questy',...Array.from({length:6},(_,i)=>`menu_socket_${i}`)];
  for (const name of names) {
    const im = new Image(); images[name] = im;
    im.onload = () => { if (alive && last) draw(last); };
    im.src = `${BASE}${name}.png`;
  }
  // Ignore a drag/cancel rather than interpreting it as a purchase/use/open action.
  const removers: (() => void)[] = [];
  for (const b of p.m.querySelectorAll('button')) {
    let start: {x:number;y:number} | null = null, dragged = false;
    const down = (e: PointerEvent) => { start = {x:e.clientX,y:e.clientY}; dragged = false; };
    const move = (e: PointerEvent) => { if (start && Math.hypot(e.clientX-start.x,e.clientY-start.y)>8) dragged=true; };
    const cancel = () => { dragged = true; start=null; };
    const click = (e: MouseEvent) => { if (dragged && e.detail !== 0) { e.preventDefault(); e.stopImmediatePropagation(); } start=null; };
    b.addEventListener('pointerdown',down); b.addEventListener('pointermove',move);
    b.addEventListener('pointercancel',cancel); b.addEventListener('click',click,true);
    removers.push(()=>{b.removeEventListener('pointerdown',down);b.removeEventListener('pointermove',move);b.removeEventListener('pointercancel',cancel);b.removeEventListener('click',click,true);});
  }
  p.hp.style.display = p.xp.style.display = 'none';
  const at = (el: HTMLElement,x:number,y:number,w:number,h:number) => Object.assign(el.style,{
    left:`${x*s}px`,top:`${y*s}px`,width:`${w*s}px`,height:`${h*s}px`,
  });
  const buttonAt = (b: HTMLButtonElement, point: number[], size=48) => at(b,point[0]-size/2,point[1]-size/2,size,size);
  const iconAt = (b: HTMLButtonElement) => {
    const im = b.querySelector('img');
    if (im) Object.assign(im.style,{left:`${13*s}px`,top:`${13*s}px`,width:`${22*s}px`,height:`${22*s}px`});
  };
  function layout() {
    narrow = window.innerWidth < 380;
    s = window.matchMedia('(pointer: coarse)').matches ? 1 : 1.5;
    shift = narrow ? -50 : 0;
    height = narrow ? 158 : 120;
    sockets = Array.from({length:6},(_,i)=>narrow ? [253+shift+(i%2)*52,32+Math.floor(i/2)*50] : [253+(i%3)*52,32+Math.floor(i/3)*50]);
    // On narrow screens slot reading order stays avatar/camera/quests/bike/weapon/scooter.
    const origin = window.innerWidth/2 - (195+shift)*s;
    Object.assign(p.m.style,{left:`${origin}px`,right:'auto',bottom:'calc(8px + env(safe-area-inset-bottom))',width:`${390*s}px`,height:`${height*s}px`});
    canvas.width = Math.round(390*s*(devicePixelRatio||1));
    canvas.height = Math.round(height*s*(devicePixelRatio||1));
    canvas.style.pointerEvents = 'none';
    buttonAt(p.heal,[195+shift,63],64);
    const av = p.m.querySelector<HTMLButtonElement>('.hud-av')!;
    const camera = p.m.querySelector<HTMLButtonElement>('.hud-b1')!;
    const quests = p.m.querySelector<HTMLButtonElement>('.hud-b2')!;
    [av,camera,quests,p.vehicles.rower,p.wpn,p.vehicles.hulajnoga].forEach((b,i)=>buttonAt(b,sockets[i]));
    // With just a scooter, use the first vehicle slot, leaving the reserve empty.
    if (p.vehicles.rower.hidden && !p.vehicles.hulajnoga.hidden) buttonAt(p.vehicles.hulajnoga,sockets[3]);
    iconAt(p.wpn); iconAt(p.vehicles.rower); iconAt(p.vehicles.hulajnoga);
    at(p.avPic,sockets[0][0]-11,sockets[0][1]-11,22,22);
    at(p.count,181+shift,103,28,16);
    p.count.style.font = `700 ${12*s}px/${15*s}px 'Pixelify Sans',monospace`;
    p.count.style.padding = '0';
    p.count.style.minWidth = '0';
    at(p.wcount,sockets[4][0]-16,sockets[4][1]+18,32,14);
    p.wcount.style.font = `700 ${11*s}px/${13*s}px 'Pixelify Sans',monospace`;
    p.wcount.style.padding = '0';
    paintAvatar();
    if (last) draw(last);
  }
  function pic(name:string,x:number,y:number,w?:number,h?:number) {
    const im=images[name];
    if (!im?.complete || !im.naturalWidth) return;
    c.drawImage(im,x,y,w??im.naturalWidth,h??im.naturalHeight);
  }
  function fluid(rect:number[],fraction:number,color:string,shine:string) {
    const [x,y,w,h]=rect, f=Math.max(0,Math.min(1,fraction));
    if (!f) return;
    c.save();c.beginPath();c.rect(x+shift,y,w,h);c.clip();
    c.fillStyle=color;c.fillRect(x+shift,y+h-h*f,w,h*f);
    c.fillStyle=shine;c.fillRect(x+shift,y+h-h*f,w,Math.min(1,h*f));c.restore();
  }
  function draw(v:HudView) {
    last=v;
    if (document.hidden) return;
    const ratio=s*(devicePixelRatio||1);
    c.setTransform(ratio,0,0,ratio,0,0);c.clearRect(0,0,390,height);c.imageSmoothingEnabled=false;
    pic('rurki',shift,0);pic('zbiorniki',76+shift,48);pic('leczenie_ramka',163+shift,25);
    pic('zawor',151+shift,52,10,10);pic('manometr',214+shift,20,16,16);
    // Matching brass connectors between the original independent sockets.
    const line=(x:number,y:number,w:number,h:number)=>{
      c.fillStyle='#261b18';c.fillRect(x,y,w,h);
      c.fillStyle='#ad7c36';c.fillRect(x+1,y+1,Math.max(1,w-2),Math.max(1,h-2));
      c.fillStyle='#e4b766'; if(w>h)c.fillRect(x+1,y+1,w-2,1);else c.fillRect(x+1,y+1,1,h-2);
    };
    line(224+shift,58,11,5);
    if(narrow){line(sockets[0][0]-22,32,5,103);for(let row=0;row<3;row++)line(sockets[row*2][0]-22,sockets[row*2][1]-2,76,5);}
    else {line(231,32,5,53);line(233,30,124,5);line(233,80,124,5);}
    for(let i=0;i<6;i++)pic(`menu_socket_${i}`,sockets[i][0]-16,sockets[i][1]-16,32,33);
    const total=v.maxHp+v.extra;
    HP.forEach((r,i)=>{
      const red=Math.max(0,Math.min(1,v.hp/total*5-i));
      fluid(r,red,v.zatruty?'#6a8a2a':'#db363b',v.zatruty?'#b3ce69':'#f47973');
      if(v.extra>0){const all=Math.max(0,Math.min(1,(v.hp+v.extra)/total*5-i));if(all>red){const[x,y,w,h]=r;c.fillStyle='#70a7ee';c.fillRect(x+shift,y+h-h*all,w,h*(all-red));}}
    });
    XP.forEach((r,i)=>fluid(r,v.expShare*4-i,'#d79a32','#f3c465'));
    c.globalAlpha=v.noHeal?.4:1;
    if(v.preparedFood && v.potions<=0){c.font='26px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(v.preparedFood.icon,195+shift,63);}
    else pic(v.potions>0?'mikstura':'jablko',179+shift,47,32,32);
    c.globalAlpha=1;
    pic('aparat',sockets[1][0]-11,sockets[1][1]-11,22,22);
    pic('questy',sockets[2][0]-11,sockets[2][1]-11,22,22);
    for(const [i,b] of [[3,p.vehicles.rower],[p.vehicles.rower.hidden?3:5,p.vehicles.hulajnoga]] as const) if(!b.hidden && b.getAttribute('aria-pressed')==='true'){
      c.strokeStyle='#ffe7a0';c.lineWidth=2;c.strokeRect(sockets[i][0]-16,sockets[i][1]-16,32,33);
    }
  }
  function paintAvatar(){
    const n=Math.max(1,Math.round(22*s*(devicePixelRatio||1))),cv=p.avPic;
    cv.width=cv.height=n;const g=cv.getContext('2d')!;g.imageSmoothingEnabled=false;
    if(portrait)g.drawImage(portrait.src,portrait.sx,portrait.sy,portrait.sw,portrait.sh,0,0,n,n);
  }
  return {layout,draw,avatar(a:Portrait){portrait=a;paintAvatar();},destroy(){alive=false;removers.forEach(f=>f());canvas.remove();}};
}
