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
  EllipsoidGeometry_default
} from "./chunk-2H73KDBM.js";
import "./chunk-UEY73NRN.js";
import "./chunk-C7QDUNI3.js";
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
import {
  defined_default
} from "./chunk-AHWAZRBV.js";

// packages/engine/Source/Workers/createEllipsoidGeometry.js
function createEllipsoidGeometry(ellipsoidGeometry, offset) {
  if (defined_default(offset)) {
    ellipsoidGeometry = EllipsoidGeometry_default.unpack(ellipsoidGeometry, offset);
  }
  return EllipsoidGeometry_default.createGeometry(ellipsoidGeometry);
}
var createEllipsoidGeometry_default = createEllipsoidGeometry;
export {
  createEllipsoidGeometry_default as default
};
