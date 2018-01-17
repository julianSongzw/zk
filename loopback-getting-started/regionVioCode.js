/**
 * Created by Administrator on 2017/10/18.
 */

var vioCode = [
  {
    "violationType":0,
    "roadSpeedLimit": {
      "lowerBound":0,
      "upperBound":999
    },
    "overSpeedPercent":20,
    "code":"4609",
    "violationDesc":"在高速公路超速未达20%"
  },
  {
    "violationType":0,
    "roadSpeedLimit": {
      "lowerBound":0,
      "upperBound":999
    },
    "overSpeedPercent":50,
    "code":"4706",
    "violationDesc":"在高速公路超速20%以上,未达50%"
  },
  {
    "violationType":0,
    "roadSpeedLimit": {
      "lowerBound":0,
      "upperBound":999
    },
    "overSpeedPercent":200,
    "code":"1721",
    "violationDesc":"在高速公路超速50%以上"
  }
];

module.exports = vioCode;
