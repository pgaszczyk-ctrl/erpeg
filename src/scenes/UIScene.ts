import Phaser from 'phaser';
import { report } from '../errlog';
import { TEX, PLAYER_TEX, arrowTexture } from '../art';
import { expNaPoziom } from '../content/historia';
import { touchInput, resetTouch, onTap, JOY_RADIUS, joyHome, attackHome, activity } from '../controls';
import type { HudState, DialogRequest, GameScene } from './GameScene';
import { toggleMinimap, closeMinimap } from '../ui/minimap';
import { PLAYER } from '../objects/Player';
import { toggleCharacter, closeCharacter } from '../ui/character';
import { showCodeOverlay } from '../ui/codeCard';
import { session } from '../quests';

// HUD (hearts, coins, street, mission goal + arrow), mission dialogs,
// on-screen touch controls and the game-over screen.
// Runs on top of GameScene with its own unzoomed camera.
export class UIScene extends Phaser.Scene {
  private hearts: Phaser.GameObjects.Image[] = [];
  private duelHearts: Phaser.GameObjects.Image[] = [];
  private coinText!: Phaser.GameObjects.Text;
  private coinIcon!: Phaser.GameObjects.Image;
  private expText!: Phaser.GameObjects.Text;
  private titleText!: Phaser.GameObjects.Text;
  private menuBtn!: Phaser.GameObjects.Text;
  private mapBtn!: Phaser.GameObjects.Text;
  /** The hero's portrait (top right); tapping it opens the character sheet. */
  private charBtn!: Phaser.GameObjects.Image;
  private portraitBox!: Phaser.GameObjects.Graphics;
  private stars: Phaser.GameObjects.Image[] = [];
  private lastLevel = 0;
  private swordText!: Phaser.GameObjects.Text;
  /** Fruit in the backpack: the game's own fruit pictures (emoji plums are missing on some phones). */
  private fruitIcons: Phaser.GameObjects.Image[] = [];
  private fruitTexts: Phaser.GameObjects.Text[] = [];
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

  private streetText!: Phaser.GameObjects.Text;
  private skillBar!: Phaser.GameObjects.Container;
  private skillFill!: Phaser.GameObjects.Rectangle;
  private skillLabel!: Phaser.GameObjects.Text;
  private skillHide?: Phaser.Time.TimerEvent;
  private goalText!: Phaser.GameObjects.Text;
  /** One line and one arrow per active quest (up to 3), in its colour. */
  private questTexts: Phaser.GameObjects.Text[] = [];
  private arrows: Phaser.GameObjects.Image[] = [];
  private toastText!: Phaser.GameObjects.Text;
  private hud?: HudState;
  private dialogBox?: Phaser.GameObjects.Container;
  private dialogButtons: { rect: Phaser.GameObjects.Rectangle; index: number }[] = [];
  private dialogChoose?: (i: number) => void;

  constructor() {
    super('ui');
  }

