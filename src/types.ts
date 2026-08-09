export const platforms = ['Xbox Play Anywhere','Xbox','Windows 10','Game Pass','Steam','Oculus','Battlenet','PlayStation 5','Mobile'] as const;
export type Platform = typeof platforms[number];
export type Availability = 'Available' | 'Other Regions Only' | 'Out of Stock';
export interface OtherRegionInventory { platform:string; region:string; quantity:number }
export interface Game { id:string; title:string; offerType:string; genre:string; edition?:string; imageFilename:string; platformQuantities:Partial<Record<Platform,number>>; primaryKeys:number; otherRegionKeys:number; otherRegionInventory?:OtherRegionInventory[]; otherRegionDetails?:string; availability:Availability; regionRestrictions?:string; notes?:string; dateAdded:string; active:boolean }
