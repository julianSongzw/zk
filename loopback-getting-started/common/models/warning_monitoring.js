/**
 * Created by dell on 2017/7/3.
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

module.exports = function(warning_monitoring) {
  //分页查询
  warning_monitoring.list = function (data, cb) {
    var filter = {
      order:'upTime DESC',
      where:{
        delFlag:1
      }
    };
    if(data.state!="undefined"&&data.state){
      if(data.state.length){
        var arr = [];
        for(var i=0;i<data.state.length;i++){
          arr.push(Number(data.state[i]));
        }
        filter.where.state = {inq:arr};
      }else {
        filter.where.state = Number(data.state);
      }
    }

    if(data.sysCode!="undefined"&&data.sysCode) filter.where.sysCode = {regexp:data.sysCode};
    if(data.level!="undefined"&&data.level) filter.where.level = Number(data.level);
    if(data.upTimeStart!="undefined"&&data.upTimeEnd!="undefined"&&data.upTimeStart&&data.upTimeEnd) filter.where.upTime = {between:  [Number(data.upTimeStart),Number(data.upTimeEnd)]};
    if(data.pageSize!="undefined"&&data.pageIndex!="undefined"&&data.pageSize&&data.pageIndex) {
      filter.limit = Number(data.pageSize);
      filter.skip = (Number(data.pageIndex) - 1) * Number(data.pageSize);
    }
    warning_monitoring.find(filter,function (err, rs) {
      if(err) cb(null,errColMsg);
      warning_monitoring.count(filter.where,function (err, count) {
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
  warning_monitoring.remoteMethod('list', {
    description:'预警信息分页查询',
    accepts: {arg:'data', type:'Object',required:true,http: { source: 'body' }},
    http: {path:'/list',verb:'post'},
    returns: {arg: 'res', type: 'Object',root:true,required:true}
  });

  //新增
  warning_monitoring.add = function (data, cb) {
    data.delFlag = 1;
    warning_monitoring.create(data,function (err, rs) {
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
  warning_monitoring.remoteMethod('add', {
    description:'添加预警信息',
    accepts: {arg:'data', type:'Object',required:true,http: { source: 'body' }},
    http: {path:'/add',verb:'post'},
    returns: {arg: 'res', type: 'Object',root:true,required:true}
  });

  //删除
  warning_monitoring.del = function (req, cb) {
    var data = req.body;
    var arr=[];
    data.id.split(",").forEach(function(item){
      arr.push(ObjectID(item));
    });
    var where = {_id:{inq: arr}};
    warning_monitoring.updateAll(where,{delFlag:0},function (err, info) {
      if(err) cb(null,err);
      var user = req.query.username;
      logs.optLog("删除"+info.count+"个预警记录",req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.connection.socket.remoteAddress,user);
      cb(null,{
        ret:1,
        msg:'删除成功'
      });
    })
  };
  warning_monitoring.remoteMethod('del', {
    description:'删除预警信息',
    accepts: {arg:'req', type:'Object',required:true,http: { source: 'req' }},
    http: {path:'/delete',verb:'post'},
    returns: {arg: 'res', type: 'Object',root:true,required:true}
  });

  //修改
  warning_monitoring.up = function (req, cb) {
    var data = req.body;
    if(data.id=="undefined"){
      cb(null,errParamMsg);
    }
    var id = data.id;
    delete data['id'];
    warning_monitoring.updateAll({index:data.index},{state:Number(data.state)},function (err,rs) {
      if(err) cb(null,{
        ret:0,
        msg:err
      });
      warning_monitoring.app.models.meteorological_data.updateAll({index:data.index},{state:Number(data.state)},function (err,rs) {
        var logMsg;
        if(Number(data.state) ==3) {
          logMsg = '忽略预警';
        }
        if(Number(data.state) ==1) {
          logMsg = '处理预警';
        }
        var user = req.query.username;
        logs.optLog(logMsg+rs.index,req.headers['x-forwarded-for'] ||
          req.connection.remoteAddress ||
          req.socket.remoteAddress ||
          req.connection.socket.remoteAddress,user);
        cb(null,{
          ret:1,
          msg:'修改成功'
        });
      });
    })
  };
  warning_monitoring.remoteMethod('up', {
    description:'修改预警信息',
    accepts: {arg:'req', type:'Object',required:true,http: { source: 'req' }},
    http: {path:'/update',verb:'post'},
    returns: {arg: 'res', type: 'Object',root:true,required:true}
  });
};
