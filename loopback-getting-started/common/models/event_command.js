/**
 * Created by dell on 2017/7/10.
 */
var config = require('../../config');
var mongodb = require('mongodb');
var ObjectID = mongodb.ObjectID;
var loopback = require('loopback');
var app = loopback();
var logs = require('../../logServer');
var co = require('co');
var thunkify = require('thunkify');
var http = require('http');
var imgUrl = config.imgUrl;
var fs = require('fs');
var path = require('path');
var errColMsg = {
  ret: 0,
  msg: '操作失败，数据库集合操作异常'
};
var errParamMsg = {
  ret: 0,
  msg: '操作失败，参数合法性验证'
};

module.exports = function(event_command) {
  // event_command.validatesUniquenessOf('eventId');
  //分页查询
  event_command.list = function (data, cb) {
    var filter = {
      order:'_id DESC',
      include:'processes',
      where:{
        delFlag:1
      }
    };
    if(data.sysCode!="undefined"&&data.sysCode) filter.where.sysCode = data.sysCode;
    if(data.eventId!="undefined"&&data.eventId) filter.where.eventId = {regexp:data.eventId};
    if(data.eventName!="undefined"&&data.eventName) filter.where.eventName = {regexp:data.eventName};
    if(data.level!="undefined"&&data.level) filter.where.level = Number(data.level);
    if(data.type!="undefined"&&data.type) filter.where.type = Number(data.type);
    if(data.result!="undefined"&&data.result) filter.where.result = Number(data.result);
    if(data.upTimeStart!="undefined"&&data.upTimeEnd!="undefined"&&data.upTimeStart&&data.upTimeEnd) filter.where.startTime = {between:[Number(data.upTimeStart),Number(data.upTimeEnd)]};
    if(data.pageSize!="undefined"&&data.pageIndex!="undefined"&&data.pageSize&&data.pageIndex) {
      filter.limit = Number(data.pageSize);
      filter.skip = (Number(data.pageIndex) - 1) * Number(data.pageSize);
    }
    event_command.find(filter,function (err, rs) {
      if(err) cb(null,errColMsg);
      event_command.count(filter.where,function (err, count) {
        if (err) cb(null,errColMsg);
        co(function *() {
          try {
            for (var i = 0; i < rs.length; i++) {
              for (var j = 0; j < rs[i].contents.length; j++) {
                for (var k = 0; k < rs[i].contents[j].devices.length; k++) {
                  var fsys = thunkify(findSysDevice);
                  var param = {
                    e:event_command,
                    device_nbr:rs[i].contents[j].devices[k].deviceNbr
                  };
                  var fsys_callback = yield fsys(param);
                  if(fsys_callback.length!=0&&fsys_callback){
                    rs[i].contents[j].devices[k].deviceName = fsys_callback[0].device_name;
                  }else {
                    rs[i].contents[j].devices[k].deviceName = '';
                  }

                }
              }
            }
          }catch (e){
            cb(null,{
              ret:0,
              msg:e
            });
            return false;
          }
          cb(null, {
            ret: 1,
            datas: rs,
            msg: '查询成功',
            count: count
          });
        });

      });
    });
  };
  event_command.remoteMethod('list', {
    description:'查询事件',
    accepts: {arg:'data', type:'Object',required:true,http: { source: 'body' }},
    http: {path:'/list',verb:'post'},
    returns: {arg: 'res', type: 'Object',root:true,required:true}
  });

  //新增
  event_command.add = function (req, cb) {
    var data = req.body;
    delete data['id'];
    data.state = 1;
    data.delFlag = 1;
    data.result = 0;
    data.startTime = Date.now();
    data.endTime = null;
    data.eventId = data.sysCode+data.startTime;
    data.level = Number(data.level);
    data.contents = JSON.parse(data.contents);
    co(function *() {
      //设备控制
      var param = {
        e:event_command
      };
      var frogResult,shuntLightResult,shuntScreenResult,broadcastResult,regionResult;
      for(var i = 0;i<data.contents.length;i++){
        for(var j = 0;j<data.contents[i].devices.length;j++){
          if(data.contents[i].devices[j].devType =='3'){
            //查询雾灯ip,port
            try {
              var ff = thunkify(findFrogSet);
              param.frog = data.contents[i].devices[j].deviceNbr;
              var ff_callback = yield ff(param);
              if(ff_callback&&ff_callback.length!=0) {
                var frogHost = ff_callback[0].ip;
                var frogPort = ff_callback[0].port;
              }
            }catch (e){
              cb(null,{
                ret:0,
                msg:e
              });
            }
            //雾灯控制
            try {
              var fc = thunkify(frogControl);
              var fcJson = {
                host:frogHost,
                port:frogPort,
                set:data.contents[i].devices[j].set,
                text:data.contents[i].devices[j].text,
                optperson:req.query.username,
                eqid:data.contents[i].devices[j].deviceNbr
              };
              var fc_callback = yield fc(fcJson);
              if(fc_callback){
                frogResult = JSON.parse(fc_callback).success;
              }
            }catch (e){
              cb(null,{
                ret:0,
                msg:e
              });
            }
            if(!frogResult){
              cb(null,{
                ret:2,
                msg:'防撞雾灯控制失败'
              });
              return false;
            }
          }
          if(data.contents[i].devices[j].devType =='4'){
            //查询分流信号灯ip,port
            try {
              var fsl = thunkify(findShuntLightSet);
              param.shuntLight = data.contents[i].devices[j].deviceNbr;
              var fsl_callback = yield fsl(param);
              if(fsl_callback&&fsl_callback.length!=0) {
                var shuntLightHost = fsl_callback[0].ip;
                var shuntLightPort = fsl_callback[0].port;
              }
            }catch (e){
              cb(null,{
                ret:0,
                msg:e
              });
            }
            //信号灯控制
            try {
              var slc = thunkify(shuntLightControl);
              var slcJson = {
                ip:shuntLightHost,
                LaneLightStatusSeq:data.contents[i].devices[j].set,
                // text:data.contents[i].devices[j].text,
                optperson:req.query.username,
                eqid:data.contents[i].devices[j].deviceNbr,
                orderType : 2
              };
              var slc_callback = yield slc(slcJson);
              if(slc_callback){
                shuntLightResult = JSON.parse(slc_callback).success;
              }
            }catch (e){
              cb(null,{
                ret:0,
                msg:e
              });
            }
            if(!shuntLightResult){
              cb(null,{
                ret:2,
                msg:'分流信号灯控制失败'
              });
              return false;
            }
          }
          if(data.contents[i].devices[j].devType =='8'){
            //查询分流诱导屏ip和port
            try {
              var fss = thunkify(findShuntScreenSet);
              param.shuntScreen = data.contents[i].devices[j].deviceNbr;
              var fss_callback = yield fss(param);
              if(fss_callback&&fss_callback.length!=0) {
                var shuntScreenHost = fss_callback[0].ip;
                var shuntScreenPort = fss_callback[0].port;
                var colorType = fss_callback[0].vms_type;
              }
            }catch (e){
              cb(null,{
                ret:0,
                msg:e
              });
            }
            //诱导屏控制
            try {
              var ssc = thunkify(shuntScreenControl);
              var sscJson = {
                "optperson":req.query.username,
                "commandType": "addProgram",	//接口命令类型，添加节目的固定命令就为addProgram
                "deviceInfo": {					//设备参数开始
                  "colorType": Number(colorType),
                  "devIp": shuntScreenHost,
                  "devModel": "NovaTcpPlayer",
                  "devNo": data.contents[i].devices[j].deviceNbr,
                  "devPort": Number(shuntScreenPort),
                  "regionNo": "",
                  "screenNo": 1
                },
                "program":data.contents[i].devices[j].set,
                "text":data.contents[i].devices[j].text
              };
              var ssc_callback = yield ssc(sscJson);
              if(ssc_callback){
                shuntScreenResult = JSON.parse(ssc_callback).success;
              }
            }catch (e){
              cb(null,{
                ret:0,
                msg:e
              });
            }
            if(!shuntScreenResult){
              cb(null,{
                ret:2,
                msg:'分流诱导屏发屏失败'
              });
              return false;
            }
          }
          if(data.contents[i].devices[j].devType =='9'){
            //查询高音喇叭ip和port
            try {
              var fb = thunkify(findBroadcastSet);
              param.broadcast = data.contents[i].devices[j].deviceNbr;
              var fb_callback = yield fb(param);
              if(fb_callback&&fb_callback.length!=0) {
                var broadcastHost = fb_callback[0].ip;
                var broadcastPort = fb_callback[0].port;
              }
            }catch (e){
              cb(null,{
                ret:0,
                msg:e
              });
            }
            //高音喇叭控制
            try {
              var bc = thunkify(broadcastControl);
              var bcJson = {
                "optperson":req.query.username,
                "host": broadcastHost,
                "port":broadcastPort,
                "level":data.contents[i].devices[j].set,
                "eqid":data.contents[i].devices[j].deviceNbr
              };
              var bc_callback = yield bc(bcJson);
              if(bc_callback){
                broadcastResult = JSON.parse(bc_callback).success;
              }
            }catch (e){
              cb(null,{
                ret:0,
                msg:e
              });
            }
            if(!broadcastResult){
              cb(null,{
                ret:2,
                msg:'语音广播控制失败'
              });
              return false;
            }
          }
          if(data.contents[i].devices[j].devType =='14'){
            //区间测速控制
            try {
              var regionJson = {
                region_code:data.contents[i].devices[j].deviceNbr,
                speedType:data.contents[i].devices[j].set.speed,
                optpersion:req.query.username
              };
              var rc = thunkify(regionControl);
              var rc_callback = yield rc(regionJson);
              if(rc_callback){
                regionResult = rc_callback;
              }
            }catch (e){
              cb(null,{
                ret:0,
                msg:e
              });
            }
            if(!regionResult){
              cb(null,{
                ret:2,
                msg:'区间控制失败'
              });
              return false;
            }

          }
        }
      }

        var where = {sysCode:data.sysCode,result:0};
        event_command.find({where:where},function (err, event) {
          if (err) cb(null, {
            ret: 0,
            msg: err
          });
          if (event.length != 0) {
            data.startTime = event[0].startTime;
            data.eventId = data.sysCode + event[0].startTime;
            var id = event[0].id;
            delete data['id'];
            event_command.replaceById(id, data, {validate: true}, function (err, rs) {
              if (err) cb(null, {
                ret: 0,
                msg: err
              });
              data.optTime = Date.now();
              data.event = ObjectID(event[0].id);
              delete data['id'];
              event_command.app.models.event_process.create(data, function (err, ep) {
                if (err) cb(null, {
                  ret: 0,
                  msg: err
                });
                var user = req.query.username;
                logs.optLog("执行" + rs.level + "级预案:" + rs.eventId, req.headers['x-forwarded-for'] ||
                  req.connection.remoteAddress ||
                  req.socket.remoteAddress ||
                  req.connection.socket.remoteAddress, user);
                cb(null, {
                  ret: 1,
                  id: event[0].id,
                  msg: '新增成功'
                });
              });
            });
          } else {
            event_command.create(data, function (err, eC) {
              if (err) cb(null, {
                ret: 0,
                msg: err
              });
              data.optTime = Date.now();
              data.event = ObjectID(eC.id);
              data.eventId = eC.sysCode + eC.startTime;
              delete data['id'];
              event_command.app.models.event_process.create(data, function (err, ep) {
                if (err) cb(null, {
                  ret: 0,
                  msg: err
                });
                var user = req.query.username;
                logs.optLog("执行" + eC.level + "级预案:" + eC.eventId, req.headers['x-forwarded-for'] ||
                  req.connection.remoteAddress ||
                  req.socket.remoteAddress ||
                  req.connection.socket.remoteAddress, user);
                cb(null, {
                  ret: 1,
                  id: eC.id,
                  msg: '新增成功'
                });
              });
            });
          }
        });
    });

  };
  event_command.remoteMethod('add', {
    description:'添加事件',
    accepts: {arg:'req', type:'Object',required:true,http: { source: 'req' }},
    http: {path:'/add',verb:'post'},
    returns: {arg: 'res', type: 'Object',root:true,required:true}
  });

  //删除
  event_command.del = function (req, cb) {
    var data = req.body;
    var arr=[];
    var index = [];
    data.id.split(",").forEach(function(item){
      arr.push(ObjectID(item));
    });
    var where = {_id:{inq: arr}};
    data.index.split(",").forEach(function(item){
      index.push(ObjectID(item));
    });
    event_command.updateAll(where,{delFlag:0},function (err, info) {
      if(err) cb(null,err);
      //事件过程
      event_command.app.models.event_process.updateAll({event:{inq:arr}},{delFlag:0},function (err) {
        if(err) cb(null,err);
        //删除预警记录
        event_command.app.models.warning_monitoring.updateAll({index:{inq:index}},{delFlag:0},function (err) {
          if(err) cb(null,err);
          var user = req.query.username;
          logs.optLog("删除"+info.count+"条预警事件",req.headers['x-forwarded-for'] ||
            req.connection.remoteAddress ||
            req.socket.remoteAddress ||
            req.connection.socket.remoteAddress,user);
          cb(null,{
            ret:1,
            msg:'删除成功'
          });
        });

      });

    })
  };
  event_command.remoteMethod('del', {
    description:'删除事件',
    accepts: {arg:'req', type:'Object',required:true,http: { source: 'req' }},
    http: {path:'/delete',verb:'post'},
    returns: {arg: 'res', type: 'Object',root:true,required:true}
  });

  //修改
  event_command.up = function (req, cb) {
    var data = req.body;
    if(data.id=="undefined"){
      cb(null,errParamMsg);
    }
    var index = data.index;
    var id = data.id;
    var objId = ObjectID(id);
    delete data['id'];
    var logMsg;
    if (Number(data.result) ==1) {
      logMsg = '终止预案';
      //设备恢复默认设置

      co(function *() {
        var param = {
          s:event_command,
          level:4,
          sysCode:data.sysCode
        };
        //预案查询
        try {
          var fp = thunkify(findPlan);
          var plan = yield fp(param);
          if (!plan) {
            cb(null, {
              ret: 0,
              msg: '查询预案错误'
            });
          } else if (plan.length == 0) {
            cb(null, {
              ret: 0,
              msg: '无可用的预案'
            })
          }
        } catch (e) {
          cb(null, {
            ret: 0,
            msg: e
          })
        }
        var contents = plan[0].contents;
        //设备控制
        var param = {
          e:event_command
        };

        var frogResult,shuntLightResult,shuntScreenResult,broadcastResult,regionResult;
        for(var i = 0;i<contents.length;i++){
          for(var j = 0;j<contents[i].devices.length;j++){
            if(contents[i].devices[j].devType =='3'){
              //查询雾灯ip,port
              try {
                var ff = thunkify(findFrogSet);
                param.frog = contents[i].devices[j].deviceNbr;
                var ff_callback = yield ff(param);
                if(ff_callback&&ff_callback.length!=0) {
                  var frogHost = ff_callback[0].ip;
                  var frogPort = ff_callback[0].port;
                }
              }catch (e){
                cb(null,{
                  ret:0,
                  msg:e
                });
              }
              //雾灯控制
              try {
                var fc = thunkify(frogControl);
                var fcJson = {
                  host:frogHost,
                  port:frogPort,
                  set:contents[i].devices[j].set,
                  text:contents[i].devices[j].text,
                  optperson:req.query.username,
                  eqid:contents[i].devices[j].deviceNbr
                };
                var fc_callback = yield fc(fcJson);
                if(fc_callback){
                  frogResult = JSON.parse(fc_callback).success;
                }
              }catch (e){
                cb(null,{
                  ret:0,
                  msg:e
                });
              }
              if(!frogResult){
                cb(null,{
                  ret:2,
                  msg:'防撞雾灯控制失败'
                });
                return false;
              }
            }
            if(contents[i].devices[j].devType =='4'){
              //查询分流信号灯ip,port
              try {
                var fsl = thunkify(findShuntLightSet);
                param.shuntLight = contents[i].devices[j].deviceNbr;
                var fsl_callback = yield fsl(param);
                if(fsl_callback&&fsl_callback.length!=0) {
                  var shuntLightHost = fsl_callback[0].ip;
                  var shuntLightPort = fsl_callback[0].port;
                }
              }catch (e){
                cb(null,{
                  ret:0,
                  msg:e
                });
              }
              //信号灯控制
              try {
                var slc = thunkify(shuntLightControl);
                var slcJson = {
                  ip:shuntLightHost,
                  LaneLightStatusSeq:contents[i].devices[j].set,
                  // text:data.contents[i].devices[j].text,
                  optperson:req.query.username,
                  eqid:contents[i].devices[j].deviceNbr,
                  orderType : 2
                };
                var slc_callback = yield slc(slcJson);
                if(slc_callback){
                  shuntLightResult = JSON.parse(slc_callback).success;
                }
              }catch (e){
                cb(null,{
                  ret:0,
                  msg:e
                });
              }
              if(!shuntLightResult){
                cb(null,{
                  ret:2,
                  msg:'分流信号灯控制失败'
                });
                return false;
              }
            }
            if(contents[i].devices[j].devType =='8'){
              //查询分流诱导屏ip和port
              try {
                var fss = thunkify(findShuntScreenSet);
                param.shuntScreen = contents[i].devices[j].deviceNbr;
                var fss_callback = yield fss(param);
                if(fss_callback&&fss_callback.length!=0) {
                  var shuntScreenHost = fss_callback[0].ip;
                  var shuntScreenPort = fss_callback[0].port;
                  var colorType = fss_callback[0].vms_type;
                }
              }catch (e){
                cb(null,{
                  ret:0,
                  msg:e
                });
              }
              //诱导屏控制
              try {
                var ssc = thunkify(shuntScreenControl);
                var sscJson = {
                  "optperson":req.query.username,
                  "commandType": "addProgram",	//接口命令类型，添加节目的固定命令就为addProgram
                  "deviceInfo": {					//设备参数开始
                    "colorType": Number(colorType),
                    "devIp": shuntScreenHost,
                    "devModel": "NovaTcpPlayer",
                    "devNo": contents[i].devices[j].deviceNbr,
                    "devPort": Number(shuntScreenPort),
                    "regionNo": "",
                    "screenNo": 1
                  },
                  "program":contents[i].devices[j].set,
                  "text":contents[i].devices[j].text
                };
                var ssc_callback = yield ssc(sscJson);
                if(ssc_callback){
                  shuntScreenResult = JSON.parse(ssc_callback).success;
                }
              }catch (e){
                cb(null,{
                  ret:0,
                  msg:e
                });
              }
              if(!shuntScreenResult){
                cb(null,{
                  ret:2,
                  msg:'分流诱导屏发屏失败'
                });
                return false;
              }
            }
            if(contents[i].devices[j].devType =='9'){
              //查询高音喇叭ip和port
              try {
                var fb = thunkify(findBroadcastSet);
                param.broadcast = contents[i].devices[j].deviceNbr;
                var fb_callback = yield fb(param);
                if(fb_callback&&fb_callback.length!=0) {
                  var broadcastHost = fb_callback[0].ip;
                  var broadcastPort = fb_callback[0].port;
                }
              }catch (e){
                cb(null,{
                  ret:0,
                  msg:e
                });
              }
              //高音喇叭控制
              try {
                var bc = thunkify(broadcastControl);
                var bcJson = {
                  "optperson":req.query.username,
                  "host": broadcastHost,
                  "port":broadcastPort,
                  "level":contents[i].devices[j].set,
                  "eqid":contents[i].devices[j].deviceNbr
                };
                var bc_callback = yield bc(bcJson);
                if(bc_callback){
                  broadcastResult = JSON.parse(bc_callback).success;
                }
              }catch (e){
                cb(null,{
                  ret:0,
                  msg:e
                });
              }
              if(!broadcastResult){
                cb(null,{
                  ret:2,
                  msg:'语音广播控制失败'
                });
                return false;
              }
            }
            if(contents[i].devices[j].devType =='14'){
              //区间测速控制
              try {
                var regionJson = {
                  region_code:contents[i].devices[j].deviceNbr,
                  speedType:contents[i].devices[j].set.speed,
                  optpersion:req.query.username
                };
                var rc = thunkify(regionControl);
                var rc_callback = yield rc(regionJson);
                if(rc_callback){
                  regionResult = rc_callback;
                }
              }catch (e){
                cb(null,{
                  ret:0,
                  msg:e
                });
              }
              if(!regionResult){
                cb(null,{
                  ret:2,
                  msg:'区间控制失败'
                });
                return false;
              }

            }
          }
        }

        event_command.updateAll({'_id': objId}, {'result': Number(data.result)}, function (err, event) {
          if (err) cb(null, {
            ret: 0,
            msg: err
          });
          var user = req.query.username;
          logs.optLog(logMsg, req.headers['x-forwarded-for'] ||
            req.connection.remoteAddress ||
            req.socket.remoteAddress ||
            req.connection.socket.remoteAddress, user);
          cb(null, {
            ret: 1,
            msg: '修改成功'
          });
        });
      });

    } else {

      logMsg = '修改调整已发布预案';
      co(function *() {
        var param = {
          e:event_command
        };
        var frogResult,shuntLightResult,shuntScreenResult,broadcastResult,regionResult;
        for(var i = 0;i<data.contents.length;i++){
          for(var j = 0;j<data.contents[i].devices.length;j++){
            if(data.contents[i].devices[j].devType =='3'){
              //查询雾灯ip,port
              try {
                var ff = thunkify(findFrogSet);
                param.frog = data.contents[i].devices[j].deviceNbr;
                var ff_callback = yield ff(param);
                if(ff_callback&&ff_callback.length!=0) {
                  var frogHost = ff_callback[0].ip;
                  var frogPort = ff_callback[0].port;
                }
              }catch (e){
                cb(null,{
                  ret:0,
                  msg:e
                });
              }
              //雾灯控制
              try {
                var fc = thunkify(frogControl);
                var fcJson = {
                  host:frogHost,
                  port:frogPort,
                  set:data.contents[i].devices[j].set,
                  text:data.contents[i].devices[j].text,
                  optperson:req.query.username,
                  eqid:data.contents[i].devices[j].deviceNbr
                };
                var fc_callback = yield fc(fcJson);
                if(fc_callback){
                  frogResult = JSON.parse(fc_callback).success;
                }
              }catch (e){
                cb(null,{
                  ret:0,
                  msg:e
                });
              }
              if(!frogResult){
                cb(null,{
                  ret:2,
                  msg:'防撞雾灯控制失败'
                });
                return false;
              }
            }
            if(data.contents[i].devices[j].devType =='4'){
              //查询分流信号灯ip,port
              try {
                var fsl = thunkify(findShuntLightSet);
                param.shuntLight = data.contents[i].devices[j].deviceNbr;
                var fsl_callback = yield fsl(param);
                if(fsl_callback&&fsl_callback.length!=0) {
                  var shuntLightHost = fsl_callback[0].ip;
                  var shuntLightPort = fsl_callback[0].port;
                }
              }catch (e){
                cb(null,{
                  ret:0,
                  msg:e
                });
              }
              //信号灯控制
              try {
                var slc = thunkify(shuntLightControl);
                var slcJson = {
                  ip:shuntLightHost,
                  LaneLightStatusSeq:data.contents[i].devices[j].set,
                  text:data.contents[i].devices[j].text,
                  optperson:req.query.username,
                  eqid:data.contents[i].devices[j].deviceNbr,
                  orderType : 2
                };
                var slc_callback = yield slc(slcJson);
                if(slc_callback){
                  shuntLightResult = JSON.parse(slc_callback).success;
                }
              }catch (e){
                cb(null,{
                  ret:0,
                  msg:e
                });
              }
              if(!shuntLightResult){
                cb(null,{
                  ret:2,
                  msg:'分流信号灯控制失败'
                });
                return false;
              }
            }
            if(data.contents[i].devices[j].devType =='8'){
              //查询分流诱导屏ip和port
              try {
                var fss = thunkify(findShuntScreenSet);
                param.shuntScreen = data.contents[i].devices[j].deviceNbr;
                var fss_callback = yield fss(param);
                if(fss_callback&&fss_callback.length!=0) {
                  var shuntScreenHost = fss_callback[0].ip;
                  var shuntScreenPort = fss_callback[0].port;
                  var colorType = fss_callback[0].vms_type;
                }
              }catch (e){
                cb(null,{
                  ret:0,
                  msg:e
                });
              }
              //诱导屏控制
              try {
                var ssc = thunkify(shuntScreenControl);
                var sscJson = {
                  "optperson":req.query.username,
                  "commandType": "addProgram",	//接口命令类型，添加节目的固定命令就为addProgram
                  "deviceInfo": {					//设备参数开始
                    "colorType": Number(colorType),
                    "devIp": shuntScreenHost,
                    "devModel": "NovaTcpPlayer",
                    "devNo": data.contents[i].devices[j].deviceNbr,
                    "devPort": Number(shuntScreenPort),
                    "regionNo": "",
                    "screenNo": 1
                  },
                  "program":data.contents[i].devices[j].set,
                  "text":data.contents[i].devices[j].text
                };
                var ssc_callback = yield ssc(sscJson);
                if(ssc_callback){
                  shuntScreenResult = JSON.parse(ssc_callback).success;
                }
              }catch (e){
                cb(null,{
                  ret:0,
                  msg:e
                });
              }
              if(!shuntScreenResult){
                cb(null,{
                  ret:2,
                  msg:'分流诱导屏发屏失败'
                });
                return false;
              }
            }
            if(data.contents[i].devices[j].devType =='9'){
              //查询高音喇叭ip和port
              try {
                var fb = thunkify(findBroadcastSet);
                param.broadcast = data.contents[i].devices[j].deviceNbr;
                var fb_callback = yield fb(param);
                if(fb_callback&&fb_callback.length!=0) {
                  var broadcastHost = fb_callback[0].ip;
                  var broadcastPort = fb_callback[0].port;
                }
              }catch (e){
                cb(null,{
                  ret:0,
                  msg:e
                });
              }
              //高音喇叭控制
              try {
                var bc = thunkify(broadcastControl);
                var bcJson = {
                  "optperson":req.query.username,
                  "host": broadcastHost,
                  "port":broadcastPort,
                  "level":data.contents[i].devices[j].set,
                  "eqid":data.contents[i].devices[j].deviceNbr
                };
                var bc_callback = yield bc(bcJson);
                if(bc_callback){
                  broadcastResult = JSON.parse(bc_callback).success;
                }
              }catch (e){
                cb(null,{
                  ret:0,
                  msg:e
                });
              }
              if(!broadcastResult){
                cb(null,{
                  ret:2,
                  msg:'语音广播控制失败'
                });
                return false;
              }
            }
            if(data.contents[i].devices[j].devType =='14'){
              //区间测速控制
              try {
                var regionJson = {
                  region_code:data.contents[i].devices[j].deviceNbr,
                  speedType:data.contents[i].devices[j].set.speed,
                  optpersion:req.query.username
                };
                var rc = thunkify(regionControl);
                var rc_callback = yield rc(regionJson);
                if(rc_callback){
                  regionResult = rc_callback;
                }
              }catch (e){
                cb(null,{
                  ret:0,
                  msg:e
                });
              }
              //查询区间下可变限速牌和解除限速牌
              // try {
              //   var fi = thunkify(findIntervalSet);
              //   param.interval = data.contents[i].devices[j].deviceNbr;
              //   var fi_callback = yield fi(param);
              //   if(fi_callback){
              //     var vslJson = {
              //       devType:'2',
              //       deviceNbr:fi_callback[0].speedBrand
              //     };
              //     var vslCJson = {
              //       devType:'17',
              //       deviceNbr:fi_callback[0].cancelScreen
              //     };
              //     data.contents[i].devices.push(vslJson);
              //     data.contents[i].devices.push(vslCJson);
              //   }
              // }catch (e){
              //   cb(null,{
              //     ret:0,
              //     msg:e
              //   });
              // }
              if(!regionResult){
                cb(null,{
                  ret:2,
                  msg:'区间控制失败'
                });
                return false;
              }

            }
          }
        }

          event_command.replaceById(id, data, {validate: true}, function (err, event) {
            if (err) cb(null, {
              ret: 0,
              msg: err
            });
            event_command.app.models.event_process.create(data, function (err, ep) {
              if (err) cb(null, {
                ret: 0,
                msg: err
              });
              var user = req.query.username;
              logs.optLog(logMsg, req.headers['x-forwarded-for'] ||
                req.connection.remoteAddress ||
                req.socket.remoteAddress ||
                req.connection.socket.remoteAddress, user);
              cb(null, {
                ret: 1,
                msg: '修改成功'
              });
            });
          });

      });

    }

  };
  event_command.remoteMethod('up', {
    description:'修改事件',
    accepts: {arg:'req', type:'Object',required:true,http: { source: 'req' }},
    http: {path:'/update1',verb:'post'},
    returns: {arg: 'res', type: 'Object',root:true,required:true}
  });
};

