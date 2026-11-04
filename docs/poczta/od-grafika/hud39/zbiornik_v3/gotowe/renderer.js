/* Exp-lore HUD39 v3: optional Canvas 2D renderer for the supplied PNG layers.
 * No dependencies. Pixels are @3x; display portrait at 56 CSS px.
 * Angle is the liquid-surface angle in screen coordinates, not raw sensor data.
 */
(function (root) {
  'use strict';
  const N = 168, C = 84, RI = 56, RO = 74, RP = 47;
  const files = ['portret_oprawa','portret_maska','zbiornik_tlo','zbiornik_maska',
    'zbiornik_plyn','zbiornik_szklo','zbiornik_tafla','poziom_pusty','lacznik',
    'przycisk_normalny','przycisk_wcisniety','przycisk_aktywny','przycisk_niedostepny',
    'ikona_menu','ikona_plecak','ikona_aparat','ikona_welocyped','ikona_hulajnoga'];
  function diskBelow(r, h) {
    if (h <= -r) return Math.PI * r * r;
    if (h >= r) return 0;
    return r*r*Math.acos(h/r)-h*Math.sqrt(Math.max(0,r*r-h*h));
  }
  function heightForProgress(value) {
    const p = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
    if (p === 0) return RO + 1;
    if (p === 1) return -RO - 1;
    const target = p*Math.PI*(RO*RO-RI*RI);
    let lo = -RO, hi = RO;
    for (let i = 0; i < 32; i++) {
      const mid = (lo+hi)/2;
      if (diskBelow(RO,mid)-diskBelow(RI,mid)>target) lo=mid;
      else hi=mid;
    }
    return (lo+hi)/2;
  }
  function loadAssets(base = './png_3x/') {
    return Promise.all(files.map(name => new Promise((resolve,reject) => {
      const img = new Image();
      img.onload = () => resolve([name,img]);
      img.onerror = () => reject(new Error('Missing HUD layer: '+name));
      img.src = base+name+'.png';
    }))).then(entries => Object.fromEntries(entries));
  }
  function surfaceAngleFromDownVector(gx, gy) {
    if (!Number.isFinite(gx) || !Number.isFinite(gy) || Math.hypot(gx,gy)<1e-6) return 0;
    return Math.atan2(-gx, gy)*180/Math.PI;
  }
  function createTankRenderer(a) {
    function canvas() { const c=document.createElement('canvas');c.width=N;c.height=N;return c; }
    const out=canvas(), liquid=canvas(), face=canvas();
    const oc=out.getContext('2d'), lc=liquid.getContext('2d'), fc=face.getContext('2d');
    function draw(ctx, options={}) {
      const {x=0,y=0,size=56,progress=0,angleDegrees=0,portrait=null}=options;
      const p=Math.max(0,Math.min(1,Number.isFinite(progress)?progress:0));
      const angle=(Number.isFinite(angleDegrees)?angleDegrees:0)*Math.PI/180;
      const h=heightForProgress(p);
      oc.clearRect(0,0,N,N);
      if (portrait) {
        fc.clearRect(0,0,N,N);fc.globalCompositeOperation='source-over';
        fc.drawImage(portrait,C-RP,C-RP,RP*2,RP*2);
        fc.globalCompositeOperation='destination-in';fc.drawImage(a.portret_maska,0,0);
        fc.globalCompositeOperation='source-over';oc.drawImage(face,0,0);
      }
      oc.drawImage(a.zbiornik_tlo,0,0);
      lc.clearRect(0,0,N,N);lc.globalCompositeOperation='source-over';
      if(p>0) {
        lc.save();lc.translate(C,C);lc.rotate(angle);
        lc.beginPath();lc.rect(-N*2,h,N*4,N*4);lc.clip();
        lc.setTransform(1,0,0,1,0,0);lc.drawImage(a.zbiornik_plyn,0,0);lc.restore();
        if(p<1) {
          lc.save();lc.translate(C,C);lc.rotate(angle);
          lc.drawImage(a.zbiornik_tafla,-N/2,h-4.5);lc.restore();
        }
        lc.globalCompositeOperation='destination-in';lc.drawImage(a.zbiornik_maska,0,0);
        lc.globalCompositeOperation='source-over';oc.drawImage(liquid,0,0);
      }
      oc.drawImage(a.zbiornik_szklo,0,0);oc.drawImage(a.portret_oprawa,0,0);
      ctx.save();ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
      ctx.drawImage(out,x,y,size,size);ctx.restore();
    }
    return {draw};
  }
  const api={loadAssets,createTankRenderer,heightForProgress,surfaceAngleFromDownVector};
  if (typeof module!=='undefined' && module.exports) module.exports=api;
  root.ExpLoreHudGraphics=api;
})(typeof window!=='undefined'?window:globalThis);
