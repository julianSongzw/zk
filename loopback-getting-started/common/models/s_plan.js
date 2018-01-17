/**
 * Created by dell on 2017/7/11.
 */
var config = require('../../config');
var mongodb = require('mongodb');
var ObjectID = mongodb.ObjectID;
var logs = require('../../logServer');
var http = require('http');
var imgUrl = config.imgUrl;
var fs = require('fs');
var path = require('path');
var co = require('co');
var thunkify = require('thunkify');
var errColMsg = {
  ret: 0,
  msg: '操作失败，数据库集合操作异常'
};
var errParamMsg = {
  ret: 0,
  msg: '操作失败，参数合法性验证'
};


module.exports = function(s_plan) {
  s_plan.validatesUniquenessOf('planCode');
//分页查询
  s_plan.list = function (data, cb) {
    var filter = {
      order:'_id DESC',
      where:{}
    };
    if(data.level!="undefined"&&data.level) filter.where.level = Number(data.level);
    if(data.sysCode!="undefined"&&data.sysCode) filter.where.sysCode = data.sysCode;
    if(data.pageSize!="undefined"&&data.pageIndex!="undefined"&&data.pageSize&&data.pageIndex) {
      filter.limit = Number(data.pageSize);
      filter.skip = (Number(data.pageIndex) - 1) * Number(data.pageSize);
    }
    s_plan.find(filter,function (err, rs) {
      if(err) cb(null,errColMsg);
      s_plan.count(filter.where,function (err, count) {
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
  s_plan.remoteMethod('list', {
    description:'查询预案',
    accepts: {arg:'data', type:'Object',required:true,http: { source: 'body' }},
    http: {path:'/list',verb:'post'},
    returns: {arg: 'res', type: 'Object',root:true,required:true}
  });

  //新增
  s_plan.add = function (req, cb) {
    var data = req.body;
    data.createTime = Date.now();
    data.planCode = 'p'+data.createTime.toString()+'0000';
    data.contents = JSON.parse(data.contents);
    // data.shuntLight = JSON.parse(data.shuntLight);
    // data.shuntScreen = JSON.parse(data.shuntScreen);
    // data.speedScreen = JSON.parse(data.speedScreen);
    // data.distanceScreen = JSON.parse(data.distanceScreen);
    // data.cancelScreen = JSON.parse(data.cancelScreen);
    // if(data.shuntScreen.perform.text){
    //   var shuntScreen = data.shuntScreen.perform.text;
    //   var arr1 = [];
    //   for(var i = 0;i<shuntScreen.length;i++){
    //     arr1.push(shuntScreen[i].contents.textinfo);
    //   }
    //   data.shuntScreenText  = arr1.join(',');
    // }
    // if(data.distanceScreen.perform.text){
    //   var distanceScreen = data.distanceScreen.perform.text;
    //   var arr3 = [];
    //   for(var i = 0;i<distanceScreen.length;i++){
    //     arr3.push(distanceScreen[i].contents.textinfo);
    //   }
    //   data.distanceScreenText  = arr3.join(',');
    // }


      s_plan.find({where:{sysCode:data.sysCode,level:data.level}},function (err, plan) {
        if(err) cb(null,{
          ret:0,
          msg:err
        });
        else if(plan.length!=0){
          cb(null,{
            ret:0,
            msg:'预案重复'
          });
          return false;
        }
        s_plan.create(data,function (err, rs) {
          if(err) cb(null,{
            ret:0,
            err:err,
            msg:'预案编号重复'
          });
          var user = req.query.username;
          logs.optLog("添加"+rs.level+"级预案:"+rs.planCode,req.headers['x-forwarded-for'] ||
            req.connection.remoteAddress ||
            req.socket.remoteAddress ||
            req.connection.socket.remoteAddress,user);
          cb(null,{
            ret:1,
            id:rs.id,
            msg:'新增成功'
          });
        });
      });

  };
  s_plan.remoteMethod('add', {
    description:'添加预案',
    accepts: {arg:'req', type:'Object',required:true,http: { source: 'req' }},
    http: {path:'/add',verb:'post'},
    returns: {arg: 'res', type: 'Object',root:true,required:true}
  });

  //删除
  s_plan.del = function (req, cb) {
    var data = req.body;
    var arr=[];
    if(data.id =='undefined'||!data.id){
      cb(null,errParamMsg)
    }
    data.id.split(",").forEach(function(item){
      arr.push(ObjectID(item));
    });
    var where = {_id:{inq: arr}};
    s_plan.destroyAll(where,function (err, info) {
      if(err) cb(null,err);
      var user = req.query.username;
      logs.optLog("删除"+info.count+"条预案",req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.connection.socket.remoteAddress,user);
      cb(null,{
        ret:1,
        msg:'删除成功'
      });
    })
  };
  s_plan.remoteMethod('del', {
    description:'删除预案',
    accepts: {arg:'req', type:'Object',required:true,http: { source: 'req' }},
    http: {path:'/delete',verb:'post'},
    returns: {arg: 'res', type: 'Object',root:true,required:true}
  });

  //修改
  s_plan.up = function (req, cb) {
    var data = req.body;
    if(data.id=="undefined"){
      cb(null,errParamMsg);
    }
    // data.shuntLight = JSON.parse(data.shuntLight);
    // data.shuntScreen = JSON.parse(data.shuntScreen);
    // data.speedScreen = JSON.parse(data.speedScreen);
    // data.distanceScreen = JSON.parse(data.distanceScreen);
    // data.cancelScreen = JSON.parse(data.cancelScreen);
    // if(data.shuntScreen.perform.text){
    //   var shuntScreen = data.shuntScreen.perform.text;
    //   var arr1 = [];
    //   for(var i = 0;i<shuntScreen.length;i++){
    //     arr1.push(shuntScreen[i].contents.textinfo);
    //   }
    //   data.shuntScreenText  = arr1.join(',');
    // }
    // if(data.distanceScreen.perform.text){
    //   var distanceScreen = data.distanceScreen.perform.text;
    //   var arr3 = [];
    //   for(var i = 0;i<distanceScreen.length;i++){
    //     arr3.push(distanceScreen[i].contents.textinfo);
    //   }
    //   data.distanceScreenText  = arr3.join(',');
    // }
    var id = data.id;
    delete data['id'];
    data.contents = JSON.parse(data.contents);
    s_plan.replaceById(id,data,{validate:true},function (err,rs) {
      if(err) cb(null,{
        ret:0,
        msg:err
      });
      var user = req.query.username;
      logs.optLog("修改预案"+rs.planCode,req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.connection.socket.remoteAddress,user);
      cb(null,{
        ret:1,
        msg:'修改成功'
      });
    });
  };
  s_plan.remoteMethod('up', {
    description:'修改预案',
    accepts: {arg:'req', type:'Object',required:true,http: { source: 'req' }},
    http: {path:'/updatePlan',verb:'post'},
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
//查询区间信息
function findRegion(param,callback) {
  param.s.app.models.d_road_region.find({order:'_id DESC',where:{region_code:param.region_code}},function (err, rs) {
    if(err) callback(err,null);
    callback(null,rs);
  });
}
//查询限速牌
function findVsl(param,callback) {
  param.s.app.models.d_vsl.find({order:'_id DESC',where:{device_nbr:param.device_nbr}},function (err, rs) {
    if(err) callback(err,null);
    callback(null,rs);
  });
}
