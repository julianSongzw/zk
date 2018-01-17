/**
 * Created by dell on 2017/6/28.
 */
var config = require('../../config');
var mongodb = require('mongodb');
var ObjectID = mongodb.ObjectID;
var logs = require('../../logServer');
var co = require('co');
var thunkify = require('thunkify');
var errColMsg = {
  ret: 0,
  msg: '操作失败，数据库集合操作异常'
};
var errParamMsg = {
  ret: 0,
  msg: '操作失败，参数合法性验证'
};

module.exports = function(d_vms) {
  d_vms.validatesUniquenessOf('device_nbr');
  //分页查询
  d_vms.list = function (data, cb) {
    var filter = {
      order:'_id DESC',
      include:['status','video'],
      where:{}
    };
    if(data.device_nbr!="undefined"&&data.device_nbr) filter.where.device_nbr = {regexp:data.device_nbr};
    if(data.device_name!="undefined"&&data.device_name) filter.where.device_name = {regexp:data.device_name};
    if(data.vms_type!="undefined"&&data.vms_type) filter.where.vms_type = Number(data.vms_type);
    if(data.sys_screen_type!="undefined"&&data.sys_screen_type) filter.where.sys_screen_type = Number(data.sys_screen_type);
    if(data.area_code!="undefined"&&data.area_code) filter.where.area_code = data.area_code;
    if(data.org_code!="undefined"&&data.org_code) filter.where.org_code = data.org_code;
    if(data.interface_type!="undefined"&&data.interface_type) filter.where.interface_type = Number(data.interface_type);
    if(data.site_nbr!="undefined"&&data.site_nbr) filter.where.site_nbr = data.site_nbr;
    if(data.sys_code!="undefined"&&data.sys_code) filter.where.sys_code = data.sys_code;
    if(data.pageSize!="undefined"&&data.pageIndex!="undefined"&&data.pageSize&&data.pageIndex) {
      filter.limit = Number(data.pageSize);
      filter.skip = (Number(data.pageIndex) - 1) * Number(data.pageSize);
    }
    d_vms.find(filter,function (err, rs) {
      if(err) cb(null,errColMsg);
      d_vms.count(filter.where,function (err, count) {
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
  d_vms.remoteMethod('list', {
    description:'诱导屏分页查询',
    accepts: {arg:'data', type:'Object',required:true,http: { source: 'body' }},
    http: {path:'/list',verb:'post'},
    returns: {arg: 'res', type: 'Object',root:true,required:true}
  });

  //新增
  d_vms.add = function (req, cb) {
    var data = req.body;
    data.set = {};
    data.text = '';
    if(data.metre!="") data.address = data.road_name + data.section_code + data.mileage+ '+' + data.metre + 'm';
    else data.address = data.road_name + data.section_code + data.mileage;
    co(function *() {
      //查询4位序号
      try {
        var fi = thunkify(findIndex);
        var param = {
          org_code: data.org_code,
          v: d_vms
        };
        var fiCb = yield fi(param);
        var index;
        if (fiCb) {
          if (fiCb.length == 0) {
            index = '080000';
          } else {
            index = '08' + ('0000' + (Number(fiCb[0].device_nbr.slice(-4)) + 1).toString()).slice(-4);
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
      data.device_name = data.address + '诱导屏';
      d_vms.find({order: '_id DESC', where: {address: data.address}}, function (err, arr) {
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
        d_vms.create(data, function (err, rs) {
          if (err) cb(null, {
            ret: 0,
            err: err,
            msg: '设备编号重复'
          });
          var device_type;
          if(data.sys_screen_type==0) device_type = 8;
          if(data.sys_screen_type==1) device_type = 16;
          //更新关联表sys_device
          // d_vms.app.models.sys_device.create({device_nbr:data.device_nbr,device_name:data.device_name,device_type:device_type,sys_code:data.sys_code},function (err, a) {
          //   if (err) cb(null, {
          //     ret: 0,
          //     msg: err
          //   });
            //更新设备状态表d_status
            d_vms.app.models.d_status.upsertWithWhere({device_nbr: rs.device_nbr}, {
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
              var user = req.query.username;
              logs.optLog("设备备案：添加诱导屏" + rs.device_nbr, req.headers['x-forwarded-for'] ||
                req.connection.remoteAddress ||
                req.socket.remoteAddress ||
                req.connection.socket.remoteAddress, user);
              cb(null, {
                ret: 1,
                id: rs.id,
                msg: '新增成功'
              });
            });
          // });
        })
      });
    });
  };
  d_vms.remoteMethod('add', {
    description:'添加诱导屏',
    accepts: {arg:'req', type:'Object',required:true,http: { source: 'req' }},
    http: {path:'/add',verb:'post'},
    returns: {arg: 'res', type: 'Object',root:true,required:true}
  });

  //删除
  d_vms.del = function (req, cb) {
    var data = req.body;
    var arr=[];
    data.id.split(",").forEach(function(item){
      arr.push(ObjectID(item));
    });
    var where = {_id:{inq: arr}};
    var device_nbr = [];
    d_vms.find({where:where},function (err, rs) {
      if (err) cb(null, err);
      for (var i = 0; i < rs.length; i++) {
        device_nbr.push(rs[i].device_nbr);
      }
      var delwhere = {device_nbr: {inq: device_nbr}};
      d_vms.app.models.sys_device.destroyAll(delwhere, function (err, count) {
        if (err) cb(null, err);
        d_vms.destroyAll(where, function (err, info) {
          if (err) cb(null, err);
          var user = req.query.username;
          logs.optLog("设备备案：删除" + info.count + "个诱导屏", req.headers['x-forwarded-for'] ||
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
  };
  d_vms.remoteMethod('del', {
    description:'删除诱导屏',
    accepts: {arg:'req', type:'Object',required:true,http: { source: 'req' }},
    http: {path:'/delete',verb:'post'},
    returns: {arg: 'res', type: 'Object',root:true,required:true}
  });

  //修改
  d_vms.up = function (req, cb) {
    var data = req.body;
    delete data['status'];
    delete data['video'];
    data.set = JSON.parse(data.set);
    if(data.id=="undefined"){
      cb(null,errParamMsg);
    }
    var id = data.id;
    delete data['id'];
    data.set = JSON.parse(data.set);
    if(data.metre!="") data.address = data.road_name + data.section_code + data.mileage+ '+' + data.metre + 'm';
    else data.address = data.road_name + data.section_code + data.mileage;
    d_vms.find({order:'_id DESC',where:{_id:ObjectID(id),address:data.address}},function (err, old) {
      if (err) cb(null, {
        ret: 0,
        msg: err
      });
      if(old.length==0){
        data.device_name = data.address + '诱导屏';
        d_vms.find({order:'_id DESC',where:{address:data.address}},function (err, arr) {
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
          d_vms.replaceById(id, data, {validate: true}, function (err, rs) {
            if (err) cb(null, {
              ret: 0,
              msg: err
            });
            d_vms.app.models.sys_device.updateAll({device_nbr:data.device_nbr},{device_name:data.device_name},function (err,info) {
              if (err) cb(null, {
                ret: 0,
                msg: err
              });
              var user = req.query.username;
              logs.optLog("设备备案：修改诱导屏" + rs.device_nbr, req.headers['x-forwarded-for'] ||
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
      }else {
        data.device_name = old[0].device_name;
        d_vms.replaceById(id, data, {validate: true}, function (err, rs) {
          if (err) cb(null, {
            ret: 0,
            msg: err
          });
          var user = req.query.username;
          logs.optLog("设备备案：修改诱导屏" + rs.device_nbr, req.headers['x-forwarded-for'] ||
            req.connection.remoteAddress ||
            req.socket.remoteAddress ||
            req.connection.socket.remoteAddress, user);
          cb(null, {
            ret: 1,
            msg: '修改成功'
          });
        })
      }
    });
  };
  d_vms.remoteMethod('up', {
    description:'修改诱导屏信息',
    accepts: {arg:'req', type:'Object',required:true,http: { source: 'req' }},
    http: {path:'/updateVms',verb:'post'},
    returns: {arg: 'res', type: 'Object',root:true,required:true}
  });
};
function findIndex(param,callback) {
  param.v.find({order:'_id DESC',where:{org_code:param.org_code,nbr_auto:1}},function (err, rs) {
    if(err) callback(err,null);
    callback(null,rs);
  })
}
