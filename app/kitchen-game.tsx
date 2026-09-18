'use client';
import {useRef,useEffect} from 'react';
import {Flame,MoveHorizontal,RotateCcw,Pause,Utensils,Timer} from 'lucide-react';
import {KitchenRun} from '@/lib/game/kitchen-game';
import {CROPS,CROP_IDS,type CropId} from '@/lib/game/state';
import type {Stars} from '@/lib/game/quality';
import {useCraftArcade} from './use-craft-arcade';
import {LootArt} from './inventory-ui';
import {QualityOdds,StarBadge} from './quality-ui';
export function KitchenGame({id,onCook,onBack,quality=1,luck=0,craftedStars=1}:{id:CropId;onCook:(id:CropId,score:number)=>number;onBack:()=>void;quality?:number;luck?:number;craftedStars?:Stars}){
 const reward=useRef({quality,luck}),held=useRef(new Set<string>()),board=useRef<HTMLDivElement>(null);
 const a=useCraftArcade(()=>new KitchenRun(CROP_IDS.indexOf(id)),score=>onCook(id,score),
  (r,code,down,repeat)=>{if(['ArrowLeft','KeyA','ArrowRight','KeyD'].includes(code)){if(down)held.current.add(code);else held.current.delete(code);return true;}if(code==='KeyE'){if(down&&!repeat)r.plate();return true;}if(code==='Space'){if(down&&!repeat)r.toss();return true;}return false;},
  ()=>held.current.clear(),(r,dt)=>{const h=held.current,axis=Number(h.has('ArrowRight')||h.has('KeyD'))-Number(h.has('ArrowLeft')||h.has('KeyA'));if(axis)r.move(r.target+axis*dt*.75);});
 const r=a.run,playing=a.mode==='playing';
 useEffect(()=>{if(r.caught||r.plated||r.tosses)a.sound(r.plated?640:430);},[r.caught,r.plated,r.tosses]);
 const move=(e:React.PointerEvent<HTMLDivElement>)=>{if(!playing||e.pointerType!=='mouse'&&!e.buttons)return;const rect=e.currentTarget.getBoundingClientRect();r.move((e.clientX-rect.left)/rect.width);};
 const start=()=>{a.start();board.current?.focus();};
 return <div className="craft-arcade kitchen-arcade">
 <div className="arcade-score"><strong><LootArt kind="meal" crop={id} size={28}/>{CROPS[id].meal}</strong><span><Timer size={16}/>{Math.ceil(r.remaining)}s</span><button aria-label="Pause cooking" title="Pause · P" onClick={a.pause} disabled={!playing}><Pause size={17}/></button></div>
 <div ref={board} className={'skillet-board'+(r.heat>.8?' hot':'')} tabIndex={0} role="group" aria-label="Move the pan with A and D or pointer. Space tosses. Avoid black coal." onPointerMove={move} onPointerDown={e=>{if(!playing)return;e.currentTarget.focus();e.currentTarget.setPointerCapture(e.pointerId);const rect=e.currentTarget.getBoundingClientRect();r.move((e.clientX-rect.left)/rect.width);}}>
 <div className="kitchen-tiles"/><div className="plated-food" aria-label={r.plated+" ingredients plated"}>{Array.from({length:8},(_,i)=><span key={i} className={i<r.plated?"filled":""}>{i<r.plated?<LootArt kind="crop" crop={id} size={22}/>:null}</span>)}</div><div className="burner"><Flame size={50}/><span>HEAT</span></div><div className="cool-zone left">COOL</div><div className="cool-zone right">COOL</div>
 <div className="skillet" style={{left:r.pan*100+'%'}}><div className="skillet-bowl"/><div className="skillet-handle"/></div>
 {r.pieces.filter(p=>p.state!=='lost'&&p.state!=='served').map(p=><div key={p.id} className={'pan-piece'+(p.coal?' coal':'')+(p.burn>.25?' scorched':'')+(p.cook>=.82&&p.burn<.55?' cooked':'')} style={{left:p.x*100+'%',top:p.y*100+'%',transform:'translate(-50%,-50%) rotate('+(p.state==='fall'?p.vy*160:0)+'deg)'}}>
 {p.coal?<span>✖</span>:<><LootArt kind="crop" crop={id} size={31}/><i><b style={{width:Math.min(100,p.cook*100)+'%'}}/></i></>}</div>)}
 {r.flashTime>0&&<output className="arcade-float" key={r.flash+r.tosses+r.caught+r.lost}>{r.flash}</output>}
 {a.mode==='ready'&&<div className="arcade-cover"><Utensils size={38}/><h3>Skillet scramble</h3><div className="arcade-rules"><span><MoveHorizontal/>Catch crops. Dodge coal.</span><span><Flame/>Center cooks. Sides cool.</span><span><RotateCcw/>Space tosses. E plates cooked food.</span></div><button className="primary" onClick={start}>Cook</button></div>}
 {a.mode==='paused'&&<div className="arcade-cover"><h3>Paused</h3><button className="primary" onClick={start}>Resume</button></div>}
 {a.mode==='done'&&<div className="arcade-cover result"><LootArt kind="meal" crop={id} size={70}/><h3>{r.points>=85?'Chef special!':r.points>=55?'Nicely cooked':'Keep practicing'}</h3><strong>{r.points}/100</strong><span role="status">{a.result===null?'Plating...':a.result>0?<><StarBadge value={craftedStars}/> +{a.result} meal{a.result>1?'s':''}</>:'Not enough crops'}</span><QualityOdds score={r.score} input={reward.current.quality} luck={reward.current.luck}/><button className="primary" onClick={onBack}>Done</button></div>}
 </div>
 <div className="arcade-meters"><label><Flame size={15}/>Pan heat<div className="arcade-meter heat"><i style={{width:r.heat*100+'%'}}/></div></label><label><Utensils size={15}/>{r.plated}/8 plated<div className="arcade-meter"><i style={{width:r.points+'%'}}/></div></label></div>
 <div className="arcade-actions"><button data-arcade-key className="secondary" disabled={!playing||r.cooldown>0} onClick={()=>{r.toss();a.sound(480);board.current?.focus();}}><RotateCcw size={18}/>Toss <kbd>Space</kbd></button><button className="primary" disabled={!playing||r.ready===0} onClick={()=>{r.plate();board.current?.focus();}}>Plate <kbd>E</kbd> <Utensils size={17}/></button></div>
 <div className="arcade-footer"><span>A / D or drag · Toss, catch, plate when green</span><button className="cook-cancel" onClick={onBack}>Cancel</button></div>
 </div>;
}
