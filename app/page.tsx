'use client';
import {FarmTutorial,type TutorialFocus} from './farm-tutorial';
import type {FarmItem} from '@/lib/game/farm-tools';
import {GameLoading} from './game-loading';
import {StarBadge} from './quality-ui';
import type {Stars} from '@/lib/game/quality';
import {CookingPanel} from './cooking-ui';
import {JourneyMap,PermanentUpgrades,CompostRecipes} from './progression-ui';
import {CHALLENGES,type Challenge} from '@/lib/game/progression';
import {Maximize,Minimize,Map as MapIcon,CheckCheck} from 'lucide-react';
import {useCallback,useEffect,useRef,useState} from 'react';
import {Sparkles,ChevronsUp,FastForward} from 'lucide-react';
import {freshBuild,xpNeeded} from '@/lib/game/build';
import {FarmHotbar} from './farm-hotbar';
import {BuildSummary,RecipeBook,UpgradeCards} from './build-ui';
import {Inventory,LootArt,CombatBelt} from './inventory-ui';
import {ForgeStation} from './forge-ui';
import {CompanionTalk,IslandPortal} from './island-ui';
import {Sprout,Sun,Moon,Swords,CookingPot,Volume2,VolumeX,HelpCircle,ArrowRight,Leaf,Droplets,Mountain,Heart,Wind,Flame,Check,Lock,ChevronRight,Pause,Play,Home as HomeIcon,Star,Package,ArrowUp,ArrowDown,ArrowLeft} from 'lucide-react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {Progress} from '@/components/ui/progress';
import {CROPS,HEROES,freshFarm,emptyLoot,type CropId,type HeroId} from '@/lib/game/state';
import type {WildseedGame,View} from '@/lib/game/scene';

const cropIds=Object.keys(CROPS) as CropId[];
const initial:View={held:'sunroot',exitReady:false,nearExit:false,nearby:null,build:freshBuild(),choices:[],xp:0,xpNext:xpNeeded(1),farm:freshFarm(),mode:'farm',ready:false,error:'',selected:0,inReach:false,seed:'sunroot',hp:100,maxHp:100,time:0,kills:0,level:1,dash:0,loot:emptyLoot(),upgrade:false,result:null,message:'',paused:false,saved:true,meal:null,tier:1};
function CropIcon({id,size=32}:{id:CropId;size?:number}){return <LootArt kind="crop" crop={id} size={size}/>;}
function countTime(t:number){return Math.floor(t/60)+':'+String(Math.floor(t%60)).padStart(2,'0');}

