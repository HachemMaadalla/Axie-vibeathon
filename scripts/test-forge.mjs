import assert from 'node:assert/strict';
import {ForgeRun} from '../lib/game/forge.ts';
const r=new ForgeRun();
r.press();r.tick(.05);r.release();assert.equal(r.phase,'heat');
r.press();for(let i=0;i<28;i++)r.tick(.05);r.release();assert.equal(r.phase,'strike');
const targets=[];
for(let i=0;i<5;i++){
 if(r.phase==='heat'){r.heat=.72;r.press();r.release();}
 targets.push(r.target);r.heat=.72;
 r.elapsed=(Math.asin((r.target-.5)/.46)+Math.PI/2)/(4.2+i*.4);
 r.press();assert.ok(r.hits[i]>.999);
}
assert.equal(new Set(targets).size,5);assert.equal(r.phase,'quench');
r.heat=.4;r.press();assert.equal(r.phase,'done');assert.ok(r.score>2.999);
r.press();r.release();r.tick(.05);assert.equal(r.hits.length,5);
const miss=new ForgeRun();miss.heat=.72;miss.press();miss.release();
for(let i=0;i<72;i++)miss.tick(.05);
assert.equal(miss.hits.length,1);assert.equal(miss.hits[0],0);
const cold=new ForgeRun();cold.heat=.26;cold.press();cold.release();cold.elapsed=(Math.asin((cold.target-.5)/.46)+Math.PI/2)/4.2;cold.press();assert.equal(cold.hits[0],0);
miss.phase='quench';miss.heat=.01;miss.tick(.05);assert.equal(miss.phase,'done');assert.equal(miss.quench,0);
console.log('PASS forge heating, five targets, temperature scoring, perfect quench, timeouts and terminal state');

const {FARM_FORGE,nearestService}=await import('../lib/game/island.ts');
assert.ok(Math.hypot(FARM_FORGE.x+7,FARM_FORGE.z+5)>5,'Forge must be outside the cottage');
assert.equal(nearestService({x:FARM_FORGE.x,y:0,z:FARM_FORGE.z+1.5},'pomodoro').service?.kind,'forge');
assert.equal(nearestService({x:7.5,y:0,z:-4.4},'pomodoro').service?.kind,'travel');
assert.equal(nearestService({x:-7,y:0,z:1.6},'pomodoro').service?.kind,'kitchen');
console.log('PASS forge clear of cottage and all three stations reachable');
