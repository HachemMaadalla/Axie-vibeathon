import * as T from 'three';
import {PLOT_COUNT} from './state';
export const plotPosition=(i:number)=>new T.Vector3((i%4)*2.15-3.25,.2,Math.floor(i/4)*2.15-.8+(i>=12?1.4:0));
export function nearestPlot(position:T.Vector3){
 let index=0,distance=Infinity;
 for(let i=0;i<PLOT_COUNT;i++){const p=plotPosition(i),d=Math.hypot(position.x-p.x,position.z-p.z);if(d<distance){index=i;distance=d;}}
 return {index,distance,inReach:distance<=2.8&&Math.abs(position.y-.2)<2.4};
}

