import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

const rigMaterial = new T.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.88,
  flatShading: true,
});
// Keep animated joints separate; batch the fixed coloured pieces inside each joint.
function batchRig(root: T.Group) {
  const groups: T.Object3D[] = [];
  root.traverse((o) => {
    if (o instanceof T.Group) groups.push(o);
  });
  for (const group of groups) {
    const meshes = group.children.filter(
      (o): o is T.Mesh => o instanceof T.Mesh,
    );
    if (meshes.length < 2) continue;
    const geos = meshes.map((m) => {
      m.updateMatrix();
      const source = m.geometry.index
        ? m.geometry.toNonIndexed()
        : m.geometry.clone();
      source.applyMatrix4(m.matrix);
      source.deleteAttribute("uv");
      const color = (m.material as T.MeshStandardMaterial).color;
      const values = new Float32Array(source.attributes.position.count * 3);
      for (let i = 0; i < values.length; i += 3) {
        values[i] = color.r;
        values[i + 1] = color.g;
        values[i + 2] = color.b;
      }
      source.setAttribute("color", new T.BufferAttribute(values, 3));
      return source;
    });
    const merged = mergeGeometries(geos);
    if (merged) {
      for (const m of meshes) {
        group.remove(m);
        m.geometry.dispose();
      }
      const mesh = new T.Mesh(merged, rigMaterial);
      mesh.receiveShadow = true;
      group.add(mesh);
    }
    geos.forEach((g) => g.dispose());
  }
}
const materials = new Map<number, T.MeshStandardMaterial>();
export function material(color: number) {
  let m = materials.get(color);
  if (!m) {
    m = new T.MeshStandardMaterial({
      color,
      roughness: 0.88,
      flatShading: true,
    });
    materials.set(color, m);
  }
  return m;
}
function box(parent: T.Object3D, color: number, size: number[], at: number[]) {
  const m = new T.Mesh(
    new T.BoxGeometry(...(size as [number, number, number])),
    material(color),
  );
  m.position.set(...(at as [number, number, number]));
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
function ball(
  parent: T.Object3D,
  color: number,
  r: number,
  at: number[],
  scale = [1, 1, 1],
) {
  const m = new T.Mesh(new T.IcosahedronGeometry(r, 1), material(color));
  m.position.set(...(at as [number, number, number]));
  m.scale.set(...(scale as [number, number, number]));
  m.castShadow = true;
  parent.add(m);
  return m;
}
export type Rig = {
  root: T.Group;
  body: T.Group;
  leftLeg: T.Group;
  rightLeg: T.Group;
  leftArm: T.Group;
  rightArm: T.Group;
  sword: T.Group;
  wand: T.Group;
  head: T.Group;
  kind: "hero" | "wolf" | "archer";
  phase: number;
};
export function person(kind: "hero" | "archer" = "hero"): Rig {
  const root = new T.Group(),
    body = new T.Group(),
    head = new T.Group(),
    leftLeg = new T.Group(),
    rightLeg = new T.Group(),
    leftArm = new T.Group(),
    rightArm = new T.Group(),
    sword = new T.Group(),
    wand = new T.Group();
  root.add(body);
  body.position.y = 0.98;
  const coat = kind === "hero" ? 0x345e70 : 0x8d563c,
    skin = 0xe8b987,
    leather = 0x483e32,
    gold = 0xc99a51;
  box(body, coat, [0.88, 0.9, 0.5], [0, 0.33, 0]);
  box(body, leather, [0.92, 0.14, 0.54], [0, 0.03, 0]);
  box(body, gold, [0.15, 0.15, 0.06], [0, 0.04, 0.29]);
  box(body, coat, [1.03, 0.25, 0.6], [0, -0.13, 0]);
  body.add(head);
  head.position.y = 1.07;
  ball(head, skin, 0.37, [0, 0, 0.025], [1, 1.1, 0.93]);
  box(head, 0x4b3b2f, [0.65, 0.17, 0.58], [0, 0.26, -0.04]);
  box(head, leather, [0.64, 0.12, 0.075], [0, 0.08, 0.335]);
  for (const x of [-0.19, 0.19]) {
    ball(head, gold, 0.12, [x, 0.08, 0.37], [1, 1, 0.5]);
    ball(head, 0x63cbd5, 0.075, [x, 0.08, 0.42], [1, 1, 0.35]);
  }
  box(body, 0xa07b49, [0.55, 0.6, 0.3], [0, 0.3, -0.37]);
  box(body, gold, [0.25, 0.48, 0.2], [0.3, 0.38, -0.43]);
  for (const [joint, x] of [
    [leftLeg, -0.24],
    [rightLeg, 0.24],
  ] as const) {
    root.add(joint);
    joint.position.set(x, 0.94, 0);
    box(joint, 0x343c3b, [0.3, 0.56, 0.32], [0, -0.28, 0]);
    box(joint, leather, [0.34, 0.24, 0.52], [0, -0.69, 0.09]);
  }
  for (const [joint, x] of [
    [leftArm, -0.6],
    [rightArm, 0.6],
  ] as const) {
    body.add(joint);
    joint.position.set(x, 0.65, 0);
    box(joint, coat, [0.3, 0.48, 0.33], [0, -0.19, 0]);
    ball(joint, skin, 0.18, [0, -0.5, 0]);
    box(joint, gold, [0.33, 0.1, 0.35], [0, -0.32, 0]);
  }
  rightArm.add(sword, wand);
  sword.position.set(0, -0.48, 0.07);
  wand.position.copy(sword.position);
  // Blade points forward in the hand; the arm/body provide the arc, not a floating weapon.
  box(sword, leather, [0.12, 0.13, 0.35], [0, 0, 0.08]);
  box(sword, gold, [0.5, 0.12, 0.12], [0, 0, 0.28]);
  box(sword, 0xe1e7dc, [0.2, 0.09, 1.12], [0, 0, 0.88]);
  const tip = new T.Mesh(
    new T.ConeGeometry(0.145, 0.34, 4),
    material(0xf4f5e8),
  );
  tip.rotation.x = Math.PI / 2;
  tip.rotation.z = Math.PI / 4;
  tip.position.set(0, 0, 1.61);
  sword.add(tip);
  box(wand, leather, [0.11, 0.12, 0.85], [0, 0, 0.35]);
  ball(wand, 0x72e4ed, 0.19, [0, 0, 0.85]);
  wand.visible = false;
  batchRig(root);
  return {
    root,
    body,
    head,
    leftLeg,
    rightLeg,
    leftArm,
    rightArm,
    sword,
    wand,
    kind,
    phase: 0,
  };
}
export function wolf(): Rig {
  const root = new T.Group(),
    body = new T.Group(),
    head = new T.Group(),
    leftLeg = new T.Group(),
    rightLeg = new T.Group(),
    leftArm = new T.Group(),
    rightArm = new T.Group();
  root.add(body);
  body.position.y = 0.6;
  ball(body, 0x777b70, 0.6, [0, 0.22, 0], [0.75, 0.85, 1.3]);
  body.add(head);
  head.position.set(0, 0.45, 0.64);
  ball(head, 0x8f9585, 0.36, [0, 0, 0], [1, 0.95, 1.1]);
  box(head, 0xb7baa2, [0.36, 0.24, 0.44], [0, -0.06, 0.32]);
  box(head, 0x283733, [0.21, 0.12, 0.12], [0, -0.03, 0.56]);
  for (const x of [-0.22, 0.22]) {
    const ear = new T.Mesh(
      new T.ConeGeometry(0.15, 0.36, 3),
      material(0x667368),
    );
    ear.position.set(x, 0.36, -0.08);
    head.add(ear);
    ball(head, 0xffcc70, 0.055, [x, 0.07, 0.29]);
  }
  for (const [j, x, z] of [
    [leftLeg, -0.29, -0.42],
    [rightLeg, 0.29, -0.42],
    [leftArm, -0.29, 0.4],
    [rightArm, 0.29, 0.4],
  ] as const) {
    root.add(j);
    j.position.set(x, 0.64, z);
    box(j, 0x5a655b, [0.19, 0.54, 0.2], [0, -0.24, 0]);
  }
  const tail = box(body, 0x69756b, [0.19, 0.19, 0.74], [0, 0.17, -0.9]);
  tail.rotation.x = -0.4;
  batchRig(root);
  return {
    root,
    body,
    head,
    leftLeg,
    rightLeg,
    leftArm,
    rightArm,
    sword: new T.Group(),
    wand: new T.Group(),
    kind: "wolf",
    phase: 0,
  };
}
export function animate(
  rig: Rig,
  dt: number,
  moving: boolean,
  attack: number,
  sweep: boolean,
) {
  rig.phase += dt * (moving ? 11 : 2);
  const p = rig.phase,
    step = moving ? 0.65 : 0;
  rig.leftLeg.rotation.x = Math.sin(p) * step;
  rig.rightLeg.rotation.x = -Math.sin(p) * step;
  rig.body.position.y =
    (rig.kind === "wolf" ? 0.6 : 0.98) +
    (moving ? Math.abs(Math.sin(p)) * 0.06 : Math.sin(p) * 0.018);
  if (rig.kind === "wolf") {
    rig.leftArm.rotation.x = -Math.sin(p) * step;
    rig.rightArm.rotation.x = Math.sin(p) * step;
    rig.body.rotation.x = attack > 0 ? -0.2 : 0;
    return;
  }
  rig.leftArm.rotation.x = -Math.sin(p) * step * 0.5;
  rig.rightArm.rotation.x = Math.sin(p) * step * 0.35;
  rig.body.rotation.y = 0;
  rig.rightArm.rotation.y = 0;
  rig.rightArm.rotation.z = -0.12;
  if (attack > 0) {
    const wind = 0.28;
    const progress =
      attack < wind
        ? -attack / wind
        : -1 +
          2.4 *
            Math.sin((Math.min(1, (attack - wind) / (1 - wind)) * Math.PI) / 2);
    rig.body.rotation.y = progress * (sweep ? 0.65 : 0.28);
    rig.rightArm.rotation.y = progress * (sweep ? 1.8 : 1.35);
    rig.rightArm.rotation.x = -0.9;
    rig.rightArm.rotation.z = -0.22;
  }
}
export function sector(
  radius: number,
  halfArc: number,
  color: number,
  opacity = 0.4,
) {
  const shape = new T.Shape();
  shape.moveTo(0, 0);
  for (let i = 0; i <= 28; i++) {
    const a = -halfArc + (2 * halfArc * i) / 28;
    shape.lineTo(Math.sin(a) * radius, -Math.cos(a) * radius);
  }
  shape.lineTo(0, 0);
  const m = new T.Mesh(
    new T.ShapeGeometry(shape),
    new T.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthWrite: false,
      side: T.DoubleSide,
    }),
  );
  m.rotation.x = -Math.PI / 2;
  return m;
}
