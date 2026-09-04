import * as T from 'three';
export const plotPosition=(i:number)=>new T.Vector3((i%4)*2.15-3.25,.2,Math.floor(i/4)*2.15-.8);
export function nearestPlot(position:T.Vector3){
 let index=0,distance=Infinity;
 for(let i=0;i<12;i++){const p=plotPosition(i),d=Math.hypot(position.x-p.x,position.z-p.z);if(d<distance){index=i;distance=d;}}
 return {index,distance,inReach:distance<=2.8&&Math.abs(position.y-.2)<2.4};
}

