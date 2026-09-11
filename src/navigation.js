// URL steps are one-based; internal assembly indices are zero-based.
export function stepIndexFromSearch(search, count){
 const value=new URLSearchParams(search).get('step');
 if(!value||!/^\d+$/.test(value))return 0;
 const step=Number(value);
 if(!Number.isSafeInteger(step))return 0;
 return Math.max(0,Math.min(count-1,step-1));
}
