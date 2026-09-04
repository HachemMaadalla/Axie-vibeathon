import type {CropId} from './state';
// One source for inventory, action popups and world pickup art.
export function itemSprite(kind:string,crop?:CropId):string|null{
 if(crop&&(kind==='seed'||kind==='crop'))return '/assets/crops/'+crop+'-'+kind+'.png';
 if(kind==='meal')return crop&&['cloudmelon','glowcap','starpepper','dewleaf','crystalbean'].includes(crop)?'/assets/crops/'+crop+'-crop.png':'/assets/meals/'+(crop??'sunroot')+'.png';
 if(kind==='fertilizer')return '/assets/items/fertilizer.png';
 return null;
}
