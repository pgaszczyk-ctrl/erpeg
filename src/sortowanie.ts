import Phaser from 'phaser';

/**
 * Faster depth sorting of the display list (owner, 27 Oct 2026: the game stuttered on phones). Phaser sorts the whole
 * list from scratch on every frame in which anything changed its depth – and the hero, townsfolk and enemies change it
 * every frame (depth = y), while the game scene holds ~8000 objects (signs, lamps and tree crowns of the whole map,
 * mostly hidden). The list is nearly sorted then: only a few objects moved a little, so they are slid into place
 * (insertion sort, stable like Phaser's). When many are out of order (a new map chunk added its crowns) Phaser's own
 * sort does it.
 */
export function szybszeSortowanie() {
  type Lista = { list: { _depth: number }[]; sortChildrenFlag: boolean; sortByDepth: (a: unknown, b: unknown) => number };
  const proto = Phaser.GameObjects.DisplayList.prototype as unknown as Lista & { depthSort: () => void };
  const pelne = Phaser.Utils.Array.StableSort as unknown as (a: unknown[], f: (a: unknown, b: unknown) => number) => void;
  const MAKS_ZLYCH = 48;
  proto.depthSort = function (this: Lista) {
    if (!this.sortChildrenFlag) return;
    this.sortChildrenFlag = false;
    const l = this.list;
    let zlych = 0;
    for (let i = 1; i < l.length; i++) if (l[i]._depth < l[i - 1]._depth && ++zlych > MAKS_ZLYCH) break;
    if (!zlych) return;
    if (zlych > MAKS_ZLYCH) return pelne(l, this.sortByDepth);
    for (let i = 1; i < l.length; i++) {
      const o = l[i], d = o._depth;
      if (d >= l[i - 1]._depth) continue;
      let j = i - 1;
      while (j >= 0 && l[j]._depth > d) {
        l[j + 1] = l[j];
        j--;
      }
      l[j + 1] = o;
    }
  };
}
