/**
 * Created by dell on 2017/6/26.
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

module.exports = function(sys_code) {
//查询
  sys_code.listJson = function (cb) {
    sys_code.find(function (err, rs) {
      if(err) cb(null,errColMsg);
      var obj={};
      for (var i=0; i < rs.length; ++i) {
        if(!obj[rs[i].code_type]){
          obj[rs[i].code_type]={};
        }
        if(! obj[rs[i].code_type][rs[i].code_name]){
          obj[rs[i].code_type][rs[i].code_name]={};
        }
        obj[rs[i].code_type][rs[i].code_name]= rs[i].code_value;
      }
      var ret = {
        ret: 1,
        datas: obj,
        msg: '查询成功'
      };
      cb(null,ret);
    });
  };
  sys_code.remoteMethod('listJson', {
    description:'系统代码查询',
    http: {path:'/listJson',verb:'get'},
    returns: {arg: 'res', type: 'Object',root:true,required:true}
  });

  //新增
  sys_code.add = function (req, cb) {
    var data = req.body;
    var where = {
      "code_type": data.code_type,
      "code_name": data.code_name
    };
    sys_code.count(where,function (err, count) {
      if(count>0) {
        cb(null,{
          ret:0,
          msg:'该字典已存在'
        });
        return false;
      }
      sys_code.create(data,function (err, rs) {
        if(err) cb(null,{
          ret:0,
          msg:err
        });
        var user = req.query.username;
        logs.optLog("添加数据字典："+rs.code_value,req.headers['x-forwarded-for'] ||
          req.connection.remoteAddress ||
          req.socket.remoteAddress ||
          req.connection.socket.remoteAddress,user);
        cb(null,{
          ret:1,
          id:rs.id,
          msg:'新增成功'
        });
      })
    });
  };
  sys_code.remoteMethod('add', {
    description:'添加系统代码',
    accepts: {arg:'req', type:'Object',required:true,http: { source: 'req' }},
    http: {path:'/add',verb:'post'},
    returns: {arg: 'res', type: 'Object',root:true,required:true}
  });

  //删除
  sys_code.del = function (req, cb) {
    var data = req.body;
    var arr=[];
    data.id.split(",").forEach(function(item){
      arr.push(ObjectID(item));
    });
    var where = {_id:{inq: arr}};
    sys_code.destroyAll(where,function (err, info) {
      if(err) cb(null,err);
      var user = req.query.username;
      logs.optLog("删除"+info.count+"条系统代码",req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.connection.socket.remoteAddress,user);
      cb(null,{
        ret:1,
        msg:'删除成功'
      });
    })
  };
  sys_code.remoteMethod('del', {
    description:'删除系统代码',
    accepts: {arg:'req', type:'Object',required:true,http: { source: 'req' }},
    http: {path:'/delete',verb:'post'},
    returns: {arg: 'res', type: 'Object',root:true,required:true}
  });

  //修改
  sys_code.up = function (req, cb) {
    var data = req.body;
    if(data.id=="undefined"){
      cb(null,errParamMsg);
    }
    var id = data.id;
    delete data['id'];
    sys_code.replaceById(id,data,{validate:true},function (err,rs) {
      if(err) cb(null,{
        ret:0,
        msg:err
      });
      var user = req.query.username;
      logs.optLog("修改数据字典"+rs.code_value,req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.connection.socket.remoteAddress,user);
      cb(null,{
        ret:1,
        msg:'修改成功'
      });
    })
  };
  sys_code.remoteMethod('up', {
    description:'修改系统代码',
    accepts: {arg:'req', type:'Object',required:true,http: { source: 'req' }},
    http: {path:'/update',verb:'post'},
    returns: {arg: 'res', type: 'Object',root:true,required:true}
  });

  //分页查询
  sys_code.list = function (data, cb) {
    var filter = {
      order:['code_type ASC','sort_index ASC'],
      where:{}
    };
    if(data.code_type!="undefined"&&data.code_type) filter.where.code_type = {regexp:data.code_type};
    if(data.pageSize!="undefined"&&data.pageIndex!="undefined"&&data.pageSize&&data.pageIndex) {
      filter.limit = Number(data.pageSize);
      filter.skip = (Number(data.pageIndex) - 1) * Number(data.pageSize);
    }
    sys_code.find(filter,function (err, rs) {
      if(err) cb(null,errColMsg);
      sys_code.count(filter.where,function (err, count) {
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
  sys_code.remoteMethod('list', {
    description:'系统代码分页查询',
    accepts: {arg:'data', type:'Object',required:true,http: { source: 'body' }},
    http: {path:'/list',verb:'post'},
    returns: {arg: 'res', type: 'Object',root:true,required:true}
  });
};
