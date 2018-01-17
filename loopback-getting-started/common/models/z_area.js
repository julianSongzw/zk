/**
 * Created by dell on 2017/7/13.
 */
var config = require('../../config');
var mongodb = require('mongodb');
var ObjectID = mongodb.ObjectID;
var areaData = require('../../areaData');

var errColMsg = {
  ret: 0,
  msg: '操作失败，数据库集合操作异常'
};
var errParamMsg = {
  ret: 0,
  msg: '操作失败，参数合法性验证'
};

module.exports = function(z_area) {
//查询
  z_area.list = function (data, cb) {
    var filter = {
      order:'_id ASC',
      where:{}
    };
    if(data.area_code!="undefined"&&data.area_code) filter.where.area_code = data.area_code;
    if(data.pageSize!="undefined"&&data.pageIndex!="undefined"&&data.pageSize&&data.pageIndex) {
      filter.limit = Number(data.pageSize);
      filter.skip = (Number(data.pageIndex) - 1) * Number(data.pageSize);
    }
    z_area.find(filter,function (err, rs) {
      if(err) cb(null,errColMsg);
      z_area.count(filter.where,function (err, count) {
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
  z_area.remoteMethod('list', {
    description:'行政区划查询',
    accepts: {arg:'data', type:'Object',required:true,http: { source: 'body' }},
    http: {path:'/list',verb:'post'},
    returns: {arg: 'res', type: 'Object',root:true,required:true}
  });

  //新增
  z_area.add = function (cb) {
    z_area.destroyAll(function (err, count) {
      if(err) cb(null,{
        ret:0,
        msg:err
      });
      z_area.create(areaData,function (err, rs) {
        if(err) cb(null,{
          ret:0,
          msg:err
        });
        cb(null,{
          ret:1,
          msg:'新增成功'
        });
      })
    });

  };
  z_area.remoteMethod('add', {
    description:'添加行政区划',
    http: {path:'/add',verb:'get'},
    returns: {arg: 'res', type: 'Object',root:true,required:true}
  });

  // //删除
  // z_area.del = function (data, cb) {
  //   var arr=[];
  //   data.id.split(",").forEach(function(item){
  //     arr.push(ObjectID(item));
  //   });
  //   var where = {_id:{inq: arr}};
  //   z_area.destroyAll(where,function (err, count) {
  //     if(err) cb(null,err);
  //     cb(null,{
  //       ret:1,
  //       msg:'删除成功'
  //     });
  //   })
  // };
  // z_area.remoteMethod('del', {
  //   description:'删除行政区划',
  //   accepts: {arg:'data', type:'Object',required:true,http: { source: 'body' }},
  //   http: {path:'/delete',verb:'post'},
  //   returns: {arg: 'res', type: 'Object',root:true,required:true}
  // });
  //
  // //修改
  // z_area.up = function (data, cb) {
  //   if(data.id=="undefined"){
  //     cb(null,errParamMsg);
  //   }
  //   var id = ObjectID(data.id);
  //   delete data['id'];
  //   z_area.updateAll({"_id":id},data,function (err,rs) {
  //     if(err) cb(null,{
  //       ret:0,
  //       msg:err
  //     });
  //     cb(null,{
  //       ret:1,
  //       msg:'修改成功'
  //     });
  //   })
  // };
  // z_area.remoteMethod('up', {
  //   description:'修改行政区划',
  //   accepts: {arg:'data', type:'Object',required:true,http: { source: 'body' }},
  //   http: {path:'/update',verb:'post'},
  //   returns: {arg: 'res', type: 'Object',root:true,required:true}
  // });
};
