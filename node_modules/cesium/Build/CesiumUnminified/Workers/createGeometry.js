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
  PrimitivePipeline_default
} from "./chunk-CIV5DJOQ.js";
import {
  createTaskProcessorWorker_default
} from "./chunk-W5OCKMPJ.js";
import "./chunk-B3QHNA4A.js";
import "./chunk-TQ4QCOXT.js";
import "./chunk-TNWKJNUZ.js";
import "./chunk-3PSS3T43.js";
import "./chunk-GHXVQVUM.js";
import "./chunk-R4K7EHOU.js";
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
import "./chunk-UAZUP4I5.js";
import "./chunk-SA2A2AN5.js";
import "./chunk-ACTVJHSP.js";
import {
  DeveloperError_default
} from "./chunk-XLQZNQ4Z.js";
import {
  __glob,
  __require,
  defined_default
} from "./chunk-PCL3Y7H5.js";

// import("./**/*.js") in packages/engine/Source/Workers/createGeometry.js
var globImport_js = __glob({
  "./combineGeometry.js": () => import("./combineGeometry.js"),
  "./createBoxGeometry.js": () => import("./createBoxGeometry.js"),
  "./createBoxOutlineGeometry.js": () => import("./createBoxOutlineGeometry.js"),
  "./createCircleGeometry.js": () => import("./createCircleGeometry.js"),
  "./createCircleOutlineGeometry.js": () => import("./createCircleOutlineGeometry.js"),
  "./createCoplanarPolygonGeometry.js": () => import("./createCoplanarPolygonGeometry.js"),
  "./createCoplanarPolygonOutlineGeometry.js": () => import("./createCoplanarPolygonOutlineGeometry.js"),
  "./createCorridorGeometry.js": () => import("./createCorridorGeometry.js"),
  "./createCorridorOutlineGeometry.js": () => import("./createCorridorOutlineGeometry.js"),
  "./createCylinderGeometry.js": () => import("./createCylinderGeometry.js"),
  "./createCylinderOutlineGeometry.js": () => import("./createCylinderOutlineGeometry.js"),
  "./createEllipseGeometry.js": () => import("./createEllipseGeometry.js"),
  "./createEllipseOutlineGeometry.js": () => import("./createEllipseOutlineGeometry.js"),
  "./createEllipsoidGeometry.js": () => import("./createEllipsoidGeometry.js"),
  "./createEllipsoidOutlineGeometry.js": () => import("./createEllipsoidOutlineGeometry.js"),
  "./createFrustumGeometry.js": () => import("./createFrustumGeometry.js"),
  "./createFrustumOutlineGeometry.js": () => import("./createFrustumOutlineGeometry.js"),
  "./createGeometry.js": () => import("./createGeometry.js"),
  "./createGroundPolylineGeometry.js": () => import("./createGroundPolylineGeometry.js"),
  "./createPlaneGeometry.js": () => import("./createPlaneGeometry.js"),
  "./createPlaneOutlineGeometry.js": () => import("./createPlaneOutlineGeometry.js"),
  "./createPolygonGeometry.js": () => import("./createPolygonGeometry.js"),
  "./createPolygonOutlineGeometry.js": () => import("./createPolygonOutlineGeometry.js"),
  "./createPolylineGeometry.js": () => import("./createPolylineGeometry.js"),
  "./createPolylineVolumeGeometry.js": () => import("./createPolylineVolumeGeometry.js"),
  "./createPolylineVolumeOutlineGeometry.js": () => import("./createPolylineVolumeOutlineGeometry.js"),
  "./createRectangleGeometry.js": () => import("./createRectangleGeometry.js"),
  "./createRectangleOutlineGeometry.js": () => import("./createRectangleOutlineGeometry.js"),
  "./createSimplePolylineGeometry.js": () => import("./createSimplePolylineGeometry.js"),
  "./createSphereGeometry.js": () => import("./createSphereGeometry.js"),
  "./createSphereOutlineGeometry.js": () => import("./createSphereOutlineGeometry.js"),
  "./createTaskProcessorWorker.js": () => import("./createTaskProcessorWorker.js"),
  "./createVectorTileClampedPolylines.js": () => import("./createVectorTileClampedPolylines.js"),
  "./createVectorTileGeometries.js": () => import("./createVectorTileGeometries.js"),
  "./createVectorTilePoints.js": () => import("./createVectorTilePoints.js"),
  "./createVectorTilePolygons.js": () => import("./createVectorTilePolygons.js"),
  "./createVectorTilePolylines.js": () => import("./createVectorTilePolylines.js"),
  "./createVerticesFromCesium3DTilesTerrain.js": () => import("./createVerticesFromCesium3DTilesTerrain.js"),
  "./createVerticesFromGoogleEarthEnterpriseBuffer.js": () => import("./createVerticesFromGoogleEarthEnterpriseBuffer.js"),
  "./createVerticesFromHeightmap.js": () => import("./createVerticesFromHeightmap.js"),
  "./createVerticesFromQuantizedTerrainMesh.js": () => import("./createVerticesFromQuantizedTerrainMesh.js"),
  "./createWallGeometry.js": () => import("./createWallGeometry.js"),
  "./createWallOutlineGeometry.js": () => import("./createWallOutlineGeometry.js"),
  "./decodeDraco.js": () => import("./decodeDraco.js"),
  "./decodeGoogleEarthEnterprisePacket.js": () => import("./decodeGoogleEarthEnterprisePacket.js"),
  "./decodeI3S.js": () => import("./decodeI3S.js"),
  "./gaussianSplatSorter.js": () => import("./gaussianSplatSorter.js"),
  "./gaussianSplatTextureGenerator.js": () => import("./gaussianSplatTextureGenerator.js"),
  "./incrementallyBuildTerrainPicker.js": () => import("./incrementallyBuildTerrainPicker.js"),
  "./transcodeKTX2.js": () => import("./transcodeKTX2.js"),
  "./transferTypedArrayTest.js": () => import("./transferTypedArrayTest.js"),
  "./upsampleQuantizedTerrainMesh.js": () => import("./upsampleQuantizedTerrainMesh.js"),
  "./upsampleVerticesFromCesium3DTilesTerrain.js": () => import("./upsampleVerticesFromCesium3DTilesTerrain.js")
});

