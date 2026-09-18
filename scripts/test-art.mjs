import assert from 'node:assert/strict';
import fs from 'node:fs';
import {registerHooks} from 'node:module';
registerHooks({resolve(s,c,next){try{return next(s,c);}catch(e){if(s.startsWith('.')&&!/\.[a-z]+$/i.test(s))return next(s+'.ts',c);throw e;}}});
const {skillSprite,itemSprite}=await import('../lib/game/item-art.ts');
const {WEAPONS,PASSIVES}=await import('../lib/game/build.ts');
const {CROP_IDS}=await import('../lib/game/state.ts');
const files=[];
for(const id of [...WEAPONS,...PASSIVES,'heal'])files.push(skillSprite(id));
for(const id of WEAPONS)files.push(skillSprite(id,true));
for(const id of CROP_IDS)for(const kind of ['seed','crop','meal'])files.push(itemSprite(kind,id));
for(const kind of ['soil','fertilizer','water','sickle','grove-key','hollow-key'])files.push(itemSprite(kind));
for(const path of files){assert.ok(path);assert.ok(fs.existsSync('public'+path),'Missing '+path);}
for(const id of ['cloudmelon','glowcap','starpepper','dewleaf','crystalbean'])assert.notEqual(itemSprite('meal',id),itemSprite('crop',id));
for(const id of WEAPONS)assert.notEqual(skillSprite(id),skillSprite(id,true));
console.log('PASS all weapons, evolutions, passives, crops, meals and farm tools resolve to artwork ('+files.length+' references)');
