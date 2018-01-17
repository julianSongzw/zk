/**
 * Created by dell on 2017/6/26.
 */
var config = require('../../config');
var mongodb = require('mongodb');
var ObjectID = mongodb.ObjectID;
var logs = require('../../logServer');
var co = require('co');
var thunkify = require('thunkify');
var http = require('http');
var errColMsg = {
  ret: 0,
  msg: '操作失败，数据库集合操作异常'
};
var errParamMsg = {
  ret: 0,
  msg: '操作失败，参数合法性验证'
};

module.exports = function(d_monitor_site) {
  d_monitor_site.validatesUniquenessOf('device_nbr');
//分页查询
  d_monitor_site.list = function (data, cb) {
    var filter = {
      order:'_id DESC',
      include:[{cameras:['video','status']},'region'],
      where:{}
    };
    if(data.site_name!="undefined"&&data.site_name) filter.where.site_name = {regexp:data.site_name};
    if(data.sys_code!="undefined"&&data.sys_code) filter.where.sys_code = data.sys_code;
    if(data.site_nbr!="undefined"&&data.site_nbr) filter.where.site_nbr = {regexp:data.site_nbr};
    if(data.site_type!="undefined"&&data.site_type) filter.where.site_type = Number(data.site_type);
    if(data.device_type!="undefined"&&data.device_type) filter.where.device_type = Number(data.device_type);
    if(data.device_nbr!="undefined"&&data.device_nbr) filter.where.device_nbr = data.device_nbr;
    if(data.org_code!="undefined"&&data.org_code) filter.where.org_code = data.org_code;
    if(data.pageSize!="undefined"&&data.pageIndex!="undefined"&&data.pageSize&&data.pageIndex) {
      filter.limit = Number(data.pageSize);
      filter.skip = (Number(data.pageIndex) - 1) * Number(data.pageSize);
    }
    d_monitor_site.find(filter,function (err, rs) {
      if(err) cb(null,errColMsg);
      d_monitor_site.count(filter.where,function (err, count) {
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
  d_monitor_site.remoteMethod('list', {
    description:'卡口分页查询',
    accepts: {arg:'data', type:'Object',required:true,http: { source: 'body' }},
    http: {path:'/list',verb:'post'},
    returns: {arg: 'res', type: 'Object',root:true,required:true}
  });

  //新增
  d_monitor_site.add = function (req, cb) {
    var data = req.body;
    var camera = JSON.parse(data.cameras);
    delete data['cameras'];
    co(function *() {
      if(data.metre!="") data.address = data.road_name + data.section_code + data.mileage+ '+' + data.metre + 'm';
      else data.address = data.road_name + data.section_code + data.mileage;
      //查询4位序号
      try{
        var fi = thunkify(findIndex);
        var param = {
          org_code:data.org_code,
          m:d_monitor_site
        };
        var fiCb = yield fi(param);
        var index;
        if(fiCb){
          if(fiCb.length==0){
            index = '050000';
          }else {
            index = '05'+('0000'+(Number(fiCb[0].site_nbr.slice(-4))+1).toString()).slice(-4);
          }
        }else {
          cb(null,{
            ret:0,
            msg:'序号出错'
          });
        }
      }catch (e){
        cb(null,{
          ret:0,
          msg:e
        });
      }
      if(data.site_nbr=="undefined"||!data.site_nbr){
        data.site_nbr = data.org_code + index;
        data.nbr_auto = 1;
      }
      //获取字典
      try {
        var fdic = thunkify(findDic);
        var param = {};
        var fdic_callback = yield fdic(param);
        if(fdic_callback){
          var dic = JSON.parse(fdic_callback);
        }
      }catch (e){
        cb(null,{
          ret:0,
          msg:e
        });
      }
      var dicType = Number(data.device_type);
      var device_type = dic.datas['0004'][dicType];
      data.site_name = data.address + device_type;
      data.device_name = data.site_name;
      //添加卡口
      try {
        var site = {
          m:d_monitor_site,
          data:data
        };
        var sa = thunkify(siteAdd);
        var sa_callback = yield sa(site);
        if(sa_callback.ret==0) {
          cb(null,sa_callback);
          return false;
        }
      }catch (e){
        cb(null,{
          ret:0,
          msg:e
        });
        return false;
      }
      //更新卡口设备状态
      try {
        var sU = thunkify(status);
        var statusJson = {
          m:d_monitor_site,
          data:{
            "device_nbr": sa_callback.site_nbr,
            "online_status": 1,
            "fault_status": 2,
            "fault_code": '',
            "timeDiff":0
          }
        };
        var sU_callback = yield sU(statusJson);
        if(sU_callback.ret==0) {
          cb(null,sU_callback);
          return false;
        }
      }catch (e){
        cb(null,{
          ret:0,
          msg:e
        });
        return false;
      }
      //添加抓拍相机
      try{
        var ca = thunkify(cameraAdd);
        for(var i = 0;i<camera.length;i++){
          camera[i].site_nbr = sa_callback.site_nbr;
          camera[i].site_name = sa_callback.site_name;
          var ca_callback = yield ca(camera[i]);
          if(!ca_callback){
            cb(null,{
              ret:0,
              msg:"抓拍相机或视频编号重复"
            })
          }
        }
      }catch (e){
        cb(null,{
          ret:0,
          msg:e
        });
        return false;
      }
      var user = req.query.username;
      logs.optLog("设备备案：添加卡口"+sa_callback.site_name,req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.connection.socket.remoteAddress,user);
      cb(null,{
        ret:1,
        id:sa_callback.id,
        msg:'新增成功'
      });
    });
  };
  d_monitor_site.remoteMethod('add', {
    description:'添加卡口',
    accepts: {arg:'req', type:'Object',required:true,http: { source: 'req' }},
    http: {path:'/add',verb:'post'},
    returns: {arg: 'res', type: 'Object',root:true,required:true}
  });

  //删除
  d_monitor_site.del = function (req, cb) {
    var data = req.body;
    var arr=[];
    data.id.split(",").forEach(function(item){
      arr.push(ObjectID(item));
    });
    var where = {_id:{inq: arr}};
    var device_nbr = [];
    var cameraId = [];
    d_monitor_site.find({where:where},function (err, rs) {
      if(err) cb(null,err);
      for(var i = 0;i<rs.length;i++){
        device_nbr.push(rs[i].site_nbr);
        cameraId.push(rs[i].id.toString());
      }
      var delwhere = {device_nbr:{inq:device_nbr}};
      d_monitor_site.app.models.sys_device.destroyAll(delwhere,function (err, count) {
        if(err) cb(null,err);
        d_monitor_site.destroyAll(where,function (err, info) {
          if(err) cb(null,err);
          co(function *() {
            //删除抓拍相机
            try{
              var cd = thunkify(cameraDelete);
              var param = {
                id:cameraId.join(',')
              };
              var cd_callback = yield cd(param);
              if(!cd_callback){
                cb(null,{
                  ret:0,
                  msg:'删除抓拍相机失败'
                })
              }
            }catch (e){
              cb(null,{
                ret:0,
                msg:e
              });
              return false;
            }
            var user = req.query.username;
            logs.optLog("设备备案：删除"+info.count+"个卡口",req.headers['x-forwarded-for'] ||
              req.connection.remoteAddress ||
              req.socket.remoteAddress ||
              req.connection.socket.remoteAddress,user);
            cb(null,{
              ret:1,
              msg:'删除成功'
            });
          });
        })
      });
    });

  };
  d_monitor_site.remoteMethod('del', {
    description:'删除卡口',
    accepts: {arg:'req', type:'Object',required:true,http: { source: 'req' }},
    http: {path:'/delete',verb:'post'},
    returns: {arg: 'res', type: 'Object',root:true,required:true}
  });

  //修改
  d_monitor_site.up = function (req, cb) {
    var data = req.body;
    delete data['region'];
    if(data.id=="undefined"){
      cb(null,errParamMsg);
    }
    var id = data.id;
    delete data['id'];
    var camera = JSON.parse(data.cameras);
    delete camera['status'];
    delete data['cameras'];
    if(data.metre!="") data.address = data.road_name + data.section_code + data.mileage+ '+' + data.metre + 'm';
    else data.address = data.road_name + data.section_code + data.mileage;
    d_monitor_site.find({order:'_id DESC',where:{_id:ObjectID(id),address:data.address}},function (err, old) {
      if (err) cb(null, {
        ret: 0,
        msg: err
      });
      if(old.length==0){
        co(function *() {
          //获取字典
          try {
            var fdic = thunkify(findDic);
            var param = {};
            var fdic_callback = yield fdic(param);
            if (fdic_callback) {
              var dic = JSON.parse(fdic_callback);
            }
          } catch (e) {
            cb(null, {
              ret: 0,
              msg: e
            });
          }
          var dicType = Number(data.device_type);
          var device_type = dic.datas['0004'][dicType];
          data.site_name = data.address + device_type;
          data.device_name = data.site_name;

          d_monitor_site.replaceById(id,data,{validate:true},function (err,rs) {
          if(err) cb(null,{
            ret:0,
            msg:err
          });
          d_monitor_site.app.models.sys_device.updateAll({device_nbr:data.site_nbr},{device_name:data.site_name},function (err,info) {
            if (err) cb(null, {
              ret: 0,
              msg: err
            });
            co(function *() {
              //抓拍相机
              for(var i = 0;i<camera.length;i++){
                //抓拍相机修改
                if(camera[i].id&&camera[i].device_nbr){
                  camera[i].site_nbr = data.site_nbr;
                  camera[i].site_name = data.site_name;
                  var cu = thunkify(cameraUpdate);
                  var cu_callback = yield cu(camera[i]);
                  if(!cu_callback) {
                    cb(null,{
                      ret:0,
                      msg:'抓拍相机修改失败'
                    });
                    return false;
                  }
                }
                //抓拍相机删除
                if(camera[i].id&&!camera[i].device_nbr){
                  var cd = thunkify(cameraDelete);
                  var cd_callback = yield cd(camera[i]);
                  if(!cd_callback){
                    cb(null,{
                      ret:0,
                      msg:'抓拍相机删除失败'
                    });
                    return false;
                  }
                }
                //抓拍相机添加
                if(!camera[i].id&&camera[i].org_code){
                  camera[i].site_nbr = data.site_nbr;
                  camera[i].site_name = data.site_name;
                  var ca = thunkify(cameraAdd);
                  var ca_callback = yield ca(camera[i]);
                  if(!ca_callback){
                    cb(null,{
                      ret:0,
                      msg:'抓拍相机或视频编号重复'
                    });
                    return false;
                  }
                }
              }
              var user = req.query.username;
              logs.optLog("设备备案：修改卡口" + rs.site_name, req.headers['x-forwarded-for'] ||
                req.connection.remoteAddress ||
                req.socket.remoteAddress ||
                req.connection.socket.remoteAddress, user);
              cb(null, {
                ret: 1,
                msg: '修改成功'
              });
            });
          });
        })
        });
      }else {
        co(function *() {
          //获取字典
          try {
            var fdic = thunkify(findDic);
            var param = {};
            var fdic_callback = yield fdic(param);
            if (fdic_callback) {
              var dic = JSON.parse(fdic_callback);
            }
          } catch (e) {
            cb(null, {
              ret: 0,
              msg: e
            });
          }
          var dicType = Number(data.device_type);
          var device_type = dic.datas['0004'][dicType];
          data.site_name = old[0].address+device_type;
          data.device_name = data.site_name;


          d_monitor_site.replaceById(id,data,{validate:true},function (err,rs) {
          if(err) cb(null,{
            ret:0,
            msg:err
          });
          co(function *() {
            //抓拍相机
            for(var i = 0;i<camera.length;i++){
              //抓拍相机修改
              if(camera[i].id&&camera[i].device_nbr){
                camera[i].site_nbr = data.site_nbr;
                camera[i].site_name = data.site_name;
                var cu = thunkify(cameraUpdate);
                var cu_callback = yield cu(camera[i]);
                if(!cu_callback) {
                  cb(null,{
                    ret:0,
                    msg:'抓拍相机修改失败'
                  });
                  return false;
                }
              }
              //抓拍相机删除
              if(camera[i].id&&!camera[i].device_nbr){
                var cd = thunkify(cameraDelete);
                var cd_callback = yield cd(camera[i]);
                if(!cd_callback){
                  cb(null,{
                    ret:0,
                    msg:'抓拍相机删除失败'
                  });
                  return false;
                }
              }
              //抓拍相机添加
              if(!camera[i].id&&camera[i].org_code){
                camera[i].site_nbr = data.site_nbr;
                camera[i].site_name = data.site_name;
                var ca = thunkify(cameraAdd);
                var ca_callback = yield ca(camera[i]);
                if(!ca_callback){
                  cb(null,{
                    ret:0,
                    msg:'抓拍相机或视频编号重复'
                  });
                  return false;
                }
              }
            }
            var user = req.query.username;
            logs.optLog("设备备案：修改卡口"+rs.site_name,req.headers['x-forwarded-for'] ||
              req.connection.remoteAddress ||
              req.socket.remoteAddress ||
              req.connection.socket.remoteAddress,user);
            cb(null,{
              ret:1,
              msg:'修改成功'
            });
          });
        })
        });
      }
    });
  };
  d_monitor_site.remoteMethod('up', {
    description:'修改卡口',
    accepts: {arg:'req', type:'Object',required:true,http: { source: 'req' }},
    http: {path:'/update_site',verb:'post'},
    returns: {arg: 'res', type: 'Object',root:true,required:true}
  });

  //查询所有
  d_monitor_site.listAll = function (cb) {
    d_monitor_site.find(function (err, rs) {
      if(err) cb(null,errColMsg);
      d_monitor_site.count(function (err, count) {
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
  d_monitor_site.remoteMethod('listAll', {
    description:'卡口查询所有',
    http: {path:'/listAll',verb:'get'},
    returns: {arg: 'res', type: 'Object',root:true,required:true}
  });
};

function findIndex(param,callback) {
  param.m.find({order:'_id DESC',where:{org_code:param.org_code,nbr_auto:1}},function (err, rs) {
    if(err) callback(err,null);
    callback(null,rs);
  })
}

//卡口添加
function siteAdd(param,callback) {
  param.m.create(param.data,function (err, rs) {
    if(err) callback(null,{
      ret:0,
      err:err,
      msg:'卡口编号重复'
    });
    callback(null,rs);
  })
}

//更新卡口设备状态
function status(param,callback) {
  param.m.app.models.d_status.create(param.data,function (err, rs) {
    if(err) callback(null,{
      ret:0,
      msg:err
    });
    callback(null,rs);
  });
}

//添加抓拍相机以及视频
function cameraAdd(param,callback) {
  var opt = {
    method: "POST",
    host: config.localhost,
    port: config.port,
    path:'/api/d_capture_cameras/add',
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

//删除抓拍相机
function cameraDelete(param,callback) {
  var opt = {
    method: "POST",
    host: config.localhost,
    port: config.port,
    path:'/api/d_capture_cameras/delete',
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
  requ.write(JSON.stringify(param) + "\n");
  requ.end('');
  requ.on('error',function(e){
    callback('Error got: '+e.message,null);
  });
}

//修改抓拍相机
function cameraUpdate(param,callback) {
  var opt = {
    method: "POST",
    host: config.localhost,
    port: config.port,
    path:'/api/d_capture_cameras/updateCamera',
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
//获取字典
function findDic(param,callback) {
  var opt = {
    method: "GET",
    host: config.localhost,
    port: config.port,
    path:'/api/sys_codes/listJson',
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
  requ.end('');
  requ.on('error',function(e){
    callback('Error got: '+e.message,null);
  });
}
