/**
 * Created by dell on 2017/7/26.
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

module.exports = function(z_vendor) {
//查询
  z_vendor.list = function (data, cb) {
    var filter = {
      order: '_id DESC',
      where: {}
    };
    if (data.vendor_type != "undefined" && data.vendor_type) filter.where.vendor_type = Number(data.vendor_type);
    if (data.vendor_name != "undefined" && data.vendor_name) filter.where.vendor_name = {regexp:data.vendor_name};
    if (data.pageSize != "undefined" && data.pageIndex != "undefined" && data.pageSize && data.pageIndex) {
      filter.limit = Number(data.pageSize);
      filter.skip = (Number(data.pageIndex) - 1) * Number(data.pageSize);
    }
    z_vendor.find(filter, function (err, rs) {
      if (err) cb(null, errColMsg);
      z_vendor.count(filter.where, function (err, count) {
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
  z_vendor.remoteMethod('list', {
    description: '厂商查询',
    accepts: {arg: 'data', type: 'Object', required: true, http: {source: 'body'}},
    http: {path: '/list', verb: 'post'},
    returns: {arg: 'res', type: 'Object', root: true, required: true}
  });
};
