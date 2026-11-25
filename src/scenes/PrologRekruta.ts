import Phaser from 'phaser';
import type { InteractionTarget } from '../interaction';
import { session } from '../quests';
import { gear, item, addItem, equipFromBag, meleeDamage } from '../inventory';
import { PLECAK } from '../content/przedmioty';
import { zasoby, maxMany } from '../content/zasoby';
import { poziomPostaci } from '../content/historia';
import { PX_PER_M, type CityMap } from '../map/CityMap';
import { loadingMapVisible } from '../ui/loadingMap';
import { surfaceBindingMatches } from '../map/worldRules';
import { tx } from '../i18n';
import { ensureModul, fitHd } from '../sprites';
import { TEX, artScale } from '../art';
import { PROLOG_ID, PROLOG_LEAD_ID, freshProlog, mayStart, advance, claimOnce, recordKill, type AnchorKind, type PrologState } from '../prolog/state';
import { equipStoryItem } from '../prolog/rewards';
import { clearWalk, localRoutes, planAnchors } from '../prolog/planner';
import { idLochu } from '../loch/mapa';
import { hashLochu } from '../loch/plan';
import type { DialogRequest, QuestInfo } from './GameScene';
import type { Player } from '../objects/Player';
import type { Slime } from '../objects/Slime';
import type { LochWnetrze, LochyWejscia, WejscieLochu } from './Lochy';

/** Coins paid at the end of the first duty: the first shop purchase within ~15 minutes (report #12). */
export const PROLOG_NAGRODA = 700;
type RecruitEnemy = Slime & { temp?: boolean; missionId?: string; power?: number };
export interface PrologHost {
  scene: Phaser.Scene;
  city: CityMap;
  player: Player;
  mapName: string;
  entrances: () => LochyWejscia | undefined;
  dungeon: () => LochWnetrze | undefined;
  dialog: (d: DialogRequest) => void;
  toast: (s: string, ms?: number) => void;
  hud: () => void;
  refresh: () => void;
  ready: () => boolean;
  save: () => Promise<unknown>;
  spawn: (x: number, y: number) => RecruitEnemy;
  /** Coins through the game's own earn (stats + HUD). */
  earn: (n: number) => void;
  /** Places to offer after the first duty (nearest newsboy, city board, hunting ground). */
  nextSteps: () => { label: string; nazwa: string; x: number; y: number }[];
  guide: (to: { nazwa: string; x: number; y: number } | null) => void;
}

/** Stages whose own message already tells what to do next (no extra „new goal” line over it). */
const OWN_HINT = new Set(['magic_trial', 'completed', 'rescue_fight']);

/** Existing combat, map, inventory and dungeon; this class owns only the origin story. */
export class PrologRekruta {
  private objects: Phaser.GameObjects.GameObject[] = [];
  private nameplates = new Map<string, Phaser.GameObjects.Text>();
  private enemies = new Map<RecruitEnemy, number>();
  private rendered = '';
  private planning = false;
  private planningFailed = false;
  private originNeedsSave = false;
  private dirty = false;
  private destroyed = false;
  private introShown = false;
  private lastStage = '';
  busy = false;
  constructor(private h: PrologHost) {}
  get state() { return session.story.prolog; }
  private get local() {
    const p = this.state;
    return !!p && surfaceBindingMatches(p.originMapId, this.h.city.id, Object.values(p.anchors));
  }
  private get underground() { return !!this.state?.dungeon && this.state.dungeon.id === this.h.city.id; }
  get protectingStart() { return !!this.state && this.state.status === 'active' && this.state.stage === 'intro'; }
  private point(k: AnchorKind) { const a = this.state?.anchors[k]; return a && this.h.city.fromLatLon(a.lat, a.lon); }
  private near(p: {x:number;y:number}) { return Math.hypot(p.x-this.h.player.x,p.y-this.h.player.y) < 14*PX_PER_M; }

  /** An old character may explicitly opt in at a chief. A different city never resets an existing origin. */
  offerChief(after: () => void): boolean {
    if (!mayStart(this.state, session.missions[PROLOG_ID])) return false;
    this.h.dialog({ title: tx('Szef straży', 'Guard chief'), text: tx('Chcesz poznać podstawy służby? Możesz odbyć pierwsze szkolenie.', 'Would you like to learn the basics of guard duty? You can take the introductory training.'),
      buttons: [tx('Rozpocznij pierwszą służbę', 'Begin first duty'), tx('Pozostałe sprawy', 'Other business')], onChoose: i => {
        if (i !== 0) return after();
        void this.change(() => { session.story.prolog = freshProlog(); session.missions[PROLOG_ID] = 'active'; });
      } });
    return true;
  }

