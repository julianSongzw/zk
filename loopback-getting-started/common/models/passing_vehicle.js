/**
 * Created by dell on 2017/7/18.
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

module.exports = function(passing_vehicle) {

  //查询
  passing_vehicle.list = function (data, cb) {
    var filter = {
      order: '_id DESC',
      where: {}
    };
    if (data.device_nbr != "undefined" && data.device_nbr) filter.where.device_nbr = {regexp:data.device_nbr};
    if (data.plate_nbr != "undefined" && data.plate_nbr) filter.where.plate_nbr = {regexp:data.plate_nbr};
    if(data.passing_time_start!="undefined"&&data.passing_time_end!="undefined"&&data.passing_time_start&&data.passing_time_end) filter.where.passing_time = {between:[Number(data.passing_time_start),Number(data.passing_time_end)]};
    if (data.pageSize != "undefined" && data.pageIndex != "undefined" && data.pageSize && data.pageIndex) {
      filter.limit = Number(data.pageSize);
      filter.skip = (Number(data.pageIndex) - 1) * Number(data.pageSize);
    }
    passing_vehicle.find(filter, function (err, rs) {
      if (err) cb(null, errColMsg);
      passing_vehicle.count(filter.where, function (err, count) {
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
  passing_vehicle.remoteMethod('list', {
    description: '过车数据查询',
    accepts: {arg: 'data', type: 'Object', required: true, http: {source: 'body'}},
    http: {path: '/list', verb: 'post'},
    returns: {arg: 'res', type: 'Object', root: true, required: true}
  });
  //新增
  passing_vehicle.add = function (data, cb) {
    passing_vehicle.create(data,function (err, rs) {
      if(err) cb(null,{
        ret:0,
        msg:err
      });
      cb(null,{
        ret:1,
        id:rs.id,
        msg:'新增成功'
      });
    })
  };
  passing_vehicle.remoteMethod('add', {
    description:'过车数据入库',
    accepts: {arg:'data', type:'Object',required:true,http: { source: 'body' }},
    http: {path:'/add',verb:'post'},
    returns: {arg: 'res', type: 'Object',root:true,required:true}
  });
};