// 对Date的扩展，将 Date 转化为指定格式的String
// 月(M)、日(d)、小时(h)、分(m)、秒(s)、季度(q) 可以用 1-2 个占位符，
// 年(y)可以用 1-4 个占位符，毫秒(S)只能用 1 个占位符(是 1-3 位的数字)
// 例子：
// (new Date()).Format("yyyy-MM-dd hh:mm:ss.S") ==> 2006-07-02 08:09:04.423
// (new Date()).Format("yyyy-M-d h:m:s.S")      ==> 2006-7-2 8:9:4.18
Date.prototype.Format = function(fmt)
{ //author: meizz
  var o = {
    "M+" : this.getMonth()+1,                 //月份
    "d+" : this.getDate(),                    //日
    "h+" : this.getHours(),                   //小时
    "m+" : this.getMinutes(),                 //分
    "s+" : this.getSeconds(),                 //秒
    "q+" : Math.floor((this.getMonth()+3)/3), //季度
    "S"  : this.getMilliseconds()             //毫秒
  };
  if(/(y+)/.test(fmt))
    fmt=fmt.replace(RegExp.$1, (this.getFullYear()+"").substr(4 - RegExp.$1.length));
  for(var k in o)
    if(new RegExp("("+ k +")").test(fmt))
      fmt = fmt.replace(RegExp.$1, (RegExp.$1.length==1) ? (o[k]) : (("00"+ o[k]).substr((""+ o[k]).length)));
  return fmt;
};

