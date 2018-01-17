/**
 * Created by dell on 2017/7/17.
 */
var config = require('../../config');
var mongodb = require('mongodb');
var ObjectID = mongodb.ObjectID;

var errColMsg = {
  ret: 0,
  msg: '操作失败，数据库集合操作异常'
};
var errParamMsg = {
  ret: 0,
  msg: '操作失败，参数合法性验证'
};

module.exports = function(log_device_control) {
  //分页查询
  log_device_control.list = function (data, cb) {
    var filter = {
      order: '_id DESC',
      where: {}
    };
    if (data.eqtype != "undefined" && data.eqtype) filter.where.eqtype = Number(data.eqtype);
    if(data.opttime_start!="undefined"&&data.opttime_end!="undefined"&&data.opttime_start&&data.opttime_end) filter.where.opttime = {between:[Number(data.opttime_start),Number(data.opttime_end)]};
    if (data.pageSize != "undefined" && data.pageIndex != "undefined" && data.pageSize && data.pageIndex) {
      filter.limit = Number(data.pageSize);
      filter.skip = (Number(data.pageIndex) - 1) * Number(data.pageSize);
    }
     log_device_control.find(filter, function (err, rs) {
      if (err) cb(null, errColMsg);
      log_device_control.count(filter.where, function (err, count) {
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
  log_device_control.remoteMethod('list', {
    description: '设备操作日志查询',
    accepts: {arg: 'data', type: 'Object', required: true, http: {source: 'body'}},
    http: {path: '/list', verb: 'post'},
    returns: {arg: 'res', type: 'Object', root: true, required: true}
  });
};
