/**
 * Created by dell on 2017/7/31.
 */
var config = require('../../config');
var mongodb = require('mongodb');
var ObjectID = mongodb.ObjectID;
var areaData = require('../../areaData');

var errColMsg = {
  ret: 0,
  msg: '操作失败，数据库集合操作异常'
};
var errParamMsg = {
  ret: 0,
  msg: '操作失败，参数合法性验证'
};

module.exports = function(sys_device) {
//查询
  sys_device.list = function (data, cb) {
    var filter = {
      order: '_id DESC',
      where: {}
    };
    if (data.sys_code != "undefined" && data.sys_code) filter.where.sys_code = data.sys_code;
    if (data.device_nbr != "undefined" && data.device_nbr) filter.where.device_nbr = data.device_nbr;
    if (data.device_type != "undefined" && data.device_type) filter.where.device_type = Number(data.device_type);
    if (data.pageSize != "undefined" && data.pageIndex != "undefined" && data.pageSize && data.pageIndex) {
      filter.limit = Number(data.pageSize);
      filter.skip = (Number(data.pageIndex) - 1) * Number(data.pageSize);
    }
    sys_device.find(filter, function (err, rs) {
      if (err) cb(null, errColMsg);
      sys_device.count(filter.where, function (err, count) {
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
  sys_device.remoteMethod('list', {
    description: '查询',
    accepts: {arg: 'data', type: 'Object', required: true, http: {source: 'body'}},
    http: {path: '/list', verb: 'post'},
    returns: {arg: 'res', type: 'Object', root: true, required: true}
  });

  //新增
  sys_device.add = function (cb) {
    sys_device.create(areaData, function (err, rs) {
      if (err) cb(null, {
        ret: 0,
        msg: err
      });
      cb(null, {
        ret: 1,
        msg: '新增成功'
      });
    })
  };
  sys_device.remoteMethod('add', {
    description: '添加',
    http: {path: '/add', verb: 'get'},
    returns: {arg: 'res', type: 'Object', root: true, required: true}
  });
};
