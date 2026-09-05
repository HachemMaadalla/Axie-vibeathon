// Simulation-time only: pauses and hidden tabs do not advance a wave.
export class WaveDirector{
 number=1;remaining=10;breakLeft=0;completed=0;private spawnIn=.8;private bossPending=false;
 reset(){this.number=1;this.remaining=10;this.breakLeft=0;this.completed=0;this.spawnIn=.8;this.bossPending=false;}
 tick(dt:number,alive:number,spawn:(boss:boolean)=>void){
  if(this.breakLeft>0){
   this.breakLeft=Math.max(0,this.breakLeft-dt);
   if(this.breakLeft===0){this.number++;this.remaining=Math.min(42,10+(this.number-1)*4);this.bossPending=this.number%5===0;this.spawnIn=.3;}
   return;
  }
  if(this.remaining===0&&!this.bossPending&&alive===0){this.completed=this.number;this.breakLeft=4;return;}
  this.spawnIn-=dt;if(this.spawnIn>0||alive>=60)return;
  if(this.bossPending){spawn(true);this.bossPending=false;this.spawnIn=1.2;return;}
  const count=Math.min(3,this.remaining,60-alive);
  for(let i=0;i<count;i++)spawn(false);
  this.remaining-=count;this.spawnIn=Math.max(.65,1.4-this.number*.04);
 }
}
