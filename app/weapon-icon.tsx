import {skillSprite} from '@/lib/game/item-art';
export function WeaponSpellIcon({id,size,evolved=false}:{id:string;size:number;evolved?:boolean}){return <img src={skillSprite(id,evolved)} width={size} height={size} alt="" aria-hidden="true" draggable={false} className="skill-art-icon"/>;}
