import Phaser from 'phaser';
import { session } from '../quests';
import { gear, item, addItem, equipFromBag, meleeDamage } from '../inventory';
import { PLECAK } from '../content/przedmioty';
import { zasoby, maxMany } from '../content/zasoby';
import { poziomPostaci } from '../content/historia';
import { PX_PER_M, type CityMap } from '../map/CityMap';
import { loadingMapVisible } from '../ui/loadingMap';
import { tx } from '../i18n';
import { ensureModul, fitHd } from '../sprites';
import { TEX, artScale } from '../art';
import { PROLOG_ID, PROLOG_LEAD_ID, freshProlog, mayStart, advance, claimOnce, recordKill, type AnchorKind, type PrologState } from '../prolog/state';
import { equipStoryItem } from '../prolog/rewards';
import { planAnchors } from '../prolog/planner';
import { idLochu } from '../loch/mapa';
import { hashLochu } from '../loch/plan';
import type { DialogRequest, QuestInfo } from './GameScene';
import type { Player } from '../objects/Player';
import type { Slime } from '../objects/Slime';
import type { LochWnetrze, LochyWejscia, WejscieLochu } from './Lochy';

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
}

/** Existing combat, map, inventory and dungeon; this class owns only the origin story. */
export class PrologRekruta {
  private objects: Phaser.GameObjects.GameObject[] = [];
  private enemies = new Map<RecruitEnemy, number>();
  private rendered = '';
  private planning = false;
  private dirty = false;
  private destroyed = false;
  private introShown = false;
  busy = false;
  constructor(private h: PrologHost) {}
  get state() { return session.story.prolog; }
  private get local() { return this.state?.originMapId === this.h.city.id; }
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
          matchMedia('(pointer: coarse)').matches ? tx('Chodzisz lewym joystickiem. Przy rozmówcy naciśnij dwa razy ATAK lub stuknij go dwa razy.','Use the left joystick to walk. Near a person, press ATTACK twice or double-tap them.') : tx('Chodzisz WASD lub strzałkami. Podejdź i naciśnij E albo dwukrotnie ATAK.','Walk with WASD or arrow keys. Approach and press E or ATTACK twice.'),6500);
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
    if (this.planning || !this.state || this.state.status !== 'active') return;
    this.planning = true;
    try {
      const p = this.state;
      if (!p.originMapId) {
        p.originMapId = this.h.city.id; p.originName = this.h.mapName;
        // Record ownership before looking for POIs: another city cannot restart an interrupted plan.
        session.missions[PROLOG_ID] = 'active';
        await this.h.save();
      }
      if (!this.local) return;
      const hero = this.h.player;
      await this.h.city.ensure(hero.x, hero.y, 520*PX_PER_M);
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
      this.h.dialog({ title: tx('Pierwsza służba', 'First duty'), text: tx('Nie udało się przygotować pobliskich, przechodnich celów. Spróbuj ponownie po dograniu mapy.', 'Nearby reachable objectives could not be prepared. Retry after the map has loaded.') + ` (${(e as Error).message})`, buttons: [tx('Spróbuj ponownie', 'Retry')], onChoose: () => { this.planning = false; void this.plan(); } });
    } finally { this.planning = false; }
  }

  update() {
    const p = this.state;
    if (!p || this.busy || this.destroyed) return;
    if (p.status !== 'active') { if (this.rendered !== p.status) { this.clearObjects(); this.rendered = p.status; if(p.status==='completed'&&this.local)this.label('mentor',tx('Starszy strażnik','Senior guard')); } return; }
    if (!Object.keys(p.anchors).length) { if (this.h.ready()) void this.plan(); return; }
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
    if (p.stage === 'intro' && this.local && !this.introShown && this.h.ready() && !loadingMapVisible()) {
      this.introShown = true;
      this.mentor();
    }
  }

  private label(k: AnchorKind, name: string, texture?: string) {
    const at = this.point(k); if (!at) return;
    const guard=k==='mentor'||k==='outpost';
    const id=k==='mentor'?'17':guard?'16':k==='ambush'?'12':'19';
    const tex=texture ?? ensureModul(this.h.scene,{g:id,c:guard?'16':id,p:'m',s:0,w:2,u:2,u2:1}) ?? TEX.hero;
    const sprite = this.h.scene.add.sprite(at.x,at.y,tex,'down-0').setScale(artScale(tex)).setDepth(at.y);
    if(tex.startsWith('hd-'))fitHd(sprite);
    this.objects.push(sprite);
    const text = this.h.scene.add.text(at.x,at.y-17,name,{fontFamily:'Alegreya Sans, sans-serif',fontSize:'6px',resolution:4,color:'#fff2d0',backgroundColor:'#241d29',padding:{x:2,y:1}}).setOrigin(.5,1).setDepth(at.y+100);
    this.objects.push(text);
  }
  private draw() {
    const p = this.state!;
    if (this.local) {
      this.label('mentor',tx('! Starszy strażnik','! Senior guard'));
      if (p.stage === 'letter_deliver') this.label('outpost',tx('Dyżurny straży','Duty officer'));
      if (['rescue_fight','rescue_reward','bow_trial'].includes(p.stage)) this.label('ambush',tx('Łucznik','Archer'));
      if (p.stage === 'rescue_fight') this.spawnRescue();
      if (p.stage === 'bow_trial') this.label('bowPractice',tx('◎ Cel treningowy','◎ Practice target'));
      if (p.stage === 'library_visit') this.label('library',p.anchors.library!.fallback ? tx('Dyżur bibliotekarza','Visiting librarian') : tx('Bibliotekarz','Librarian'));
    }
    if (this.underground && ['magic_pickup','magic_trial','dungeon_recover'].includes(p.stage)) {
      const d = this.h.dungeon()!;
      const at = p.stage === 'magic_pickup' ? d.magicSpot : d.skrzynia;
      const text = this.h.scene.add.text(at.x,at.y-8,p.stage === 'magic_pickup' ? '🪄 🎩' : '🧸',{fontSize:'22px'}).setOrigin(.5).setDepth(at.y+2);
      this.objects.push(text);
    }
  }
  private spawnRescue() {
    const p=this.state!, at=this.point('ambush')!;
    for(let i=0;i<2;i++) {
      if(p.rescueKilled.includes(i) || [...this.enemies.values()].includes(i)) continue;
      // Same connected ground as the saved archer; no random respawn into a building.
      const x=at.x+(i?8:-8), y=at.y;
      const pos=this.h.city.isFree(x,y+4,3,2)?{x,y}:at;
      const e=this.h.spawn(pos.x,pos.y); e.temp=true; e.missionId=PROLOG_ID; e.hp=Math.max(2,meleeDamage()*2); e.power=.5;
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
    if(['intro','letter_deliver','letter_return','rescue_fight','rescue_reward','bow_trial','rescue_return'].includes(p.stage))return null;
    if(p.stage==='dungeon_enter')advance(p,'dungeon_enter','dungeon_first_group');
    return p.dungeon.id;
  }

  interact(): boolean {
    const p=this.state; if(!p || this.busy || !p.anchors.mentor)return false;
    if(p.status==='completed'&&this.local&&this.near(this.point('mentor')!)) {
      this.h.dialog({title:tx('Starszy strażnik','Senior guard'),text:tx(`${session.name}, dobra robota. Pierwszą służbę masz już za sobą. Następne zlecenie będzie inne.`,`${session.name}, good work. Your first duty is complete. Your next assignment will be different.`),buttons:[tx('Do zobaczenia','See you')],onChoose:()=>{}});return true;
    }
    if(p.status!=='active')return false;
    if(this.local) {
      if(['intro','letter_return','bow_trial','rescue_return','dungeon_return'].includes(p.stage)&&this.near(this.point('mentor')!)){this.mentor();return true;}
      if(p.stage==='letter_deliver' && this.near(this.point('outpost')!)) {
        this.h.dialog({title:tx('Dyżurny straży','Duty officer'),text:tx('Od patrolowego? Daj tutaj. A to potwierdzenie zabierz z powrotem, bo będzie mnie ścigał, że list zaginął między biurkiem a szufladą.','From the patrol officer? Hand it over. Take this receipt back, or he will insist the letter vanished between my desk and the drawer.'),localHumor:true,buttons:[tx('Odbierz potwierdzenie','Take receipt')],onChoose:()=>void this.change(()=>{p.storyItems=['receipt'];advance(p,'letter_deliver','letter_return');})});return true;
      }
      if(['rescue_reward','bow_trial'].includes(p.stage) && this.near(this.point('ambush')!)) {this.archer();return true;}
      if(p.stage==='bow_trial' && this.near(this.point('bowPractice')!)){this.h.toast(tx('Wyceluj łukiem i strzel. Możesz też wrócić do strażnika i spróbować później.','Aim your bow and shoot. You can also return to the guard and try later.'),5000);return true;}
      if(p.stage==='library_visit' && this.near(this.point('library')!)){this.library();return true;}
    }
    if(this.underground){
      const d=this.h.dungeon()!;
      if(p.stage==='magic_pickup' && this.near(d.magicSpot)) {this.magicPickup();return true;}
      if(['magic_trial','dungeon_recover'].includes(p.stage) && this.near(d.skrzynia)) {
        if(d.zostalo){this.h.toast(tx('Najpierw oczyść kryjówkę chochlików.','Clear the imps\' hideout first.'));return true;}
        this.h.dialog({title:tx('Zguba pod ziemią','Lost underground'),text:tx('Miś jest tutaj. Zabierz go właścicielowi.','The teddy is here. Take it back to its owner.'),buttons:[tx('Zabierz misia','Take teddy')],onChoose:()=>void this.change(()=>{p.storyItems=['bear'];p.dungeon!.chest=true;d.otworzSkrzynie();advance(p,p.stage,'dungeon_return');})});return true;
      }
    }
    return false;
  }

  private mentor() {
    const p=this.state!;
    const title=tx('Starszy strażnik','Senior guard');
    const talk=(text:string,button:string,f:()=>void,humor=false)=>this.h.dialog({title,text,buttons:[button],localHumor:humor,onChoose:()=>void this.change(f)});
    switch(p.stage){
      case 'intro': return talk(tx('To ciebie przysłali? Dobrze. Tylko trzymaj się drogi. Mam dziś dość papierów bez raportu o zgubionym rekrucie.\n\nZaniesiesz list na posterunek. Tam potwierdzą odbiór i wracasz do mnie. Zacznijmy od tego, żeby trafić pod właściwe drzwi.','They sent you? Fine. Stick to the road. I have enough paperwork without a report about a lost recruit.\n\nTake this letter to the guard post. Get a receipt and return here.'),tx('Pokaż drogę','Show the way'),()=>{claimOnce(p,'starter_sword',()=>this.equipSafely('miecz_rekruta'));p.storyItems=['letter'];advance(p,'intro','letter_deliver');},true);
      case 'letter_return': return talk(tx('Jest potwierdzenie. I jesteś ty. Dobry początek.\n\nTeraz druga strona okolicy. Ktoś zgłosił chochliki zaczepiające przechodniów. Sprawdź trakt. Jeśli ktoś potrzebuje pomocy, reaguj.','The receipt is here. And so are you. A good start.\n\nNow the other side of the neighbourhood. Imps are harassing passers-by. Check the road and help anyone in trouble.'),tx('Sprawdzę','I will check'),()=>{claimOnce(p,'letter_done',()=>{session.exp+=20;});p.storyItems=[];advance(p,'letter_return','rescue_fight');},true);
      case 'bow_trial': return talk(tx('Człowiek cały? To najważniejsze. Łuk możesz wypróbować później.\n\nChochliki znoszą kradzione rzeczy do pobliskiego lochu. Zginął między innymi pluszowy miś. Przynieś zgubę. To czyjaś własność — wielkość właściciela nic tu nie zmienia.','Is the traveller safe? That matters most. You can try the bow later.\n\nImps take stolen belongings to a nearby dungeon. A teddy bear is missing. Bring it back. Its owner\'s size does not change our duty.'),tx('Sprawdzę kryjówkę','Search the hideout'),()=>{advance(p,'bow_trial','rescue_return');this.assignDungeon(p);});
      case 'rescue_return': return talk(tx('Człowiek cały? To najważniejsze. Dobra robota. Widzę, że potrafisz coś więcej niż nosić korespondencję.\n\nChochliki znoszą kradzione rzeczy do pobliskiego lochu. Zginął między innymi pluszowy miś. Sprawdź kryjówkę i przynieś zgubę.','Is the traveller safe? That matters most. Good work. You can do more than carry letters.\n\nImps are storing stolen belongings in a nearby dungeon. A teddy bear is missing. Search the hideout and bring it back.'),tx('Sprawdzę kryjówkę','Search the hideout'),()=>this.assignDungeon(p));
      case 'dungeon_return': return talk(tx('Miś wróci do właściciela. A z różdżką… dobra, bez żartów. Na tym się nie znam. Idź do biblioteki. Tam powinni wiedzieć, co trzymasz.\n\nI nie sprawdzaj tego na moim biurku.','The teddy will return to its owner. About that wand… I know little about magic. Visit the librarian; they should know what you found.\n\nAnd do not test it on my desk.'),tx('Odwiedź bibliotekarza','Visit the librarian'),()=>{claimOnce(p,'bear_returned',()=>{session.exp+=50;});p.storyItems=[];advance(p,'dungeon_return','library_visit');},true);
      default: this.h.dialog({title,text:tx('Masz swoje zlecenie. Strzałka i dziennik wskazują następny krok.','You have your assignment. The arrow and journal show the next step.'),buttons:[tx('Wracam do zadania','Back to duty')],onChoose:()=>{}});
    }
  }
  private assignDungeon(p:PrologState){claimOnce(p,'rescue_done',()=>{session.exp+=35;});advance(p,'rescue_return','dungeon_enter');}
  private receive(id:string){if(addItem(id)===false)this.state!.pendingRewards.push(id);}
  private equipSafely(id:string){equipStoryItem(this.state!,gear,id,item(id)!.miejsce,PLECAK.miejsc);}
  private archer(){
    const p=this.state!;
    this.h.dialog({title:tx('Uratowany łucznik','Rescued archer'),text:tx('Dzięki. Jeden od przodu, drugi od tyłu — nie miałem nawet gdzie napiąć cięciwy.\n\nMam zapasowy łuk. Stary, ale sprawny. Weź go, razem ze strzałami. Pokażę ci, jak celować.','Thanks. One in front, one behind — I had no room to draw.\n\nI have an old spare bow. It still works. Take it and these arrows. I will show you how to aim.'),buttons:[tx('Wypróbuj łuk','Try the bow'),tx('Później','Later')],onChoose:i=>void this.change(()=>{
      claimOnce(p,'bow_received',()=>{this.receive('luk_rekruta');gear.ammo.strzaly=Math.min(200,gear.ammo.strzaly+20);});
      advance(p,'rescue_reward','bow_trial');
      if(i===0){const at=gear.bag.findIndex(s=>'item'in s&&s.item==='luk_rekruta');if(at>=0)equipFromBag(at);else if(p.pendingRewards.includes('luk_rekruta')){p.pendingRewards.splice(p.pendingRewards.indexOf('luk_rekruta'),1);this.equipSafely('luk_rekruta');}}
      else advance(p,'bow_trial','rescue_return');
    })});
  }
  private magicPickup(){
    const p=this.state!;
    this.h.dialog({title:tx('Różdżka… i kapelusz?','A wand… and a hat?'),text:tx('Kto zostawia tu takie rzeczy?\n\nGdy dotykasz kompletu, sam wskakuje na miejsce. „Ej, chwila. Ja tego nie zakładam… A ta różdżka chyba działa.”','Who leaves these here?\n\nAs you touch the set, it slips into place by itself. “Wait. I did not put that on… And the wand seems to work.”'),buttons:[tx('Dotknij kompletu','Touch the set')],onChoose:()=>void this.change(()=>{
      claimOnce(p,'magic_set_received',()=>{this.equipSafely('rozdzka_szkolna');this.equipSafely('kapelusz_szkolny');gear.magic=true;zasoby.m=Math.max(zasoby.m,maxMany(poziomPostaci(session.exp)));});
      advance(p,'magic_pickup','magic_trial');
    },()=>this.h.toast(tx('Wyceluj i rzuć pierwsze zaklęcie. Broń możesz zmieniać w plecaku.','Aim and cast your first spell. You can change weapons in your backpack.'),6000))});
  }
  shot(kind:'luk'|'magia'){
    const p=this.state;if(!p || p.status!=='active')return;
    if(kind==='luk'&&p.stage==='bow_trial'&&this.local&&this.near(this.point('bowPractice')!)){p.bowTried=true;advance(p,'bow_trial','rescue_return');this.checkpoint();this.h.hud();}
    if(kind==='magia'&&p.stage==='magic_trial'&&this.underground){p.magicTried=true;advance(p,'magic_trial','dungeon_recover');this.checkpoint();this.h.hud();}
  }
  private library(){
    const p=this.state!;
    this.h.dialog({title:tx('Kto zostawił kapelusz?','Who left the hat?'),text:tx('To komplet do nauki. Kapelusz dostraja różdżkę i pomaga utrzymać zaklęcie. Dlatego zadziałało, choć nikt cię jeszcze nie uczył.\n\nW środku jest znak, ale nie poznaję go. Nie wygląda na znak naszego warsztatu.\n\nMogę pokazać ci podstawy. Sprzęt można zmieniać — nie musisz dzisiaj wybierać na zawsze.','This is a training set. The hat tunes the wand and helps hold a spell. That is why it worked before any lessons.\n\nThere is a mark inside, but I do not recognise it. It is not our workshop\'s mark.\n\nI can show you the basics. You can change equipment; this is not a permanent choice.'),buttons:[tx('Poznaj podstawy','Learn the basics')],onChoose:()=>void this.change(()=>{
      claimOnce(p,'library_done',()=>{session.exp+=30;});advance(p,'library_visit','completed');session.missions[PROLOG_ID]='done';session.flagi.samouczek=1;
    },()=>this.h.toast(tx('Pierwsza służba ukończona. Nadal służysz w mundurze; dalsze zlecenia straży pojawią się osobno.','First duty complete. You still serve in uniform; further guard assignments will follow separately.'),6000))});
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
      intro:['Porozmawiaj ze starszym strażnikiem','Talk to the senior guard','mentor'],letter_deliver:['Dostarcz list do punktu straży','Deliver the letter to the guard post','outpost'],letter_return:['Oddaj potwierdzenie instruktorowi','Return the receipt to the instructor','mentor'],rescue_fight:['Obroń łucznika przed chochlikami','Defend the archer from imps','ambush'],rescue_reward:['Porozmawiaj z uratowanym łucznikiem','Talk to the rescued archer','ambush'],bow_trial:['Wypróbuj łuk lub wróć do instruktora','Try the bow or return to the instructor','bowPractice'],rescue_return:['Zdaj raport instruktorowi','Report to the instructor','mentor'],dungeon_enter:['Wejdź do kryjówki po misia','Enter the hideout and find the teddy','dungeonEntrance'],dungeon_first_group:['Oczyść pierwszą komnatę','Clear the first chamber','dungeonEntrance'],magic_pickup:['Dotknij różdżki i kapelusza','Touch the wand and hat','dungeonEntrance'],magic_trial:['Wypróbuj magię i odzyskaj misia','Try magic and recover the teddy','dungeonEntrance'],dungeon_recover:['Odzyskaj misia z kryjówki','Recover the teddy from the hideout','dungeonEntrance'],dungeon_return:['Oddaj misia instruktorowi','Return the teddy to the instructor','mentor'],library_visit:['Odwiedź bibliotekarza','Visit the librarian','library']};
    const t=titles[p.stage];if(!t)return null;
    let pos=this.local?this.point(t[2])??null:null;
    if(this.underground){const d=this.h.dungeon();pos=d?(p.stage==='dungeon_return'?d.schody:['dungeon_first_group','magic_pickup'].includes(p.stage)?d.magicSpot:d.skrzynia):null;}
    const elsewhere=!this.local&&!this.underground;
    return {id:PROLOG_ID,main:true,title:tx('Pierwsza służba','First duty'),text:tx(t[0],t[1])+(elsewhere?` — ${tx('kontynuuj w','continue in')} ${p.originName}`:''),pos,color:'#ffd76a'};
  }
  private clearObjects(){for(const o of this.objects)o.destroy();this.objects=[];}
  destroy(){this.destroyed=true;this.clearObjects();}
}
