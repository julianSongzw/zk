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

module.exports = function(log_device_led_publish) {
  //分页查询
  log_device_led_publish.list = function (data, cb) {
    var filter = {
      order: '_id DESC',
      where: {}
    };
    if (data.led_nbr != "undefined" && data.led_nbr) filter.where.led_nbr = {regexp: data.led_nbr};
    if (data.content_type != "undefined" && data.content_type) filter.where.content_type = Number(data.content_type);
    if(data.publish_time_start!="undefined"&&data.publish_time_end!="undefined"&&data.publish_time_start&&data.publish_time_end) filter.where.publish_time = {between:  [Number(data.publish_time_start),Number(data.publish_time_end)]};
    if (data.pageSize != "undefined" && data.pageIndex != "undefined" && data.pageSize && data.pageIndex) {
      filter.limit = Number(data.pageSize);
      filter.skip = (Number(data.pageIndex) - 1) * Number(data.pageSize);
    }
    log_device_led_publish.find(filter, function (err, rs) {
      if (err) cb(null, errColMsg);
      log_device_led_publish.count(filter.where, function (err, count) {
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
  log_device_led_publish.remoteMethod('list', {
    description: '诱导屏发屏查询',
    accepts: {arg: 'data', type: 'Object', required: true, http: {source: 'body'}},
    http: {path: '/list', verb: 'post'},
    returns: {arg: 'res', type: 'Object', root: true, required: true}
  });
};
