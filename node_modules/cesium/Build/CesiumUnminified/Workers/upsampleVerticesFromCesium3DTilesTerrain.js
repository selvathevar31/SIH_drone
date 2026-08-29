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
  Cesium3DTilesTerrainGeometryProcessor_default
} from "./chunk-E2NKV5YT.js";
import "./chunk-O3DKEX7Q.js";
import "./chunk-UF46SZEZ.js";
import {
  createTaskProcessorWorker_default
} from "./chunk-W5OCKMPJ.js";
import "./chunk-B3QHNA4A.js";
import "./chunk-NXGQBQWE.js";
import "./chunk-TNWKJNUZ.js";
import "./chunk-PVTSNNVI.js";
import "./chunk-7XM5JK5F.js";
import "./chunk-GHXVQVUM.js";
import "./chunk-R4K7EHOU.js";
import "./chunk-6FHT43QR.js";
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
import "./chunk-XLQZNQ4Z.js";
import "./chunk-PCL3Y7H5.js";

// packages/engine/Source/Workers/upsampleVerticesFromCesium3DTilesTerrain.js
function upsampleVerticesFromCesium3DTilesTerrain(options, transferableObjects) {
  const mesh = Cesium3DTilesTerrainGeometryProcessor_default.upsampleMesh(options);
  const verticesBuffer = mesh.vertices.buffer;
  const indicesBuffer = mesh.indices.buffer;
  const westIndicesBuffer = mesh.westIndicesSouthToNorth.buffer;
  const southIndicesBuffer = mesh.southIndicesEastToWest.buffer;
  const eastIndicesBuffer = mesh.eastIndicesNorthToSouth.buffer;
  const northIndicesBuffer = mesh.northIndicesWestToEast.buffer;
  transferableObjects.push(
    verticesBuffer,
    indicesBuffer,
    westIndicesBuffer,
    southIndicesBuffer,
    eastIndicesBuffer,
    northIndicesBuffer
  );
  const result = {
    verticesBuffer,
    indicesBuffer,
    vertexCountWithoutSkirts: mesh.vertexCountWithoutSkirts,
    indexCountWithoutSkirts: mesh.indexCountWithoutSkirts,
    encoding: mesh.encoding,
    westIndicesBuffer,
    southIndicesBuffer,
    eastIndicesBuffer,
    northIndicesBuffer,
    minimumHeight: mesh.minimumHeight,
    maximumHeight: mesh.maximumHeight,
    boundingSphere: mesh.boundingSphere3D,
    orientedBoundingBox: mesh.orientedBoundingBox,
    horizonOcclusionPoint: mesh.horizonOcclusionPoint
  };
  return result;
}
var upsampleVerticesFromCesium3DTilesTerrain_default = createTaskProcessorWorker_default(
  upsampleVerticesFromCesium3DTilesTerrain
);
export {
  upsampleVerticesFromCesium3DTilesTerrain_default as default
};
