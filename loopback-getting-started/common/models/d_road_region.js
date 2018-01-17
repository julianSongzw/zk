/**
 * Created by dell on 2017/6/27.
 */
var config = require('../../config');
var mongodb = require('mongodb');
var ObjectID = mongodb.ObjectID;
var logs = require('../../logServer');
var co = require('co');
var thunkify = require('thunkify');
var http = require('http');
var imgUrl = config.imgUrl;
var fs = require('fs');
var path = require('path');
var vioCode = require('../../regionVioCode');



var errColMsg = {
  ret: 0,
  msg: '操作失败，数据库集合操作异常'
};
var errParamMsg = {
  ret: 0,
  msg: '操作失败，参数合法性验证'
};

// function loadPage(url) {
//   var http = require('http');
//   var pm = new Promise(function (resolve, reject) {
//     http.get(url, function (res) {
//       var html = '';
//       res.on('data', function (d) {
//         html += d.toString()
//       });
//       res.on('end', function () {
//         resolve(html);
//       });
//     }).on('error', function (e) {
//       reject(e)
//     });
//   });
//   return pm;
// }
// loadPage('http://106.37.208.233:20035/').then(function (d) { console.log(d); });



module.exports = function(d_road_region) {
  d_road_region.validatesUniquenessOf('region_code');
  //分页查询
  d_road_region.list = function (data, cb) {
    var filter = {
      order:'_id DESC',
      include:'status',
      where:{}
    };
    if(data.region_name!="undefined"&&data.region_name) filter.where.region_name = {regexp:data.region_name};
    if(data.entry_site_code!="undefined"&&data.entry_site_code) filter.where.entry_site_code = {regexp:data.entry_site_code};
    if(data.sys_code!="undefined"&&data.sys_code) filter.where.sys_code = data.sys_code;
    if(data.region_code!="undefined"&&data.region_code) filter.where.region_code = {regexp:data.region_code};
    if(data.area_code!="undefined"&&data.area_code) filter.where.area_code = data.area_code;
    if(data.org_code!="undefined"&&data.org_code) filter.where.org_code = data.org_code;
    if(data.pageSize!="undefined"&&data.pageIndex!="undefined"&&data.pageSize&&data.pageIndex) {
      filter.limit = Number(data.pageSize);
      filter.skip = (Number(data.pageIndex) - 1) * Number(data.pageSize);
    }
    d_road_region.find(filter,function (err, rs) {
      if(err) cb(null,errColMsg);
      d_road_region.count(filter.where,function (err, count) {
        if (err) cb(null,errColMsg);
        cb(null,{
          ret:1,
          datas:rs,
          msg:'查询成功',
          count:count
        });
      });
    });
  };
  d_road_region.remoteMethod('list', {
    description:'区间分页查询',
    accepts: {arg:'data', type:'Object',required:true,http: { source: 'body' }},
    http: {path:'/list',verb:'post'},
    returns: {arg: 'res', type: 'Object',root:true,required:true}
  });

  //新增
  d_road_region.add = function (req, cb) {
    var data = req.body;
    data.set = '';
    data.text = '';
    if(data.metre!="") data.address = data.road_name + data.section_code + data.mileage+ '+' + data.metre + 'm';
    else data.address = data.road_name + data.section_code + data.mileage;
    co(function *() {
      //查询4位序号
      try {
        var fi = thunkify(findIndex);
        var param = {
          org_code: data.org_code,
          r: d_road_region
        };
        var fiCb = yield fi(param);
        var index;
        if (fiCb) {
          if (fiCb.length == 0) {
            index = '140000';
          } else {
            index = '14' + ('0000' + (Number(fiCb[0].region_code.slice(-4)) + 1).toString()).slice(-4);
          }
        } else {
          cb(null, {
            ret: 0,
            msg: '序号出错'
          });
        }
      } catch (e) {
        cb(null, {
          ret: 0,
          msg: e
        });
        return false;
      }
      //限速牌控制
      var speed = data.small_vehicle_limit;
      var vslImg = 'limit'+ speed + '.png';
      var vslCImg = 'cancel'+ speed + '.png';
      var vslPath = imgUrl + vslImg;
      var vslCPath = imgUrl + vslCImg;
      var vslData = fs.readFileSync(vslPath);
      var vslCData = fs.readFileSync(vslCPath);
      vslData = 'data:image/png;base64,'+new Buffer(vslData).toString('base64');
      vslCData = 'data:image/png;base64,'+new Buffer(vslCData).toString('base64');
      var vslImgStates = fs.statSync(vslPath);
      var vslCImgStates = fs.statSync(vslCPath);
      var vslImgSize = vslImgStates.size;
      var vslCImgSize = vslCImgStates.size;
      //获取限速牌信息
      try {
        var fv = thunkify(findVsl);
        var vslParam = {
          device_nbr:data.speedBrand,
          r:d_road_region
        };
        var vslCParam = {
          device_nbr:data.cancelScreen,
          r:d_road_region
        };
        var vsl = yield fv(vslParam);
        var vslC = yield fv(vslCParam);
        if(vsl&&vslC){
          var vslSet = vsl[0].speed_band;
          var vslCSet = vslC[0].speed_band;
          var vslText = vsl[0].text;
          var vslCText = vslC[0].text;
          var vslip = vsl[0].ip;
          var vslport = vsl[0].port;
          var vslCip = vslC[0].ip;
          var vslCport = vslC[0].port;
          var vslColorType = vsl[0].vms_type;
          var vslCColorType = vslC[0].vms_type;
        }
      }catch (e){
        cb(null,{
          ret:0,
          msg:e
        });
      }
      if(vslSet.perform.picture&&vslCSet.perform.picture){
        vslSet.perform.picture[0].picturecontents.path = vslPath;
        vslSet.perform.picture[0].picturecontents.picdata = vslData;
        vslSet.perform.picture[0].picturecontents.picsize = vslImgSize;
        vslCSet.perform.picture[0].picturecontents.path = vslCPath;
        vslCSet.perform.picture[0].picturecontents.picdata = vslCData;
        vslCSet.perform.picture[0].picturecontents.picsize = vslCImgSize;
      }else {
        vslSet = {
          "typeValue" : 1,
          "timeChecked" : false,
          "display" : "inline-block",
          "infoType" : "1",
          "checkedList" : ["1", "2", "3", "4", "5", "6", "7"],
          "indeterminate" : false,
          "checkAll" : true,
          "dingshiDisplay" : "none",
          "shichangDisplay" : "block",
          "dataTime" : "2017-10-9",
          "timeValue" : 60,
          "startTime" : "08:00",
          "endTime" : "20:00",
          "perform" : {
            "text" : [{
              "contents" : {
                "fontvalignment" : 3,
                "enterSpeed" : 4,
                "fonthalignment" : 3,
                "fontbold" : 0,
                "fontcolor" : 255,
                "fontsize" : "25",
                "fontunderline" : 0,
                "textinfo" : "区间",
                "enterEffect" : "PlayStyleNone",
                "font" : "黑体",
                "fontitalic" : 0
              },
              "name" : "区间",
              "width" : 72,
              "startY" : 0,
              "startX" : 72,
              "height" : 40
            }, {
              "contents" : {
                "fontvalignment" : 3,
                "enterSpeed" : 4,
                "fonthalignment" : 3,
                "fontbold" : 0,
                "fontcolor" : 255,
                "fontsize" : "25",
                "fontunderline" : 0,
                "textinfo" : "测速",
                "enterEffect" : "PlayStyleNone",
                "font" : "黑体",
                "fontitalic" : 0
              },
              "name" : "测速",
              "width" : 72,
              "startY" : 40,
              "startX" : 72,
              "height" : 40
            }],
            "picture" : [{
              "height" : 80,
              "name" : vslImg,
              "picturecontents" : {
                "enterEffect" : "PlayStyleNone",
                "enterSpeed" : 4,
                "path" : vslPath,
                "picdata" : vslData,
                "picsize" : Number(vslImgSize)
              },
              "startX" : 0,
              "styleY" : 3,
              "width" : 72,
              "startY" : 0
            }]
          },
          "specInfo" : {
            "specId" : "111",
            "specName" : "全彩屏/条屏/384*128",
            "ledDeviceType" : "9",
            "colorType" : "3",
            "pixesHeight" : 128,
            "pixesWidth" : 384,
            "width" : 144,
            "height" : 80,
            "remark" : null,
            "ledShape" : "1",
            "ledFunctionType" : "1"
          },
          "selectIndex" : 0,
          "canMoveText" : false,
          "canMovePicture" : false,
          "offsetLeft" : 773,
          "offsetTop" : 276,
          "scaling" : 4.0972222222222223,
          "pictureIndex" : 8888,
          "textForm" : true,
          "pictureForm" : true,
          "loading" : false
        };
        vslCSet = {
          "typeValue" : 1,
          "timeChecked" : false,
          "display" : "inline-block",
          "infoType" : "1",
          "checkedList" : ["1", "2", "3", "4", "5", "6", "7"],
          "indeterminate" : false,
          "checkAll" : true,
          "dingshiDisplay" : "none",
          "shichangDisplay" : "block",
          "dataTime" : "2017-10-9",
          "timeValue" : 60,
          "startTime" : "08:00",
          "endTime" : "20:00",
          "perform" : {
            "text" : [{
              "height" : 80,
              "name" : "谨慎驾驶",
              "width" : 72,
              "startX" : 72,
              "startY" : 0,
              "contents" : {
                "enterEffect" : "PlayStyleNone",
                "enterSpeed" : 4,
                "font" : "黑体",
                "fontbold" : 0,
                "fontcolor" : 255,
                "fonthalignment" : 3,
                "fontitalic" : 0,
                "fontsize" : "22",
                "fontunderline" : 0,
                "fontvalignment" : 3,
                "textinfo" : "谨慎驾驶"
              }
            }],
            "picture" : [{
              "height" : 80,
              "name" : vslCImg,
              "picturecontents" : {
                "enterEffect" : "PlayStyleNone",
                "enterSpeed" : 4,
                "path" : vslCPath,
                "picdata" : vslCData,
                "picsize" : Number(vslCImgSize)
              },
              "startX" : 0,
              "styleY" : 3,
              "width" : 72,
              "startY" : 0
            }]
          },
          "specInfo" : {
            "specId" : "111",
            "specName" : "全彩屏/条屏/384*128",
            "ledDeviceType" : "9",
            "colorType" : "3",
            "pixesHeight" : 128,
            "pixesWidth" : 384,
            "width" : 144,
            "height" : 80,
            "remark" : null,
            "ledShape" : "1",
            "ledFunctionType" : "1"
          },
          "selectIndex" : 0,
          "canMoveText" : false,
          "canMovePicture" : false,
          "offsetLeft" : 773,
          "offsetTop" : 276,
          "scaling" : 4.0972222222222223,
          "pictureIndex" : 8888,
          "textForm" : true,
          "pictureForm" : true,
          "loading" : false
        };
      }
      //限速牌控制json
      var vslJson = vslSet;
      //解除限速牌控制json
      var vslCJson = vslCSet;
      if(speed=='120'){
        vslCJson = {
          "canMoveText" : false,
          "pictureIndex" : 8888,
          "indeterminate" : false,
          "timeValue" : 60,
          "dingshiDisplay" : "none",
          "infoType" : "1",
          "shichangDisplay" : "block",
          "specInfo" : {
            "specId" : "111",
            "specName" : "全彩屏/条屏/384*128",
            "ledDeviceType" : "9",
            "colorType" : "3",
            "pixesHeight" : 128,
            "pixesWidth" : 384,
            "width" : 144,
            "height" : 80,
            "remark" : null,
            "ledShape" : "1",
            "ledFunctionType" : "1"
          },
          "startTime" : "08:00",
          "offsetLeft" : 754,
          "offsetTop" : 394,
          "scaling" : 4.0972222222222223,
          "checkAll" : true,
          "display" : "inline-block",
          "perform" : {
            "text" : [{
              "height" : 40,
              "name" : "区间测速",
              "width" : 144,
              "startX" : 0,
              "startY" : 0,
              "contents" : {
                "enterEffect" : "PlayStyleNone",
                "enterSpeed" : 4,
                "font" : "黑体",
                "fontbold" : 0,
                "fontcolor" : 255,
                "fonthalignment" : 3,
                "fontitalic" : 0,
                "fontsize" : "25",
                "fontunderline" : 0,
                "fontvalignment" : 3,
                "textinfo" : "区间测速"
              }
            }, {
              "height" : 40,
              "name" : "点刹无效",
              "width" : 144,
              "startX" : 0,
              "startY" : 40,
              "contents" : {
                "enterEffect" : "PlayStyleNone",
                "enterSpeed" : 4,
                "font" : "黑体",
                "fontbold" : 0,
                "fontcolor" : 255,
                "fonthalignment" : 3,
                "fontitalic" : 0,
                "fontsize" : "25",
                "fontunderline" : 0,
                "fontvalignment" : 3,
                "textinfo" : "点刹无效"
              }
            }],
            "picture" : []
          },
          "selectIndex" : 1,
          "timeChecked" : false,
          "loading" : false,
          "checkedList" : ["1", "2", "3", "4", "5", "6", "7"],
          "canMovePicture" : false,
          "dataTime" : "2017-9-28",
          "textForm" : true,
          "typeValue" : 1,
          "endTime" : "20:00",
          "pictureForm" : true
        };
        vslJson = {
          "canMoveText" : false,
          "pictureIndex" : 8888,
          "indeterminate" : false,
          "timeValue" : 60,
          "dingshiDisplay" : "none",
          "infoType" : "1",
          "shichangDisplay" : "block",
          "specInfo" : {
            "specId" : "111",
            "specName" : "全彩屏/条屏/384*128",
            "ledDeviceType" : "9",
            "colorType" : "3",
            "pixesHeight" : 128,
            "pixesWidth" : 384,
            "width" : 144,
            "height" : 80,
            "remark" : null,
            "ledShape" : "1",
            "ledFunctionType" : "1"
          },
          "startTime" : "08:00",
          "offsetLeft" : 754,
          "offsetTop" : 394,
          "scaling" : 4.0972222222222223,
          "checkAll" : true,
          "display" : "inline-block",
          "perform" : {
            "text" : [{
              "height" : 40,
              "name" : "区间测速",
              "width" : 144,
              "startX" : 0,
              "startY" : 0,
              "contents" : {
                "enterEffect" : "PlayStyleNone",
                "enterSpeed" : 4,
                "font" : "黑体",
                "fontbold" : 0,
                "fontcolor" : 255,
                "fonthalignment" : 3,
                "fontitalic" : 0,
                "fontsize" : "25",
                "fontunderline" : 0,
                "fontvalignment" : 3,
                "textinfo" : "区间测速"
              }
            }, {
              "height" : 40,
              "name" : "点刹无效",
              "width" : 144,
              "startX" : 0,
              "startY" : 40,
              "contents" : {
                "enterEffect" : "PlayStyleNone",
                "enterSpeed" : 4,
                "font" : "黑体",
                "fontbold" : 0,
                "fontcolor" : 255,
                "fonthalignment" : 3,
                "fontitalic" : 0,
                "fontsize" : "25",
                "fontunderline" : 0,
                "fontvalignment" : 3,
                "textinfo" : "点刹无效"
              }
            }],
            "picture" : []
          },
          "selectIndex" : 1,
          "timeChecked" : false,
          "loading" : false,
          "checkedList" : ["1", "2", "3", "4", "5", "6", "7"],
          "canMovePicture" : false,
          "dataTime" : "2017-9-28",
          "textForm" : true,
          "typeValue" : 1,
          "endTime" : "20:00",
          "pictureForm" : true
        };
      }
      vslJson.pid = 1;
      vslCJson.pid = 1;
      //限速牌控制
      try{
        var vslControl = {
          "optperson":req.query.username,
          "commandType": "addProgram",	//接口命令类型，添加节目的固定命令就为addProgram
          "deviceInfo": {					//设备参数开始
            "colorType": Number(vslColorType),
            "devIp": vslip,
            "devModel": "NovaTcpPlayer",
            "devNo": data.speedBrand,
            "devPort": Number(vslport),
            "regionNo": "",
            "screenNo": 1
          },
          "program":vslJson,
          "text":speed
        };
        var vslCControl = {
          "optperson":req.query.username,
          "commandType": "addProgram",	//接口命令类型，添加节目的固定命令就为addProgram
          "deviceInfo": {					//设备参数开始
            "colorType": Number(vslCColorType),
            "devIp": vslCip,
            "devModel": "NovaTcpPlayer",
            "devNo": data.cancelScreen,
            "devPort": Number(vslCport),
            "regionNo": "",
            "screenNo": 1
          },
          "program":vslCJson,
          "text":speed
        };
        var vslClear ={
          "optperson":req.query.username,
          "commandType": "clearProgram",	//接口命令类型，添加节目的固定命令就为addProgram
          "deviceInfo": {					//设备参数开始
            "colorType": Number(vslColorType),
            "devIp": vslip,
            "devModel": "NovaTcpPlayer",
            "devNo": data.speedBrand,
            "devPort": Number(vslport),
            "regionNo": "",
            "screenNo": 1
          }
        };
        var vslCClear = {
          "optperson":req.query.username,
          "commandType": "clearProgram",	//接口命令类型，添加节目的固定命令就为addProgram
          "deviceInfo": {					//设备参数开始
            "colorType": Number(vslCColorType),
            "devIp": vslCip,
            "devModel": "NovaTcpPlayer",
            "devNo": data.cancelScreen,
            "devPort": Number(vslCport),
            "regionNo": "",
            "screenNo": 1
          }
        };
        var lc = thunkify(ledClear);
        var vslClear_result = yield lc(vslClear);
        var vslCClear_result = yield lc(vslCClear);
        if(vslClear_result){
          vslClear_result = JSON.parse(vslClear_result);
          if(!vslClear_result.success){
            cb(null,{
              ret:2,
              msg:'可变限速牌清屏失败'
            });
          }
        }else {
          cb(null,{
            ret:2,
            msg:'可变限速牌清屏异常'
          });
        }

        //清理节目单
        var listClearParam = {
          r:d_road_region,
          device_nbr:vsl_nbr
        };
        var vslld = thunkify(vslListDelete);
        var vslld_result = yield vslld(listClearParam);
        if(!vslld_result){
          cb(null,{
            ret:0,
            msg:'删除节目单失败'
          });
        }

        if(vslCClear_result){
          vslCClear_result = JSON.parse(vslCClear_result);
          if(!vslCClear_result.success){
            cb(null,{
              ret:2,
              msg:'解除限速牌清屏失败'
            });
          }
        }else {
          cb(null,{
            ret:2,
            msg:'解除限速牌清屏异常'
          });
        }
        //清理节目单
        listClearParam = {
          r:d_road_region,
          device_nbr:vslC_nbr
        };
        var vslCld = thunkify(vslListDelete);
        var vslCld_result = yield vslCld(listClearParam);
        if(!vslCld_result){
          cb(null,{
            ret:0,
            msg:'删除节目单失败'
          });
        }
        var vslS = thunkify(vslSend);
        var vsl_result = yield vslS(vslControl);
        var vslC_result = yield vslS(vslCControl);
        if(vsl_result){
          vsl_result = JSON.parse(vsl_result);
          if(!vsl_result.success){
            cb(null,{
              ret:0,
              msg:'可变限速牌控制失败'
            });
          }
        }else {
          cb(null,{
            ret:0,
            msg:'可变限速牌控制异常'
          });
        }
        //添加节目单
        var listAddParam = {
          r:d_road_region,
          device_nbr:vsl_nbr,
          program:vslJson,
          pid:vslJson.pid
        };
        var la = thunkify(listAdd);
        var la_result = yield la(listAddParam);
        if(!la_result){
          cb(null,{
            ret:0,
            msg:'限速牌节目单更新失败'
          });
        }
        if(vslC_result){
          vslC_result = JSON.parse(vslC_result);
          if(!vslC_result.success){
            cb(null,{
              ret:0,
              msg:'解除限速牌控制失败'
            });
          }
        }else {
          cb(null,{
            ret:0,
            msg:'解除限速牌控制异常'
          });
        }
        listAddParam = {
          r:d_road_region,
          device_nbr:vslC_nbr,
          program:vslCJson,
          pid:vslJson.pid
        };
        var la = thunkify(listAdd);
        var la_result = yield la(listAddParam);
        if(!la_result){
          cb(null,{
            ret:0,
            msg:'解除限速牌节目单更新失败'
          });
        }
      }catch (e){
        cb(null,{
          ret:0,
          msg:e
        });
        return false;
      }
      //查询起点、终点、抓拍相机点位
      try{
        var fsp = thunkify(findSitePosition);
        var fvp = thunkify(findVmrsPosition);
        var whereS = {
          site_nbr:data.entry_site_code
        };
        var whereE = {
          site_nbr:data.exit_site_code
        };
        var whereC = {
          site_nbr:data.site_code
        };
        var startSite = yield fsp(whereS);
        var endSite = yield fsp(whereE);
        var captureSite = yield fsp(whereC);
        var capturePosition;
        if(startSite) {
          startSite = JSON.parse(startSite);
          var cameraS = startSite.datas[0].cameras;
          var startPosition = startSite.datas[0].road_code+startSite.datas[0].mileage.split("km").join("")+startSite.datas[0].metre;
        }

        if(endSite){
          endSite = JSON.parse(endSite);
          var cameraE = endSite.datas[0].cameras;
          var endPosition = endSite.datas[0].road_code+endSite.datas[0].mileage.split("km").join("")+endSite.datas[0].metre;
        }
        if(captureSite){
          captureSite = JSON.parse(captureSite);
          var cameraC = captureSite.datas[0].cameras;
          capturePosition = captureSite.datas[0].road_code+captureSite.datas[0].mileage.split("km").join("")+captureSite.datas[0].metre;
        }
      }catch (e){
        cb(null, {
          ret: 0,
          msg: e
        });
        return false;
      }
      if (data.region_code == "undefined" || !data.region_code) {
        data.region_code = data.org_code + index;
        data.code_auto = 1;
      }
      data.region_name = data.address + '区间';
      //获取设备名称
      try{
        var fr = thunkify(findRegion);
        var wherer = {
          r:d_road_region,
          address:data.address
        };
        var region = yield fr(wherer);
        if(region){
          if (region.length == 0) {
            data.region_name = data.region_name + '001';
          } else {
            var device_name = region[0].region_name;
            var indexN = Number(device_name.slice(-3)) + 1;
            data.region_name = data.region_name + ('000' + indexN.toString()).slice(-3);
          }
        }else {
          cb(null,{
            ret:0,
            msg:'获取设备名称失败'
          });
          return false;
        }

      }catch (e){
        cb(null, {
          ret: 0,
          msg: e
        });
        return false;
      }
      var direction;
      switch (data.direction_type)
      {
        case 0:
          direction="双向";
          break;
        case 1:
          direction="上行";
          break;
        case 2:
          direction="下行";
          break;
      }
      //构造区间json串
      var regionData = {
        "optperson":req.query.username,
        "commandType": "addRange",  	//addRange/updateRange/getRange/listRanges 4种参数可选
        "zkRoadRange": {
          "beginGPS": "",
          "beginLocation": startPosition,
          "code": data.region_code,
          "direction": direction,
          "distance": Number(data.distance),
          "endGPS": "",
          "endLocation": endPosition,
          "name": data.region_name,
          "speedLimitGPS": "",
          "speedLimitLocation":capturePosition,
          "speedLimits": [
            {
              "lane": 0, //用于分车道限速的车道号,0 表示不分车道  0
              "overSpeedMargin": Number(data.large_vehicle_allow),  //限高速宽限值  large_vehicle_allow
              "roadOverSpeedLimit": Number(data.large_vehicle_limit), //路段限高速  large_vehicle_limit | 大车限速 new
              "roadUnderSpeedLimit": Number(data.lower_limit), //路段限低速  lower_limit | 最低速度 new
              "underSpeedMargin": 0,  //限低速宽限值  0
              "vehicleType": "01"  //大车='01',小车='02',摩托车 = '05',其他车辆 = '00'借用GA24.4的编码
            },
            {
              "lane": 0, //用于分车道限速的车道号,0 表示不分车道  0
              "overSpeedMargin": Number(data.small_vehicle_allow),  //限高速宽限值  large_vehicle_allow
              "roadOverSpeedLimit": Number(data.small_vehicle_limit), //路段限高速  large_vehicle_limit | 大车限速 new
              "roadUnderSpeedLimit": Number(data.lower_limit), //路段限低速  lower_limit | 最低速度 new
              "underSpeedMargin": 0,  //限低速宽限值  0
              "vehicleType": "02"  //大车='01',小车='02',摩托车 = '05',其他车辆 = '00'借用GA24.4的编码
            }
          ],
          "updateTime": Date.now()
        }
      };
      // 调用区间添加接口
      try {
        var ra = thunkify(regionAdd);
        var result = yield ra(regionData);
        result = JSON.parse(result);
        if(!result.success){
          cb(null, {
            ret: 2,
            msg: '区间添加失败:'+ result.message
          });
          return false;
        }
      }catch (e){
        cb(null, {
          ret: 0,
          msg: e
        });
        return false;
      }
      data.set = data.small_vehicle_limit.toString();
      d_road_region.create(data, function (err, rs) {
        if (err) cb(null, {
          ret: 0,
          err: err,
          msg: '区间代码重复'
        });
        //更新关联表sys_device
        // d_road_region.app.models.sys_device.create({device_nbr:data.region_code,device_name:data.region_name,device_type:14,sys_code:data.sys_code},function (err, a) {
        //   if (err) cb(null, {
        //     ret: 0,
        //     msg: err
        //   });
          //更新设备状态表d_status
          d_road_region.app.models.d_status.upsertWithWhere({device_nbr: rs.region_code}, {
            device_nbr: rs.region_code,
            online_status: 1,
            fault_status: 2,
            fault_code: '',
            timeDiff: 0
          }, function (err, status) {
            if (err) cb(null, {
              ret: 0,
              msg: err
            });
            //反向视频卡口
            // d_road_region.app.models.sys_device.updateAll({device_nbr:data.site_code},{device_type:18,sys_code:data.sys_code},function (err, a) {
            //   if (err) cb(null, {
            //     ret: 0,
            //     msg: err
            //   });
              var user = req.query.username;
              logs.optLog("设备备案：添加区间测速" + rs.region_code, req.headers['x-forwarded-for'] ||
                req.connection.remoteAddress ||
                req.socket.remoteAddress ||
                req.connection.socket.remoteAddress, user);
              cb(null, {
                ret: 1,
                id: rs.id,
                msg: '新增成功'
              });
            // });
          });
        // });
      })
    });
  };
  d_road_region.remoteMethod('add', {
    description:'添加区间',
    accepts: {arg:'req', type:'Object',required:true,http: { source: 'req' }},
    http: {path:'/add',verb:'post'},
    returns: {arg: 'res', type: 'Object',root:true,required:true}
  });

  //删除
  d_road_region.del = function (req, cb) {
    var data = req.body;
    var arr=[];
    data.id.split(",").forEach(function(item){
      arr.push(ObjectID(item));
    });
    var where = {_id:{inq: arr}};
    var device_nbr = [];
    var code = [];
    data.region_code.split(",").forEach(function(item){
      code.push(item);
    });
    co(function *() {
      try {
        for(var i = 0;i<code.length;i++){
          var regionData = {
            "optperson": req.query.username,
            "commandType": "removeRange",  	//addRange/updateRange/getRange/listRanges 4种参数可选
            "zkRoadRange": {
              "code":code[i]
            }
          };
          var rr = thunkify(removeRange);
          var rr_callback = yield rr(regionData);
          rr_callback = JSON.parse(rr_callback);
          if(!rr_callback.success){
            cb(null,{
              ret:2,
              msg:'区间删除失败'
            });
            return false;
          }
        }


      }catch (e){
        cb(null,{
          ret:2,
          msg:'区间删除失败'
        });
        return false;
      }
      d_road_region.find({where:where},function (err, rs) {
        if (err) cb(null, err);
        for (var i = 0; i < rs.length; i++) {
          device_nbr.push(rs[i].region_code);
        }
        var delwhere = {device_nbr: {inq: device_nbr}};
        d_road_region.app.models.sys_device.destroyAll(delwhere, function (err, count) {
          if (err) cb(null, err);
          d_road_region.destroyAll(where, function (err, info) {
            if (err) cb(null, err);
            var user = req.query.username;
            logs.optLog("设备备案：删除" + info.count + "个区间", req.headers['x-forwarded-for'] ||
              req.connection.remoteAddress ||
              req.socket.remoteAddress ||
              req.connection.socket.remoteAddress, user);
            cb(null, {
              ret: 1,
              msg: '删除成功'
            });
          })
        });
      });
    });

  };
  d_road_region.remoteMethod('del', {
    description:'删除区间',
    accepts: {arg:'req', type:'Object',required:true,http: { source: 'req' }},
    http: {path:'/delete',verb:'post'},
    returns: {arg: 'res', type: 'Object',root:true,required:true}
  });

  //修改
  d_road_region.up = function (req, cb) {
    var data = req.body;
    delete data['status'];
    if(data.id=="undefined"){
      cb(null,errParamMsg);
    }
    var id = data.id;
    delete data['id'];
    if(data.metre!="") data.address = data.road_name + data.section_code + data.mileage+ '+' + data.metre + 'm';
    else data.address = data.road_name + data.section_code + data.mileage;
    d_road_region.find({order:'_id DESC',where:{_id:ObjectID(id),address:data.address}},function (err, old) {
      if (err) cb(null, {
        ret: 0,
        msg: err
      });
      if(old.length==0){
        data.region_name = data.address + '区间';
        d_road_region.find({order:'_id DESC',where:{address:data.address}},function (err, arr) {
          if (err) cb(null, {
            ret: 0,
            msg: err
          });
          if (arr.length == 0) {
            data.region_name = data.region_name + '001';
          } else {
            var device_name = arr[0].region_name;
            var index = Number(device_name.slice(-3)) + 1;
            data.region_name = data.region_name + ('000' + index.toString()).slice(-3);
          }
          co(function *() {
            //限速牌控制
            var speed = data.small_vehicle_limit;
            var vslImg = 'limit'+ speed + '.png';
            var vslCImg = 'cancel'+ speed + '.png';
            var vslPath = imgUrl + vslImg;
            var vslCPath = imgUrl + vslCImg;
            var vslData = fs.readFileSync(vslPath);
            var vslCData = fs.readFileSync(vslCPath);
            vslData = 'data:image/png;base64,'+new Buffer(vslData).toString('base64');
            vslCData = 'data:image/png;base64,'+new Buffer(vslCData).toString('base64');
            var vslImgStates = fs.statSync(vslPath);
            var vslCImgStates = fs.statSync(vslCPath);
            var vslImgSize = vslImgStates.size;
            var vslCImgSize = vslCImgStates.size;
            //获取限速牌信息
            try {
              var fv = thunkify(findVsl);
              var vslParam = {
                device_nbr:data.speedBrand,
                r:d_road_region
              };
              var vslCParam = {
                device_nbr:data.cancelScreen,
                r:d_road_region
              };
              var vsl = yield fv(vslParam);
              var vslC = yield fv(vslCParam);
              if(vsl&&vslC){
                var vslSet = vsl[0].speed_band;
                var vslCSet = vslC[0].speed_band;
                var vslText = vsl[0].text;
                var vslCText = vslC[0].text;
                var vslip = vsl[0].ip;
                var vslport = vsl[0].port;
                var vslCip = vslC[0].ip;
                var vslCport = vslC[0].port;
                var vslColorType = vsl[0].vms_type;
                var vslCColorType = vslC[0].vms_type;
              }
            }catch (e){
              cb(null,{
                ret:0,
                msg:e
              });
            }
            if(vslSet.perform.picture&&vslCSet.perform.picture){
              vslSet.perform.picture[0].picturecontents.path = vslPath;
              vslSet.perform.picture[0].picturecontents.picdata = vslData;
              vslSet.perform.picture[0].picturecontents.picsize = vslImgSize;
              vslCSet.perform.picture[0].picturecontents.path = vslCPath;
              vslCSet.perform.picture[0].picturecontents.picdata = vslCData;
              vslCSet.perform.picture[0].picturecontents.picsize = vslCImgSize;
            }else {
              vslSet = {
                "typeValue" : 1,
                "timeChecked" : false,
                "display" : "inline-block",
                "infoType" : "1",
                "checkedList" : ["1", "2", "3", "4", "5", "6", "7"],
                "indeterminate" : false,
                "checkAll" : true,
                "dingshiDisplay" : "none",
                "shichangDisplay" : "block",
                "dataTime" : "2017-10-9",
                "timeValue" : 60,
                "startTime" : "08:00",
                "endTime" : "20:00",
                "perform" : {
                  "text" : [{
                    "contents" : {
                      "fontvalignment" : 3,
                      "enterSpeed" : 4,
                      "fonthalignment" : 3,
                      "fontbold" : 0,
                      "fontcolor" : 255,
                      "fontsize" : "25",
                      "fontunderline" : 0,
                      "textinfo" : "区间",
                      "enterEffect" : "PlayStyleNone",
                      "font" : "黑体",
                      "fontitalic" : 0
                    },
                    "name" : "区间",
                    "width" : 72,
                    "startY" : 0,
                    "startX" : 72,
                    "height" : 40
                  }, {
                    "contents" : {
                      "fontvalignment" : 3,
                      "enterSpeed" : 4,
                      "fonthalignment" : 3,
                      "fontbold" : 0,
                      "fontcolor" : 255,
                      "fontsize" : "25",
                      "fontunderline" : 0,
                      "textinfo" : "测速",
                      "enterEffect" : "PlayStyleNone",
                      "font" : "黑体",
                      "fontitalic" : 0
                    },
                    "name" : "测速",
                    "width" : 72,
                    "startY" : 40,
                    "startX" : 72,
                    "height" : 40
                  }],
                  "picture" : [{
                    "height" : 80,
                    "name" : vslImg,
                    "picturecontents" : {
                      "enterEffect" : "PlayStyleNone",
                      "enterSpeed" : 4,
                      "path" : vslPath,
                      "picdata" : vslData,
                      "picsize" : Number(vslImgSize)
                    },
                    "startX" : 0,
                    "styleY" : 3,
                    "width" : 72,
                    "startY" : 0
                  }]
                },
                "specInfo" : {
                  "specId" : "111",
                  "specName" : "全彩屏/条屏/384*128",
                  "ledDeviceType" : "9",
                  "colorType" : "3",
                  "pixesHeight" : 128,
                  "pixesWidth" : 384,
                  "width" : 144,
                  "height" : 80,
                  "remark" : null,
                  "ledShape" : "1",
                  "ledFunctionType" : "1"
                },
                "selectIndex" : 0,
                "canMoveText" : false,
                "canMovePicture" : false,
                "offsetLeft" : 773,
                "offsetTop" : 276,
                "scaling" : 4.0972222222222223,
                "pictureIndex" : 8888,
                "textForm" : true,
                "pictureForm" : true,
                "loading" : false
              };
              vslCSet = {
                "typeValue" : 1,
                "timeChecked" : false,
                "display" : "inline-block",
                "infoType" : "1",
                "checkedList" : ["1", "2", "3", "4", "5", "6", "7"],
                "indeterminate" : false,
                "checkAll" : true,
                "dingshiDisplay" : "none",
                "shichangDisplay" : "block",
                "dataTime" : "2017-10-9",
                "timeValue" : 60,
                "startTime" : "08:00",
                "endTime" : "20:00",
                "perform" : {
                  "text" : [{
                    "height" : 80,
                    "name" : "谨慎驾驶",
                    "width" : 72,
                    "startX" : 72,
                    "startY" : 0,
                    "contents" : {
                      "enterEffect" : "PlayStyleNone",
                      "enterSpeed" : 4,
                      "font" : "黑体",
                      "fontbold" : 0,
                      "fontcolor" : 255,
                      "fonthalignment" : 3,
                      "fontitalic" : 0,
                      "fontsize" : "22",
                      "fontunderline" : 0,
                      "fontvalignment" : 3,
                      "textinfo" : "谨慎驾驶"
                    }
                  }],
                  "picture" : [{
                    "height" : 80,
                    "name" : vslCImg,
                    "picturecontents" : {
                      "enterEffect" : "PlayStyleNone",
                      "enterSpeed" : 4,
                      "path" : vslCPath,
                      "picdata" : vslCData,
                      "picsize" : Number(vslCImgSize)
                    },
                    "startX" : 0,
                    "styleY" : 3,
                    "width" : 72,
                    "startY" : 0
                  }]
                },
                "specInfo" : {
                  "specId" : "111",
                  "specName" : "全彩屏/条屏/384*128",
                  "ledDeviceType" : "9",
                  "colorType" : "3",
                  "pixesHeight" : 128,
                  "pixesWidth" : 384,
                  "width" : 144,
                  "height" : 80,
                  "remark" : null,
                  "ledShape" : "1",
                  "ledFunctionType" : "1"
                },
                "selectIndex" : 0,
                "canMoveText" : false,
                "canMovePicture" : false,
                "offsetLeft" : 773,
                "offsetTop" : 276,
                "scaling" : 4.0972222222222223,
                "pictureIndex" : 8888,
                "textForm" : true,
                "pictureForm" : true,
                "loading" : false
              };
            }
            //限速牌控制json
            var vslJson = vslSet;
            //解除限速牌控制json
            var vslCJson = vslCSet;
            if(speed=='120'){
              vslCJson = {
                "canMoveText" : false,
                "pictureIndex" : 8888,
                "indeterminate" : false,
                "timeValue" : 60,
                "dingshiDisplay" : "none",
                "infoType" : "1",
                "shichangDisplay" : "block",
                "specInfo" : {
                  "specId" : "111",
                  "specName" : "全彩屏/条屏/384*128",
                  "ledDeviceType" : "9",
                  "colorType" : "3",
                  "pixesHeight" : 128,
                  "pixesWidth" : 384,
                  "width" : 144,
                  "height" : 80,
                  "remark" : null,
                  "ledShape" : "1",
                  "ledFunctionType" : "1"
                },
                "startTime" : "08:00",
                "offsetLeft" : 754,
                "offsetTop" : 394,
                "scaling" : 4.0972222222222223,
                "checkAll" : true,
                "display" : "inline-block",
                "perform" : {
                  "text" : [{
                    "height" : 40,
                    "name" : "区间测速",
                    "width" : 144,
                    "startX" : 0,
                    "startY" : 0,
                    "contents" : {
                      "enterEffect" : "PlayStyleNone",
                      "enterSpeed" : 4,
                      "font" : "黑体",
                      "fontbold" : 0,
                      "fontcolor" : 255,
                      "fonthalignment" : 3,
                      "fontitalic" : 0,
                      "fontsize" : "25",
                      "fontunderline" : 0,
                      "fontvalignment" : 3,
                      "textinfo" : "区间测速"
                    }
                  }, {
                    "height" : 40,
                    "name" : "点刹无效",
                    "width" : 144,
                    "startX" : 0,
                    "startY" : 40,
                    "contents" : {
                      "enterEffect" : "PlayStyleNone",
                      "enterSpeed" : 4,
                      "font" : "黑体",
                      "fontbold" : 0,
                      "fontcolor" : 255,
                      "fonthalignment" : 3,
                      "fontitalic" : 0,
                      "fontsize" : "25",
                      "fontunderline" : 0,
                      "fontvalignment" : 3,
                      "textinfo" : "点刹无效"
                    }
                  }],
                  "picture" : []
                },
                "selectIndex" : 1,
                "timeChecked" : false,
                "loading" : false,
                "checkedList" : ["1", "2", "3", "4", "5", "6", "7"],
                "canMovePicture" : false,
                "dataTime" : "2017-9-28",
                "textForm" : true,
                "typeValue" : 1,
                "endTime" : "20:00",
                "pictureForm" : true
              };
              vslJson = {
                "canMoveText" : false,
                "pictureIndex" : 8888,
                "indeterminate" : false,
                "timeValue" : 60,
                "dingshiDisplay" : "none",
                "infoType" : "1",
                "shichangDisplay" : "block",
                "specInfo" : {
                  "specId" : "111",
                  "specName" : "全彩屏/条屏/384*128",
                  "ledDeviceType" : "9",
                  "colorType" : "3",
                  "pixesHeight" : 128,
                  "pixesWidth" : 384,
                  "width" : 144,
                  "height" : 80,
                  "remark" : null,
                  "ledShape" : "1",
                  "ledFunctionType" : "1"
                },
                "startTime" : "08:00",
                "offsetLeft" : 754,
                "offsetTop" : 394,
                "scaling" : 4.0972222222222223,
                "checkAll" : true,
                "display" : "inline-block",
                "perform" : {
                  "text" : [{
                    "height" : 40,
                    "name" : "区间测速",
                    "width" : 144,
                    "startX" : 0,
                    "startY" : 0,
                    "contents" : {
                      "enterEffect" : "PlayStyleNone",
                      "enterSpeed" : 4,
                      "font" : "黑体",
                      "fontbold" : 0,
                      "fontcolor" : 255,
                      "fonthalignment" : 3,
                      "fontitalic" : 0,
                      "fontsize" : "25",
                      "fontunderline" : 0,
                      "fontvalignment" : 3,
                      "textinfo" : "区间测速"
                    }
                  }, {
                    "height" : 40,
                    "name" : "点刹无效",
                    "width" : 144,
                    "startX" : 0,
                    "startY" : 40,
                    "contents" : {
                      "enterEffect" : "PlayStyleNone",
                      "enterSpeed" : 4,
                      "font" : "黑体",
                      "fontbold" : 0,
                      "fontcolor" : 255,
                      "fonthalignment" : 3,
                      "fontitalic" : 0,
                      "fontsize" : "25",
                      "fontunderline" : 0,
                      "fontvalignment" : 3,
                      "textinfo" : "点刹无效"
                    }
                  }],
                  "picture" : []
                },
                "selectIndex" : 1,
                "timeChecked" : false,
                "loading" : false,
                "checkedList" : ["1", "2", "3", "4", "5", "6", "7"],
                "canMovePicture" : false,
                "dataTime" : "2017-9-28",
                "textForm" : true,
                "typeValue" : 1,
                "endTime" : "20:00",
                "pictureForm" : true
              };
            }
            vslJson.pid = 1;
            vslCJson.pid = 1;
            //限速牌控制
            try{
              var vslControl = {
                "optperson":req.query.username,
                "commandType": "addProgram",	//接口命令类型，添加节目的固定命令就为addProgram
                "deviceInfo": {					//设备参数开始
                  "colorType": Number(vslColorType),
                  "devIp": vslip,
                  "devModel": "NovaTcpPlayer",
                  "devNo": data.speedBrand,
                  "devPort": Number(vslport),
                  "regionNo": "",
                  "screenNo": 1
                },
                "program":vslJson,
                "text":speed
              };
              var vslCControl = {
                "optperson":req.query.username,
                "commandType": "addProgram",	//接口命令类型，添加节目的固定命令就为addProgram
                "deviceInfo": {					//设备参数开始
                  "colorType": Number(vslCColorType),
                  "devIp": vslCip,
                  "devModel": "NovaTcpPlayer",
                  "devNo": data.cancelScreen,
                  "devPort": Number(vslCport),
                  "regionNo": "",
                  "screenNo": 1
                },
                "program":vslCJson,
                "text":speed
              };
              var vslClear ={
                "optperson":req.query.username,
                "commandType": "clearProgram",	//接口命令类型，添加节目的固定命令就为addProgram
                "deviceInfo": {					//设备参数开始
                  "colorType": Number(vslColorType),
                  "devIp": vslip,
                  "devModel": "NovaTcpPlayer",
                  "devNo": data.speedBrand,
                  "devPort": Number(vslport),
                  "regionNo": "",
                  "screenNo": 1
                }
              };
              var vslCClear = {
                "optperson":req.query.username,
                "commandType": "clearProgram",	//接口命令类型，添加节目的固定命令就为addProgram
                "deviceInfo": {					//设备参数开始
                  "colorType": Number(vslCColorType),
                  "devIp": vslCip,
                  "devModel": "NovaTcpPlayer",
                  "devNo": data.cancelScreen,
                  "devPort": Number(vslCport),
                  "regionNo": "",
                  "screenNo": 1
                }
              };
              var lc = thunkify(ledClear);
              var vslClear_result = yield lc(vslClear);
              var vslCClear_result = yield lc(vslCClear);
              if(vslClear_result){
                vslClear_result = JSON.parse(vslClear_result);
                if(!vslClear_result.success){
                  cb(null,{
                    ret:2,
                    msg:'可变限速牌清屏失败'
                  });
                }
              }else {
                cb(null,{
                  ret:2,
                  msg:'可变限速牌清屏异常'
                });
              }

              //清理节目单
              var listClearParam = {
                r:d_road_region,
                device_nbr:vsl_nbr
              };
              var vslld = thunkify(vslListDelete);
              var vslld_result = yield vslld(listClearParam);
              if(!vslld_result){
                cb(null,{
                  ret:0,
                  msg:'删除节目单失败'
                });
              }

              if(vslCClear_result){
                vslCClear_result = JSON.parse(vslCClear_result);
                if(!vslCClear_result.success){
                  cb(null,{
                    ret:2,
                    msg:'解除限速牌清屏失败'
                  });
                }
              }else {
                cb(null,{
                  ret:2,
                  msg:'解除限速牌清屏异常'
                });
              }
              //清理节目单
              listClearParam = {
                r:d_road_region,
                device_nbr:vslC_nbr
              };
              var vslCld = thunkify(vslListDelete);
              var vslCld_result = yield vslCld(listClearParam);
              if(!vslCld_result){
                cb(null,{
                  ret:0,
                  msg:'删除节目单失败'
                });
              }
              var vslS = thunkify(vslSend);
              var vsl_result = yield vslS(vslControl);
              var vslC_result = yield vslS(vslCControl);
              if(vsl_result){
                vsl_result = JSON.parse(vsl_result);
                if(!vsl_result.success){
                  cb(null,{
                    ret:0,
                    msg:'可变限速牌控制失败'
                  });
                }
              }else {
                cb(null,{
                  ret:0,
                  msg:'可变限速牌控制异常'
                });
              }
              //添加节目单
              var listAddParam = {
                r:d_road_region,
                device_nbr:vsl_nbr,
                program:vslJson,
                pid:vslJson.pid
              };
              var la = thunkify(listAdd);
              var la_result = yield la(listAddParam);
              if(!la_result){
                cb(null,{
                  ret:0,
                  msg:'限速牌节目单更新失败'
                });
              }
              if(vslC_result){
                vslC_result = JSON.parse(vslC_result);
                if(!vslC_result.success){
                  cb(null,{
                    ret:0,
                    msg:'解除限速牌控制失败'
                  });
                }
              }else {
                cb(null,{
                  ret:0,
                  msg:'解除限速牌控制异常'
                });
              }
              listAddParam = {
                r:d_road_region,
                device_nbr:vslC_nbr,
                program:vslCJson,
                pid:vslJson.pid
              };
              var la = thunkify(listAdd);
              var la_result = yield la(listAddParam);
              if(!la_result){
                cb(null,{
                  ret:0,
                  msg:'解除限速牌节目单更新失败'
                });
              }
            }catch (e){
              cb(null,{
                ret:0,
                msg:e
              });
              return false;
            }
            //查询起点、终点、抓拍相机点位
            try{
              var fsp = thunkify(findSitePosition);
              var fvp = thunkify(findVmrsPosition);
              var whereS = {
                site_nbr:data.entry_site_code
              };
              var whereE = {
                site_nbr:data.exit_site_code
              };
              var whereC = {
                site_nbr:data.site_code
              };
              var startSite = yield fsp(whereS);
              var endSite = yield fsp(whereE);
              var captureSite = yield fsp(whereC);
              var capturePosition;
              if(startSite) {
                startSite = JSON.parse(startSite);
                var cameraS = startSite.datas[0].cameras;
                var startPosition = startSite.datas[0].road_code+startSite.datas[0].mileage.split("km").join("")+startSite.datas[0].metre;
              }

              if(endSite){
                endSite = JSON.parse(endSite);
                var cameraE = endSite.datas[0].cameras;
                var endPosition = endSite.datas[0].road_code+endSite.datas[0].mileage.split("km").join("")+endSite.datas[0].metre;
              }
              if(captureSite){
                captureSite = JSON.parse(captureSite);
                var cameraC = captureSite.datas[0].cameras;
                capturePosition = captureSite.datas[0].road_code+captureSite.datas[0].mileage.split("km").join("")+captureSite.datas[0].metre;
              }
            }catch (e){
              cb(null, {
                ret: 0,
                msg: e
              });
            }
            // var direction;
            // switch (data.direction_type)
            // {
            //   case 0:
            //     direction="双向";
            //     break;
            //   case 1:
            //     direction="上行";
            //     break;
            //   case 2:
            //     direction="下行";
            //     break;
            // }
            //构造区间json串
            var regionData = {
              "optperson":req.query.username,
              "commandType": "updateRange",  	//addRange/updateRange/getRange/listRanges 4种参数可选
              "zkRoadRange": {
                "beginGPS": "",
                "beginLocation": startPosition,
                "code": data.region_code,
                "direction": data.direction_name,
                "distance": Number(data.distance),
                "endGPS": "",
                "endLocation": endPosition,
                "name": data.region_name,
                "speedLimitGPS": "",
                "speedLimitLocation":capturePosition,
                "speedLimits": [
                  {
                    "lane": 0, //用于分车道限速的车道号,0 表示不分车道  0
                    "overSpeedMargin": Number(data.large_vehicle_allow),  //限高速宽限值  large_vehicle_allow
                    "roadOverSpeedLimit": Number(data.large_vehicle_limit), //路段限高速  large_vehicle_limit | 大车限速 new
                    "roadUnderSpeedLimit": Number(data.lower_limit), //路段限低速  lower_limit | 最低速度 new
                    "underSpeedMargin": 0,  //限低速宽限值  0
                    "vehicleType": "01"  //大车='01',小车='02',摩托车 = '05',其他车辆 = '00'借用GA24.4的编码
                  },
                  {
                    "lane": 0, //用于分车道限速的车道号,0 表示不分车道  0
                    "overSpeedMargin": Number(data.small_vehicle_allow),  //限高速宽限值  large_vehicle_allow
                    "roadOverSpeedLimit": Number(data.small_vehicle_limit), //路段限高速  large_vehicle_limit | 大车限速 new
                    "roadUnderSpeedLimit": Number(data.lower_limit), //路段限低速  lower_limit | 最低速度 new
                    "underSpeedMargin": 0,  //限低速宽限值  0
                    "vehicleType": "02"  //大车='01',小车='02',摩托车 = '05',其他车辆 = '00'借用GA24.4的编码
                  }
                ],
                "updateTime": Date.now()
              }
            };
            //调用区间添加接口
            try {
              var ra = thunkify(regionUp);
              var result = yield ra(regionData);
              if(!result.success){
                cb(null, {
                  ret: 0,
                  msg: '区间添加失败'
                });
                return false;
              }
            }catch (e){
              cb(null, {
                ret: 0,
                msg: e
              });
              return false;
            }
            data.set = data.small_vehicle_limit.toString();
            d_road_region.replaceById(id, data, {validate: true}, function (err, rs) {
              if (err) cb(null, {
                ret: 0,
                msg: err
              });
              d_road_region.app.models.sys_device.updateAll({device_nbr:data.region_code},{device_name:data.region_name},function (err,info) {
                if (err) cb(null, {
                  ret: 0,
                  msg: err
                });
                var user = req.query.username;
                logs.optLog("设备备案：修改区间" + rs.region_code, req.headers['x-forwarded-for'] ||
                  req.connection.remoteAddress ||
                  req.socket.remoteAddress ||
                  req.connection.socket.remoteAddress, user);
                cb(null, {
                  ret: 1,
                  msg: '修改成功'
                });
              });
            })

          });
        });
      }else {
        data.region_name = old[0].region_name;
        co(function *() {
          //限速牌控制
          var speed = data.small_vehicle_limit;
          var vslImg = 'limit'+ speed + '.png';
          var vslCImg = 'cancel'+ speed + '.png';
          var vslPath = imgUrl + vslImg;
          var vslCPath = imgUrl + vslCImg;
          var vslData = fs.readFileSync(vslPath);
          var vslCData = fs.readFileSync(vslCPath);
          vslData = 'data:image/png;base64,'+new Buffer(vslData).toString('base64');
          vslCData = 'data:image/png;base64,'+new Buffer(vslCData).toString('base64');
          var vslImgStates = fs.statSync(vslPath);
          var vslCImgStates = fs.statSync(vslCPath);
          var vslImgSize = vslImgStates.size;
          var vslCImgSize = vslCImgStates.size;
          //获取限速牌信息
          try {
            var fv = thunkify(findVsl);
            var vslParam = {
              device_nbr:data.speedBrand,
              r:d_road_region
            };
            var vslCParam = {
              device_nbr:data.cancelScreen,
              r:d_road_region
            };
            var vsl = yield fv(vslParam);
            var vslC = yield fv(vslCParam);
            if(vsl&&vslC){
              var vslSet = vsl[0].speed_band;
              var vslCSet = vslC[0].speed_band;
              var vslText = vsl[0].text;
              var vslCText = vslC[0].text;
              var vslip = vsl[0].ip;
              var vslport = vsl[0].port;
              var vslCip = vslC[0].ip;
              var vslCport = vslC[0].port;
              var vslColorType = vsl[0].vms_type;
              var vslCColorType = vslC[0].vms_type;
            }
          }catch (e){
            cb(null,{
              ret:0,
              msg:e
            });
          }
          if(vslSet.perform.picture&&vslCSet.perform.picture){
            vslSet.perform.picture[0].picturecontents.path = vslPath;
            vslSet.perform.picture[0].picturecontents.picdata = vslData;
            vslSet.perform.picture[0].picturecontents.picsize = vslImgSize;
            vslCSet.perform.picture[0].picturecontents.path = vslCPath;
            vslCSet.perform.picture[0].picturecontents.picdata = vslCData;
            vslCSet.perform.picture[0].picturecontents.picsize = vslCImgSize;
          }else {
            vslSet = {
              "typeValue" : 1,
              "timeChecked" : false,
              "display" : "inline-block",
              "infoType" : "1",
              "checkedList" : ["1", "2", "3", "4", "5", "6", "7"],
              "indeterminate" : false,
              "checkAll" : true,
              "dingshiDisplay" : "none",
              "shichangDisplay" : "block",
              "dataTime" : "2017-10-9",
              "timeValue" : 60,
              "startTime" : "08:00",
              "endTime" : "20:00",
              "perform" : {
                "text" : [{
                  "contents" : {
                    "fontvalignment" : 3,
                    "enterSpeed" : 4,
                    "fonthalignment" : 3,
                    "fontbold" : 0,
                    "fontcolor" : 255,
                    "fontsize" : "25",
                    "fontunderline" : 0,
                    "textinfo" : "区间",
                    "enterEffect" : "PlayStyleNone",
                    "font" : "黑体",
                    "fontitalic" : 0
                  },
                  "name" : "区间",
                  "width" : 72,
                  "startY" : 0,
                  "startX" : 72,
                  "height" : 40
                }, {
                  "contents" : {
                    "fontvalignment" : 3,
                    "enterSpeed" : 4,
                    "fonthalignment" : 3,
                    "fontbold" : 0,
                    "fontcolor" : 255,
                    "fontsize" : "25",
                    "fontunderline" : 0,
                    "textinfo" : "测速",
                    "enterEffect" : "PlayStyleNone",
                    "font" : "黑体",
                    "fontitalic" : 0
                  },
                  "name" : "测速",
                  "width" : 72,
                  "startY" : 40,
                  "startX" : 72,
                  "height" : 40
                }],
                "picture" : [{
                  "height" : 80,
                  "name" : vslImg,
                  "picturecontents" : {
                    "enterEffect" : "PlayStyleNone",
                    "enterSpeed" : 4,
                    "path" : vslPath,
                    "picdata" : vslData,
                    "picsize" : Number(vslImgSize)
                  },
                  "startX" : 0,
                  "styleY" : 3,
                  "width" : 72,
                  "startY" : 0
                }]
              },
              "specInfo" : {
                "specId" : "111",
                "specName" : "全彩屏/条屏/384*128",
                "ledDeviceType" : "9",
                "colorType" : "3",
                "pixesHeight" : 128,
                "pixesWidth" : 384,
                "width" : 144,
                "height" : 80,
                "remark" : null,
                "ledShape" : "1",
                "ledFunctionType" : "1"
              },
              "selectIndex" : 0,
              "canMoveText" : false,
              "canMovePicture" : false,
              "offsetLeft" : 773,
              "offsetTop" : 276,
              "scaling" : 4.0972222222222223,
              "pictureIndex" : 8888,
              "textForm" : true,
              "pictureForm" : true,
              "loading" : false
            };
            vslCSet = {
              "typeValue" : 1,
              "timeChecked" : false,
              "display" : "inline-block",
              "infoType" : "1",
              "checkedList" : ["1", "2", "3", "4", "5", "6", "7"],
              "indeterminate" : false,
              "checkAll" : true,
              "dingshiDisplay" : "none",
              "shichangDisplay" : "block",
              "dataTime" : "2017-10-9",
              "timeValue" : 60,
              "startTime" : "08:00",
              "endTime" : "20:00",
              "perform" : {
                "text" : [{
                  "height" : 80,
                  "name" : "谨慎驾驶",
                  "width" : 72,
                  "startX" : 72,
                  "startY" : 0,
                  "contents" : {
                    "enterEffect" : "PlayStyleNone",
                    "enterSpeed" : 4,
                    "font" : "黑体",
                    "fontbold" : 0,
                    "fontcolor" : 255,
                    "fonthalignment" : 3,
                    "fontitalic" : 0,
                    "fontsize" : "22",
                    "fontunderline" : 0,
                    "fontvalignment" : 3,
                    "textinfo" : "谨慎驾驶"
                  }
                }],
                "picture" : [{
                  "height" : 80,
                  "name" : vslCImg,
                  "picturecontents" : {
                    "enterEffect" : "PlayStyleNone",
                    "enterSpeed" : 4,
                    "path" : vslCPath,
                    "picdata" : vslCData,
                    "picsize" : Number(vslCImgSize)
                  },
                  "startX" : 0,
                  "styleY" : 3,
                  "width" : 72,
                  "startY" : 0
                }]
              },
              "specInfo" : {
                "specId" : "111",
                "specName" : "全彩屏/条屏/384*128",
                "ledDeviceType" : "9",
                "colorType" : "3",
                "pixesHeight" : 128,
                "pixesWidth" : 384,
                "width" : 144,
                "height" : 80,
                "remark" : null,
                "ledShape" : "1",
                "ledFunctionType" : "1"
              },
              "selectIndex" : 0,
              "canMoveText" : false,
              "canMovePicture" : false,
              "offsetLeft" : 773,
              "offsetTop" : 276,
              "scaling" : 4.0972222222222223,
              "pictureIndex" : 8888,
              "textForm" : true,
              "pictureForm" : true,
              "loading" : false
            };
          }
          //限速牌控制json
          var vslJson = vslSet;
          //解除限速牌控制json
          var vslCJson = vslCSet;
          if(speed=='120'){
            vslCJson = {
              "canMoveText" : false,
              "pictureIndex" : 8888,
              "indeterminate" : false,
              "timeValue" : 60,
              "dingshiDisplay" : "none",
              "infoType" : "1",
              "shichangDisplay" : "block",
              "specInfo" : {
                "specId" : "111",
                "specName" : "全彩屏/条屏/384*128",
                "ledDeviceType" : "9",
                "colorType" : "3",
                "pixesHeight" : 128,
                "pixesWidth" : 384,
                "width" : 144,
                "height" : 80,
                "remark" : null,
                "ledShape" : "1",
                "ledFunctionType" : "1"
              },
              "startTime" : "08:00",
              "offsetLeft" : 754,
              "offsetTop" : 394,
              "scaling" : 4.0972222222222223,
              "checkAll" : true,
              "display" : "inline-block",
              "perform" : {
                "text" : [{
                  "height" : 40,
                  "name" : "区间测速",
                  "width" : 144,
                  "startX" : 0,
                  "startY" : 0,
                  "contents" : {
                    "enterEffect" : "PlayStyleNone",
                    "enterSpeed" : 4,
                    "font" : "黑体",
                    "fontbold" : 0,
                    "fontcolor" : 255,
                    "fonthalignment" : 3,
                    "fontitalic" : 0,
                    "fontsize" : "25",
                    "fontunderline" : 0,
                    "fontvalignment" : 3,
                    "textinfo" : "区间测速"
                  }
                }, {
                  "height" : 40,
                  "name" : "点刹无效",
                  "width" : 144,
                  "startX" : 0,
                  "startY" : 40,
                  "contents" : {
                    "enterEffect" : "PlayStyleNone",
                    "enterSpeed" : 4,
                    "font" : "黑体",
                    "fontbold" : 0,
                    "fontcolor" : 255,
                    "fonthalignment" : 3,
                    "fontitalic" : 0,
                    "fontsize" : "25",
                    "fontunderline" : 0,
                    "fontvalignment" : 3,
                    "textinfo" : "点刹无效"
                  }
                }],
                "picture" : []
              },
              "selectIndex" : 1,
              "timeChecked" : false,
              "loading" : false,
              "checkedList" : ["1", "2", "3", "4", "5", "6", "7"],
              "canMovePicture" : false,
              "dataTime" : "2017-9-28",
              "textForm" : true,
              "typeValue" : 1,
              "endTime" : "20:00",
              "pictureForm" : true
            };
            vslJson = {
              "canMoveText" : false,
              "pictureIndex" : 8888,
              "indeterminate" : false,
              "timeValue" : 60,
              "dingshiDisplay" : "none",
              "infoType" : "1",
              "shichangDisplay" : "block",
              "specInfo" : {
                "specId" : "111",
                "specName" : "全彩屏/条屏/384*128",
                "ledDeviceType" : "9",
                "colorType" : "3",
                "pixesHeight" : 128,
                "pixesWidth" : 384,
                "width" : 144,
                "height" : 80,
                "remark" : null,
                "ledShape" : "1",
                "ledFunctionType" : "1"
              },
              "startTime" : "08:00",
              "offsetLeft" : 754,
              "offsetTop" : 394,
              "scaling" : 4.0972222222222223,
              "checkAll" : true,
              "display" : "inline-block",
              "perform" : {
                "text" : [{
                  "height" : 40,
                  "name" : "区间测速",
                  "width" : 144,
                  "startX" : 0,
                  "startY" : 0,
                  "contents" : {
                    "enterEffect" : "PlayStyleNone",
                    "enterSpeed" : 4,
                    "font" : "黑体",
                    "fontbold" : 0,
                    "fontcolor" : 255,
                    "fonthalignment" : 3,
                    "fontitalic" : 0,
                    "fontsize" : "25",
                    "fontunderline" : 0,
                    "fontvalignment" : 3,
                    "textinfo" : "区间测速"
                  }
                }, {
                  "height" : 40,
                  "name" : "点刹无效",
                  "width" : 144,
                  "startX" : 0,
                  "startY" : 40,
                  "contents" : {
                    "enterEffect" : "PlayStyleNone",
                    "enterSpeed" : 4,
                    "font" : "黑体",
                    "fontbold" : 0,
                    "fontcolor" : 255,
                    "fonthalignment" : 3,
                    "fontitalic" : 0,
                    "fontsize" : "25",
                    "fontunderline" : 0,
                    "fontvalignment" : 3,
                    "textinfo" : "点刹无效"
                  }
                }],
                "picture" : []
              },
              "selectIndex" : 1,
              "timeChecked" : false,
              "loading" : false,
              "checkedList" : ["1", "2", "3", "4", "5", "6", "7"],
              "canMovePicture" : false,
              "dataTime" : "2017-9-28",
              "textForm" : true,
              "typeValue" : 1,
              "endTime" : "20:00",
              "pictureForm" : true
            };
          }
          vslJson.pid = 1;
          vslCJson.pid = 1;
          //限速牌控制
          try{
            var vslControl = {
              "optperson":req.query.username,
              "commandType": "addProgram",	//接口命令类型，添加节目的固定命令就为addProgram
              "deviceInfo": {					//设备参数开始
                "colorType": Number(vslColorType),
                "devIp": vslip,
                "devModel": "NovaTcpPlayer",
                "devNo": data.speedBrand,
                "devPort": Number(vslport),
                "regionNo": "",
                "screenNo": 1
              },
              "program":vslJson,
              "text":speed
            };
            var vslCControl = {
              "optperson":req.query.username,
              "commandType": "addProgram",	//接口命令类型，添加节目的固定命令就为addProgram
              "deviceInfo": {					//设备参数开始
                "colorType": Number(vslCColorType),
                "devIp": vslCip,
                "devModel": "NovaTcpPlayer",
                "devNo": data.cancelScreen,
                "devPort": Number(vslCport),
                "regionNo": "",
                "screenNo": 1
              },
              "program":vslCJson,
              "text":speed
            };
            var vslClear ={
              "optperson":req.query.username,
              "commandType": "clearProgram",	//接口命令类型，添加节目的固定命令就为addProgram
              "deviceInfo": {					//设备参数开始
                "colorType": Number(vslColorType),
                "devIp": vslip,
                "devModel": "NovaTcpPlayer",
                "devNo": data.speedBrand,
                "devPort": Number(vslport),
                "regionNo": "",
                "screenNo": 1
              }
            };
            var vslCClear = {
              "optperson":req.query.username,
              "commandType": "clearProgram",	//接口命令类型，添加节目的固定命令就为addProgram
              "deviceInfo": {					//设备参数开始
                "colorType": Number(vslCColorType),
                "devIp": vslCip,
                "devModel": "NovaTcpPlayer",
                "devNo": data.cancelScreen,
                "devPort": Number(vslCport),
                "regionNo": "",
                "screenNo": 1
              }
            };
            var lc = thunkify(ledClear);
            var vslClear_result = yield lc(vslClear);
            var vslCClear_result = yield lc(vslCClear);
            if(vslClear_result){
              vslClear_result = JSON.parse(vslClear_result);
              if(!vslClear_result.success){
                cb(null,{
                  ret:2,
                  msg:'可变限速牌清屏失败'
                });
              }
            }else {
              cb(null,{
                ret:2,
                msg:'可变限速牌清屏异常'
              });
            }

            //清理节目单
            var listClearParam = {
              r:d_road_region,
              device_nbr:vsl_nbr
            };
            var vslld = thunkify(vslListDelete);
            var vslld_result = yield vslld(listClearParam);
            if(!vslld_result){
              cb(null,{
                ret:0,
                msg:'删除节目单失败'
              });
            }

            if(vslCClear_result){
              vslCClear_result = JSON.parse(vslCClear_result);
              if(!vslCClear_result.success){
                cb(null,{
                  ret:2,
                  msg:'解除限速牌清屏失败'
                });
              }
            }else {
              cb(null,{
                ret:2,
                msg:'解除限速牌清屏异常'
              });
            }
            //清理节目单
            listClearParam = {
              r:d_road_region,
              device_nbr:vslC_nbr
            };
            var vslCld = thunkify(vslListDelete);
            var vslCld_result = yield vslCld(listClearParam);
            if(!vslCld_result){
              cb(null,{
                ret:0,
                msg:'删除节目单失败'
              });
            }
            var vslS = thunkify(vslSend);
            var vsl_result = yield vslS(vslControl);
            var vslC_result = yield vslS(vslCControl);
            if(vsl_result){
              vsl_result = JSON.parse(vsl_result);
              if(!vsl_result.success){
                cb(null,{
                  ret:0,
                  msg:'可变限速牌控制失败'
                });
              }
            }else {
              cb(null,{
                ret:0,
                msg:'可变限速牌控制异常'
              });
            }
            //添加节目单
            var listAddParam = {
              r:d_road_region,
              device_nbr:vsl_nbr,
              program:vslJson,
              pid:vslJson.pid
            };
            var la = thunkify(listAdd);
            var la_result = yield la(listAddParam);
            if(!la_result){
              cb(null,{
                ret:0,
                msg:'限速牌节目单更新失败'
              });
            }
            if(vslC_result){
              vslC_result = JSON.parse(vslC_result);
              if(!vslC_result.success){
                cb(null,{
                  ret:0,
                  msg:'解除限速牌控制失败'
                });
              }
            }else {
              cb(null,{
                ret:0,
                msg:'解除限速牌控制异常'
              });
            }
            listAddParam = {
              r:d_road_region,
              device_nbr:vslC_nbr,
              program:vslCJson,
              pid:vslJson.pid
            };
            var la = thunkify(listAdd);
            var la_result = yield la(listAddParam);
            if(!la_result){
              cb(null,{
                ret:0,
                msg:'解除限速牌节目单更新失败'
              });
            }
          }catch (e){
            cb(null,{
              ret:0,
              msg:e
            });
          }
          //查询起点、终点、抓拍相机点位
          try{
            var fsp = thunkify(findSitePosition);
            var fvp = thunkify(findVmrsPosition);
            var whereS = {
              site_nbr:data.entry_site_code
            };
            var whereE = {
              site_nbr:data.exit_site_code
            };
            var whereC = {
              site_nbr:data.site_code
            };
            var startSite = yield fsp(whereS);
            var endSite = yield fsp(whereE);
            var captureSite = yield fsp(whereC);
            var capturePosition;
            if(startSite) {
              startSite = JSON.parse(startSite);
              var cameraS = startSite.datas[0].cameras;
              var startPosition = startSite.datas[0].road_code+startSite.datas[0].mileage.split("km").join("")+startSite.datas[0].metre;
            }

            if(endSite){
              endSite = JSON.parse(endSite);
              var cameraE = endSite.datas[0].cameras;
              var endPosition = endSite.datas[0].road_code+endSite.datas[0].mileage.split("km").join("")+endSite.datas[0].metre;
            }
            if(captureSite){
              captureSite = JSON.parse(captureSite);
              var cameraC = captureSite.datas[0].cameras;
              capturePosition = captureSite.datas[0].road_code+captureSite.datas[0].mileage.split("km").join("")+captureSite.datas[0].metre;
            }
          }catch (e){
            cb(null, {
              ret: 0,
              msg: e
            });
          }
          // var direction;
          // switch (data.direction_type)
          // {
          //   case 0:
          //     direction="双向";
          //     break;
          //   case 1:
          //     direction="上行";
          //     break;
          //   case 2:
          //     direction="下行";
          //     break;
          // }
          //构造区间json串
          var regionData = {
            "optperson":req.query.username,
            "commandType": "updateRange",  	//addRange/updateRange/getRange/listRanges 4种参数可选
            "zkRoadRange": {
              "beginGPS": "",
              "beginLocation": startPosition,
              "code": data.region_code,
              "direction": data.direction_name,
              "distance": Number(data.distance),
              "endGPS": "",
              "endLocation": endPosition,
              "name": data.region_name,
              "speedLimitGPS": "",
              "speedLimitLocation":capturePosition,
              "speedLimits": [
                {
                  "lane": 0, //用于分车道限速的车道号,0 表示不分车道  0
                  "overSpeedMargin": Number(data.large_vehicle_allow),  //限高速宽限值  large_vehicle_allow
                  "roadOverSpeedLimit": Number(data.large_vehicle_limit), //路段限高速  large_vehicle_limit | 大车限速 new
                  "roadUnderSpeedLimit": Number(data.lower_limit), //路段限低速  lower_limit | 最低速度 new
                  "underSpeedMargin": 0,  //限低速宽限值  0
                  "vehicleType": "01"  //大车='01',小车='02',摩托车 = '05',其他车辆 = '00'借用GA24.4的编码
                },
                {
                  "lane": 0, //用于分车道限速的车道号,0 表示不分车道  0
                  "overSpeedMargin": Number(data.small_vehicle_allow),  //限高速宽限值  large_vehicle_allow
                  "roadOverSpeedLimit": Number(data.small_vehicle_limit), //路段限高速  large_vehicle_limit | 大车限速 new
                  "roadUnderSpeedLimit": Number(data.lower_limit), //路段限低速  lower_limit | 最低速度 new
                  "underSpeedMargin": 0,  //限低速宽限值  0
                  "vehicleType": "02"  //大车='01',小车='02',摩托车 = '05',其他车辆 = '00'借用GA24.4的编码
                }
              ],
              "updateTime": Date.now()
            }
          };
          //调用区间添加接口
          try {
            var ru = thunkify(regionUp);
            var result = yield ru(regionData);
            result = JSON.parse(result);
            if(!result.success){
              cb(null, {
                ret: 0,
                msg: '区间更新失败'
              });
              return false;
            }
          }catch (e){
            cb(null, {
              ret: 0,
              msg: e
            });
            return false;
          }
          data.set = data.small_vehicle_limit.toString();
          d_road_region.replaceById(id, data, {validate: true}, function (err, rs) {
            if (err) cb(null, {
              ret: 0,
              msg: err
            });
            var user = req.query.username;
            logs.optLog("设备备案：修改区间" + rs.region_code, req.headers['x-forwarded-for'] ||
              req.connection.remoteAddress ||
              req.socket.remoteAddress ||
              req.connection.socket.remoteAddress, user);



            cb(null, {
              ret: 1,
              msg: '修改成功'
            });
          })
        });

      }
    });
  };
  d_road_region.remoteMethod('up', {
    description:'修改区间',
    accepts: {arg:'req', type:'Object',required:true,http: { source: 'req' }},
    http: {path:'/updateRegion',verb:'post'},
    returns: {arg: 'res', type: 'Object',root:true,required:true}
  });

  //单个区间控制
  d_road_region.publish = function (req, cb) {
    var data = req.body;
    var region_code = data.region_code;
    var speed = data.speedType;
    var vslImg = 'limit'+ speed + '.png';
    var vslCImg = 'cancel'+ speed + '.png';
    var vslPath = imgUrl + vslImg;
    var vslCPath = imgUrl + vslCImg;
    var vslData = fs.readFileSync(vslPath);
    var vslCData = fs.readFileSync(vslCPath);
    vslData = 'data:image/png;base64,'+new Buffer(vslData).toString('base64');
    vslCData = 'data:image/png;base64,'+new Buffer(vslCData).toString('base64');
    var vslImgStates = fs.statSync(vslPath);
    var vslCImgStates = fs.statSync(vslCPath);
    var vslImgSize = vslImgStates.size;
    var vslCImgSize = vslCImgStates.size;
    co(function *() {
      //查询可变限速牌和解除限速牌设备编号
      try{
        var fr = thunkify(findRegion);
        var param = {
          region_code:region_code,
          r:d_road_region
        };
        var region = yield fr(param);
        if(region){
          var vsl_nbr = region[0].speedBrand;
          var vslC_nbr = region[0].cancelScreen;
        }
      }catch (e){
        cb(null,{
          ret:0,
          msg:e
        });
      }
      //获取限速牌的初始化数据
      if(vsl_nbr&&vslC_nbr){
        try {
          var fv = thunkify(findVsl);
          var vslParam = {
            device_nbr:vsl_nbr,
            r:d_road_region
          };
          var vslCParam = {
            device_nbr:vslC_nbr,
            r:d_road_region
          };
          var vsl = yield fv(vslParam);
          var vslC = yield fv(vslCParam);
          if(vsl&&vslC){
            var vslSet = vsl[0].speed_band;
            var vslCSet = vslC[0].speed_band;
            var vslText = vsl[0].text;
            var vslCText = vslC[0].text;
            var vslip = vsl[0].ip;
            var vslport = vsl[0].port;
            var vslCip = vslC[0].ip;
            var vslCport = vslC[0].port;
            var vslColorType = vsl[0].vms_type;
            var vslCColorType = vslC[0].vms_type;
          }
        }catch (e){
          cb(null,{
            ret:0,
            msg:e
          });
        }
      }
      if(vslSet.perform.picture&&vslCSet.perform.picture){
        vslSet.perform.picture[0].picturecontents.path = vslPath;
        vslSet.perform.picture[0].picturecontents.picdata = vslData;
        vslSet.perform.picture[0].picturecontents.picsize = vslImgSize;
        vslCSet.perform.picture[0].picturecontents.path = vslCPath;
        vslCSet.perform.picture[0].picturecontents.picdata = vslCData;
        vslCSet.perform.picture[0].picturecontents.picsize = vslCImgSize;
      }else {
        vslSet = {
          "typeValue" : 1,
          "timeChecked" : false,
          "display" : "inline-block",
          "infoType" : "1",
          "checkedList" : ["1", "2", "3", "4", "5", "6", "7"],
          "indeterminate" : false,
          "checkAll" : true,
          "dingshiDisplay" : "none",
          "shichangDisplay" : "block",
          "dataTime" : "2017-10-9",
          "timeValue" : 60,
          "startTime" : "08:00",
          "endTime" : "20:00",
          "perform" : {
            "text" : [{
              "contents" : {
                "fontvalignment" : 3,
                "enterSpeed" : 4,
                "fonthalignment" : 3,
                "fontbold" : 0,
                "fontcolor" : 255,
                "fontsize" : "25",
                "fontunderline" : 0,
                "textinfo" : "区间",
                "enterEffect" : "PlayStyleNone",
                "font" : "黑体",
                "fontitalic" : 0
              },
              "name" : "区间",
              "width" : 72,
              "startY" : 0,
              "startX" : 72,
              "height" : 40
            }, {
              "contents" : {
                "fontvalignment" : 3,
                "enterSpeed" : 4,
                "fonthalignment" : 3,
                "fontbold" : 0,
                "fontcolor" : 255,
                "fontsize" : "25",
                "fontunderline" : 0,
                "textinfo" : "测速",
                "enterEffect" : "PlayStyleNone",
                "font" : "黑体",
                "fontitalic" : 0
              },
              "name" : "测速",
              "width" : 72,
              "startY" : 40,
              "startX" : 72,
              "height" : 40
            }],
            "picture" : [{
              "height" : 80,
              "name" : vslImg,
              "picturecontents" : {
                "enterEffect" : "PlayStyleNone",
                "enterSpeed" : 4,
                "path" : vslPath,
                "picdata" : vslData,
                "picsize" : Number(vslImgSize)
              },
              "startX" : 0,
              "styleY" : 3,
              "width" : 72,
              "startY" : 0
            }]
          },
          "specInfo" : {
            "specId" : "111",
            "specName" : "全彩屏/条屏/384*128",
            "ledDeviceType" : "9",
            "colorType" : "3",
            "pixesHeight" : 128,
            "pixesWidth" : 384,
            "width" : 144,
            "height" : 80,
            "remark" : null,
            "ledShape" : "1",
            "ledFunctionType" : "1"
          },
          "selectIndex" : 0,
          "canMoveText" : false,
          "canMovePicture" : false,
          "offsetLeft" : 773,
          "offsetTop" : 276,
          "scaling" : 4.0972222222222223,
          "pictureIndex" : 8888,
          "textForm" : true,
          "pictureForm" : true,
          "loading" : false
        };
        vslCSet = {
          "typeValue" : 1,
          "timeChecked" : false,
          "display" : "inline-block",
          "infoType" : "1",
          "checkedList" : ["1", "2", "3", "4", "5", "6", "7"],
          "indeterminate" : false,
          "checkAll" : true,
          "dingshiDisplay" : "none",
          "shichangDisplay" : "block",
          "dataTime" : "2017-10-9",
          "timeValue" : 60,
          "startTime" : "08:00",
          "endTime" : "20:00",
          "perform" : {
            "text" : [{
              "height" : 80,
              "name" : "谨慎驾驶",
              "width" : 72,
              "startX" : 72,
              "startY" : 0,
              "contents" : {
                "enterEffect" : "PlayStyleNone",
                "enterSpeed" : 4,
                "font" : "黑体",
                "fontbold" : 0,
                "fontcolor" : 255,
                "fonthalignment" : 3,
                "fontitalic" : 0,
                "fontsize" : "22",
                "fontunderline" : 0,
                "fontvalignment" : 3,
                "textinfo" : "谨慎驾驶"
              }
            }],
            "picture" : [{
              "height" : 80,
              "name" : vslCImg,
              "picturecontents" : {
                "enterEffect" : "PlayStyleNone",
                "enterSpeed" : 4,
                "path" : vslCPath,
                "picdata" : vslCData,
                "picsize" : Number(vslCImgSize)
              },
              "startX" : 0,
              "styleY" : 3,
              "width" : 72,
              "startY" : 0
            }]
          },
          "specInfo" : {
            "specId" : "111",
            "specName" : "全彩屏/条屏/384*128",
            "ledDeviceType" : "9",
            "colorType" : "3",
            "pixesHeight" : 128,
            "pixesWidth" : 384,
            "width" : 144,
            "height" : 80,
            "remark" : null,
            "ledShape" : "1",
            "ledFunctionType" : "1"
          },
          "selectIndex" : 0,
          "canMoveText" : false,
          "canMovePicture" : false,
          "offsetLeft" : 773,
          "offsetTop" : 276,
          "scaling" : 4.0972222222222223,
          "pictureIndex" : 8888,
          "textForm" : true,
          "pictureForm" : true,
          "loading" : false
        };
      }
      //限速牌控制json
      var vslJson = vslSet;
      //解除限速牌控制json
      var vslCJson = vslCSet;
      if(speed=='120'){
        vslCJson = {
          "canMoveText" : false,
          "pictureIndex" : 8888,
          "indeterminate" : false,
          "timeValue" : 60,
          "dingshiDisplay" : "none",
          "infoType" : "1",
          "shichangDisplay" : "block",
          "specInfo" : {
            "specId" : "111",
            "specName" : "全彩屏/条屏/384*128",
            "ledDeviceType" : "9",
            "colorType" : "3",
            "pixesHeight" : 128,
            "pixesWidth" : 384,
            "width" : 144,
            "height" : 80,
            "remark" : null,
            "ledShape" : "1",
            "ledFunctionType" : "1"
          },
          "startTime" : "08:00",
          "offsetLeft" : 754,
          "offsetTop" : 394,
          "scaling" : 4.0972222222222223,
          "checkAll" : true,
          "display" : "inline-block",
          "perform" : {
            "text" : [{
              "height" : 40,
              "name" : "区间测速",
              "width" : 144,
              "startX" : 0,
              "startY" : 0,
              "contents" : {
                "enterEffect" : "PlayStyleNone",
                "enterSpeed" : 4,
                "font" : "黑体",
                "fontbold" : 0,
                "fontcolor" : 255,
                "fonthalignment" : 3,
                "fontitalic" : 0,
                "fontsize" : "25",
                "fontunderline" : 0,
                "fontvalignment" : 3,
                "textinfo" : "区间测速"
              }
            }, {
              "height" : 40,
              "name" : "点刹无效",
              "width" : 144,
              "startX" : 0,
              "startY" : 40,
              "contents" : {
                "enterEffect" : "PlayStyleNone",
                "enterSpeed" : 4,
                "font" : "黑体",
                "fontbold" : 0,
                "fontcolor" : 255,
                "fonthalignment" : 3,
                "fontitalic" : 0,
                "fontsize" : "25",
                "fontunderline" : 0,
                "fontvalignment" : 3,
                "textinfo" : "点刹无效"
              }
            }],
            "picture" : []
          },
          "selectIndex" : 1,
          "timeChecked" : false,
          "loading" : false,
          "checkedList" : ["1", "2", "3", "4", "5", "6", "7"],
          "canMovePicture" : false,
          "dataTime" : "2017-9-28",
          "textForm" : true,
          "typeValue" : 1,
          "endTime" : "20:00",
          "pictureForm" : true
        };
        vslJson = {
          "canMoveText" : false,
          "pictureIndex" : 8888,
          "indeterminate" : false,
          "timeValue" : 60,
          "dingshiDisplay" : "none",
          "infoType" : "1",
          "shichangDisplay" : "block",
          "specInfo" : {
            "specId" : "111",
            "specName" : "全彩屏/条屏/384*128",
            "ledDeviceType" : "9",
            "colorType" : "3",
            "pixesHeight" : 128,
            "pixesWidth" : 384,
            "width" : 144,
            "height" : 80,
            "remark" : null,
            "ledShape" : "1",
            "ledFunctionType" : "1"
          },
          "startTime" : "08:00",
          "offsetLeft" : 754,
          "offsetTop" : 394,
          "scaling" : 4.0972222222222223,
          "checkAll" : true,
          "display" : "inline-block",
          "perform" : {
            "text" : [{
              "height" : 40,
              "name" : "区间测速",
              "width" : 144,
              "startX" : 0,
              "startY" : 0,
              "contents" : {
                "enterEffect" : "PlayStyleNone",
                "enterSpeed" : 4,
                "font" : "黑体",
                "fontbold" : 0,
                "fontcolor" : 255,
                "fonthalignment" : 3,
                "fontitalic" : 0,
                "fontsize" : "25",
                "fontunderline" : 0,
                "fontvalignment" : 3,
                "textinfo" : "区间测速"
              }
            }, {
              "height" : 40,
              "name" : "点刹无效",
              "width" : 144,
              "startX" : 0,
              "startY" : 40,
              "contents" : {
                "enterEffect" : "PlayStyleNone",
                "enterSpeed" : 4,
                "font" : "黑体",
                "fontbold" : 0,
                "fontcolor" : 255,
                "fonthalignment" : 3,
                "fontitalic" : 0,
                "fontsize" : "25",
                "fontunderline" : 0,
                "fontvalignment" : 3,
                "textinfo" : "点刹无效"
              }
            }],
            "picture" : []
          },
          "selectIndex" : 1,
          "timeChecked" : false,
          "loading" : false,
          "checkedList" : ["1", "2", "3", "4", "5", "6", "7"],
          "canMovePicture" : false,
          "dataTime" : "2017-9-28",
          "textForm" : true,
          "typeValue" : 1,
          "endTime" : "20:00",
          "pictureForm" : true
        };
      }
      vslJson.pid = 1;
      vslCJson.pid = 1;
      //查询监控服务器区间
      try {
        var sR = thunkify(getRegion);
        var rData = {
          region_code:region_code,
          optperson:req.query.username
        };
        var rInfo =  yield sR(rData);
        rInfo = JSON.parse(rInfo);
        if(rInfo.success){
          var getR = JSON.parse(rInfo.message);
          getR = getR[0];
        }else {
          cb(null,{
            ret:0,
            msg:"区间控制失败"
          });
          return false;
        }
      }catch (e){
        cb(null,{
          ret:0,
          msg:e
        });
      }
      if(Number(speed)>90){
        for(var i=0;i<getR.speedLimits.length;i++){
          if(getR.speedLimits[i].vehicleType=='01'){
            getR.speedLimits[i].roadOverSpeedLimit = 90;
            getR.speedLimits[i].overSpeedMargin = 9;
          }else {
            getR.speedLimits[i].roadOverSpeedLimit = Number(speed);
            var a = Number(speed);
            getR.speedLimits[i].overSpeedMargin = parseInt(a*config.overSpeedMargin);
          }
        }
      }else {
        for(var i=0;i<getR.speedLimits.length;i++){
          getR.speedLimits[i].roadOverSpeedLimit = Number(speed);
          var a = Number(speed);
          getR.speedLimits[i].overSpeedMargin = parseInt(a*config.overSpeedMargin);
        }
      }


      //限速牌和可变限速牌控制
      try{
        var vslControl = {
          "optperson":req.query.username,
          "commandType": "addProgram",	//接口命令类型，添加节目的固定命令就为addProgram
          "deviceInfo": {					//设备参数开始
            "colorType": Number(vslColorType),
            "devIp": vslip,
            "devModel": "NovaTcpPlayer",
            "devNo": vsl_nbr,
            "devPort": Number(vslport),
            "regionNo": "",
            "screenNo": 1
          },
          "program":vslJson,
          "text":speed
        };
        var vslCControl = {
          "optperson":req.query.username,
          "commandType": "addProgram",	//接口命令类型，添加节目的固定命令就为addProgram
          "deviceInfo": {					//设备参数开始
            "colorType": Number(vslCColorType),
            "devIp": vslCip,
            "devModel": "NovaTcpPlayer",
            "devNo": vslC_nbr,
            "devPort": Number(vslCport),
            "regionNo": "",
            "screenNo": 1
          },
          "program":vslCJson,
          "text":speed
        };
        var vslClear ={
          "optperson":req.query.username,
          "commandType": "clearProgram",	//接口命令类型，添加节目的固定命令就为addProgram
          "deviceInfo": {					//设备参数开始
            "colorType": Number(vslColorType),
            "devIp": vslip,
            "devModel": "NovaTcpPlayer",
            "devNo": vsl_nbr,
            "devPort": Number(vslport),
            "regionNo": "",
            "screenNo": 1
          }
        };
        var vslCClear = {
          "optperson":req.query.username,
          "commandType": "clearProgram",	//接口命令类型，添加节目的固定命令就为addProgram
          "deviceInfo": {					//设备参数开始
            "colorType": Number(vslCColorType),
            "devIp": vslCip,
            "devModel": "NovaTcpPlayer",
            "devNo": vslC_nbr,
            "devPort": Number(vslCport),
            "regionNo": "",
            "screenNo": 1
          }
        };
        var lc = thunkify(ledClear);
        var vslClear_result = yield lc(vslClear);
        var vslCClear_result = yield lc(vslCClear);
        if(vslClear_result){
          vslClear_result = JSON.parse(vslClear_result);
          if(!vslClear_result.success){
            cb(null,{
              ret:2,
              msg:'可变限速牌清屏失败'
            });
          }
        }else {
          cb(null,{
            ret:2,
            msg:'可变限速牌清屏异常'
          });
        }

        //清理节目单
        var listClearParam = {
          r:d_road_region,
          device_nbr:vsl_nbr
        };
        var vslld = thunkify(vslListDelete);
        var vslld_result = yield vslld(listClearParam);
        if(!vslld_result){
          cb(null,{
            ret:0,
            msg:'删除节目单失败'
          });
        }

        if(vslCClear_result){
          vslCClear_result = JSON.parse(vslCClear_result);
          if(!vslCClear_result.success){
            cb(null,{
              ret:2,
              msg:'解除限速牌清屏失败'
            });
          }
        }else {
          cb(null,{
            ret:2,
            msg:'解除限速牌清屏异常'
          });
        }
        //清理节目单
        listClearParam = {
          r:d_road_region,
          device_nbr:vslC_nbr
        };
        var vslCld = thunkify(vslListDelete);
        var vslCld_result = yield vslCld(listClearParam);
        if(!vslCld_result){
          cb(null,{
            ret:0,
            msg:'删除节目单失败'
          });
        }
        var vslS = thunkify(vslSend);
        var vsl_result = yield vslS(vslControl);
        var vslC_result = yield vslS(vslCControl);
        if(vsl_result){
          vsl_result = JSON.parse(vsl_result);
          if(!vsl_result.success){
            cb(null,{
              ret:0,
              msg:'可变限速牌控制失败'
            });
          }
        }else {
          cb(null,{
            ret:0,
            msg:'可变限速牌控制异常'
          });
        }
        //添加节目单
        var listAddParam = {
          r:d_road_region,
          device_nbr:vsl_nbr,
          program:vslJson,
          pid:vslJson.pid
        };
        var la = thunkify(listAdd);
        var la_result = yield la(listAddParam);
        if(!la_result){
          cb(null,{
            ret:0,
            msg:'限速牌节目单更新失败'
          });
        }
        if(vslC_result){
          vslC_result = JSON.parse(vslC_result);
          if(!vslC_result.success){
            cb(null,{
              ret:0,
              msg:'解除限速牌控制失败'
            });
          }
        }else {
          cb(null,{
            ret:0,
            msg:'解除限速牌控制异常'
          });
        }
        listAddParam = {
          r:d_road_region,
          device_nbr:vslC_nbr,
          program:vslCJson,
          pid:vslJson.pid
        };
        var la = thunkify(listAdd);
        var la_result = yield la(listAddParam);
        if(!la_result){
          cb(null,{
            ret:0,
            msg:'解除限速牌节目单更新失败'
          });
        }
      }catch (e){
        cb(null,{
          ret:0,
          msg:e
        });
      }
      //更新区间
      try{
        var regionData = {
          "optperson":req.query.username,
          "commandType": "updateRange",
          "zkRoadRange": getR,
          "set":speed,
          "text":"限速"+speed+"km/h"
        };
        var ru = thunkify(regionUp);
        var result = yield ru(regionData);
        result = JSON.parse(result);
        if(!result.success){
          cb(null, {
            ret: 0,
            msg: '区间更新失败'
          });
          return false;
        }
      }catch (e){
        cb(null,{
          ret:0,
          msg:e
        });
        return false;
      }
      var set =speed;
      d_road_region.updateAll({region_code:region_code},{set:set},function (err, count) {
        if(err){
          cb(null,{
            ret:0,
            msg:err
          });
          return false;
        }
        cb(null,{
          ret:1,
          msg:'区间控制成功'
        });
      });

    });
  };
  d_road_region.remoteMethod('publish', {
    description:'区间控制',
    accepts: {arg:'req', type:'Object',required:true,http: { source: 'req' }},
    http: {path:'/publish',verb:'post'},
    returns: {arg: 'res', type: 'Object',root:true,required:true}
  });

  //区间违法代码添加
  d_road_region.vio = function (req, cb) {
    co(function *() {
      //添加违法代码
      try {
        var va = thunkify(regionVioAdd);
        for(var i = 0;i<vioCode.length;i++){
          var va_result = yield va(vioCode[i]);
          var result = JSON.parse(va_result);
          if(!result.success){
            cb(null, {
              ret: 0,
              msg: '区间更新失败'
            });
            return false;
          }
        }
        cb(null,{
          ret:1,
          msg:'区间违法代码导入成功'
        });
      }catch (e){
        cb(null,{
          ret:0,
          msg:e
        });
        return false;
      }

    });

  };
  d_road_region.remoteMethod('vio', {
    description:'区间违法代码导入',
    accepts: {arg:'req', type:'Object',required:true,http: { source: 'req' }},
    http: {path:'/vioCodeImport',verb:'get'},
    returns: {arg: 'res', type: 'Object',root:true,required:true}
  });
};
function findIndex(param,callback) {
  param.r.find({order:'_id DESC',where:{org_code:param.org_code,code_auto:1}},function (err, rs) {
    if(err) callback(err,null);
    callback(null,rs);
  })
}
//查询卡口点位信息
function findSitePosition(param,callback) {
  var opt = {
    method: "POST",
    host: config.localhost,
    port: config.port,
    path:'/api/d_monitor_sites/list',
    headers: {
      "Content-Type": 'application/json'
    }
  };
  var requ = http.request(opt, function (serverFeedback) {
    if (serverFeedback.statusCode == 200) {
      var body = [];
      serverFeedback.on('data', function (data) {
        body.push(data);
      }).on('end', function () {
        var data= Buffer.concat(body).toString();
        if(JSON.parse(data).ret==1)
          callback(null,data);
        else callback(null,false);
      });
    }
    else {
      callback('error',null)
    }
  });

  requ.write(JSON.stringify(param) + "\n");
  requ.end('');
  requ.on('error',function(e){
    callback('Error got: '+e.message,null);
  });
}
//查询电警点位信息
function findVmrsPosition(param, callback) {
  param.r.app.models.d_vmrs.find({where:{device_nbr:param.device_nbr}},function (err, rs) {
    if(err) callback(err,null);
    callback(null,rs);
  });
}
//查询区间信息
function findRegion(param,callback) {
  param.r.find({order:'_id DESC',where:{address:param.address,region_code:param.region_code}},function (err, rs) {
    if(err) callback(err,null);
    callback(null,rs);
  });
}
//查询限速牌
function findVsl(param,callback) {
  param.r.app.models.d_vsl.find({order:'_id DESC',where:{device_nbr:param.device_nbr}},function (err, rs) {
    if(err) callback(err,null);
    callback(null,rs);
  });
}