  /** Pause until the checkpoint is acknowledged; retry preserves the in-memory reward and does not grant it twice. */
  private async change(f: () => void, then?: () => void) {
    if (this.busy || this.destroyed) return;
    this.busy = true;
    f(); this.h.refresh(); this.h.hud();
    this.h.scene.scene.pause();
    const write = async () => {
      try {
        do { this.dirty = false; await this.h.save(); } while (this.dirty && !this.destroyed);
        if (this.destroyed) return;
        this.busy = false; this.rendered = '';
        this.h.scene.scene.resume(); then?.();
        if(this.state?.stage==='letter_deliver' && this.state.rewardsClaimed.includes('starter_sword'))this.h.toast(
          matchMedia('(pointer: coarse)').matches ? tx('Chodzisz lewym joystickiem. Przy rozmówcy naciśnij AKCJA.','Use the left joystick to walk. Near a person, press ACT.') : tx('Chodzisz WASD lub strzałkami. Podejdź i naciśnij E albo kliknij rozmówcę.','Walk with WASD or arrow keys. Approach and press E or click the person.'),6500);
      } catch {
        if (this.destroyed) return;
        this.h.dialog({ title: tx('Zapis prologu', 'Prologue checkpoint'), text: tx('Nie udało się potwierdzić zapisu. Postęp i przedmioty czekają tutaj. Spróbuj ponownie przed dalszą grą.', 'The save could not be confirmed. Your progress and items are held here. Retry before continuing.'), buttons: [tx('Ponów zapis', 'Retry save')], onChoose: () => { this.h.scene.scene.pause(); void write(); } });
      }
    };
    await write();
  }

  private checkpoint() {
    // Several deaths in one frame join one acknowledged checkpoint; a second death cannot be lost behind
    // the first request. No interaction or scene transition advances while the checkpoint is pending.
    if (this.busy) { this.dirty = true; return; }
    void this.change(() => {});
  }
  private async plan() {
    if (this.planning || this.destroyed || !this.state || this.state.status !== 'active') return;
    if (this.state.originMapId && !this.local) return;
    this.planning = true;
    this.planningFailed = false;
    let phase: 'save' | 'map' = 'map';
    this.h.scene.scene.pause();
    try {
      const p = this.state;
      if (!p.originMapId) {
        p.originMapId = this.h.city.id; p.originName = this.h.mapName;
        // Record ownership before looking for POIs: another city cannot restart an interrupted plan.
        session.missions[PROLOG_ID] = 'active';
        this.originNeedsSave = true;
      }
      if (this.originNeedsSave) {
        phase = 'save';
        await this.h.save();
        this.originNeedsSave = false;
      }
      if (this.destroyed) return;
      if (!this.local) { this.h.scene.scene.resume(); return; }
      phase = 'map';
      const hero = this.h.player;
      const R = 520*PX_PER_M;
      await this.h.city.ensure(hero.x, hero.y, R);
      // Plan only once every tile in the radius is in: on world maps buildings arrive with their tiles (report #1).
      for (let i = 0; i < 40 && !this.h.city.ready({ x0: hero.x - R, y0: hero.y - R, x1: hero.x + R, y1: hero.y + R }); i++) await new Promise(r => setTimeout(r, 250));
      if (this.destroyed) return;
      this.h.entrances()?.update(hero.x, hero.y, this.h.scene.time.now);
      const plan = planAnchors(this.h.city, hero, this.h.entrances()?.lista ?? [], this.h.mapName);
      const seed = hashLochu(`${session.name}:${session.idik}:${PROLOG_ID}`);
      // One instance per character. It shares the existing generator, not the ordinary dungeon's session cache.
      plan.dungeon.seed = seed;
      const a = plan.anchors.dungeonEntrance;
      await this.change(() => {
        p.anchors = plan.anchors;
        p.dungeon = { id: idLochu({ rodzaj: plan.dungeon.rodzaj, seed, lat: a.lat, lon: a.lon, tutorial: true }), seed, killed: [], chest: false };
      });
    } catch (e) {
      if (this.destroyed) return;
      // Wait for an explicit retry. update() must not open another dialog/request every frame.
      this.planningFailed = true;
      console.warn(`Prolog: ${phase}`, e);
      this.h.dialog({
        title: phase === 'save' ? tx('Zapis prologu', 'Prologue checkpoint') : tx('Pierwsza służba', 'First duty'),
        text: phase === 'save'
          ? tx('Serwer nie potwierdził zapisu rozpoczęcia służby. Postać i zadanie czekają tutaj. Ponów zapis, aby kontynuować.', 'The server did not confirm the start of your duty. Your character and quest are held here. Retry the save to continue.')
          : tx('Nie udało się przygotować pobliskich, przechodnich celów. Spróbuj ponownie po dograniu mapy.', 'Nearby reachable objectives could not be prepared. Retry after the map has loaded.'),
        buttons: [phase === 'save' ? tx('Ponów zapis', 'Retry save') : tx('Spróbuj ponownie', 'Retry')],
        onChoose: () => { if (!this.destroyed) void this.plan(); },
      });
    } finally { this.planning = false; }
  }

