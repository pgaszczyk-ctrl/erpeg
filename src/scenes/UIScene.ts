import { showShop, type ShopHandle } from '../ui/shop';
import { trzesienieWlaczone, ustawTrzesienie, efektGorWlaczony, ustawEfektGor } from '../ustawieniaGracza';
import { GATUNKI_SMOKOW, type GatunekId } from '../content/smoki';
import Phaser from 'phaser';
import { WSKRZESZENIE, LECZENIE_OWOCAMI } from '../content/sklepy';
import { askBug } from '../ui/bug';
import { gameShotJpeg } from '../ui/snapshot';
import { showPhoto } from '../ui/brag';
import { goodsPicture, itemPictureUrl } from '../ui/itemIcon';
import { gear, item, condition, ammoOf, isBroken } from '../inventory';
import { STRZALY, AMUNICJA } from '../content/zuzycie';
import { report } from '../errlog';
import { TEX, GOODS_TEX, arrowTexture } from '../art';
import { wersjaNapis, TEST } from '../version';

/** Quest arrows for goals off screen sit on a ring around the hero: radius = this share of the screen's shorter side. */
const STRZALKI_ZADAN = { promien: 0.3 };
import { OWOCE, type Owoc } from '../content/sklepy';
import { mountHud, unmountHud, setHud, showHud, hudPickup, setHudAvatar, hudZoom, setHudVehicles } from '../ui/hud';
import { hasTestVehicle, testVehicle, setTestVehicle } from '../testTransport';
import { heroPortrait } from '../sprites';
import { touchInput, resetTouch, onTap, typingInField, onMenuButton, JOY_RADIUS, joyHome, attackHome, healHome, activity, keyboardDir } from '../controls';
import type { HudState, DialogRequest, GameScene } from './GameScene';
import { toggleMinimap, closeMinimap, isMinimapOpen } from '../ui/minimap';
import { PLAYER } from '../objects/Player';
import { toggleCharacter, closeCharacter, isCharacterOpen } from '../ui/character';
import { showCodeOverlay } from '../ui/codeCard';
import { OSTROSC, przyblizenie } from '../screen';

/** Font of the dialogs (index.html loads it from Google Fonts; BootScene waits for it). */
export const DIALOG_FONT = '"Alegreya Sans", "Trebuchet MS", sans-serif';
import { session } from '../quests';

// HUD (hearts, coins, street, mission goal + arrow), mission dialogs,
// on-screen touch controls and the game-over screen.
// Runs on top of GameScene with its own unzoomed camera.

export class UIScene extends Phaser.Scene {
  // Life, experience, healing, the character sheet, camera, gold, the town and the current
  // quest are the HTML HUD (src/ui/hud.ts, owner's spec 5 Oct 2026); here only what lives
  // in the canvas: the menu button, duel hearts, quest arrows, toasts, dialogs, the joystick.
  private duelHearts: Phaser.GameObjects.Image[] = [];
  private menuBtn!: Phaser.GameObjects.Text;
  private lastLevel = 0;
  /** What the last HUD state held, for the "+1 marchewka" notes (null = nothing yet). */
  private lastGoods: Partial<Record<Owoc, number>> | null = null;
  private lastCoins: number | null = null;
  private lastWarn = false;
  private overlay?: Phaser.GameObjects.Container;
  private ui = 3; // pixel scale for HUD art

  private joyBase!: Phaser.GameObjects.Arc;
  private joyKnob!: Phaser.GameObjects.Arc;
  private attackBtn!: Phaser.GameObjects.Arc;
  private attackLabel!: Phaser.GameObjects.Text;
  private touch = false;
  private joyHome = new Phaser.Math.Vector2();
  private joyArrows!: Phaser.GameObjects.Graphics;
  private hintAt = 0;
  private hintUntil = 0;

  private skillBar!: Phaser.GameObjects.Container;
  private skillFill!: Phaser.GameObjects.Rectangle;
  private skillLabel!: Phaser.GameObjects.Text;
  private skillHide?: Phaser.Time.TimerEvent;
  private goalText!: Phaser.GameObjects.Text;
  private arrows: Phaser.GameObjects.Image[] = [];
  private toastText!: Phaser.GameObjects.Text;
  private hud?: HudState;
  private dialogBox?: Phaser.GameObjects.Container;
  private shop?: ShopHandle;
  private get hasDialog() { return !!this.dialogBox || !!this.shop; }
  private dialogButtons: { rect: Phaser.GameObjects.Rectangle; index: number }[] = [];
  private dialogChoose?: (i: number) => void;

  constructor() {
    super('ui');
  }

  /** The screen in CSS pixels (the canvas has OSTROSC times more, see screen.ts). */
  private get view() {
    return { width: this.scale.width / OSTROSC, height: this.scale.height / OSTROSC };
  }

