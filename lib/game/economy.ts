import {CROPS,type CropId,type FarmState} from './state';
export type TradeKind='seeds'|'crops';
export const PRICES:Record<TradeKind,Record<CropId,{buy:number;sell:number}>>={
 seeds:{sunroot:{buy:6,sell:2},moonberry:{buy:12,sell:4},embercorn:{buy:22,sell:7}},
 crops:{sunroot:{buy:8,sell:4},moonberry:{buy:14,sell:7},embercorn:{buy:26,sell:13}}
};
export function trade(farm:FarmState,side:'buy'|'sell',kind:TradeKind,id:CropId){
 if(!Object.hasOwn(CROPS,id)||!['seeds','crops'].includes(kind)||!['buy','sell'].includes(side))return 'Unavailable';
 const count=farm[kind][id],price=PRICES[kind][id][side];
 if(!Number.isSafeInteger(count)||count<0||!Number.isSafeInteger(farm.coins)||farm.coins<0)return 'Unavailable';
 if(side==='buy'){
  if(id==='embercorn'&&!farm.unlocked)return 'Open Bramble Hollow first';
  if(farm.coins<price)return 'Not enough coins';
  if(count>=99999)return 'Stack full';
  farm.coins-=price;farm[kind][id]++;
 }else{
  if(count<1)return 'None to sell';
  if(farm.coins+price>99999)return 'Coin pouch full';
  farm[kind][id]--;farm.coins+=price;
 }
 return side==='buy'?'Bought':'Sold';
}

