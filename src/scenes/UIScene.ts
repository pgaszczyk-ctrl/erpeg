import Phaser from 'phaser';
import { TEX } from '../art';
import { touchInput, resetTouch, onTap, JOY_RADIUS } from '../controls';
import type { HudState } from './GameScene';

// HUD (hearts, coins), on-screen touch controls and the game-over screen.
// Runs on top of GameScene with its own unzoomed camera.
export class UIScene extends Phaser.Scene {
  private hearts: Phaser.GameObjects.Image[] = [];
  private coinText!: Phaser.GameObjects.Text;
  private coinIcon!: Phaser.GameObjects.Image;
  private overlay?: Phaser.GameObjects.Container;
  private ui = 3; // pixel scale for HUD art

  private joyBase!: Phaser.GameObjects.Arc;
  private joyKnob!: Phaser.GameObjects.Arc;
  private attackBtn!: Phaser.GameObjects.Arc;
  private attackLabel!: Phaser.GameObjects.Text;
  private touch = false;
  private joyHome = new Phaser.Math.Vector2();

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

    this.createTouchControls();
    this.layout();
    this.scale.on('resize', this.layout, this);

    const onHud = (s: HudState) => this.updateHud(s);
    this.game.events.on('hud', onHud);
    const initial = this.registry.get('hud') as HudState | undefined;
    if (initial) this.updateHud(initial);
    this.events.once('shutdown', () => {
      this.game.events.off('hud', onHud);
      this.scale.off('resize', this.layout, this);
      resetTouch();
    });

    if (!this.sys.game.device.input.touch) {
      const hint = this.add
        .text(this.scale.width / 2, this.scale.height - 12, 'WASD / strzałki – ruch    SPACJA – miecz', {
          fontFamily: 'monospace', fontSize: '14px', color: '#ffffff', stroke: '#1e1a24', strokeThickness: 4,
        })
        .setOrigin(0.5, 1);
      this.tweens.add({ targets: hint, alpha: 0, delay: 6000, duration: 1000 });
    }
  }

  private layout() {
    const { width, height } = this.scale;
    const pad = 4 * this.ui;
    this.hearts.forEach((h, i) => h.setPosition(pad + i * 10 * this.ui, pad));
    this.coinText.setPosition(width - pad, pad - this.ui);
    this.coinIcon.setPosition(width - pad - this.coinText.width - 2 * this.ui, pad);

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
    this.layout();
    if (s.dead && !this.overlay) this.showGameOver();
  }

  private createTouchControls() {
    this.touch = this.sys.game.device.input.touch;
    this.joyBase = this.add.circle(0, 0, JOY_RADIUS, 0xffffff, 0.12).setStrokeStyle(3, 0xffffff, 0.35);
    this.joyKnob = this.add.circle(0, 0, JOY_RADIUS * 0.45, 0xffffff, 0.35);
    this.attackBtn = this.add.circle(0, 0, 38, 0xe43b44, 0.45).setStrokeStyle(3, 0xffffff, 0.5);
    this.attackLabel = this.add
      .text(0, 0, '⚔', { fontFamily: 'sans-serif', fontSize: '34px', color: '#ffffff' })
      .setOrigin(0.5);
    for (const o of [this.joyBase, this.joyKnob, this.attackBtn, this.attackLabel]) o.setVisible(this.touch);
  }

  // The touch state lives in controls.ts; here we only draw it.
  update() {
    if (!this.touch) return;
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
    const bg = this.add.rectangle(0, 0, width, height, 0x000000, 0.6).setOrigin(0);
    const title = this.add
      .text(width / 2, height / 2 - 30, 'Zginąłeś!', { fontFamily: 'monospace', fontSize: '42px', color: '#e43b44', stroke: '#000', strokeThickness: 6 })
      .setOrigin(0.5);
    const sub = this.add
      .text(width / 2, height / 2 + 30, 'Dotknij ekranu lub naciśnij spację', { fontFamily: 'monospace', fontSize: '18px', color: '#ffffff' })
      .setOrigin(0.5);
    this.overlay = this.add.container(0, 0, [bg, title, sub]).setAlpha(0);
    this.tweens.add({ targets: this.overlay, alpha: 1, duration: 400 });

    let done = false;
    let offTap = () => {};
    const restart = () => {
      if (done) return;
      done = true;
      offTap();
      resetTouch();
      this.scene.get('game').scene.restart();
    };
    this.time.delayedCall(700, () => {
      offTap = onTap(restart);
      this.events.once('shutdown', offTap);
      this.input.once('pointerdown', restart); // mouse
      this.input.keyboard!.once('keydown-SPACE', restart);
    });
  }
}
