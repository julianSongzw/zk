/**
 * Created by dell on 2017/10/12.
 */
var config = require('../../config');
var mongodb = require('mongodb');
var ObjectID = mongodb.ObjectID;
var logs = require('../../logServer');
var co = require('co');
var thunkify = require('thunkify');
var http = require('http');
var imgUrl = config.imgUrl;
var fs = require('fs');
var path = require('path');

var errColMsg = {
  ret: 0,
  msg: '操作失败，数据库集合操作异常'
};
var errParamMsg = {
  ret: 0,
  msg: '操作失败，参数合法性验证'
};

module.exports = function(led_program_list) {
//新增
  led_program_list.add = function (data, cb) {
    data.program = JSON.parse(data.program);
    led_program_list.create(data,function (err, rs) {
      if(err) cb(null,{
        ret:0,
        err:err,
        msg:'单元编号重复'
      });
      cb(null,{
        ret:1,
        id:rs.id,
        msg:'新增成功'
      });
    })
  };
  led_program_list.remoteMethod('add', {
    description:'添加节目',
    accepts: {arg:'data', type:'Object',required:true,http: { source: 'body' }},
    http: {path:'/add',verb:'post'},
    returns: {arg: 'res', type: 'Object',root:true,required:true}
  });

  //单个节目删除
  led_program_list.delOne = function (data, cb) {
    var arr=[];
    data.pid.split(",").forEach(function(item){
      arr.push(item);
    });
    var where = {pid:{inq: arr},device_nbr:data.device_nbr};
    led_program_list.destroyAll(where,function (err, count) {
      if(err) cb(null,err);
      cb(null,{
        ret:1,
        msg:'删除成功'
      });
    })
  };
  led_program_list.remoteMethod('delOne', {
    description:'删除单个节目',
    accepts: {arg:'data', type:'Object',required:true,http: { source: 'body' }},
    http: {path:'/deleteOne',verb:'post'},
    returns: {arg: 'res', type: 'Object',root:true,required:true}
  });

  //全部节目删除
  led_program_list.del = function (data, cb) {
    var where = {device_nbr:data.device_nbr};
    led_program_list.destroyAll(where,function (err, count) {
      if(err) cb(null,err);
      cb(null,{
        ret:1,
        msg:'删除成功'
      });
    })
  };
  led_program_list.remoteMethod('del', {
    description:'删除全部节目',
    accepts: {arg:'data', type:'Object',required:true,http: { source: 'body' }},
    http: {path:'/deleteALL',verb:'post'},
    returns: {arg: 'res', type: 'Object',root:true,required:true}
  });
};
