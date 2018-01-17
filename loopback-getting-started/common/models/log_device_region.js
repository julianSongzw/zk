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

module.exports = function(log_device_region) {
  //分页查询
  log_device_region.list = function (data, cb) {
    var filter = {
      order: '_id DESC',
      where: {}
    };
    if (data.region_nbr != "undefined" && data.region_nbr) filter.where.region_nbr = {regexp: data.region_nbr};
    if(data.change_time_start!="undefined"&&data.change_time_end!="undefined"&&data.change_time_start&&data.change_time_end) filter.where.change_time = {between:  [Number(data.change_time_start),Number(data.change_time_end)]};
    if (data.pageSize != "undefined" && data.pageIndex != "undefined" && data.pageSize && data.pageIndex) {
      filter.limit = Number(data.pageSize);
      filter.skip = (Number(data.pageIndex) - 1) * Number(data.pageSize);
    }
    log_device_region.find(filter, function (err, rs) {
      if (err) cb(null, errColMsg);
      log_device_region.count(filter.where, function (err, count) {
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
  log_device_region.remoteMethod('list', {
    description: '区间变更查询',
    accepts: {arg: 'data', type: 'Object', required: true, http: {source: 'body'}},
    http: {path: '/list', verb: 'post'},
    returns: {arg: 'res', type: 'Object', root: true, required: true}
  });
};
