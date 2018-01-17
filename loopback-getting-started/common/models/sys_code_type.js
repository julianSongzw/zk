/**
 * Created by dell on 2017/7/4.
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

module.exports = function(sys_code_type) {
  sys_code_type.validatesUniquenessOf('code_type');
  //分页查询
  sys_code_type.list = function (data, cb) {
    var filter = {
      order: '_id DESC',
      where: {}
    };
    if (data.code_type != "undefined"&&data.code_type) filter.where.code_type = {regexp: data.code_type};
    if (data.code_type_name != "undefined"&&data.code_type_name) filter.where.code_type_name = {regexp:data.code_type_name};
    if(data.pageSize!="undefined"&&data.pageIndex!="undefined"&&data.pageSize&&data.pageIndex) {
      filter.limit = Number(data.pageSize);
      filter.skip = (Number(data.pageIndex) - 1) * Number(data.pageSize);
    }
    sys_code_type.find(filter, function (err, rs) {
      if (err) cb(null, errColMsg);
      sys_code_type.count(filter.where, function (err, count) {
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
  sys_code_type.remoteMethod('list', {
    description: '系统代码类型分页查询',
    accepts: {arg: 'data', type: 'Object', required: true, http: {source: 'body'}},
    http: {path: '/list', verb: 'post'},
    returns: {arg: 'res', type: 'Object', root: true, required: true}
  });

  //新增
  sys_code_type.add = function (req, cb) {
    var data = req.body;
    sys_code_type.create(data, function (err, rs) {
      if (err) cb(null, {
        ret: 0,
        err: err,
        msg: '系统代码类型重复'
      });
      var user = req.query.username;
      logs.optLog("添加系统代码类型"+rs.code_type,req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.connection.socket.remoteAddress,user);
      cb(null, {
        ret: 1,
        id: rs.id,
        msg: '新增成功'
      });
    })
  };
  sys_code_type.remoteMethod('add', {
    description: '添加系统代码类型',
    accepts: {arg: 'req', type: 'Object', required: true, http: {source: 'req'}},
    http: {path: '/add', verb: 'post'},
    returns: {arg: 'res', type: 'Object', root: true, required: true}
  });

  //删除
  sys_code_type.del = function (req, cb) {
    var data = req.body;
    var arr = [];
    data.id.split(",").forEach(function (item) {
      arr.push(ObjectID(item));
    });
    var where = {_id: {inq: arr}};
    sys_code_type.destroyAll(where, function (err, info) {
      if (err) cb(null, err);
      var user = req.query.username;
      logs.optLog("删除"+info.count+"个系统代码类型",req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.connection.socket.remoteAddress,user);
      cb(null, {
        ret: 1,
        msg: '删除成功'
      });
    })
  };
  sys_code_type.remoteMethod('del', {
    description: '删除系统代码类型',
    accepts: {arg: 'req', type: 'Object', required: true, http: {source: 'req'}},
    http: {path: '/delete', verb: 'post'},
    returns: {arg: 'res', type: 'Object', root: true, required: true}
  });

  //修改
  sys_code_type.up = function (req, cb) {
    var data = req.body;
    if (data.id == "undefined") {
      cb(null, errParamMsg);
    }
    var id = data.id;
    delete data['id'];
    sys_code_type.replaceById(id, data,{validate:true}, function (err, rs) {
      if (err) cb(null, {
        ret: 0,
        msg: err
      });
      var user = req.query.username;
      logs.optLog("修改系统代码类型"+rs.code_type,req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.connection.socket.remoteAddress,user);
      cb(null, {
        ret: 1,
        msg: '修改成功'
      });
    })
  };
  sys_code_type.remoteMethod('up', {
    description: '修改系统代码类型',
    accepts: {arg: 'req', type: 'Object', required: true, http: {source: 'req'}},
    http: {path: '/update', verb: 'post'},
    returns: {arg: 'res', type: 'Object', root: true, required: true}
  });
};
