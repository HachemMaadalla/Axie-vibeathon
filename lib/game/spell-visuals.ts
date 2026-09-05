import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {toonMaterial} from './toon';
import type {WeaponId} from './build';

export const SPELL_COLORS:Record<WeaponId,{base:string;evolved:string;trail:string}>={
frost:{base:'#8eeaff',evolved:'#8eeaff',trail:'#8eeaff'},
void:{base:'#b299ff',evolved:'#b299ff',trail:'#b299ff'},
dagger:{base:'#c7e8ff',evolved:'#c7e8ff',trail:'#c7e8ff'},
beam:{base:'#fff1a3',evolved:'#fff1a3',trail:'#fff1a3'},
quake:{base:'#d3b17b',evolved:'#d3b17b',trail:'#d3b17b'},
venom:{base:'#a1df63',evolved:'#a1df63',trail:'#a1df63'},
 cannon:{base:'#56d3ef',evolved:'#ffd35e',trail:'#98edff'},
 sword:{base:'#65dfff',evolved:'#90ffe2',trail:'#e6ffff'},
 hammer:{base:'#ffbe67',evolved:'#ffd865',trail:'#f7eac9'},
 axe:{base:'#ff8d43',evolved:'#ffdf79',trail:'#ffedc5'},
 thorn:{base:'#b4ef35',evolved:'#ffdc58',trail:'#68b83e'},
 petal:{base:'#ff62b7',evolved:'#c780ff',trail:'#63edce'},
 spore:{base:'#8dda43',evolved:'#61efc2',trail:'#24a87d'},
 storm:{base:'#29c5ff',evolved:'#77e7ff',trail:'#a68bff'},
 ember:{base:'#ff812e',evolved:'#ffd45c',trail:'#ff4438'}
};
export const SPELL_INK='#112739';
// A real back-face hull keeps a border on airborne VFX, including against the sky.
export function inkMaterial(width=.035){
 const mat=new T.MeshBasicMaterial({color:SPELL_INK,side:T.BackSide,depthWrite:false});
 mat.name='spell-ink-hull';
 mat.onBeforeCompile=shader=>{shader.uniforms.inkWidth={value:width};shader.vertexShader='uniform float inkWidth;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed += normalize(normal) * inkWidth;');};
 mat.customProgramCacheKey=()=> 'spell-ink-'+width;
 return mat;
}
type Part={g:T.BufferGeometry;color:string;position?:number[];scale?:number[];rotation?:number[]};
function merge(parts:Part[]){
 const geometries=parts.map(p=>{
  let g=p.g.index?p.g.toNonIndexed():p.g;
  if(g!==p.g)p.g.dispose();
  g.deleteAttribute('uv');
  if(p.scale)g.scale(p.scale[0],p.scale[1],p.scale[2]);
  if(p.rotation){g.rotateX(p.rotation[0]);g.rotateY(p.rotation[1]);g.rotateZ(p.rotation[2]);}
  if(p.position)g.translate(p.position[0],p.position[1],p.position[2]);
  const color=new T.Color(p.color),values=new Float32Array(g.getAttribute('position').count*3);
  for(let i=0;i<values.length;i+=3){values[i]=color.r;values[i+1]=color.g;values[i+2]=color.b;}
  g.setAttribute('color',new T.BufferAttribute(values,3));return g;
 });
 const result=mergeGeometries(geometries,false)!;geometries.forEach(g=>g.dispose());result.computeBoundingSphere();return result;
}
function blade(points:number[][],depth=.09){
 const shape=new T.Shape();shape.moveTo(points[0][0],points[0][1]);points.slice(1).forEach(([x,y])=>shape.lineTo(x,y));shape.closePath();
 const g=new T.ExtrudeGeometry(shape,{depth,bevelEnabled:false,steps:1,curveSegments:1});g.translate(0,0,-depth/2);g.rotateX(Math.PI/2);return g;
}
function leaf(length=1,width=.3){return blade([[0,-length*.5],[-width*.7,-length*.12],[-width,length*.13],[0,length*.5],[width*.48,length*.07],[width*.45,-length*.27]]);}
function band(radius:number,color:string,inner=.87){
 return merge([
  {g:new T.RingGeometry(radius*(inner-.035),radius*1.025,48),color:SPELL_INK},
  {g:new T.RingGeometry(radius*inner,radius,48),color,position:[0,0,.012]}
 ]);
}
export function cartoonBandGeometry(inner:number,outer:number,color:string){return band(outer,color,inner/outer);}

