'use strict';
var bodyParser = require('body-parser');
var dicData = require('../../dicData');
var dicType = require('../../dictype');
var config = require('../../config');
var fs = require('fs');
var http = require('http');
var https = require('https');
var mongodb = require('mongodb');
var ObjectID = mongodb.ObjectID;
var logs = require('../../logServer');
var archiver = require('archiver');
var request = require('request');
var Bagpipe = require('bagpipe');
var chokidar = require('chokidar');

var path = require('path');

module.exports = function(server) {
  // Install a `/` route that returns server status
  server.use(bodyParser.json({limit: '100000kb'}));
  server.use(bodyParser.urlencoded({ limit: '100000kb',extended: false }));

  var router = server.loopback.Router();
  router.get('/', server.loopback.status());
  router.get('/api/screen/all',function (req,res) {
    server.models.d_vms.find({include:"programList"},function (err, vms) {
      if(err) res.json({
        ret:0,
        msg:err
      });
      server.models.d_vsl.find({include:"programList"},function (err, vsl) {
        if(err) res.json({
          ret:0,
          msg:err
        });
        res.json({
          ret:1,
          datas:vms.concat(vsl),
          msg:'查询成功'
        });
      });
    })
  });
  router.get('/api/site/all',function (req,res) {
    server.models.d_monitor_site.find(function (err, site) {
      if(err) res.json({
        ret:0,
        msg:err
      });
      server.models.d_vmrs.find(function (err, vmrs) {
        if(err) res.json({
          ret:0,
          msg:err
        });
        for(var i = 0;i<site.length;i++){
          site[i].device_nbr = site[i].site_nbr;
        }
        for(var j = 0;j<site.length;j++){
          site[j].device_name = site[j].site_name;
        }
        res.json({
          ret:1,
          datas:site.concat(vmrs),
          msg:'查询成功'
        });
      });
    });
  });
  //反向视频卡口——抓拍相机——视频
  router.post('/api/site/video',function (req,res) {
    var data = req.body;
    server.models.d_capture_camera.find({include:'video',where:{site_nbr:data.device_nbr}},function (err, rs) {
      if(err) res.json({
        ret:0,
        msg:err
      });
      res.json({
        ret:1,
        datas:rs,
        msg:'查询成功'
      });
    });
  });
  //建立admin用户
  router.get('/createAdmin',function (req, res) {
    var mongoDs = server.dataSources.mongods;
    mongoDs.automigrate('AccessToken', function(err){

      if(err) throw err;
    });
    mongoDs.automigrate('sys_user', function(err){

      if(err) throw err;

      var sys_user = server.models.sys_user;
      var Role = server.models.Role;
      var RoleMapping = server.models.RoleMapping;

      sys_user.create([
        {
          other_org_id:'',
          org_id:'',
          police_id:'admin',
          username: 'admin',
          password: '123456',
          latest_login_time:Date.now(),
          total_login_counts:0,
          name:'admin',
          state:1
        }
      ], function(err, users) {
        if (err) {
          throw err;
        }
        mongoDs.automigrate('Role', function(err){
          if(err) throw err;
          mongoDs.automigrate('RoleMapping', function(err){
            if(err) throw err;
            var userid = users[0].id;
            Role.create({
              name: 'admin'
            }, function(err, role) {
              console.log('Created role:', role);

              role.principals.create({
                principalType: RoleMapping.USER
                , principalId: userid
              }, function(err, principal) {
                if (err) throw err;
                res.json({
                  msg:'admin账号创建成功'
                });
              });
            });
          });
        });
      });
    });
  });

  //初始化系统代码
  router.get('/dicInit',function (req, res) {
    server.models.sys_code.destroyAll(function (err, count) {
      if(err) res.json({
        ret:0,
        msg:'数据字典初始化失败'
      });
      server.models.sys_code.create(dicData,function (err, rs) {
        if(err) res.json({
          ret:0,
          msg:'数据字典初始化失败'
        });
        server.models.sys_code_type.destroyAll(function (err, count) {
          if (err) res.json({
            ret: 0,
            msg: '数据字典初始化失败'
          });
          server.models.sys_code_type.create(dicType, function (err, rs) {
            if (err) res.json({
              ret: 0,
              msg: '数据字典初始化失败'
            });
            res.json({
              ret: 1,
              msg: '数据字典初始化成功'
            });
          });
        });
      })
    })
  });

  // router.get('/speedBrand',function (req, res) {
  //   var imgName = req.query.imgName;
  //   var url = config.imgUrl+imgName;
  //   var bData = fs.readFileSync(url);
  //   var base64Str = bData.toString('base64');
  //   var datauri = 'data:image/png;base64,' + base64Str;
  //   res.write(datauri);
  // });

  //单个违法数据导出接口
  router.post('/api/vio/export',function (req, res) {
    // var query = req.query;
    var data = req.body;
    var images=[];
    var arr = [];
    var zipArchiver = archiver('zip',{
      zlib: { level: 9 } // Sets the compression level.
    });
    data.id.split(",").forEach(function(item){
      arr.push(ObjectID(item));
    });
    server.models.violation_vehicle.find({where:{_id:{inq: arr}}},function (err, rs) {
      if(err) {
        res.json({
          ret: 0,
          msg: err
        });
        return false;
      }
      for(var i = 0;i<rs.length;i++){
        // var imgUrl = "http://img1.gtimg.com/news/pics/hv1/154/170/2243/145894579.jpg";
        var imgUrl = 'http://'+config.imgFtp+'/VioImage.aspx?devicenbr='+rs[i].device_nbr+'&snapnbr='+rs[i].snap_nbr+'&server='+config.imgFtp+'&index=0';
        images.push(imgUrl);
      }
      for(var j=0;j<images.length;j++){
        zipArchiver.append(request.get(images[j]),{name:`${rs[j].plate_nbr}-${format(rs[j].passing_time)}.jpg`});
      }
      zipArchiver.on('error', function(err) {
        throw err;
      });
      res.set({
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': 'attachment; filename=export'+(new Date()).Format("yyyyMMddhhmmss")+'.zip'
      });
      zipArchiver.finalize();
      zipArchiver.pipe(res);
      var user = req.query.username;
      logs.optLog("导出" + rs.length +"条违法记录", req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.connection.socket.remoteAddress, user);
    });
  });



  var downloadImage = function(src,dest,callback){
    request.get(src).on("error",callback).pipe(fs.createWriteStream(dest)).on("close",function(){
      callback(null,dest)
    }).on('error',function (err) {
      if(err){console.log(err)}
    })

  };

  //按条件全部导出
  router.post('/api/vio/exportAll',function (req, res) {
    var data = JSON.parse(req.body.id);
    var now = Date.now();
    var images=[];
    var filter = {
      order: '_id DESC',
      where: {
        whitelist: '1',
      }
    };
    if (data.site_nbr != "undefined" && data.site_nbr) filter.where.site_nbr = {regexp:data.site_nbr};
    if (data.device_nbr != "undefined" && data.device_nbr) filter.where.device_nbr = {regexp:data.device_nbr};
    if (data.plate_nbr != "undefined" && data.plate_nbr) filter.where.plate_nbr = {regexp:data.plate_nbr};
    if (data.plate_area != "undefined" && data.plate_area) filter.where.plate_area = {regexp:data.plate_area};
    if (data.violation_behaviors != "undefined" && data.violation_behaviors&&data.violation_behaviors!="[]") filter.where.violation_behaviors = {inq:JSON.parse(data.violation_behaviors)};
    if (data.passing_time_start!="undefined"&&data.passing_time_end!="undefined"&&data.passing_time_start&&data.passing_time_end) filter.where.passing_time = {between: [Number(data.passing_time_start),Number(data.passing_time_end)]};
    server.models.violation_vehicle.find(filter,function (err, rs) {
      var count = rs.length;
      var index;
      if(count==0){
        return false;
      }
      if(count>5000){
        res.json({
          ret:0,
          msg:'图片数量过大',
          count:count
        });
        return false;
      }else if(count>=100) {
        index = parseInt(count/100);
      }else {
        index = 1;
      }
      // for(var i=0,arr=[];i<5000;i++){
      //   arr[i] = "http://192.168.10.122:2000/VioImage.jpg";
      // }
      for(var i = 0;i<rs.length;i++){
        // var imgUrl = "http://img1.gtimg.com/news/pics/hv1/154/170/2243/145894579.jpg";
        var imgUrl = 'http://'+config.imgFtp+'/VioImage.aspx?devicenbr='+rs[i].device_nbr+'&snapnbr='+rs[i].snap_nbr+'&server='+config.imgFtp+'&index=0';
        images.push(imgUrl);
      }
      var bagpipe = new Bagpipe(1);
      var k  = 0;
      var dt = dayFormat(Date.now());
      if(!fs.existsSync(`../../weartherWarning/public/images/${dt}`)){
        fs.mkdirSync(`../../weartherWarning/public/images/${dt}`);
      }
      fs.mkdirSync(`../../weartherWarning/public/images/${dt}/${now}`);
      var wang = path.resolve(`../../weartherWarning/public/images/${dt}/${now}/`);
      for(var j=0;j<rs.length;j++){

        bagpipe.push(downloadImage,images[j],`../../weartherWarning/public/images/${dt}/${now}/${rs[j].plate_nbr}-${format(rs[j].passing_time)}.jpg`,function (err,j) {
          if(err){console.log(err)}

        })
      }
      var watcher = chokidar.watch(wang, {
        ignored: /(^|[\/\\])\../,
        persistent: true
      });
      watcher.on('add',function(path,stats) {
        try{
          k+=1;
          if(k==images.length-1) {
            var msg = {};
            msg.Vtype = req.query.token;
            msg.now = now;
            sendMsg(msg);
            watcher.close();
          }
        }catch (e){
          console.log(e);
        }
      });


    //   for(var j=0;j<arr.length;j++){
    //     bagpipe.push(downloadImage,arr[j],`../../images/${dt}/${now}/${j}.jpg`,function (err,j) {
    //       if(err){console.log(err)}
    //
    //     })
    //   }
      res.json({
        ret:1,
        msg:"准备工作完成"
      });
      return false;
    });
  });

  router.get('/api/download/:id',function (req, res) {
    var now = Number(req.params.id);
    var dt = dayFormat(now);
    var archive = archiver('zip',{
        zlib: { level: 9 } // Sets the compression level.
      });
    res.set({
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': 'attachment; filename=export'+now+'.zip'
        });
    archive.directory(`../../weartherWarning/public/images/${dt}/${now}/`,now.toString());
    archive.finalize();
    archive.pipe(res);

    archive.on('error', function (err) {
      throw err;
    });
  });
  server.use(router);
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
//获取年月日
function dayFormat(shijianchuo) { //shijianchuo是整数，否则要parseInt转换
  var time = new Date(shijianchuo);
  var y = time.getFullYear();
  var m = time.getMonth()+1;
  var d = time.getDate();
  var h = time.getHours();
  var mm = time.getMinutes();
  var s = time.getSeconds();
  return y.toString()+"-"+add0(m).toString()+"-"+add0(d).toString();
}

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
