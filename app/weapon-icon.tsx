export function WeaponSpellIcon({id,size,evolved=false}:{id:string;size:number;evolved?:boolean}){
 const metal=evolved?'#ffe178':'#a8e1f3',edge=evolved?'#fff4c4':'#e9ffff',accent=id==='hammer'?'#eeb678':id==='axe'?'#f2aa84':'#55bace';
 return <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className={'skill-art-icon '+(evolved?'evolved-art':'')}>
 <g stroke="#142b3b" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round">
 {id==='cannon'?<><path d="M13 42L6 31l28-20 17 23-28 21z" fill={metal}/><ellipse cx="43" cy="23" rx="10" ry="15" transform="rotate(-37 43 23)" fill={accent}/><ellipse cx="43" cy="23" rx="5" ry="8" transform="rotate(-37 43 23)" fill="#1f4054"/><path d="M14 33l11 15M21 26l11 15" stroke={edge}/><circle cx="13" cy="51" r="7" fill="#e7b671"/><circle cx="53" cy="9" r="5" fill="#ffde75"/></>:
 id==='sword'?<><path d="M22 36L43 9l14-4-3 15-24 25z" fill={metal}/><path d="M27 37L49 13" stroke={edge}/><path d="M16 31l20 17-5 5-21-18z" fill="#e3b66c"/><path d="M20 42L7 53l6 6 13-13z" fill="#916245"/><path d="M14 47l6 5" stroke="#edc882"/></>:
 id==='hammer'?<><path d="M31 25L13 57l-9-5 20-32z" fill="#a37150"/><path d="M22 7l-8 17 29 17 11-20z" fill={metal}/><path d="M18 22l28 16 6-13-28-15z" fill={accent}/><path d="M23 12l-5 10 8 5 6-10z" fill={edge}/><path d="M10 46l9 5" stroke="#eec787"/></>:
 <><path d="M40 10L14 58l-9-5L31 6z" fill="#a37150"/><path d="M34 14C48 13 48 5 48 5c12 12 14 28 7 40-2-10-13-9-26-17z" fill={metal}/><path d="M48 10c8 13 9 20 7 30l-7-6c6-8 4-15 0-24z" fill={edge}/><path d="M27 15l10 5-6 11-10-5z" fill={accent}/><path d="M13 44l9 5" stroke="#eec787"/></>}
 {evolved&&<path d="M9 5l2 5 6 2-6 2-2 6-2-6-5-2 5-2z" fill="#fff2aa" strokeWidth="1.5"/>}
 </g></svg>;
}