export class SpellVisuals{
 private geometries=new Map<string,T.BufferGeometry>();
 private toon=toonMaterial('#ffffff');
 private ink=inkMaterial();
 private flat=new T.MeshBasicMaterial({vertexColors:true,side:T.DoubleSide});
 constructor(){this.toon.vertexColors=true;this.toon.emissive.set('#203449');this.toon.emissiveIntensity=.22;this.toon.name='cel-shaded-spell';}
 private cached(key:string,build:()=>Part[]){
  if(!this.geometries.has(key))this.geometries.set(key,merge(build()));
  const geo=this.geometries.get(key)!,mesh=new T.Mesh(geo,this.toon),border=new T.Mesh(geo,this.ink);
  mesh.name=key;border.name='ink-outline';mesh.add(border);return mesh;
 }
 sigil(id:'frost'|'void'|'dagger'|'beam'|'quake'|'venom',evolved=false){
  const color=SPELL_COLORS[id][evolved?'evolved':'base'];
  return this.cached(id+'-sigil-'+evolved,()=>id==='void'?[
   {g:new T.TorusGeometry(.38,.09,5,12),color,rotation:[Math.PI/2,0,0]},
   {g:new T.OctahedronGeometry(.24),color:'#35234f'}
  ]:id==='venom'?[
   {g:new T.SphereGeometry(.3,8,6),color},
   {g:new T.SphereGeometry(.16,6,4),color:'#e0ff9b',position:[.13,.25,0]}
  ]:[
   {g:new T.ConeGeometry(id==='quake'?.35:.13,id==='beam'?1.8:1,4),color,rotation:id==='dagger'||id==='beam'?[Math.PI/2,0,0]:[0,0,0]},
   {g:new T.OctahedronGeometry(.16),color:'#f5ffff'}
  ]);
 }
 thorn(evolved:boolean){
  return this.cached(evolved?'sunlance':'thorn-bolt',()=>{
   const color=evolved?'#ffdb58':'#a6e42d',dark=evolved?'#b88228':'#33823d';
   const parts:Part[]=[
    {g:new T.CylinderGeometry(.06,.08,.8,6),color:dark,rotation:[Math.PI/2,0,0],position:[0,0,-.4]},
    {g:blade([[0,-.6],[-.12,-.24],[-.26,-.3],[-.17,.05],[-.34,.06],[0,.95],[.27,.08],[.14,.11],[.2,-.22],[.07,-.17]],.14),color},
    {g:leaf(.9,.09),color:evolved?'#fff4bc':'#e8ff94',position:[-.015,.095,.22]},
    {g:leaf(.52,.16),color:'#48973e',position:[-.18,0,-.52],rotation:[0,-.7,0]},
    {g:leaf(.45,.14),color:'#86c74b',position:[.19,.01,-.43],rotation:[0,.85,0]}
   ];
   if(evolved)for(let i=0;i<8;i++){const a=i*Math.PI/4;parts.push({g:new T.ConeGeometry(.09,.3,4),color:'#fff09a',position:[Math.cos(a)*.3,Math.sin(a)*.3,-.26],rotation:[0,0,a-Math.PI/2]});}
   return parts;
  });
 }
 petal(evolved:boolean){
  return this.cached(evolved?'bloom-cyclone-petal':'orbit-petal',()=>[
   {g:blade([[0,-.52],[-.24,-.1],[-.3,.23],[-.15,.58],[.13,.87],[.1,.3],[.29,-.05],[.13,-.42]],.1),color:evolved?'#c67aff':'#f64fa7'},
   {g:blade([[-.08,-.32],[-.16,.15],[-.08,.52],[.04,.73],[.01,.18],[.11,-.14]],.025),color:evolved?'#f4b4ff':'#ffb8dc',position:[0,.066,0]},
   {g:leaf(.54,.17),color:'#4fd6b3',position:[.15,-.03,-.4],rotation:[0,.8,0]}
  ]);
 }
 meteor(evolved:boolean){
  return this.cached(evolved?'solar-harvest-meteor':'ember-meteor',()=>{
   const parts:Part[]=[{g:new T.IcosahedronGeometry(.43,1),color:'#ffb73f'}];
   for(let i=0;i<7;i++){const a=i*2.399,y=(i%3-1)*.2;parts.push({g:new T.IcosahedronGeometry(.25,0),color:i%2?'#473542':'#302d36',position:[Math.cos(a)*.29,y,Math.sin(a)*.29],scale:[1,.85,1]});}
   for(let i=0;i<3;i++){const a=i*Math.PI*2/3;parts.push({g:leaf(evolved?1.75:1.35,.3),color:i===1?'#ffad2e':'#ff5426',rotation:[-Math.PI/2,a,0],position:[Math.cos(a)*.2,.68,Math.sin(a)*.2]});}
   parts.push({g:new T.ConeGeometry(.24,evolved?1.35:1,5),color:'#ffe895',position:[0,.75,0]});
   return parts;
  });
 }
 mushroom(evolved:boolean){
  return this.cached(evolved?'dream-garden-mushrooms':'spore-mushroom',()=>{
   const parts:Part[]=[];
   const centers=evolved?[[-.32,0,.1],[.33,0,.2],[0,.17,-.2]]:[[0,0,0]];
   centers.forEach(([x,y,z],i)=>{
    parts.push({g:new T.CylinderGeometry(.1,.14,.34,7),color:'#b7edb0',position:[x,y+.22,z]});
    parts.push({g:new T.SphereGeometry(.34,9,6),color:evolved?'#57e3b4':'#92d937',scale:[1,.6,1],position:[x,y+.42,z]});
    for(let j=0;j<3;j++){const a=j*2.09+i;parts.push({g:new T.SphereGeometry(.07,6,4),color:'#e9ffbd',scale:[1,.35,1],position:[x+Math.cos(a)*.18,y+.56,z+Math.sin(a)*.18]});}
   });
   return parts;
  });
 }
 puff(evolved:boolean){return this.cached(evolved?'dream-spore':'green-spore',()=>[{g:new T.IcosahedronGeometry(.22,1),color:evolved?'#60e9bb':'#45b56c'},{g:new T.IcosahedronGeometry(.12,0),color:evolved?'#bdffe3':'#b5ef57',position:[-.07,.12,.08]}]);}
 flame(){return this.cached('burning-flame',()=>[{g:new T.ConeGeometry(.18,.8,5),color:'#ff6230',position:[0,.4,0]},{g:new T.ConeGeometry(.1,.52,4),color:'#ffe17a',position:[.02,.3,.08]}]);}
 cannonball(evolved:boolean){return this.cached(evolved?'broadside-ball':'cannon-ball',()=>[{g:new T.IcosahedronGeometry(.28,2),color:evolved?'#ffc740':'#376d87'},{g:new T.SphereGeometry(.13,7,5),color:evolved?'#fff0a0':'#b9f5ff',position:[-.1,.12,.16]}]);}
 swordStrike(point:T.Vector3,radius:number,angle:number,color:string,evolved=false){
  const root=new T.Group();root.name='vertical-sword-strike';root.position.copy(point);root.rotation.y=angle;
  for(const offset of evolved?[-1,0,1]:[0]){
   const cut=this.cached('vertical-sword-'+color,()=>[
    {g:blade([[.1,.05],[2.4,.12],[2.75,.24],[1.35,.7],[.22,1],[.06,.89],[.65,.5],[.95,.2]],.16),color,rotation:[0,0,Math.PI/2]},
    {g:blade([[.27,.86],[1.28,.61],[2.37,.23],[1.2,.65],[.22,.98]],.025),color:'#f4ffff',rotation:[0,0,Math.PI/2],position:[-.095,0,0]},
    {g:blade([[-.055,.18],[.055,.18],[.085,.88],[0,1],[-.085,.88]],.035),color:'#dcffff',position:[0,.065,0]}
   ]);
   cut.position.x=offset;cut.scale.z=radius;root.add(cut);
  }
  return root;
 }
 axeCleave(point:T.Vector3,radius:number,angle:number,color:string,evolved=false){
  const root=new T.Group();root.name='heavy-axe-cleave';root.position.copy(point).y+=.65;root.rotation.y=angle;
  for(const turn of evolved?[0,Math.PI]:[0]){
   const cleave=this.cached('axe-cleave-'+color+'-'+evolved,()=>{
    const arc=evolved?Math.PI*1.12:Math.PI*1.25,outer:number[][]=[],inner:number[][]=[],edge:number[][]=[];
    for(let i=0;i<=24;i++){const t=i/24,a=(t-.5)*arc,taper=Math.sin(t*Math.PI),r=.91+(i%4===2?.085:0)*taper;outer.push([Math.sin(a)*r,Math.cos(a)*r]);inner.push([Math.sin(a)*(r-.31*taper),Math.cos(a)*(r-.31*taper)]);edge.push([Math.sin(a)*(r-.055*taper),Math.cos(a)*(r-.055*taper)]);}
    return [
     {g:blade([...outer,...inner.slice().reverse()],.18),color},
     {g:blade([...outer,...edge.reverse()],.035),color:'#fff2c7',position:[0,.11,0]}
    ];
   });
   cleave.scale.set(radius,1,radius);cleave.rotation.y=turn;root.add(cleave);
  }
  return root;
 }
 ring(point:T.Vector3,radius:number,color:string,height?:(x:number,z:number)=>number){
  const geo=band(radius,color);geo.rotateX(-Math.PI/2);
  const pos=geo.getAttribute('position');
  for(let i=0;i<pos.count;i++)pos.setY(i,pos.getY(i)+.1+(height?height(point.x+pos.getX(i),point.z+pos.getZ(i))-point.y:0));
  geo.computeBoundingSphere();const mesh=new T.Mesh(geo,this.flat);mesh.name='outlined-spell-boundary';mesh.userData.transientGeometry=true;mesh.position.copy(point);return mesh;
 }
 lightning(from:T.Vector3,to:T.Vector3,evolved:boolean){
  const delta=to.clone().sub(from),side=new T.Vector3().crossVectors(delta,new T.Vector3(0,1,0)).normalize();
  if(side.lengthSq()<.01)side.set(1,0,0);
  const points=[from,from.clone().addScaledVector(delta,.28).addScaledVector(side,.35),from.clone().addScaledVector(delta,.56).addScaledVector(side,-.24).add(new T.Vector3(0,.2,0)),to];
  const parts:Part[]=[];
  for(let i=0;i<3;i++){
   const d=points[i+1].clone().sub(points[i]),mid=points[i].clone().add(points[i+1]).multiplyScalar(.5),rotation=new T.Euler().setFromQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),d.clone().normalize()));
   parts.push({g:new T.CylinderGeometry(.10,.14,d.length()+.08,5),color:evolved?'#59d5ff':'#24baff',position:mid.toArray(),rotation:[rotation.x,rotation.y,rotation.z]});
   parts.push({g:new T.CylinderGeometry(.038,.045,d.length()+.04,4),color:'#dcffff',position:mid.clone().add(new T.Vector3(0,.115,0)).toArray(),rotation:[rotation.x,rotation.y,rotation.z]});
  }
  if(evolved)for(let i=1;i<3;i++){const p=points[i];parts.push({g:new T.ConeGeometry(.13,.85,4),color:'#ab8aff',position:p.clone().add(new T.Vector3(.14,.3,0)).toArray(),rotation:[0,0,-.65]});}
  const geo=merge(parts),mesh=new T.Mesh(geo,this.toon);mesh.name=evolved?'thunder-grove-bolt':'storm-seed-bolt';mesh.userData.transientGeometry=true;mesh.add(new T.Mesh(geo,this.ink));return mesh;
 }
 release(object:T.Object3D){object.removeFromParent();object.traverse(o=>{if(o instanceof T.Mesh&&o.userData.transientGeometry)o.geometry.dispose();});}
 dispose(){this.geometries.forEach(g=>g.dispose());this.geometries.clear();this.toon.dispose();this.flat.dispose();this.ink.dispose();}
}

