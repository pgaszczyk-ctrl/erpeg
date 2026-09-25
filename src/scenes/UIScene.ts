import Phaser from 'phaser';
import { TEX } from '../art';
import { touchInput, resetTouch, onTap, JOY_RADIUS } from '../controls';
import type { HudState, DialogRequest, GameScene } from './GameScene';
import { toggleMinimap, closeMinimap } from '../ui/minimap';
import { PLAYER } from '../objects/Player';
import { toggleCharacter, closeCharacter } from '../ui/character';

// HUD (hearts, coins, street, mission goal + arrow), mission dialogs,
// on-screen touch controls and the game-over screen.
// Runs on top of GameScene with its own unzoomed camera.
export class UIScene extends Phaser.Scene {
  private hearts: Phaser.GameObjects.Image[] = [];
  private coinText!: Phaser.GameObjects.Text;
  private coinIcon!: Phaser.GameObjects.Image;
  private expText!: Phaser.GameObjects.Text;
  private menuBtn!: Phaser.GameObjects.Text;
  private mapBtn!: Phaser.GameObjects.Text;
  private charBtn!: Phaser.GameObjects.Text;
  private swordText!: Phaser.GameObjects.Text;
  private overlay?: Phaser.GameObjects.Container;
  private ui = 3; // pixel scale for HUD art

  private joyBase!: Phaser.GameObjects.Arc;
  private joyKnob!: Phaser.GameObjects.Arc;
  private attackBtn!: Phaser.GameObjects.Arc;
  private attackLabel!: Phaser.GameObjects.Text;
  private touch = false;
  private joyHome = new Phaser.Math.Vector2();

  private streetText!: Phaser.GameObjects.Text;
  private goalText!: Phaser.GameObjects.Text;
  private arrow!: Phaser.GameObjects.Image;
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
    this.overlay = undefined;
    this.ui = Math.max(2, Math.round(Math.min(this.scale.width, this.scale.height) / 220));

    this.coinIcon = this.add.image(0, 0, TEX.coin).setScale(this.ui).setOrigin(1, 0);
    this.coinText = this.add
      .text(0, 0, '0', { fontFamily: 'monospace', fontSize: `${8 * this.ui}px`, color: '#fff2a8', stroke: '#1e1a24', strokeThickness: this.ui * 2 })
      .setOrigin(1, 0);
    this.expText = this.add
      .text(0, 0, '', { fontFamily: 'monospace', fontSize: `${6 * this.ui}px`, color: '#bfe6ff', stroke: '#1e1a24', strokeThickness: this.ui * 2 })
      .setOrigin(1, 0);
    this.menuBtn = this.add
      .text(0, 0, '☰', { fontFamily: 'sans-serif', fontSize: `${12 * this.ui}px`, color: '#ffffff', stroke: '#1e1a24', strokeThickness: this.ui * 2 })
      .setOrigin(0, 0);

    this.charBtn = this.add
      .text(0, 0, '👤', { fontFamily: 'sans-serif', fontSize: `${11 * this.ui}px` })
      .setOrigin(1, 0);
    this.swordText = this.add
      .text(0, 0, '', { fontFamily: 'monospace', fontSize: `${5 * this.ui}px`, color: '#e8e8f0', stroke: '#1e1a24', strokeThickness: this.ui * 2 })
      .setOrigin(0, 0);
    this.mapBtn = this.add
      .text(0, 0, '🗺', { fontFamily: 'sans-serif', fontSize: `${11 * this.ui}px` })
      .setOrigin(1, 0);

