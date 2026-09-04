import * as T from 'three';
import {NaturalTerrainSampler,RoadTerrainSampler,ArchipelagoTerrainSampler} from '../gameblocks/modules/world/environment/TerrainSampler.js';
import {DEFAULT_WORLD_BASIS} from '../gameblocks/modules/math/WorldBasis.js';
export type WorldMode='farm'|'dungeon';
export type Biome='woodland'|'marsh'|'badlands'|'crystal';
export const TILE=1.25;
export const TERRAIN_STEP=2.5;
export const WORLD_RADIUS={farm:30,dungeon:120};
// Keep the same amount of open space as the arena footprint changes.
export const DUNGEON_DETAIL_SCALE=(WORLD_RADIUS.dungeon/(64*Math.sqrt(10)))**2;
// Bring terrain features inward with the arena while keeping paths and bridges walkable.
export const DUNGEON_LAYOUT_SCALE=WORLD_RADIUS.dungeon/170;
export const BRIDGES=[-135,-65,35,115].map(z=>z*DUNGEON_LAYOUT_SCALE);
export const riverX=(z:number)=>(Math.sin(z/DUNGEON_LAYOUT_SCALE*.022)*22+Math.cos(z/DUNGEON_LAYOUT_SCALE*.008)*25)*DUNGEON_LAYOUT_SCALE;
export function terrainBiome(x:number,z:number):Biome{
 x/=DUNGEON_LAYOUT_SCALE;z/=DUNGEON_LAYOUT_SCALE;
 if(x>65&&z<45)return 'crystal';
 if(z>65)return 'badlands';
 if(x< -65&&z> -45)return 'marsh';
 return 'woodland';
}
export function isBridge(x:number,z:number){return BRIDGES.some(b=>Math.abs(z-b)<3.5&&Math.abs(x-riverX(b))<17);}
export function isWater(x:number,z:number){return Math.abs(x-riverX(z))<4.8&&!isBridge(x,z)&&Math.hypot(x,z)>28;}
const smooth=(a:number,b:number,x:number)=>{const t=T.MathUtils.clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
const paths:number[][][]=[
 [[0,0],[-28,-25],[-55,-65],[-75,-100],[-105,-95],[-142,-125]],
 [[0,0],[20,-25],[35,-28],[70,-35],[104,-58],[135,-90],[155,-140]],
 [[0,0],[-35,25],[-65,50],[-112,60],[-150,85]],
 [[0,0],[10,40],[35,70],[65,125],[110,145],[135,110]],
 [[-112,60],[-85,115],[-35,155],[15,155],[65,125]],
];
paths.forEach(path=>path.forEach(point=>{point[0]*=DUNGEON_LAYOUT_SCALE;point[1]*=DUNGEON_LAYOUT_SCALE;}));
paths.push(...BRIDGES.map(z=>[[riverX(z)-38,z],[riverX(z),z],[riverX(z)+38,z]]));
const segments=paths.flatMap(path=>path.slice(1).map((p,i)=>({start:{right:path[i][0],forward:-path[i][1]},end:{right:p[0],forward:-p[1]}})));
export const terrainRoads=new RoadTerrainSampler({seed:71031,roadSegments:segments,roadHalfWidth:3.4,roadFlatnessAtHalfWidth:.5});
const detail=new ArchipelagoTerrainSampler({seed:71031});
const palettes={woodland:'#75c746',marsh:'#209985',badlands:'#e8914e',crystal:'#947bd5'};
class WildseedTerrainSampler extends NaturalTerrainSampler{
 constructor(){super({baseHeight:5,undulation:5.5,hillFrequency:.65,normalStep:TERRAIN_STEP,basis:DEFAULT_WORLD_BASIS});}
 heightAt(right:number,forward:number):number{
  const x=right,z=-forward,r=Math.hypot(x,z),start=smooth(12,40*DUNGEON_LAYOUT_SCALE,r);
  const u=x/DUNGEON_LAYOUT_SCALE,v=z/DUNGEON_LAYOUT_SCALE;
  let h=super.heightAt(u,-v);
  // GameBlocks fBm adds several scales of coherent detail to the larger landforms.
  h+=detail.fbm(u*.018,-v*.018,4,2,.5,19)*3.2;
  h+=Math.exp(-(((u+104)/48)**2+((v+85)/50)**2))*26;
  h+=Math.exp(-(((u-112)/48)**2+((v+60)/58)**2))*23;
  h+=Math.exp(-(((u-55)/54)**2+((v-127)/46)**2))*20;
  h*=DUNGEON_LAYOUT_SCALE;
  const road=terrainRoads.roadFlatnessAt(right,forward);
  h-=detail.fbm(x*.06,forward*.06,3,2,.5,32)*1.4*(1-road);
  // Low rock shelves soften into runnable ramps along the path network.
  const terrace=Math.floor(h/2.2)*2.2+smooth(0,.65,(h/2.2)%1)*2.2;
  h=T.MathUtils.lerp(h,terrace,(terrainBiome(x,z)==='badlands'?.16:0)*(1-road));
  h*=start;
  const channel=Math.abs(x-riverX(z)),valley=smooth(4,24,channel);
  h=T.MathUtils.lerp(-.75*start,h,valley);
  if(r<28)h=Math.max(0,h);
  for(const b of BRIDGES){
   const bx=riverX(b),along=Math.abs(x-bx),across=Math.abs(z-b);
   if(along<24&&across<8){
    const deck=1.35+Math.max(0,along-13)*.08;
    h=T.MathUtils.lerp(h,deck,(1-smooth(16,24,along))*(1-smooth(3.6,8,across)));
   }
  }
  // Sandy shoreline around the perimeter; follows the playable radius.
  h=T.MathUtils.lerp(h,-2.2,smooth(WORLD_RADIUS.dungeon-15,WORLD_RADIUS.dungeon+6,r));
  return h;
 }
 colorAt(right:number,forward:number):T.Color{
  const z=-forward,h=vertexHeight(right,forward),road=terrainRoads.distanceToRoad(right,forward);
  const normal=this.normalAt(right,forward,TERRAIN_STEP),slope=1-normal.y;
  const color=new T.Color(palettes[terrainBiome(right,z)]);
  color.lerp(new T.Color('#586787'),smooth(.13,.38,slope)*.85);
  color.lerp(new T.Color('#f6d790'),(1-smooth(.5,3,h))*.85);
  color.lerp(new T.Color('#e7ba78'),(1-smooth(2,5.5,road))*.78);
  if(isBridge(right,z))color.set('#9e593e');
  color.multiplyScalar(.93+detail.noise2D(right*.14,forward*.14,7)*.075);
  return color;
 }
 sample(right:number,forward:number){
  return {height:vertexHeight(right,forward)+.02,normal:this.basis.upVector(),color:this.colorAt(right,forward)};
 }
}
export const dungeonTerrain=new WildseedTerrainSampler();
const heights=new Map<string,number>();
export function vertexHeight(right:number,forward:number){
 const key=right+':'+forward;let h=heights.get(key);
 if(h===undefined){h=dungeonTerrain.heightAt(right,forward);heights.set(key,h);}
 return h;
}
export function terrainHeight(mode:WorldMode,x:number,z:number):number{
 if(mode==='farm'){
  const rx=Math.floor(x/TILE)*TILE,rf=Math.floor(-z/TILE)*TILE,u=(x-rx)/TILE,v=(-z-rf)/TILE;
  const a=farmHeight(rx,-rf),b=farmHeight(rx+TILE,-rf),c=farmHeight(rx,-rf-TILE),d=farmHeight(rx+TILE,-rf-TILE);
  return u>=v?a+(b-a)*u+(d-b)*v:a+(d-c)*u+(c-a)*v;
 }
 // Match GameBlocks' a-b-d / a-d-c triangle split exactly, including -Z forward.
 const f=-z,rx=Math.floor(x/TERRAIN_STEP)*TERRAIN_STEP,rf=Math.floor(f/TERRAIN_STEP)*TERRAIN_STEP;
 const u=(x-rx)/TERRAIN_STEP,v=(f-rf)/TERRAIN_STEP;
 const a=vertexHeight(rx,rf),b=vertexHeight(rx+TERRAIN_STEP,rf),c=vertexHeight(rx,rf+TERRAIN_STEP),d=vertexHeight(rx+TERRAIN_STEP,rf+TERRAIN_STEP);
 return u>=v?a+(b-a)*u+(d-b)*v:a+(d-c)*u+(c-a)*v;
}


function farmHeight(x:number,z:number){let h=0;for(const [hx,hz,r,peak] of [[-22,-10,7,2.5],[19,20,8,3],[-18,21,6,2]])h=Math.max(h,(1-smooth(0,r,Math.hypot(x-hx,z-hz)))*peak);return h*(1-smooth(27,30,Math.hypot(x,z)));}
