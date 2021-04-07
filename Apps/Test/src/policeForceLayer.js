import * as Cesium from "../../../Source/Cesium.js";

// 2.0980264478892767
// 0.5287205566392252
// 0.0
function PoliceForceLayer() {
  let localOrigin = Cesium.Cartesian3.fromRadians(
    2.0980264478892767,
    0.5287205566392252,
    0.0
  );

  this._policeForceInfoList = [];

  // this example takes 2 seconds to run
  const start = Date.now();

  console.log("starting timer...");
  // expected output: starting timer...

  let that = this;
  function printDeltaTime() {
    const millis = Date.now() - start;

    console.log(`seconds elapsed = ${Math.floor(millis / 1000)}`);

    // get policeinfo
    {
      let resource = new Cesium.Resource({
        url: "http://localhost:8080/Apps/Test/policedata.json",
        queryParameters: {
          access_token: "123-435-456-000",
        },
      });
      resource
        .fetchJson()
        .then(function (jsonData) {
          let data = jsonData["data"];
          let position = data[0]["policeManPosition"];
          console.log(position);

          // update position data
          that._policeForceInfoList = [];
          for (let i = 0; i < data.length; i++) {
            that._policeForceInfoList.push(data[i]);
          }
        })
        .otherwise(function (error) {
          // an error occurred
        });
    }

    setTimeout(() => {
      printDeltaTime();
    }, 2000);
  }
  printDeltaTime();

  this._entityList = [];
}

export { PoliceForceLayer };
