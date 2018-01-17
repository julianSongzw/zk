/**
 * Created by dell on 2017/6/28.
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

module.exports = function(d_alarm) {
  d_alarm.validatesUniquenessOf('device_nbr');
  //分页查询
  d_alarm.list = function (data, cb) {
    var filter = {
      order:'_id DESC',
      where:{}
    };
    if(data.device_nbr!="undefined"&&data.device_nbr) filter.where.device_nbr = {regexp:data.device_nbr};
    if(data.device_name!="undefined"&&data.device_name) filter.where.device_name = {regexp:data.device_name};
    if(data.area_code!="undefined"&&data.area_code) filter.where.area_code = data.area_code;
    if(data.org_code!="undefined"&&data.org_code) filter.where.org_code = data.org_code;
    if(data.pageSize!="undefined"&&data.pageIndex!="undefined"&&data.pageSize&&data.pageIndex) {
      filter.limit = Number(data.pageSize);
      filter.skip = (Number(data.pageIndex) - 1) * Number(data.pageSize);
    }
    d_alarm.find(filter,function (err, rs) {
      if(err) cb(null,errColMsg);
      d_alarm.count(filter.where,function (err, count) {
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
  d_alarm.remoteMethod('list', {
    description:'声光报警器分页查询',
    accepts: {arg:'data', type:'Object',required:true,http: { source: 'body' }},
    http: {path:'/list',verb:'post'},
    returns: {arg: 'res', type: 'Object',root:true,required:true}
  });

  //新增
  d_alarm.add = function (req, cb) {
    var data = req.body;
    d_alarm.create(data,function (err, rs) {
      if(err) cb(null,{
        ret:0,
        err:err,
        msg:'设备编号重复'
      });
      var user = req.query.username;
      logs.optLog("设备备案：添加声光报警器"+rs.device_nbr,req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.connection.socket.remoteAddress,user);
      cb(null,{
        ret:1,
        id:rs.id,
        msg:'新增成功'
      });
    })
  };
  d_alarm.remoteMethod('add', {
    description:'添加声光报警器',
    accepts: {arg:'req', type:'Object',required:true,http: { source: 'req' }},
    http: {path:'/add',verb:'post'},
    returns: {arg: 'res', type: 'Object',root:true,required:true}
  });

  //删除
  d_alarm.del = function (req, cb) {
    var data = req.body;
    var arr=[];
    data.id.split(",").forEach(function(item){
      arr.push(ObjectID(item));
    });
    var where = {_id:{inq: arr}};
    d_alarm.destroyAll(where,function (err, info) {
      if(err) cb(null,err);
      var user = req.query.username;
      logs.optLog("设备备案：删除"+info.count+"个声光报警器",req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.connection.socket.remoteAddress,user);
      cb(null,{
        ret:1,
        msg:'删除成功'
      });
    })
  };
  d_alarm.remoteMethod('del', {
    description:'删除声光报警器',
    accepts: {arg:'req', type:'Object',required:true,http: { source: 'req' }},
    http: {path:'/delete',verb:'post'},
    returns: {arg: 'res', type: 'Object',root:true,required:true}
  });

  //修改
  d_alarm.up = function (req, cb) {
    var data = req.body;
    if(data.id=="undefined"){
      cb(null,errParamMsg);
    }
    var id = data.id;
    delete data['id'];
    d_alarm.replaceById(id,data,{validate:true},function (err,rs) {
      if(err) cb(null,{
        ret:0,
        msg:err
      });
      var user = req.query.username;
      logs.optLog("设备备案：修改声光报警器"+rs.device_nbr,req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.connection.socket.remoteAddress,user);
      cb(null,{
        ret:1,
        msg:'修改成功'
      });
    })
  };
  d_alarm.remoteMethod('up', {
    description:'修改声光报警器',
    accepts: {arg:'req', type:'Object',required:true,http: { source: 'req' }},
    http: {path:'/update',verb:'post'},
    returns: {arg: 'res', type: 'Object',root:true,required:true}
  });
};
