/**
 * Created by dell on 2017/7/14.
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

module.exports = function(z_road) {
//查询
  z_road.list = function (data, cb) {
    var filter = {
      order: '_id DESC',
      include:'sections',
      where: {}
    };
    if (data.road_code != "undefined" && data.road_code) filter.where.road_code = data.road_code;
    if (data.pageSize != "undefined" && data.pageIndex != "undefined" && data.pageSize && data.pageIndex) {
      filter.limit = Number(data.pageSize);
      filter.skip = (Number(data.pageIndex) - 1) * Number(data.pageSize);
    }
    z_road.find(filter, function (err, rs) {
      if (err) cb(null, errColMsg);
      z_road.count(filter.where, function (err, count) {
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
  z_road.remoteMethod('list', {
    description: '道路查询',
    accepts: {arg: 'data', type: 'Object', required: true, http: {source: 'body'}},
    http: {path: '/list', verb: 'post'},
    returns: {arg: 'res', type: 'Object', root: true, required: true}
  });
};
