'use client';
import {useEffect,useRef,useState} from 'react';
import {Sparkles,ChevronsUp,FastForward} from 'lucide-react';
import {freshBuild,xpNeeded} from '@/lib/game/build';
import {BuildSummary,RecipeBook,UpgradeCards} from './build-ui';
import {Inventory,LootArt,CombatBelt} from './inventory-ui';
import {CompanionTalk,IslandPortal} from './island-ui';
import {Sprout,Sun,Moon,Swords,CookingPot,Volume2,VolumeX,HelpCircle,ArrowRight,Leaf,Droplets,Mountain,Heart,Wind,Flame,Check,Lock,ChevronRight,Pause,Play,Home as HomeIcon,Star,Package,ArrowUp,ArrowDown,ArrowLeft} from 'lucide-react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {Progress} from '@/components/ui/progress';
import {CROPS,HEROES,freshFarm,type CropId,type HeroId} from '@/lib/game/state';
import type {WildseedGame,View} from '@/lib/game/scene';

const cropIds=Object.keys(CROPS) as CropId[];
const initial:View={exitReady:false,nearExit:false,nearby:null,build:freshBuild(),choices:[],xp:0,xpNext:xpNeeded(1),farm:freshFarm(),mode:'farm',ready:false,error:'',selected:0,inReach:false,seed:'sunroot',hp:100,maxHp:100,time:0,kills:0,level:1,dash:0,loot:{sunroot:0,moonberry:0,embercorn:0,fertilizer:0,soil:0},upgrade:false,result:null,message:'',paused:false,saved:true,meal:null,tier:1};
function CropIcon({id,size=32}:{id:CropId;size?:number}){return <LootArt kind="crop" crop={id} size={size}/>;}
function countTime(t:number){return Math.floor(t/60)+':'+String(Math.floor(t%60)).padStart(2,'0');}

