export type WorldMode='farm'|'dungeon';
export type Biome='woodland'|'marsh'|'badlands'|'crystal';
export const TILE=1.25;
export const WORLD_RADIUS={farm:30,dungeon:64*Math.sqrt(10)};
export const BRIDGES=[-135,-65,35,115];
export const riverX=(z:number)=>Math.sin(z*.022)*22+Math.cos(z*.008)*25;
export function terrainBiome(x:number,z:number):Biome{
 if(x>65&&z<45)return 'crystal';
 if(z>65)return 'badlands';
 if(x< -65&&z> -45)return 'marsh';
 return 'woodland';
}
export function isBridge(x:number,z:number){return BRIDGES.some(b=>Math.abs(z-b)<2.2&&Math.abs(x-riverX(b))<15);}
export function isWater(x:number,z:number){return Math.abs(x-riverX(z))<4.5&&!isBridge(x,z)&&Math.hypot(x,z)>28;}
const farmHills=[[-22,-10,7,2.5],[19,20,8,3],[-18,21,6,2]];
export function terrainHeight(mode:WorldMode,x:number,z:number){
 const radius=WORLD_RADIUS[mode];x=-radius+Math.round((x+radius)/TILE)*TILE;z=-radius+Math.round((z+radius)/TILE)*TILE;
 if(mode==='farm'){
  let h=0;for(const [hx,hz,r,peak]of farmHills)h=Math.max(h,Math.floor(Math.max(0,Math.min(1,(r-Math.hypot(x-hx,z-hz))/(r*.8)))*peak*4)/4);return h;
 }
 const startBlend=Math.max(0,Math.min(1,(Math.hypot(x,z)-12)/25));
 let h=5+3*Math.sin(x*.025)*Math.cos(z*.019)+2*Math.sin((x+z)*.046);
 h+=Math.max(0,1-Math.hypot((x+104)*.8,z+85)/75)*22;
 h+=Math.max(0,1-Math.hypot(x-112,(z+60)*.75)/70)*18;
 h+=Math.max(0,1-Math.hypot(x-55,z-127)/65)*15;
 const riverDistance=Math.abs(x-riverX(z)),valley=Math.max(0,Math.min(1,(riverDistance-4)/19));
 h=Math.max(0,h)*valley*startBlend;
 for(const b of BRIDGES)if(Math.abs(z-b)<2.2&&Math.abs(x-riverX(b))<15)h=Math.max(h,Math.min(1.25,(15-Math.abs(x-riverX(b)))*.18));
 return Math.floor(h*4)/4;
}

