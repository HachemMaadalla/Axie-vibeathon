import * as T from 'three';
import {ACTION_SYMBOLS} from './action-symbols';
import {itemSprite} from './item-art';
import type {CropId} from './state';
export type ActionKind='plant'|'water'|'harvest'|'coin'|keyof typeof ACTION_SYMBOLS;
type Options={amount?:number;anchor?:string;label?:string;crop?:CropId};
type Popup={node:HTMLDivElement;point:T.Vector3;anchor:Element|null;age:number;duration:number};
const ART=['plant','water','harvest','coin'] as const;
export function popupMotion(age:number,reduced=false){
 const t=Math.min(1,Math.max(0,age/1.35));
 return {rise:reduced?0:42*t,opacity:Math.min(1,t/.08,(1-t)/.24),scale:reduced?1:t<.18?.45+.72*Math.sin(t/.18*Math.PI/2):1+.17*Math.exp(-(t-.18)*12)};
}
export function projectPopup(point:T.Vector3,camera:T.Camera,bounds:{left:number;top:number;width:number;height:number}){
 const p=point.clone().project(camera);
 return {x:bounds.left+(p.x+1)*bounds.width/2,y:bounds.top+(1-p.y)*bounds.height/2,visible:p.z>=-1&&p.z<=1&&Math.abs(p.x)<=1&&Math.abs(p.y)<=1};
}
export class ActionFeedback{
 private root:HTMLDivElement;private live:HTMLSpanElement;private popups:Popup[]=[];
 private reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 constructor(private container:HTMLElement){
  this.root=document.createElement('div');this.root.className='action-feedback-layer';this.root.setAttribute('aria-hidden','true');document.body.appendChild(this.root);
  this.live=document.createElement('span');this.live.className='sr-only';this.live.setAttribute('role','status');this.live.setAttribute('aria-live','polite');this.container.appendChild(this.live);
  for(const src of [...ART.map(key=>'/assets/actions/'+key+'.png'),itemSprite('fertilizer')!,...(['sunroot','moonberry','embercorn'] as CropId[]).map(crop=>itemSprite('meal',crop)!)]){const img=new Image();img.src=src;}
 }
 spawn(kind:ActionKind,point:T.Vector3,options:Options={}){
  // Keep one popup per location so rapid actions cannot cover each other.
  const anchor=options.anchor?document.querySelector('[data-feedback-anchor="'+options.anchor+'"]'):null;
  const nearby=this.popups.filter(p=>anchor?p.anchor===anchor:!p.anchor&&p.point.distanceToSquared(point)<1);
  for(const p of nearby)this.remove(p);
  if(this.popups.length>=8)this.remove(this.popups[0]);
  const node=document.createElement('div');node.className='action-popup action-'+kind;
  const visual=document.createElement('span');visual.className='action-visual';
  const sprite=itemSprite(kind,options.crop);
  if(sprite){const img=document.createElement('img');img.src=sprite;img.alt='';img.draggable=false;visual.appendChild(img);}
  else if(Object.hasOwn(ACTION_SYMBOLS,kind))visual.innerHTML=ACTION_SYMBOLS[kind as keyof typeof ACTION_SYMBOLS];
  else{const img=document.createElement('img');img.src='/assets/actions/'+kind+'.png';img.alt='';img.draggable=false;visual.appendChild(img);}
  node.appendChild(visual);
  if(options.amount!==undefined){const n=document.createElement('b');n.textContent=(options.amount>0?'+':'')+options.amount;n.className=options.amount<0?'spent':'gained';node.appendChild(n);}
  this.root.appendChild(node);node.style.visibility='hidden';
  this.popups.push({node,point:point.clone(),anchor,age:0,duration:1.35});
  this.live.textContent=options.label??kind;
 }
 update(dt:number,camera:T.Camera){
  const bounds=this.container.getBoundingClientRect();
  for(const p of [...this.popups]){
   p.age+=dt;if(p.age>=p.duration){this.remove(p);continue;}
   const motion=popupMotion(p.age,this.reduced);let pos=projectPopup(p.point,camera,bounds);
   if(p.anchor?.isConnected){const r=p.anchor.getBoundingClientRect();pos={x:r.right-32,y:r.top+8,visible:r.width>0&&r.height>0};}
   else if(p.anchor){this.remove(p);continue;}
   const x=Math.max(44,Math.min(window.innerWidth-44,pos.x)),y=Math.max(80,Math.min(window.innerHeight-20,pos.y));
   p.node.style.visibility=pos.visible?'visible':'hidden';p.node.style.opacity=String(motion.opacity);
   p.node.style.transform='translate3d('+x+'px,'+(y-motion.rise)+'px,0) translate(-50%,-100%) scale('+motion.scale+')';
  }
 }
 private remove(p:Popup){p.node.remove();this.popups.splice(this.popups.indexOf(p),1);}
 clear(){for(const p of [...this.popups])this.remove(p);this.live.textContent='';}
 dispose(){this.clear();this.root.remove();this.live.remove();}
}

