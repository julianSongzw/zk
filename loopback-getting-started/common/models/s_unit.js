/**
 * Created by dell on 2017/7/4.
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

module.exports = function(s_unit) {
  s_unit.validatesUniquenessOf('unitId');
//分页查询
  s_unit.list = function (data, cb) {
    var filter = {
      order:'_id DESC',
      where:{}
    };
    if(data.unitName!="undefined"&&data.unitName) filter.where.unitName = {regexp:data.unitName};
    if(data.unitType!="undefined"&&data.unitType) filter.where.unitType = data.unitType;
    if(data.sysCode!="undefined"&&data.sysCode) filter.where.sysCode = data.sysCode;
    if(data.pageSize!="undefined"&&data.pageIndex!="undefined"&&data.pageSize&&data.pageIndex) {
      filter.limit = Number(data.pageSize);
      filter.skip = (Number(data.pageIndex) - 1) * Number(data.pageSize);
    }
    s_unit.find(filter,function (err, rs) {
      if(err) cb(null,errColMsg);
      s_unit.count(filter.where,function (err, count) {
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
  s_unit.remoteMethod('list', {
    description:'单元查询',
    accepts: {arg:'data', type:'Object',required:true,http: { source: 'body' }},
    http: {path:'/list',verb:'post'},
    returns: {arg: 'res', type: 'Object',root:true,required:true}
  });

  //新增
  s_unit.add = function (data, cb) {
    data.createTime = Date.now();
    s_unit.create(data,function (err, rs) {
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
  s_unit.remoteMethod('add', {
    description:'添加单元',
    accepts: {arg:'data', type:'Object',required:true,http: { source: 'body' }},
    http: {path:'/add',verb:'post'},
    returns: {arg: 'res', type: 'Object',root:true,required:true}
  });

  //删除
  s_unit.del = function (data, cb) {
    var arr=[];
    data.id.split(",").forEach(function(item){
      arr.push(ObjectID(item));
    });
    var where = {_id:{inq: arr}};
    s_unit.destroyAll(where,function (err, count) {
      if(err) cb(null,err);
      cb(null,{
        ret:1,
        msg:'删除成功'
      });
    })
  };
  s_unit.remoteMethod('del', {
    description:'删除单元',
    accepts: {arg:'data', type:'Object',required:true,http: { source: 'body' }},
    http: {path:'/delete',verb:'post'},
    returns: {arg: 'res', type: 'Object',root:true,required:true}
  });

  //修改
  s_unit.up = function (data, cb) {
    if(data.id=="undefined"){
      cb(null,errParamMsg);
    }
    var id = ObjectID(data.id);
    delete data['id'];
    s_unit.updateAll({"_id":id},data,function (err,rs) {
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
  s_unit.remoteMethod('up', {
    description:'修改单元',
    accepts: {arg:'data', type:'Object',required:true,http: { source: 'body' }},
    http: {path:'/update',verb:'post'},
    returns: {arg: 'res', type: 'Object',root:true,required:true}
  });
};

// 对Date的扩展，将 Date 转化为指定格式的String
// 月(M)、日(d)、小时(h)、分(m)、秒(s)、季度(q) 可以用 1-2 个占位符，
// 年(y)可以用 1-4 个占位符，毫秒(S)只能用 1 个占位符(是 1-3 位的数字)
// 例子：
// (new Date()).Format("yyyy-MM-dd hh:mm:ss.S") ==> 2006-07-02 08:09:04.423
// (new Date()).Format("yyyy-M-d h:m:s.S")      ==> 2006-7-2 8:9:4.18
Date.prototype.Format = function(fmt)
{ //author: meizz
  var o = {
    "M+" : this.getMonth()+1,                 //月份
    "d+" : this.getDate(),                    //日
    "h+" : this.getHours(),                   //小时
    "m+" : this.getMinutes(),                 //分
    "s+" : this.getSeconds(),                 //秒
    "q+" : Math.floor((this.getMonth()+3)/3), //季度
    "S"  : this.getMilliseconds()             //毫秒
  };
  if(/(y+)/.test(fmt))
    fmt=fmt.replace(RegExp.$1, (this.getFullYear()+"").substr(4 - RegExp.$1.length));
  for(var k in o)
    if(new RegExp("("+ k +")").test(fmt))
      fmt = fmt.replace(RegExp.$1, (RegExp.$1.length==1) ? (o[k]) : (("00"+ o[k]).substr((""+ o[k]).length)));
  return fmt;
};