//区间添加
function regionAdd(param,callback) {
  var userInfo = {
    "eqid":param.zkRoadRange.code,
    "optperson":param.optperson
  };
  delete param['optperson'];
  userInfo = JSON.stringify(userInfo);
  var opt = {
    method: "POST",
    host: config.intervalSpeedServerHost,
    port: config.intervalSpeedServerPort,
    path:'/intervalSpeed/addRange?userInfo='+userInfo,
    headers: {
      "Content-Type": 'application/json'
    }
  };
  var requ = http.request(opt, function (serverFeedback) {
    if (serverFeedback.statusCode == 200) {
      var body = [];
      serverFeedback.on('data', function (data) {
        body.push(data);
      }).on('end', function () {
        var data= Buffer.concat(body).toString();

        callback (null,data);

      });
    }
    else {
      callback('err',null);
    }
  });
  requ.write(JSON.stringify(param) + "\n");
  requ.end('');
  requ.on('error',function(e){
    callback(e,null)
  });
}
//区间更新
function regionUp(param,callback) {
  var userInfo = {
    "eqid":param.zkRoadRange.code,
    "optperson":param.optperson
  };
  delete param['optperson'];
  userInfo = JSON.stringify(userInfo);
  var opt = {
    method: "POST",
    host: config.intervalSpeedServerHost,
    port: config.intervalSpeedServerPort,
    path:'/intervalSpeed/updateRange?userInfo='+userInfo,
    headers: {
      "Content-Type": 'application/json'
    }
  };
  var requ = http.request(opt, function (serverFeedback) {
    if (serverFeedback.statusCode == 200) {
      var body = [];
      serverFeedback.on('data', function (data) {
        body.push(data);
      }).on('end', function () {
        var data= Buffer.concat(body).toString();

        callback (null,data);

      });
    }
    else {
      callback('err',null);
    }
  });
  requ.write(JSON.stringify(param) + "\n");
  requ.end('');
  requ.on('error',function(e){
    callback(e,null)
  });
}

