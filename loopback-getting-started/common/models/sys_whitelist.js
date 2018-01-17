/* eslint-disable max-len */
/**

 * @Title: whitelist
 * @Description: 白名单接口
 * @author songzw@cychina.cn （宋志玮）
 * @date 2017/11/13
 * @version V1.0
 * @Revision : $
 * @Id: $
 *
 * Company: 合肥安慧软件有限公司
 * Copyright: Copyright (c) 2017
 */
'use strict';
let mongodb = require('mongodb');
let ObjectID = mongodb.ObjectID;
let logs = require('../../logServer');
let co = require('co');
let thunkify = require('thunkify');
let errColMsg = {
  ret: 0,
  msg: '操作失败，数据库集合操作异常',
};
let errParamMsg = {
  ret: 0,
  msg: '操作失败，参数合法性验证',
};

module.exports = function(whitelist) {
  // 查询
  whitelist.list = function(data, cb) {
    whitelist.validatesUniquenessOf('plate_nbr');
    let filter = {
      order: '_id DESC',
      where: {},
    };
    if (data.plate_nbr != 'undefined' && data.plate_nbr) filter.where['plate_nbr'] = {regexp: data.plate_nbr};
    if (data.plate_area != 'undefined' && data.plate_area) filter.where['plate_area'] = {regexp: data.plate_area};
    if (data.plate_color != 'undefined' && data.plate_color) filter.where['plate_color'] = {regexp: data.plate_color};
    if (data.upTimeStart != 'undefined' && data.upTimeEnd != 'undefined' && data.upTimeStart && data.upTimeEnd) filter.where.upTime = {between: [Number(data.upTimeStart), Number(data.upTimeEnd)]};
    if (data.pageSize != 'undefined' && data.pageIndex != 'undefined' && data.pageSize && data.pageIndex) {
      filter.limit = Number(data.pageSize);
      filter.skip = (Number(data.pageIndex) - 1) * Number(data.pageSize);
    }
    whitelist.find(filter, function(err, rs) {
      if (err) cb(null, errColMsg);
      whitelist.count(filter.where, function(err, count) {
        if (err) cb(null, errColMsg);
        cb(null, {
          ret: 1,
          datas: rs,
          msg: '查询成功',
          count: count,
        });
      });
    });
  };
  whitelist.remoteMethod('list', {
    description: '白名单查询',
    accepts: {arg: 'data', type: 'Object', required: true, http: {source: 'body'}},
    http: {path: '/list', verb: 'post'},
    returns: {arg: 'res', type: 'Object', root: true, required: true},
  });

  // 新增
  whitelist.add = function(req, cb) {
    let data = req.body;
    data['plate_area'] = data.plate_nbr.substring(0, 1);
    data['upTime'] = Date.now();
    whitelist.create(data, function(err, rs) {
      if (err) cb(null, {
        ret: 0,
        err: err,
        msg: '已存在',
      });
      whitelist.app.models.violation_vehicle.updateAll({'plate_nbr': data.plate_nbr, 'plate_color': data.plate_color}, {'whitelist': '0'}, function(err, up) {
        if (err) cb(null, {
          ret: 0,
          msg: err,
        });
        let user = req.query.username;
        logs.optLog('添加白名单' + rs.plate_nbr, req.headers['x-forwarded-for'] ||
          req.connection.remoteAddress ||
          req.socket.remoteAddress ||
          req.connection.socket.remoteAddress, user);
        cb(null, {
          ret: 1,
          id: rs.id,
          msg: '新增成功',
        });
      });
    });
  };
  whitelist.remoteMethod('add', {
    description: '添加白名单',
    accepts: {arg: 'req', type: 'Object', required: true, http: {source: 'req'}},
    http: {path: '/add', verb: 'post'},
    returns: {arg: 'res', type: 'Object', root: true, required: true},
  });

  // 删除
  whitelist.del = function(req, cb) {
    let data = req.body;
    let arr = [];
    data.id.split(',').forEach(function(item) {
      arr.push(ObjectID(item));
    });
    let where = {_id: {inq: arr}};
    co(function *() {
      try {
        let fd = thunkify(findList);
        let param = {
          _id: {inq: arr},
          w: whitelist,
        };
        let list = yield fd(param);
        if (list) {
          let de = thunkify(deleteList);
          let deResult = yield de(param);
          let up = thunkify(vioUp);
          if (deResult) {
            for (let i = 0; i < list.length; i++) {
              param['plate_nbr'] = list[i].plate_nbr;
              param['plate_color'] = list[i].plate_color;
              let upR = yield up(param);
              if (!upR) {
                cb(null, {
                  ret: 0,
                  msg: '白名单设置异常',
                });
              }
            }
            let user = req.query.username;
            logs.optLog('删除' + deResult.count + '条白名单', req.headers['x-forwarded-for'] ||
              req.connection.remoteAddress ||
              req.socket.remoteAddress ||
              req.connection.socket.remoteAddress, user);
            cb(null, {
              ret: 1,
              msg: '删除成功',
            });
          }
        }
      } catch (e) {
        cb(null, {
          ret: 0,
          msg: e,
        });
      }
    });
  };
  whitelist.remoteMethod('del', {
    description: '删除白名单',
    accepts: {arg: 'req', type: 'Object', required: true, http: {source: 'req'}},
    http: {path: '/delete', verb: 'post'},
    returns: {arg: 'res', type: 'Object', root: true, required: true},
  });

  // 修改
  whitelist.up = function(req, cb) {
    let data = req.body;
    if (data.id == 'undefined') {
      cb(null, errParamMsg);
    }
    let id = data.id;
    delete data['id'];
    data['plate_area'] = data.plate_nbr.substring(0, 1);
    whitelist.replaceById(id, data, {validate: true}, function(err, rs) {
      if (err) cb(null, {
        ret: 0,
        msg: err,
      });
      let user = req.query.username;
      logs.optLog('修改白名单' + rs.plate_nbr, req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.connection.socket.remoteAddress, user);
      cb(null, {
        ret: 1,
        msg: '修改成功',
      });
    });
  };
  whitelist.remoteMethod('up', {
    description: '修改白名单',
    accepts: {arg: 'req', type: 'Object', required: true, http: {source: 'req'}},
    http: {path: '/listUpdate', verb: 'post'},
    returns: {arg: 'res', type: 'Object', root: true, required: true},
  });
};

function findList(param, callback) {
  param.w.find({_id: param._id}, function(err, rs) {
    if (err) callback(null, false);
    callback(null, rs);
  });
}

function deleteList(param, callback) {
  param.w.destroyAll({_id: param._id}, function(err, info) {
    if (err) callback(null, false);
    callback(null, info);
  });
}

function vioUp(param, callback) {
  param.w.app.models.violation_vehicle.updateAll({'plate_nbr': param.plate_nbr, 'plate_color': param.plate_color}, {'whitelist': '1'}, function(err, info) {
    if (err) callback(null, false);
    callback(null, info);
  });
}
