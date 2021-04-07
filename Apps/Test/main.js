window.CESIUM_BASE_URL = "../../Source/";
import * as Cesium from "../../Source/Cesium.js";
import { PoliceForceLayer } from "./src/policeForceLayer.js";

function main() {
  console.log(Cesium.VERSION);

  let viewer = new Cesium.Viewer("cesiumContainer");

  let layer = new PoliceForceLayer();
}
main();
