import * as T from 'three';
import {CROPS,type FarmState,type CropId} from './state';
import {farmAction,isSeed,FARM_SLOTS,FARM_SLOT_KEYS,type FarmItem} from './farm-tools';
import {itemSprite} from './item-art';
import {plotPosition} from './farming';
import {projectPopup} from './action-feedback';

export function plotPromptData(farm:FarmState,index:number,held:FarmItem,seed:CropId){
 const plot=farm.plots[index],use=farmAction(farm,index,held),crop=plot.crop??(isSeed(held)?held:seed);
 const status=!plot.crop?'Empty soil':plot.growth>=1?'Ready to harvest':!plot.watered?'Needs water':'Growing · '+Math.floor(plot.growth*100)+'%';
 let key=use.ready?'E':'',label=use.label;
 if(!use.ready){
  const needed=!plot.crop?seed:plot.growth>=1?'sickle':!plot.watered?'water':null;
  if(needed&&held!==needed){key=FARM_SLOT_KEYS[FARM_SLOTS.indexOf(needed)];label=needed==='water'?'Equip can':needed==='sickle'?'Equip sickle':'Equip seeds';}
 }
 return {name:plot.crop||isSeed(held)?CROPS[crop].name:'Empty bed',status,key,label,ready:use.ready,action:use.action,src:itemSprite(plot.crop?'crop':'seed',crop)!};
}
export function positionPlotPrompt(point:T.Vector3,camera:T.Camera,width:number,height:number,cardWidth=204,cardHeight=100){
 const projected=projectPopup(point,camera,{left:0,top:0,width,height});
 // Keep the card above its crop while respecting the HUD and the inventory bar.
 const x=T.MathUtils.clamp(projected.x+20,10,Math.max(10,width-cardWidth-10));
 const y=T.MathUtils.clamp(projected.y-cardHeight-18,82,Math.max(82,height-cardHeight-110));
 return {x,y,visible:projected.visible,pointer:T.MathUtils.clamp(projected.x-x,14,cardWidth-14)};
}
export class PlotPrompt{
 private node:HTMLButtonElement;private art:HTMLImageElement;private name:HTMLElement;private status:HTMLElement;private key:HTMLElement;private label:HTMLElement;private signature='';
 constructor(private container:HTMLElement,onUse:()=>void){
  this.node=document.createElement('button');this.node.type='button';this.node.className='plot-prompt';this.node.hidden=true;
  this.art=document.createElement('img');this.art.alt='';this.art.draggable=false;this.art.className='plot-prompt-art';
  const copy=document.createElement('span');copy.className='plot-prompt-copy';
  this.name=document.createElement('strong');this.status=document.createElement('small');copy.appendChild(this.name);copy.appendChild(this.status);
  const action=document.createElement('span');action.className='plot-prompt-action';
  this.key=document.createElement('kbd');this.label=document.createElement('span');action.appendChild(this.key);action.appendChild(this.label);
  this.node.appendChild(this.art);this.node.appendChild(copy);this.node.appendChild(action);this.node.addEventListener('click',onUse);container.appendChild(this.node);
 }
 update(camera:T.Camera,farm:FarmState,index:number,held:FarmItem,seed:CropId,visible:boolean){
  if(!visible){this.node.hidden=true;return;}
  const data=plotPromptData(farm,index,held,seed),signature=JSON.stringify(data);
  if(signature!==this.signature){
   this.signature=signature;this.art.src=data.src;this.name.textContent=data.name;this.status.textContent=data.status;
   this.key.textContent=data.key;this.key.hidden=!data.key;this.label.textContent=data.label;this.node.disabled=!data.ready;
   this.node.dataset.action=data.action;this.node.setAttribute('aria-label',data.name+'. '+data.status+'. '+(data.key?data.key+' · ':'')+data.label);
  }
  this.node.hidden=false;
  const point=plotPosition(index);point.y+=1.1;
  const pos=positionPlotPrompt(point,camera,this.container.clientWidth,this.container.clientHeight,this.node.offsetWidth||204,this.node.offsetHeight||100);
  this.node.hidden=!pos.visible;this.node.style.transform='translate3d('+pos.x+'px,'+pos.y+'px,0)';
  this.node.style.setProperty('--pointer-x',pos.pointer+'px');
 }
 hide(){this.node.hidden=true;}
 dispose(){this.node.remove();}
}
