/**
 * Created by dell on 2017/7/4.
 */
var config = require('../../config');
var mongodb = require('mongodb');
var ObjectID = mongodb.ObjectID;
var loopback = require('loopback');
var app = loopback();
var co = require('co');
var thunkify = require('thunkify');
var logs = require('../../logServer');

var errColMsg = {
  ret: 0,
  msg: '操作失败，数据库集合操作异常'
};
var errParamMsg = {
  ret: 0,
  msg: '操作失败，参数合法性验证'
};

module.exports = function(s_surveillance_system) {
  s_surveillance_system.validatesUniquenessOf('sysCode');
  //分页查询
  s_surveillance_system.list = function (data, cb) {

    var filter = {
      order:'_id DESC',
      include:['units','devices'],
      where:{}
    };
    if(data.sysName!="undefined"&&data.sysName) filter.where.sysName = {regexp:data.sysName};
    if(data.sysCode!="undefined"&&data.sysCode) filter.where.sysCode = {regexp:data.sysCode};
    if(data.area_code!="undefined"&&data.area_code) filter.where.area_code = data.area_code;
    if(data.org_code!="undefined"&&data.org_code) filter.where.org_code = data.org_code;
    if(data.pageSize!="undefined"&&data.pageIndex!="undefined"&&data.pageSize&&data.pageIndex) {
      filter.limit = Number(data.pageSize);
      filter.skip = (Number(data.pageIndex) - 1) * Number(data.pageSize);
    }

    s_surveillance_system.find(filter,function (err, rs) {
      if(err) cb(null,errColMsg);
      s_surveillance_system.count(filter.where,function (err, count) {
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
  s_surveillance_system.remoteMethod('list', {
    description:'监控系统分页查询',
    accepts: {arg:'data', type:'Object',required:true,http: { source: 'body' }},
    http: {path:'/list',verb:'post'},
    returns: {arg: 'res', type: 'Object',root:true,required:true}
  });

  //新增
  s_surveillance_system.add = function (req, cb) {
    var data = req.body;
    data.createTime = Date.now();
    var units = JSON.parse(data.units);
    delete data['units'];
    data.sysCode = 's'+data.createTime+'0000';
    co(function *() {
      var sc = thunkify(sysCreate);
      var scParam = {
        s:s_surveillance_system,
        data:data
      };
      var sc_callback = yield sc(scParam);
      if(sc_callback.ret ==0){
        cb(null,sc_callback)
      }
      for(var i=0;i<units.length;i++){
        units[i].sysId = ObjectID(sc_callback.id);
        units[i].sysCode =data.sysCode;
        units[i].createTime = data.createTime;
        units[i].unitId = 'u'+(Number(data.createTime.toString()+'0000')+i).toString();
        console.log(units[i].unitId);
        if(units[i].unitType==2){

            var fr = thunkify(findRegion);
            var param = {
              s:s_surveillance_system,
              interval:units[i].interval
            };
            var fr_callback = yield fr(param);
            if(fr_callback){
              units[i].screen = fr_callback[0].speedBrand;
              units[i].site = fr_callback[0].site_code;
              units[i].cancelScreen = fr_callback[0].cancelScreen
            }

        }
      }
      var id = ObjectID(data.visibilityMeter);
      // var upset = {
      //   id:id,
      //   sysCode:rs.sysCode,
      //   sysName:rs.sysName
      // };
      s_surveillance_system.app.models.d_visibility_meter.updateAll({_id:id},{ sysCode:sc_callback.sysCode,sysName:sc_callback.sysName},function (err, count) {
        if(err) cb(null,{
          ret:0,
          msg:err
        });

        s_surveillance_system.app.models.s_unit.create(units,function (err,a) {
          if (err) cb(null,{
            ret:0,
            msg:err
          });
          var user = req.query.username;
          if(units.length!=0){
            logs.optLog("为系统"+sc_callback.sysCode+"配置了"+units.length+"个控制单元",req.headers['x-forwarded-for'] ||
              req.connection.remoteAddress ||
              req.socket.remoteAddress ||
              req.connection.socket.remoteAddress,user);
          }

          logs.optLog("添加监控系统"+sc_callback.sysCode,req.headers['x-forwarded-for'] ||
            req.connection.remoteAddress ||
            req.socket.remoteAddress ||
            req.connection.socket.remoteAddress,user);
          cb(null,{
            ret:1,
            id:sc_callback.id,
            msg:'新增成功'
          });
        });
      });

    });


  };
  s_surveillance_system.remoteMethod('add', {
    description:'添加监控系统',
    accepts: {arg:'req', type:'Object',required:true,http: { source: 'req' }},
    http: {path:'/add',verb:'post'},
    returns: {arg: 'res', type: 'Object',root:true,required:true}
  });

  //删除
  s_surveillance_system.del = function (req, cb) {
    var data = req.body;
    var arr=[];
    data.id.split(",").forEach(function(item){
      arr.push(ObjectID(item));
    });
    var where = {_id:{inq: arr}};
    var sysCode = [];
    s_surveillance_system.find({where:where},function (err, rs) {
      if(err) cb(null,err);
      for(var i = 0;i<rs.length;i++){
        sysCode.push(rs[i].sysCode);
      }
      s_surveillance_system.app.models.sys_device.destroyAll({sys_code:{inq:sysCode}},function (err, a) {
        if(err) cb(null,err);
        s_surveillance_system.destroyAll(where,function (err, info) {
          if(err) cb(null,err);
          var user = req.query.username;
          logs.optLog("删除"+info.count+"个监控系统",req.headers['x-forwarded-for'] ||
            req.connection.remoteAddress ||
            req.socket.remoteAddress ||
            req.connection.socket.remoteAddress,user);
          cb(null,{
            ret:1,
            msg:'删除成功'
          });
        })
      });
    });
  };
  s_surveillance_system.remoteMethod('del', {
    description:'删除监控系统',
    accepts: {arg:'req', type:'Object',required:true,http: { source: 'req' }},
    http: {path:'/delete',verb:'post'},
    returns: {arg: 'res', type: 'Object',root:true,required:true}
  });

  //修改
  s_surveillance_system.up = function (req, cb) {
    var data = req.body;
    if(data.id=="undefined"){
      cb(null,errParamMsg);
    }
    var id = data.id;
    var units = JSON.parse(data.units);
    delete data['id'];
    delete  data['units'];
    var time = Date.now();
    co(function *() {
      for (var i = 0; i < units.length; i++) {
        units[i].sysId = ObjectID(id);
        units[i].sysCode = data.sysCode;
        units[i].createTime = time;
        units[i].unitId = 'u' + (Number(time.toString() + '0000') + i).toString();
        // console.log(units[i].unitId);
        if (units[i].unitType == 2) {

          var fr = thunkify(findRegion);
          var param = {
            s: s_surveillance_system,
            interval: units[i].interval
          };
          var fr_callback = yield fr(param);
          if (fr_callback) {
            units[i].screen = fr_callback[0].speedBrand;
            units[i].site = fr_callback[0].site_code;
            units[i].cancelScreen = fr_callback[0].cancelScreen
          }

        }
      }
      s_surveillance_system.replaceById(id, data, {validate: true}, function (err, rs) {
        if (err) cb(null, {
          ret: 0,
          msg: err
        });
        s_surveillance_system.app.models.s_unit.destroyAll({sysId: ObjectID(id)}, function (err, count) {
          if (err) cb(null, {
            ret: 0,
            msg: err
          });

          s_surveillance_system.app.models.s_unit.create(units, function (err) {
            if (err) cb(null, {
              ret: 0,
              msg: err
            });
            var user = req.query.username;
            logs.optLog("修改监控系统" + rs.sysCode, req.headers['x-forwarded-for'] ||
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
    });
  };
  s_surveillance_system.remoteMethod('up', {
    description:'修改监控系统',
    accepts: {arg:'req', type:'Object',required:true,http: { source: 'req' }},
    http: {path:'/updateSys',verb:'post'},
    returns: {arg: 'res', type: 'Object',root:true,required:true}
  });

  //预警设备联动预案完整数据生成
  s_surveillance_system.deviceControl = function (req, cb) {
    // console.log(data);
    var data = req.body;
    var shunt = {};
    var speed = {};
    var distance = {};
    var warning = {};
    var param = {
      s:s_surveillance_system,
      level:Number(data.level),
      sysCode:data.sysCode
    };
    co(function *() {
      //预案查询
      try{
        var fp = thunkify(findPlan);
        var plan = yield fp(param);
        if(!plan){
          cb(null,{
            ret:0,
            msg:'查询预案错误'
          });
        }else if(plan.length==0){
          cb(null,{
            ret:0,
            msg:'无可用的预案'
          })
        }
      }catch (e){
        cb(null,{
          ret:0,
          msg:e
        })
      }
      //查询分流单元设备编号
      try{
        var ds = thunkify(findShunt);
        param.type = 0;
        var dsCallback = yield ds(param);
        if(!dsCallback) cb(null,{
          ret:0,
          msg:'分流单元错误'
        });
        var loudspeaker = {};
        var screen = {};
        var light = {};
        if(dsCallback.length!=0){
          loudspeaker.eq = (dsCallback[0].loudspeaker==undefined||dsCallback[0].loudspeaker=="")?"0":dsCallback[0].loudspeaker;
          loudspeaker.set = plan[0].shuntLoudspeaker;
          screen.eq = (dsCallback[0].screen==undefined||dsCallback[0].screen=="")?"0":dsCallback[0].screen;
          screen.set = plan[0].shuntScreen;
          light.eq = (dsCallback[0].light==undefined||dsCallback[0].light=="")?"0":dsCallback[0].light;
          light.set = [];
          var lane = [];
          lane.push(dsCallback[0].lane1);
          lane.push(dsCallback[0].lane2);
          lane.push(dsCallback[0].lane3);
          lane.push(dsCallback[0].lane4);
          for (var i = 0;i<plan[0].shuntLight.length;i++){
            light.set.push(lane[i]+'|'+plan[0].shuntLight[i]);
          }
        }else {
          loudspeaker.eq = '0';
          loudspeaker.set = plan[0].shuntLoudspeaker;
          screen.eq = '0';
          screen.set = plan[0].shuntScreen;
          light.eq = '0';
          light.set = [];
          var lane = [];
          lane.push('0');
          lane.push('0');
          lane.push('0');
          lane.push('0');
          for (var i = 0;i<plan[0].shuntLight.length;i++){
            light.set.push(lane[i]+'|'+plan[0].shuntLight[i]);
          }
        }

      }catch (e){
        cb(null,{
          ret:0,
          msg:e
        })
      }
      //查询车辆限速单元设备
      try{
        param.type = 2;
        dsCallback = yield ds(param);
        if(!dsCallback) cb(null,{
          ret:0,
          msg:'限速单元错误'
        });
        var interval = {};
        var limitSpeedBrand ={};
        var cancelSpeed = {};
        if(dsCallback.length!=0){
          interval.eq = (dsCallback[0].interval==undefined||dsCallback[0].interval=="")?"0":dsCallback[0].interval;
          interval.set = plan[0].speed;
          limitSpeedBrand.eq = dsCallback[0].screen==undefined||dsCallback[0].screen==undefined?"0":dsCallback[0].screen;
          limitSpeedBrand.set = {};
          cancelSpeed.eq = (dsCallback[0].cancelScreen==undefined||dsCallback[0].cancelScreen=="")?"0":dsCallback[0].cancelScreen;
          cancelSpeed.set = {};
          //查询可变限速牌和解除限速牌的设置模版

          // var fvideo = thunkify(findVideo);
          // var whereV1 = {
          //   s:s_surveillance_system,
          //   device_nbr:limitSpeedBrand.eq
          // };
          // var whereV2 = {
          //   s:s_surveillance_system,
          //   device_nbr:cancelSpeed.eq
          // };
          // var speedBrandVideo = yield fvideo(whereV1);
          // var cancelSpeedVideo = yield fvideo(whereV2);
          // if(speedBrandVideo) limitSpeedBrand.video = speedBrandVideo[0].video_nbr;
          // if(cancelSpeedVideo) cancelSpeed.video = cancelSpeedVideo[0].video_nbr;

        }else {
          interval.eq = '0';
          interval.set = plan[0].speed;
          limitSpeedBrand.eq = '0';
          limitSpeedBrand.set = {};
          cancelSpeed.eq = '0';
          cancelSpeed.set = {};
          limitSpeedBrand.video = '0';
          cancelSpeed.video = '0';
        }
        //查询可变限速牌和解除限速牌的设置模版
        if(limitSpeedBrand.eq!='0'||cancelSpeed.eq!='0'){
          var fv = thunkify(findVsl);
          var vslParam = {
            device_nbr:limitSpeedBrand.eq,
            s:s_surveillance_system
          };
          var vslCParam = {
            device_nbr:cancelSpeed.eq,
            s:s_surveillance_system
          };
          var vsl = yield fv(vslParam);
          var vslC = yield fv(vslCParam);
          if(vsl&&vslC){
            var vslSet = vsl[0].set;
            var vslCSet = vslC[0].set;
            // var vslip = vsl[0].ip;
            // var vslport = vsl[0].port;
            // var vslCip = vslC[0].ip;
            // var vslCport = vslC[0].port;
          }
          limitSpeedBrand.set = vslSet;
          cancelSpeed.set = vslCSet;
        }


      }catch (e){
        cb(null,{
          ret:0,
          msg:e
        })
      }
      //查询车辆保距单元设备
      try{
        param.type = 3;
        dsCallback = yield ds(param);
        if(!dsCallback) cb(null,{
          ret:0,
          msg:'保距单元错误'
        });
        if(dsCallback.length!=0){
          distance.eq = (dsCallback[0].screen==undefined||dsCallback[0].screen=="")?"0":dsCallback[0].screen;
          distance.set = plan[0].distanceScreen;
        }else {
          distance.eq = '0';
          distance.set = plan[0].distanceScreen;
        }

      }catch (e){
        cb(null,{
          ret:0,
          msg:e
        })
      }
      //查询防撞警示单元设备
      try{
        param.type = 4;
        dsCallback = yield ds(param);
        if(!dsCallback) cb(null,{
          ret:0,
          msg:'防撞单元错误'
        });
        if(dsCallback.length!=0){
          warning.eq = (dsCallback[0].warningLight==undefined||dsCallback[0].warningLight=="")?"0":dsCallback[0].warningLight;
          warning.set = {
            "state":plan[0].warningState,
            "length":plan[0].warningLength,
            "mode":plan[0].warningMode,
            "bright":plan[0].warningBright,
            "frequency":plan[0].warningFrequency
          };
        }else {
          warning.eq = '0';
          warning.set = {
            "state":plan[0].warningState,
            "length":plan[0].warningLength,
            "mode":plan[0].warningMode,
            "bright":plan[0].warningBright,
            "frequency":plan[0].warningFrequency
          };
        }

      }catch (e){
        cb(null,{
          ret:0,
          msg:e
        })
      }
      shunt = {
        "loudspeaker":loudspeaker,
        "screen":screen,
        "light":light
      };
      speed = {
        "interval":interval,
        "limitSpeedBrand":limitSpeedBrand,
        "cancelSpeed":cancelSpeed
      };
      if(Number(data.level)!=4){
        cb(null,{
          ret:1,
          datas:{
            shunt:shunt,
            speed:speed,
            distance:distance,
            warning:warning
          },
          msg:'查询成功'
        });
      }else {
        try{
          var fss = thunkify(findShuntScreenSet);
          var fsl = thunkify(findShuntLightSet);
          var fi = thunkify(findIntervalSet);
          var fv = thunkify(findVslSet);
          var fvc = thunkify(findVslCancelSet);
          var fd = thunkify(findDistanceSet);
          var param1 = {
            s:s_surveillance_system,
            shuntScreen:shunt.screen.eq,
            shuntLight:shunt.light.eq,
            interval:speed.interval.eq,
            vsl:speed.limitSpeedBrand.eq,
            vslCancel:speed.cancelSpeed.eq,
            distance:distance.eq
          };
          var fss_callback = yield fss(param1);
          var fsl_callback = yield fsl(param1);
          var fi_callback = yield fi(param1);
          var fv_callback = yield fv(param1);
          var fvc_callback = yield fvc(param1);
          var fd_callback = yield fd(param1);
          if(fss_callback) shunt.screen.set = fss_callback[0].set;
          if(fsl_callback) shunt.light.set = fsl_callback[0].set;
          if(fi_callback) speed.interval.set = fi_callback[0].set;
          if(fv_callback) speed.limitSpeedBrand.set = fv_callback[0].set;
          if(fvc_callback) speed.cancelSpeed.set = fvc_callback[0].set;
          if(fd_callback) distance.set = fd_callback[0].set;
        }catch (e){
          cb(null,{
            ret:0,
            msg:e
          })
        }
        cb(null,{
          ret:1,
          datas:{
            shunt:shunt,
            speed:speed,
            distance:distance,
            warning:warning
          },
          msg:'查询成功'
        });
      }
    });
  };
  s_surveillance_system.remoteMethod('deviceControl', {
    description:'联动预案',
    accepts: {arg:'req', type:'Object',required:true,http: { source: 'req' }},
    http: {path:'/deviceControl',verb:'post'},
    returns: {arg: 'res', type: 'Object',root:true,required:true}
  });

  //系统下的设备
  s_surveillance_system.listDevice = function (data, cb) {

    var filter = {
      order:'_id DESC',
      where:{}
    };
    if(data.sys_code!="undefined"&&data.sys_code) filter.where.sys_code = {regexp:data.sys_code};
    if(data.device_type!="undefined"&&data.device_type) filter.where.device_type = Number(data.device_type);
    if(data.pageSize!="undefined"&&data.pageIndex!="undefined"&&data.pageSize&&data.pageIndex) {
      filter.limit = Number(data.pageSize);
      filter.skip = (Number(data.pageIndex) - 1) * Number(data.pageSize);
    }

    s_surveillance_system.app.models.sys_device.find(filter,function (err, rs) {
      if(err) cb(null,errColMsg);
      s_surveillance_system.app.models.sys_device.count(filter.where,function (err, count) {
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
  s_surveillance_system.remoteMethod('listDevice', {
    description:'系统设备查询',
    accepts: {arg:'data', type:'Object',required:true,http: { source: 'body' }},
    http: {path:'/listDevice',verb:'post'},
    returns: {arg: 'res', type: 'Object',root:true,required:true}
  });

//新建系统以及关联设备（新）
  s_surveillance_system.deviceAdd = function (req, cb) {
    var data = req.body;
    data.createTime = Date.now();
    // var units = JSON.parse(data.units);
    // delete data['units'];
    data.devices = JSON.parse(data.devices);
    var devices = data.devices;
    delete data['devices'];
    var interval,visibilityMeter;
    data.sysCode = 's'+data.createTime+'0000';
    co(function *() {
      var region = [];
      for(var i = 0;i<devices.length;i++){
        if(devices[i].device_type=="14"){
          interval = devices[i].device_nbr;

          //查询区间中的设备
          try{
            var fr = thunkify(findRegion);
            var param = {
              s:s_surveillance_system,
              interval:interval
            };
            region =yield fr(param);
            if(region) {
              var vsl = region[0].speedBrand;
              var vslC = region[0].cancelScreen;
              var regionStart = region[0].entry_site_code;
              var regionEnd = region[0].exit_site_code;
              devices.push({device_nbr:region[0].site_code,device_name:region[0].site_name,device_type:18});
            }
          }catch (e){
            cb(null,{
              ret:0,
              msg:e
            });
            return false;
          }
          //查询设备详情
          try{
            var fvsl = thunkify(findVslSet);
            var fvslC = thunkify(findVslCancelSet);
            var fvslCV = thunkify(findVslCVideo);
            var fsite = thunkify(findSite);
            var param = {
              s:s_surveillance_system,
              vsl:vsl,
              vslCancel:vslC
            };
            var whereS = {
              s:s_surveillance_system,
              device_nbr:regionStart
            };
            var whereE = {
              s:s_surveillance_system,
              device_nbr:regionEnd
            };
            var regionStartInfo = yield fsite(whereS);
            var regionEndInfo = yield fsite(whereE);
            var vslInfo = yield fvsl(param);
            var vslCInfo = yield fvslC(param);
            if(vslInfo){
              devices.push({device_nbr:vslInfo[0].device_nbr,device_name:vslInfo[0].device_name,device_type:2});
            }
            if(vslCInfo){
              devices.push({device_nbr:vslCInfo[0].device_nbr,device_name:vslCInfo[0].device_name,device_type:17});
              param.vslCV = vslCInfo[0].video_nbr;
              var vslCVInfo = yield fvslCV(param);
              if(vslCVInfo){
                if(vslCVInfo.length!=0){
                  devices.push({device_nbr:vslCVInfo[0].device_nbr,device_name:vslCVInfo[0].device_name,device_type:19});
                }

              }
            }
            if(regionStartInfo){
              devices.push({device_nbr:regionStartInfo[0].site_nbr,device_name:regionStartInfo[0].site_name,device_type:20});
            }
            if(regionEndInfo){
              devices.push({device_nbr:regionEndInfo[0].site_nbr,device_name:regionEndInfo[0].site_name,device_type:21});
            }

          }catch (e){
            cb(null,{
              ret:0,
              msg:e
            });
            return false;
          }

        }
        if(devices[i].device_type=="6"){
          visibilityMeter = devices[i].device_nbr;
        }
      }
      for(var i = 0;i<devices.length;i++){
        devices[i].sys_code = data.sysCode;
      }
      try{
        var sc = thunkify(sysCreate);
        var scParam = {
          s:s_surveillance_system,
          data:data
        };
        var sc_callback = yield sc(scParam);
        if(sc_callback.ret ==0){
          cb(null,sc_callback)
        }
      }catch (e){
        cb(null,{
          ret:0,
          msg:e
        });
        return false;
      }
      s_surveillance_system.app.models.sys_device.create(devices,function (err,a) {
        if (err) cb(null, {
          ret: 0,
          msg: err
        });
        var user = req.query.username;
        logs.optLog("添加监控系统" + sc_callback.sysCode, req.headers['x-forwarded-for'] ||
          req.connection.remoteAddress ||
          req.socket.remoteAddress ||
          req.connection.socket.remoteAddress, user);
        cb(null, {
          ret: 1,
          id: sc_callback.id,
          msg: '新增成功'
        });
      });
    });
  };
  s_surveillance_system.remoteMethod('deviceAdd', {
    description:'添加系统新',
    accepts: {arg:'req', type:'Object',required:true,http: { source: 'req' }},
    http: {path:'/deviceAdd',verb:'post'},
    returns: {arg: 'res', type: 'Object',root:true,required:true}
  });

  //系统修改（新）
  s_surveillance_system.deviceUpdate = function (req, cb) {
    var data = req.body;

    if(data.id=="undefined"){
      cb(null,errParamMsg);
    }
    var id = data.id;
    delete data['id'];
    // var units = JSON.parse(data.units);
    // delete data['units'];
    data.devices = JSON.parse(data.devices);
    var devices = data.devices;
    delete data['devices'];
    var interval,visibilityMeter;
    co(function *() {
      var region = [];
      for(var i = 0;i<devices.length;i++){
        if(devices[i].device_type=="14"){
          interval = devices[i].device_nbr;
          //查询区间中的设备
          try{
            var fr = thunkify(findRegion);
            var param = {
              s:s_surveillance_system,
              interval:interval
            };
            region =yield fr(param);
            if(region) {
              var vsl = region[0].speedBrand;
              var vslC = region[0].cancelScreen;
              var regionStart = region[0].entry_site_code;
              var regionEnd = region[0].exit_site_code;
              devices.push({device_nbr:region[0].site_code,device_name:region[0].site_name,device_type:18});
            }
          }catch (e){
            cb(null,{
              ret:0,
              msg:e
            });
            return false;
          }
          //查询设备详情
          try{
            var fvsl = thunkify(findVslSet);
            var fvslC = thunkify(findVslCancelSet);
            var fvslCV = thunkify(findVslCVideo);
            var fsite = thunkify(findSite);
            var param = {
              s:s_surveillance_system,
              vsl:vsl,
              vslCancel:vslC
            };
            var whereS = {
              s:s_surveillance_system,
              device_nbr:regionStart
            };
            var whereE = {
              s:s_surveillance_system,
              device_nbr:regionEnd
            };
            var regionStartInfo = yield fsite(whereS);
            var regionEndInfo = yield fsite(whereE);
            var vslInfo = yield fvsl(param);
            var vslCInfo = yield fvslC(param);
            if(vslInfo){
              devices.push({device_nbr:vslInfo[0].device_nbr,device_name:vslInfo[0].device_name,device_type:2});
            }
            if(vslCInfo){
              devices.push({device_nbr:vslCInfo[0].device_nbr,device_name:vslCInfo[0].device_name,device_type:17});
              param.vslCV = vslCInfo[0].video_nbr;
              var vslCVInfo = yield fvslCV(param);
              if(vslCVInfo){
                if(vslCVInfo.length!=0){
                  devices.push({device_nbr:vslCVInfo[0].device_nbr,device_name:vslCVInfo[0].device_name,device_type:19});
                }

              }
            }
            if(regionStartInfo){
              devices.push({device_nbr:regionStartInfo[0].site_nbr,device_name:regionStartInfo[0].site_name,device_type:20});
            }
            if(regionEndInfo){
              devices.push({device_nbr:regionEndInfo[0].site_nbr,device_name:regionEndInfo[0].site_name,device_type:21});
            }

          }catch (e){
            cb(null,{
              ret:0,
              msg:e
            });
            return false;
          }
        }
        if(devices[i].device_type=="6"){
          visibilityMeter = devices[i].device_nbr;
        }
      }
      for(var i = 0;i<devices.length;i++){
        devices[i].sys_code = data.sysCode;
      }
      s_surveillance_system.replaceById(id, data, {validate: true}, function (err, rs){
        if (err) cb(null, {
          ret: 0,
          msg: err
        });
        s_surveillance_system.app.models.sys_device.destroyAll({sys_code: data.sysCode}, function (err, count) {
          if (err) cb(null, {
            ret: 0,
            msg: err
          });
          //添加新的设备清单
          s_surveillance_system.app.models.sys_device.create(devices, function (err, a) {
            if (err) cb(null, {
              ret: 0,
              msg: err
            });
            var user = req.query.username;
            logs.optLog("修改监控系统" + data.sysCode, req.headers['x-forwarded-for'] ||
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
    });
  };
  s_surveillance_system.remoteMethod('deviceUpdate', {
    description:'修改系统新',
    accepts: {arg:'req', type:'Object',required:true,http: { source: 'req' }},
    http: {path:'/deviceUpdate',verb:'post'},
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

function sysCreate(param,callback) {
  param.s.create(param.data,function (err, rs) {
    if(err) callback(err,null);
    callback(null,rs);
  });
}

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

function findVideo(param,callback) {
  param.s.app.models.d_vsl.find({where:{device_nbr:param.device_nbr}},function (err, rs) {
    if (err) callback(err,null);
    callback(null,rs);
  });
}

function findRegion(param,callback) {
  param.s.app.models.d_road_region.find({where:{region_code:param.interval}},function (err, rs) {
    if (err) callback(err,null);
    callback(null,rs);
  });
}

//查询分流诱导屏控制
function findShuntScreenSet(param,callback) {
  param.s.app.models.d_vms.find({where:{device_nbr:param.shuntScreen}},function (err, rs) {
    if(err) callback(err,null);
    callback(null,rs);
  })
}
//查询信号灯控制
function findShuntLightSet(param,callback) {
  param.s.app.models.d_signal_lamp.find({where:{device_nbr:param.shuntLight}},function (err, rs) {
    if(err) callback(err,null);
    callback(null,rs);
  })
}
//查询区间控制
function findIntervalSet(param,callback) {
  param.s.app.models.d_road_region.find({where:{region_code:param.interval}},function (err, rs) {
    if(err) callback(err,null);
    callback(null,rs);
  })
}
//查询可变限速牌控制
function findVslSet(param,callback) {
  param.s.app.models.d_vsl.find({where:{device_nbr:param.vsl}},function (err, rs) {
    if(err) callback(err,null);
    callback(null,rs);
  })
}
//查询解除限速牌控制
function findVslCancelSet(param,callback) {
  param.s.app.models.d_vsl.find({where:{device_nbr:param.vslCancel}},function (err, rs) {
    if(err) callback(err,null);
    callback(null,rs);
  })
}
//查询保距诱导屏控制
function findDistanceSet(param,callback) {
  param.s.app.models.d_vms.find({where:{device_nbr:param.distance}},function (err, rs) {
    if(err) callback(err,null);
    callback(null,rs);
  })
}
//查询视频设备
function findVslCVideo(param,callback) {
  param.s.app.models.d_video_camera.find({where:{device_nbr:param.vslCV}},function (err, rs) {
    if(err) callback(err,null);
    callback(null,rs);
  })
}

//查询卡口
function findSite(param,callback) {
  param.s.app.models.d_monitor_site.find({where:{site_nbr:param.device_nbr}},function (err, rs) {
    if(err) callback(err,null);
    callback(null,rs);
  })
}

//查询限速牌
function findVsl(param,callback) {
  param.s.app.models.d_vsl.find({order:'_id DESC',where:{device_nbr:param.device_nbr}},function (err, rs) {
    if(err) callback(err,null);
    callback(null,rs);
  });
}
