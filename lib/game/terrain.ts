export type WorldMode='farm'|'dungeon';
export const TILE=1.25;
export const WORLD_RADIUS={farm:30,dungeon:64};
const hills={farm:[[-22,-10,7,2.5],[19,20,8,3],[-18,21,6,2]],dungeon:[[26,-22,16,5],[-29,-19,17,6],[17,35,14,4],[-34,26,13,5],[42,14,10,3]]};
export function terrainHeight(mode:WorldMode,x:number,z:number){
 const radius=WORLD_RADIUS[mode];
 x=-radius+Math.round((x+radius)/TILE)*TILE;
 z=-radius+Math.round((z+radius)/TILE)*TILE;
 let height=0;
 for(const [hx,hz,r,h] of hills[mode]){
  const d=Math.hypot(x-hx,z-hz),rise=Math.max(0,Math.min(1,(r-d)/(r*.8)));
  height=Math.max(height,Math.floor(rise*h*4)/4);
 }
 return height;
}

