import * as T from 'three';
import {toonMaterial} from './toon';
import type {EnemyKind} from './enemies';

export const ENEMY_GEOMETRY={
 round:new T.SphereGeometry(1,8,6),
 spike:new T.ConeGeometry(1,1,6),
 block:new T.BoxGeometry(1,1,1)
};
export type EnemyRig={legs:T.Group[];arms:T.Group[];wings:T.Group[];head:T.Group;body:T.Group;materials:T.MeshToonMaterial[]};
export function makeEnemyRig(kind:EnemyKind,visual:T.Group):EnemyRig{
 const materials=new Map<string,T.MeshToonMaterial>();
 const mat=(c:string,glow=false)=>{const key=c+glow;let m=materials.get(key);if(!m){const base=new T.Color(c);if(!glow){const hsl={h:0,s:0,l:0};base.getHSL(hsl);base.setHSL(hsl.h,hsl.s*.7,hsl.l*.8);}m=toonMaterial(base);m.userData.glow=glow;m.emissive.set(glow?c:'#000000');m.emissiveIntensity=glow?.65:0;materials.set(key,m);}return m;};
 const shape=(parent:T.Object3D,type:keyof typeof ENEMY_GEOMETRY,c:string,x:number,y:number,z:number,w:number,h:number,d:number,glow=false)=>{
  const m=new T.Mesh(ENEMY_GEOMETRY[type],mat(c,glow));m.userData.enemyShape=type;m.position.set(x,y,z);m.scale.set(w,h,d);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
 };
 const orb=(p:T.Object3D,c:string,x:number,y:number,z:number,w:number,h:number,d:number,glow=false)=>shape(p,'round',c,x,y,z,w,h,d,glow);
 const spike=(p:T.Object3D,c:string,x:number,y:number,z:number,w:number,h:number,d:number)=>shape(p,'spike',c,x,y,z,w,h,d);
 const pivot=(p:T.Object3D,x:number,y:number,z:number)=>{const g=new T.Group();g.position.set(x,y,z);p.add(g);return g;};
 const body=pivot(visual,0,0,0),head=pivot(body,0,0,0),legs:T.Group[]=[],arms:T.Group[]=[],wings:T.Group[]=[];
 const eyes=(p:T.Object3D,y:number,z:number,spacing=.23,size=.17,color='#ffda69')=>{for(const side of [-1,1]){
  shape(p,'block','#15222a',side*spacing,y,z,size*2.1,size*.95,.16).rotation.z=-side*.18;
  shape(p,'block',color,side*spacing,y,z+.1,size*1.45,size*.38,.05,true).rotation.z=-side*.18;
  spike(p,'#343c37',side*(spacing+size*.15),y+size*.85,z+.04,size*1.2,size*.45,.13).rotation.z=side*.7;
 }};
 const limb=(side:number,y:number,z:number,c:string,arm=false)=>{const g=pivot(body,side*(arm?.64:.3),y,z);orb(g,c,side*.1,-.28,0,arm?.21:.17,.38,.2);orb(g,'#253a3a',side*.12,-.58,.06,.2,.15,.22);orb(g,c,side*.15,-.68,.19,.24,.15,.36);(arm?arms:legs).push(g);return g;};
 const leaf=(p:T.Object3D,x:number,y:number,z:number,side:number,c='#4a9d55')=>{orb(p,'#234e3e',x,y,z,.42,.14,.3).rotation.z=side*.3;orb(p,c,x,y+.05,z,.35,.13,.25).rotation.z=side*.3;};
 if(kind==='beetle'){
  orb(body,'#343a35',0,.63,0,.78,.48,1);
  for(const s of [-1,1]){
   orb(body,'#603b2a',s*.34,.9,-.15,.5,.53,.92);
   orb(body,s<0?'#ee9445':'#ffc35e',s*.34,.98,-.17,.43,.47,.84);
   for(let i=0;i<3;i++){const l=pivot(body,s*.63,.55,(i-1)*.64);orb(l,'#744b38',s*.34,-.05,0,.42,.12,.13).rotation.z=-s*.35;spike(l,'#f5d7a0',s*.62,-.3,.05,.13,.55,.13).rotation.z=s*.2;legs.push(l);}
   const a=pivot(head,s*.4,.5,.85);spike(a,'#fff0bc',s*.06,0,.45,.17,.85,.16).rotation.x=Math.PI/2;arms.push(a);
  }
  orb(head,'#bd673b',0,.69,.91,.54,.36,.44);eyes(head,.79,1.29,.25,.16);
  spike(head,'#ffda7f',0,1.19,.94,.23,.8,.22).rotation.x=.4;
  for(let i=0;i<3;i++)orb(body,'#683e2d',0,1.38-i*.08,-.1-i*.38,.08,.055,.13);
 }else if(kind==='stalker'||kind==='guardian'||kind==='brute'){
  const elder=kind==='guardian',brute=kind==='brute',bark=elder?'#765037':brute?'#466c80':'#7b6946',leafColor=brute?'#7cbed0':'#70b955';
  orb(body,'#2c453c',0,1.05,0,.53,.67,.39);
  for(const s of [-1,1]){
   orb(body,bark,s*.27,1.14,0,.32,.65,.42).rotation.z=s*-.1;
   limb(s,.7,0,bark);const arm=limb(s,1.55,0,bark,true);
   orb(arm,leafColor,s*.18,-.1,0,.36,.3,.35);
   for(let c=0;c<3;c++)spike(arm,'#f1dfb0',s*.15+(c-1)*.15,-.9,.28,.07,.38,.1).rotation.x=-.5;
   leaf(body,s*.53,1.74,-.1,s,leafColor);
   if(elder){leaf(body,s*.75,1.56,-.2,s,'#dec45b');spike(body,'#c7d97c',s*.85,1.85,-.18,.15,.7,.18).rotation.z=-s*.7;}
  }
  orb(body,'#253833',0,1.13,.4,.3,.38,.08);orb(body,elder?'#ffd457':brute?'#79e7ff':'#b8ed6a',0,1.13,.48,.14,.23,.08,true);
  head.position.y=1.73;orb(head,bark,0,.2,0,.46,.43,.4);
  orb(head,'#253936',0,.18,.35,.38,.24,.09);eyes(head,.23,.44,.19,.135);
  for(const s of [-1,1]){
   const horn=spike(head,brute?'#b8ecf7':'#ae8750',s*.33,.69,-.1,.12,.95,.13);horn.rotation.z=-s*.35;
   leaf(head,s*.45,.76,-.1,s,leafColor);
   if(elder){spike(head,'#f8d576',s*.59,.92,-.1,.095,.75,.1).rotation.z=-s*.45;leaf(head,s*.72,.83,-.1,s);}
  }
  if(brute){const club=pivot(arms[1],.22,-.6,.1);orb(club,'#355069',0,0,.25,.28,.28,.38);orb(club,'#91cede',0,-.03,.47,.46,.4,.38);for(let i=0;i<3;i++)spike(club,'#dbfbff',(i-1)*.24,.36,.46,.09,.32,.1);}
 }else if(kind==='shaman'||kind==='bomber'){
  const bomb=kind==='bomber';
  orb(body,bomb?'#6f8460':'#62558a',0,.73,0,bomb?.65:.48,.65,.43);
  for(const s of [-1,1]){limb(s,.63,0,'#dac8a2');const a=pivot(body,s*.45,1,0);orb(a,'#b8ae94',s*.11,-.12,.1,.17,.29,.2);arms.push(a);}
  head.position.y=1.25;orb(head,'#ecd6aa',0,0,0,.43,.38,.36);eyes(head,.02,.37,.18,.13,bomb?'#fd863f':'#a5f0f1');
  orb(head,'#302f46',0,.32,0,.94,.16,.79);orb(head,bomb?'#ff7644':'#b57ede',0,.5,-.07,.94,.47,.81);
  for(let i=0;i<7;i++){const a=i*2.4;orb(head,'#fff0bf',Math.cos(a)*(.28+i%2*.3),.76-i%2*.08,Math.sin(a)*.5,.13,.065,.12);}
  if(bomb){
   orb(body,'#345b48',0,1,-.48,.6,.51,.43);
   for(let i=0;i<3;i++){const x=(i-1)*.33;orb(body,'#ffd268',x,1.25,-.73,.22,.3,.23,true);spike(body,'#78b357',x,1.59,-.73,.1,.2,.1);}
  }else{
   const staff=pivot(body,.8,1,0);orb(staff,'#805940',0,.17,0,.065,.95,.065);
   orb(staff,'#3a3857',0,1.14,0,.26,.28,.25);orb(staff,'#92f4c5',0,1.17,.1,.19,.2,.17,true);
   for(const s of [-1,1])spike(staff,'#d8bc76',s*.25,1.1,0,.075,.6,.075).rotation.z=-s*.35;
   arms.push(staff);
  }
 }else if(kind==='moth'||kind==='broodqueen'){
  const queen=kind==='broodqueen';
  orb(body,'#28485b',0,.79,0,.33,.6,.37);orb(body,queen?'#d581c8':'#80dcd1',0,.65,-.1,.28,.53,.4);
  orb(body,'#ffcd5c',0,.51,.26,.21,.3,.14,true);orb(head,'#e0f4c3',0,1.26,.04,.36,.3,.32);eyes(head,1.28,.33,.16,.12);
  for(const s of [-1,1]){
   spike(head,'#315a64',s*.2,1.65,0,.05,.6,.06).rotation.z=-s*.3;orb(head,'#ffe586',s*.28,1.95,0,.08,.08,.08,true);
   const w=pivot(body,s*.18,1,0);
   orb(w,'#234551',s*.88,.14,-.04,1.02,.58,.09).rotation.z=s*.34;
   orb(w,queen?'#b875d6':'#64cace',s*.88,.17,.01,.93,.49,.07).rotation.z=s*.34;
   orb(w,'#253b54',s*1.1,.22,.09,.32,.3,.035);orb(w,'#ffd580',s*1.1,.22,.12,.2,.2,.027);orb(w,'#233f55',s*1.1,.22,.15,.075,.12,.02);
   orb(w,'#315866',s*.65,-.51,-.03,.65,.39,.09).rotation.z=-s*.4;
   orb(w,queen?'#ed9dd9':'#acf0c3',s*.65,-.49,.02,.57,.31,.07).rotation.z=-s*.4;wings.push(w);
   if(queen){for(let i=0;i<3;i++){const l=pivot(body,s*.3,.7-i*.22,.1);orb(l,'#f8d69e',s*.24,-.14,.13,.3,.055,.065).rotation.z=-s*.3;legs.push(l);}spike(head,'#f9d174',s*.22,1.67,.03,.12,.52,.12).rotation.z=-s*.2;}
  }
  if(queen)spike(head,'#ffda79',0,1.85,.07,.13,.66,.13);
 }else if(kind==='crystal'||kind==='golem'){
  const golem=kind==='golem';
  orb(body,'#354e74',0,.88,0,.62,.58,.5);
  for(const s of [-1,1]){
   const arm=pivot(body,s*.65,1.1,0);orb(arm,'#446f9b',s*.11,-.25,0,.25,.38,.3);orb(arm,'#80c8e5',s*.18,-.58,.19,.38,.27,.35);arms.push(arm);
   const leg=pivot(body,s*.36,.5,0);orb(leg,'#527995',0,-.15,.16,.32,.25,.38);legs.push(leg);
   spike(body,'#a5f2fb',s*.44,1.38,-.14,.25,1.1,.3).rotation.z=-s*.35;
   spike(body,'#429bdd',s*.76,1.14,-.1,.15,.8,.18).rotation.z=-s*.65;
  }
  orb(head,'#33496b',0,1.34,.32,.43,.29,.26);eyes(head,1.4,.55,.2,.13,'#ffdb6d');
  spike(body,'#87e9fa',0,1.85,-.12,.34,1.3,.34);spike(body,'#d1fbff',-.11,1.79,.02,.14,.99,.18);
  orb(body,'#223d64',0,.85,.5,.26,.29,.08);orb(body,'#fba85c',0,.85,.56,.16,.2,.08,true);
  if(golem){for(const s of [-1,1]){orb(arms[s<0?0:1],'#477bac',s*.1,-.65,.24,.48,.44,.5);for(let i=0;i<3;i++)spike(arms[s<0?0:1],'#bdedfa',s*.12+(i-1)*.23,-.3,.3,.14,.65,.15);}spike(head,'#ffce76',0,1.74,.26,.1,.42,.12);}
 }
 // Angular plates and asymmetrical growths break up the soft base anatomy.
 if(kind==='beetle'){
  for(const side of [-1,1])for(let i=0;i<3;i++){
   const plate=shape(body,'block','#8e6543',side*.36,1.14-i*.035,-.63+i*.46,.56,.16,.38);plate.rotation.z=-side*.25;
   spike(body,'#c5b790',side*.77,.99,-.6+i*.48,.12,.46,.14).rotation.z=-side*.95;
  }
 }else if(kind==='stalker'||kind==='guardian'||kind==='brute'){
  for(const side of [-1,1]){
   for(let i=0;i<3;i++)shape(body,'block','#55574a',side*(.35-i*.04),1.43-i*.22,.32,.25,.16,.22).rotation.z=side*.22;
   spike(arms[side<0?0:1],'#a6a288',side*.24,.25,-.08,.18,.66,.2).rotation.z=-side*.4;
  }
  shape(head,'block','#4e5547',0,.04,.4,.26,.3,.14);
 }else if(kind==='shaman'||kind==='bomber'){
  for(let i=0;i<8;i++){const a=i*Math.PI/4;spike(head,'#716b65',Math.cos(a)*.72,.3,Math.sin(a)*.58,.12,.42,.13).rotation.z=Math.cos(a)*.5;}
  for(const side of [-1,1])spike(head,'#c0b49b',side*.15,-.25,.32,.07,.23,.08).rotation.x=Math.PI;
 }else if(kind==='moth'||kind==='broodqueen'){
  for(const side of [-1,1]){
   spike(head,'#abafa2',side*.18,1.07,.42,.085,.44,.09).rotation.x=1.1;
   for(let i=0;i<3;i++)spike(wings[side<0?0:1],'#536076',side*(1.08+i*.19),-.13+i*.14,-.03,.14,.48,.065).rotation.z=-side*1.1;
  }
 }else{
  for(const side of [-1,1])for(let i=0;i<3;i++){
   const plate=shape(body,'block','#526578',side*.36,1.18-i*.25,.43,.5,.2,.23);plate.rotation.z=side*.12;
  }
 }
 return {body,head,legs,arms,wings,materials:[...materials.values()]};
}
