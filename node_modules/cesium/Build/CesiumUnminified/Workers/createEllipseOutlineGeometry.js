/**
 * @license
 * Cesium - https://github.com/CesiumGS/cesium
 * Version 1.144.0
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
} from "./chunk-VZLDLEWI.js";
import "./chunk-7A2OGDHT.js";
import "./chunk-SXSP3JHS.js";
import "./chunk-6FHT43QR.js";
import "./chunk-IUIFLOYO.js";
import "./chunk-QIZDWZK6.js";
import "./chunk-2H5264K7.js";
import "./chunk-CQNFIAZU.js";
import "./chunk-CRCGE4J4.js";
import "./chunk-ERKUET22.js";
import "./chunk-DSGLDRTI.js";
import "./chunk-YGFVAGYF.js";
import "./chunk-FQ42MT7M.js";
import {
  Ellipsoid_default
} from "./chunk-UAZUP4I5.js";
import {
  Cartesian3_default
} from "./chunk-SA2A2AN5.js";
import "./chunk-ACTVJHSP.js";
import "./chunk-XLQZNQ4Z.js";
import {
  defined_default
} from "./chunk-PCL3Y7H5.js";

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
