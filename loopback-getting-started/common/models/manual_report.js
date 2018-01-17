/**
 * Created by dell on 2017/7/10.
 */
var config = require('../../config');
var mongodb = require('mongodb');
var ObjectID = mongodb.ObjectID;
var http = require('http');
var logs = require('../../logServer');
var errColMsg = {
  ret: 0,
  msg: '操作失败，数据库集合操作异常'
};
var errParamMsg = {
  ret: 0,
  msg: '操作失败，参数合法性验证'
};

module.exports = function(manual_report) {
  //分页查询
  manual_report.list = function (data, cb) {
    var filter = {
      order:'_id DESC',
      where:{
        delFlag:1
      }
    };
    if(data.sysCode!="undefined"&&data.sysCode) filter.where.sysCode = data.sysCode;
    if(data.index!="undefined"&&data.index) filter.where.index = {regexp:data.index};
    if(data.type!="undefined"&&data.type) filter.where.type = Number(data.type);
    if(data.state!="undefined"&&data.state) filter.where.state = Number(data.state);
    if(data.level!="undefined"&&data.level) filter.where.level = Number(data.level);
    if(data.upTimeStart!="undefined"&&data.upTimeEnd!="undefined"&&data.upTimeStart&&data.upTimeEnd) filter.where.upTime = {between:[Number(data.upTimeStart),Number(data.upTimeEnd)]};
    if(data.pageSize!="undefined"&&data.pageIndex!="undefined"&&data.pageSize&&data.pageIndex) {
      filter.limit = Number(data.pageSize);
      filter.skip = (Number(data.pageIndex) - 1) * Number(data.pageSize);
    }
    manual_report.find(filter,function (err, rs) {
      if(err) cb(null,errColMsg);
      manual_report.count(filter.where,function (err, count) {
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
  manual_report.remoteMethod('list', {
    description:'查询人工上报',
    accepts: {arg:'data', type:'Object',required:true,http: { source: 'body' }},
    http: {path:'/list',verb:'post'},
    returns: {arg: 'res', type: 'Object',root:true,required:true}
  });

  //新增
  manual_report.add = function (req, cb) {
    var data = req.body;
    data.state = 0;
    data.delFlag = 1;
    if(data.ps=="undefined"||data.ps =="null") data.ps = '';
    data.index = 'm'+data.upTime.toString() + '0000';
    manual_report.create(data,function (err, rs) {
      if(err) cb(null,{
        ret:0,
        msg:err
      });
      var msg = data;
      msg.Vtype = "2";
      msg.id = rs.id;
      msg.upTime = format(Number(data.upTime));
      sendMsg(msg);
      var user = req.query.username;
      logs.optLog("人工上报"+rs.level+"级预警",req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.connection.socket.remoteAddress,user);
      cb(null,{
        ret:1,
        id:rs.id,
        msg:'新增成功'
      });
    })
  };
  manual_report.remoteMethod('add', {
    description:'添加人工上报',
    accepts: {arg:'req', type:'Object',required:true,http: { source: 'req' }},
    http: {path:'/add',verb:'post'},
    returns: {arg: 'res', type: 'Object',root:true,required:true}
  });

  //删除
  manual_report.del = function (req, cb) {
    var data = req.body;
    var arr=[];
    data.id.split(",").forEach(function(item){
      arr.push(ObjectID(item));
    });
    var where = {_id:{inq: arr}};
    manual_report.updateAll(where,{delFlag:0},function (err, info) {
      if(err) cb(null,err);
      var user = req.query.username;
      logs.optLog("删除"+info.count+"条人工上报预警",req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.connection.socket.remoteAddress,user);
      cb(null,{
        ret:1,
        msg:'删除成功'
      });
    })
  };
  manual_report.remoteMethod('del', {
    description:'删除人工上报',
    accepts: {arg:'req', type:'Object',required:true,http: { source: 'req' }},
    http: {path:'/delete',verb:'post'},
    returns: {arg: 'res', type: 'Object',root:true,required:true}
  });

  //修改
  manual_report.up = function (req, cb) {
    var data = req.body;
    manual_report.updateAll({index:data.index},{state:Number(data.state)},function (err,rs) {
      if(err) cb(null,{
        ret:0,
        msg:err
      });
      var logMsg;
      if(Number(data.state)==1){
        logMsg = '处理';
      }
      if(Number(data.state)==3){
        logMsg = '忽略';
      }
      var user = req.query.username;
      logs.optLog(logMsg+'人工上报'+data.index,req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.connection.socket.remoteAddress,user);
      cb(null,{
        ret:1,
        msg:'修改成功'
      });
    })
  };
  manual_report.remoteMethod('up', {
    description:'人工上报状态修改',
    accepts: {arg:'req', type:'Object',required:true,http: { source: 'req' }},
    http: {path:'/update',verb:'post'},
    returns: {arg: 'res', type: 'Object',root:true,required:true}
  });
};

function sendMsg(msg) {
  var opt = {
    method: "POST",
    host: config.transportServerHost,
    port: config.transportServerPort,
    path:'/sendMsg',
    headers: {
      "Content-Type": 'application/json'
    }
  };
  var requ = http.request(opt, function (serverFeedback) {
    if (serverFeedback.statusCode == 200) {
      var body = [];
      serverFeedback.on('data', function (data) {
        body.push(data);
      }).on('end', function () {
        var data= Buffer.concat(body).toString();
        return JSON.stringify(data);
      });
    }
    else {
      return {
        ret:0,
        msg:'error'
      }
    }
  });
  requ.write(JSON.stringify(msg) + "\n");
  requ.end('');
  requ.on('error',function(e){
    var ret = {
      ret:0,
      msg:e
    };
    return ret;
  });
}

function add0(m){return m<10?'0'+m:m }
function format(shijianchuo) { //shijianchuo是整数，否则要parseInt转换
  var time = new Date(shijianchuo);
  var y = time.getFullYear();
  var m = time.getMonth()+1;
  var d = time.getDate();
  var h = time.getHours();
  var mm = time.getMinutes();
  var s = time.getSeconds();
  return y.toString()+add0(m).toString()+add0(d).toString()+add0(h).toString()+add0(mm).toString()+add0(s).toString();
}