  create() {
    // Lay everything out in CSS pixels; the camera enlarges it to the sharper canvas.
    // (centred, not with origin 0: Graphics were drawn off their place that way)
    const fitCam = () => this.cameras.main.setZoom(OSTROSC).centerOn(this.view.width / 2, this.view.height / 2);
    fitCam();
    this.scale.on('resize', fitCam);
    this.events.once('shutdown', () => this.scale.off('resize', fitCam));
    if (OSTROSC > 1 && !(this.add as unknown as { sharp?: boolean }).sharp) {
      // Texts get as many pixels as the canvas has, or they'd look blurry.
      const add = this.add as unknown as { sharp?: boolean; text: (...a: unknown[]) => Phaser.GameObjects.Text };
      const text = add.text.bind(this.add);
      add.text = (...a: unknown[]) => text(...a).setResolution(OSTROSC);
      add.sharp = true;
    }
    this.duelHearts = [];
    this.dialogButtons = [];
    this.overlay = undefined;
    this.lastGoods = null;
    this.lastCoins = null;
    this.lastLevel = 0;
    this.lastWarn = false;
    this.ui = Math.max(2, Math.round(Math.min(this.view.width, this.view.height) / 220));
    this.menuBtn = this.add
      .text(0, 0, '☰', { fontFamily: 'sans-serif', fontSize: `${12 * this.ui}px`, color: '#ffffff', stroke: '#1e1a24', strokeThickness: this.ui * 2 })
      .setOrigin(0, 0);
    const label = (size: number, color = '#ffffff') =>
      this.add.text(0, 0, '', { fontFamily: 'monospace', fontSize: `${size}px`, color, stroke: '#1e1a24', strokeThickness: 4, align: 'center' });
    this.goalText = label(14, '#fff2a8').setOrigin(0.5, 0);
    this.arrows = [0, 1, 2].map(() => this.add.image(0, 0, TEX.arrow).setScale(this.ui).setVisible(false));
    this.toastText = label(18, '#ffffff').setOrigin(0.5).setAlpha(0).setDepth(10);
    // Skill progress while training (shown for a moment after each practice hit):
    // an icon and a clear bar with a light frame (the soft blurred one was too faint on the map).
    const bw = 70 * this.ui;
    const bh = 5 * this.ui;
    this.skillLabel = this.add.text(-bw / 2 - 6, bh / 2, '⚔', { fontFamily: 'sans-serif', fontSize: `${9 * this.ui}px`, color: '#ffffff', stroke: '#1e1a24', strokeThickness: 4 }).setOrigin(1, 0.5);
    const back = this.add.rectangle(0, 0, bw, bh, 0x1e1a24, 0.85).setOrigin(0.5, 0).setStrokeStyle(2, 0xffffff, 0.8);
    this.skillFill = this.add.rectangle(-bw / 2, 0, bw, bh, 0xf7c531, 1).setOrigin(0, 0);
    const bar = this.add.container(0, 0, [back, this.skillFill]);
    this.skillBar = this.add.container(0, 0, [bar, this.skillLabel]).setAlpha(0).setDepth(5);
    this.dialogBox = undefined;

    this.createTouchControls();
    mountHud({
      heal: () => (this.scene.get('game') as GameScene).healButton?.(),
      character: () => this.openCharacter('eq'),
      quests: () => this.openCharacter('quests'),
      map: () => this.openMap(),
      zoom: () => (this.scene.get('game') as GameScene).toggleZoom(),
      zoomOn: przyblizenie(),
      camera: () => this.takePhoto(),
      vehicle: TEST ? (vehicle) => setTestVehicle(testVehicle === vehicle ? 'pieszo' : vehicle) : undefined,
    });
    this.layout();
    this.heroAvatar();
    const onLook = () => this.heroAvatar();
    this.game.events.on('hero-look', onLook);
    this.events.once('shutdown', () => this.game.events.off('hero-look', onLook));
    this.scale.on('resize', this.layout, this);

    const onHud = (s: HudState) => this.updateHud(s);
    this.game.events.on('hud', onHud);
    const onDialog = (d: DialogRequest) => this.showDialog(d);
    const onToast = (t: string, ms?: number) => { if (t !== 'Gra zapisana') this.shop?.message(t); this.toast(t, ms); };
    this.game.events.on('dialog', onDialog);
    this.game.events.on('toast', onToast);
    const onPractice = (p: { skill: string; into: number; need: number; max: boolean; gain?: number }) => this.showPractice(p);
    this.game.events.on('practice', onPractice);
    const offTap = onTap((x, y) => this.onDialogTap(x, y));
    const onKey = (e: KeyboardEvent) => {
      if (typingInField(e)) return;
      if (this.shop) {
        if (e.key === 'Escape') { e.preventDefault(); this.chooseShop(this.shop.lastIndex); }
        return;
      }
      if ((e.key === 'm' || e.key === 'M') && !document.getElementById('menu') && !this.hasDialog) {
        this.openMap();
      }
      if ((e.key === 'z' || e.key === 'Z') && !document.getElementById('menu') && !this.hasDialog) {
        hudZoom((this.scene.get('game') as GameScene).toggleZoom());
      }
      if ((e.key === 'c' || e.key === 'C' || e.key === 'i' || e.key === 'I') && !document.getElementById('menu') && !this.hasDialog) {
        this.openCharacter();
      }
      if (e.key === 'Escape' && !document.getElementById('menu')) {
        if (isCharacterOpen()) closeCharacter();
        else if (isMinimapOpen()) closeMinimap();
        else if (this.dialogBox) {
          // As if the last button (Wyjdź / Anuluj) was picked, so the game goes on.
          const choose = this.dialogChoose;
          const last = this.dialogButtons.filter((b) => b.index >= 0).length - 1;
          this.closeDialog();
          choose?.(Math.max(0, last));
        } else this.openGameMenu();
      }
    };
    window.addEventListener('keydown', onKey);
    const initial = this.registry.get('hud') as HudState | undefined;
    if (initial) this.updateHud(initial);
    this.events.once('shutdown', () => {
      this.game.events.off('hud', onHud);
      this.game.events.off('dialog', onDialog);
      this.game.events.off('toast', onToast);
      this.game.events.off('practice', onPractice);
      offTap();
      healHome.on = false;
      unmountHud();
      window.removeEventListener('keydown', onKey);
      closeMinimap();
      closeCharacter();
      this.closeDialog();
      this.scale.off('resize', this.layout, this);
      resetTouch();
    });

    if (!window.matchMedia('(pointer: coarse)').matches) {
      const hint = this.add
        .text(this.view.width / 2, this.view.height - 12, 'WASD / strzałki – ruch    SPACJA lub klik – miecz', {
          fontFamily: 'monospace', fontSize: '14px', color: '#ffffff', stroke: '#1e1a24', strokeThickness: 4,
        })
        .setOrigin(0.5, 1);
      this.tweens.add({ targets: hint, alpha: 0, delay: 6000, duration: 1000 });
    }

    const missing = (this.registry.get('missing') as string[] | undefined) ?? [];
    if (missing.length) this.toast(`Nie znalazłem na mapie:\n${missing.join('\n')}`, 8000);
  }

