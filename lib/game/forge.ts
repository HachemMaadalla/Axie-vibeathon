const clamp=(n:number,a=0,b=1)=>Math.max(a,Math.min(b,n));
export const FORGE_COLS=9,FORGE_ROWS=5;
export type ForgeTool='fine'|'wide'|'repair';
export class ForgeRun{
 phase:'shape'|'quench'|'done'='shape';time=0;heat=.7;heating=false;tool:ForgeTool='fine';selected=22;cooldown=0;hits=0;damage=0;flash='';flashTime=0;
 readonly pattern:boolean[];cells:boolean[];charge=0;charging=false;
 bath=.5;bathSpeed=0;dipping=false;quenchTime=0;quenchGood=0;
 constructor(tier=1){
  const rows=tier===1?['.###.....','.#.#.....','.#######.','.....#.#.','.....###.']:['.###.....','.#.#.....','.#######.','....#.#..','....###..'];
  this.pattern=rows.join('').split('').map(c=>c==='#');
  this.cells=Array.from({length:45},(_,i)=>{const x=i%9,y=Math.floor(i/9);return x>=1&&x<=7&&y<=3||this.pattern[i];});
 }
 get done(){return this.phase==='done';}
 get match(){const required=this.pattern.filter(Boolean).length,missing=this.pattern.filter((p,i)=>p&&!this.cells[i]).length,extra=this.cells.filter((c,i)=>c&&!this.pattern[i]).length;return clamp(1-(missing*1.5+extra)/required);}
 get target(){return .5+Math.sin(this.quenchTime*1.15)*.23+Math.sin(this.quenchTime*2.6)*.07;}
 get coolingQuality(){return this.quenchTime?this.quenchGood/this.quenchTime:0;}
 get points(){return Math.round(clamp(this.match*.75+this.coolingQuality*.25-this.damage*.025)*100);}
 get score(){return this.points>=90?3:this.points/100*3;}
 note(s:string){this.flash=s;this.flashTime=1.1;}
 select(index:number){this.selected=clamp(Math.round(index),0,44);}
 press(){if(this.phase==='shape'&&!this.heating&&this.cooldown<=0){this.charging=true;this.charge=0;}}
 release(){if(!this.charging)return;this.charging=false;this.strike(this.selected,this.charge);}
 strike(index:number,power=.25){
  if(this.phase!=='shape'||this.heating||this.cooldown>0||index<0||index>=45)return;
  this.cooldown=.2;this.hits++;
  if(this.heat<.38){this.damage+=.2;this.note('Too cold - reheat');return;}
  if(this.heat>.9){this.damage+=.2;this.note('Too hot - let it cool');return;}
  const x=index%9,y=Math.floor(index/9),targets=[index];
  if(this.tool==='wide'&&power>=.4)for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]])if(x+dx>=0&&x+dx<9&&y+dy>=0&&y+dy<5)targets.push((y+dy)*9+x+dx);
  let bad=false;
  for(const i of targets){const fill=this.tool==='repair';if(this.cells[i]===fill)continue;this.cells[i]=fill;if(fill!==this.pattern[i])bad=true;}
  if(bad){this.damage+=.15;this.note('Repair the outline');}else{this.damage=Math.max(0,this.damage-.08);this.note(this.match>.999?'Pattern complete!':'Good shape');}
  this.heat=Math.max(0,this.heat-.025*(this.tool==='wide'?1.5:1));
 }
 beginQuench(){if(this.phase!=='shape')return;this.phase='quench';this.heating=false;this.charging=false;this.dipping=false;}
 tick(dt:number){
  if(this.phase==='done')return;dt=clamp(dt,0,.05);this.flashTime=Math.max(0,this.flashTime-dt);this.cooldown=Math.max(0,this.cooldown-dt);
  if(this.phase==='shape'){
   this.time+=dt;this.heat=clamp(this.heat+dt*(this.heating?.32:-.035));if(this.charging)this.charge=clamp(this.charge+dt*1.3);
   if(this.time>=55)this.beginQuench();
  }else{
   this.quenchTime+=dt;this.bathSpeed+=dt*(this.dipping?1.7:-1.4);this.bathSpeed*=Math.exp(-3*dt);this.bath=clamp(this.bath+this.bathSpeed*dt,.08,.92);
   if(this.bath===.08||this.bath===.92)this.bathSpeed=0;
   if(Math.abs(this.bath-this.target)<.14)this.quenchGood+=dt;
   if(this.quenchTime>=10){this.phase='done';this.dipping=false;}
  }
 }
}
