import * as T from 'three';
import {NaturalTerrainSampler,ArchipelagoTerrainSampler} from '../gameblocks/modules/world/environment/TerrainSampler.js';
import {DEFAULT_WORLD_BASIS} from '../gameblocks/modules/math/WorldBasis.js';

export type WorldMode='farm'|'dungeon';
export type Biome='woodland';
export const TILE=1.25;
export const TERRAIN_STEP=1.25;
// Home and combat now share the exact same playable footprint.
export const WORLD_RADIUS={farm:30,dungeon:30} as const;
export const DUNGEON_DETAIL_SCALE=1;
export const DUNGEON_LAYOUT_SCALE=1;
export const BRIDGES:number[]=[];
export const riverX=(_z:number)=>0;
export const terrainBiome=(_x:number,_z:number):Biome=>'woodland';
export const isBridge=(_x:number,_z:number)=>false;
export const isWater=(_x:number,_z:number)=>false;

const smooth=(a:number,b:number,x:number)=>{const t=T.MathUtils.clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
const detail=new ArchipelagoTerrainSampler({seed:71031});

class WildseedTerrainSampler extends NaturalTerrainSampler{
 constructor(){super({baseHeight:0,undulation:1.5,hillFrequency:.5,normalStep:TERRAIN_STEP,basis:DEFAULT_WORLD_BASIS});}
 heightAt(right:number,forward:number):number{
  const x=right,z=-forward,r=Math.hypot(x,z);
  // A calm central clearing keeps combat readable. Low hills around it echo the home island.
  let h=detail.fbm(x*.055,forward*.055,3,2,.5,19)*.5*smooth(7,13,r);
  for(const [hx,hz,range,peak] of [[-15,-9,7,2.6],[15,13,8,3],[-13,17,6,2.1],[17,-14,5,1.7]] as const)
   h=Math.max(h,(1-smooth(0,range,Math.hypot(x-hx,z-hz)))*peak);
  h=Math.max(0,h);
  return h*(1-smooth(25,30,r));
 }
 colorAt(right:number,forward:number):T.Color{
  const z=-forward,h=this.heightAt(right,forward),r=Math.hypot(right,z);
  const normal=this.normalAt(right,forward,TERRAIN_STEP),slope=1-normal.y;
  const color=new T.Color('#72bd4b').lerp(new T.Color('#b3d768'),.2+.13*detail.noise2D(right*.12,forward*.12,7));
  color.lerp(new T.Color('#587b54'),smooth(.08,.3,slope)*.55);
  color.lerp(new T.Color('#e8cd85'),smooth(25,29,r)*.72);
  color.multiplyScalar(.96+Math.min(.05,h*.012));
  return color;
 }
 sample(right:number,forward:number){return {height:vertexHeight(right,forward)+.02,normal:this.basis.upVector(),color:this.colorAt(right,forward)};}
}

export const dungeonTerrain=new WildseedTerrainSampler();
const heights=new Map<string,number>();
export function vertexHeight(right:number,forward:number){
 const key=right+':'+forward;let h=heights.get(key);
 if(h===undefined){h=dungeonTerrain.heightAt(right,forward);heights.set(key,h);}
 return h;
}

export function terrainHeight(mode:WorldMode,x:number,z:number):number{
 const step=mode==='farm'?TILE:TERRAIN_STEP,f=-z,rx=Math.floor(x/step)*step,rf=Math.floor(f/step)*step;
 const u=(x-rx)/step,v=(f-rf)/step;
 const sample=mode==='farm'?(right:number,forward:number)=>farmHeight(right,-forward):vertexHeight;
 const a=sample(rx,rf),b=sample(rx+step,rf),c=sample(rx,rf+step),d=sample(rx+step,rf+step);
 return u>=v?a+(b-a)*u+(d-b)*v:a+(d-c)*u+(c-a)*v;
}

function farmHeight(x:number,z:number){let h=0;for(const [hx,hz,r,peak] of [[-22,-10,7,2.5],[19,20,8,3],[-18,21,6,2]] as const)h=Math.max(h,(1-smooth(0,r,Math.hypot(x-hx,z-hz)))*peak);return h*(1-smooth(27,30,Math.hypot(x,z)));}
