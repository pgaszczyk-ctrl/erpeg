import { showShop, type ShopHandle } from '../ui/shop';
import { trzesienieWlaczone, ustawTrzesienie, efektGorWlaczony, ustawEfektGor } from '../ustawieniaGracza';
import { GATUNKI_SMOKOW, type GatunekId } from '../content/smoki';
import Phaser from 'phaser';
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
import { mountHud, unmountHud, setHud, showHud, hudPickup, setHudAvatar, setHudPortrait, hudZoom, setHudVehicles, teleskop } from '../ui/hud';
import { hasTestVehicle, testVehicle, setTestVehicle } from '../testTransport';
import { heroPortrait } from '../sprites';
import { PORTRETY_POSTACI } from '../content/portrety';
import { MIESZKANCY_HD, STALE_HD } from '../content/wyglad';
/** Sheet id (`hd-<id>`) → its file name, so a portrait may be named after either. */
const WYGLAD_PLIK: Record<string, string> = Object.fromEntries(
  [...MIESZKANCY_HD, ...Object.values(STALE_HD)].map((p) => [p.id, p.plik]),
);
import { live } from '../walka/live';
import { ODSTEP_OD_KRAWEDZI } from '../ui/hudLive';
import { zainstaluj, jakoAplikacja } from '../instalacja';
import { touchInput, resetTouch, cancelPress, onTap, typingInField, onMenuButton, JOY_RADIUS, joyHome, attackHome, healHome, dialogRail } from '../controls';
import type { HudState, DialogRequest, GameScene, Rozmowca } from './GameScene';
import { toggleMinimap, closeMinimap, isMinimapOpen } from '../ui/minimap';
import { PLAYER } from '../objects/Player';
import { toggleCharacter, closeCharacter, isCharacterOpen } from '../ui/character';
import { showCodeOverlay } from '../ui/codeCard';
import { OSTROSC, przyblizenie } from '../screen';
import { loadingMapVisible, loadingGame } from '../ui/loadingMap';

/** Font of the dialogs (index.html loads it from Google Fonts; BootScene waits for it). */
export const DIALOG_FONT = '"Alegreya Sans", "Trebuchet MS", sans-serif';
import { session } from '../quests';
import { offline } from '../api';
import { modulGracza, modulPortret, modulKlucz, PORTRET_PX } from '../ui/modulPostac';

