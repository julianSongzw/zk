/**
 * Created by dell on 2017/7/7.
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

module.exports = function(d_violation_ball) {
  d_violation_ball.validatesUniquenessOf('device_nbr');
//查询
  d_violation_ball.list = function (data, cb) {
    var filter = {
      order:'_id DESC',
      include:['status','video','broadcast'],
      where:{}
    };
    if(data.device_nbr!="undefined"&&data.device_nbr) filter.where.device_nbr = {regexp:data.device_nbr};
    if(data.device_name!="undefined"&&data.device_name) filter.where.device_name = {regexp:data.device_name};
    if(data.org_code!="undefined"&&data.org_code) filter.where.org_code = data.org_code;
    if(data.sys_code!="undefined"&&data.sys_code) filter.where.sys_code = data.sys_code;
    if(data.pageSize!="undefined"&&data.pageIndex!="undefined"&&data.pageSize&&data.pageIndex) {
      filter.limit = Number(data.pageSize);
      filter.skip = (Number(data.pageIndex) - 1) * Number(data.pageSize);
    }

    d_violation_ball.find(filter,function (err, rs) {
      if(err) cb(null,errColMsg);
      d_violation_ball.count(filter.where,function (err, count) {

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
  d_violation_ball.remoteMethod('list', {
    description:'查询违停球机',
    accepts: {arg:'data', type:'Object',required:true,http: { source: 'body' }},
    http: {path:'/list',verb:'post'},
    returns: {arg: 'res', type: 'Object',root:true,required:true}
  });

  //新增
  d_violation_ball.add = function (req, cb) {
    var data = req.body;
    if(data.metre!="") data.address = data.road_name + data.section_code + data.mileage+ '+' + data.metre + 'm';
    else data.address = data.road_name + data.section_code + data.mileage;
    co(function *() {
      //查询4位序号
      try {
        var fi = thunkify(findIndex);
        var param = {
          org_code: data.org_code,
          v: d_violation_ball
        };
        var fiCb = yield fi(param);
        var index;
        if (fiCb) {
          if (fiCb.length == 0) {
            index = '120000';
          } else {
            index = '12' + ('0000' + (Number(fiCb[0].device_nbr.slice(-4)) + 1).toString()).slice(-4);
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
      data.device_name = data.address + '违停';
      d_violation_ball.find({order: '_id DESC', where: {address: data.address}}, function (err, arr) {
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
        d_violation_ball.create(data, function (err, rs) {
          if (err) cb(null, {
            ret: 0,
            err: err,
            msg: '设备编号重复'
          });
          //更新关联表sys_device
          // d_violation_ball.app.models.sys_device.create({device_nbr:data.device_nbr,device_name:data.device_name,device_type:12,sys_code:data.sys_code},function (err, a) {
          //   if (err) cb(null, {
          //     ret: 0,
          //     msg: err
          //   });
            //更新设备状态表d_status
            d_violation_ball.app.models.d_status.upsertWithWhere({device_nbr: rs.device_nbr}, {
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
              logs.optLog("设备备案：添加违停球机" + rs.device_nbr, req.headers['x-forwarded-for'] ||
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
  d_violation_ball.remoteMethod('add', {
    description:'添加违停球机',
    accepts: {arg:'req', type:'Object',required:true,http: { source: 'req' }},
    http: {path:'/add',verb:'post'},
    returns: {arg: 'res', type: 'Object',root:true,required:true}
  });

  //删除
  d_violation_ball.del = function (req, cb) {
    var data = req.body;
    var arr=[];
    data.id.split(",").forEach(function(item){
      arr.push(ObjectID(item));
    });
    var where = {_id:{inq: arr}};
    var device_nbr = [];
    d_violation_ball.find({where:where},function (err, rs) {
      if (err) cb(null, err);
      for (var i = 0; i < rs.length; i++) {
        device_nbr.push(rs[i].device_nbr);
      }
      var delwhere = {device_nbr: {inq: device_nbr}};
      d_violation_ball.app.models.sys_device.destroyAll(delwhere, function (err, count) {
        if (err) cb(null, err);
        d_violation_ball.destroyAll(where, function (err, info) {
          if (err) cb(null, err);
          var user = req.query.username;
          logs.optLog("设备备案：删除" + info.count + "个违停球机", req.headers['x-forwarded-for'] ||
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
  d_violation_ball.remoteMethod('del', {
    description:'删除违停球机',
    accepts: {arg:'req', type:'Object',required:true,http: { source: 'req' }},
    http: {path:'/delete',verb:'post'},
    returns: {arg: 'res', type: 'Object',root:true,required:true}
  });

  //修改
  d_violation_ball.up = function (req, cb) {
    var data = req.body;
    delete data['status'];
    delete data['video'];
    delete data['broadcast'];
    if(data.id=="undefined"){
      cb(null,errParamMsg);
    }
    var id = data.id;
    delete data['id'];
    if(data.metre!="") data.address = data.road_name + data.section_code + data.mileage+ '+' + data.metre + 'm';
    else data.address = data.road_name + data.section_code + data.mileage;
    d_violation_ball.find({order:'_id DESC',where:{_id:ObjectID(id),address:data.address}},function (err, old) {
      if (err) cb(null, {
        ret: 0,
        msg: err
      });
      if(old.length==0){
        data.device_name = data.address + '违停';
        d_violation_ball.find({order:'_id DESC',where:{address:data.address}},function (err, arr) {
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
          d_violation_ball.replaceById(id, data, {validate: true}, function (err, rs) {
            if (err) cb(null, {
              ret: 0,
              msg: err
            });
            d_violation_ball.app.models.sys_device.updateAll({device_nbr:data.device_nbr},{device_name:data.device_name},function (err,info) {
              if (err) cb(null, {
                ret: 0,
                msg: err
              });
              var user = req.query.username;
              logs.optLog("设备备案：修改违停球机" + rs.device_nbr, req.headers['x-forwarded-for'] ||
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
        d_violation_ball.replaceById(id, data, {validate: true}, function (err, rs) {
          if (err) cb(null, {
            ret: 0,
            msg: err
          });
          var user = req.query.username;
          logs.optLog("设备备案：修改违停球机" + rs.device_nbr, req.headers['x-forwarded-for'] ||
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
  d_violation_ball.remoteMethod('up', {
    description:'修改违停球机',
    accepts: {arg:'req', type:'Object',required:true,http: { source: 'req' }},
    http: {path:'/updateBall',verb:'post'},
    returns: {arg: 'res', type: 'Object',root:true,required:true}
  });
};
function findIndex(param,callback) {
  param.v.find({order:'_id DESC',where:{org_code:param.org_code,nbr_auto:1}},function (err, rs) {
    if(err) callback(err,null);
    callback(null,rs);
  })
}
