import assert from 'node:assert/strict';
import {KitchenRun} from '../lib/game/kitchen-game.ts';
const totals=[];
for(let recipe=0;recipe<8;recipe++){
 const r=new KitchenRun(recipe);let frames=0;
 while(!r.done&&frames++<3000){
  const falling=r.pieces.filter(p=>p.state==='fall'&&p.y<.77).map(p=>({p,t:(-p.vy+Math.sqrt(p.vy*p.vy+1.7*Math.max(0,.77-p.y)))/.85})).sort((a,b)=>a.t-b.t);
  const next=falling[0];let target=r.time<14?.19:.5;
  if(next&&next.t<1.1){target=next.p.x+next.p.vx*next.t;if(next.p.coal)target=target>.5?.23:.77;}
  r.move(target);r.plate();
  if(r.time>14&&r.pieces.some(p=>p.state==='pan'&&p.sinceFlip>3.5)&&r.heat>.7&&Math.abs(r.velocity)<.03)r.toss();
  r.tick(1/60);
 }
 assert.ok(r.done);assert.equal(r.caught,8);assert.equal(r.plated,8);assert.ok(r.points>=65,'Skilled play must be viable for every recipe');assert.ok(r.tosses>0);totals.push(r.points);
 const end=JSON.stringify(r);r.tick(.05);r.toss();r.plate();r.move(1);assert.equal(JSON.stringify(r),end);
}
assert.ok(totals.filter(n=>n>=85).length>=5);
const idle=new KitchenRun();for(let i=0;i<2700;i++)idle.tick(1/60);assert.ok(idle.done);assert.ok(idle.points<40);assert.ok(idle.lost>0);
const cooling=new KitchenRun();cooling.move(.14);for(let i=0;i<100;i++)cooling.tick(.05);assert.ok(cooling.heat<.3);cooling.move(.5);for(let i=0;i<100;i++)cooling.tick(.05);assert.ok(cooling.heat>.6);
console.log('PASS all eight recipes, catch/toss/plate strategy, attainable chef rewards, idle losses, heat management and completion lock',totals);