    const label = (size: number, color = '#ffffff') =>
      this.add.text(0, 0, '', { fontFamily: 'monospace', fontSize: `${size}px`, color, stroke: '#1e1a24', strokeThickness: 4, align: 'center' });
    this.streetText = label(13).setOrigin(0.5, 0);
    this.goalText = label(14, '#fff2a8').setOrigin(0.5, 0);
    this.toastText = label(18, '#ffffff').setOrigin(0.5).setAlpha(0).setDepth(10);
    this.arrow = this.add.image(0, 0, TEX.arrow).setScale(this.ui).setVisible(false);
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
    const offTap = onTap((x, y) => this.onDialogTap(x, y));
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'm' || e.key === 'M') && !document.getElementById('menu') && !this.dialogBox) {
        this.openMap();
      }
      if ((e.key === 'c' || e.key === 'C' || e.key === 'i' || e.key === 'I') && !document.getElementById('menu') && !this.dialogBox) {
        this.openCharacter();
      }
      if (e.key === 'Escape' && !document.getElementById('menu')) {
        if (this.dialogBox) this.closeDialog();
        else this.openGameMenu();
      }
    };
    window.addEventListener('keydown', onKey);
    const initial = this.registry.get('hud') as HudState | undefined;
    if (initial) this.updateHud(initial);
    this.events.once('shutdown', () => {
      this.game.events.off('hud', onHud);
      this.game.events.off('dialog', onDialog);
      this.game.events.off('toast', onToast);
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

  private layout() {
    const { width, height } = this.scale;
    const pad = 4 * this.ui;
    this.menuBtn.setPosition(pad, pad - 2 * this.ui);
    const hx = pad + this.menuBtn.width + 3 * this.ui;
    this.hearts.forEach((h, i) => h.setPosition(hx + i * 10 * this.ui, pad));
    this.expText.setPosition(width - pad, pad + 9 * this.ui);
    this.mapBtn.setPosition(width - pad, pad + 17 * this.ui);
    this.charBtn.setPosition(width - pad - this.mapBtn.width - 4 * this.ui, pad + 17 * this.ui);
    this.swordText.setPosition(hx, pad + 10 * this.ui);
    this.coinText.setPosition(width - pad, pad - this.ui);
    this.coinIcon.setPosition(width - pad - this.coinText.width - 2 * this.ui, pad);
    const wrap = Math.min(width - 40, 520);
    this.goalText.setWordWrapWidth(wrap).setPosition(width / 2, pad + 22 * this.ui + 18);
    this.streetText.setPosition(width / 2, pad + 22 * this.ui);
    this.toastText.setWordWrapWidth(wrap).setPosition(width / 2, height * 0.3);

    const r = JOY_RADIUS;
    this.joyHome.set(pad + r + 16, height - pad - r - 16);
    this.attackBtn.setPosition(width - pad - 50, height - pad - 60);
    this.attackLabel.setPosition(this.attackBtn.x, this.attackBtn.y);
  }

  private updateHud(s: HudState) {
    while (this.hearts.length < s.maxHp / 2) {
      this.hearts.push(this.add.image(0, 0, TEX.heart).setOrigin(0).setScale(this.ui));
    }
    this.hearts.forEach((h, i) => {
      const filled = s.hp - i * 2; // 2 hp per heart
      h.setTexture(filled > 0 ? TEX.heart : TEX.heartEmpty);
      h.setAlpha(filled === 1 ? 0.55 : 1); // half heart
    });
    this.coinText.setText(String(s.coins));
    this.expText.setText(`${s.exp} EXP`);
    this.swordText.setText(`⚔ ${s.sword}\n${s.fruits}`);
    this.hud = s;
    this.streetText.setText(s.street ?? '');
    this.goalText.setText(
      s.lingering !== null ? `⏳ Bezbronny na ulicy jeszcze ${s.lingering} s…` : s.goal ? `🎯 ${s.goal}` : '',
    );
    this.layout();
    if (s.dead && !this.overlay) this.showGameOver();
  }

  private createTouchControls() {
    // Phones/tablets show the controls right away; touch laptops once touched.
    this.touch = window.matchMedia('(pointer: coarse)').matches || touchInput.used;
    this.joyBase = this.add.circle(0, 0, JOY_RADIUS, 0xffffff, 0.12).setStrokeStyle(3, 0xffffff, 0.35);
    this.joyKnob = this.add.circle(0, 0, JOY_RADIUS * 0.45, 0xffffff, 0.35);
    this.attackBtn = this.add.circle(0, 0, 38, 0xe43b44, 0.45).setStrokeStyle(3, 0xffffff, 0.5);
    this.attackLabel = this.add
      .text(0, 0, '⚔', { fontFamily: 'sans-serif', fontSize: '34px', color: '#ffffff' })
      .setOrigin(0.5);
    for (const o of [this.joyBase, this.joyKnob, this.attackBtn, this.attackLabel]) o.setVisible(this.touch);
  }

  update() {
    this.updateArrow();
    this.updateTouch();
  }

  /** Points at the mission goal: over it when visible, at the screen edge when not. */
  private updateArrow() {
    const pos = this.hud?.goalPos;
    const game = this.scene.get('game') as GameScene;
    if (!pos || !game.player || this.dialogBox) {
      this.arrow.setVisible(false);
      return;
    }
    const cam = game.cameras.main;
    const sx = (pos.x - cam.worldView.x) * cam.zoom;
    const sy = (pos.y - cam.worldView.y) * cam.zoom;
    const { width, height } = this.scale;
    const m = 40;
    this.arrow.setVisible(true);
    if (sx > m && sx < width - m && sy > m && sy < height - m) {
      const bob = Math.sin(this.time.now / 150) * 4;
      this.arrow.setPosition(sx, sy - 24 * this.ui / 2 - 10 + bob).setRotation(Math.PI / 2);
      return;
    }
    const cx = width / 2;
    const cy = height / 2;
    const ang = Math.atan2(sy - cy, sx - cx);
    const t = Math.min((width / 2 - m) / Math.abs(Math.cos(ang) || 1e-6), (height / 2 - m) / Math.abs(Math.sin(ang) || 1e-6));
    this.arrow.setPosition(cx + Math.cos(ang) * t, cy + Math.sin(ang) * t).setRotation(ang);
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
      const text = this.add
        .text(bx + bw / 2, by + btnH / 2, label, { fontFamily: 'monospace', fontSize: stacked ? '15px' : '17px', color: '#ffffff', align: 'center', wordWrap: { width: bw - 12 } })
        .setOrigin(0.5);
      items.push(rect, text);
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
    toggleCharacter(game.player.hp, PLAYER.maxHp, () => game.gearChanged());
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
      buttons: ['Wyjdź', 'Graj dalej'],
      onChoose: (i) => {
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
      for (const o of [this.joyBase, this.joyKnob, this.attackBtn, this.attackLabel]) o.setVisible(true);
    }
    const t = touchInput;
    if (t.joyActive) {
      this.joyBase.setPosition(t.joyOriginX, t.joyOriginY);
      this.joyKnob.setPosition(t.joyX, t.joyY);
    } else {
      this.joyBase.setPosition(this.joyHome.x, this.joyHome.y);
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
      .text(width / 2, 0, `Śmierć jest ostateczna.\nTwoje imię trafia na Tablicę Pamięci.\n\nZdobyte doświadczenie: ${s?.exp ?? 0} EXP\n\nWskrzeszenie: 5 zł (wkrótce)`, {
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
      (this.scene.get('game') as GameScene).backToMenu();
    };
    this.time.delayedCall(1200, () => {
      offTap = onTap(toMenu);
      this.events.once('shutdown', offTap);
    });
  }
}
