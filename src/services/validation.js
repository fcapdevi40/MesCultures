export function validateNomProduit(nom){return typeof nom==="string"&&nom.trim().length>=2;}
export function validateAMM(amm){if(!amm) return true; return /^\d{6,8}$/.test(String(amm).trim());}
export function validatePrice(prix){const n=Number(prix); return !Number.isNaN(n)&&n>=0;}
export function validateUnit(unit){return ["L/ha","kg/ha","g/ha","ml/ha","L","kg"].includes(unit);}
