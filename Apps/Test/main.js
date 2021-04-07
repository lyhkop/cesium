window.CESIUM_BASE_URL = "../../Source/";
import * as Cesium from "../../Source/Cesium.js";

function main() {
  console.log(Cesium.VERSION);

  let viewer = new Cesium.Viewer("cesiumContainer");
}
main();
