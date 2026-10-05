import Phaser from 'phaser';
import { WSKRZESZENIE } from '../content/sklepy';
import { askBug } from '../ui/bug';
import { gameShotJpeg } from '../ui/snapshot';
import { showBrag } from '../ui/brag';
import { report } from '../errlog';
import { TEX, GOODS_TEX, arrowTexture } from '../art';
import { OWOCE, type Owoc } from '../content/sklepy';
import { mountHud, unmountHud, setHud, showHud, hudPickup } from '../ui/hud';
import { poziomPostaci } from '../content/historia';
import { touchInput, resetTouch, onTap, JOY_RADIUS, joyHome, attackHome, healHome, activity, keyboardDir } from '../controls';
import type { HudState, DialogRequest, GameScene } from './GameScene';
import { toggleMinimap, closeMinimap } from '../ui/minimap';
import { PLAYER } from '../objects/Player';
import { toggleCharacter, closeCharacter } from '../ui/character';
import { showCodeOverlay } from '../ui/codeCard';
import { OSTROSC } from '../screen';
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
      character: () => this.openCharacter(),
      gold: () => this.openCharacter('eq'),
      quests: () => this.openCharacter('quests'),
      map: () => this.openMap(),
      camera: () => this.takePhoto(),
    });
    this.layout();
    this.scale.on('resize', this.layout, this);

    const onHud = (s: HudState) => this.updateHud(s);
    this.game.events.on('hud', onHud);
    const onDialog = (d: DialogRequest) => this.showDialog(d);
    const onToast = (t: string, ms?: number) => this.toast(t, ms);
    this.game.events.on('dialog', onDialog);
    this.game.events.on('toast', onToast);
    const onPractice = (p: { skill: string; into: number; need: number; max: boolean; gain?: number }) => this.showPractice(p);
    this.game.events.on('practice', onPractice);
    const offTap = onTap((x, y) => this.onDialogTap(x, y));
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'm' || e.key === 'M') && !document.getElementById('menu') && !this.dialogBox) {
        this.openMap();
      }
      if ((e.key === 'c' || e.key === 'C' || e.key === 'i' || e.key === 'I') && !document.getElementById('menu') && !this.dialogBox) {
        this.openCharacter();
      }
      if (e.key === 'Escape' && !document.getElementById('menu')) {
        if (this.dialogBox) {
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
      hp: s.hp, maxHp: s.maxHp, extra: s.extra, expShare: s.expShare, potions: s.potions, fruit: s.fruit,
      noHeal: s.potions <= 0 && !s.heal && s.hp < s.maxHp,
      town: s.town, weather: s.pogoda ?? '', detail: s.detail,
      quest: q ? { text: q.text, color: q.color, more: s.quests.length - 1 } : null,
    });
    this.goalText.setText(s.lingering !== null ? `⏳ Bezbronny na ulicy jeszcze ${s.lingering} s…` : '');
    s.quests.forEach((q, i) => this.arrows[i]?.setTexture(arrowTexture(this, q.color)));
    this.layout();
    if (s.dead && !this.overlay) this.showGameOver();
  }

  /** "+1 marchewka", "+12 złota" by the HUD when something new is in the backpack or the purse. */
  private pickups(s: HudState) {
    const busy = !!document.getElementById('chest') || !!document.getElementById('character') || !!this.dialogBox;
    if (this.lastGoods && !busy) {
      for (const [f, n] of Object.entries(s.goods) as [Owoc, number][]) {
        const d = n - (this.lastGoods[f] ?? 0);
        if (d <= 0) continue;
        const o = OWOCE[f];
        const name = d === 1 ? o.nazwa : d % 10 >= 2 && d % 10 <= 4 && (d % 100 < 12 || d % 100 > 14) ? o.mnoga : o.wielu;
        hudPickup(`+${d} ${name}`, this.iconOf(GOODS_TEX[f]));
      }
    }
    if (this.lastCoins !== null && s.coins > this.lastCoins) hudPickup(`+${s.coins - this.lastCoins} złota`, this.iconOf(TEX.coin));
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
    if (!game.player || this.overlay || this.dialogBox) return;
    game.scene.pause();
    const lvl = poziomPostaci(session.exp);
    const title = session.story.title ?? `Poziom ${lvl}`;
    void showBrag(this.game, session.name, { top: session.story.title ? 'Mój tytuł' : 'Osiągnąłem', title, sub: `poziom ${lvl} · ${session.exp} EXP` }).then(() => {
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
    const low = !!s && !s.dead && !this.dialogBox && s.hp * 3 <= s.maxHp;
    const { width, height } = this.view;
    this.vignette.setDisplaySize(width, height).setPosition(width / 2, height / 2).setVisible(low);
    if (low) this.vignette.setAlpha(0.45 + 0.4 * Math.abs(Math.sin(time / 260)));
    if (low && !this.lowWarned) {
      this.lowWarned = true;
      this.toast(s!.potions > 0 || s!.heal ? '❤ Mało życia! Dotknij okrągłego przycisku w prawym dolnym rogu, żeby się uleczyć – albo uciekaj!' : '❤ Mało życia! Uciekaj od potworów!', 3500);
    } else if (!low) this.lowWarned = false;
  }

  update(time: number) {
    this.lowLife(time);
    // The HTML HUD steps aside for dialogs and the game-over screen (they sit where it is).
    showHud(!this.dialogBox && !this.overlay);
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
    const waiting = !!this.dialogBox || !!this.overlay || !!document.getElementById('prompt') || !!document.getElementById('chest');
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
      if (!pos || !game.player || this.dialogBox) {
        arrow.setVisible(false);
        return;
      }
      const cam = game.cameras.main;
      const sx = ((pos.x - cam.worldView.x) * cam.zoom) / OSTROSC;
      const sy = ((pos.y - cam.worldView.y) * cam.zoom) / OSTROSC;
      const { width, height } = this.view;
      const m = 40;
      arrow.setVisible(true);
      if (sx > m && sx < width - m && sy > m && sy < height - m) {
        const bob = Math.sin(this.time.now / 150 + i) * 4;
        arrow.setPosition(sx, sy - 24 * this.ui / 2 - 10 + bob).setRotation(Math.PI / 2);
        return;
      }
      const cx = width / 2;
      const cy = height / 2;
      const ang = Math.atan2(sy - cy, sx - cx);
      const t = Math.min((width / 2 - m) / Math.abs(Math.cos(ang) || 1e-6), (height / 2 - m) / Math.abs(Math.sin(ang) || 1e-6));
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
    this.closeDialog();
    const { width, height } = this.view;
    const w = Math.min(width - 24, 560);
    const x = (width - w) / 2;
    const title = this.add.text(x + 16, 0, d.title, { fontFamily: 'monospace', fontSize: '20px', color: '#f7c531', wordWrap: { width: w - 32 } });
    const body = this.add.text(x + 16, 0, d.text, { fontFamily: 'monospace', fontSize: '16px', color: '#ffffff', wordWrap: { width: w - 32 }, lineSpacing: 4 });
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
        const text = this.add.text(rect.x + tw / 2, ty + tabH / 2, label, { fontFamily: 'monospace', fontSize: '16px', color: on ? '#ffffff' : '#c8c8d0', fontStyle: on ? 'bold' : '' }).setOrigin(0.5);
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
      const pic = key && this.textures.exists(key) ? this.add.image(bx + 8 + 16, by + btnH / 2, key).setScale(2) : null;
      const pad = pic ? 40 : 0;
      const text = this.add
        .text(bx + pad + (bw - pad) / 2, by + btnH / 2, label, { fontFamily: 'monospace', fontSize: stacked ? '15px' : '17px', color: '#ffffff', align: 'center', wordWrap: { width: bw - 12 - pad } })
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
    if (!this.dialogBox && !this.overlay && x >= 0 && x < 60 && y < 60) {
      this.openGameMenu();
      return;
    }
    if (!this.dialogBox || this.time.now - this.dialogOpenedAt < 250) return;
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

  private openCharacter(page?: 'eq' | 'quests') {
    const game = this.scene.get('game') as GameScene;
    if (!game.player || this.overlay || this.dialogBox) return;
    touchInput.attack = false;
    toggleCharacter({
      page,
      hp: game.player.hp, maxHp: PLAYER.maxHp, onChange: () => game.gearChanged(), eat: () => game.eatFruit(),
      quests: () => game.questLog(), toggleArrow: (id) => game.toggleArrow(id),
      brag: () => this.takePhoto(),
      tent: { ...game.tentSpot(), pitch: () => game.pitchTent() },
    });
  }

  private openMap() {
    const game = this.scene.get('game') as GameScene;
    if (!game.player || this.overlay) return;
    touchInput.attack = false; // the tap on the button isn't a sword swing
    toggleMinimap(game);
  }

  /** Top-left menu: leave the game properly. */
  private openGameMenu() {
    const game = this.scene.get('game') as GameScene;
    if (this.dialogBox || this.overlay || !game.player || game.player.isDead) return;
    this.showDialog({
      title: 'Menu',
      text: 'Wyjście zapisuje zakończenie sesji. Następnym razem zaczniesz w punkcie startowym.\n\nPostęp od ostatniego zapisu (wejście do budynku, koniec misji) przepadnie.',
      buttons: ['Wyjdź', 'Mój kod postaci', '🐞 Znalazłem buga', 'Graj dalej'],
      onChoose: (i) => {
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

  private closeDialog() {
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
