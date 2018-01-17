/**
 * Created by zll on 2016/10/19.
 * 存放定时任务模块
 */

var log4js = require('log4js');
log4js.configure("./logConfig.json");
var logInfo = log4js.getLogger('logInfos');
var mongodb = require('mongodb');
var ObjectID = mongodb.ObjectID;
var config = require('./config');
var conStr = config.dbConnStr;
var fs = require('fs');
var schedule = require('node-schedule');
var co = require('co');
var thunkify = require("thunkify");
var count1=0;
var count2=0;
let rule = new schedule.RecurrenceRule();
rule.minute = config.netCheckJob;

// let ping = require('net-ping');
// let net = require('net');

let exec = require('child_process').exec;
let log = log4js.getLogger('logInfos');
var http = require('http');

function scheduleCronstyle(){
    schedule.scheduleJob(config.passingDeleteJob, function(){
        deleteVio();
    });
    schedule.scheduleJob(config.imgDeleteJob, function(){
        var dt = dayFormat(Date.now()-24*60*60*1000);
        var path = config.imgUrl+'2017-12-12'+'/';
        deleteall(path);
    });
    schedule.scheduleJob(rule, function(){
        checkWDNet();
        checkLEDNet();
        checkSLNet();
        checkSpNet();
        checkBLNEt();
    });
    schedule.scheduleJob(config.metroDeleteJob, function(){
        deleteMetro();
    });
}

function deleteVio(){
    try {
         count1=0;
         count2=0;
        var nowdate = Date.now();
        logInfo.info('开始执行过车记录自动删除任务:');
        //查询待清理记录
        mongodb.connect(conStr, function(err, conn) {
            if (!err) {
                conn.collection('passing_vehicle', {safe: true}, function (err, dbc) {
                    if (err) {
                        logInfo.error('连接数据库出现异常：' + err);
                    }
                    else {
                        dbc.find({'passing_time': {"$lte": nowdate - config.passingSavedDay * 24 * 60 * 60 * 1000}}).toArray(function (err, rs) {
                            conn.close();
                            if (err) {
                                logInfo.error('查询过车记录表出现异常：' + err);
                            } else {
                                if (rs.length > 0) {
                                    co(function *(){
                                        for(var i=0;i<rs.length;i++)
                                        {
                                            var it=rs[i];
                                            try {
                                                //删除过车信息
                                                var dv  =thunkify(delInfo);
                                                var a = yield dv({'_id':it._id,'table':'passing_vehicle'});


                                            }
                                            catch (ex) {
                                                logInfo.error('删除过车记录：' + it.device_nbr + ' 异常信息：' + err);
                                            }
                                        }
                                        logInfo.info('共删除过车记录条数：'+count1.toString());
                                        logInfo.info('结束执行过车信息自动删除任务:');
                                    });

                                } else {
                                    logInfo.info('未查询到待删除违法记录：');
                                }
                            }
                        });
                    }
                });
            }
        });
    }
    catch (ex)
    {
        logInfo.error('删除过程出现异常：'+ex);
    }

}

//  删除气象数据
function deleteMetro(){
    try {
        count1=0;
        count2=0;
        var nowdate = Date.now();
        logInfo.info('开始执行气象数据自动删除任务:');
        //查询待清理记录
        mongodb.connect(conStr, function(err, conn) {
            if (!err) {
                conn.collection('meteorological_data', {safe: true}, function (err, dbc) {
                    if (err) {
                        logInfo.error('连接数据库出现异常：' + err);
                    }
                    else {
                        dbc.find({'upTime': {"$lte": nowdate - config.metroDataSavedDay * 24 * 60 * 60 * 1000 - 60*1000}}).toArray(function (err, rs) {
                            conn.close();
                            if (err) {
                                logInfo.error('查询气象数据出现异常：' + err);
                            } else {
                                if (rs.length > 0) {
                                    co(function *(){
                                        for(var i=0;i<rs.length;i++)
                                        {
                                            var it=rs[i];
                                            try {
                                                //删除气象数据
                                                var dv  =thunkify(delInfo);
                                                var a = yield dv({'_id':it._id,'table':'meteorological_data'});


                                            }
                                            catch (ex) {
                                                logInfo.error('删除气象数据：' + it.upTime + ' 异常信息：' + err);
                                            }
                                        }
                                        logInfo.info('共删除气象数据条数：'+count1.toString());
                                        logInfo.info('结束执行气象数据自动删除任务:');
                                    });

                                } else {
                                    logInfo.info('未查询到待删除气象数据：');
                                }
                            }
                        });
                    }
                });
            }
        });
    }
    catch (ex)
    {
        logInfo.error('删除气象数据异常：'+ex);
    }

}

