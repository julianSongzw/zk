/**
 * Created by dell on 2017/7/19.
 */
var config = require('../../config');
var mongodb = require('mongodb');
var ObjectID = mongodb.ObjectID;
var loopback = require('loopback');
var app = loopback();
var logs = require('../../logServer');
var errColMsg = {
  ret: 0,
  msg: '操作失败，数据库集合操作异常'
};
var errParamMsg = {
  ret: 0,
  msg: '操作失败，参数合法性验证'
};

module.exports = function(sys_role) {
  sys_role.validatesUniquenessOf('role_name');
//查询
  sys_role.list = function (data, cb) {
    var filter = {
      order:'_id DESC',
      include:'auths',
      where:{}
    };
    if(data.role_name!="undefined"&&data.role_name) filter.where.role_name = {regexp:data.role_name};
    if(data.pageSize!="undefined"&&data.pageIndex!="undefined"&&data.pageSize&&data.pageIndex) {
      filter.limit = Number(data.pageSize);
      filter.skip = (Number(data.pageIndex) - 1) * Number(data.pageSize);
    }
    sys_role.find(filter,function (err, rs) {
      if(err) cb(null,errColMsg);
      sys_role.count(filter.where,function (err, count) {
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
  sys_role.remoteMethod('list', {
    description:'查询角色权限',
    accepts: {arg:'data', type:'Object',required:true,http: { source: 'body' }},
    http: {path:'/list',verb:'post'},
    returns: {arg: 'res', type: 'Object',root:true,required:true}
  });

  //新增
  sys_role.add = function (req, cb) {
    var data = req.body;
    sys_role.create(data,function (err, rs) {
        if(err) cb(null,{
          ret:0,
          err:err,
          msg:'角色名重复'
        });
        var user = req.query.username;
        logs.optLog("添加新角色:"+rs.role_name,req.headers['x-forwarded-for'] ||
          req.connection.remoteAddress ||
          req.socket.remoteAddress ||
          req.connection.socket.remoteAddress,user);
        cb(null,{
          ret:1,
          id:rs.id,
          msg:'新增成功'
        });
      });
  };
  sys_role.remoteMethod('add', {
    description:'添加角色',
    accepts: {arg:'req', type:'Object',required:true,http: { source: 'req' }},
    http: {path:'/add',verb:'post'},
    returns: {arg: 'res', type: 'Object',root:true,required:true}
  });

  //删除
  sys_role.del = function (req, cb) {
    var data = req.body;
    var arr=[];
    data.id.split(",").forEach(function(item){
      arr.push(ObjectID(item));
    });
    var where = {_id:{inq: arr}};
    sys_role.destroyAll(where,function (err, info) {
      if(err) cb(null,err);
      sys_role.app.models.sys_auth.destroyAll({role_id:{inq: arr}},function (err, count) {
        if(err) cb(null,err);
        var user = req.query.username;
        logs.optLog("删除"+info.count+"个角色",req.headers['x-forwarded-for'] ||
          req.connection.remoteAddress ||
          req.socket.remoteAddress ||
          req.connection.socket.remoteAddress,user);
        cb(null,{
          ret:1,
          msg:'删除成功'
        });
      });

    })
  };
  sys_role.remoteMethod('del', {
    description:'删除角色',
    accepts: {arg:'req', type:'Object',required:true,http: { source: 'req' }},
    http: {path:'/delete',verb:'post'},
    returns: {arg: 'res', type: 'Object',root:true,required:true}
  });

};
