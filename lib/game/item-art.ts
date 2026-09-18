import type {CropId} from './state';
const RETRO_SKILLS=new Set(['cannon','sword','hammer','axe','frost','void','dagger','beam','quake','venom','armor','boots','magnet','focus','duration','fortune']);
const WEAPON_ART=new Set(['thorn','petal','spore','storm','ember','cannon','sword','hammer','axe','frost','void','dagger','beam','quake','venom']);
export function skillSprite(id:string,evolved=false){return (RETRO_SKILLS.has(id)?'/assets/retro/icons/':'/assets/skills/')+id+(evolved&&WEAPON_ART.has(id)?'-evolved':'')+'.png';}
// Shared by inventory, action popups, the farm hotbar and world pickup art.
export function itemSprite(kind:string,crop?:CropId):string|null{
 if(crop&&(kind==='seed'||kind==='crop'))return '/assets/crops/'+crop+'-'+kind+'.png';
 if(kind==='meal')return crop&&['cloudmelon','glowcap','starpepper','dewleaf','crystalbean'].includes(crop)?'/assets/retro/icons/meal-'+crop+'.png':'/assets/meals/'+(crop??'sunroot')+'.png';
 if(kind==='fertilizer')return '/assets/items/fertilizer.png';
 if(['soil','water','sickle','grove-key','hollow-key'].includes(kind))return '/assets/retro/icons/'+kind+'.png';
 if(kind==='key'||kind==='unlock')return '/assets/retro/icons/grove-key.png';
 return null;
}
