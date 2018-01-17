/**
 * Created by dell on 2017/7/13.
 */
var config = require('../../config');
var mongodb = require('mongodb');
var ObjectID = mongodb.ObjectID;
var co = require('co');
var thunkify = require('thunkify');
var logs = require('../../logServer');
var errColMsg = {
  ret: 0,
  msg: '操作失败，数据库集合操作异常'
};
var errParamMsg = {
  ret: 0,
  msg: '操作失败，参数合法性验证'
};

module.exports = function(z_organization) {
  z_organization.validatesUniquenessOf('org_name');
//查询
  z_organization.list = function (data, cb) {
    var filter = {
      order:'_id DESC',
      where:{}
    };
    co(function *() {
      if(data.org_name!="undefined"&&data.org_name) filter.where.org_name = {regexp:data.org_name};
      if(data.org_code!="undefined"&&data.org_code) {

        try{
          var fo = thunkify(findOrgCode);
          var where = {
            org_code:data.org_code,
            z:z_organization
          };
          var org_code = yield fo(where);
          if(org_code) filter.where.org_code = {inq:org_code};
          else cb(null,{
            ret:0,
            msg:'下级机构获取失败'
          })
        }catch (e){
          cb(null,{
            ret:0,
            msg:e
          });
        }

    }
      if(data.org_type!="undefined"&&data.org_type) filter.where.org_type = Number(data.org_type);
      if(data.org_level!="undefined"&&data.org_level) filter.where.org_level = Number(data.org_level);
      if(data.pageSize!="undefined"&&data.pageIndex!="undefined"&&data.pageSize&&data.pageIndex) {
        filter.limit = Number(data.pageSize);
        filter.skip = (Number(data.pageIndex) - 1) * Number(data.pageSize);
      }
      z_organization.find(filter,function (err, rs) {
        if(err) cb(null,errColMsg);
        z_organization.count(filter.where,function (err, count) {
          if (err) cb(null,errColMsg);
          cb(null,{
            ret:1,
            datas:rs,
            msg:'查询成功',
            count:count
          });
        });
      });
    });
  };
  z_organization.remoteMethod('list', {
    description:'查询组织机构',
    accepts: {arg:'data', type:'Object',required:true,http: { source: 'body' }},
    http: {path:'/list',verb:'post'},
    returns: {arg: 'res', type: 'Object',root:true,required:true}
  });

  //新增
  z_organization.add = function (req, cb) {
    var data = req.body;
    data.create_time = Date.now();
    z_organization.find({order:'_id DESC',where:{district_code:data.district_code}},function (err, rs) {
      if(err) cb(null,{
        ret:0,
        msg:err
      });
      var index;
      if (rs.length == 0) {
        index = '000000';
      } else {
        index = ('000000' + (Number(rs[0].org_code.slice(-6)) + 1).toString()).slice(-6);
      }
      data.org_code = data.district_code + index;
      z_organization.create(data,function (err, rs) {
        if(err) cb(null,{
          ret:0,
          err:err,
          msg:'机构名称重复'
        });
        var user = req.query.username;
        logs.optLog("添加机构："+rs.org_code,req.headers['x-forwarded-for'] ||
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
  z_organization.remoteMethod('add', {
    description:'添加组织机构',
    accepts: {arg:'req', type:'Object',required:true,http: { source: 'req' }},
    http: {path:'/add',verb:'post'},
    returns: {arg: 'res', type: 'Object',root:true,required:true}
  });

  //删除
  z_organization.del = function (req, cb) {
    var data = req.body;
    var arr=[];
    data.id.split(",").forEach(function(item){
      arr.push(ObjectID(item));
    });
    var where = {_id:{inq: arr}};
    z_organization.destroyAll(where,function (err, info) {
      if(err) cb(null,err);
      var user = req.query.username;
      logs.optLog("删除"+info.count+"个机构",req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.connection.socket.remoteAddress,user);
      cb(null,{
        ret:1,
        msg:'删除成功'
      });
    })
  };
  z_organization.remoteMethod('del', {
    description:'删除组织机构',
    accepts: {arg:'req', type:'Object',required:true,http: { source: 'req' }},
    http: {path:'/delete',verb:'post'},
    returns: {arg: 'res', type: 'Object',root:true,required:true}
  });

  //修改
  z_organization.up = function (req, cb) {
    var data = req.body;
    data.upstring_time = Date.now();
    if(data.id=="undefined"){
      cb(null,errParamMsg);
    }
    var id = data.id;
    delete data['id'];
    z_organization.find({order:'_id DESC',where:{_id:ObjectID(id),district_code:data.district_code}},function (err, old) {
      if(err) cb(null,{
        ret:0,
        msg:err
      });
      if(old.length==0){
        z_organization.find({order:'_id DESC',where:{district_code:data.district_code}},function (err, rs) {
          if (err) cb(null, {
            ret: 0,
            msg: err
          });
          var index;
          if (rs.length == 0) {
            index = '000000';
          } else {
            index = ('000000' + (Number(rs[0].org_code.slice(-6)) + 1).toString()).slice(-6);
          }
          data.org_code = data.district_code + index;
          z_organization.replaceById(id,data,{validate:true},function (err,rs) {
            if(err) cb(null,{
              ret:0,
              err:err,
              msg: '机构名称重复'
            });
            var user = req.query.username;
            logs.optLog("修改机构"+rs.org_code,req.headers['x-forwarded-for'] ||
              req.connection.remoteAddress ||
              req.socket.remoteAddress ||
              req.connection.socket.remoteAddress,user);
            cb(null,{
              ret:1,
              msg:'修改成功'
            });
          })
        });
      }else {
        data.org_code = old[0].org_code;
        z_organization.replaceById(id,data,{validate:true},function (err,rs) {
          if(err) cb(null,{
            ret:0,
            msg:err
          });
          var user = req.query.username;
          logs.optLog("修改机构"+rs.org_code,req.headers['x-forwarded-for'] ||
            req.connection.remoteAddress ||
            req.socket.remoteAddress ||
            req.connection.socket.remoteAddress,user);
          cb(null,{
            ret:1,
            msg:'修改成功'
          });
        })
      }
    });
  };
  z_organization.remoteMethod('up', {
    description:'修改组织机构',
    accepts: {arg:'req', type:'Object',required:true,http: { source: 'req' }},
    http: {path:'/update',verb:'post'},
    returns: {arg: 'res', type: 'Object',root:true,required:true}
  });
};

function findOrgCode(where,callback) {
  where.z.find(function (err,rs) {
    if(err) callback(err,null);
    var arr = [];
    arr.push(where.org_code);
    for(var i=0;i<rs.length;i++){
      for(var j=0;j<arr.length;j++)
      {
        if(arr[j]==rs[i].parent_org_code){
          arr.push(rs[i].org_code);
          break;
        }
      }
    }
    callback(null,arr);
  })
}
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