  create() {
    this.hearts = [];
    this.duelHearts = [];
    // The scene object is reused when it starts again (after a coach ride):
    // drop the old, destroyed objects.
    this.fruitIcons = [];
    this.fruitTexts = [];
    this.dialogButtons = [];
    this.overlay = undefined;
    this.ui = Math.max(2, Math.round(Math.min(this.scale.width, this.scale.height) / 220));

    this.coinIcon = this.add.image(0, 0, TEX.coin).setScale(this.ui).setOrigin(1, 0);
    this.coinText = this.add
      .text(0, 0, '0', { fontFamily: 'monospace', fontSize: `${8 * this.ui}px`, color: '#fff2a8', stroke: '#1e1a24', strokeThickness: this.ui * 2 })
      .setOrigin(1, 0);
    this.expText = this.add
      .text(0, 0, '', { fontFamily: 'monospace', fontSize: `${6 * this.ui}px`, color: '#bfe6ff', stroke: '#1e1a24', strokeThickness: this.ui * 2 })
      .setOrigin(1, 0);
    this.titleText = this.add
      .text(0, 0, '', { fontFamily: 'monospace', fontSize: `${6 * this.ui}px`, color: '#ffd27a', stroke: '#1e1a24', strokeThickness: this.ui * 2 })
      .setOrigin(1, 0);
    this.menuBtn = this.add
      .text(0, 0, '☰', { fontFamily: 'sans-serif', fontSize: `${12 * this.ui}px`, color: '#ffffff', stroke: '#1e1a24', strokeThickness: this.ui * 2 })
      .setOrigin(0, 0);

    // Portrait: head and shoulders of the player's own hero, in a small frame.
    // (a Graphics frame: a stroked Rectangle drew as a triangle here)
    const fw = 18 * this.ui, fh = 15 * this.ui;
    this.portraitBox = this.add.graphics();
    this.portraitBox.fillStyle(0x1e1a24, 0.75).fillRect(-fw, 0, fw, fh).lineStyle(this.ui, 0xf7c531, 1).strokeRect(-fw, 0, fw, fh);
    this.charBtn = this.add.image(0, 0, this.textures.exists(PLAYER_TEX) ? PLAYER_TEX : TEX.hero, 'down-0').setOrigin(0.5, 0).setScale(this.ui).setCrop(0, 0, 16, 13);
    this.stars = [];
    for (let i = 0; i < 5; i++) this.stars.push(this.add.image(0, 0, TEX.starEmpty).setOrigin(0).setScale(this.ui));
    this.lastLevel = 0;
    this.swordText = this.add
      .text(0, 0, '', { fontFamily: 'monospace', fontSize: `${5 * this.ui}px`, color: '#e8e8f0', stroke: '#1e1a24', strokeThickness: this.ui * 2 })
      .setOrigin(0, 0);
    for (const tex of [TEX.fruitApple, TEX.fruitPlum, TEX.fruitGrape]) {
      this.fruitIcons.push(this.add.image(0, 0, tex).setScale(this.ui).setOrigin(0.5, 0.5));
      this.fruitTexts.push(
        this.add.text(0, 0, '0', { fontFamily: 'monospace', fontSize: `${5 * this.ui}px`, color: '#e8e8f0', stroke: '#1e1a24', strokeThickness: this.ui * 2 }).setOrigin(0, 0.5),
      );
    }
    this.mapBtn = this.add
      .text(0, 0, '🗺', { fontFamily: 'sans-serif', fontSize: `${11 * this.ui}px` })
      .setOrigin(1, 0);

    const label = (size: number, color = '#ffffff') =>
      this.add.text(0, 0, '', { fontFamily: 'monospace', fontSize: `${size}px`, color, stroke: '#1e1a24', strokeThickness: 4, align: 'center' });
    this.streetText = label(13).setOrigin(0.5, 0);
    this.goalText = label(14, '#fff2a8').setOrigin(0.5, 0);
    this.questTexts = [0, 1, 2].map(() => label(13, '#ffffff').setOrigin(0.5, 0));
    this.arrows = [0, 1, 2].map(() => this.add.image(0, 0, TEX.arrow).setScale(this.ui).setVisible(false));
    this.toastText = label(18, '#ffffff').setOrigin(0.5).setAlpha(0).setDepth(10);
    // Skill progress while training (shown for a moment after each practice hit).
    // Just an icon and a soft bar, no numbers.
    const bw = 70 * this.ui;
    const bh = 4 * this.ui;
    this.skillLabel = this.add.text(-bw / 2 - 4, bh / 2, '⚔', { fontFamily: 'sans-serif', fontSize: `${8 * this.ui}px`, color: '#ffffff', stroke: '#1e1a24', strokeThickness: 3 }).setOrigin(1, 0.5);
    const back = this.add.rectangle(0, 0, bw, bh, 0x1e1a24, 0.55).setOrigin(0.5, 0);
    this.skillFill = this.add.rectangle(-bw / 2, 0, bw, bh, 0xf7c531, 0.9).setOrigin(0, 0);
    // The bar is soft (blurred), the icon stays sharp.
    const bar = this.add.container(0, 0, [back, this.skillFill]);
    try {
      bar.enableFilters();
      bar.filters?.internal.addBlur(0, 1, 1, 0.8);
    } catch {
      // No filters (e.g. canvas renderer): a sharp bar is fine too.
    }
    this.skillBar = this.add.container(0, 0, [bar, this.skillLabel]).setAlpha(0).setDepth(5);
    this.dialogBox = undefined;

    this.createTouchControls();
    this.layout();
    this.scale.on('resize', this.layout, this);

    const onHud = (s: HudState) => this.updateHud(s);
    this.game.events.on('hud', onHud);
    const onDialog = (d: DialogRequest) => this.showDialog(d);
    const onToast = (t: string, ms?: number) => this.toast(t, ms);
    this.game.events.on('dialog', onDialog);
    this.game.events.on('toast', onToast);
    const onPractice = (p: { skill: string; into: number; need: number; max: boolean }) => this.showPractice(p);
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
          const last = this.dialogButtons.length - 1;
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
      window.removeEventListener('keydown', onKey);
      closeMinimap();
      closeCharacter();
      this.scale.off('resize', this.layout, this);
      resetTouch();
    });

    if (!window.matchMedia('(pointer: coarse)').matches) {
      const hint = this.add
        .text(this.scale.width / 2, this.scale.height - 12, 'WASD / strzałki – ruch    SPACJA lub klik – miecz', {
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
    const { width, height } = this.scale;
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
    this.stars.forEach((st, i) => this.tweens.add({ targets: st, scale: this.ui * 1.4, yoyo: true, duration: 180, delay: i * 80 }));
  }

  /** "Walka wręcz – poziom 2" with a bar filling up to the next level. */
  private showPractice(p: { skill: string; into: number; need: number; max: boolean }) {
    this.skillLabel.setText(p.skill === 'luk' ? '🏹' : p.skill === 'magia' ? '✨' : '⚔');
    const full = 70 * this.ui;
    this.skillFill.setSize(Math.max(1, full * (p.max ? 1 : p.into / p.need)), this.skillFill.height);
    this.tweens.killTweensOf(this.skillBar);
    this.skillBar.setAlpha(1);
    this.skillHide?.remove();
    this.skillHide = this.time.delayedCall(2500, () => this.tweens.add({ targets: this.skillBar, alpha: 0, duration: 500 }));
  }

  private layout() {
    const { width, height } = this.scale;
    const pad = 4 * this.ui;
    this.menuBtn.setPosition(pad, pad - 2 * this.ui);
    const u = this.ui;
    const hx = pad + this.menuBtn.width + 3 * u;
    // Right column: portrait, hearts under it, then 5 experience stars.
    const right = width - pad;
    this.portraitBox.setPosition(right, pad);
    this.charBtn.setPosition(right - 9 * u, pad + u);
    const hy = pad + 17 * u;
    const n = this.hearts.length;
    this.hearts.forEach((h, i) => h.setPosition(right - (n - i) * 10 * u + u, hy));
    const sy = hy + 10 * u;
    this.stars.forEach((st, i) => st.setPosition(right - (5 - i) * 11 * u + u, sy));
    this.expText.setPosition(right, sy + 12 * u);
    this.titleText.setPosition(right, sy + 12 * u + this.expText.height + u);
    // Coins and the map button to the left of the portrait.
    const lx = right - 18 * u - 4 * u;
    this.coinText.setPosition(lx, pad - u);
    this.coinIcon.setPosition(lx - this.coinText.width - 2 * u, pad);
    this.mapBtn.setPosition(this.coinIcon.x - 10 * u - 4 * u, pad - u);
    // Left: menu, weapon (or the purple duel hearts), fruit.
    this.duelHearts.forEach((h, i) => h.setPosition(hx + i * 10 * u, pad + 2 * u));
    this.swordText.setPosition(hx, pad + 2 * u);
    const fy = pad + 2 * u + this.swordText.height + 5 * u;
    let fx = hx + 2 * this.ui;
    this.fruitIcons.forEach((ic, i) => {
      ic.setPosition(fx, fy);
      const t = this.fruitTexts[i];
      t.setPosition(fx + 5 * this.ui, fy);
      fx += 5 * this.ui + t.width + 5 * this.ui;
    });
    const wrap = Math.min(width - 40, 520);
    // Street and goal under both corners.
    const ty = Math.max(fy + 8 * u, this.titleText.text ? this.titleText.y + this.titleText.height : sy + 12 * u + this.expText.height) + 2 * u;
    this.goalText.setWordWrapWidth(wrap).setPosition(width / 2, ty + 18);
    let qy = ty + 18 + (this.goalText.text ? this.goalText.height + 2 : 0);
    for (const t of this.questTexts) {
      t.setWordWrapWidth(wrap).setPosition(width / 2, qy);
      if (t.text) qy += t.height + 1;
    }
    this.streetText.setPosition(width / 2, ty);
    this.toastText.setWordWrapWidth(wrap).setPosition(width / 2, height * 0.3);
    this.skillBar.setPosition(width / 2, height * 0.66);

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
  }

  private updateHud(s: HudState) {
    while (this.hearts.length < s.maxHp / 2) {
      this.hearts.push(this.add.image(0, 0, TEX.heart).setOrigin(0).setScale(this.ui));
    }
    while (this.hearts.length > s.maxHp / 2) this.hearts.pop()!.destroy();
    // The hero's picture is redrawn (a new texture) when worn gear changes.
    if (this.textures.exists(PLAYER_TEX)) this.charBtn.setTexture(PLAYER_TEX, 'down-0').setCrop(0, 0, 16, 13);
    // Experience towards the next level as 5 stars, filled by halves (like hearts).
    const from = expNaPoziom(s.level);
    const to = expNaPoziom(s.level + 1);
    const halves = Math.floor(Math.max(0, Math.min(0.999, (s.exp - from) / (to - from))) * 10);
    this.stars.forEach((st, i) => st.setTexture(halves >= i * 2 + 2 ? TEX.star : halves === i * 2 + 1 ? TEX.starHalf : TEX.starEmpty));
    if (this.lastLevel && s.level > this.lastLevel) this.levelUp(s.level);
    this.lastLevel = s.level;
    this.hearts.forEach((h, i) => {
      const filled = s.hp - i * 2; // 2 hp per heart
      h.setTexture(filled > 0 ? TEX.heart : TEX.heartEmpty);
      h.setAlpha(filled === 1 ? 0.55 : 1); // half heart
    });
    while (this.duelHearts.length < s.duelMax / 2) {
      this.duelHearts.push(this.add.image(0, 0, TEX.heartDuel).setOrigin(0).setScale(this.ui).setVisible(false));
      this.layout();
    }
    this.duelHearts.forEach((h, i) => {
      const filled = (s.duel ?? 0) - i * 2;
      h.setVisible(s.duel !== null).setTexture(filled > 0 ? TEX.heartDuel : TEX.heartDuelEmpty).setAlpha(filled === 1 ? 0.55 : 1);
    });
    this.swordText.setVisible(s.duel === null);
    this.coinText.setText(String(s.coins));
    this.expText.setText(`poz. ${s.level} · ${s.exp}/${to} EXP`);
    this.titleText.setText(s.title ? `🏅 ${s.title}` : '');
    this.swordText.setText(`⚔ ${s.sword}`);
    s.fruitN?.forEach((n, i) => this.fruitTexts[i]?.setText(String(n)));
    this.hud = s;
    this.streetText.setText(s.street ?? '');
    this.goalText.setText(s.lingering !== null ? `⏳ Bezbronny na ulicy jeszcze ${s.lingering} s…` : '');
    this.questTexts.forEach((t, i) => {
      const q = s.lingering === null ? s.quests[i] : undefined;
      t.setText(q ? `${q.main ? '⭐' : '🎯'} ${q.text}` : '').setColor(q ? q.color : '#ffffff');
      if (q) this.arrows[i].setTexture(arrowTexture(this, q.color));
    });
    this.layout();
    if (s.dead && !this.overlay) this.showGameOver();
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
    for (const o of [this.joyBase, this.joyKnob, this.joyArrows, this.attackBtn, this.attackLabel]) o.setVisible(this.touch);
  }

  /** Blinks the joystick at the start and after a while without moving. */
  private joyHint() {
    const now = this.time.now;
    if (now < this.hintAt) return;
    const idle = performance.now() - activity.last;
    if (this.hintAt !== 0 && idle < 9000) return;
    this.hintAt = now + 9000;
    this.hintUntil = now + 1700;
    this.tweens.add({ targets: [this.joyBase, this.joyArrows], alpha: { from: 1, to: 0.25 }, scale: { from: 1, to: 1.12 }, duration: 260, yoyo: true, repeat: 2 });
  }

  update(time: number) {
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
      const sx = (pos.x - cam.worldView.x) * cam.zoom;
      const sy = (pos.y - cam.worldView.y) * cam.zoom;
      const { width, height } = this.scale;
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
    const { width, height } = this.scale;
    const w = Math.min(width - 24, 560);
    const x = (width - w) / 2;
    const title = this.add.text(x + 16, 0, d.title, { fontFamily: 'monospace', fontSize: '20px', color: '#f7c531', wordWrap: { width: w - 32 } });
    const body = this.add.text(x + 16, 0, d.text, { fontFamily: 'monospace', fontSize: '16px', color: '#ffffff', wordWrap: { width: w - 32 }, lineSpacing: 4 });
    const btnH = 44;
    // Up to two buttons side by side; longer lists (a shop) one under another.
    const stacked = d.buttons.length > 2;
    const rows = stacked ? d.buttons.length : 1;
    const btnsH = rows * btnH + (rows - 1) * 8;
    const h = 16 + title.height + 10 + body.height + 18 + btnsH + 16;
    const y = Math.max(12, height - h - (this.touch ? 150 : 40));
    title.setY(y + 16);
    body.setY(title.y + title.height + 10);

    const panel = this.add.rectangle(x, y, w, h, 0x1e1a24, 0.94).setOrigin(0).setStrokeStyle(3, 0xf7c531);
    const items: Phaser.GameObjects.GameObject[] = [panel, title, body];
    this.dialogButtons = [];
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
    const cb = this.charBtn.getBounds();
    if (!this.dialogBox && !this.overlay && x >= cb.x - 8 && x <= cb.right + 6 && y >= cb.y - 12 && y <= cb.bottom + 12) {
      this.openCharacter();
      return;
    }
    const mb = this.mapBtn.getBounds();
    if (!this.dialogBox && !this.overlay && x >= mb.x - 12 && x <= mb.right + 12 && y >= mb.y - 12 && y <= mb.bottom + 12) {
      this.openMap();
      return;
    }
    if (!this.dialogBox || this.time.now - this.dialogOpenedAt < 250) return;
    let choice = -1;
    // Keyboard: Space/Enter picks the first button, or "Wyjdź" in a long list.
    if (x < 0) choice = this.dialogButtons.length > 2 ? this.dialogButtons.length - 1 : 0;
    for (const b of this.dialogButtons) if (b.rect.getBounds().contains(x, y)) choice = b.index;
    if (choice < 0) return;
    const choose = this.dialogChoose;
    this.closeDialog();
    choose?.(choice);
  }

  private openCharacter() {
    const game = this.scene.get('game') as GameScene;
    if (!game.player || this.overlay) return;
    touchInput.attack = false;
    toggleCharacter(game.player.hp, PLAYER.maxHp, () => game.gearChanged(), () => game.eatFruit(), game.activeQuests());
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
      buttons: ['Wyjdź', 'Mój kod postaci', 'Graj dalej'],
      onChoose: (i) => {
        if (i === 1) showCodeOverlay(session.name, session.idik);
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
      for (const o of [this.joyBase, this.joyKnob, this.joyArrows, this.attackBtn, this.attackLabel]) o.setVisible(true);
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
    const { width, height } = this.scale;
    const s = this.hud;
    const bg = this.add.rectangle(0, 0, width, height, 0x000000, 0.7).setOrigin(0);
    const title = this.add
      .text(width / 2, 0, 'Zginąłeś!', { fontFamily: 'monospace', fontSize: '42px', color: '#e43b44', stroke: '#000', strokeThickness: 6 })
      .setOrigin(0.5, 0);
    const info = this.add
      .text(width / 2, 0, `Śmierć jest ostateczna.\nTwoje imię trafia na Tablicę Pamięci.\n\nZdobyte doświadczenie: ${s?.exp ?? 0} EXP\n\nPierwsze wskrzeszenie jest za darmo.`, {
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
