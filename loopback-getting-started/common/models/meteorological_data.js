/**
 * Created by dell on 2017/7/3.
 */
var config = require('../../config');
var mongodb = require('mongodb');
var ObjectID = mongodb.ObjectID;
var logs = require('../../logServer');
var co = require('co');
var thunkify = require('thunkify');
var http = require('http');
var errColMsg = {
  ret: 0,
  msg: '操作失败，数据库集合操作异常'
};
var errParamMsg = {
  ret: 0,
  msg: '操作失败，参数合法性验证'
};

module.exports = function(meteorological_data) {
  //分页查询
  meteorological_data.list = function (data, cb) {
    var filter = {
      order:'upTime DESC',
      where:{}
    };
    if(data.eqId!="undefined"&&data.eqId) filter.where.eqId = {regexp:data.eqId};
    if(data.level!="undefined"&&data.level) filter.where.level = Number(data.level);
    if(data.eqName!="undefined"&&data.eqName) filter.where.eqName = {regexp:data.eqName};
    if(data.sysCode!="undefined"&&data.sysCode) filter.where.sysCode = data.sysCode;
    if(data.source!="undefined"&&data.source) filter.where.source = Number(data.source);
    if(data.state!="undefined"&&data.state) filter.where.state = Number(data.state);
    if(data.upTimeStart!="undefined"&&data.upTimeEnd!="undefined"&&data.upTimeStart&&data.upTimeEnd) filter.where.upTime = {between:[Number(data.upTimeStart),Number(data.upTimeEnd)]};
    if(data.pageSize!="undefined"&&data.pageIndex!="undefined"&&data.pageSize&&data.pageIndex) {
      filter.limit = Number(data.pageSize);
      filter.skip = (Number(data.pageIndex) - 1) * Number(data.pageSize);
    }
    meteorological_data.find(filter,function (err, rs) {
      if(err) cb(null,errColMsg);
      meteorological_data.count(filter.where,function (err, count) {
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
  meteorological_data.remoteMethod('list', {
    description:'气象数据分页查询',
    accepts: {arg:'data', type:'Object',required:true,http: { source: 'body' }},
    http: {path:'/list',verb:'post'},
    returns: {arg: 'res', type: 'Object',root:true,required:true}
  });

  //新增
  meteorological_data.add = function (data, cb) {
    data.delFlag = 1;
    meteorological_data.create(data,function (err, rs) {
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
  meteorological_data.remoteMethod('add', {
    description:'添加气象数据',
    accepts: {arg:'data', type:'Object',required:true,http: { source: 'body' }},
    http: {path:'/add',verb:'post'},
    returns: {arg: 'res', type: 'Object',root:true,required:true}
  });

  //删除
  meteorological_data.del = function (req, cb) {
    var data = req.body;
    var arr=[];
    data.id.split(",").forEach(function(item){
      arr.push(ObjectID(item));
    });
    var where = {_id:{inq: arr}};
    meteorological_data.destroyAll(where,function (err, info) {
      if(err) cb(null,err);
      var user = req.query.username;
      logs.optLog("删除"+info.count+"条气象数据",req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.connection.socket.remoteAddress,user);
      cb(null,{
        ret:1,
        msg:'删除成功'
      });
    })
  };
  meteorological_data.remoteMethod('del', {
    description:'删除气象数据',
    accepts: {arg:'req', type:'Object',required:true,http: { source: 'req' }},
    http: {path:'/delete',verb:'post'},
    returns: {arg: 'res', type: 'Object',root:true,required:true}
  });

  //修改
  meteorological_data.up = function (req, cb) {
    var data = req.body;
    meteorological_data.updateAll({index:data.index},{state:Number(data.state)},function (err,rs) {
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
      logs.optLog(logMsg+'气象预警'+data.index,req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.connection.socket.remoteAddress,user);
      cb(null,{
        ret:1,
        msg:'修改成功'
      });
    })
  };
  meteorological_data.remoteMethod('up', {
    description:'气象预警状态',
    accepts: {arg:'req', type:'Object',required:true,http: { source: 'req' }},
    http: {path:'/update',verb:'post'},
    returns: {arg: 'res', type: 'Object',root:true,required:true}
  });

  //人工上报气象数据
  meteorological_data.manual_add = function (data, cb) {
    var roadSituationLevel,addr;
    var visibilityLevel,surfaceTLevel,waterFilmThicknessLevel;
    var level,visibility,surfaceT,waterFilmThickness,roadSituation,iceRate;
    iceRate = Number(data.iceRate);
    var section_code = data.section_code?data.section_code:"";
    if(data.metre!=""&&data.metre!="undefined") {
      addr = data.road_name + section_code + data.mileage+ '+' + data.metre + 'm';
    }
    else {
      addr = data.road_name + section_code + data.mileage;
    }
    co(function *() {
      var ft = thunkify(findThreshold);
      //能见度
      if(data.visibility!='undefined'&&data.visibility){
        visibility = Number(data.visibility);
        try {
          var ft_callback_v_0;
          var minValue_v,maxValue_v;
          var where0 = {
            thresholdType:'0',
            meterNbr:'0'
          };
          ft_callback_v_0 = yield ft(where0);
          if(ft_callback_v_0){
            var vD0 = JSON.parse(ft_callback_v_0);
            for(var i=0;i<vD0.datas.length;i++){
              if(visibility >= vD0.datas[i].minValue&&visibility < vD0.datas[i].maxValue){
                visibilityLevel = vD0.datas[i].level;
                minValue_v = vD0.datas[i].minValue;
                maxValue_v = vD0.datas[i].maxValue;
              }
            }
            if(!visibilityLevel&&visibilityLevel!=0){
              visibilityLevel = 4;
            }
          }else {
            visibilityLevel = 4;
          }
        }catch (e){
          cb(null,{
            ret:0,
            msg:e
          });
          return false;
        }
      }else {
        visibilityLevel = 4;
      }
      //路面温度
      if(data.surfaceT!='undefined'&&data.surfaceT){
        surfaceT = Number(data.surfaceT);
        try {
          var ft_callback_t_0;
          var minValue_t,maxValue_t;
          var where0 = {
            thresholdType:'3',
            meterNbr:'0'
          };
          ft_callback_t_0 = yield ft(where0);
          if(ft_callback_t_0){
            var tD0 = JSON.parse(ft_callback_t_0);
            for(var i=0;i<tD0.datas.length;i++){
              if(surfaceT >= tD0.datas[i].minValue&&surfaceT < tD0.datas[i].maxValue){
                surfaceTLevel = tD0.datas[i].level;
                minValue_t = tD0.datas[i].minValue;
                maxValue_t = tD0.datas[i].maxValue
              }
            }
            if(!surfaceTLevel&&surfaceTLevel!=0){
              surfaceTLevel = 4;
            }
          }else {
            surfaceTLevel = 4;
          }
        }catch (e){
          cb(null,{
            ret:0,
            msg:e
          });
          return false;
        }
      }else {
        visibilityLevel = 4;
      }
      //水膜厚度
      if(data.waterFilmThickness!='undefined'&&data.waterFilmThickness){
        waterFilmThickness = Number(data.waterFilmThickness);
        try {
          var ft_callback_w_0;
          var minValue_w,maxValue_w;
          var where0 = {
            thresholdType:'2',
            meterNbr:'0'
          };
          ft_callback_w_0 = yield ft(where0);
          if(ft_callback_w_0){
            var wD0 = JSON.parse(ft_callback_w_0);
            for(var i=0;i<wD0.datas.length;i++){
              if(waterFilmThickness >= wD0.datas[i].minValue&&waterFilmThickness < wD0.datas[i].maxValue){
                waterFilmThicknessLevel = wD0.datas[i].level;
                minValue_w = wD0.datas[i].minValue;
                maxValue_w = wD0.datas[i].maxValue
              }
            }
            if(!waterFilmThicknessLevel&&waterFilmThicknessLevel!=0){
              waterFilmThicknessLevel = 4;
            }
          }else {
            waterFilmThicknessLevel = 4;
          }
        }catch (e){
          cb(null,{
            ret:0,
            msg:e
          });
          return false;
        }
      }else {
        visibilityLevel = 4;
      }
      //路面状况
      if(data.roadSituation!='undefined'&&data.roadSituation){
        roadSituation = data.roadSituation;
        if(roadSituation == 35){
          try {
            var ft_callback_r_0;
            var minValue_r,maxValue_r;
            var where0 = {
              thresholdType:'1',
              meterNbr:'0'
            };
            ft_callback_r_0 = yield ft(where0);
            if(ft_callback_v_0){
              var rD0 = JSON.parse(ft_callback_r_0);
              for(var i=0;i<rD0.datas.length;i++){
                if(iceRate >= rD0.datas[i].minValue&&iceRate < rD0.datas[i].maxValue){
                  roadSituationLevel = rD0.datas[i].level;
                  minValue_r = rD0.datas[i].minValue;
                  maxValue_r = rD0.datas[i].maxValue
                }
              }
              if(!roadSituationLevel&&roadSituationLevel!=0){
                roadSituationLevel = 4;
              }
            }else {
              roadSituationLevel = 4;
            }

          } catch (e) {
            cb(null,{
              ret:0,
              msg:e
            });
            return false;
          }
        }else {
          roadSituationLevel = 4;
        }
      }else {
        visibilityLevel = 4;
      }
      //获取最高级别
      level = Math.min.apply(null, [visibilityLevel,roadSituationLevel,waterFilmThicknessLevel,surfaceTLevel]);
      var upTime = Date.now();
      var sysCode = data.sysCode;
      var websocketMsg1 = {
        Vtype:"1",				//数据类型 1：实时气象数据
        index:upTime,	//唯一性编号
        upTime: format(Date.now()),		//时间
        visibility: visibility,			//10分钟能见度
        visibilityLevel:visibilityLevel,			//能见度等级，数据字典0008
        surfaceT: surfaceT,			//路面温度
        surfaceTLevel: surfaceTLevel, //路面温度等级
        waterFilmThickness: waterFilmThickness,		//水膜厚度
        waterFilmThicknessLevel:waterFilmThicknessLevel,		//水膜厚度等级，数据字典0008
        roadSituation: roadSituation,			//路面状况，数字具体代表的含义待定
        roadSituationLevel:roadSituationLevel, //路面状况等级
        level:level,
        sysCode:sysCode,
        state:0,
        iceRate:iceRate,
        source:0,
        addr:addr
      };
      sendMsg(websocketMsg1);
      websocketMsg1.delFlag = 1;
      websocketMsg1.upTime = upTime;
      meteorological_data.create(websocketMsg1,function (err, rs) {
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
    });
  };
  meteorological_data.remoteMethod('manual_add', {
    description:'人工添加气象数据',
    accepts: {arg:'data', type:'Object',required:true,http: { source: 'body' }},
    http: {path:'/manual_add',verb:'post'},
    returns: {arg: 'res', type: 'Object',root:true,required:true}
  });
};

//获取阀值
function findThreshold(where,callback) {
  var opt = {
    method: "POST",
    host: config.localhost,
    port: config.port,
    path:'/api/s_thresholds/list',
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
        callback(null,data);
      });
    }
    else {
      callback('error',null)
    }
  });
  requ.write(JSON.stringify(where) + "\n");
  requ.end('');
  requ.on('error',function(e){
    callback('Error got: '+e.message,null);
  });

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