  /** A big "Poziom 2!" over the game after levelling up. */
  private levelUp(level: number) {
    const { width, height } = this.view;
    const big = this.add
      .text(width / 2, height * 0.38, `Poziom ${level}!`, { fontFamily: 'monospace', fontSize: `${Math.round(Math.min(width, 560) / 7)}px`, color: '#f7c531', stroke: '#1e1a24', strokeThickness: 10 })
      .setOrigin(0.5).setDepth(40).setScale(0.2).setAlpha(0);
    const sub = this.add
      .text(width / 2, height * 0.38 + big.height * 0.75, '⭐ Awans! ⭐', { fontFamily: 'monospace', fontSize: '20px', color: '#ffffff', stroke: '#1e1a24', strokeThickness: 5 })
      .setOrigin(0.5).setDepth(40).setAlpha(0);
    // A burst of stars around it.
    const burst: Phaser.GameObjects.Image[] = [];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const st = this.add.image(width / 2, height * 0.38, TEX.star).setScale(this.ui).setDepth(39);
      burst.push(st);
      this.tweens.add({ targets: st, x: width / 2 + Math.cos(a) * width * 0.42, y: height * 0.38 + Math.sin(a) * width * 0.3, alpha: 0, angle: 180, duration: 1400, ease: 'Cubic.easeOut', onComplete: () => st.destroy() });
    }
    this.tweens.add({ targets: big, scale: 1, alpha: 1, duration: 450, ease: 'Back.easeOut' });
    this.tweens.add({ targets: sub, alpha: 1, duration: 400, delay: 300 });
    this.tweens.add({ targets: [big, sub], alpha: 0, delay: 2600, duration: 600, onComplete: () => { big.destroy(); sub.destroy(); } });
  }

  /** "Walka wręcz – poziom 2" with a bar filling up to the next level. */
  private showPractice(p: { skill: string; into: number; need: number; max: boolean; gain?: number }) {
    this.skillLabel.setText(p.skill === 'luk' ? '🏹' : p.skill === 'magia' ? '✨' : '⚔');
    const full = 70 * this.ui;
    this.skillFill.setSize(Math.max(2 * this.ui, full * (p.max ? 1 : p.into / p.need)), this.skillFill.height);
    this.tweens.killTweensOf(this.skillBar);
    this.skillBar.setAlpha(1);
    this.skillHide?.remove();
    this.skillHide = this.time.delayedCall(2500, () => this.tweens.add({ targets: this.skillBar, alpha: 0, duration: 500 }));
    // At higher levels one hit moves the bar by a fraction of a pixel (bug report 23: "the bar stands still"):
    // a small "+1" rises from the bar's end so every bit of practice shows.
    if (p.max || !p.gain) return;
    const b = this.skillBar;
    const t = this.add
      .text(b.x + 35 * this.ui + 4, b.y, `+${p.gain}`, { fontFamily: 'monospace', fontSize: `${8 * this.ui}px`, color: '#f7c531', stroke: '#1e1a24', strokeThickness: 3 })
      .setOrigin(0, 0.5)
      .setDepth(6)
      .setResolution(OSTROSC);
    this.tweens.add({ targets: t, y: t.y - 10 * this.ui, alpha: 0, duration: 900, onComplete: () => t.destroy() });
  }

  private layout() {
    const { width, height } = this.view;
    const pad = 4 * this.ui;
    this.menuBtn.setPosition(pad, pad - 2 * this.ui);
    const u = this.ui;
    const hx = pad + this.menuBtn.width + 3 * u;
    // Top left: the menu, and the purple hearts during a duel.
    this.duelHearts.forEach((h, i) => h.setPosition(hx, pad + 2 * u).setX(hx + i * 10 * u));
    const wrap = Math.min(width - 40, 520);
    this.goalText.setWordWrapWidth(wrap).setPosition(width / 2, height * 0.2);
    this.toastText.setWordWrapWidth(wrap).setPosition(width / 2, height * 0.3);
    this.skillBar.setPosition(width / 2, height * 0.6);

    const r = JOY_RADIUS;
    this.joyHome.set(pad + r + 16, height - pad - r - 16);
    joyHome.x = this.joyHome.x;
    joyHome.y = this.joyHome.y;
    this.joyArrows.setPosition(this.joyHome.x, this.joyHome.y);
    this.attackBtn.setPosition(width - pad - 34, height - pad - 44);
    attackHome.x = this.attackBtn.x;
    attackHome.y = this.attackBtn.y;
    attackHome.r = this.attackBtn.radius;
    this.attackLabel.setPosition(this.attackBtn.x, this.attackBtn.y);
    // The heal button follows the hero (placeHeroWidgets).
  }

  private updateHud(s: HudState) {
    if (this.lastLevel && s.level > this.lastLevel) this.levelUp(s.level);
    this.lastLevel = s.level;
    while (this.duelHearts.length < s.duelMax / 2) {
      this.duelHearts.push(this.add.image(0, 0, TEX.heartDuel).setOrigin(0).setScale(this.ui).setVisible(false));
      this.layout();
    }
    this.duelHearts.forEach((h, i) => {
      const filled = (s.duel ?? 0) - i * 2;
      h.setVisible(s.duel !== null).setTexture(filled > 0 ? TEX.heartDuel : TEX.heartDuelEmpty).setAlpha(filled === 1 ? 0.55 : 1);
    });
    // The weapon line is gone from the map: a broken weapon or few arrows say so once.
    if (s.swordWarn && !this.lastWarn) this.toast(`⚠ ${s.sword}`, 3000);
    this.lastWarn = s.swordWarn;
    this.pickups(s);
    this.hud = s;
    const q = s.lingering === null ? s.quests[0] : undefined;
    setHud({
      hp: s.hp, maxHp: s.maxHp, extra: s.extra, zatruty: !!s.zatruty, expShare: s.expShare, potions: s.potions, fruit: s.fruit,
      noHeal: s.potions <= 0 && s.fruit < LECZENIE_OWOCAMI.owocow,
      town: s.town, weather: s.pogoda ?? '', detail: s.detail,
      quest: q ? { text: q.text, color: q.color, more: s.quests.length - 1 } : null,
      coins: s.coins, diamonds: session.diamenty,
      bron: this.weaponWindow(),
    });
    this.goalText.setText(s.lingering !== null ? `⏳ Bezbronny na ulicy jeszcze ${s.lingering} s…` : '');
    s.quests.forEach((q, i) => this.arrows[i]?.setTexture(arrowTexture(this, q.color)));
    this.layout();
    if (s.dead && !this.overlay) this.showGameOver();
  }

  /**
   * The HUD's weapon window (owner, 6 Oct 2026): the weapon in hand; a sword shows its rough wear (when weapons wear on
   * this difficulty, or a glass one), a bow/crossbow/gun the shots left, a wand "∞" (magic has no charges yet).
   */
  private weaponWindow() {
    const id = gear.equip.bron ?? 'kijek';
    const it = item(id);
    const name = it?.nazwa ?? 'Kijek';
    const pic = itemPictureUrl(id);
    const k = ammoOf(it);
    if (k) {
      const n = gear.ammo[k];
      return { pic, label: String(n), warn: n < STRZALY.malo || isBroken(id), title: `${name}: ${n} ${AMUNICJA[k].wielu}` };
    }
    if (it?.rodzaj === 'magia') return { pic, label: '∞', warn: false, title: `${name}: czary bez ograniczeń` };
    const c = condition(id);
    if (c && (session.level.zuzycie || it?.szklany)) {
      if (c.left <= 0) return { pic, label: '0%', warn: true, title: `${name}: zepsuty – napraw w sklepie` };
      if (it?.szklany) return { pic, label: `${c.left}`, warn: c.left <= 5, title: `${name}: jeszcze ${c.left} ciosów` };
      const pct = Math.max(1, Math.round((100 * c.left) / c.max));
      return { pic, label: `${pct}%`, warn: pct <= 15, title: `${name}: stan ok. ${pct}%` };
    }
    return { pic, label: '', warn: false, title: name };
  }

  /** The hero's head and shoulders (standing, facing us) in the HUD's avatar frame. */
  private heroAvatar() {
    const hd = heroPortrait();
    const tex = hd && this.textures.exists(hd.key) ? this.textures.get(hd.key) : null;
    const fr = tex?.has('down-1') ? tex.get('down-1') : null;
    if (!tex || !fr) return setHudAvatar(null);
    setHudAvatar(tex.getSourceImage() as CanvasImageSource, fr.cutX + 14, fr.cutY + 5, 36, 36);
  }

  /** "+1 marchewka", "+12 złota" by the HUD when something new is in the backpack or the purse. */
  private pickups(s: HudState) {
    const busy = !!document.getElementById('chest') || !!document.getElementById('character') || !!this.hasDialog;
    if (this.lastGoods && !busy) {
      for (const [f, n] of Object.entries(s.goods) as [Owoc, number][]) {
        const d = n - (this.lastGoods[f] ?? 0);
        if (d <= 0) continue;
        const o = OWOCE[f];
        const name = d === 1 ? o.nazwa : d % 10 >= 2 && d % 10 <= 4 && (d % 100 < 12 || d % 100 > 14) ? o.mnoga : o.wielu;
        hudPickup(`+${d} ${name}`, goodsPicture(f) ?? this.iconOf(GOODS_TEX[f]));
      }
    }
    if (this.lastCoins !== null && s.coins > this.lastCoins) hudPickup(`+${s.coins - this.lastCoins} złota`, `${import.meta.env.BASE_URL}hud/zloto_16.png`);
    this.lastGoods = { ...s.goods };
    this.lastCoins = s.coins;
  }

  private icons = new Map<string, string>();
  /** A game texture as a small picture for the HTML notes (cached). */
  private iconOf(key: string | undefined) {
    if (!key || !this.textures.exists(key)) return undefined;
    let url = this.icons.get(key);
    if (!url) {
      try {
        url = this.textures.getBase64(key);
      } catch {
        return undefined;
      }
      this.icons.set(key, url);
    }
    return url;
  }

  /** The camera button: a picture of the game to send to friends (the "Pochwal się" card). */
  private takePhoto() {
    const game = this.scene.get('game') as GameScene;
    if (!game.player || this.overlay || this.hasDialog) return;
    game.scene.pause();
    void showPhoto(this.game, session.name).then(() => {
      game.scene.resume();
      resetTouch();
    });
  }

  private createTouchControls() {
    // Phones/tablets show the controls right away; touch laptops once touched.
    this.touch = window.matchMedia('(pointer: coarse)').matches || touchInput.used;
    this.joyBase = this.add.circle(0, 0, JOY_RADIUS, 0xffffff, 0.12).setStrokeStyle(3, 0xffffff, 0.35);
    this.joyKnob = this.add.circle(0, 0, JOY_RADIUS * 0.45, 0xffffff, 0.35);
    // Four arrows on the rim, so it reads as a joystick.
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 0.55);
    const a = JOY_RADIUS * 0.78;
    const w = 9;
    for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
      const tx = dx * a;
      const ty = dy * a;
      // Tip pointing out, base towards the centre.
      g.fillTriangle(tx + dx * w, ty + dy * w, tx - dy * w - dx * 2, ty + dx * w - dy * 2, tx + dy * w - dx * 2, ty - dx * w - dy * 2);
    }
    this.joyArrows = g; // (a Graphics moved directly: inside a Container it stayed put)
    this.hintAt = 0;
    // Half size: a tap on the joystick attacks too (one hand), the button is for two hands.
    this.attackBtn = this.add.circle(0, 0, 19, 0xe43b44, 0.45).setStrokeStyle(2, 0xffffff, 0.5);
    this.attackLabel = this.add
      .text(0, 0, '⚔', { fontFamily: 'sans-serif', fontSize: '17px', color: '#ffffff' })
      .setOrigin(0.5);
    for (const o of [this.joyBase, this.joyKnob, this.joyArrows]) o.setVisible(this.touch);
    // The attack button is gone (a tap on the joystick or a second finger swings).
    this.attackBtn.setVisible(false);
    this.attackLabel.setVisible(false);
    this.lowWarned = false;
    if (!this.textures.exists('lowhp-vignette')) {
      const t = this.textures.createCanvas('lowhp-vignette', 256, 256)!;
      const ctx = t.getContext();
      const g = ctx.createRadialGradient(128, 128, 70, 128, 128, 182);
      g.addColorStop(0, 'rgba(200,0,20,0)');
      g.addColorStop(1, 'rgba(200,0,20,0.9)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 256, 256);
      t.refresh();
    }
    this.vignette = this.add.image(0, 0, 'lowhp-vignette').setDepth(-1).setVisible(false);
  }

  private joyLearned = false;
  /** Blinks the joystick at the start and after a while without moving – until the player has used it once. */
  private joyHint() {
    const now = this.time.now;
    // A thumb held still on the joystick (or a key held down) is walking too: no touchmove comes, but it isn't idle.
    const k = keyboardDir();
    if (touchInput.joyActive || touchInput.x || touchInput.y || k.x || k.y) activity.last = performance.now();
    // Once the player has walked with it, it never blinks again (bug report 24: it kept blinking in the corner while fighting).
    if (touchInput.joyActive) this.joyLearned = true;
    if (this.joyLearned || now < this.hintAt) return;
    const idle = performance.now() - activity.last;
    if (this.hintAt !== 0 && idle < 9000) return;
    this.hintAt = now + 9000;
    this.hintUntil = now + 1700;
    this.tweens.add({ targets: [this.joyBase, this.joyArrows], alpha: { from: 1, to: 0.25 }, scale: { from: 1, to: 1.12 }, duration: 260, yoyo: true, repeat: 2 });
  }

  private vignette!: Phaser.GameObjects.Image;
  private lowWarned = false;

  /** Low life: the screen edges pulse red (and a hint, once per time). */
  private lowLife(time: number) {
    const s = this.hud;
    // From half life down (owner, 5 Oct 2026): the red edge is what tells the player he's hurt.
    const low = !!s && !s.dead && !this.hasDialog && s.hp * 2 <= s.maxHp;
    const { width, height } = this.view;
    this.vignette.setDisplaySize(width, height).setPosition(width / 2, height / 2).setVisible(low);
    if (low) {
      // Stronger and faster the less life is left.
      const k = 1 - s!.hp / (s!.maxHp / 2);
      this.vignette.setAlpha(0.3 + 0.25 * k + (0.25 + 0.2 * k) * Math.abs(Math.sin(time / (320 - 120 * k))));
    }
    if (low && !this.lowWarned) {
      this.lowWarned = true;
      this.toast(s!.potions > 0 || s!.heal ? '❤ Mało życia! Dotknij okrągłego przycisku w prawym dolnym rogu, żeby się uleczyć – albo uciekaj!' : '❤ Mało życia! Uciekaj od potworów!', 3500);
    } else if (!low) this.lowWarned = false;
  }

  update(time: number) {
    setHudVehicles(hasTestVehicle('rower'), hasTestVehicle('hulajnoga'), testVehicle);
    this.lowLife(time);
    // The HTML HUD steps aside for dialogs and the game-over screen (they sit where it is).
    showHud(this.overlay ? 'off' : this.hasDialog ? 'dim' : 'on');
    this.updateArrow();
    this.updateTouch();
    this.unstick(time);
  }

  private pausedAlone = 0;

  /**
   * A safety net: the game stays paused only while a dialog or a window
   * (prompt, chest) is open. If it is paused with nothing on screen for over
   * 1.5 s, something lost its way back: resume, and report it.
   */
  private unstick(time: number) {
    const game = this.scene.get('game');
    const waiting = this.hasDialog || !!this.overlay || !!document.getElementById('prompt') || !!document.getElementById('chest') || isCharacterOpen();
    if (!game.scene.isPaused() || waiting) {
      this.pausedAlone = 0;
      return;
    }
    if (!this.pausedAlone) this.pausedAlone = time;
    else if (time - this.pausedAlone > 1500) {
      this.pausedAlone = 0;
      report('stuck', 'Gra wstrzymana bez okienka – wznowiona');
      game.scene.resume();
    }
  }

  /** Points at the mission goal: over it when visible, at the screen edge when not. */
  /** Arrows to the quests: over the goal when on screen, at the screen edge when not. */
  private updateArrow() {
    const game = this.scene.get('game') as GameScene;
    const quests = this.hud?.quests ?? [];
    this.arrows.forEach((arrow, i) => {
      const pos = quests[i]?.pos;
      if (!pos || !game.player || this.hasDialog) {
        arrow.setVisible(false);
        return;
      }
      const cam = game.cameras.main;
      const sx = ((pos.x - cam.worldView.x) * cam.zoom) / OSTROSC;
      const sy = ((pos.y - cam.worldView.y) * cam.zoom) / OSTROSC;
      const { width, height } = this.view;
      const m = 40;
      arrow.setVisible(true);
      if (sx > m && sx < width - m && sy > 90 && sy < height - 130) {
        const bob = Math.sin(this.time.now / 150 + i) * 4;
        arrow.setPosition(sx, sy - 24 * this.ui / 2 - 10 + bob).setRotation(Math.PI / 2);
        return;
      }
      // Off screen: on a ring around the hero (owner, 6 Oct 2026: at the screen edge they hid under the HUD).
      const cx = ((game.player.x - cam.worldView.x) * cam.zoom) / OSTROSC;
      const cy = ((game.player.y - 10 - cam.worldView.y) * cam.zoom) / OSTROSC;
      const ang = Math.atan2(sy - cy, sx - cx);
      const t = Math.max(60, Math.min(width, height) * STRZALKI_ZADAN.promien);
      arrow.setPosition(cx + Math.cos(ang) * t, cy + Math.sin(ang) * t).setRotation(ang);
    });
  }

  private toast(text: string, ms = 3000) {
    this.toastText.setText(text).setAlpha(1);
    this.tweens.killTweensOf(this.toastText);
    this.tweens.add({ targets: this.toastText, alpha: 0, delay: ms, duration: 600 });
  }

  // ---------------------------------------------------------------- dialogs

  private showDialog(d: DialogRequest) {
    if (TEST && d.shop) {
      if (this.shop) { this.dialogChoose = d.onChoose; this.shop.update(d); return; }
      this.closeDialog();
      resetTouch();
      this.dialogChoose = d.onChoose;
      this.shop = showShop(d, i => this.chooseShop(i));
      return;
    }
    this.closeDialog();
    const { width, height } = this.view;
    const w = Math.min(width - 24, 620);
    const x = (width - w) / 2;
    // A book-like readable font (owner 7.10.2026: the monospace dialogs were „zbyt nieczytelne”).
    const title = this.add.text(x + 16, 0, d.title, { fontFamily: DIALOG_FONT, fontSize: '23px', fontStyle: 'bold', color: '#f7c531', wordWrap: { width: w - 32 } });
    const body = this.add.text(x + 16, 0, d.text, { fontFamily: DIALOG_FONT, fontSize: '19px', color: '#f6eedb', wordWrap: { width: w - 32 }, lineSpacing: 5 });
    const btnH = 44;
    // Up to two buttons side by side; longer lists (a shop) one under another.
    const stacked = d.buttons.length > 2;
    const rows = stacked ? d.buttons.length : 1;
    const btnsH = rows * btnH + (rows - 1) * 8;
    const tabH = d.tabs ? 38 : 0;
    const h = 16 + title.height + 10 + (tabH ? tabH + 10 : 0) + body.height + 18 + btnsH + 16;
    const y = Math.max(12, height - h - (this.touch ? 150 : 40));
    title.setY(y + 16);
    body.setY(title.y + title.height + 10 + (tabH ? tabH + 10 : 0));

    const panel = this.add.rectangle(x, y, w, h, 0x1e1a24, 0.94).setOrigin(0).setStrokeStyle(3, 0xf7c531);
    const items: Phaser.GameObjects.GameObject[] = [panel, title, body];
    this.dialogButtons = [];
    // Tabs (shop: buy / sell): the active one filled, the others only outlined; a tap gives onChoose(-1 - tab).
    if (d.tabs) {
      const n = d.tabs.labels.length;
      const tw = (w - 32 - (n - 1) * 10) / n;
      const ty = title.y + title.height + 10;
      d.tabs.labels.forEach((label, t) => {
        const c = d.tabs!.colors?.[t] ?? 0x2f6f9f;
        const on = t === d.tabs!.active;
        const rect = this.add.rectangle(x + 16 + t * (tw + 10), ty, tw, tabH, on ? c : 0x2a2632).setOrigin(0).setStrokeStyle(on ? 3 : 2, on ? 0xffffff : c, on ? 0.9 : 1);
        const text = this.add.text(rect.x + tw / 2, ty + tabH / 2, label, { fontFamily: DIALOG_FONT, fontSize: '18px', color: on ? '#ffffff' : '#c8c8d0', fontStyle: on ? 'bold' : '' }).setOrigin(0.5);
        items.push(rect, text);
        if (!on) this.dialogButtons.push({ rect, index: -1 - t });
      });
    }
    const bw = stacked ? w - 32 : (w - 32 - (d.buttons.length - 1) * 12) / d.buttons.length;
    const last = d.buttons.length - 1;
    d.buttons.forEach((label, i) => {
      const bx = stacked ? x + 16 : x + 16 + i * (bw + 12);
      const by = stacked ? y + h - 16 - btnsH + i * (btnH + 8) : y + h - 16 - btnH;
      const color = stacked ? (i === last ? 0x4a4a55 : 0x2f6f9f) : i === 0 ? 0x3fa34d : 0x4a4a55;
      const rect = this.add.rectangle(bx, by, bw, btnH, color).setOrigin(0).setStrokeStyle(2, 0xffffff, 0.6);
      // A picture on the left (an item on sale), 2× its 16 px, crisp.
      const key = d.icons?.[i];
      const pic = key && this.textures.exists(key) ? this.add.image(bx + 8 + 16, by + btnH / 2, key).setDisplaySize(32, 32) : null;
      const pad = pic ? 40 : 0;
      const text = this.add
        .text(bx + pad + (bw - pad) / 2, by + btnH / 2, label, { fontFamily: DIALOG_FONT, fontSize: stacked ? '17px' : '19px', fontStyle: 'bold', color: '#ffffff', align: 'center', wordWrap: { width: bw - 12 - pad } })
        .setOrigin(0.5);
      items.push(rect, text);
      if (pic) items.push(pic);
      this.dialogButtons.push({ rect, index: i });
    });
    this.dialogBox = this.add.container(0, 0, items).setDepth(20);
    this.dialogChoose = d.onChoose;
    this.dialogOpenedAt = this.time.now;
  }

  private dialogOpenedAt = 0;

  private onDialogTap(x: number, y: number) {
    if (this.shop) return;
    if (!this.hasDialog && !this.overlay && onMenuButton(x, y)) {
      this.openGameMenu();
      return;
    }
    if (!this.hasDialog || this.time.now - this.dialogOpenedAt < 250) return;
    // Tabs have negative indexes (-1 - tab), so "nothing hit" is null.
    let choice: number | null = null;
    const real = this.dialogButtons.filter((b) => b.index >= 0);
    // Keyboard: Space/Enter picks the first button, or "Wyjdź" in a long list.
    if (x < 0) choice = real.length > 2 ? real.length - 1 : 0;
    for (const b of this.dialogButtons) if (b.rect.getBounds().contains(x, y)) choice = b.index;
    if (choice === null) return;
    const choose = this.dialogChoose;
    this.closeDialog();
    choose?.(choice);
  }

  /** The Kufer (ui/character.ts): the world stands still while it is open (owner, 5 Oct 2026). */
  private openCharacter(page?: 'eq' | 'gold' | 'quests') {
    const game = this.scene.get('game') as GameScene;
    if (!game.player || this.overlay || this.hasDialog) return;
    touchInput.attack = false;
    if (isCharacterOpen()) return closeCharacter();
    if (isMinimapOpen()) closeMinimap();
    this.sleepWorld();
    toggleCharacter({
      page,
      goodsIcon: (f) => goodsPicture(f) ?? (f in GOODS_TEX ? this.iconOf(GOODS_TEX[f as Owoc]) : undefined),
      onClose: () => {
        this.wakeWorld();
        game.gearChanged();
      },
      hp: game.player.hp, maxHp: PLAYER.maxHp, onChange: () => game.gearChanged(), eat: () => game.eatFruit(),
      quests: () => game.questLog(), toggleArrow: (id) => game.toggleArrow(id),
      tent: { ...game.tentSpot(), pitch: () => game.pitchTent() },
    });
  }

  private openMap() {
    const game = this.scene.get('game') as GameScene;
    if (!game.player || this.overlay || isCharacterOpen()) return;
    touchInput.attack = false; // the tap on the button isn't a sword swing
    if (isMinimapOpen()) return closeMinimap();
    this.sleepWorld();
    toggleMinimap(game, () => this.wakeWorld());
  }

  /**
   * The map screen and the trunk cover the game: the whole game loop sleeps meanwhile (no updates,
   * no drawing – the game drawing on behind them made the map screen crawl on phones, owner 5 Oct 2026).
   */
  private sleepWorld() {
    resetTouch();
    if (this.game.loop.running) this.game.loop.sleep();
  }

  private wakeWorld() {
    resetTouch();
    if (!this.game.loop.running) this.game.loop.wake();
  }

  /** Top-left menu: leave the game properly. */
  private openGameMenu() {
    const game = this.scene.get('game') as GameScene;
    if (this.hasDialog || this.overlay || !game.player || game.player.isDead) return;
    this.showDialog({
      title: 'Menu',
      text: `Wyjście zapisuje zakończenie sesji. Następnym razem zaczniesz w punkcie startowym.\n\nPostęp od ostatniego zapisu (wejście do budynku, koniec misji) przepadnie.\n\nGra: ${wersjaNapis()}`,
      buttons: ['Wyjdź', 'Mój kod postaci', '🐞 Znalazłem buga', `📳 Trzęsienie ekranu: ${trzesienieWlaczone() ? 'wł.' : 'wył.'}`, `⛰ Efekt gór: ${efektGorWlaczony() ? 'wł.' : 'wył.'}`, ...(TEST ? ['🐉 Smok (test)'] : []), 'Graj dalej'],
      onChoose: (i) => {
        if (i === 3) {
          ustawTrzesienie(!trzesienieWlaczone());
          this.toast(trzesienieWlaczone() ? '📳 Trzęsienie ekranu włączone' : 'Trzęsienie ekranu wyłączone – zamiast niego błysk', 2000);
          return;
        }
        if (i === 4) {
          ustawEfektGor(!efektGorWlaczony());
          this.toast(efektGorWlaczony() ? '⛰ Efekt gór włączony' : '⛰ Efekt gór wyłączony – bez rozmycia i mgły w dole', 2000);
          return;
        }
        if (i === 5 && TEST) {
          // Test server only: call a dragon of any kind next to the hero (all its attacks), for checks and tuning.
          const ids = Object.keys(GATUNKI_SMOKOW) as GatunekId[];
          this.showDialog({
            title: '🐉 Przywołaj smoka',
            text: 'Smok stanie obok i zaatakuje, gdy podejdziesz.',
            buttons: [...ids.map((g) => GATUNKI_SMOKOW[g].nazwa), 'Anuluj'],
            onChoose: (k) => {
              if (k < ids.length) (window as unknown as { __smok?: (g: GatunekId) => void }).__smok?.(ids[k]);
            },
          });
          return;
        }
        if (i === 1) showCodeOverlay(session.name, session.idik);
        if (i === 2) {
          game.scene.pause();
          // The picture first (the menu is already gone from it), then the window.
          gameShotJpeg(this.game).then((shot) => askBug(game.bugContext(), shot)).then((sent) => {
            game.scene.resume();
            if (sent) this.toast('Dzięki! Zgłoszenie wysłane – przejrzymy je rano.');
          });
        }
        if (i !== 0) return;
        if (game.inCombat()) {
          this.toast('Nie możesz wyjść w trakcie walki!');
          return;
        }
        game.leave();
      },
    });
  }

  private chooseShop(index: number) {
    const shop = this.shop;
    if (!shop) return;
    const revision = shop.revision;
    this.dialogChoose?.(index);
    // Stock refresh updates the same window. A quest/service may replace it with a dialog.
    if (this.shop === shop && shop.revision === revision) this.closeDialog();
    resetTouch();
  }

  private closeDialog() {
    this.shop?.destroy();
    this.shop = undefined;
    this.dialogBox?.destroy();
    this.dialogBox = undefined;
    this.dialogButtons = [];
    this.dialogChoose = undefined;
  }

  // The touch state lives in controls.ts; here we only draw it.
  private updateTouch() {
    if (!this.touch) {
      if (!touchInput.used) return;
      this.touch = true;
      for (const o of [this.joyBase, this.joyKnob, this.joyArrows]) o.setVisible(true);
    }
    this.joyHint();
    const t = touchInput;
    // The joystick shows only while a thumb holds it (and as a blinking hint).
    const hinting = this.time.now < this.hintUntil;
    for (const o of [this.joyBase, this.joyKnob, this.joyArrows]) o.setVisible(t.joyActive || hinting);
    if (t.joyActive) {
      this.joyBase.setPosition(t.joyOriginX, t.joyOriginY);
      this.joyArrows.setPosition(t.joyOriginX, t.joyOriginY);
      this.joyKnob.setPosition(t.joyX, t.joyY);
    } else {
      this.joyBase.setPosition(this.joyHome.x, this.joyHome.y);
      this.joyArrows.setPosition(this.joyHome.x, this.joyHome.y);
      this.joyKnob.setPosition(this.joyHome.x, this.joyHome.y);
    }
    this.attackBtn.setFillStyle(0xe43b44, t.attackHeld ? 0.8 : 0.45);
  }

  private showGameOver() {
    const { width, height } = this.view;
    const s = this.hud;
    const bg = this.add.rectangle(0, 0, width, height, 0x000000, 0.7).setOrigin(0);
    const title = this.add
      .text(width / 2, 0, 'Zginąłeś!', { fontFamily: 'monospace', fontSize: '42px', color: '#e43b44', stroke: '#000', strokeThickness: 6 })
      .setOrigin(0.5, 0);
    const info = this.add
      .text(width / 2, 0, `Śmierć jest ostateczna.\nTwoje imię trafia na Tablicę Pamięci.\n\nZdobyte doświadczenie: ${s?.exp ?? 0} EXP\n\nPierwsze wskrzeszenie jest za darmo, każde kolejne kosztuje ${WSKRZESZENIE.diamentow} 💎.`, {
        fontFamily: 'monospace', fontSize: '17px', color: '#ffffff', align: 'center', wordWrap: { width: width - 40 }, lineSpacing: 4,
      })
      .setOrigin(0.5, 0);
    const sub = this.add
      .text(width / 2, 0, 'Dotknij ekranu, kliknij lub naciśnij spację', { fontFamily: 'monospace', fontSize: '15px', color: '#bbbbbb', align: 'center', wordWrap: { width: width - 40 } })
      .setOrigin(0.5, 0);
    // Stack the three texts in the middle of the screen.
    const gap = 24;
    let y = (height - (title.height + info.height + sub.height + 2 * gap)) / 2;
    for (const t of [title, info, sub]) {
      t.setY(y);
      y += t.height + gap;
    }
    this.overlay = this.add.container(0, 0, [bg, title, info, sub]).setAlpha(0).setDepth(30);
    this.tweens.add({ targets: this.overlay, alpha: 1, duration: 600 });

    let done = false;
    let offTap = () => {};
    const toMenu = () => {
      if (done) return;
      done = true;
      offTap();
      resetTouch();
      const game = this.scene.get('game') as GameScene;
      game.deathSaved.then(() => game.backToMenu({ name: session.name, code: session.idik }));
    };
    this.time.delayedCall(1200, () => {
      offTap = onTap(toMenu);
      this.events.once('shutdown', offTap);
    });
  }
}
