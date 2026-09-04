import {CROPS,type FarmState,type CropId} from './state';
export const FARM_SLOTS=['sunroot','moonberry','embercorn','water','sickle','fertilizer','soil','cloudmelon','glowcap','starpepper','dewleaf','crystalbean'] as const;
export const FARM_SLOT_KEYS=['1','2','3','4','5','6','7','8','9','0','-','='] as const;
export type FarmItem=typeof FARM_SLOTS[number];
export const isSeed=(item:FarmItem):item is CropId=>Object.hasOwn(CROPS,item);
export const farmItemName=(item:FarmItem)=>isSeed(item)?CROPS[item].name+' seeds':({water:'Watering can',sickle:'Sickle',fertilizer:'Fertilizer',soil:'Rich soil'} as const)[item];
export function farmAction(farm:FarmState,index:number,item:FarmItem):{ready:boolean;label:string;action:'plant'|'water'|'harvest'|'fertilizer'|'soil'}{
 const p=farm.plots[index];const action:'plant'|'water'|'harvest'|'fertilizer'|'soil'=isSeed(item)?'plant':item==='sickle'?'harvest':item;
 const no=(label:string)=>({ready:false,label,action});
 if(!p)return no('Move closer');
 if(isSeed(item)){
  if(p.crop)return no(p.growth>=1?'Equip sickle':p.watered?'Growing':'Equip can');
  return item==='sunroot'||farm.seeds[item]>0?{ready:true,label:'Plant',action}:no('No seeds');
 }
 if(item==='water'){
  if(!p.crop)return no('Equip seeds');
  if(p.growth>=1)return no('Equip sickle');
  return p.watered?no('Watered'):{ready:true,label:'Water',action};
 }
 if(item==='sickle'){
  if(!p.crop)return no('Equip seeds');
  return p.growth>=1?{ready:true,label:'Harvest',action}:no(p.watered?'Growing':'Equip can');
 }
 if(farm[item]<1)return no(item==='soil'?'No soil':'No fertilizer');
 if(item==='soil')return p.rich?no('Rich soil'):{ready:true,label:'Improve',action};
 if(!p.crop)return no('Equip seeds');
 if(p.growth>=1)return no('Equip sickle');
 return p.fertilized?no('Fertilized'):{ready:true,label:'Fertilize',action};
}
