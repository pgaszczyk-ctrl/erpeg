/** Pixel coordinates use image edges: (0,0) is the top-left image corner.
 * Attach head.mount to body.neck. Hair/hat bounds are irrelevant.
 * Keep integer output offsets to avoid blurry pixel-art rendering.
 */
export function placement(head, body, origin = {x:0,y:0}) {
  const exactX = body.neck.x - head.mount.x;
  const exactY = body.neck.y - head.mount.y;
  return {
    body: {x:origin.x,y:origin.y},
    head: {x:origin.x + Math.round(exactX),y:origin.y + Math.round(exactY)},
    roundingError: {x:Math.round(exactX)-exactX,y:Math.round(exactY)-exactY}
  };
}

export function drawCharacter(ctx, headImage, bodyImage, head, body, origin={x:0,y:0}) {
  const p=placement(head,body,origin);
  ctx.imageSmoothingEnabled=false;
  ctx.drawImage(bodyImage,p.body.x,p.body.y);
  ctx.drawImage(headImage,p.head.x,p.head.y);
  return p;
}

/** Mask image red means main garment, green means secondary garment.
 * Alpha=0 excludes pixel. Preserve original brightness and alpha.
 * Color inputs are RGB arrays 0..255. Skin/hair/outline are unmasked.
 */
export function recolorGarment(baseRGBA, maskRGBA, mainColor, secondaryColor) {
  const out=new Uint8ClampedArray(baseRGBA);
  for (let i=0;i<out.length;i+=4) {
    if(!maskRGBA[i+3] || !baseRGBA[i+3]) continue;
    const color=maskRGBA[i]===255 ? mainColor : maskRGBA[i+1]===255 ? secondaryColor : null;
    if(!color) continue;
    const value=Math.max(baseRGBA[i],baseRGBA[i+1],baseRGBA[i+2])/255;
    const peak=Math.max(...color,1);
    for(let c=0;c<3;c++) out[i+c]=Math.round(color[c]/peak * value *255);
  }
  return out;
}
