import {RequestType, SimpleHandler} from "./main";

interface Sticker {
    slot: number;
    stickerId: number;
    codename?: string;
    material?: string;
    name?: string;
}

export interface ItemInfo {
    stickers: Sticker[];
    itemid: string;
    defindex: number;
    paintindex: number;
    rarity: number;
    quality: number;
    painseed: number;
    inventory: number;
    origin: number;
    s: string;
    a: string;
    d: string;
    m: string;
    floatvalue: number;
    imageurl: string;
    min: number;
    max: number;
    weapon_type?: string;
    item_name?: string;
    rarity_name?: string;
    quality_name?: string;
    origin_name?: string;
    wear_name?: string;
    full_item_name?: string;
}

export interface FetchInspectInfoRequest {
    link: string;
    listPrice?: number;
}

export interface FetchInspectInfoResponse {
    iteminfo: ItemInfo;
    error?: string;
}

export const FetchInspectInfo = new SimpleHandler<FetchInspectInfoRequest, FetchInspectInfoResponse>(
    RequestType.FETCH_INSPECT_INFO,
    (req) => {
        const apiUrl =  `https://api.csgofloat.com/?url=${req.link}&minimal=true${req.listPrice ? '&listPrice=' + req.listPrice : ''}`;
        return fetch(apiUrl).then(resp => {
            return resp.json().then((json: FetchInspectInfoResponse) => {
                if (resp.ok) {
                    return json;
                } else {
                    throw Error(json.error);
                }
            }) as Promise<FetchInspectInfoResponse>;
        });
    });
