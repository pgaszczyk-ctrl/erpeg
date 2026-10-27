// Objects far off screen are taken off the scene's display list instead of only being hidden (FPS log, 27 Oct 2026:
// ~7000 objects – sign posts, their lights and shadows, tree crowns – were sorted by depth and walked through every
// frame while ~200 were on screen). Off the list they cost nothing; back on screen they return (and get sorted in).
// Whoever takes something off the list must also destroy it when the scene ends (the scene only clears its list).
import type Phaser from 'phaser';

type Obiekt = Phaser.GameObjects.GameObject & { setVisible(v: boolean): unknown; visible: boolean };

export function naLiscie(o: Obiekt, on: boolean) {
  if (on) {
    if (!o.displayList) o.addToDisplayList();
    if (!o.visible) o.setVisible(true);
  } else {
    if (o.visible) o.setVisible(false);
    if (o.displayList) o.removeFromDisplayList();
  }
}
