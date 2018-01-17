/**
 * Created by dell on 2017/7/24.
 */
var config = require('../../config');
var mongodb = require('mongodb');
var ObjectID = mongodb.ObjectID;

var errColMsg = {
  ret: 0,
  msg: '操作失败，数据库集合操作异常'
};
var errParamMsg = {
  ret: 0,
  msg: '操作失败，参数合法性验证'
};

module.exports = function(d_status) {
  //新增
  d_status.add = function (data, cb) {
    d_status.upsertWithWhere({device_nbr:data.device_nbr},data,function (err, rs) {
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
  d_status.remoteMethod('add', {
    description:'更新设备状态',
    accepts: {arg:'data', type:'Object',required:true,http: { source: 'body' }},
    http: {path:'/add',verb:'post'},
    returns: {arg: 'res', type: 'Object',root:true,required:true}
  });

  //查询
  d_status.list = function (data, cb) {
    var filter = {
      order:'_id DESC',
      where:{}
    };
    if(data.device_nbr!="undefined"&&data.device_nbr) filter.where.device_nbr = {regexp:data.device_nbr};
    if(data.pageSize!="undefined"&&data.pageIndex!="undefined"&&data.pageSize&&data.pageIndex) {
      filter.limit = Number(data.pageSize);
      filter.skip = (Number(data.pageIndex) - 1) * Number(data.pageSize);
    }
    d_status.find(filter,function (err, rs) {
      if(err) cb(null,errColMsg);
      d_status.count(filter.where,function (err, count) {
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
  d_status.remoteMethod('list', {
    description:'查询设备状态',
    accepts: {arg:'data', type:'Object',required:true,http: { source: 'body' }},
    http: {path:'/list',verb:'post'},
    returns: {arg: 'res', type: 'Object',root:true,required:true}
  });


  //修改
  d_status.up = function (req, cb) {
    var data = req.body;
    var device_nbr = data.device_nbr;
    d_status.updateAll({device_nbr:device_nbr},data,function (err,rs) {
      if(err) cb(null,{
        ret:0,
        msg:err
      });
      cb(null,{
        ret:1,
        msg:'修改成功'
      });
    })
  };
  d_status.remoteMethod('up', {
    description:'修改设备状态',
    accepts: {arg:'req', type:'Object',required:true,http: { source: 'req' }},
    http: {path:'/statusUpdate',verb:'post'},
    returns: {arg: 'res', type: 'Object',root:true,required:true}
  });
};
