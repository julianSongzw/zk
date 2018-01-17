/**
 * Created by dell on 2017/8/11.
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

module.exports = function(sys_auth) {

//修改
  sys_auth.up = function (req, cb) {
    var data = req.body;
    data.role_id = ObjectID(data.role_id);
    sys_auth.upsertWithWhere({role_id:data.role_id},data, function (err, rs) {
      if (err) cb(null, errColMsg);
      var user = req.query.username;
      logs.optLog("修改"+data.role_name+"权限",req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.connection.socket.remoteAddress,user);
      cb(null, {
          ret: 1,
          msg: '修改成功'
      });
    });

  };
  sys_auth.remoteMethod('up', {
    description: '修改权限',
    accepts: {arg: 'req', type: 'Object', required: true, http: {source: 'req'}},
    http: {path: '/update', verb: 'post'},
    returns: {arg: 'res', type: 'Object', root: true, required: true}
  });
};