//删除区间
function removeRange(param,callback) {
  var userInfo = {
    "eqid":param.zkRoadRange.code,
    "optperson":param.optperson
  };
  delete param['optperson'];
  userInfo = JSON.stringify(userInfo);
  var opt = {
    method: "POST",
    host: config.intervalSpeedServerHost,
    port: config.intervalSpeedServerPort,
    path:'/intervalSpeed/removeRange?userInfo='+userInfo,
    headers: {
      "Content-Type": 'application/json'
    }
  };
  var requ = http.request(opt, function (serverFeedback) {
    if (serverFeedback.statusCode == 200) {
      var body = [];
      serverFeedback.on('data', function (data) {
        body.push(data);
      }).on('end', function () {
        var data= Buffer.concat(body).toString();

        callback (null,data);

      });
    }
    else {
      callback('err',null);
    }
  });
  requ.write(JSON.stringify(param) + "\n");
  requ.end('');
  requ.on('error',function(e){
    callback(e,null)
  });
}
//获取区间
function getRegion(param,callback) {
  var userInfo = {
    "eqid":param.region_code,
    "optperson":param.optperson
  };
  delete param['optperson'];
  userInfo = JSON.stringify(userInfo);
  var datac = {
    "commandType": "getRange",
    "zkRoadRange": {
      "code": param.region_code
    }
  };
  var opt = {
    method: "POST",
    host: config.intervalSpeedServerHost,
    port: config.intervalSpeedServerPort,
    path:'/intervalSpeed/getRange?userInfo='+userInfo,
    headers: {
      "Content-Type": 'application/json'
    }
  };
  var requ = http.request(opt, function (serverFeedback) {
    if (serverFeedback.statusCode == 200) {
      var body = [];
      serverFeedback.on('data', function (data) {
        body.push(data);
      }).on('end', function () {
        var data= Buffer.concat(body).toString();

        callback (null,data);

      });
    }
    else {
      callback('err',null);
    }
  });
  requ.write(JSON.stringify(datac) + "\n");
  requ.end('');
  requ.on('error',function(e){
    callback(e,null)
  });
}

