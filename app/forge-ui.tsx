'use client';
import {useRef,useState,useEffect} from 'react';
import {Flame,Hammer,KeyRound,Droplets,Plus,Pause,Timer,Crosshair} from 'lucide-react';
import {ForgeRun,type ForgeTool} from '@/lib/game/forge';
import {KEY_RECIPES,canCraftKey,type FarmState,type CropId} from '@/lib/game/state';
import {ingredientStars,farmLuck} from '@/lib/game/quality';
import {QualityOdds,StarBadge} from './quality-ui';
import {LootArt} from './inventory-ui';
import {useCraftArcade} from './use-craft-arcade';
function ForgeGame({farm,tier,onCraft,onBack}:{farm:FarmState;tier:1|2;onCraft:(tier:1|2,score:number)=>number;onBack:()=>void}){
 const reward=useRef({input:ingredientStars(farm,KEY_RECIPES[tier].cost),luck:farmLuck(farm)}),board=useRef<HTMLDivElement>(null);
 const a=useCraftArcade(()=>new ForgeRun(tier),score=>onCraft(tier,score),
 (r,code,down,repeat)=>{
  if(r.phase==='quench'&&['Space','Enter'].includes(code)){r.dipping=down;return true;}
  if(r.phase!=='shape')return false;
  if(code==='KeyR'){r.heating=down;if(down)r.charging=false;return true;}
  if(['Digit1','Digit2','Digit3'].includes(code)){if(down)r.tool=code==='Digit1'?'fine':code==='Digit2'?'wide':'repair';return true;}
  const direction:Record<string,number>={ArrowLeft:-1,KeyA:-1,ArrowRight:1,KeyD:1,ArrowUp:-9,KeyW:-9,ArrowDown:9,KeyS:9};
  if(code in direction){if(down)r.select(r.selected+direction[code]);return true;}
  if(['Space','Enter'].includes(code)){if(down&&!repeat)r.press();if(!down)r.release();return true;}
  return false;
 },r=>{r.heating=false;r.charging=false;r.dipping=false;});
 const r=a.run,playing=a.mode==='playing',shaping=r.phase==='shape';
 useEffect(()=>{if(r.hits)a.sound(160+(r.match*180));},[r.hits]);
 const start=()=>{a.start();board.current?.focus();};
 const choose=(tool:ForgeTool)=>{r.tool=tool;board.current?.focus();};
 const hold=(e:React.PointerEvent<HTMLButtonElement>,kind:'heat'|'dip')=>{if(!playing)return;e.currentTarget.setPointerCapture(e.pointerId);if(kind==='heat'){r.heating=true;r.charging=false;}else r.dipping=true;};
 return <div className="craft-arcade smith-arcade" data-feedback-anchor="forge">
 <div className="arcade-score"><strong><KeyRound size={22}/>{KEY_RECIPES[tier].name}</strong><span><Timer size={16}/>{Math.ceil(shaping?55-r.time:Math.max(0,10-r.quenchTime))}s</span><button aria-label="Pause forging" title="Pause · P" disabled={!playing} onClick={a.pause}><Pause size={17}/></button></div>
 <div ref={board} className={'smith-board phase-'+r.phase} tabIndex={0} role="group" aria-label="Key shaping board. Arrows aim, Space hammers, R reheats. 1 fine, 2 broad, 3 repair.">
 {shaping?<><div className="smith-caption"><span>KEEP THE GOLD OUTLINE</span><b>{Math.round(r.match*100)}% shaped</b></div><div className="smith-grid" role="group" aria-label="Metal blank with target outline">
 {r.cells.map((filled,i)=><button key={i} data-arcade-key tabIndex={-1} disabled={!playing} aria-label={'Row '+(Math.floor(i/9)+1)+' column '+(i%9+1)+': '+(r.pattern[i]?'keep metal':'remove metal')+', '+(filled?'filled':'empty')} className={(filled?'metal ':'empty ')+(r.pattern[i]?'target ':'excess ')+(r.selected===i?'aimed ':'')+(r.charging&&r.selected===i?'charging':'')} style={{'--metal-heat':r.heat,'--charge':r.charge} as React.CSSProperties} onPointerDown={e=>{if(!playing)return;e.currentTarget.setPointerCapture(e.pointerId);r.select(i);r.press();}} onPointerUp={()=>r.release()} onPointerCancel={()=>{r.charging=false;}} onClick={e=>{if(e.detail===0&&playing){r.select(i);r.strike(i,.65);}}}>{r.selected===i?<Crosshair size={22}/>:!filled&&r.pattern[i]?<Plus size={16}/>:null}</button>)}
 </div><div className="smith-bench"/><Hammer key={r.hits} className={'smith-hammer '+(r.hits?'hammer-impact':'')} style={{left:(9+(r.selected%9+.5)*82/9)+'%',top:(5+(Math.floor(r.selected/9)+.5)*68/5)+'%'}} size={48}/></>:<div className="quench-game">
 <div className="quench-key"><KeyRound size={72}/><Droplets size={32}/></div>
 <div className="quench-tank" aria-label="Keep the white marker inside the moving green band" onPointerDown={e=>{if(!playing)return;e.currentTarget.setPointerCapture(e.pointerId);r.dipping=true;}} onPointerUp={()=>{r.dipping=false;}} onPointerCancel={()=>{r.dipping=false;}}>
 <div className="quench-water" style={{height:r.bath*100+'%'}}/><div className="quench-zone" style={{bottom:(r.target-.14)*100+'%',height:'28%'}}/><div className="quench-marker" style={{bottom:r.bath*100+'%'}}/><span>STEADY</span>
 </div><div className="quench-rating"><b>{Math.round(r.coolingQuality*100)}%</b><small>In the sweet spot</small></div>
 </div>}
 {r.flashTime>0&&shaping&&<output className="arcade-float">{r.flash}</output>}
 {a.mode==='ready'&&<div className="arcade-cover"><Hammer size={38}/><h3>Shape the key</h3><div className="arcade-rules"><span><Crosshair/>Chip away metal outside the gold.</span><span><Hammer/>Hold broad blows. Repair slips.</span><span><Flame/>Reheat, then quench when ready.</span></div><button className="primary" onClick={start}>Forge</button></div>}
 {a.mode==='paused'&&<div className="arcade-cover"><h3>Paused</h3><button className="primary" onClick={start}>Resume</button></div>}
 {a.mode==='done'&&<div className="arcade-cover result"><KeyRound size={64}/><h3>{r.points>=90?'Masterwork!':r.points>=65?'Well forged':'Rough cut'}</h3><strong>{r.points}/100</strong><span role="status">{a.result===null?'Finishing...':a.result>0?<><StarBadge value={farm.lastCraft?.stars??1}/>Key forged</>:'Not enough crops'}</span><QualityOdds score={r.score} input={reward.current.input} luck={reward.current.luck}/><button className="primary" onClick={onBack}>Done</button></div>}
 </div>
 {shaping?<><div className="forge-toolbox" role="group" aria-label="Hammer tools">{([['fine','Fine',Crosshair],['wide','Broad',Hammer],['repair','Repair',Plus]] as const).map(([tool,label,Icon],i)=><button key={tool} disabled={!playing} aria-pressed={r.tool===tool} title={tool==='wide'?'Hold to remove a cross of 5 cells':tool==='repair'?'Replace missing metal':'Remove one cell'} onClick={()=>choose(tool)}><Icon size={18}/>{label}<kbd>{i+1}</kbd></button>)}</div>
 <div className="arcade-meters"><label><Flame size={15}/>Metal heat<div className="arcade-meter heat"><i style={{width:r.heat*100+'%'}}/><b className="heat-safe"/></div></label><label><Hammer size={15}/>{r.tool==='wide'?'Hold for a broad blow':'Hammer power'}<div className="arcade-meter"><i style={{width:r.charge*100+'%'}}/></div></label></div>
 <div className="arcade-actions"><button className={'secondary'+(r.heating?' held':'')} disabled={!playing} onPointerDown={e=>hold(e,'heat')} onPointerUp={()=>{r.heating=false;}} onPointerCancel={()=>{r.heating=false;}} onKeyDown={e=>{if(e.code==='Space'||e.code==='Enter'){e.preventDefault();r.heating=true;}}} onKeyUp={e=>{if(e.code==='Space'||e.code==='Enter')r.heating=false;}}><Flame size={18}/>Hold to heat <kbd>R</kbd></button><button className="primary" disabled={!playing} onClick={()=>{r.beginQuench();board.current?.focus();}}>Quench <Droplets size={18}/></button></div></>:
 <><div className="arcade-meter quench-progress"><i style={{width:r.quenchTime*10+'%'}}/></div><button data-arcade-key className="primary dip-button" disabled={!playing} onPointerDown={e=>hold(e,'dip')} onPointerUp={()=>{r.dipping=false;}} onPointerCancel={()=>{r.dipping=false;}}>Hold to raise · release to lower <kbd>Space</kbd></button></>}
 <div className="arcade-footer"><span>{shaping?'Click metal to hammer · Arrows aim · Space strikes':'Keep the marker in green until the key cools'}</span><button className="cook-cancel" onClick={onBack}>Cancel</button></div>
 </div>;
}
export function ForgeStation({farm,onCraft}:{farm:FarmState;onCraft:(tier:1|2,score:number)=>number}){
 const [tier,setTier]=useState<1|2|null>(null);
 if(tier)return <ForgeGame farm={farm} tier={tier} onCraft={onCraft} onBack={()=>setTier(null)}/>;
 return <div className="forge-recipes">{([1,2] as const).map(t=><div key={t}><KeyRound size={42}/><strong>{KEY_RECIPES[t].name}</strong><div className="forge-cost">{Object.entries(KEY_RECIPES[t].cost).map(([id,n])=><span key={id}><LootArt kind="crop" crop={id as CropId} size={30}/>{farm.crops[id as CropId]}/{n}</span>)}</div><button className="primary" disabled={!canCraftKey(farm,t)} onClick={()=>setTier(t)}>Forge</button></div>)}</div>;
}
