/**
 * Created by dell on 2017/7/18.
 */
var config = require('../../config');
var mongodb = require('mongodb');
var ObjectID = mongodb.ObjectID;
var logs = require('../../logServer');

var errColMsg = {
  ret: 0,
  msg: '操作失败，数据库集合操作异常'
};
var errParamMsg = {
  ret: 0,
  msg: '操作失败，参数合法性验证'
};

module.exports = function(violation_vehicle) {
  //查询
  violation_vehicle.list = function (data, cb) {
    var filter = {
      order: '_id DESC',
      include: 'vioCode',
      where: {
        whitelist: '1',
      },
    };
    if (data.site_nbr != "undefined" && data.site_nbr) filter.where.site_nbr = {regexp:data.site_nbr};
    if (data.device_nbr != "undefined" && data.device_nbr) filter.where.device_nbr = {regexp:data.device_nbr};
    if (data.plate_nbr != "undefined" && data.plate_nbr) filter.where.plate_nbr = {regexp:data.plate_nbr};
    if (data.plate_area != "undefined" && data.plate_area) filter.where.plate_area = {regexp:data.plate_area};
    if (data.violation_behaviors != "undefined" && data.violation_behaviors&&data.violation_behaviors!="[]") filter.where.violation_behaviors = {inq:JSON.parse(data.violation_behaviors)};
    if (data.passing_time_start!="undefined"&&data.passing_time_end!="undefined"&&data.passing_time_start&&data.passing_time_end) filter.where.passing_time = {between: [Number(data.passing_time_start),Number(data.passing_time_end)]};
    if (data.pageSize != "undefined" && data.pageIndex != "undefined" && data.pageSize && data.pageIndex) {
      filter.limit = Number(data.pageSize);
      filter.skip = (Number(data.pageIndex) - 1) * Number(data.pageSize);
    }
    violation_vehicle.find(filter, function (err, rs) {
      if (err) cb(null, errColMsg);
      violation_vehicle.count(filter.where, function (err, count) {
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
  violation_vehicle.remoteMethod('list', {
    description: '违法记录查询',
    accepts: {arg: 'data', type: 'Object', required: true, http: {source: 'body'}},
    http: {path: '/list', verb: 'post'},
    returns: {arg: 'res', type: 'Object', root: true, required: true}
  });

  //新增
  violation_vehicle.add = function (data, cb) {
    violation_vehicle.create(data,function (err, rs) {
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
  violation_vehicle.remoteMethod('add', {
    description:'违法数据入库',
    accepts: {arg:'data', type:['Object'],required:true,http: { source: 'body' }},
    http: {path:'/add',verb:'post'},
    returns: {arg: 'res', type: 'Object',root:true,required:true}
  });

  //删除
  violation_vehicle.del = function (req, cb) {
    var data = req.body;
    var arr=[];
    data.id.split(",").forEach(function(item){
      arr.push(ObjectID(item));
    });
    var where = {_id:{inq: arr}};
    violation_vehicle.destroyAll(where,function (err, info) {
      if(err) cb(null,err);
      var user = req.query.username;
      logs.optLog("删除"+info.count+"条违法记录",req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.connection.socket.remoteAddress,user);
      cb(null,{
        ret:1,
        msg:'删除成功'
      });
    })
  };
  violation_vehicle.remoteMethod('del', {
    description:'删除违法记录',
    accepts: {arg:'req', type:'Object',required:true,http: { source: 'req' }},
    http: {path:'/delete',verb:'post'},
    returns: {arg: 'res', type: 'Object',root:true,required:true}
  });
};