//区间违法代码添加
function regionVioAdd(param,callback) {
  var opt = {
    method: "POST",
    host: config.intervalSpeedServerHost,
    port: config.intervalSpeedServerPort,
    path:'/violationCode/addViolation',
    headers: {
      "Content-Type": 'application/json'
    }
  };
  var requ = http.request(opt, function (serverFeedback) {
    if (serverFeedback.statusCode == 200) {
      var body = [];
      serverFeedback.on('data', function (data) {
        body.push(data);
      }).on('end', function () {
        var data= Buffer.concat(body).toString();

        callback (null,data);

      });
    }
    else {
      callback('err',null);
    }
  });
  requ.write(JSON.stringify(param) + "\n");
  requ.end('');
  requ.on('error',function(e){
    callback(e,null)
  });
}
//违法代码删除
function regionVioDel(param,callback) {
  var opt = {
    method: "POST",
    host: config.intervalSpeedServerHost,
    port: config.intervalSpeedServerPort,
    path:'/violationCode/removeViolation',
    headers: {
      "Content-Type": 'application/json'
    }
  };
  var requ = http.request(opt, function (serverFeedback) {
    if (serverFeedback.statusCode == 200) {
      var body = [];
      serverFeedback.on('data', function (data) {
        body.push(data);
      }).on('end', function () {
        var data= Buffer.concat(body).toString();

        callback (null,data);

      });
    }
    else {
      callback('err',null);
    }
  });
  requ.write(JSON.stringify(param) + "\n");
  requ.end('');
  requ.on('error',function(e){
    callback(e,null)
  });
}
//诱导屏发布
function vslSend(param,callback) {
  var userInfo = {
    "eqid":param.deviceInfo.devNo,
    "optperson":param.optperson
  };
  delete param['optperson'];
  userInfo = JSON.stringify(userInfo);
  var opt = {
    method: "POST",
    host: config.screenServerHost,
    port: config.screenServerPort,
    path:'/program/addProgram?userInfo='+userInfo,
    headers: {
      "Content-Type": 'application/json'
    }
  };
  var requ = http.request(opt, function (serverFeedback) {
    if (serverFeedback.statusCode == 200) {
      var body = [];
      serverFeedback.on('data', function (data) {
        body.push(data);
      }).on('end', function () {
        var data= Buffer.concat(body).toString();

        callback (null,data);

      });
    }
    else {
      callback('err',null);
    }
  });
  requ.write(JSON.stringify(param) + "\n");
  requ.end('');
  requ.on('error',function(e){
    callback(e,null)
  });
}

