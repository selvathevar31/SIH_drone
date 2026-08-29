/**
 * @license
 * Cesium - https://github.com/CesiumGS/cesium
 * Version 1.143.0
 *
 * Copyright 2011-2022 Cesium Contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * Columbus View (Pat. Pend.)
 *
 * Portions licensed separately.
 * See https://github.com/CesiumGS/cesium/blob/main/LICENSE.md for full licensing details.
 */

import {
  PrimitivePipeline_default
} from "./chunk-HDL4HOXZ.js";
import {
  createTaskProcessorWorker_default
} from "./chunk-XDWCTQCZ.js";
import "./chunk-XQH66YJC.js";
import "./chunk-FX3VEAIU.js";
import "./chunk-7YG3ND3P.js";
import "./chunk-MCJDRDJQ.js";
import "./chunk-AJSFRY4U.js";
import "./chunk-J73T2VOY.js";
import "./chunk-DZUFEE4L.js";
import "./chunk-IMBVP57H.js";
import "./chunk-ARZICEEP.js";
import "./chunk-2RGJPWQX.js";
import "./chunk-JKXV6PG5.js";
import "./chunk-ADX3CBKD.js";
import "./chunk-WN3F4CVG.js";
import "./chunk-VAL7DYNR.js";
import "./chunk-N7CCOFLX.js";
import "./chunk-GXWQZBAI.js";
import "./chunk-UTB7U3O6.js";
import "./chunk-ZQLZG4IN.js";
import "./chunk-5YPQBFRD.js";
import "./chunk-6YR6JBMY.js";
import "./chunk-AHWAZRBV.js";

// packages/engine/Source/Workers/combineGeometry.js
function combineGeometry(packedParameters, transferableObjects) {
  const parameters = PrimitivePipeline_default.unpackCombineGeometryParameters(packedParameters);
  const results = PrimitivePipeline_default.combineGeometry(parameters);
  return PrimitivePipeline_default.packCombineGeometryResults(
    results,
    transferableObjects
  );
}
var combineGeometry_default = createTaskProcessorWorker_default(combineGeometry);
export {
  combineGeometry_default as default
};
