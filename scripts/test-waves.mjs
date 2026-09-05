import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
registerHooks({resolve(s,c,next){try{return next(s,c);}catch(e){if(s.startsWith('.')&&!/\.[a-z]+$/i.test(s))return next(s+'.ts',c);throw e;}}});
const {WaveDirector}=await import('../lib/game/waves.ts');
const {freshFarm,emptyLoot,settleExpedition}=await import('../lib/game/state.ts');
const {grantQuality,qualityCounts}=await import('../lib/game/quality.ts');
let n=0;const test=(name,fn)=>{fn();console.log('PASS '+name);n++;};
test('Waves finish only when all scheduled enemies and survivors are gone; next begins after four seconds',()=>{
 const w=new WaveDirector();let alive=0,total=0;const spawn=()=>{alive++;total++;};
 for(let i=0;i<500;i++)w.tick(.05,alive,spawn);
 assert.equal(total,10);assert.equal(w.number,1);assert.equal(w.breakLeft,0);
 alive=0;w.tick(.05,alive,spawn);assert.equal(w.breakLeft,4);
 w.tick(0,0,spawn);assert.equal(w.breakLeft,4);
 w.tick(3.9,0,spawn);assert.equal(w.number,1);w.tick(.11,0,spawn);assert.equal(w.number,2);
 assert.equal(total,10);for(let i=0;i<400;i++)w.tick(.05,alive,spawn);assert.equal(total,24);
});
test('Boss every fifth wave, bounded population, and reset starts clean',()=>{
 const w=new WaveDirector();const bosses=[];
 for(let i=0;i<20000&&w.number<11;i++)w.tick(.05,0,boss=>{if(boss)bosses.push(w.number);});
 assert.deepEqual(bosses,[5,10]);const before=w.remaining;w.tick(20,60,()=>assert.fail('over cap'));assert.equal(w.remaining,before);
 w.reset();assert.equal(w.number,1);assert.equal(w.remaining,10);assert.equal(w.completed,0);assert.equal(w.breakLeft,0);
});
test('Death removes only current run loot; voluntary extraction keeps every tier',()=>{
 for(const outcome of ['lost','escaped']){
  const f=freshFarm();grantQuality(f,'seed:moonberry',2,3);const before=structuredClone(f),loot=emptyLoot();loot.moonberry=5;loot.soil=3;
  const result=settleExpedition(f,loot,outcome,1,{moonberry:[2,2],soil:[1,1]});
  if(outcome==='lost'){assert.equal(result.moonberry,0);assert.equal(result.soil,0);assert.deepEqual(f.seeds,before.seeds);assert.deepEqual(f.quality,before.quality);assert.equal(f.soil,before.soil);}
  else{assert.equal(result.moonberry,5);assert.equal(result.soil,3);assert.deepEqual(qualityCounts(f,'seed:moonberry'),[4,2,4]);}
  assert.equal(f.clears,0);
 }
});
console.log(n+' wave and extraction checks passed.');
