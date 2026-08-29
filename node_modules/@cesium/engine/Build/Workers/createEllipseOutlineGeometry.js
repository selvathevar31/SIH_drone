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
  EllipseOutlineGeometry_default
} from "./chunk-3LB4UVPU.js";
import "./chunk-Y7JRTRTO.js";
import "./chunk-UEY73NRN.js";
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
import {
  Ellipsoid_default
} from "./chunk-UTB7U3O6.js";
import {
  Cartesian3_default
} from "./chunk-ZQLZG4IN.js";
import "./chunk-5YPQBFRD.js";
import "./chunk-6YR6JBMY.js";
import {
  defined_default
} from "./chunk-AHWAZRBV.js";

// packages/engine/Source/Workers/createEllipseOutlineGeometry.js
function createEllipseOutlineGeometry(ellipseGeometry, offset) {
  if (defined_default(offset)) {
    ellipseGeometry = EllipseOutlineGeometry_default.unpack(ellipseGeometry, offset);
  }
  ellipseGeometry._center = Cartesian3_default.clone(ellipseGeometry._center);
  ellipseGeometry._ellipsoid = Ellipsoid_default.clone(ellipseGeometry._ellipsoid);
  return EllipseOutlineGeometry_default.createGeometry(ellipseGeometry);
}
var createEllipseOutlineGeometry_default = createEllipseOutlineGeometry;
export {
  createEllipseOutlineGeometry_default as default
};