//诱导屏清屏
function ledClear(param,callback) {
  var userInfo = {
    "eqid":param.deviceInfo.devNo,
    "optperson":param.optperson
  };
  delete param['optperson'];
  userInfo = JSON.stringify(userInfo);
  var opt = {
    method: "POST",
    host: config.screenServerHost,
    port: config.screenServerPort,
    path:'/program/clearProgram?userInfo='+userInfo,
    headers: {
      "Content-Type": 'application/json'
    }
  };
  var requ = http.request(opt, function (serverFeedback) {
    if (serverFeedback.statusCode == 200) {
      var body = [];
      serverFeedback.on('data', function (data) {
        body.push(data);
      }).on('end', function () {
        var data= Buffer.concat(body).toString();

        callback (null,data);

      });
    }
    else {
      callback('err',null);
    }
  });
  requ.write(JSON.stringify(param) + "\n");
  requ.end('');
  requ.on('error',function(e){
    callback(e,null)
  });
}

function vslListDelete(param,callback) {
  param.r.app.models.led_program_list.destroyAll({device_nbr:param.device_nbr},function (err, count) {
    if(err) callback(err,null);
    callback(null,{
      ret:1,
      msg:'删除成功'
    });
  })
}
function listAdd(param,callback) {
  var r = param.r;
  delete param["r"];
  r.app.models.led_program_list.create(param,function (err, rs) {
    if(err) callback(err,null);
    callback(null,rs)
  });
}
