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
import { BrandDeduplicator } from "../brand-deduplicator-utils"

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

  try {

    const context = { scope: "assignBrandIfKnown" } as ContextType;
    const versionKey = "assignBrandIfKnown";
    const products = await getPharmacyItems(countryCode, source, versionKey, false);

    // remove duplications, added rules and set priorities for all inside the class: BrandDeduplicator
    const deduplicator = new BrandDeduplicator(connections);

    // Process products and separate priority results
    const priorityResults: Array<ProductSchema> = [];
    const regularResults: Array<ProductSchema> = [];


    for (const product of products) {

      if (product.m_id) continue;

      // assigned brand 
      const { assignedBrand: brand, matchedBrands } = deduplicator.assignBrandByProduct(product.title);
      const sourceId = product.source_id
      const key = `${source}_${countryCode}_${sourceId}`;
      const uuid = stringToHash(key);
      const result = { uuid, ...product, brand, meta: { matchedBrands } };

      // check the priority and store them into priorityResults or regularResults
      if (brand && deduplicator.isPriorityBrand(brand)) {
        priorityResults.push(result);
      } else {
        regularResults.push(result);
      }
    }

    // Combine results with priority brands first
    const finalResults = [...priorityResults, ...regularResults];

    // Save results to JSON file
    const outputPath = path.join(__dirname, './../../brandAssignments.json');
    fs.writeFileSync(outputPath, JSON.stringify(finalResults, null, 2));

    return {
      data: finalResults,
      message: "Data stored successfully!"
    };

  }
  catch (error) {
    console.log(error)
    return {
      data: [],
      message: "Unable to stored data!"
    };
  }
}