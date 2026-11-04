import Phaser from 'phaser';

/** Trace the current visible frame, including animated canvas atlases used by 3D residents.
 * Sample only the selected body, at map-pixel resolution, rather than its padded sprite box. */
export class InteractionOutline {
  private canvas = document.createElement('canvas');
  private context = this.canvas.getContext('2d', { willReadFrequently: true })!;
  private body?: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image;
  private frame?: Phaser.Textures.Frame;
  private sampledAt = -Infinity;
  private pixels = new Uint8ClampedArray();

  draw(scene: Phaser.Scene, g: Phaser.GameObjects.Graphics, x: number, y: number, alpha: number): number | null {
    const body = [...scene.children.list].reverse().find((o): o is Phaser.GameObjects.Sprite | Phaser.GameObjects.Image =>
      (o instanceof Phaser.GameObjects.Sprite || o instanceof Phaser.GameObjects.Image) &&
      o.visible && o.alpha > 0 && Math.abs(o.x-x)<.1 && Math.abs(o.y-y)<.1 &&
      !o.isCropped && o.displayHeight > 6 && o.displayWidth > 3);
    if (!body) return null;
    const f=body.frame, sx=Math.abs(body.scaleX), sy=Math.abs(body.scaleY);
    const w=Math.max(1,Math.ceil(f.cutWidth*sx)), h=Math.max(1,Math.ceil(f.cutHeight*sy));
    // Dynamic 3D atlases update at 24 fps. Avoid a GPU readback on every game tick.
    if(body!==this.body||f!==this.frame||w!==this.canvas.width||h!==this.canvas.height||scene.time.now-this.sampledAt>=1000/24){
      this.canvas.width=w; this.canvas.height=h;
      this.context.drawImage(f.source.image as CanvasImageSource,f.cutX,f.cutY,f.cutWidth,f.cutHeight,0,0,w,h);
      this.pixels=this.context.getImageData(0,0,w,h).data;
      this.body=body;this.frame=f;this.sampledAt=scene.time.now;
    }
    const pixels=this.pixels;
    const solid=(i:number,j:number)=>i>=0&&j>=0&&i<w&&j<h&&pixels[(j*w+i)*4+3]>=64;
    const left=body.x-body.displayOriginX*sx+f.x*sx, top=body.y-body.displayOriginY*sy+f.y*sy;
    const px=(i:number)=>body.flipX?body.x-(left+i-body.x):left+i;
    const py=(j:number)=>body.flipY?body.y-(top+j-body.y):top+j;
    let head=Infinity;
    g.lineStyle(.7,0xffd36a,alpha).beginPath();
    for(let j=0;j<h;j++)for(let i=0;i<w;i++)if(solid(i,j)) {
      head=Math.min(head,py(j),py(j+1));
      const edge=(a:number,b:number,c:number,d:number)=>{g.moveTo(px(a),py(b));g.lineTo(px(c),py(d));};
      if(!solid(i,j-1))edge(i,j,i+1,j);
      if(!solid(i,j+1))edge(i,j+1,i+1,j+1);
      if(!solid(i-1,j))edge(i,j,i,j+1);
      if(!solid(i+1,j))edge(i+1,j,i+1,j+1);
    }
    g.strokePath();
    return Number.isFinite(head)?head:null;
  }
}