  update() {
    const p = this.state;
    if (!p || this.busy || this.destroyed) return;
    if (p.status !== 'active') { if (this.rendered !== p.status) { this.clearObjects(); this.rendered = p.status; if(p.status==='completed'&&this.local)this.label('mentor',tx('Starszy strażnik','Senior guard')); } return; }
    if (!Object.keys(p.anchors).length) { if (!this.planningFailed && this.h.ready() && !loadingMapVisible()) void this.plan(); return; }
    if (this.local) this.repairAnchors();
    if (this.local && p.anchors.dungeonEntrance?.fallback) {
      const at = this.point('dungeonEntrance')!;
      this.h.entrances()?.addTutorial({ id:p.anchors.dungeonEntrance.id, ...at, seed:p.dungeon!.seed, rodzaj:'podziemia' });
    }
    const key = `${this.h.city.id}:${p.stage}:${p.pendingRewards.length}`;
    if (key !== this.rendered) { this.clearObjects(); this.rendered = key; this.draw(); }
    if (this.underground) {
      const d = this.h.dungeon();
      if (p.stage === 'dungeon_first_group' && d?.firstGroupCleared) void this.change(() => advance(p,'dungeon_first_group','magic_pickup'));
    }
    // Owner, 22 Nov 2026: „na twarz dostaję tonę tekstu, nie wiem skąd się wziął” – no window opens by itself any
    // more. The senior guard calls out over his head and the player walks up and talks (AKCJA / E) when ready.
    if (p.stage === 'intro' && this.local && !this.introShown && this.h.ready() && !loadingMapVisible()) {
      this.introShown = true;
      this.h.scene.time.delayedCall(2800, () => {
        if (!this.destroyed && this.state?.stage === 'intro') this.h.toast(tx('👋 Ktoś cię woła! Podejdź do starszego strażnika (złota strzałka) i porozmawiaj z nim.', '👋 Someone is calling you! Walk up to the senior guard (gold arrow) and talk to him.'), 7000);
      });
    }
    // Every new step is said plainly in one line, right after the talk that gave it.
    if (p.stage !== this.lastStage) {
      const before = this.lastStage;
      this.lastStage = p.stage;
      const g = before && !OWN_HINT.has(p.stage) ? this.goal() : null;
      if (g) this.h.toast(`📜 ${tx('Nowy cel', 'New goal')}: ${g.text}`, 6500);
    }
  }

  private repairAt = 0;
  /** Saved points that turned out to lie in a building (world tiles arrive later, OSM data changes) move to the
   *  nearest spot reachable from a road – checked again on every visit (report #1: archer stuck in a building). */
  private repairAnchors() {
    const now = performance.now();
    if (now < this.repairAt) return;
    this.repairAt = now + 1000;
    const p = this.state!;
    let moved = false;
    for (const k of ['mentor', 'outpost', 'ambush', 'bowPractice', 'library', 'dungeonEntrance'] as AnchorKind[]) {
      const a = p.anchors[k];
      if (!a || (k === 'dungeonEntrance' && !a.fallback)) continue;
      const at = this.h.city.fromLatLon(a.lat, a.lon);
      const r = 40 * PX_PER_M;
      if (!this.h.city.ready({ x0: at.x - r, y0: at.y - r, x1: at.x + r, y1: at.y + r })) continue;
      if (this.h.city.isFree(at.x, at.y + 4, 3, 2) && clearWalk(this.h.city, at, { x: at.x, y: at.y + 6 })) continue;
      const q = this.h.city.reachableNear(at.x, at.y);
      if (Math.hypot(q.x - at.x, q.y - at.y) < 1) continue;
      Object.assign(a, this.h.city.toLatLon(q.x, q.y));
      moved = true;
    }
    if (moved) { this.rendered = ''; this.guide = undefined; }
  }

  private label(k: AnchorKind, name: string, texture?: string) {
    const at = this.point(k); if (!at) return;
    const guard=k==='mentor'||k==='outpost';
    const id=k==='mentor'?'17':guard?'16':k==='ambush'?'12':'19';
    const tex=texture ?? ensureModul(this.h.scene,{g:id,c:guard?'16':id,p:'m',s:0,w:2,u:2,u2:1}) ?? TEX.hero;
    const sprite = (tex===TEX.target?this.h.scene.add.sprite(at.x,at.y,tex):this.h.scene.add.sprite(at.x,at.y,tex,'down-0')).setScale(artScale(tex)).setDepth(at.y);
    if(tex.startsWith('hd-'))fitHd(sprite);
    else if(tex===TEX.target)sprite.setOrigin(.5,1);
    this.objects.push(sprite);
    const text = this.h.scene.add.text(at.x,at.y-17,name,{fontFamily:'Alegreya Sans, sans-serif',fontSize:'6px',resolution:4,color:'#fff2d0',backgroundColor:'#241d29',padding:{x:2,y:1}}).setOrigin(.5,1).setDepth(at.y+100);
    this.objects.push(text);
    this.nameplates.set(`prolog:${k}`, text);
  }

  updateNameplates(target: InteractionTarget | null) {
    for (const [id, text] of this.nameplates) {
      text.setVisible(!target || (target.id !== id && Math.hypot(target.x - text.x, target.y - (text.y + 17)) >= 36));
    }
  }

