/**
 * Created by dell on 2017/6/30.
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

module.exports = function(s_threshold) {
//分页查询
  s_threshold.list = function (data, cb) {
    var filter = {
      order:'_id DESC',
      where:{}
    };
    if(data.thresholdType!="undefined"&&data.thresholdType) filter.where.thresholdType = Number(data.thresholdType);
    if(data.roadType!="undefined"&&data.roadType) filter.where.roadType = Number(data.roadType);
    if(data.level!="undefined"&&data.level) filter.where.level = Number(data.level);
    if(data.meterNbr!="undefined"&&data.meterNbr) filter.where.meterNbr = data.meterNbr;
    if(data.pageSize!="undefined"&&data.pageIndex!="undefined"&&data.pageSize&&data.pageIndex) {
      filter.limit = Number(data.pageSize);
      filter.skip = (Number(data.pageIndex) - 1) * Number(data.pageSize);
    }
    s_threshold.find(filter,function (err, rs) {
      if(err) cb(null,errColMsg);
      s_threshold.count(filter.where,function (err, count) {
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
  s_threshold.remoteMethod('list', {
    description:'气象阈值查询',
    accepts: {arg:'data', type:'Object',required:true,http: { source: 'body' }},
    http: {path:'/list',verb:'post'},
    returns: {arg: 'res', type: 'Object',root:true,required:true}
  });

  //新增
  s_threshold.add = function (req, cb) {
    var data = req.body;
    s_threshold.create(data,function (err, rs) {
      if(err) cb(null,{
        ret:0,
        msg:err
      });
      var threshold;
      switch(data.thresholdType)
      {
        case 0:
          threshold = '能见度';
          break;
        case 1:
          threshold = '结冰百分比';
          break;
        case 2:
          threshold = '水膜厚度';
          break;
        case 3:
          threshold = '路面温度';
          break;
      }
      var user = req.query.username;
      logs.optLog("添加"+threshold+"阈值",req.headers['x-forwarded-for'] ||
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
  s_threshold.remoteMethod('add', {
    description:'添加气象阈值',
    accepts: {arg:'req', type:'Object',required:true,http: { source: 'req' }},
    http: {path:'/add',verb:'post'},
    returns: {arg: 'res', type: 'Object',root:true,required:true}
  });

  //删除
  s_threshold.del = function (req, cb) {
    var data = req.body;
    var arr=[];
    data.id.split(",").forEach(function(item){
      arr.push(ObjectID(item));
    });
    var where = {_id:{inq: arr}};
    s_threshold.destroyAll(where,function (err, info) {
      if(err) cb(null,err);
      var user = req.query.username;
      logs.optLog("删除"+info.count+"条气象阈值",req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.connection.socket.remoteAddress,user);
      cb(null,{
        ret:1,
        msg:'删除成功'
      });
    })
  };
  s_threshold.remoteMethod('del', {
    description:'删除气象阈值',
    accepts: {arg:'req', type:'Object',required:true,http: { source: 'req' }},
    http: {path:'/delete',verb:'post'},
    returns: {arg: 'res', type: 'Object',root:true,required:true}
  });

  //修改
  s_threshold.up = function (req, cb) {
    var data = req.body;
    if(data.id=="undefined"){
      cb(null,errParamMsg);
    }
    var id = ObjectID(data.id);
    delete data['id'];
    s_threshold.updateAll({"_id":id},data,function (err,rs) {
      if(err) cb(null,{
        ret:0,
        msg:err
      });
      var user = req.query.username;
      logs.optLog("修改气象阈值",req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.connection.socket.remoteAddress,user);
      cb(null,{
        ret:1,
        msg:'修改成功'
      });
    })
  };
  s_threshold.remoteMethod('up', {
    description:'修改气象阈值',
    accepts: {arg:'req', type:'Object',required:true,http: { source: 'req' }},
    http: {path:'/update',verb:'post'},
    returns: {arg: 'res', type: 'Object',root:true,required:true}
  });
};