/** The telescopic HUD's first menu line: the character sheet. */

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
  private dialogButtons: { rect: Phaser.GameObjects.Rectangle; index: number; scrollable: boolean }[] = [];
  private dialogChoose?: (i: number) => void;
  // A dialog too tall for the screen (openGameMenu, long quest/riddle text…): its text + buttons scroll below
  // the fixed title, with a brass rail on the right (owner, 26 Oct 2026 – it didn't fit and couldn't be moved
  // in landscape). Drag the rail, tap it, or use the mouse wheel; see controls.dialogRail. Phaser 4's
  // GeometryMask only clips under the Canvas renderer, not this game's WebGL one, so instead of masking
  // pixels, content is split into rows (one per line/button, `scrollRows`) and a row scrolled past the
  // window is hidden whole rather than sliced – see `redrawScrollVisibility`.
  private dialogScroll?: Phaser.GameObjects.Container;
  private scrollRows: ScrollRow[] = [];
  // The row cut by the window's bottom edge peeks out (owner, 27 Oct 2026: „utnij fragment guzika, żeby
  // zasugerować, że coś jest niżej”): its top part is drawn here and its text cropped.
  private peekG?: Phaser.GameObjects.Graphics;
  private dialogRailG?: Phaser.GameObjects.Graphics;
  private scrollY = 0;
  private scrollMax = 0;
  private railGeom?: { x: number; y0: number; w: number; viewportH: number; contentH: number };

  constructor() {
    super('ui');
  }

  /** The screen in CSS pixels (the canvas has OSTROSC times more, see screen.ts). */
  private get view() {
    return { width: this.scale.width / OSTROSC, height: this.scale.height / OSTROSC };
  }

  create() {
    this.scene.setVisible(!loadingGame());
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
    this.dialogScroll = undefined;
    this.scrollRows = [];
    this.peekG = undefined;
    this.dialogRailG = undefined;
    this.scrollY = 0;
    this.scrollMax = 0;
    this.railGeom = undefined;
    dialogRail.hit = null;
    dialogRail.set = null;
    dialogRail.wheel = null;
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
    this.arrows = [0, 1, 2, 3].map(() => this.add.image(0, 0, TEX.arrow).setScale(this.ui).setVisible(false));
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
      vehicle: (vehicle) => setTestVehicle(testVehicle === vehicle ? 'pieszo' : vehicle),
      menu: () => this.openGameMenu(),
      brakPojazdu: () => this.toast('🚲 Nie masz pojazdu. Rower i hulajnogę kupisz w sklepie sportowym.', 3000),
    });
    // The telescopic HUD's portrait takes the ☰ corner; its first button opens the same menu.
    this.menuBtn.setVisible(!teleskop());
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
      if (loadingGame()) return;
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
    // Live mode (fixed joystick): further in from the screen's edge, where the thumb rests (owner, 26 Oct 2026).
    this.joyHome.set(pad + r + (live() ? 16 + ODSTEP_OD_KRAWEDZI : 16), height - pad - r - (live() ? 30 : 16));
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
      fruitPerHeal: s.fruitPerHeal,
      noHeal: s.potions <= 0 && s.fruit < s.fruitPerHeal && !s.heal,
      preparedFood: s.heal && s.heal.icon !== '🧪' && s.heal.icon !== '🍎' ? s.heal : undefined,
      town: s.town, weather: s.pogoda ?? '', detail: s.detail,
      quest: q ? { text: q.text, color: q.color, more: s.quests.length - 1 } : null,
      coins: s.coins, diamonds: session.diamenty,
      bron: this.weaponWindow(),
      poziom: s.level,
    });
    this.goalText.setText(s.lingering !== null ? `⏳ Bezbronny na ulicy jeszcze ${s.lingering} s…` : '');
    // One arrow per quest (no limit since 13 Oct 2026): more are made when needed.
    while (this.arrows.length < s.quests.length) this.arrows.push(this.add.image(0, 0, TEX.arrow).setScale(this.ui).setVisible(false));
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
    // A modular hero (owner, 20 Oct 2026): the portrait is its head; older characters keep their hero's.
    if (session.look.modul) {
      const ml = modulGracza(session.look, session.name);
      void modulPortret(ml).then((c) => {
        if (modulKlucz(modulGracza(session.look, session.name)) !== modulKlucz(ml)) return;
        setHudPortrait(c.toDataURL());
        setHudAvatar(c, 0, 0, PORTRET_PX, PORTRET_PX);
      });
      return;
    }
    const hd = heroPortrait();
    const tex = hd && this.textures.exists(hd.key) ? this.textures.get(hd.key) : null;
    const fr = tex?.has('down-1') ? tex.get('down-1') : null;
    // The 25 heroes' painted portraits (public/portrety/bohater_NN.webp, also used in dialogs).
    const m = hd && /lista([a-y])$/.exec(hd.key);
    setHudPortrait(m ? `${import.meta.env.BASE_URL || '/'}portrety/bohater_${String(m[1].charCodeAt(0) - 96).padStart(2, '0')}.webp` : null);
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
      this.toast(live() ? '❤ Mało życia! Wyjdź z czerwonej mgły – tam życie wraca – albo naciśnij zielony przycisk Lecz (H).' : s!.potions > 0 || s!.heal ? (teleskop() ? '❤ Mało życia! Uciekaj od potworów!' : '❤ Mało życia! Dotknij okrągłego przycisku u dołu ekranu, żeby się uleczyć – albo uciekaj!') : '❤ Mało życia! Uciekaj od potworów!', 3500);
    } else if (!low) this.lowWarned = false;
  }

  update(time: number) {
    setHudVehicles(hasTestVehicle('rower'), hasTestVehicle('hulajnoga'), testVehicle);
    this.lowLife(time);
    // The HTML HUD steps aside for dialogs and the game-over screen (they sit where it is).
    showHud(this.overlay || this.hasDialog ? 'off' : 'on');
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
    const waiting = this.scene.isActive('arena') || loadingMapVisible() || this.hasDialog || !!this.overlay || !!document.getElementById('prompt') || !!document.getElementById('chest') || !!document.getElementById('gazeta') || isCharacterOpen();
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
      if (!pos || !game.player || this.hasDialog || this.scene.isActive('arena')) {
        arrow.setVisible(false);
        return;
      }
      const cam = game.cameras.main;
      const sx = ((pos.x - cam.worldView.x) * cam.zoomX) / OSTROSC;
      const sy = ((pos.y - cam.worldView.y) * cam.zoomY) / OSTROSC;
      const { width, height } = this.view;
      const m = 40;
      arrow.setVisible(true);
      if (sx > m && sx < width - m && sy > 90 && sy < height - 130) {
        const bob = Math.sin(this.time.now / 150 + i) * 4;
        arrow.setPosition(sx, sy - 24 * this.ui / 2 - 10 + bob).setRotation(Math.PI / 2);
        return;
      }
      // Off screen: on a ring around the hero (owner, 6 Oct 2026: at the screen edge they hid under the HUD).
      const cx = ((game.player.x - cam.worldView.x) * cam.zoomX) / OSTROSC;
      const cy = ((game.player.y - 10 - cam.worldView.y) * cam.zoomY) / OSTROSC;
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

  /** A brass frame with a portrait (or a placeholder silhouette while the artist's portrait is missing). */
  private medalion(mx: number, my: number, P: number, key: string | null): Phaser.GameObjects.GameObject[] {
    const g = this.add.graphics();
    g.fillStyle(0x2a2016, 1).fillRoundedRect(mx, my, P, P, 8);
    g.lineStyle(3, 0xd8a84a, 1).strokeRoundedRect(mx, my, P, P, 8);
    g.lineStyle(1, 0x6d4a1e, 1).strokeRoundedRect(mx + 4, my + 4, P - 8, P - 8, 5);
    const out: Phaser.GameObjects.GameObject[] = [g];
    if (key && this.textures.exists(key)) out.push(this.add.image(mx + P / 2, my + P / 2, key).setDisplaySize(P - 10, P - 10));
    else {
      // Placeholder: a head-and-shoulders silhouette.
      g.fillStyle(0x6d5a3e, 1).fillCircle(mx + P / 2, my + P * 0.4, P * 0.17);
      g.fillRoundedRect(mx + P * 0.24, my + P * 0.6, P * 0.52, P * 0.3, { tl: P * 0.2, tr: P * 0.2, bl: 2, br: 2 });
    }
    return out;
  }

  private portretLaduje = new Set<string>();

  /** The hero's dialog portrait (public/portrety/bohater_NN.webp for the 25 heroes); loads it on first use. */
  private portretBohatera(gotowy?: () => void): string | null {
    if (session.look.modul) {
      const ml = modulGracza(session.look, session.name);
      const key = `portret-modul-${modulKlucz(ml)}`;
      if (this.textures.exists(key)) return key;
      if (!this.portretLaduje.has(key)) {
        this.portretLaduje.add(key);
        void modulPortret(ml).then((c) => {
          if (!this.textures.exists(key)) this.textures.addCanvas(key, c);
          gotowy?.();
        });
      }
      return null;
    }
    const hp = heroPortrait();
    const m = hp && /lista([a-y])$/.exec(hp.key);
    if (!m) return null;
    const n = m[1].charCodeAt(0) - 96;
    const key = `portret-bohater-${n}`;
    if (this.textures.exists(key)) return key;
    if (!this.portretLaduje.has(key)) {
      this.portretLaduje.add(key);
      this.load.image(key, `portrety/bohater_${String(n).padStart(2, '0')}.webp`);
      if (gotowy) this.load.once(`filecomplete-image-${key}`, gotowy);
      this.load.start();
    }
    return null;
  }

  /** The speaker's portrait: a picture (a place's sign) or the head of their walking sheet, enlarged crisp. */
  private portretRozmowcy(k: Rozmowca, gotowy?: () => void): string | null {
    if (k.obraz && this.textures.exists(k.obraz)) return k.obraz;
    // The artist's portrait for this sheet (content/portrety.ts), loaded on first use.
    const id = k.tex?.replace(/^hd-/, '').replace(/-s\d+$/, '').replace(/-red$/, '');
    const plik = id && PORTRETY_POSTACI.find((p) => p === id || p === WYGLAD_PLIK[id]);
    if (plik) {
      const key = `portret-${plik}`;
      if (this.textures.exists(key)) return key;
      if (!this.portretLaduje.has(key)) {
        this.portretLaduje.add(key);
        this.load.image(key, `portrety/${plik}.webp`);
        if (gotowy) this.load.once(`filecomplete-image-${key}`, gotowy);
        this.load.start();
      }
    }
    if (!k.tex || !this.textures.exists(k.tex)) return null;
    const key = `portret-${k.tex}`;
    if (this.textures.exists(key)) return key;
    const t = this.textures.get(k.tex);
    if (!t.has('down-1')) return null;
    const fr = t.get('down-1');
    const c = document.createElement('canvas');
    c.width = c.height = 72;
    const g = c.getContext('2d')!;
    g.imageSmoothingEnabled = false;
    g.drawImage(t.getSourceImage() as CanvasImageSource, fr.cutX + 14, fr.cutY + 5, 36, 36, 0, 0, 72, 72);
    this.textures.addCanvas(key, c)?.setFilter(Phaser.Textures.FilterMode.NEAREST);
    return key;
  }

  private showDialog(d: DialogRequest) {
    if (d.shop) {
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
    // Portraits (owner 12 Oct 2026; every server since 1.032): who speaks on the left, the hero on the right.
    const P = d.kto ? (this.touch ? 60 : 78) : 0;
    const side = P ? P + 10 : 0;
    // A book-like readable font (owner 7.10.2026: the monospace dialogs were „zbyt nieczytelne”).
    const title = this.add.text(x + 16 + side, 0, d.title, { fontFamily: DIALOG_FONT, fontSize: '23px', fontStyle: 'bold', color: '#f7c531', wordWrap: { width: w - 32 - 2 * side } });
    const btnH = 44;
    // Up to two buttons side by side; longer lists (a shop) one under another.
    const stacked = d.buttons.length > 2;
    const btnRows = stacked ? d.buttons.length : 1;
    const btnsH = btnRows * btnH + (btnRows - 1) * 8;
    const tabH = d.tabs ? 38 : 0;
    const headH = Math.max(title.height, P);
    // Body text, measured line by line (Phaser 4's GeometryMask doesn't clip under WebGL – see below, the
    // body/buttons scroll as whole rows instead, so each line is its own object rather than one big block).
    const measure = this.add.text(0, 0, d.text, { fontFamily: DIALOG_FONT, fontSize: '19px', wordWrap: { width: w - 32 }, lineSpacing: 5 });
    const wrappedLines = measure.getWrappedText(d.text);
    const bodyBlockH = measure.height;
    measure.destroy();
    const h = 16 + headH + 10 + (tabH ? tabH + 10 : 0) + bodyBlockH + 18 + btnsH + 16;
    const y = Math.max(12, height - h - (this.touch ? 150 : 40));
    title.setY(y + 16 + (headH - title.height) / 2);
    const ty = y + 16 + headH + 10;
    const y0 = ty + (tabH ? tabH + 10 : 0); // where the scrollable body/buttons begin

    // A dialog with more inside it than the screen has room for (the game menu with every toggle, a long
    // riddle…) gets a shorter panel and scrolls instead of running off the bottom (owner, 26 Oct 2026).
    const bottomMargin = this.touch ? 150 : 40;
    const maxH = Math.max(140, height - y - bottomMargin);
    const needsScroll = h > maxH + 0.5;
    let viewportH = Math.max(20, y + Math.min(h, maxH) - 16 - y0);
    if (needsScroll) {
      // Row tops as laid out below (text lines, a gap, buttons); when the window's edge falls between rows,
      // shorten it so the last row is cut through its middle – a sliced button says „there's more below”.
      const lineH0 = wrappedLines.length ? (bodyBlockH - (wrappedLines.length - 1) * 5) / wrappedLines.length : 0;
      const rows: { y: number; h: number }[] = [];
      let cy = y0;
      wrappedLines.forEach((_, i) => { rows.push({ y: cy, h: lineH0 }); cy += lineH0 + (i < wrappedLines.length - 1 ? 5 : 0); });
      cy += 18;
      if (stacked) d.buttons.forEach(() => { rows.push({ y: cy, h: btnH }); cy += btnH + 8; });
      else if (d.buttons.length) rows.push({ y: cy, h: btnH });
      const cut = y0 + viewportH + PEEK_PAD;
      const cutRow = rows.find((r) => r.y < cut - 8 && r.y + r.h > cut);
      if (!cutRow) {
        const last = [...rows].reverse().find((r) => r.y + r.h <= cut);
        if (last) viewportH = Math.max(20, last.y + last.h * 0.55 - PEEK_PAD - y0);
      }
    }
    const panelH = needsScroll ? y0 - y + viewportH + 16 : h;

    const panel = ramkaKomiks(this, x, y, w, panelH, 0x241a12, { alfa: 0.96, gruba: 3, cien: 6 });
    const items: Phaser.GameObjects.GameObject[] = [panel, title];
    if (P && d.kto) {
      const kto = d.kto;
      items.push(...this.medalion(x + 14, y + 14, P, this.portretRozmowcy(kto, () => {
        if (this.dialogBox && this.dialogChoose === d.onChoose) this.dialogBox.add(this.medalion(x + 14, y + 14, P, this.portretRozmowcy(kto)));
      })));
      const hero = this.portretBohatera(() => {
        // The hero's picture arrived while this window is open: put it in.
        if (this.dialogBox && this.dialogChoose === d.onChoose) this.dialogBox.add(this.medalion(x + w - 14 - P, y + 14, P, this.portretBohatera()));
      });
      items.push(...this.medalion(x + w - 14 - P, y + 14, P, hero));
    }
    this.dialogButtons = [];
    // Tabs (shop: buy / sell): the active one filled, the others only outlined; a tap gives onChoose(-1 - tab).
    // Tabs stay fixed under the title (never scroll – there are only ever a couple of them).
    if (d.tabs) {
      const n = d.tabs.labels.length;
      const tw = (w - 32 - (n - 1) * 10) / n;
      d.tabs.labels.forEach((label, t) => {
        const c = d.tabs!.colors?.[t] ?? 0x2f6f9f;
        const on = t === d.tabs!.active;
        const rect = this.add.rectangle(x + 16 + t * (tw + 10), ty, tw, tabH, 0, 0).setOrigin(0);
        const g = ramkaKomiks(this, rect.x, ty, tw, tabH, on ? c : 0x2c2118, { gruba: 2, cien: on ? 3 : 2 });
        const text = this.add.text(rect.x + tw / 2, ty + tabH / 2, label, { fontFamily: DIALOG_FONT, fontSize: '18px', color: on ? '#ffffff' : '#c8b896', fontStyle: on ? 'bold' : '' }).setOrigin(0.5);
        items.push(g, rect, text);
        if (!on) this.dialogButtons.push({ rect, index: -1 - t, scrollable: false });
      });
    }
    // Body text and every button scroll together below the (fixed) title/tabs, each line/button its own row
    // (see `redrawScrollVisibility`): a row scrolled past the window is hidden whole, never sliced in half.
    const scrollRows: ScrollRow[] = [];
    const scrollItems: Phaser.GameObjects.GameObject[] = [];
    let cursorY = y0;
    const lineH = wrappedLines.length ? (bodyBlockH - (wrappedLines.length - 1) * 5) / wrappedLines.length : 0;
    for (let i = 0; i < wrappedLines.length; i++) {
      const t = this.add.text(x + 16, cursorY, wrappedLines[i], { fontFamily: DIALOG_FONT, fontSize: '19px', color: '#f6eedb' });
      scrollRows.push({ y: cursorY, h: lineH, objs: [t], texts: [t] });
      scrollItems.push(t);
      cursorY += lineH;
      if (i < wrappedLines.length - 1) cursorY += 5; // between lines only; the body→buttons gap below is its own 18
    }
    cursorY += 18;
    const bw = stacked ? w - 32 : (w - 32 - (d.buttons.length - 1) * 12) / d.buttons.length;
    const last = d.buttons.length - 1;
    const sideBySide: (Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Visible)[] = [];
    const sideTexts: Phaser.GameObjects.Text[] = [];
    const sideBtns: NonNullable<ScrollRow['btns']> = [];
    d.buttons.forEach((label, i) => {
      const bx = stacked ? x + 16 : x + 16 + i * (bw + 12);
      const by = cursorY;
      // Brass for the main choices, verdigris-patinated metal for the way out (owner, 26 Oct 2026: no greens/blues).
      const cicho = d.odpowiedzi ? false : stacked ? i === last : i !== 0;
      const color = cicho ? 0x4f7f72 : 0xc9953f;
      const rect = this.add.rectangle(bx, by, bw, btnH, 0, 0).setOrigin(0);
      const g = ramkaKomiks(this, bx, by, bw, btnH, color, { gruba: 2, cien: 3 });
      // A picture on the left (an item on sale), 2× its 16 px, crisp.
      const key = d.icons?.[i];
      const pic = key && this.textures.exists(key) ? this.add.image(bx + 8 + 16, by + btnH / 2, key).setDisplaySize(32, 32) : null;
      const pad = pic ? 40 : 0;
      const text = this.add
        .text(bx + pad + (bw - pad) / 2, by + btnH / 2, label, { fontFamily: DIALOG_FONT, fontSize: stacked ? '17px' : '19px', fontStyle: 'bold', color: cicho ? '#e8f4ee' : '#2a1608', align: 'center', wordWrap: { width: bw - 12 - pad } })
        .setOrigin(0.5);
      const objs = pic ? [g, rect, text, pic] : [g, rect, text];
      scrollItems.push(...objs);
      this.dialogButtons.push({ rect, index: i, scrollable: true });
      const peek = { x: bx, w: bw, kolor: color };
      if (stacked) { scrollRows.push({ y: by, h: btnH, objs, texts: [text], btns: [peek] }); cursorY += btnH + 8; }
      else { sideBySide.push(...objs); sideTexts.push(text); sideBtns.push(peek); }
    });
    if (!stacked && d.buttons.length) { scrollRows.push({ y: cursorY, h: btnH, objs: sideBySide, texts: sideTexts, btns: sideBtns }); cursorY += btnH; }
    const contentH = cursorY - y0;

    this.peekG = this.add.graphics();
    items.push(this.peekG);
    const scrollBox = this.add.container(0, 0, scrollItems);
    items.push(scrollBox);
    this.dialogScroll = scrollBox;
    this.scrollRows = scrollRows;
    this.scrollY = 0;
    this.scrollMax = needsScroll ? Math.max(0, contentH - viewportH) : 0;
    this.railGeom = needsScroll ? { x, y0, w, viewportH, contentH } : undefined;
    this.redrawScrollVisibility();
    if (needsScroll) {
      this.dialogRailG = this.add.graphics();
      items.push(this.dialogRailG);
      const geom = this.railGeom!;
      dialogRail.hit = (px, py) => px >= geom.x + geom.w - 18 && px <= geom.x + geom.w - 2 && py >= geom.y0 - 10 && py <= geom.y0 + geom.viewportH + 10;
      dialogRail.set = (py) => {
        const knobH = Math.max(28, geom.viewportH * (geom.viewportH / geom.contentH));
        const frac = (py - geom.y0 - knobH / 2) / Math.max(1, geom.viewportH - knobH);
        this.setDialogScroll(Phaser.Math.Clamp(frac, 0, 1) * this.scrollMax);
      };
      dialogRail.wheel = (dy) => this.setDialogScroll(this.scrollY + dy);
      this.redrawDialogRail();
    }
    this.dialogBox = this.add.container(0, 0, items).setDepth(20);
    this.dialogChoose = d.onChoose;
    this.dialogOpenedAt = this.time.now;
  }

  /** Scrolls an overflowing dialog's body/buttons (0 = top); called from the brass rail and the mouse wheel. */
  private setDialogScroll(y: number) {
    if (!this.dialogScroll) return;
    this.scrollY = Phaser.Math.Clamp(y, 0, this.scrollMax);
    this.dialogScroll.y = -this.scrollY;
    this.redrawScrollVisibility();
    this.redrawDialogRail();
  }

  /**
   * Phaser 4's GeometryMask only works under the Canvas renderer, not WebGL (this game's renderer) – so instead
   * of clipping pixels, a scrolled row is hidden whole once it no longer fully fits the visible window, and
   * shown again once it does; a half-cut line/button never appears. Runs once at open and on every scroll.
   */
  private redrawScrollVisibility() {
    const r = this.railGeom;
    this.peekG?.clear();
    if (!r) { for (const row of this.scrollRows) for (const o of row.objs) o.setVisible(true); return; }
    const top = r.y0 - 0.5;
    const bottom = r.y0 + r.viewportH + 0.5;
    const cut = r.y0 + r.viewportH + PEEK_PAD;
    for (const row of this.scrollRows) {
      const onScreenTop = row.y - this.scrollY;
      const visible = onScreenTop >= top && onScreenTop + row.h <= bottom;
      for (const t of row.texts ?? []) t.setCrop();
      for (const o of row.objs) o.setVisible(visible);
      if (visible || onScreenTop < top || onScreenTop >= cut - 4) continue;
      // Cut by the bottom edge: only its top part shows (a button can't be tapped like this).
      for (const b of row.btns ?? []) this.drawPeek(b.x, onScreenTop, b.w, cut - onScreenTop, b.kolor);
      for (const t of row.texts ?? []) {
        const tTop = t.y - this.scrollY - t.displayHeight * t.originY;
        const vis = cut - tTop;
        if (vis <= 2) continue;
        t.setVisible(true);
        if (vis < t.displayHeight) t.setCrop(0, 0, t.width, vis * (t.height / t.displayHeight));
      }
    }
  }

  /** The top of a button sliced by the window's bottom edge: ink sides and top, its colour, no bottom edge. */
  private drawPeek(x: number, y: number, w: number, h: number, kolor: number) {
    const g = this.peekG;
    if (!g || h <= 0) return;
    const b = 2, ink = 0x1e1a24;
    const c = Phaser.Display.Color.IntegerToColor(kolor);
    const jasny = Phaser.Display.Color.GetColor(Math.min(255, c.red + 45), Math.min(255, c.green + 40), Math.min(255, c.blue + 30));
    const ciemny = Phaser.Display.Color.GetColor(c.red * 0.62, c.green * 0.62, c.blue * 0.62);
    g.fillStyle(0x000000, 0.45).fillRect(x + w, y + 3 + b, 3, h - 3 - b);
    g.fillStyle(ink, 1).fillRect(x + b, y, w - 2 * b, h).fillRect(x, y + b, w, h - b);
    g.fillStyle(kolor, 1).fillRect(x + b, y + b, w - 2 * b, h - b);
    g.fillStyle(jasny, 0.9).fillRect(x + b, y + b, w - 2 * b, 2).fillRect(x + b, y + b, 2, h - b);
    g.fillStyle(ciemny, 0.9).fillRect(x + w - b - 2, y + b, 2, h - b);
  }

  private redrawDialogRail() {
    const g = this.dialogRailG;
    const r = this.railGeom;
    if (!g || !r) return;
    g.clear();
    if (this.scrollMax <= 0) return;
    const trackX = r.x + r.w - 12;
    const trackW = 5;
    g.fillStyle(0x1e1a24, 0.8).fillRoundedRect(trackX, r.y0, trackW, r.viewportH, 2);
    const knobH = Math.max(28, r.viewportH * (r.viewportH / r.contentH));
    const knobY = r.y0 + (r.viewportH - knobH) * (this.scrollY / this.scrollMax);
    g.fillStyle(0xc9953f, 1).fillRoundedRect(trackX, knobY, trackW, knobH, 2);
    g.lineStyle(1, 0x1e1a24, 0.9).strokeRoundedRect(trackX, knobY, trackW, knobH, 2);
  }

  private dialogOpenedAt = 0;

  private onDialogTap(x: number, y: number) {
    if (loadingGame()) return;
    if (this.shop) return;
    if (!this.hasDialog && !this.overlay && !teleskop() && onMenuButton(x, y)) {
      this.openGameMenu();
      return;
    }
    if (!this.hasDialog) return;
    // Any press while a dialog is open belongs to the dialog, never to the weapon.
    cancelPress();
    if (this.time.now - this.dialogOpenedAt < 250) return;
    // Tabs have negative indexes (-1 - tab), so "nothing hit" is null.
    let choice: number | null = null;
    const real = this.dialogButtons.filter((b) => b.index >= 0);
    // Keyboard: Space/Enter picks the first button, or "Wyjdź" in a long list.
    if (x < 0) choice = real.length > 2 ? real.length - 1 : 0;
    for (const b of this.dialogButtons) {
      // A scrolled-away button isn't drawn (see redrawScrollVisibility) – a tap at its old screen spot doesn't pick it.
      if (b.scrollable && !b.rect.visible) continue;
      if (b.rect.getBounds().contains(x, y)) choice = b.index;
    }
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
      hp: game.player.hp, maxHp: PLAYER.maxHp, fruitPerHeal: game.fruitPerHeart(), onChange: () => game.gearChanged(), eat: () => game.eatFruit(),
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

  /**
   * Top-left menu: leave the game properly. Kept short (owner, 26 Oct 2026: with every toggle piled in here
   * it no longer fit a phone turned sideways) – the toggles live in a separate "⚙ Ustawienia" submenu, which
   * also means a long submenu list can scroll (see showDialog) instead of having to fit in one go.
   */
  private openGameMenu() {
    if (loadingGame()) return;
    const game = this.scene.get('game') as GameScene;
    if (this.hasDialog || this.overlay || !game.player || game.player.isDead) return;
    const guziki = ['Wyjdź', 'Mój kod postaci', '🐞 Znalazłem buga', '⚙ Ustawienia', 'Graj dalej'];
    this.showDialog({
      title: 'Menu',
      text: `Postęp od ostatniego zapisu (wejście do budynku, koniec misji) przepadnie.\n\nGra: ${wersjaNapis()}`,
      buttons: guziki,
      onChoose: (i) => {
        if (i === 1) { showCodeOverlay(session.name, session.idik); return; }
        if (i === 2) {
          game.scene.pause();
          // The picture first (the menu is already gone from it), then the window.
          gameShotJpeg(this.game).then((shot) => askBug(game.bugContext(), shot)).then((sent) => {
            game.scene.resume();
            if (sent) this.toast('Dzięki! Zgłoszenie wysłane – przejrzymy je rano.');
          });
          return;
        }
        if (i === 3) { this.openSettingsMenu(); return; }
        if (i !== 0) return; // "Graj dalej": nothing to do, the dialog already closed
        if (game.inCombat()) {
          this.toast('Nie możesz wyjść w trakcie walki!');
          return;
        }
        game.leave();
      },
    });
  }

  /** The menu's toggles and test tools, split out of the main menu so it stays short (see openGameMenu). */
  private openSettingsMenu() {
    const game = this.scene.get('game') as GameScene;
    // „📲 Zainstaluj grę” (an app icon on the phone/computer) – not when it already runs as the installed app.
    const INSTALUJ = '📲 Zainstaluj grę';
    const SMOK = '🐉 Smok (test)';
    const WSTECZ = '⬅ Wstecz';
    const guziki = [
      `📳 Trzęsienie ekranu: ${trzesienieWlaczone() ? 'wł.' : 'wył.'}`,
      `⛰ Efekt gór: ${efektGorWlaczony() ? 'wł.' : 'wył.'}`,
      `⚖ Poziom trudności: ${session.level.nazwa}`,
      ...(TEST ? [SMOK] : []),
      ...(jakoAplikacja() || offline.demo ? [] : [INSTALUJ]),
      WSTECZ,
    ];
    this.showDialog({
      title: '⚙ Ustawienia',
      text: '',
      buttons: guziki,
      onChoose: (k) => {
        const label = guziki[k];
        if (label === WSTECZ) { this.openGameMenu(); return; }
        if (label === INSTALUJ) {
          void zainstaluj().then((r) => {
            if (r.ok) this.toast('📲 Gra zainstalowana – szukaj ikony Exp-lore na pulpicie.', 3500);
            else if (r.jak) this.showDialog({ title: '📲 Gra jako aplikacja', text: r.jak, buttons: ['OK'], onChoose: () => {} });
          });
          return;
        }
        if (label === SMOK) {
          // Test server only: call a dragon of any kind next to the hero (all its attacks), for checks and tuning.
          const ids = Object.keys(GATUNKI_SMOKOW) as GatunekId[];
          this.showDialog({
            title: '🐉 Przywołaj smoka',
            text: 'Smok stanie obok i zaatakuje, gdy podejdziesz.',
            buttons: [...ids.map((g) => GATUNKI_SMOKOW[g].nazwa), 'Anuluj'],
            onChoose: (k2) => {
              if (k2 < ids.length) (window as unknown as { __smok?: (g: GatunekId) => void }).__smok?.(ids[k2]);
            },
          });
          return;
        }
        if (k === 0) {
          ustawTrzesienie(!trzesienieWlaczone());
          this.toast(trzesienieWlaczone() ? '📳 Trzęsienie ekranu włączone' : 'Trzęsienie ekranu wyłączone – zamiast niego błysk', 2000);
          return;
        }
        if (k === 1) {
          ustawEfektGor(!efektGorWlaczony());
          this.toast(efektGorWlaczony() ? '⛰ Efekt gór włączony' : '⛰ Efekt gór wyłączony – bez rozmycia i mgły w dole', 2000);
          return;
        }
        if (k === 2) {
          // Once a day (owner, 19 Oct 2026); the QR demo's dream has no real character yet.
          if (offline.demo) this.toast('Poziom wybierzesz po przebudzeniu.', 2500);
          else game.wyborTrudnosci(false);
        }
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
    this.dialogBox?.destroy(); // also destroys the scrollBox/rail graphics nested inside it
    this.dialogBox = undefined;
    this.dialogButtons = [];
    this.dialogChoose = undefined;
    this.dialogScroll = undefined;
    this.scrollRows = [];
    this.peekG = undefined;
    this.dialogRailG = undefined;
    this.scrollY = 0;
    this.scrollMax = 0;
    this.railGeom = undefined;
    dialogRail.hit = null;
    dialogRail.set = null;
    dialogRail.wheel = null;
  }

  // The touch state lives in controls.ts; here we only draw it.
  private updateTouch() {
    if (!this.touch) {
      if (!touchInput.used) return;
      this.touch = true;
      for (const o of [this.joyBase, this.joyKnob, this.joyArrows]) o.setVisible(true);
    }
    const t = touchInput;
    if (live()) {
      // New controls test: the joystick always stands bottom-left; the knob follows the thumb.
      for (const o of [this.joyBase, this.joyKnob, this.joyArrows]) o.setVisible(!this.hasDialog && !this.overlay);
      this.joyBase.setPosition(this.joyHome.x, this.joyHome.y).setAlpha(t.joyActive ? 1 : 0.75);
      this.joyArrows.setPosition(this.joyHome.x, this.joyHome.y);
      if (t.joyActive) this.joyKnob.setPosition(t.joyX, t.joyY);
      else this.joyKnob.setPosition(this.joyHome.x, this.joyHome.y);
      return;
    }
    // The joystick shows only while a thumb holds it. The blinking hint at its old corner is gone (owner, 12 Oct 2026:
    // it blinked under the HUD, also while walking; players find the joystick by themselves).
    for (const o of [this.joyBase, this.joyKnob, this.joyArrows]) o.setVisible(t.joyActive);
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
      .text(width / 2, 0, `Zdobyte doświadczenie: ${s?.exp ?? 0} EXP`, {
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

/**
 * A comic frame with a pixel touch (owner, 26 Oct 2026; the same look as the HTML windows' CSS in index.html): a
 * hard drop shadow, an ink outline whose corners step like pixel art, the fill, a light top/left edge and a dark
 * bottom/right edge. No rounded corners, no blur.
 */
/** Space between a scrolling dialog's window and its frame, through which a cut row still peeks. */
const PEEK_PAD = 12;

type ScrollRow = {
  y: number;
  h: number;
  objs: (Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Visible)[];
  texts?: Phaser.GameObjects.Text[];
  btns?: { x: number; w: number; kolor: number }[];
};

export function ramkaKomiks(scene: Phaser.Scene, x: number, y: number, w: number, h: number, kolor: number,
  o: { alfa?: number; gruba?: number; cien?: number } = {}) {
  const g = scene.add.graphics();
  const b = o.gruba ?? 2;
  const cien = o.cien ?? 3;
  const ink = 0x1e1a24;
  const c = Phaser.Display.Color.IntegerToColor(kolor);
  const jasny = Phaser.Display.Color.GetColor(Math.min(255, c.red + 45), Math.min(255, c.green + 40), Math.min(255, c.blue + 30));
  const ciemny = Phaser.Display.Color.GetColor(c.red * 0.62, c.green * 0.62, c.blue * 0.62);
  if (cien) g.fillStyle(0x000000, 0.45).fillRect(x + cien, y + cien + b, w, h - b).fillRect(x + cien + b, y + cien, w - 2 * b, h);
  g.fillStyle(ink, 1).fillRect(x, y + b, w, h - 2 * b).fillRect(x + b, y, w - 2 * b, h);
  g.fillStyle(kolor, o.alfa ?? 1).fillRect(x + b, y + b, w - 2 * b, h - 2 * b);
  const e = Math.max(2, b);
  g.fillStyle(jasny, (o.alfa ?? 1) * 0.9).fillRect(x + b, y + b, w - 2 * b, e).fillRect(x + b, y + b, e, h - 2 * b);
  g.fillStyle(ciemny, (o.alfa ?? 1) * 0.9).fillRect(x + b, y + h - b - e - 1, w - 2 * b, e + 1).fillRect(x + w - b - e, y + b, e, h - 2 * b);
  return g;
}
