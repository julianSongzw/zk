/**
 * Created by dell on 2017/6/21.
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



module.exports = function(sys_user) {

  sys_user.validatesUniquenessOf('username');
  //登录
    sys_user.webLogin = function (req, cb) {
      var data = req.body;
        var loginData = {
          username:data.username,
          state:1
        };
        sys_user.count(loginData,function (err, count) {
          if(err) {cb(null,errColMsg);return false;}
          if(count==0) cb(null,{
            ret:0,
            msg:'该用户已被禁用'
          });
          sys_user.login(data,function (err, token) {
            if (err) cb(null,{
              ret:0,
              msg:err
            });
            sys_user.findById(token.userId,function (err, user) {
              if (err) cb(null,{
                ret:0,
                msg:err
              });

              var total_login_counts = user.total_login_counts;
              var ups = {
                latest_login_time:Date.now(),
                total_login_counts:Number(total_login_counts)+1
              };
              sys_user.updateAll({"_id":ObjectID(token.userId)},ups,function (err, count) {
                if (err) cb(null,{
                  ret:0,
                  msg:err
                });
                sys_user.app.models.sys_role.find({include:'auths',where:{role_name:user.role_name}},function (err, role) {
                  if (err) cb(null,{
                    ret:0,
                    msg:err
                  });
                  logs.loginLog("web登录",req.headers['x-forwarded-for'] ||
                    req.connection.remoteAddress ||
                    req.socket.remoteAddress ||
                    req.connection.socket.remoteAddress,user.username);
                  cb(null,{
                    ret:1,
                    token:token.id,
                    userData:[user],
                    role:role,
                    websocketUrl:config.websocketUrl,
                    msg:"登录成功"
                  });
                });

              });
            });

          });
        });

    };

    sys_user.remoteMethod('webLogin', {
        description:'登录接口',
        accepts: {arg:'req', type:'Object',required:true,http: { source: 'req' }},
        http: {path:'/webLogin',verb:'post'},
        returns: {arg: 'res', type: 'Object',root:true,required:true}
    });

  //新增
  sys_user.add = function (req, cb) {
    var data = req.body;
    data.password = config.pwd;
    data.latest_login_time = null;
    data.total_login_counts = 0;
    data.state = 1;
    data.police_id = data.username;
    sys_user.create(data,function (err, rs) {
      if(err) cb(null,{
        ret:0,
        err:err,
        msg:'该用户已存在'
      });
      var userid = rs.id;
      var Role = sys_user.app.models.Role;
      var RoleMapping = sys_user.app.models.RoleMapping;
      Role.find({where:{name: 'admin'}
      }, function(err, role) {
        RoleMapping.create({
          principalType: RoleMapping.USER,
          principalId: userid,
          roleId:role[0].id
        }, function(err, principal) {
          if (err) cb(null,{
            ret:0,
            msg:err
          });
          var user = req.query.username;
          logs.optLog("新建用户"+rs.username,req.headers['x-forwarded-for'] ||
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

    })
  };
  sys_user.remoteMethod('add', {
    description:'添加用户',
    accepts: {arg:'req', type:'Object',required:true,http: { source: 'req' }},
    http: {path:'/add',verb:'post'},
    returns: {arg: 'res', type: 'Object',root:true,required:true}
  });

  //分页查询
  sys_user.list = function (data, cb) {
    var filter = {
      order:'_id DESC',
      where:{}
    };
    if(data.police_id!="undefined"&&data.police_id) filter.where.police_id = {regexp:data.police_id};
    if(data.role_id!="undefined"&&data.role_id) filter.where.role_id = {regexp:data.role_id};
    if(data.state!="undefined"&&data.state) filter.where.state = data.state;
    if(data.org_id!="undefined"&&data.org_id) filter.where.org_id = data.org_id;
    if(data.pageSize!="undefined"&&data.pageIndex!="undefined"&&data.pageSize&&data.pageIndex) {
      filter.limit = Number(data.pageSize);
      filter.skip = (Number(data.pageIndex) - 1) * Number(data.pageSize);
    }
    sys_user.find(filter,function (err, rs) {
      if(err) cb(null,errColMsg);
      sys_user.count(filter.where,function (err, count) {

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
  sys_user.remoteMethod('list', {
    description:'用户查询',
    accepts: {arg:'data', type:'Object',required:true,http: { source: 'body' }},
    http: {path:'/list',verb:'post'},
    returns: {arg: 'res', type: 'Object',root:true,required:true}
  });

  //删除
  sys_user.del = function (req, cb) {
    var data = req.body;
    var arr=[];
    data.id.split(",").forEach(function(item){
      arr.push(ObjectID(item));
    });
    var where = {_id:{inq: arr}};
    sys_user.destroyAll(where,function (err, info) {
      if(err) cb(null,err);
      var user = req.query.username;
      logs.optLog("删除"+info.count+"条用户记录",req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.connection.socket.remoteAddress,user);
      cb(null,{
        ret:1,
        msg:'删除成功'
      });
    })
  };
  sys_user.remoteMethod('del', {
    description:'删除用户',
    accepts: {arg:'req', type:'Object',required:true,http: { source: 'req' }},
    http: {path:'/delete',verb:'post'},
    returns: {arg: 'res', type: 'Object',root:true,required:true}
  });

  //修改
  sys_user.up = function (req, cb) {
    var data = req.body;
    if(data.id=="undefined"){
      cb(null,errParamMsg);
    }
    var id = data.id;
    delete data['id'];
    sys_user.updateAll({_id:ObjectID(id)},data,function (err,rs) {
      if(err) cb(null,{
        ret:0,
        err:err,
        msg:'该用户已存在'
      });
      var user = req.query.username;
      logs.optLog("修改用户"+data.username,req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.connection.socket.remoteAddress,user);
      cb(null,{
        ret:1,
        msg:'修改成功'
      });
    })
  };
  sys_user.remoteMethod('up', {
    description:'修改用户',
    accepts: {arg:'req', type:'Object',required:true,http: { source: 'req' }},
    http: {path:'/update',verb:'post'},
    returns: {arg: 'res', type: 'Object',root:true,required:true}
  });

  //启用、禁用
  sys_user.control = function (req, cb) {
    var data = req.body;
    var control;
    if(data.state==0){
      control = '禁用';
    }
    if(data.state==1){
      control = '启用';
    }
    if(data.id=="undefined"){
      cb(null,errParamMsg);
    }
    var id = ObjectID(data.id);
    delete data['id'];
    sys_user.updateAll({_id:id},data,function (err,rs) {
      if(err) cb(null,{
        ret:0,
        msg:err
      });
      var user = req.query.username;
      logs.optLog(control+"用户"+data.username,req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.connection.socket.remoteAddress,user);
      cb(null,{
        ret:1,
        msg:'修改成功'
      });
    })
  };
  sys_user.remoteMethod('control', {
    description:'修改用户',
    accepts: {arg:'req', type:'Object',required:true,http: { source: 'req' }},
    http: {path:'/userControl',verb:'post'},
    returns: {arg: 'res', type: 'Object',root:true,required:true}
  });

  //重置密码
  sys_user.resetPwd = function (req, cb) {
    var data = req.body;
    sys_user.setPassword(data.id,config.pwd,function (err) {
      if (err) cb(null,{
        ret:0,
        msg:err
      });
      var user = req.query.username;
      logs.optLog("重置用户:"+data.username+"的密码",req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.connection.socket.remoteAddress,user);
      cb(null,{
        ret:1,
        msg:'密码已重置为123456'
      })
    });
  };
  sys_user.remoteMethod('resetPwd', {
    description:'重置密码',
    accepts: {arg:'req', type:'Object',required:true,http: { source: 'req' }},
    http: {path:'/resetPassword',verb:'post'},
    returns: {arg: 'res', type: 'Object',root:true,required:true}
  });

  //修改密码
  sys_user.changePwd = function (req, cb) {
    var data = req.body;
    sys_user.changePassword(data.id,data.oldPassword,data.newPassword,function (err) {
      if(err) cb(null,{
        ret:0,
        err:err,
        msg:'旧密码错误'
      });
      var user = req.query.username;
      logs.optLog("修改密码",req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.connection.socket.remoteAddress,user);
      cb(null,{
        ret:1,
        msg:'密码修改成功'
      });
    })
  };
  sys_user.remoteMethod('changePwd', {
    description:'修改密码',
    accepts: {arg:'req', type:'Object',required:true,http: { source: 'req' }},
    http: {path:'/changePassword',verb:'post'},
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
