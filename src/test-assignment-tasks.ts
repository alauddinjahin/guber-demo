// import { sources } from "src"

import { assignBrandIfKnown } from "./common/brands-assignments"
import { countryCodes } from "./config/enums"
import { sources } from "./sites/sources"

export async function runTest() {
    console.log('---------- processing ......');
    const { data:formattedData, message} = await assignBrandIfKnown(countryCodes.lt, sources.APO)
    console.log(message);
    console.log("Please check a `brandAssignments.json` file in root DIR.");
}

runTest()
