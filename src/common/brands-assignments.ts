import { Job } from "bullmq"
import { countryCodes, dbServers, EngineType } from "../config/enums"
import { ContextType } from "../libs/logger"
import { jsonOrStringForDb, jsonOrStringToJson, stringOrNullForDb, stringToHash } from "../utils"
import _ from "lodash"
import { sources } from "../sites/sources"
import items from "../../pharmacyItems.json"
import connections from "../../brandConnections.json"
import path from "path"
import fs from 'fs';

// ProductSchema Types to format and store into json file
type ProductSchema = {
    url: string | null;
    title: string; 
    brand: string | null;
    source_id: string | null;
    manufacturer: string | null;
    m_id: string | null;
    source: string | null;
    country_code: string | null;
    meta: {
        matchedBrands?: string[];
        [key: string]: any;
    }
};



async function getPharmacyItems(countryCode: countryCodes, source: sources, versionKey: string, mustExist = true) {
    const finalProducts = items;
    return finalProducts;
}


export async function assignBrandIfKnown(
  countryCode: countryCodes, 
  source: sources, 
  job?: Job
) {
  const context = { scope: "assignBrandIfKnown" } as ContextType;
  const versionKey = "assignBrandIfKnown";
  const products = await getPharmacyItems(countryCode, source, versionKey, false);

  // remove duplications, added rules and set priorities for all inside the class: BrandDeduplicator

  // Process products and separate priority results
  const priorityResults: Array<ProductSchema> = [];
  const regularResults: Array<ProductSchema> = [];


  for (const product of products) {

    if (product.m_id) continue;
    
    // assigned brand 
    const sourceId = product.source_id
    const key = `${source}_${countryCode}_${sourceId}`;
    const uuid = stringToHash(key);    

  }

  return finalResults;
}