export default function Home(){
 const mount=useRef<HTMLDivElement>(null),game=useRef<WildseedGame|null>(null);
 const [v,setV]=useState<View>(initial),[started,setStarted]=useState(false),[modal,setModal]=useState<'kitchen'|'travel'|'help'|'hero'|'garden'|'inventory'|'build'|null>(null),[muted,setMuted]=useState(false),[userPaused,setUserPaused]=useState(false);
 useEffect(()=>{try{setMuted(localStorage.getItem('wildseed-muted')==='true');}catch{}},[]);
 const [talkHero,setTalkHero]=useState<HeroId|null>(null);
 useEffect(()=>{let cancelled=false;import('../lib/game/scene').then(({WildseedGame})=>{if(cancelled||!mount.current)return;try{game.current=new WildseedGame(mount.current,setV,service=>{setTalkHero(service.hero??null);setModal(service.kind);});}catch(e){console.error(e);setV(s=>({...s,error:'This browser could not start 3D graphics. Try a browser with WebGL enabled.'}));}}).catch(()=>setV(s=>({...s,error:'The game could not load. Please reload to try again.'})));return()=>{cancelled=true;game.current?.dispose();game.current=null;};},[]);
 useEffect(()=>{game.current?.setPaused(Boolean(modal)||userPaused);},[modal,userPaused]);
 useEffect(()=>{const key=(e:KeyboardEvent)=>{if(!started||v.upgrade||v.result||e.repeat||e.ctrlKey||e.metaKey||e.altKey)return;const target=e.target as HTMLElement;if(target?.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(target?.tagName))return;const menu=e.key.toLowerCase()==='i'?'inventory':e.key.toLowerCase()==='b'?'build':null;if(menu){e.preventDefault();setModal(current=>current===menu?null:menu);}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[started,v.upgrade,v.result]);
 const p=v.farm.plots[v.selected],hero=HEROES[v.farm.hero],isFarm=v.mode==='farm';
 const actLabel=!v.inReach?'Move closer':!p.crop?'Plant':p.growth>=1?'Harvest':!p.watered?'Water':Math.round(p.growth*100)+'%';
 const open=(name:typeof modal)=>{setModal(name);};
 const launch=(tier:number)=>{setModal(null);setUserPaused(false);game.current?.expedition(tier);};
 const setMute=()=>{setMuted(!muted);game.current?.setMuted(!muted);try{localStorage.setItem('wildseed-muted',String(!muted));}catch{}};
 return <main className={'game-shell '+(!isFarm?'in-dungeon':'')}>
  <div className="world" ref={mount} aria-label="Interactive 3D Axie farm and survival arena"/>

  <header className="topbar quiet-topbar">
   <div className="wordmark"><Sprout/><strong>Wildseed</strong></div>
   <div className="day-chip" aria-label={isFarm?'Day '+v.farm.day:'Expedition time'}>{isFarm?<Sun size={18}/>:<Moon size={18}/>} {isFarm?'Day '+v.farm.day:v.exitReady?'Cleared':countTime(v.time)+' / 1:30'}</div>
   <nav className="utility" aria-label="Game controls">
    {started&&<button title="Inventory · I" aria-label="Inventory · I" onClick={()=>open('inventory')}><Package size={20}/><kbd>I</kbd></button>}
    {started&&<button title="Spells & combinations · B" aria-label="Spells & combinations" onClick={()=>open('build')}><Sparkles size={20}/><kbd>B</kbd></button>}
    <button title={muted?'Enable sound':'Mute sound'} aria-label={muted?'Enable sound':'Mute sound'} onClick={setMute}>{muted?<VolumeX size={19}/>:<Volume2 size={19}/>}</button>
    {started&&<button title={userPaused?'Resume':'Pause'} aria-label={userPaused?'Resume':'Pause'} onClick={()=>setUserPaused(!userPaused)}>{userPaused?<Play size={18}/>:<Pause size={18}/>}</button>}
    <button title="Help & credits" aria-label="Help & credits" onClick={()=>open('help')}><HelpCircle size={20}/></button>
   </nav>
  </header>
  {!started&&<section className="quiet-welcome panel"><span className="menu-kicker">LUNACIA</span><h1>Wildseed</h1><button className="primary" disabled={!v.ready||!!v.error} onClick={()=>{setStarted(true);game.current?.setMuted(muted);game.current?.start();}}>{v.ready?'Enter Lunacia':'Loading...'}<Play size={18}/></button></section>}
  {started&&isFarm&&<>
   {v.inReach&&!v.nearby&&<div className="farm-dock panel" data-action={!p.crop?"plant":p.growth>=1?"harvest":!p.watered?"water":"grow"} aria-label="Garden actions">
    <div className="seed-slots" aria-label="Select a seed">{cropIds.map((id,i)=><button key={id} className={'seed-slot '+id+(v.seed===id?' active':'')} title={CROPS[id].name+' · '+v.farm.seeds[id]+' seeds · '+(i+1)} aria-label={CROPS[id].name+' · '+v.farm.seeds[id]+' seeds'} aria-pressed={v.seed===id} onClick={()=>game.current?.selectSeed(id)}><LootArt kind="seed" crop={id} size={36}/><kbd>{i+1}</kbd><b>{v.farm.seeds[id]}</b></button>)}</div>
    <div className="tend-slot"><button className="primary compact-tend" disabled={!v.inReach||!!p.crop&&p.watered&&p.growth<1||!p.crop&&v.farm.seeds[v.seed]<1} onClick={()=>game.current?.tendPlot()}>{p.crop&&!p.watered&&p.growth<1?<Droplets size={17}/>:<Sprout size={17}/>} {actLabel}<kbd>E</kbd></button></div>
    <div className="supply-slots"><button title="Fertilizer · Speed up this crop" aria-label={'Fertilize nearest bed · '+v.farm.fertilizer+' available'} disabled={!v.inReach||!p.crop||p.growth>=1||p.fertilized||v.farm.fertilizer<1} onClick={()=>game.current?.improvePlot('fertilizer')}><LootArt kind="fertilizer" size={34}/><b>{v.farm.fertilizer}</b></button><button title="Rich soil · Improve growth and yield" aria-label={'Improve nearest bed soil · '+v.farm.soil+' available'} disabled={!v.inReach||p.rich||v.farm.soil<1} onClick={()=>game.current?.improvePlot('soil')}><LootArt kind="soil" size={34}/><b>{v.farm.soil}</b></button></div>
   </div>}
   {v.nearby&&!modal&&!userPaused&&<button className="island-interact panel" onClick={()=>game.current?.interact()}><kbd>E</kbd>{v.nearby.hero?HEROES[v.nearby.hero].name:v.nearby.label}</button>}
  </>}
  {started&&!isFarm&&<>
   <aside className="vitals panel" aria-label="Expedition status"><img src={'/assets/axie/'+v.farm.hero+'.png'} alt={hero.name}/><div className="vitals-bars"><div><Heart size={14}/><b>{Math.ceil(v.hp)} / {v.maxHp}</b><span title="Level"><Star size={14}/>{v.level}</span></div><Progress value={v.hp/v.maxHp*100} className="health-progress" aria-label="Health"/><Progress value={v.xp/v.xpNext*100} className="xp-progress" aria-label={'Experience: '+v.xp+' / '+v.xpNext}/></div></aside><CombatBelt view={v} onOpen={()=>open('build')}/>
   
  </>}

  {started&&!isFarm&&v.nearExit&&<button className="island-interact panel" onClick={()=>game.current?.returnHome()}><kbd>E</kbd>Return home</button>}
  {started&&<div className="traversal-actions"><button className="panel" title="Jump / double jump · Space" aria-label="Jump or double jump" onClick={()=>game.current?.jumpNow()}><ChevronsUp size={23}/><kbd>SPACE</kbd></button><button className="panel" title="Dash · Q" aria-label="Dash" disabled={v.dash>0} onClick={()=>game.current?.dashNow()}><Wind size={23}/><kbd>{v.dash>0?v.dash.toFixed(1):'Q'}</kbd></button><button className="panel touch-sprint" title="Hold to sprint" aria-label="Hold to sprint" onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);game.current?.moveKey('shift',true);}} onPointerUp={()=>game.current?.moveKey('shift',false)} onPointerCancel={()=>game.current?.moveKey('shift',false)}><FastForward size={23}/></button></div>}
  {started&&<div className="touch-controls" aria-label="Touch movement">{[['w',ArrowUp],['a',ArrowLeft],['s',ArrowDown],['d',ArrowRight]].map(([key,Icon])=>{const I=Icon as typeof ArrowUp;return <button key={key as string} aria-label={'Move '+key} onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);game.current?.moveKey(key as string,true);}} onPointerUp={()=>game.current?.moveKey(key as string,false)} onPointerCancel={()=>game.current?.moveKey(key as string,false)}><I size={23}/></button>;})}</div>}
  {v.message&&started&&!modal&&!v.result&&!v.upgrade&&<output className="toast" aria-live="polite"><Leaf size={18}/>{v.message}</output>}
  {userPaused&&!modal&&<div className="pause-cover"><div className="panel pause-card"><Moon size={30}/><h2>Paused</h2><button className="primary" onClick={()=>setUserPaused(false)}><Play size={18}/> Resume</button></div></div>}
  {v.error&&<div className="error-panel panel" role="alert"><h2>Lunacia needs a moment</h2><p>{v.error}</p><button className="primary" onClick={()=>location.reload()}>Reload game</button></div>}
  <Dialog open={modal!==null} onOpenChange={value=>{if(!value)setModal(null);}}><DialogContent className={'game-dialog '+(modal==='inventory'?'inventory-dialog':['kitchen','travel','hero'].includes(modal??'')?'service-dialog':'')}>
   <DialogTitle className="dialog-title">{modal==='kitchen'?'Campfire':modal==='travel'?'Portal':modal==='hero'?(talkHero?HEROES[talkHero].name:'Axie'):modal==='garden'?'Garden':modal==='inventory'?'Inventory':modal==='build'?'Spellbook':'How to play'}</DialogTitle>
   <DialogDescription className="sr-only">{modal==='kitchen'?'Turn two crops into a meal. Pack one boost for your next expedition.':modal==='travel'?'Seeds, fertilizer, and rich soil are waiting beyond the garden.':modal==='hero'?'Choose your companion.':modal==='garden'?'Walk to a bed and press E to plant, water, or harvest.':modal==='build'?'Four spell slots. Four item slots. A new build every expedition.':modal==='inventory'?'Your supplies and expedition finds.':'Grow, cook, explore. Bring your next harvest home.'}</DialogDescription>

   {modal==='garden'&&<div className="garden-menu"><div className="plot-grid" aria-label="Garden overview">{v.farm.plots.map((plot,i)=><div key={i} className={'plot-cell '+(v.selected===i?'selected ':'')+(plot.crop&&plot.growth>=1?'ripe ':'')+(plot.rich?'rich ':'')} title={'Bed '+(i+1)+(plot.crop?' · '+CROPS[plot.crop].name:' · Empty')} aria-label={'Bed '+(i+1)+(plot.crop?plot.growth>=1?' ready to harvest':plot.watered?' growing':' needs water':' empty')}>{plot.crop?<CropIcon id={plot.crop}/>:<span>+</span>}{plot.crop&&!plot.watered&&<i className="water-dot"/>}{plot.crop&&plot.growth>=1&&<i className="ripe-dot"/>}</div>)}</div><div className="bed-state"><strong>Nearest bed {v.selected+1}</strong><span>{p.crop?CROPS[p.crop].name+' · '+(p.growth>=1?'Ready':p.watered?Math.round(p.growth*100)+'%':'Needs water'):'Empty'}{p.rich?' · Rich soil':''}</span></div><button className="primary" onClick={()=>setModal(null)}>Back to the farm <Sprout size={18}/></button></div>}
   {modal==='build'&&<>{!isFarm&&<BuildSummary build={v.build}/>}<RecipeBook build={v.build}/></>}
   {modal==='inventory'&&<Inventory view={v} onSeed={id=>{game.current?.selectSeed(id);setModal(null);}} onMeal={id=>game.current?.equipMeal(id)} onReturn={()=>{setModal(null);game.current?.escape();}}/>}

   {modal==='kitchen'&&<div className="recipes">{cropIds.map(id=><article className="recipe" key={id}><span data-feedback-anchor={'cook-'+id} className={'recipe-icon '+id}><LootArt kind="meal" crop={id} size={48}/></span><div><h3>{CROPS[id].meal}</h3><p>{CROPS[id].effect}</p><small>{v.farm.crops[id]}/2 crops</small></div><div className="recipe-actions"><button className="secondary" disabled={v.farm.crops[id]<2} onClick={()=>game.current?.cookMeal(id)}>Cook</button><button className={'secondary '+(v.farm.meal===id?'equipped':'')} disabled={v.farm.meals[id]<1} onClick={()=>game.current?.equipMeal(id)}>{v.farm.meal===id?<Check size={15}/>:<Package size={15}/>} {v.farm.meal===id?'Packed':'Pack'} ({v.farm.meals[id]})</button></div></article>)}</div>}
   {modal==='travel'&&<IslandPortal farm={v.farm} onEnter={launch} onUnlock={()=>game.current?.unlock()}/>}
   {modal==='hero'&&talkHero&&<CompanionTalk id={talkHero} onClose={()=>setModal(null)} onChoose={()=>{game.current?.selectHero(talkHero);setModal(null);}}/>}
   {modal==='help'&&<div className="help-content"><ol><li><strong>Grow.</strong> Walk near a garden bed, choose a seed (1–3), then press E to plant, water, or harvest the highlighted bed. Nothing happens until you press E or the action button. Crops grow while you play.</li><li><strong>Look around.</strong> Drag the world to rotate the camera; scroll or pinch to zoom. V resets the view behind your Axie. WASD moves relative to the camera.</li><li><strong>Prepare.</strong> Press E at the campfire to cook. Talk to the other Axies to switch character.</li><li><strong>Explore.</strong> Attacks fire automatically. Move with WASD, arrow keys, or click/tap the ground. Space jumps; press it again for a double jump. Hold Shift to sprint and press Q to dash, even in the air.</li><li><strong>Build your spells.</strong> Collect the XP gems dropped by enemies. Pick a spell or item at each level-up, upgrade it to level 3, and find its partner to unlock an evolution. Press B for recipes, or I to open your inventory. Equipment resets each expedition.</li><li><strong>Bring it home.</strong> Pick up rare seed packets and supplies dropped in battle. After the guardian falls and the timer ends, press E at the return portal to bring them home. Early return or defeat keeps half.</li><li><strong>Go deeper.</strong> Walk to the portal, press E, and offer 4 Sunroot and 2 Moonberry to unlock Bramble Hollow and rare Embercorn.</li></ol><p>Garden progress saves locally in this browser. Farming pauses when this tab is hidden or a menu is open.</p><div className="credits"><strong>Made for Axie Vibeathon</strong><p>Axie Origins sound effects and Axie and Sapidae characters, models, textures and animations belong to Sky Mavis and its licensors. Supplied via the event's Axie 3D asset pack. Terrain and rock generation use GameBlocks by Weihao Cheng (MIT). Crop designs and game systems are original prototype work.</p><a href="/licenses/axie-3d-RIGHTS.md" target="_blank" rel="noreferrer">Axie asset permission ↗</a><a href="/licenses/axie-3d-THIRD_PARTY_NOTICES.md" target="_blank" rel="noreferrer">Third-party notices ↗</a><a href="/licenses/axie-origins-audio-LICENSE.md" target="_blank" rel="noreferrer">Axie audio permission ↗</a><a href="/licenses/GameBlocks-LICENSE.txt" target="_blank" rel="noreferrer">GameBlocks license</a><small>Unofficial work in progress. No wallet needed.</small></div></div>}
  </DialogContent></Dialog>
  <Dialog open={v.upgrade} onOpenChange={()=>{}}><DialogContent className="game-dialog upgrade-dialog power-dialog" showCloseButton={false}>
   <div className="power-heading"><DialogTitle className="dialog-title">Level up</DialogTitle><span className="power-level" aria-label={"Level "+v.level}>{v.level}</span></div>
   <DialogDescription className="sr-only">Choose one upgrade.</DialogDescription>
   {v.upgrade&&<UpgradeCards key={v.level} choices={v.choices} build={v.build} onChoose={id=>game.current?.chooseUpgrade(id)}/>}
  </DialogContent></Dialog>
  <Dialog open={v.result!==null} onOpenChange={value=>{if(!value)game.current?.dismissResult();}}><DialogContent className="game-dialog result-dialog"><DialogTitle className="dialog-title">{v.result?.outcome==='won'?'Your haul':'Home again'}</DialogTitle><DialogDescription>{v.result?.outcome==='won'?'All finds kept.':'Half your finds kept.'}</DialogDescription>{v.result&&<><div className="result-stats"><span><Swords size={18}/>{v.result.kills}</span><span><Sun size={18}/>Day {v.farm.day}</span></div><div className="result-loot">{cropIds.map(id=><div key={id}><LootArt kind="seed" crop={id} size={32}/><strong>+{v.result!.loot[id]}</strong><span>{CROPS[id].name} seeds</span></div>)}<div><LootArt kind="fertilizer" size={32}/><strong>+{v.result.loot.fertilizer}</strong><span>Fertilizer</span></div><div><Mountain size={24}/><strong>+{v.result.loot.soil}</strong><span>Rich soil</span></div></div><button className="primary" onClick={()=>game.current?.dismissResult()}>Back to my garden <Sprout size={18}/></button></>}</DialogContent></Dialog>
 </main>;
}