//删除记录
function delInfo(whereby,callback)
{
    mongodb.connect(conStr, function(err, conn){
        if(!err) {
            conn.collection(whereby.table, {safe: true}, function (err, dbc) {
                if (err) {
                    callback('',null);
                }
                else {
                    dbc.removeMany({'_id':whereby._id}, function (err, result) {
                        if (err) {
                            //logInfo.error('查询违法记录表出现异常：' + err);
                        }
                        count1++;
                        callback('', null);
                    });
                }
                conn.close();
            });
        }
        else{
            callback('',null);
            conn.close();
        }

    });

}

function deleteall(path) {
    if(fs.existsSync(path)) {
        files = fs.readdirSync(path);
        files.forEach(function(file, index) {
            var curPath = path + "/" + file;
            if(fs.statSync(curPath).isDirectory()) { // recurse
                deleteall(curPath);
            } else { // delete file
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(path);
    }
}
function checkWDNet() {
    log.info('开始检测气象设备网络状态：');
    co(function *() {
        let wdArray;
        let online_status;
        //获取气象设备编号与IP
        try {
            let fw = thunkify(findD);
            let param = {
                table:'d_visibility_meters'
            };
            let wd = yield fw(param);
            if(wd){
                wdArray = JSON.parse(wd).datas;
            }else {
                log.error('调用数据库服务失败');
                return false;
            }
        }catch (e){
            log.error('获取气象设备信息失败：'+e);
            return false;
        }
        for(let i=0;i< wdArray.length;i++){
            let ip = wdArray[i].ip;
            let device_nbr = wdArray[i].device_nbr;
            if(ip){
                //ping
                try {
                    let np = thunkify(netPing);
                    let ping = yield np(ip);
                    if(ping){
                        online_status = 0;
                    }else {
                        online_status = 1;
                    }
                }catch (e){
                    log.error('ping ip 失败：'+e);
                    return false;
                }
            }else {
                online_status = 1;
            }
            //更新状态信息
            try {
                let up = thunkify(statusUp);
                let param = {
                    device_nbr:device_nbr,
                    online_status:online_status,
                };
                let result = yield up(param);
                if(result){
                    log.info('检测气象设备在线状态成功:'+device_nbr);
                }else {
                    log.error('更新设备状态异常');
                }
            }catch (e){
                log.error('更新设备状态失败：'+e);
                return false;
            }
        }

    });

}

function checkLEDNet() {
    log.info('开始检测LED网络状态：');
    co(function *() {
        let LEDArray;
        let online_status;
        //获取诱导屏设备
        try {
            let fvsl = thunkify(findD);
            let param = {
                table:'d_vsls'
            };
            let led = yield fvsl(param);
            if(led){
                LEDArray = JSON.parse(led).datas;
            }else {
                log.error('调用数据库服务失败');
                return false;
            }
        }catch (e){
            log.error('获取诱导屏设备信息失败：'+e);
            return false;
        }
        for(let i=0;i< LEDArray.length;i++){
            let ip = LEDArray[i].ip;
            let device_nbr = LEDArray[i].device_nbr;
            if(ip){
                //ping
                try {
                    let np = thunkify(netPing);
                    let ping = yield np(ip);
                    if(ping){
                        online_status = 0;
                    }else {
                        online_status = 1;
                    }
                }catch (e){
                    log.error('ping ip 失败：'+e);
                    return false;
                }
            }else {
                online_status = 1;
            }
            //更新状态信息
            try {
                let up = thunkify(statusUp);
                let param = {
                    device_nbr:device_nbr,
                    online_status:online_status,
                };
                let result = yield up(param);
                if(result){
                    log.info('检测诱导屏设备在线状态成功：'+device_nbr);
                }else {
                    log.error('更新设备状态异常');
                }
            }catch (e){
                log.error('更新设备状态失败：'+e);
                return false;
            }
        }

    });
}

function checkSLNet() {
    log.info('开始检测信号灯网络状态：');
    co(function *() {
        let signalArray;
        let online_status;
        //获取诱导屏设备
        try {
            let fsig = thunkify(findD);
            let param = {
                table:'d_signal_lamps'
            };
            let signal = yield fsig(param);
            if(signal){
                signalArray = JSON.parse(signal).datas;
            }else {
                log.error('调用数据库服务失败');
                return false;
            }
        }catch (e){
            log.error('获取信号灯设备信息失败：'+e);
            return false;
        }
        for(let i=0;i< signalArray.length;i++){
            let ip = signalArray[i].ip;
            let device_nbr = signalArray[i].device_nbr;
            if(ip){
                //ping
                try {
                    let np = thunkify(netPing);
                    let ping = yield np(ip);
                    if(ping){
                        online_status = 0;
                    }else {
                        online_status = 1;
                    }
                }catch (e){
                    log.error('ping ip 失败：'+e);
                    return false;
                }
            }else {
                online_status = 1;
            }
            //更新状态信息
            try {
                let up = thunkify(statusUp);
                let param = {
                    device_nbr:device_nbr,
                    online_status:online_status,
                };
                let result = yield up(param);
                if(result){
                    log.info('检测信号灯设备在线状态成功：'+device_nbr);
                }else {
                    log.error('更新设备状态异常');
                }
            }catch (e){
                log.error('更新设备状态失败：'+e);
                return false;
            }
        }

    });
}

function checkSpNet() {
    log.info('开始检测语音广播网络状态：');
    co(function *() {
        let spArray;
        let online_status;
        //获取语音广播设备
        try {
            let fsp = thunkify(findD);
            let param = {
                table:'d_broadcasts'
            };
            let sp = yield fsp(param);
            if(sp){
                spArray = JSON.parse(sp).datas;
            }else {
                log.error('调用数据库服务失败');
                return false;
            }
        }catch (e){
            log.error('获取语音广播设备信息失败：'+e);
            return false;
        }
        for(let i=0;i< spArray.length;i++){
            let ip = spArray[i].ip;
            let device_nbr = spArray[i].device_nbr;
            if(ip){
                //ping
                try {
                    let np = thunkify(netPing);
                    let ping = yield np(ip);
                    if(ping){
                        online_status = 0;
                    }else {
                        online_status = 1;
                    }
                }catch (e){
                    log.error('ping ip 失败：'+e);
                    return false;
                }
            }else {
                online_status = 1;
            }
            //更新状态信息
            try {
                let up = thunkify(statusUp);
                let param = {
                    device_nbr:device_nbr,
                    online_status:online_status,
                };
                let result = yield up(param);
                if(result){
                    log.info('检测语音广播在线状态成功：'+device_nbr);
                }else {
                    log.error('更新设备状态异常');
                }
            }catch (e){
                log.error('更新设备状态失败：'+e);
                return false;
            }
        }

    });
}

function checkBLNEt() {
    log.info('开始检测违停状态：');
    co(function *() {
        let spArray,blArray;
        let online_status;
        //获取违停视频设备IP
        try {
            let fsp = thunkify(findD);
            let param = {
                table:'d_video_cameras'
            };
            let sp = yield fsp(param);
            if(sp){
                spArray = JSON.parse(sp).datas;
            }else {
                log.error('调用数据库服务失败');
                return false;
            }
        }catch (e){
            log.error('获取语音广播设备信息失败：'+e);
            return false;
        }
        for(let i=0;i< spArray.length;i++){
            let ip = spArray[i].ip;
            if(ip){
                //ping
                try {
                    let np = thunkify(netPing);
                    let ping = yield np(ip);
                    if(ping){
                        online_status = 0;
                    }else {
                        online_status = 1;
                    }
                }catch (e){
                    log.error('ping ip 失败：'+e);
                    return false;
                }
            }else {
                online_status = 1;
            }
            //  查询所属违停
            try {
                let fb = thunkify(findD);
                let param = {
                    table:'d_violation_balls',
                    video_code:spArray[i].device_nbr
                };
                let bl = yield fb(param);
                if(bl){
                    blArray = JSON.parse(bl).datas;
                }else {
                    log.error('调用数据库服务失败');
                    return false;
                }
            }catch (e){
                log.error('获取违停设备信息失败：'+e);
                return false;
            }
            //更新状态信息
            if(blArray.length!==0){
                let device_nbr = blArray[0].device_nbr;
                try {
                    let up = thunkify(statusUp);
                    let param = {
                        device_nbr:device_nbr,
                        online_status:online_status,
                    };
                    let result = yield up(param);
                    if(result){
                        log.info('检测违停在线状态成功：'+device_nbr);
                    }else {
                        log.error('更新设备状态异常');
                    }
                }catch (e){
                    log.error('更新设备状态失败：'+e);
                    return false;
                }
            }
        }
    });
}

//ping
function netPing(ip,callback) {
    let cmd = "ping "+ip;
    exec(cmd, function (err, stdout, stderr) {
        if(err) {
            callback(null,false);
            return false;
        }
        callback(null,true)
    });
}

//查询设备
function findD(param, callback) {
    let path = '/api/'+param.table+'/list';
    let opt = {
        method: "POST",
        host: config.dataServerHost,
        port: config.dataServerPort,
        path: path,
        headers: {
            "Content-Type": 'application/json'
        }
    };
    let requ = http.request(opt, function (serverFeedback) {
        if (serverFeedback.statusCode == 200) {
            let body = [];
            serverFeedback.on('data', function (data) {
                body.push(data);
            }).on('end', function () {
                let data= Buffer.concat(body).toString();
                if(JSON.parse(data).ret == 1)
                    callback(null,data);
                else callback(null,false);
            });
        }
        else {
            callback('error',null)
        }
    });
    requ.write(JSON.stringify(param) + "\n");
    requ.end('');
    requ.on('error',function(e){
        callback('Error got: '+e.message,null);
    });
}

//更新设备状态
function statusUp(param, callback) {
    param.fault_status = 2;
    param.fault_code = '';
    param.timeDiff = 0;
    let opt = {
        method: "POST",
        host: config.dataServerHost,
        port: config.dataServerPort,
        path:'/api/d_statuses/statusUpdate',
        headers: {
            "Content-Type": 'application/json'
        }
    };
    let requ = http.request(opt, function (serverFeedback) {
        if (serverFeedback.statusCode == 200) {
            let body = [];
            serverFeedback.on('data', function (data) {
                body.push(data);
            }).on('end', function () {
                let data= Buffer.concat(body).toString();
                if(JSON.parse(data).ret==1)
                    callback(null,true);
                else callback(null,false);
            });
        }
        else {
            callback('error',null)
        }
    });
    requ.write(JSON.stringify(param) + "\n");
    requ.end('');
    requ.on('error',function(e){
        callback('Error got: '+e.message,null);
    });
}

exports.init=function(){
    //fs.stat('/home/cy/fsWeb/public/vioImage/6050v.png', function(err, stats) {
    //
    //    if (err) { console.log(err);}
    //
    //    console.log(stats.size);
    //
    //});
    // deleteVio();
    scheduleCronstyle();
    logInfo.info('定时任务启动成功');
    console.log('定时任务启动成功');
};

//获取年月日
function add0(m){return m<10?'0'+m:m }
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

// 对Date的扩展，将 Date 转化为指定格式的String
// 月(M)、日(d)、小时(h)、分(m)、秒(s)、季度(q) 可以用 1-2 个占位符，
// 年(y)可以用 1-4 个占位符，毫秒(S)只能用 1 个占位符(是 1-3 位的数字)
// 例子：
// (new Date()).Format("yyyy-MM-dd hh:mm:ss.S") ==> 2006-07-02 08:09:04.423
// (new Date()).Format("yyyy-M-d h:m:s.S")      ==> 2006-7-2 8:9:4.18
Date.prototype.Format = function (fmt) { //author: meizz
    let o = {
        "M+": this.getMonth() + 1,                 //月份
        "d+": this.getDate(),                    //日
        "h+": this.getHours(),                   //小时
        "m+": this.getMinutes(),                 //分
        "s+": this.getSeconds(),                 //秒
        "q+": Math.floor((this.getMonth() + 3) / 3), //季度
        "S": this.getMilliseconds()             //毫秒
    };
    if (/(y+)/.test(fmt))
        fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
    for (let k in o)
        if (new RegExp("(" + k + ")").test(fmt))
            fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
    return fmt;
};