function findShunt(param,callback) {
  param.s.app.models.s_unit.find({where:{sysCode:param.sysCode,unitType:param.type}},function (err, rs) {
    if(err) callback(err,null);
    callback(null,rs);
  })
}

function findPlan(param,callback) {
  param.s.app.models.s_plan.find({where:{sysCode:param.sysCode,level:param.level}},function (err, rs) {
    if (err) callback(err,null);
    callback(null,rs);
  })
}

function toControl(param,callback) {
  var opt = {
    method: "POST",
    host: config.deviceControlServerHost,
    port: config.deviceControlServerPort,
    path:'/earlyWarn/execute',
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

//更新语音广播控制
function loudspeakerSet(param,callback) {
  param.e.app.models.d_broadcast.updateAll({device_nbr:param.loudspeaker},{set:param.loudspeakerSet},function (err, info) {
    if(err) callback(err,false);
    callback(null,true);
  })
}
//更新分流诱导屏控制
function shuntScreenSet(param,callback) {
  param.e.app.models.d_vms.updateAll({device_nbr:param.shuntScreen},{set:param.shuntScreenSet},function (err, info) {
    if(err) callback(err,false);
    callback(null,true);
  })
}
//更新信号灯控制
function shuntLightSet(param,callback) {
  param.e.app.models.d_signal_lamp.updateAll({device_nbr:param.shuntLight},{set:param.shuntLightSet},function (err, info) {
    if(err) callback(err,false);
    callback(null,true);
  })
}
//更新区间控制
function intervalSet(param,callback) {
  param.e.app.models.d_road_region.updateAll({region_code:param.interval},{set:param.intervalSet},function (err, info) {
    if(err) callback(err,false);
    callback(null,true);
  })
}
//更新可变限速牌控制
function vslSet(param,callback) {
  param.e.app.models.d_vsl.updateAll({device_nbr:param.vsl},{set:param.vslSet},function (err, info) {
    if(err) callback(err,false);
    callback(null,true);
  })
}
//更新解除限速牌控制
function vslCancelSet(param,callback) {
  param.e.app.models.d_vsl.updateAll({device_nbr:param.vslCancel},{set:param.vslCancelSet},function (err, info) {
    if(err) callback(err,false);
    callback(null,true);
  })
}
//更新保距诱导屏控制
function distanceSet(param,callback) {
  param.e.app.models.d_vms.updateAll({device_nbr:param.distance},{set:param.distanceSet},function (err, info) {
    if(err) callback(err,false);
    callback(null,true);
  })
}

//查询分流诱导屏控制
function findShuntScreenSet(param,callback) {
  param.e.app.models.d_vms.find({where:{device_nbr:param.shuntScreen}},function (err, rs) {
    if(err) callback(err,null);
    callback(null,rs);
  })
}
//查询信号灯控制
function findShuntLightSet(param,callback) {
  param.e.app.models.d_signal_lamp.find({where:{device_nbr:param.shuntLight}},function (err, rs) {
    if(err) callback(err,null);
    callback(null,rs);
  })
}
//查询区间控制
function findIntervalSet(param,callback) {
  param.e.app.models.d_road_region.find({where:{region_code:param.interval}},function (err, rs) {
    if(err) callback(err,null);
    callback(null,rs);
  })
}
//查询可变限速牌控制
function findVslSet(param,callback) {
  param.e.app.models.d_vsl.find({where:{device_nbr:param.vsl}},function (err, rs) {
    if(err) callback(err,null);
    callback(null,rs);
  })
}
//查询解除限速牌控制
function findVslCancelSet(param,callback) {
  param.e.app.models.d_vsl.find({where:{device_nbr:param.vslCancel}},function (err, rs) {
    if(err) callback(err,null);
    callback(null,rs);
  })
}
//查询保距诱导屏控制
function findDistanceSet(param,callback) {
  param.e.app.models.d_vms.find({where:{device_nbr:param.distance}},function (err, rs) {
    if(err) callback(err,null);
    callback(null,rs);
  })
}
//查询限速牌
function findVsl(param,callback) {
  param.e.app.models.d_vsl.find({order:'_id DESC',where:{device_nbr:param.device_nbr}},function (err, rs) {
    if(err) callback(err,null);
    callback(null,rs);
  });
}
//查询雾灯控制
function findFrogSet(param,callback) {
  param.e.app.models.d_frog_light.find({where:{device_nbr:param.frog}},function (err, rs) {
    if(err) callback(err,null);
    callback(null,rs);
  })
}
//高音喇叭控制
function findBroadcastSet(param,callback) {
  param.e.app.models.d_broadcast.find({where:{device_nbr:param.broadcast}},function (err, rs) {
    if(err) callback(err,null);
    callback(null,rs);
  })
}
//查询系统下的设备
function findSysDevice(param,callback) {
  param.e.app.models.sys_device.find({where:{device_nbr:param.device_nbr}},function (err, rs) {
    if(err) callback(err,null);
    callback(null,rs);
  })
}

//雾灯控制
function frogControl(param,callback) {
  var userInfo = {
    "eqid":param.eqid,
    "optperson":param.optperson
  };
  delete param['optperson'];
  delete param['eqid'];
  userInfo = JSON.stringify(userInfo);
  var opt = {
    method: "POST",
    host: config.frogServerHost,
    port: config.frogServerPort,
    path:'/foglight/control?userInfo='+userInfo,
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
//分流信号灯控制
function shuntLightControl(param,callback) {
  var userInfo = {
    "eqid":param.eqid,
    "optperson":param.optperson
  };
  var ip = param.ip;
  delete param['optperson'];
  delete param['eqid'];
  delete param['ip'];
  param.orderType = 2;
  userInfo = JSON.stringify(userInfo);
  var opt = {
    method: "POST",
    host: config.shuntLightServerHost,
    port: config.shuntLightServerPort,
    path:'/signalLights/signalControl/'+ip+'/json?userInfo='+userInfo,
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
function shuntScreenControl(param,callback) {
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
//高音喇叭控制
function broadcastControl(param,callback) {
  var userInfo = {
    "eqid":param.eqid,
    "optperson":param.optperson
  };
  delete param['optperson'];
  var host = param.host;
  var port = param.port;
  var level = param.level;
  userInfo = JSON.stringify(userInfo);
  var opt = {
    method: "GET",
    host: config.broadcastServerHost,
    port: config.broadcastServerPort,
    path:'/alarm/'+host+'/'+port+'/'+level+'?userInfo='+userInfo,
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
  requ.end('');
  requ.on('error',function(e){
    callback(e,null)
  });
}
//区间控制
function regionControl(param,callback) {
  var username = param.optpersion;
  delete param['optpersion'];
  var opt = {
    method: "POST",
    host: config.localhost,
    port: config.port,
    path:'/api/d_road_regions/publish?username='+username,
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
          callback(null,true);
        else callback(null,false);
      });
    }
    else {
      callback('error',null)
    }
  });
  param.video = JSON.stringify(param.video);
  requ.write(JSON.stringify(param) + "\n");
  requ.end('');
  requ.on('error',function(e){
    callback('Error got: '+e.message,null);
  });
}

//true\false转换
function trueFalse(i) {
  var result;
  switch(i)
  {
    case true:
      result = '成功';
      break;
    case false:
      result = '失败';
      break;
  }
  return result;
}
