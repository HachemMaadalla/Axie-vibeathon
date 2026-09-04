import * as T from 'three';
import {toonMaterial} from './toon';
type AnimatedMaterial=T.Material&{userData:{motionTime?:{value:number};motionStrength?:{value:number}}};
const animated=new Set<AnimatedMaterial>();
function track<M extends AnimatedMaterial>(material:M,strength:number,fall=false){
 const time={value:0},power={value:strength};material.userData.motionTime=time;material.userData.motionStrength=power;animated.add(material);
 material.onBeforeCompile=shader=>{
  shader.uniforms.motionTime=time;shader.uniforms.motionStrength=power;
  shader.vertexShader='uniform float motionTime; uniform float motionStrength;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
   float motionPhase=position.x*0.43+position.z*0.31+motionTime*1.75;
   transformed.x += sin(motionPhase)*motionStrength;
   transformed.z += cos(motionPhase*0.77)*motionStrength*0.42;
   ${fall?'transformed.z += sin(position.y*1.4-motionTime*5.0)*motionStrength*0.55;':''}`);
 };
 material.customProgramCacheKey=()=>fall?'garden-fall-v1':'garden-wind-v1';return material;
}
let currentSeason=-1;
export function setGardenSeason(season:number){if(season===currentSeason)return;currentSeason=season;for(const m of windCache.values()){const original=m.userData.originalColor as T.Color|undefined;if(!original)continue;m.color.copy(original);const hsl={h:0,s:0,l:0};original.getHSL(hsl);if(hsl.h>.16&&hsl.h<.48){if(season===2)m.color.lerp(new T.Color('#e9ae46'),.38);if(season===3)m.color.lerp(new T.Color('#b7d4cc'),.3);}}}
const windCache=new Map<string,T.MeshToonMaterial>();
export function windMaterial(color:string,strength=.12){
 const key=color+':'+strength;let material=windCache.get(key);if(!material){const created=toonMaterial(color);created.side=T.DoubleSide;material=track(created,strength);material.userData.originalColor=material.color.clone();windCache.set(key,material);currentSeason=-1;}return material;
}
export function waterMaterial(color:string,fall=false){
 const material=track(new T.MeshBasicMaterial({color,transparent:true,opacity:fall?.78:.88,side:fall?T.DoubleSide:T.FrontSide,depthWrite:false}),fall?.13:.045,fall);
 material.name=fall?'animated-waterfall':'animated-stream';return material;
}
export function setGardenMotionTime(time:number,reduced=false){for(const material of animated)material.userData.motionTime!.value=reduced?0:time;}
