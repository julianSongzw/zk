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
  msg: '操作失败，数据库集合操作异常',
};
var errParamMsg = {
  ret: 0,
  msg: '操作失败，参数合法性验证',
};

module.exports = function(d_vsl) {
  d_vsl.validatesUniquenessOf('device_nbr');
  //分页查询
  d_vsl.list = function (data, cb) {
    var filter = {
      order: '_id DESC',
      include: ['status', 'video', 'programList'],
      where: {}
    };
    if (data.device_nbr != "undefined" && data.device_nbr) filter.where.device_nbr = {regexp: data.device_nbr};
    if (data.device_name != "undefined" && data.device_name) filter.where.device_name = {regexp: data.device_name};
    if (data.area_code != "undefined" && data.area_code) filter.where.area_code = data.area_code;
    if (data.org_code != "undefined" && data.org_code) filter.where.org_code = data.org_code;
    if (data.sys_code != "undefined" && data.sys_code) filter.where.sys_code = data.sys_code;
    if (data.pageSize != "undefined" && data.pageIndex != "undefined" && data.pageSize && data.pageIndex) {
      filter.limit = Number(data.pageSize);
      filter.skip = (Number(data.pageIndex) - 1) * Number(data.pageSize);
    }
    d_vsl.find(filter, function (err, rs) {
      if (err) cb(null, errColMsg);
      d_vsl.count(filter.where, function (err, count) {
        if (err) cb(null, errColMsg);
        cb(null, {
          ret: 1,
          datas: rs,
          msg: '查询成功',
          count: count
        });
      });
    });
  };
  d_vsl.remoteMethod('list', {
    description: '可变限速牌分页查询',
    accepts: {arg: 'data', type: 'Object', required: true, http: {source: 'body'}},
    http: {path: '/list', verb: 'post'},
    returns: {arg: 'res', type: 'Object', root: true, required: true}
  });

  //新增
  d_vsl.add = function (req, cb) {
    var data = req.body;
    data.set = {};
    data.text = '';
    if (data.metre != "") data.address = data.road_name + data.section_code + data.mileage + '+' + data.metre + 'm';
    else data.address = data.road_name + data.section_code + data.mileage;
    co(function* () {
      //查询4位序号
      try {
        var fi = thunkify(findIndex);
        var param = {
          org_code: data.org_code,
          v: d_vsl
        };
        var fiCb = yield fi(param);
        var index;
        if (fiCb) {
          if (fiCb.length == 0) {
            index = '020000';
          } else {
            index = '02' + ('0000' + (Number(fiCb[0].device_nbr.slice(-4)) + 1).toString()).slice(-4);
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
      if (data.vsl_type == '0') data.device_name = data.address + '限速牌';
      if (data.vsl_type == '1') data.device_name = data.address + '解除限速牌';
      d_vsl.find({order: '_id DESC', where: {address: data.address}}, function (err, arr) {
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
        d_vsl.create(data, function (err, rs) {
          if (err) cb(null, {
            ret: 0,
            err: err,
            msg: '设备编号重复'
          });
          var device_type;
          if (data.vsl_type == 0) {
            device_type = 2
          }
          if (data.vsl_type == 1) {
            device_type = 17
          }
          //更新关联表sys_device
          // d_vsl.app.models.sys_device.create({device_nbr:data.device_nbr,device_name:data.device_name,device_type:device_type,sys_code:data.sys_code},function (err, a) {
          //   if (err) cb(null, {
          //     ret: 0,
          //     msg: err
          //   });
          //更新设备状态表d_status
          d_vsl.app.models.d_status.upsertWithWhere({device_nbr: rs.device_nbr}, {
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
            var device_type1;
            if (data.vsl_type == 0) {
              device_type1 = 18
            }
            if (data.vsl_type == 1) {
              device_type1 = 19
            }
            d_vsl.app.models.sys_device.updateAll({device_nbr: data.video_nbr}, {device_type: device_type1}, function (err, b) {
              if (err) cb(null, {
                ret: 0,
                msg: err
              });
              var user = req.query.username;
              logs.optLog("设备备案：添加可变限速牌" + rs.device_nbr, req.headers['x-forwarded-for'] ||
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
          // });
        })
      });
    });
  };
  d_vsl.remoteMethod('add', {
    description: '添加可变限速牌',
    accepts: {arg: 'req', type: 'Object', required: true, http: {source: 'req'}},
    http: {path: '/add', verb: 'post'},
    returns: {arg: 'res', type: 'Object', root: true, required: true}
  });

  //删除
  d_vsl.del = function (req, cb) {
    var data = req.body;
    var arr = [];
    data.id.split(",").forEach(function (item) {
      arr.push(ObjectID(item));
    });
    var where = {_id: {inq: arr}};
    d_vsl.destroyAll(where, function (err, info) {
      if (err) cb(null, err);
      var user = req.query.username;
      logs.optLog("设备备案：删除" + info.count + "个可变限速牌", req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.connection.socket.remoteAddress, user);
      cb(null, {
        ret: 1,
        msg: '删除成功'
      });
    })
  };
  d_vsl.remoteMethod('del', {
    description: '删除可变限速牌',
    accepts: {arg: 'req', type: 'Object', required: true, http: {source: 'req'}},
    http: {path: '/delete', verb: 'post'},
    returns: {arg: 'res', type: 'Object', root: true, required: true}
  });

  //修改
  d_vsl.up = function (req, cb) {
    var data = req.body;
    data.set = JSON.parse(data.set);
    // data.speed_band = JSON.parse(data.speed_band);
    delete data['status'];
    delete data['video'];
    if (data.id == "undefined") {
      cb(null, errParamMsg);
    }
    var id = data.id;
    delete data['id'];
    if (data.metre != "") data.address = data.road_name + data.section_code + data.mileage + '+' + data.metre + 'm';
    else data.address = data.road_name + data.section_code + data.mileage;
    d_vsl.find({order: '_id DESC', where: {_id: ObjectID(id), address: data.address}}, function (err, old) {
      if (err) cb(null, {
        ret: 0,
        msg: err
      });
      if (old.length == 0) {
        if (data.vsl_type == '0') data.device_name = data.address + '限速牌';
        if (data.vsl_type == '1') data.device_name = data.address + '解除限速牌';
        d_vsl.find({order: '_id DESC', where: {address: data.address}}, function (err, arr) {
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
          d_vsl.replaceById(id, data, {validate: true}, function (err, rs) {
            if (err) cb(null, {
              ret: 0,
              msg: err
            });
            d_vsl.app.models.sys_device.updateAll({device_nbr: data.device_nbr}, {device_name: data.device_name}, function (err, info) {
              if (err) cb(null, {
                ret: 0,
                msg: err
              });
              var user = req.query.username;
              logs.optLog("设备备案：修改可变限速牌" + rs.device_nbr, req.headers['x-forwarded-for'] ||
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
      } else {
        data.device_name = old[0].device_name;
        d_vsl.replaceById(id, data, {validate: true}, function (err, rs) {
          if (err) cb(null, {
            ret: 0,
            msg: err
          });
          var user = req.query.username;
          logs.optLog("设备备案：修改可变限速牌" + rs.device_nbr, req.headers['x-forwarded-for'] ||
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
  d_vsl.remoteMethod('up', {
    description: '修改可变限速牌',
    accepts: {arg: 'req', type: 'Object', required: true, http: {source: 'req'}},
    http: {path: '/updateVsl', verb: 'post'},
    returns: {arg: 'res', type: 'Object', root: true, required: true}
  });
};

function findIndex(param, callback) {
  param.v.find({order: '_id DESC', where: {org_code: param.org_code, nbr_auto: 1}}, function (err, rs) {
    if (err) callback(err, null);
    callback(null, rs);
  })
}