// packages/engine/Source/Workers/createGeometry.js
var moduleCache = {};
async function getModule(moduleName, modulePath) {
  let module = moduleCache[modulePath] ?? moduleCache[moduleName];
  if (defined_default(module)) {
    return module;
  }
  if (defined_default(modulePath)) {
    if (typeof exports === "object") {
      module = __require(modulePath);
    } else {
      const result = await import(modulePath);
      module = result.default;
    }
    moduleCache[modulePath] = module;
    return module;
  }
  if (typeof exports === "object") {
    module = __require(`Workers/${moduleName}`);
  } else {
    const result = defined_default(modulePath) ? await import(modulePath) : await globImport_js(`./${moduleName}.js`);
    module = result.default;
  }
  moduleCache[moduleName] = module;
  return module;
}
async function createGeometry(parameters, transferableObjects) {
  const subTasks = parameters.subTasks;
  const length = subTasks.length;
  const resultsOrPromises = new Array(length);
  for (let i = 0; i < length; i++) {
    const task = subTasks[i];
    const geometry = task.geometry;
    const moduleName = task.moduleName;
    const modulePath = task.modulePath;
    if (defined_default(moduleName) && defined_default(modulePath)) {
      throw new DeveloperError_default("Must only set moduleName or modulePath");
    }
    if (defined_default(moduleName) || defined_default(modulePath)) {
      resultsOrPromises[i] = getModule(moduleName, modulePath).then(
        (createFunction) => createFunction(geometry, task.offset)
      );
    } else {
      resultsOrPromises[i] = geometry;
    }
  }
  return Promise.all(resultsOrPromises).then(function(results) {
    return PrimitivePipeline_default.packCreateGeometryResults(
      results,
      transferableObjects
    );
  });
}
var createGeometry_default = createTaskProcessorWorker_default(createGeometry);
export {
  createGeometry_default as default
};
