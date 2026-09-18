import assert from 'node:assert/strict';
import {ForgeRun} from '../lib/game/forge.ts';
import {FARM_FORGE,nearestService} from '../lib/game/island.ts';
function advance(r,seconds){for(let t=0;t<seconds;t+=1/60)r.tick(1/60);}
const r=new ForgeRun();const before=r.match;
r.strike(4);assert.ok(r.match>before);const count=r.hits;r.strike(5);assert.equal(r.hits,count,'Cannot spam past cooldown');
advance(r,.3);r.strike(1);assert.equal(r.cells[1],false);const damaged=r.match;
advance(r,.3);r.tool='repair';r.strike(1);assert.ok(r.match>damaged);assert.equal(r.cells[1],true);
advance(r,.3);r.tool='wide';r.select(5);r.press();advance(r,.45);r.release();assert.equal(r.cells[5],false);assert.equal(r.cells[6],false);assert.equal(r.cells[14],false);
advance(r,.3);r.heat=.2;const cold=JSON.stringify(r.cells);r.strike(7);assert.equal(JSON.stringify(r.cells),cold);r.heating=true;advance(r,1.5);assert.ok(r.heat>.6);r.heating=false;
for(const tier of [1,2]){
 const key=new ForgeRun(tier);
 for(let i=0;i<45;i++){if(key.pattern[i]===key.cells[i])continue;if(key.heat<.5){key.heating=true;advance(key,1);key.heating=false;}key.tool=key.pattern[i]?'repair':'fine';key.strike(i);advance(key,.25);}
 assert.equal(key.match,1);
 key.beginQuench();
 while(!key.done){key.dipping=key.bath+key.bathSpeed*.18<key.target;key.tick(1/60);}
 assert.ok(key.points>=90,'Controlled quench can earn masterwork');assert.equal(key.score,3);
 const end=JSON.stringify(key);key.tick(.05);key.press();key.release();key.beginQuench();assert.equal(JSON.stringify(key),end);
}
const timeout=new ForgeRun();advance(timeout,56);assert.equal(timeout.phase,'quench');advance(timeout,11);assert.ok(timeout.done);assert.ok(timeout.points<60,'Idle play does not earn high quality');
assert.notDeepEqual(new ForgeRun(1).pattern,new ForgeRun(2).pattern);
assert.ok(Math.hypot(FARM_FORGE.x+7,FARM_FORGE.z+5)>5);
assert.equal(nearestService({x:FARM_FORGE.x,y:0,z:FARM_FORGE.z+1.5},'pomodoro').service?.kind,'forge');
console.log('PASS forge shaping, repair, charged broad blows, heat, cooldown, both solvable patterns, quench skill, timeout and terminal reward score');
