export type KitchenPiece={id:number;x:number;y:number;vx:number;vy:number;state:'fall'|'pan'|'lost'|'served';cook:number;burn:number;sinceFlip:number;offset:number;coal:boolean};
const clamp=(n:number,a=0,b=1)=>Math.max(a,Math.min(b,n));
export class KitchenRun{
 readonly duration=44;time=0;pan=.5;velocity=0;target=.5;heat=.42;cooldown=0;pieces:KitchenPiece[]=[];
 done=false;caught=0;lost=0;tosses=0;served=false;flash='';flashTime=0;private next=0;
 constructor(readonly recipe=0){}
 get remaining(){return Math.max(0,this.duration-this.time);}
 get onFlame(){return Math.abs(this.pan-.5)<.2;}
 get ready(){return this.pieces.filter(p=>p.state==='pan'&&p.cook>=.82&&p.burn<.55).length;}
 get plated(){return this.pieces.filter(p=>p.state==='served').length;}
 get edible(){return this.pieces.filter(p=>p.state!=='lost'&&!p.coal);}
 get points(){const food=this.edible;return Math.round(clamp(food.reduce((sum,p)=>sum+clamp(p.cook/.92)*clamp(1-p.burn),0)/8)*100);}
 get score(){return this.points>=85?3:this.points/100*3;}
 note(text:string){this.flash=text;this.flashTime=1.2;}
 move(x:number){if(!this.done)this.target=clamp(x,.14,.86);}
 toss(){if(this.done||this.cooldown>0)return;const food=this.pieces.filter(p=>p.state==='pan');if(!food.length)return;
  this.cooldown=.9;this.tosses++;this.heat=Math.max(.1,this.heat-.08);
  for(const p of food){p.state='fall';p.y=.745;p.vy=-.83-Math.abs(p.offset)*.4;p.vx=this.velocity*.4-p.offset*.25;p.sinceFlip=0;}
  this.note('Catch the flip!');
 }
 plate(){if(this.done)return;let n=0;for(const p of this.pieces)if(p.state==='pan'&&p.cook>=.82&&p.burn<.55){p.state='served';n++;}if(n)this.note('Plated +'+n);if(this.plated===8){this.done=true;this.served=true;}}
 serve(){if(this.done||this.time<15)return;this.done=true;this.served=true;}
 tick(dt:number){
  if(this.done)return;dt=clamp(dt,0,.05);this.time+=dt;this.cooldown=Math.max(0,this.cooldown-dt);this.flashTime=Math.max(0,this.flashTime-dt);
  const old=this.pan;this.pan+=clamp((this.target-this.pan)*9,-.65,.65)*dt;this.pan=clamp(this.pan,.14,.86);this.velocity=dt?(this.pan-old)/dt:0;
  this.heat=clamp(this.heat+dt*(this.onFlame?.13:-.18),.08,1);
  while(this.next<10&&this.time>=.7+this.next*1.3){
   const n=this.next++,coal=n===3||n===7,x=.22+((n*37+this.recipe*13)%57)/100;
   this.pieces.push({id:n,x,y:.02,vx:Math.sin(n*2+this.recipe)*.025,vy:.02,state:'fall',cook:0,burn:0,sinceFlip:0,offset:0,coal});
  }
  for(const p of this.pieces){
   if(p.state==='lost'||p.state==='served')continue;
   if(p.state==='pan'){
    p.x=this.pan+p.offset;p.y=.77-(p.id%2)*.035;p.sinceFlip+=dt*this.heat;
    p.cook+=dt*this.heat*(.063+(this.recipe%3)*.004);
    if(this.heat>.73&&p.sinceFlip>4)p.burn+=dt*(this.heat-.68)*.24;
    if(p.cook>1.14)p.burn+=dt*.12;
   }else{
    const previous=p.y;p.vy+=dt*.85;p.x+=p.vx*dt;p.y+=p.vy*dt;
    if(p.vy>0&&previous<=.77&&p.y>=.77&&Math.abs(p.x-this.pan)<.155){
     if(p.coal){p.state='lost';this.heat=clamp(this.heat+.2);for(const f of this.pieces)if(f.state==='pan')f.burn+=.12;this.note('Coal! Move away');}
     else{p.state='pan';p.offset=((p.id-(p.id>3?1:0)-(p.id>7?1:0))-3.5)*.029;p.sinceFlip=0;if(p.cook===0)this.caught++;this.note(p.cook?'Nice catch!':'+ Ingredient');}
    }else if(p.y>1.1){p.state='lost';if(!p.coal){this.lost++;this.note('Dropped!');}}
   }
  }
  if(this.time>=this.duration)this.done=true;
 }
}
