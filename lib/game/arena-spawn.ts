import * as T from 'three';
import {WORLD_RADIUS,terrainHeight} from './terrain';
import type {CollisionWorld} from './collisions';
// Search around the player rather than clamping an off-island spawn onto their feet.
export function battleSpawn(player:T.Vector3,angle:number,distance:number,radius:number,world:CollisionWorld){
 const limit=WORLD_RADIUS.dungeon-Math.max(3,radius+1),point=new T.Vector3();
 for(let i=0;i<48;i++){
  const a=angle+(i%2?1:-1)*Math.ceil(i/2)*Math.PI/24;
  point.set(player.x+Math.cos(a)*distance,0,player.z+Math.sin(a)*distance);
  if(Math.hypot(point.x,point.z)>limit)continue;
  point.y=terrainHeight('dungeon',point.x,point.z);
  if(!world.blocked(point,radius,5))return point.clone();
 }
 for(let i=0;i<48;i++){
  const a=angle+i*Math.PI/24;point.set(Math.cos(a)*(limit-1),0,Math.sin(a)*(limit-1));point.y=terrainHeight('dungeon',point.x,point.z);
  if(Math.hypot(point.x-player.x,point.z-player.z)>10&&!world.blocked(point,radius,5))return point.clone();
 }
 return new T.Vector3(0,terrainHeight('dungeon',0,0),0);
}