export default function Home(){
 const mount=useRef<HTMLDivElement>(null),game=useRef<WildseedGame|null>(null);
 const [v,setV]=useState<View>(initial),[started,setStarted]=useState(false),[modal,setModal]=useState<'forge'|'kitchen'|'travel'|'help'|'hero'|'garden'|'inventory'|'build'|'map'|null>(null),[muted,setMuted]=useState(false),[userPaused,setUserPaused]=useState(false),[volume,setVolume]=useState(.7);
 useEffect(()=>{try{setMuted(localStorage.getItem('wildseed-muted')==='true');setVolume(Math.max(0,Math.min(1,Number(localStorage.getItem('wildseed-volume')??.7))));}catch{}},[]);
 const focusTutorial=useCallback((focus:TutorialFocus,plot:number|null)=>game.current?.tutorialFocus(focus,plot),[]);
 const [tutorialTool,setTutorialTool]=useState<FarmItem|null>(null),[tutorialReplay,setTutorialReplay]=useState(0);

 const [fullscreen,setFullscreen]=useState(false),[fullscreenAvailable,setFullscreenAvailable]=useState(false),[screenError,setScreenError]=useState('');
 useEffect(()=>{
  const sync=()=>setFullscreen(Boolean(document.fullscreenElement));
  const context=(e:MouseEvent)=>{e.preventDefault();};
  setFullscreenAvailable(Boolean(document.fullscreenEnabled));sync();
  document.addEventListener('fullscreenchange',sync);
  document.addEventListener('contextmenu',context);
  return()=>{document.removeEventListener('fullscreenchange',sync);document.removeEventListener('contextmenu',context);};
 },[]);
 const toggleFullscreen=async()=>{setScreenError('');try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{setScreenError('Fullscreen unavailable in this browser.');}};
 const [talkHero,setTalkHero]=useState<HeroId|null>(null);
 useEffect(()=>{let cancelled=false;import('../lib/game/scene').then(async({WildseedGame})=>{await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));if(cancelled||!mount.current)return;try{game.current=new WildseedGame(mount.current,setV,service=>{setTalkHero(service.hero??null);setModal(service.kind);});}catch(e){console.error(e);setV(s=>({...s,error:'This browser could not start 3D graphics. Try a browser with WebGL enabled.'}));}}).catch(()=>setV(s=>({...s,error:'The game could not load. Please reload to try again.'})));return()=>{cancelled=true;game.current?.dispose();game.current=null;};},[]);
 useEffect(()=>{game.current?.setPaused(Boolean(modal)||userPaused);},[modal,userPaused]);
 useEffect(()=>{const key=(e:KeyboardEvent)=>{if(!started||v.upgrade||v.result||e.repeat||e.ctrlKey||e.metaKey||e.altKey)return;const target=e.target as HTMLElement;if(target?.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(target?.tagName))return;const menu=e.key.toLowerCase()==='i'?'inventory':e.key.toLowerCase()==='b'?'build':e.key.toLowerCase()==='m'?'map':null;if(menu){e.preventDefault();setModal(current=>current===menu?null:menu);}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[started,v.upgrade,v.result]);
 const p=v.farm.plots[v.selected],hero=HEROES[v.farm.hero],isFarm=v.mode==='farm';
 const open=(name:typeof modal)=>{setModal(name);};
 const launch=(tier:number,challenge:Challenge='calm',meals:CropId[]=[],stars?:Stars)=>{if(game.current?.expedition(tier,challenge,meals,stars)){setModal(null);setUserPaused(false);}};
 const setMute=()=>{setMuted(!muted);game.current?.setMuted(!muted);try{localStorage.setItem('wildseed-muted',String(!muted));}catch{}};
 return <main className={'game-shell '+(!isFarm?'in-dungeon':'')}>
  <div className="world" ref={mount} aria-label="Interactive 3D Axie farm and survival arena"/>

  <header className="topbar quiet-topbar">
   <div className="wordmark"><Sprout/><strong>Wildseed</strong></div>
   <div className={'day-chip'+(!isFarm&&(v.waveBreak??0)>0?' wave-rest':'')} title={!isFarm?CHALLENGES[v.challenge??'calm'].name:undefined} aria-label={isFarm?'Day '+v.farm.day:'Expedition time'}>{isFarm?<Sun size={18}/>:<Moon size={18}/>} {isFarm?'Day '+v.farm.day:'Wave '+(v.wave??1)+((v.waveBreak??0)>0?' · '+Math.ceil(v.waveBreak!)+'s':'')}{!isFarm&&<><StarBadge value={v.build.keyStars??1}/>{!(v.waveBreak??0)&&<span className="wave-remaining" title="Enemies remaining"><Swords size={13}/>{v.enemiesLeft??0}</span>}</>}</div>
   <nav className="utility" aria-label="Game controls">
    {started&&<button title="Inventory · I" aria-label="Inventory · I" onClick={()=>open('inventory')}><Package size={20}/><span>Bag</span><kbd>I</kbd></button>}
    {started&&<button title="Spells & combinations · B" aria-label="Spells & combinations" onClick={()=>open('build')}><Sparkles size={20}/><span>Spells</span><kbd>B</kbd></button>}
    {started&&<button title="Map & discoveries · M" aria-label="Map & discoveries" onClick={()=>open('map')}><MapIcon size={20}/><span>Journal</span><kbd>M</kbd></button>}
    {started&&<button title={userPaused?'Resume':'Pause'} aria-label={userPaused?'Resume':'Pause'} onClick={()=>setUserPaused(!userPaused)}>{userPaused?<Play size={18}/>:<Pause size={18}/>}<span>Menu</span></button>}
   </nav>
  </header>
  {!started&&!v.error&&<GameLoading ready={v.ready} done={v.loadingDone} total={v.loadingTotal} onStart={()=>{if(!game.current?.ready)return;setStarted(true);game.current.setMuted(muted);game.current.start();}}/>}
  {started&&isFarm&&<>
   <FarmHotbar view={v} guided={tutorialTool} locked={!!modal||userPaused||!!v.result} onSelect={item=>game.current?.selectFarmItem(item)}/>
   {v.nearby&&!modal&&!userPaused&&<button className="island-interact panel" onClick={()=>game.current?.interact()}><kbd>E</kbd>{v.nearby.hero?HEROES[v.nearby.hero].name:v.nearby.label}</button>}
  </>}
  {started&&!isFarm&&<>
   {v.boss&&<div className={'boss-vitals'+(v.boss.enraged?' enraged':'')} role="group" aria-label={v.boss.name}><strong>{v.boss.name}{v.boss.enraged&&<span aria-label="Enraged"> ◆</span>}</strong><div role="progressbar" aria-label="Boss health" aria-valuenow={Math.ceil(v.boss.hp)} aria-valuemin={0} aria-valuemax={Math.ceil(v.boss.max)}><i style={{width:Math.max(0,v.boss.hp/v.boss.max*100)+'%',background:v.boss.color}}/></div></div>}
   <aside className={'vitals panel'+(v.hp/v.maxHp<=.25?' low-health':'')} aria-label="Expedition status"><img src={'/assets/axie/'+v.farm.hero+'.png'} alt={hero.name}/><div className="vitals-bars"><div><Heart size={14}/><b>{Math.ceil(v.hp)} / {v.maxHp}</b><span title="Level"><Star size={14}/>{v.level}</span></div><Progress value={v.hp/v.maxHp*100} className="health-progress" aria-label="Health"/><Progress value={v.xp/v.xpNext*100} className="xp-progress" aria-label={'Experience: '+v.xp+' / '+v.xpNext}/></div></aside><CombatBelt view={v} onOpen={()=>open('build')}/>
   
  </>}

  {started&&!isFarm&&!modal&&!userPaused&&!v.upgrade&&!v.result&&!v.nearExit&&v.exitReady&&<div className="home-bearing panel" title="Home portal" aria-label={'Home portal '+Math.ceil(v.exitDistance??0)+' meters away'}><ArrowUp size={18} style={{transform:'rotate('+(v.exitBearing??0)+'rad)'}}/><span>Home</span><b>{Math.ceil(v.exitDistance??0)}m</b></div>}
  {started&&!isFarm&&!modal&&!userPaused&&!v.upgrade&&!v.result&&v.nearExit&&<button className="island-interact panel" onClick={()=>game.current?.returnHome()}><kbd>E</kbd>Return home</button>}
  {started&&!modal&&!userPaused&&!v.upgrade&&!v.result&&<div className="traversal-actions"><button className="panel" title="Jump / double jump · Space" aria-label="Jump or double jump" onClick={()=>game.current?.jumpNow()}><ChevronsUp size={23}/><kbd>SPACE</kbd></button><button className="panel" title="Dash · Q" aria-label="Dash" disabled={v.dash>0} onClick={()=>game.current?.dashNow()}><Wind size={23}/><kbd>{v.dash>0?v.dash.toFixed(1):'Q'}</kbd></button><button className="panel touch-sprint" title="Hold to sprint" aria-label="Hold to sprint" onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);game.current?.moveKey('shift',true);}} onPointerUp={()=>game.current?.moveKey('shift',false)} onPointerCancel={()=>game.current?.moveKey('shift',false)}><FastForward size={23}/></button></div>}
  {started&&!modal&&!userPaused&&!v.upgrade&&!v.result&&<div className="touch-controls" aria-label="Touch movement">{[['w',ArrowUp],['a',ArrowLeft],['s',ArrowDown],['d',ArrowRight]].map(([key,Icon])=>{const I=Icon as typeof ArrowUp;return <button key={key as string} aria-label={'Move '+key} onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);game.current?.moveKey(key as string,true);}} onPointerUp={()=>game.current?.moveKey(key as string,false)} onPointerCancel={()=>game.current?.moveKey(key as string,false)}><I size={23}/></button>;})}</div>}
  {started&&<FarmTutorial key={tutorialReplay} view={v} replay={tutorialReplay>0} hidden={!!modal||userPaused||!!v.result||v.upgrade} onGuide={setTutorialTool} onFocus={focusTutorial}/>}
  {screenError&&<output className="toast" role="status" onClick={()=>setScreenError("")}>{screenError}</output>}
  {v.message&&started&&!modal&&!v.result&&!v.upgrade&&<output className="toast" aria-live="polite"><Leaf size={18}/>{v.message}</output>}
  {userPaused&&!modal&&<div className="pause-cover"><div className="panel pause-card"><Moon size={30}/><h2>Paused</h2><div className="pause-tools">{fullscreenAvailable&&<button title={fullscreen?"Exit fullscreen":"Fullscreen"} aria-label={fullscreen?"Exit fullscreen":"Fullscreen"} className="secondary" onClick={toggleFullscreen}>{fullscreen?<Minimize size={19}/>:<Maximize size={19}/>}</button>}<button title={muted?'Enable sound':'Mute sound'} aria-label={muted?'Enable sound':'Mute sound'} className="secondary" onClick={setMute}>{muted?<VolumeX size={19}/>:<Volume2 size={19}/>}</button><button title="Help & credits" aria-label="Help & credits" onClick={()=>{setUserPaused(false);open('help');}} className="secondary"><HelpCircle size={20}/></button></div><label className="setting-row">Reduce motion<input type="checkbox" checked={v.reducedMotion??false} onChange={e=>game.current?.setReducedMotion(e.target.checked)}/></label><label className="setting-row">Volume<input type="range" aria-label="Sound volume" min="0" max="1" step=".05" value={volume} onChange={e=>{setVolume(Number(e.target.value));game.current?.setVolume(Number(e.target.value));}}/></label><span className="save-status">{v.saved?<><CheckCheck size={16}/> Saved</>:'Save unavailable'}</span><button className="primary" onClick={()=>setUserPaused(false)}><Play size={18}/> Resume</button></div></div>}
  {v.error&&<div className="error-panel panel" role="alert"><h2>Lunacia needs a moment</h2><p>{v.error}</p><button className="primary" onClick={()=>location.reload()}>Reload game</button></div>}
  <Dialog open={modal!==null} onOpenChange={value=>{if(!value)setModal(null);}}><DialogContent className={'game-dialog '+(modal==='inventory'?'inventory-dialog':['forge','kitchen','travel','hero'].includes(modal??'')?'service-dialog':'')}>
   <DialogTitle className="dialog-title">{modal==='forge'?'Key Forge':modal==='kitchen'?'Campfire':modal==='travel'?'Portal':modal==='hero'?(talkHero?HEROES[talkHero].name:'Axie'):modal==='garden'?'Garden':modal==='inventory'?'Inventory':modal==='build'?'Spellbook':modal==='map'?'Island journal':'How to play'}</DialogTitle>
   <DialogDescription className="sr-only">{modal==='forge'?'Choose a key recipe to forge using your crops.':modal==='kitchen'?'Choose a meal to cook. Pack up to four meals at the dungeon portal.':modal==='travel'?'Seeds, fertilizer, and rich soil are waiting beyond the garden.':modal==='hero'?'Choose your companion.':modal==='garden'?'Equip seeds, a watering can, or a sickle, then press E at a bed.':modal==='build'?'Four spell slots. Four item slots. A new build every expedition.':modal==='inventory'?'Your supplies and expedition finds.':'Grow, cook, explore. Bring your next harvest home.'}</DialogDescription>

   {modal==='garden'&&<div className="garden-menu"><div className="plot-grid" aria-label="Garden overview">{v.farm.plots.map((plot,i)=><div key={i} className={'plot-cell '+(v.selected===i?'selected ':'')+(plot.crop&&plot.growth>=1?'ripe ':'')+(plot.rich?'rich ':'')} title={'Bed '+(i+1)+(plot.crop?' · '+CROPS[plot.crop].name:' · Empty')} aria-label={'Bed '+(i+1)+(plot.crop?plot.growth>=1?' ready to harvest':plot.watered?' growing':' needs water':' empty')}>{plot.crop?<CropIcon id={plot.crop}/>:<span>+</span>}{plot.crop&&!plot.watered&&<i className="water-dot"/>}{plot.crop&&plot.growth>=1&&<i className="ripe-dot"/>}</div>)}</div><div className="bed-state"><strong>Nearest bed {v.selected+1}</strong><span>{p.crop?CROPS[p.crop].name+' · '+(p.growth>=1?'Ready':p.watered?Math.round(p.growth*100)+'%':'Needs water'):'Empty'}{p.rich?' · Rich soil':''}</span></div><button className="primary" onClick={()=>setModal(null)}>Back to the farm <Sprout size={18}/></button></div>}
   {modal==='build'&&<>{!isFarm&&<BuildSummary build={v.build}/>}<RecipeBook build={v.build}/></>}
   {modal==='map'&&<JourneyMap view={v}/>}
   {modal==='inventory'&&<><Inventory view={v} onSeed={id=>{game.current?.selectSeed(id);setModal(null);}} onMeal={()=>setModal('travel')} onReturn={()=>{setModal(null);game.current?.escape();}}/>{isFarm&&<PermanentUpgrades farm={v.farm} onBuy={id=>game.current?.permanentUpgrade(id)}/>}</>}

   {modal==='kitchen'&&<><CookingPanel farm={v.farm} onCook={id=>game.current?.cookMeal(id)??0}/><CompostRecipes farm={v.farm} onMix={kind=>game.current?.mixCompost(kind)}/></>}
   {modal==='travel'&&<IslandPortal farm={v.farm} onEnter={launch}/>}
   {modal==='forge'&&<ForgeStation farm={v.farm} onCraft={tier=>game.current?.craftDungeonKey(tier)??0}/>}
   {modal==='hero'&&talkHero&&<CompanionTalk farm={v.farm} id={talkHero} onClose={()=>setModal(null)} onChoose={()=>{game.current?.selectHero(talkHero);setModal(null);}}/>}
   {modal==='help'&&<div className="help-content"><button className="primary" onClick={()=>{setTutorialReplay(n=>n+1);setModal(null);}}>Replay farming tutorial</button><ol><li><strong>Grow.</strong> Equip a seed to plant, the watering can (2) to water, or the sickle (3) to harvest. Press E near a bed. Slots 6–7 hold fertilizer and soil. Click any slot on touch screens.</li><li><strong>Look around.</strong> Drag the world to rotate the camera. Distance is fixed. V resets the view behind your Axie. WASD moves relative to the camera.</li><li><strong>Prepare.</strong> Press E at the campfire to cook. Pair meals for bonuses; 3 or 4 different dishes raise supply drops. Rare crops return a seed at harvest. Talk to the other Axies to switch character.</li><li><strong>Explore.</strong> Attacks fire automatically. Move with WASD, arrow keys, or click/tap the ground. Space jumps; press it again for a double jump. Hold Shift to sprint and press Q to dash, even in the air.</li><li><strong>Build your spells.</strong> Collect the XP gems dropped by enemies. Pick a spell or item at each level-up, upgrade it to level 3, and find its partner to unlock an evolution. Press B for recipes, or I to open your inventory. Equipment resets each expedition.</li><li><strong>Bring it home.</strong> Pick up rare seed packets and supplies dropped in battle. Press E at the home portal whenever you want to keep your loot. Waves continue automatically. Dying loses all loot collected during the run.</li><li><strong>Go deeper.</strong> Harvest 24 Sunroot and craft a Grove Key at the anvil. Every dungeon entry consumes its key.</li></ol><p>Garden progress saves locally in this browser. Farming pauses when this tab is hidden or a menu is open.</p><div className="credits"><strong>Made for Axie Vibeathon</strong><p>Axie Origins sound effects and Axie and Sapidae characters, models, textures and animations belong to Sky Mavis and its licensors. Supplied via the event's Axie 3D asset pack. Terrain and rock generation use GameBlocks by Weihao Cheng (MIT). Crop designs and game systems are original prototype work.</p><a href="/licenses/axie-3d-RIGHTS.md" target="_blank" rel="noreferrer">Axie asset permission ↗</a><a href="/licenses/axie-3d-THIRD_PARTY_NOTICES.md" target="_blank" rel="noreferrer">Third-party notices ↗</a><a href="/licenses/axie-origins-audio-LICENSE.md" target="_blank" rel="noreferrer">Axie audio permission ↗</a><a href="/licenses/GameBlocks-LICENSE.txt" target="_blank" rel="noreferrer">GameBlocks license</a><a href="/assets/fonts/PixelifySans-OFL.txt" target="_blank" rel="noreferrer">Pixelify Sans font license</a><small>Unofficial work in progress. No wallet needed.</small></div></div>}
  </DialogContent></Dialog>
  <Dialog open={v.upgrade} onOpenChange={()=>{}}><DialogContent className="game-dialog upgrade-dialog power-dialog" showCloseButton={false}>
   <div className="power-heading"><DialogTitle className="dialog-title">Level up</DialogTitle><span className="power-level" aria-label={"Level "+v.level}>{v.level}</span></div>
   <DialogDescription className="sr-only">Choose one upgrade.</DialogDescription>
   {v.upgrade&&<UpgradeCards key={v.level} choices={v.choices} build={v.build} onChoose={id=>game.current?.chooseUpgrade(id)}/>}
  </DialogContent></Dialog>
  <Dialog open={v.result!==null} onOpenChange={value=>{if(!value)game.current?.dismissResult();}}><DialogContent className="game-dialog result-dialog"><DialogTitle className="dialog-title">{v.result?.outcome==='lost'?'Defeated':'Your haul'}</DialogTitle><DialogDescription>{v.result?.outcome==='lost'?'Run loot lost.':'All finds kept.'}</DialogDescription>{v.result&&<><div className="result-stats"><span><Swords size={18}/>{v.result.kills}</span><span><Sun size={18}/>Day {v.farm.day}</span></div><div className="result-loot">{cropIds.filter(id=>v.result!.loot[id]>0).map(id=><div key={id}><LootArt kind="seed" crop={id} size={32}/><strong>+{v.result!.loot[id]}</strong><span>{CROPS[id].name} seeds</span></div>)}<div><LootArt kind="fertilizer" size={32}/><strong>+{v.result.loot.fertilizer}</strong><span>Fertilizer</span></div><div><Mountain size={24}/><strong>+{v.result.loot.soil}</strong><span>Rich soil</span></div></div><button className="primary" onClick={()=>game.current?.dismissResult()}>Back to my garden <Sprout size={18}/></button></>}</DialogContent></Dialog>
 </main>;
}

