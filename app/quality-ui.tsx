import {qualityOdds,stars} from '@/lib/game/quality';
export function StarBadge({value=1}:{value?:number}){return <small className={'item-stars stars-'+value} aria-label={value+' star quality'}>{stars(value)}</small>;}
export function QualityOdds({score=0,luck=0,input=1}:{score?:number;luck?:number;input?:number}){const odds=qualityOdds(score,luck,input);return <div className="quality-odds" aria-label="Crafting quality chances">{odds.map((p,i)=><span key={i}><StarBadge value={i+1}/>{Math.round(p*100)}%</span>)}</div>;}
