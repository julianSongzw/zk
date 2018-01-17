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

module.exports = function(d_vmrs) {
  d_vmrs.validatesUniquenessOf('device_nbr');
  //分页查询
  d_vmrs.list = function (data, cb) {
    var filter = {
      order:'_id DESC',
      include:['status',{cameras:'video'}],
      where:{}
    };
    if(data.device_nbr!="undefined"&&data.device_nbr) filter.where.device_nbr = {regexp:data.device_nbr};
    if(data.device_name!="undefined"&&data.device_name) filter.where.device_name = {regexp:data.device_name};
    if(data.device_type!="undefined"&&data.device_type) filter.where.device_type = Number(data.device_type);
    if(data.area_code!="undefined"&&data.area_code) filter.where.area_code = data.area_code;
    if(data.org_code!="undefined"&&data.org_code) filter.where.org_code = data.org_code;
    if(data.sys_code!="undefined"&&data.sys_code) filter.where.sys_code = data.sys_code;
    if(data.pageSize!="undefined"&&data.pageIndex!="undefined"&&data.pageSize&&data.pageIndex) {
      filter.limit = Number(data.pageSize);
      filter.skip = (Number(data.pageIndex) - 1) * Number(data.pageSize);
    }
    d_vmrs.find(filter,function (err, rs) {
      if(err) cb(null,errColMsg);
      d_vmrs.count(filter.where,function (err, count) {
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
  d_vmrs.remoteMethod('list', {
    description:'电警分页查询',
    accepts: {arg:'data', type:'Object',required:true,http: { source: 'body' }},
    http: {path:'/list',verb:'post'},
    returns: {arg: 'res', type: 'Object',root:true,required:true}
  });

  //新增
  d_vmrs.add = function (req, cb) {
    var data = req.body;
    var camera = JSON.parse(data.camera);
    delete data['camera'];
    if(data.metre!="") data.address = data.road_name + data.section_code + data.mileage+ '+' + data.metre + 'm';
    else data.address = data.road_name + data.section_code + data.mileage;
    co(function *() {
      //查询4位序号
      try {
        var fi = thunkify(findIndex);
        var param = {
          org_code: data.org_code,
          v: d_vmrs
        };
        var fiCb = yield fi(param);
        var index;
        if (fiCb) {
          if (fiCb.length == 0) {
            index = '000000';
          } else {
            index = '00' + ('0000' + (Number(fiCb[0].device_nbr.slice(-4)) + 1).toString()).slice(-4);
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
      }
      if (data.device_nbr == "undefined" || !data.device_nbr) {
        data.device_nbr = data.org_code + index;
        data.nbr_auto = 1;
      }
    });
    data.device_name = data.address + '电警';
    d_vmrs.find({order: '_id DESC', where: {address: data.address}}, function (err, arr) {
      if (err) cb(null, {
        ret: 0,
        msg: err
      });
      if (arr.length == 0) {
        data.device_name = data.device_name + '001';
      } else {
        var device_name = arr[0].device_name;
        var index = Number(device_name.slice(-3)) + 1;
        data.device_name = data.device_name + ('000' + index.toString()).slice(-3);
      }
      d_vmrs.create(data, function (err, rs) {
        if (err) cb(null, {
          ret: 0,
          err: err,
          msg: '设备编号重复'
        });
        d_vmrs.app.models.d_status.create({
            device_nbr: rs.device_nbr,
            online_status: 1,
            fault_status: 2,
            fault_code: '',
            timeDiff: 0
          }, function (err, status) {
            if (err) cb(null, {
              ret: 0,
              msg: err
            });
            co(function *() {
            //添加抓拍相机
            try{
              var ca = thunkify(cameraAdd);
              for(var i = 0;i<camera.length;i++){
                camera[i].site_nbr = rs.device_nbr;
                camera[i].site_name = rs.device_name;
                var ca_callback = yield ca(camera[i]);
                if(!ca_callback){
                  cb(null,{
                    ret:0,
                    msg:"抓拍相机添加失败"
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
            logs.optLog("设备备案：添加电警" + rs.device_nbr, req.headers['x-forwarded-for'] ||
              req.connection.remoteAddress ||
              req.socket.remoteAddress ||
              req.connection.socket.remoteAddress, user);
            cb(null, {
              ret: 1,
              id: rs.id,
              msg: '新增成功'
            });
          });
        });
      })
    });

  };
  d_vmrs.remoteMethod('add', {
    description:'添加电警设备',
    accepts: {arg:'req', type:'Object',required:true,http: { source: 'req' }},
    http: {path:'/add',verb:'post'},
    returns: {arg: 'res', type: 'Object',root:true,required:true}
  });

  //删除
  d_vmrs.del = function (req, cb) {
    var data = req.body;
    var arr=[];
    data.id.split(",").forEach(function(item){
      arr.push(ObjectID(item));
    });
    var where = {_id:{inq: arr}};
    var device_nbr = [];
    var cameraId = [];
    d_vmrs.find({where:where},function (err, rs) {
      if (err) cb(null, err);
      for (var i = 0; i < rs.length; i++) {
        device_nbr.push(rs[i].device_nbr);
        cameraId.push(rs[i].id.toString());
      }
      var delwhere = {device_nbr: {inq: device_nbr}};
      d_vmrs.app.models.sys_device.destroyAll(delwhere, function (err, count) {
        if (err) cb(null, err);
        d_vmrs.destroyAll(where, function (err, info) {
          if (err) cb(null, err);
          co(function *() {
            //删除抓拍相机
            try {
              var cd = thunkify(cameraDelete);
              var param = {
                id:cameraId.join(',')
              };
              var cd_callback = yield cd(param);
              if (!cd_callback) {
                cb(null, {
                  ret: 0,
                  msg: '删除抓拍相机失败'
                })
              }
            } catch (e) {
              cb(null, {
                ret: 0,
                msg: e
              });
              return false;
            }
            var user = req.query.username;
            logs.optLog("设备备案：删除" + info.count + "个电警设备", req.headers['x-forwarded-for'] ||
              req.connection.remoteAddress ||
              req.socket.remoteAddress ||
              req.connection.socket.remoteAddress, user);
            cb(null, {
              ret: 1,
              msg: '删除成功'
            });
          });
        })
      });
    });
  };
  d_vmrs.remoteMethod('del', {
    description:'删除电警设备',
    accepts: {arg:'req', type:'Object',required:true,http: { source: 'req' }},
    http: {path:'/delete',verb:'post'},
    returns: {arg: 'res', type: 'Object',root:true,required:true}
  });

  //修改
  d_vmrs.up = function (req, cb) {
    var data = req.body;
    if(data.id=="undefined"){
      cb(null,errParamMsg);
    }
    var id = data.id;
    delete data['id'];
    var camera = JSON.parse(data.camera);
    delete data['camera'];
    if(data.metre!="") data.address = data.road_name + data.section_code + data.mileage+ '+' + data.metre + 'm';
    else data.address = data.road_name + data.section_code + data.mileage;
    d_vmrs.find({order:'_id DESC',where:{_id:ObjectID(id),address:data.address}},function (err, old) {
      if (err) cb(null, {
        ret: 0,
        msg: err
      });
      if(old.length==0){
        data.device_name = data.address + '电警';
        d_vmrs.find({order:'_id DESC',where:{address:data.address}},function (err, arr) {
          if (err) cb(null, {
            ret: 0,
            msg: err
          });
          if (arr.length == 0) {
            data.device_name = data.device_name + '001';
          } else {
            var device_name = arr[0].device_name;
            var index = Number(device_name.slice(-3)) + 1;
            data.device_name = data.device_name + ('000' + index.toString()).slice(-3);
          }
          d_vmrs.replaceById(id, data, {validate: true}, function (err, rs) {
            if (err) cb(null, {
              ret: 0,
              msg: err
            });
            d_vmrs.app.models.sys_device.updateAll({device_nbr:data.device_nbr},{device_name:data.device_name},function (err,info) {
              if (err) cb(null, {
                ret: 0,
                msg: err
              });
              co(function *() {
                //抓拍相机
                for(var i = 0;i<camera.length;i++){
                  //抓拍相机修改
                  if(camera[i].id&&camera[i].device_nbr){
                    camera[i].site_nbr = data.device_nbr;
                    camera[i].site_name = data.device_name;
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
                    camera[i].site_nbr = data.device_nbr;
                    camera[i].site_name = data.device_name;
                    var ca = thunkify(cameraAdd);
                    var ca_callback = yield ca(camera[i]);
                    if(!ca_callback){
                      cb(null,{
                        ret:0,
                        msg:'抓拍相机添加失败'
                      });
                      return false;
                    }
                  }
                }
                var user = req.query.username;
                logs.optLog("设备备案：修改电警设备" + rs.device_nbr, req.headers['x-forwarded-for'] ||
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
        data.device_name = old[0].device_name;
        d_vmrs.replaceById(id, data, {validate: true}, function (err, rs) {
          if (err) cb(null, {
            ret: 0,
            msg: err
          });
          co(function *() {
            //抓拍相机
            for(var i = 0;i<camera.length;i++){
              //抓拍相机修改
              if(camera[i].id&&camera[i].device_nbr){
                camera[i].site_nbr = data.device_nbr;
                camera[i].site_name = data.device_name;
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
                camera[i].site_nbr = data.device_nbr;
                camera[i].site_name = data.device_name;
                var ca = thunkify(cameraAdd);
                var ca_callback = yield ca(camera[i]);
                if(!ca_callback){
                  cb(null,{
                    ret:0,
                    msg:'抓拍相机添加失败'
                  });
                  return false;
                }
              }
            }
            var user = req.query.username;
            logs.optLog("设备备案：修改电警设备" + rs.device_nbr, req.headers['x-forwarded-for'] ||
              req.connection.remoteAddress ||
              req.socket.remoteAddress ||
              req.connection.socket.remoteAddress, user);
            cb(null, {
              ret: 1,
              msg: '修改成功'
            });
          });
        })
      }
    });
  };
  d_vmrs.remoteMethod('up', {
    description:'修改电警设备信息',
    accepts: {arg:'req', type:'Object',required:true,http: { source: 'req' }},
    http: {path:'/updateVmrs',verb:'post'},
    returns: {arg: 'res', type: 'Object',root:true,required:true}
  });
};
function findIndex(param,callback) {
  param.v.find({order:'_id DESC',where:{org_code:param.org_code,nbr_auto:1}},function (err, rs) {
    if(err) callback(err,null);
    callback(null,rs);
  })
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
    path:'/api/d_capture_cameras/update',
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