  private draw() {
    const p = this.state!;
    if (this.local) {
      const waiting = ['intro','letter_return','bow_trial','rescue_return','dungeon_return'].includes(p.stage);
      this.label('mentor', waiting ? tx('! Starszy strażnik','! Senior guard') : tx('Starszy strażnik','Senior guard'));
      if (p.stage === 'intro') this.callOut(tx('Hej, rekrucie! Tutaj!', 'Hey, recruit! Over here!'));
      if (p.stage === 'letter_deliver') this.label('outpost',tx('Dyżurny straży','Duty officer'));
      if (['rescue_find','rescue_fight','rescue_reward','bow_trial'].includes(p.stage)) this.label('ambush',tx('Łucznik','Archer'));
      if (p.stage === 'rescue_fight') this.spawnRescue();
      if (p.stage === 'bow_trial') this.label('bowPractice',tx('◎ Tarcza','◎ Target'),TEX.target);
      if (p.stage === 'library_visit') this.label('library',p.anchors.library!.fallback ? tx('Dyżur bibliotekarza','Visiting librarian') : tx('Bibliotekarz','Librarian'));
    }
    if (this.underground && ['magic_pickup','magic_trial','dungeon_recover'].includes(p.stage)) {
      const d = this.h.dungeon()!;
      const at = p.stage === 'magic_pickup' ? d.magicSpot : d.skrzynia;
      const text = this.h.scene.add.text(at.x,at.y-8,p.stage === 'magic_pickup' ? '🪄 🎩' : '🧸',{fontSize:'22px'}).setOrigin(.5).setDepth(at.y+2);
      this.objects.push(text);
    }
  }
  /** A short speech bubble over the senior guard, bobbing gently until he is talked to. */
  private callOut(text: string) {
    const at = this.point('mentor'); if (!at) return;
    const t = this.h.scene.add.text(at.x, at.y - 27, text, { fontFamily: 'Alegreya Sans, sans-serif', fontSize: '7px', resolution: 4,
      color: '#241d29', backgroundColor: '#fff2d0', padding: { x: 3, y: 2 } }).setOrigin(.5, 1).setDepth(at.y + 101);
    this.h.scene.tweens.add({ targets: t, y: at.y - 30, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.objects.push(t);
  }
  private spawnRescue() {
    const p=this.state!, at=this.point('ambush')!;
    for(let i=0;i<2;i++) {
      if(p.rescueKilled.includes(i) || [...this.enemies.values()].includes(i)) continue;
      // Same connected ground as the saved archer; no random respawn into a building.
      const x=at.x+(i?8:-8), y=at.y;
      const pos=this.h.city.isFree(x,y+4,3,2)?{x,y}:at;
      const e=this.h.spawn(pos.x,pos.y); e.temp=true; e.missionId=PROLOG_ID; e.hp=Math.max(2,meleeDamage()*2)*e.mnoznikHp; e.power=.5;
      this.enemies.set(e,i);
    }
  }
  killed(e: RecruitEnemy) {
    const index=this.enemies.get(e); if(index===undefined)return false;
    this.enemies.delete(e);
    const p=this.state!;
    recordKill(p,'rescue',index,2);
    if(p.rescueKilled.length===2)advance(p,'rescue_fight','rescue_reward');
    this.checkpoint(); this.rendered=''; this.h.hud(); return true;
  }
  dungeonChanged() { if(this.underground) { this.checkpoint(); this.rendered=''; } }

  prepareDungeon(w: WejscieLochu): string | null {
    const p=this.state;
    if(!p || p.status!=='active' || !this.local || w.id!==p.anchors.dungeonEntrance?.id || !p.dungeon) return null;
    if(['intro','letter_deliver','letter_return','rescue_find','rescue_fight','rescue_reward','bow_trial','rescue_return'].includes(p.stage))return null;
    if(p.stage==='dungeon_enter')advance(p,'dungeon_enter','dungeon_first_group');
    return p.dungeon.id;
  }

  interactionTargets(): InteractionTarget[] {
    const out: InteractionTarget[]=[];
    for(const k of ['mentor','outpost','ambush','library'] as AnchorKind[]) {
      const at=this.point(k); if(!at||!this.interactionAt(at.x,at.y))continue;
      const name=k==='mentor'?tx('Starszy strażnik','Senior guard'):k==='outpost'?tx('Dyżurny straży','Duty officer'):k==='ambush'?tx('Łucznik','Archer'):tx('Bibliotekarz','Librarian');
      out.push({id:`prolog:${k}`, ...at, kind:'talk', label:tx('Porozmawiaj: ','Talk: ')+name, range:14*PX_PER_M,priority:(k==='outpost' && this.state?.stage==='letter_deliver') || (k==='mentor' && this.state?.stage==='letter_return'),run:()=>this.interact(at)});
    }
    const practice=this.state?.stage==='bow_trial'&&this.local&&this.point('bowPractice');
    if(practice)out.push({id:'prolog:practice',...practice,kind:'use',range:14*PX_PER_M,label:tx('Użyj: Cel treningowy','Use: Practice target'),run:()=>this.interact(practice)});
    const d=this.underground&&this.h.dungeon();
    if(d) for(const [id,at] of [['magic',d.magicSpot],['chest',d.skrzynia]] as const) {
      if(at&&this.interactionAt(at.x,at.y))out.push({id:`prolog:${id}`,...at,kind:'use',range:14*PX_PER_M,label:tx('Sprawdź: ','Inspect: ')+(id==='magic'?tx('Różdżka','Wand'):tx('Skrzynia','Chest')),run:()=>this.interact(at)});
    }
    return out;
  }

  /** Read-only hit test for the prologue's own characters and story objects. */
  interactionAt(x: number, y: number): 'talk' | 'use' | null {
    const p = this.state;
    if (!p || this.busy || this.destroyed) return null;
    const at = (q: {x:number;y:number} | undefined | null) => q && Math.hypot(q.x-x,q.y-y) < 16;
    if (this.local) {
      const keys: AnchorKind[] = [];
      if (p.status === 'completed' || ['intro','letter_return','bow_trial','rescue_return','dungeon_return'].includes(p.stage)) keys.push('mentor');
      if (p.status === 'active') {
        if (p.stage === 'letter_deliver') keys.push('outpost');
        if (['rescue_find','rescue_reward','bow_trial'].includes(p.stage)) keys.push('ambush');
        if (p.stage === 'library_visit') keys.push('library');
      }
      if (keys.some(k => at(this.point(k)))) return 'talk';
    }
    const d = this.underground && this.h.dungeon();
    if (d && p.status === 'active' && ((p.stage === 'magic_pickup' && at(d.magicSpot)) ||
        (['magic_trial','dungeon_recover'].includes(p.stage) && at(d.skrzynia)))) return 'use';
    return null;
  }

  interact(at?: {x:number;y:number}): boolean {
    const near=(q:{x:number;y:number})=>this.near(q)&&(!at||Math.hypot(q.x-at.x,q.y-at.y)<1);
    const p=this.state; if(!p || this.busy || !p.anchors.mentor)return false;
    if(p.status==='completed'&&this.local&&near(this.point('mentor')!)) {
      this.h.dialog({title:tx('Starszy strażnik','Senior guard'),text:tx(`${session.name}, dobra robota. Pierwszą służbę masz już za sobą. Następne zlecenie będzie inne.`,`${session.name}, good work. Your first duty is complete. Your next assignment will be different.`),buttons:[tx('Do zobaczenia','See you')],onChoose:()=>{}});return true;
    }
    if(p.status!=='active')return false;
    if(this.local) {
      if(['intro','letter_return','bow_trial','rescue_return','dungeon_return'].includes(p.stage)&&near(this.point('mentor')!)){this.mentor();return true;}
      if(p.stage==='letter_deliver' && near(this.point('outpost')!)) {
        this.h.dialog({title:tx('Dyżurny straży','Duty officer'),text:tx('Od starszego strażnika? Daj tutaj. A to potwierdzenie zabierz z powrotem, bo będzie mnie ścigał, że list zaginął między biurkiem a szufladą.','From the senior guard? Hand it over. Take this receipt back, or he will insist the letter vanished between my desk and the drawer.'),localHumor:true,buttons:[tx('Odbierz potwierdzenie','Take receipt')],onChoose:()=>void this.change(()=>{p.storyItems=['receipt'];advance(p,'letter_deliver','letter_return');})});return true;
      }
      if(p.stage==='rescue_find' && near(this.point('ambush')!)) {
        this.h.dialog({title:tx('Łucznik','Archer'),
          text:tx('Za mną idą dwa chochliki. Nie mam miejsca, żeby napiąć łuk. Pomożesz mi?','Two imps are following me. I have no room to draw my bow. Will you help me?'),
          buttons:[tx('Pomogę','I will help')],onChoose:()=>void this.change(()=>advance(p,'rescue_find','rescue_fight'))});
        return true;
      }
      if(['rescue_reward','bow_trial'].includes(p.stage) && near(this.point('ambush')!)) {this.archer();return true;}
      if(p.stage==='bow_trial' && near(this.point('bowPractice')!)){this.h.toast(tx('Wyceluj łukiem i strzel. Możesz też wrócić do strażnika i spróbować później.','Aim your bow and shoot. You can also return to the guard and try later.'),5000);return true;}
      if(p.stage==='library_visit' && near(this.point('library')!)){this.library();return true;}
    }
    if(this.underground){
      const d=this.h.dungeon()!;
      if(p.stage==='magic_pickup' && near(d.magicSpot)) {this.magicPickup();return true;}
      if(['magic_trial','dungeon_recover'].includes(p.stage) && near(d.skrzynia)) {
        if(d.zostalo){this.h.toast(tx('Najpierw oczyść kryjówkę chochlików.','Clear the imps\' hideout first.'));return true;}
        this.h.dialog({title:tx('Zguba pod ziemią','Lost underground'),text:tx('Miś jest tutaj. Zabierz go właścicielowi.','The teddy is here. Take it back to its owner.'),buttons:[tx('Zabierz misia','Take teddy')],onChoose:()=>void this.change(()=>{p.storyItems=['bear'];p.dungeon!.chest=true;d.otworzSkrzynie();advance(p,p.stage,'dungeon_return');})});return true;
      }
    }
    return false;
  }

  private mentor() {
    const p=this.state!;
    const title=tx('Starszy strażnik','Senior guard');
    const talk=(text:string,button:string,f:()=>void,humor=false,then?:()=>void)=>this.h.dialog({title,text,buttons:[button],localHumor:humor,onChoose:()=>void this.change(f,then)});
    // Short talks: who you are to him, what to do, and a plain „📜 Zadanie” line at the end (owner, 22 Nov 2026).
    const task=(story:string,goal:string)=>`${story}\n\n📜 ${tx('Zadanie','Task')}: ${goal}`;
    switch(p.stage){
      case 'intro': return talk(task(tx('Nowy rekrut straży? To ty. Jestem twoim przełożonym. Masz tu miecz – na wszelki wypadek.\n\nZaniesiesz list dyżurnemu na posterunku i wrócisz do mnie z potwierdzeniem.','A new guard recruit? That is you. I am your superior. Here is a sword, just in case.\n\nTake this letter to the duty officer at the guard post and bring me back a receipt.'),tx('zanieś list dyżurnemu. Złota strzałka pokaże drogę.','deliver the letter to the duty officer. The gold arrow shows the way.')),tx('Ruszam','On my way'),()=>{claimOnce(p,'starter_sword',()=>this.equipSafely('miecz_rekruta'));p.storyItems=['letter'];advance(p,'intro','letter_deliver');},true);
      case 'letter_return': return talk(task(tx('Jest potwierdzenie. Dobra robota.\n\nNa trakcie łucznika zaczepiają chochliki. Sprawdź, czy potrzebuje pomocy.','The receipt is here. Good work.\n\nImps are bothering an archer on the road. See if he needs help.'),tx('odszukaj łucznika (strzałka).','find the archer (follow the arrow).')),tx('Sprawdzę','I will check'),()=>{claimOnce(p,'letter_done',()=>{session.exp+=20;});p.storyItems=[];advance(p,'letter_return','rescue_find');},true);
      case 'bow_trial': return talk(task(tx('Łucznik cały? To najważniejsze. Łuk wypróbujesz później.\n\nChochliki znoszą kradzione rzeczy do pobliskiego lochu. Zginął pluszowy miś.','Is the archer safe? That matters most. You can try the bow later.\n\nImps take stolen things to a nearby dungeon. A teddy bear is missing.'),tx('zejdź do lochu i przynieś misia.','go down into the dungeon and bring back the teddy.')),tx('Idę po misia','Off to find it'),()=>{advance(p,'bow_trial','rescue_return');this.assignDungeon(p);});
      case 'rescue_return': return talk(task(tx('Łucznik cały? Dobra robota.\n\nChochliki znoszą kradzione rzeczy do pobliskiego lochu. Zginął pluszowy miś.','Is the archer safe? Good work.\n\nImps take stolen things to a nearby dungeon. A teddy bear is missing.'),tx('zejdź do lochu i przynieś misia.','go down into the dungeon and bring back the teddy.')),tx('Idę po misia','Off to find it'),()=>this.assignDungeon(p));
      case 'dungeon_return': return talk(task(tx('Miś wróci do właściciela. A ta różdżka… na magii się nie znam. Bibliotekarz będzie wiedział.','The teddy will go back to its owner. That wand… I know nothing about magic. The librarian will.'),tx('odwiedź bibliotekarza.','visit the librarian.')),tx('Idę do biblioteki','Off to the library'),()=>{claimOnce(p,'bear_returned',()=>{session.exp+=50;});p.storyItems=[];advance(p,'dungeon_return','library_visit');},true);
      default: this.h.dialog({title,text:tx('Masz swoje zlecenie. Strzałka i dziennik wskazują następny krok.','You have your assignment. The arrow and journal show the next step.'),buttons:[tx('Wracam do zadania','Back to duty')],onChoose:()=>{}});
    }
  }
  private assignDungeon(p:PrologState){claimOnce(p,'rescue_done',()=>{session.exp+=35;});advance(p,'rescue_return','dungeon_enter');}
  private receive(id:string){if(addItem(id)===false)this.state!.pendingRewards.push(id);}
  private equipSafely(id:string){equipStoryItem(this.state!,gear,id,item(id)!.miejsce,PLECAK.miejsc);}
  private archer(){
    const p=this.state!;
    this.h.dialog({title:tx('Łucznik','Archer'),text:tx('Dzięki. Jeden od przodu, drugi od tyłu — nie miałem nawet gdzie napiąć cięciwy.\n\nMam zapasowy łuk. Stary, ale sprawny. Weź go, razem ze strzałami. Pokażę ci, jak celować.','Thanks. One in front, one behind — I had no room to draw.\n\nI have an old spare bow. It still works. Take it and these arrows. I will show you how to aim.'),buttons:[tx('Wypróbuj łuk','Try the bow'),tx('Później','Later')],onChoose:i=>void this.change(()=>{
      claimOnce(p,'bow_received',()=>{this.receive('luk_rekruta');gear.ammo.strzaly=Math.min(200,gear.ammo.strzaly+20);});
      advance(p,'rescue_reward','bow_trial');
      if(i===0){const at=gear.bag.findIndex(s=>'item'in s&&s.item==='luk_rekruta');if(at>=0)equipFromBag(at);else if(p.pendingRewards.includes('luk_rekruta')){p.pendingRewards.splice(p.pendingRewards.indexOf('luk_rekruta'),1);this.equipSafely('luk_rekruta');}}
      else advance(p,'bow_trial','rescue_return');
    })});
  }
  private magicPickup(){
    const p=this.state!;
    // Never take the weapon out of the hand without asking (report: the set replaced the sword just chosen).
    this.h.dialog({title:tx('Różdżka… i kapelusz?','A wand… and a hat?'),text:tx('Kto zostawia tu takie rzeczy? Komplet do nauki magii: różdżka i kapelusz.\n\nZałożyć teraz? Twoja obecna broń trafi do plecaka.','Who leaves these here? A training set for magic: a wand and a hat.\n\nPut it on now? Your current weapon goes to the backpack.'),buttons:[tx('Załóż teraz','Put it on now'),tx('Do plecaka','To the backpack')],onChoose:i=>void this.change(()=>{
      claimOnce(p,'magic_set_received',()=>{
        if(i===0){this.equipSafely('rozdzka_szkolna');this.equipSafely('kapelusz_szkolny');}
        else{this.receive('rozdzka_szkolna');this.receive('kapelusz_szkolny');}
        gear.magic=true;zasoby.m=Math.max(zasoby.m,maxMany(poziomPostaci(session.exp)));
      });
      advance(p,'magic_pickup','magic_trial');
    },()=>this.h.toast(i===0?tx('Wyceluj i rzuć pierwsze zaklęcie. Broń możesz zmieniać w plecaku.','Aim and cast your first spell. You can change weapons in your backpack.'):tx('Różdżka jest w plecaku. Załóż ją, gdy zechcesz – a teraz odzyskaj misia.','The wand is in your backpack. Equip it whenever you like – now recover the teddy.'),6000))});
  }
  shot(kind:'luk'|'magia'){
    const p=this.state;if(!p || p.status!=='active')return;
    if(kind==='luk'&&p.stage==='bow_trial'&&this.local&&this.near(this.point('bowPractice')!)){p.bowTried=true;advance(p,'bow_trial','rescue_return');this.checkpoint();this.h.hud();}
    if(kind==='magia'&&p.stage==='magic_trial'&&this.underground){p.magicTried=true;advance(p,'magic_trial','dungeon_recover');this.checkpoint();this.h.hud();}
  }
  private library(){
    const p=this.state!;
    const coarse=matchMedia('(pointer: coarse)').matches;
    const pages=[
      tx('To komplet do nauki. Kapelusz dostraja różdżkę i pomaga utrzymać zaklęcie. Dlatego zadziałało, choć nikt cię jeszcze nie uczył.\n\nW środku jest znak, ale nie poznaję go. Nie wygląda na znak naszego warsztatu.','This is a training set. The hat tunes the wand and helps hold a spell. That is why it worked before any lessons.\n\nThere is a mark inside, but I do not recognise it. It is not our workshop\'s mark.'),
      tx(`Kilka rzeczy, które każdy strażnik powinien wiedzieć.\n\n❤ Leczenie: ${coarse?'przycisk z sercem':'klawisz H'} – najpierw mikstura, potem owoce i jedzenie z plecaka.\n💰 Łup z potworów sprzedasz w każdym sklepie (zakładka „Sprzedaj”).\n🗺 Mapa: ${coarse?'przycisk mapy u góry':'klawisz M'}.\n💾 Gra zapisuje się sama co kilka minut i przy każdym budynku.\n⚔ Mocny atak: ${coarse?'przycisk MOCNY':'klawisz Q'} – gdy zegar na przycisku się zamknie.`,`A few things every guard should know.\n\n❤ Healing: ${coarse?'the heart button':'the H key'} – a potion first, then fruit and food from your backpack.\n💰 Sell monster loot in any shop (the “Sell” tab).\n🗺 Map: ${coarse?'the map button at the top':'the M key'}.\n💾 The game saves itself every few minutes and at every building.\n⚔ Strong attack: ${coarse?'the STRONG button':'the Q key'} – once its clock closes.`),
    ];
    const finish=()=>void this.change(()=>{
      claimOnce(p,'library_done',()=>{session.exp+=30;this.h.earn(PROLOG_NAGRODA);});advance(p,'library_visit','completed');session.missions[PROLOG_ID]='done';session.flagi.samouczek=1;
    },()=>this.choose());
    const show=(i:number)=>this.h.dialog({title:tx('Bibliotekarz','Librarian'),text:pages[i],buttons:[i<pages.length-1?tx('Dalej','Next'):tx('Dziękuję','Thank you')],onChoose:()=>i<pages.length-1?show(i+1):finish()});
    show(0);
  }
  /** Where next: a reward and 2–3 real directions with an arrow (report #7). */
  private choose(){
    const steps=this.h.nextSteps();
    const text=tx(`Pierwsza służba zakończona. Straż wypłaca ci ${PROLOG_NAGRODA} monet – starczy na pierwszy porządny zakup w sklepie.\n\nCo dalej?`,`First duty complete. The guard pays you ${PROLOG_NAGRODA} coins – enough for your first proper purchase in a shop.\n\nWhat next?`);
    this.h.dialog({title:tx('Pierwsza służba','First duty'),text,wazne:true,buttons:[...steps.map(s=>s.label),tx('Sam wybiorę','I will decide myself')],onChoose:i=>this.h.guide(steps[i]??null)});
  }

  private guide?: { stage: string; from: {x:number;y:number}; next: {x:number;y:number}; at: number };
  private nextWaypoint(pos: {x:number;y:number}) {
    const { x, y } = this.h.player;
    const stage = this.state!.stage;
    const previous = this.guide;
    const now = performance.now();
    if (previous?.stage === stage && (now - previous.at < 600 ||
      (Math.hypot(x - previous.from.x, y - previous.from.y) < 5 * PX_PER_M && now - previous.at < 2000))) return previous.next;
    const from = { x, y };
    const distance = Math.hypot(x - pos.x, y - pos.y);
    const next = distance < 240 * PX_PER_M && !clearWalk(this.h.city, from, pos)
      ? localRoutes(this.h.city, from, Math.min(250 * PX_PER_M, distance + 45 * PX_PER_M)).route(pos)?.next() ?? pos
      : pos;
    this.guide = { stage, from, next, at: now };
    return next;
  }

  goal():QuestInfo|null{
    const p=this.state;
    if (mayStart(p, session.missions[PROLOG_ID]) && !this.h.city.loch) {
      let nearest: { x: number; y: number } | null = null;
      let distance = Infinity;
      for (const place of this.h.city.places) {
        if (place.kind !== 'police') continue;
        const d = Math.hypot(place.door.x-this.h.player.x, place.door.y-this.h.player.y);
        if (d < distance) { distance = d; nearest = place.door; }
      }
      return { id: PROLOG_LEAD_ID, main: true, title: tx('Skąd mam ten uniform?', 'Where did this uniform come from?'),
        text: tx('Skąd mam ten uniform? Nic nie pamiętam. Muszę się dowiedzieć. Porozmawiaj z szefem straży na posterunku.', 'Where did this uniform come from? I remember nothing. I need to find out. Speak to the guard chief at the guard post.'),
        pos: nearest, color: '#ffd76a' };
    }
    if(!p || p.status!=='active')return null;
    const titles:Record<string,[string,string,AnchorKind]>={
      intro:['Podejdź do starszego strażnika i porozmawiaj z nim','Walk up to the senior guard and talk to him','mentor'],letter_deliver:['Dostarcz list dyżurnemu straży','Deliver the letter to the duty officer','outpost'],letter_return:['Oddaj potwierdzenie starszemu strażnikowi','Return the receipt to the senior guard','mentor'],rescue_find:['Odszukaj łucznika','Find the archer','ambush'],rescue_fight:['Obroń łucznika przed chochlikami','Defend the archer from imps','ambush'],rescue_reward:['Porozmawiaj z uratowanym łucznikiem','Talk to the rescued archer','ambush'],bow_trial:['Wypróbuj łuk lub wróć do starszego strażnika','Try the bow or return to the senior guard','bowPractice'],rescue_return:['Zdaj raport starszemu strażnikowi','Report to the senior guard','mentor'],dungeon_enter:['Wejdź do kryjówki po misia','Enter the hideout and find the teddy','dungeonEntrance'],dungeon_first_group:['Oczyść pierwszą komnatę','Clear the first chamber','dungeonEntrance'],magic_pickup:['Dotknij różdżki i kapelusza','Touch the wand and hat','dungeonEntrance'],magic_trial:['Wypróbuj magię i odzyskaj misia','Try magic and recover the teddy','dungeonEntrance'],dungeon_recover:['Odzyskaj misia z kryjówki','Recover the teddy from the hideout','dungeonEntrance'],dungeon_return:['Oddaj misia starszemu strażnikowi','Return the teddy to the senior guard','mentor'],library_visit:['Odwiedź bibliotekarza','Visit the librarian','library']};
    const t=titles[p.stage];if(!t)return null;
    let pos=this.local?this.point(t[2])??null:null;
    if(this.underground){const d=this.h.dungeon();pos=d?(p.stage==='dungeon_return'?d.schody:['dungeon_first_group','magic_pickup'].includes(p.stage)?d.magicSpot:d.skrzynia):null;}
    const elsewhere=!this.local&&!this.underground;
    return {id:PROLOG_ID,main:true,title:tx('Pierwsza służba','First duty'),text:tx(t[0],t[1])+(elsewhere?` — ${tx('kontynuuj w','continue in')} ${p.originName}`:''),pos, waypoint: pos && this.local && ['letter_deliver','letter_return','rescue_find','rescue_fight'].includes(p.stage) ? this.nextWaypoint(pos) : undefined, color:'#ffd76a'};
  }
  private clearObjects(){for(const o of this.objects)o.destroy();this.objects=[];this.nameplates.clear();}
  destroy(){this.destroyed=true;this.clearObjects();}
}
