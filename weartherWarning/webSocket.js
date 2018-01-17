/**
 * Created by dell on 2017/6/23.
 */
var  clientList = [];
var WebSocketServer = require('ws').Server;
var wss;
var cleanup = [];
var co = require('co');
var thunkify = require('thunkify');
var config = require('./bin/config');
var key = [];
var cacheDic = require('./cacheDic');
var http = require('http');
var log4js = require('log4js');
log4js.configure("./logConfig.json");
var logInfo = log4js.getLogger('logInfo');

exports.init=function(){
    wss = new WebSocketServer({ port: 8020 });
    wss.on('connection', function (client) {

        client.send(JSON.stringify({"ret":2}));
        // clientList.push(client);
        client.on('message', function (message) {
            try{

                var msg = JSON.parse(message);
                if(msg.type=="0") {
                    client.subRapid =msg.value;
                    clientList.push(client);
                    co(function *() {
                        //查询监控系统
                        try{
                            var fsys = thunkify(findSystem);
                            var wheresys = {};
                            var sys = yield fsys(wheresys);
                            sys = JSON.parse(sys);
                        }catch (e){
                            logInfo.error("getSystem:" + e);
                        }
                        if(sys){
                            for(var i = 0;i<sys.datas.length;i++){
                                //气象预警离线推送
                                try {
                                    var fwd = thunkify(findWeatherData);
                                    var upTimeStart = Date.now() - config.weatherWarningMinute * 60 * 1000;
                                    var upTimeEnd = Date.now();
                                    var wheref = {
                                        sysCode:sys.datas[i].sysCode,
                                        upTimeStart:upTimeStart.toString(),
                                        upTimeEnd:upTimeEnd.toString()
                                    };
                                    var wD = yield fwd(wheref);
                                    var msg1 = JSON.parse(wD);
                                    // if(msg1.datas.length>=3){
                                    //     for (var k = 2; k >=0; k--) {
                                    if(msg1.datas.length!=0){
                                        msg1.datas[0].upTime = format(msg1.datas[0].upTime);
                                        client.send(JSON.stringify(msg1.datas[0]));
                                    }

                                        // }
                                    // }else {
                                    //     for (var k = msg1.datas.length -1; k >=0; k--) {
                                    //         msg1.datas[k].upTime = format(msg1.datas[k].upTime);
                                    //         client.send(JSON.stringify(msg1.datas[k]));
                                    //     }
                                    // }

                                }catch (e){
                                    logInfo.error("WeatherData offline:" + e);
                                }
                                //人工上报离线推送
                                try {
                                    var fmd = thunkify(findmanualReportData);
                                    var date = getNowFormatDate();
                                    // var upTimeStart = new Date(date).valueOf() - config.manualReportDay * 24 * 3600 * 1000;
                                    // var upTimeEnd = new Date(date).valueOf();
                                    var wheref = {
                                        state:'0',
                                        // upTimeStart:upTimeStart.toString(),
                                        // upTimeEnd:upTimeEnd.toString(),
                                        sysCode:sys.datas[i].sysCode
                                    };
                                    var mD = yield fmd(wheref);
                                    var msg2 = JSON.parse(mD);
                                    // if(msg2.datas.length>=3){
                                    //     for (var m = 2; m >=0; m--) {
                                    if(msg2.datas.length!=0){
                                        msg2.datas[0].upTime = format(msg2.datas[0].upTime);
                                        msg2.datas[0].Vtype = '2';
                                        client.send(JSON.stringify(msg2.datas[0]));
                                    }

                                    //     }
                                    // }else {
                                    //     for (var m = msg2.datas.length - 1; m >=0; m--) {
                                    //         msg2.datas[m].upTime = format(msg2.datas[m].upTime);
                                    //         msg2.datas[m].Vtype = '2';
                                    //         client.send(JSON.stringify(msg2.datas[m]));
                                    //     }
                                    // }

                                }catch (e){
                                    logInfo.error("ManualReportData offline:" + e);
                                }
                            }
                        }
                    });
                }
                if(msg.type=="1") {

                }

            }
            catch (e){
                console.log(e);
            }

        });
        client.on('close', function (e) {
            clientList.splice(clientList.indexOf(client), 1); // 删除数组中的指定元素
        });
    });

    console.log('websocket启动成功');
//定时推送设备状态
    setInterval(function(){
        var opt = {
            method: "POST",
            host: config.dataServerHost,
            port: config.dataServerPort,
            path:'/api/d_statuses/list',
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
                    data = JSON.parse(data);
                    var msg = {
                        status:data.datas
                    };
                    msg.Vtype = '3';
                    websocketSend(msg);
                });
            }
            else {
                logInfo.error("获取设备状态失败");
            }
        });
        requ.write(JSON.stringify({}) + "\n");
        requ.end('');
        requ.on('error',function(e){
            logInfo.error("获取设备状态失败："+e);
        });
    },config.statusDelaytime * 60 * 1000);

};

exports.writeRapid=function(msg){
    try {
        for(var i=0;i<clientList.length;i++){
            // clientList[i].send("test");
            for(var j=0;j<clientList[i].subRapid.length;j++){
                if(clientList[i].subRapid[j]==msg.Vtype){

                    try{
                        clientList[i].send(JSON.stringify(msg));
                    }
                    catch (e){
                        cleanup.push(clientList[i]) ;

                    }

                }
            }

        }


    }
    catch (e){
    }

};
function websocketSend(msg){
    try {
        for(var i=0;i<clientList.length;i++){
            // clientList[i].send("test");
            for(var j=0;j<clientList[i].subRapid.length;j++){
                if(clientList[i].subRapid[j]==msg.Vtype){

                    try{
                        clientList[i].send(JSON.stringify(msg));
                    }
                    catch (e){
                        cleanup.push(clientList[i]) ;

                    }

                }
            }

        }


    }
    catch (e){
    }

}

exports.socketTest=function(msg){
    try {
        for(var i=0;i<clientList.length;i++){
            // clientList[i].send("test");

            clientList[i].send(JSON.stringify(msg));


        }


    }
    catch (e){
    }

};

exports.cleanClient = function () {
    setInterval(function() {
        for(var i=0;i<cleanup.length;i+=1) {
            clientList[i].destroy();
            clientList.splice(clientList.indexOf(cleanup[i]), 1);
            console.log("当前连接数："+clientList.length);
        }
    }, 1000);
};

//查询气象设备
function findWeatherDevice(param,callback) {
    var opt = {
        method: "POST",
        host: config.dataServerHost,
        port: config.dataServerPort,
        path:'/api/d_visibility_meters/list',
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
    requ.write(JSON.stringify(param) + "\n");
    requ.end('');
    requ.on('error',function(e){
        callback('Error got: '+e.message,null);
    });
}

//查询气象数据
function findWeatherData(param,callback) {
    var opt = {
        method: "POST",
        host: config.dataServerHost,
        port: config.dataServerPort,
        path:'/api/meteorological_data/list',
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
    requ.write(JSON.stringify(param) + "\n");
    requ.end('');
    requ.on('error',function(e){
        callback('Error got: '+e.message,null);
    });
}

//查询人工上报
function findmanualReportData(param,callback){
    var opt = {
        method: "POST",
        host: config.dataServerHost,
        port: config.dataServerPort,
        path:'/api/manual_reports/list',
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
    requ.write(JSON.stringify(param) + "\n");
    requ.end('');
    requ.on('error',function(e){
        callback('Error got: '+e.message,null);
    });
}

//查询监控系统
function findSystem(param,callback) {
    var opt = {
        method: "POST",
        host: config.dataServerHost,
        port: config.dataServerPort,
        path:'/api/s_surveillance_systems/list',
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
    requ.write(JSON.stringify(param) + "\n");
    requ.end('');
    requ.on('error',function(e){
        callback('Error got: '+e.message,null);
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


function getNowFormatDate() {
    var date = new Date();
    var seperator1 = "-";
    var seperator2 = ":";
    var month = date.getMonth() + 1;
    var strDate = date.getDate();
    if (month >= 1 && month <= 9) {
        month = "0" + month;
    }
    if (strDate >= 0 && strDate <= 9) {
        strDate = "0" + strDate;
    }
    var currentdate = date.getFullYear() + seperator1 + month + seperator1 + strDate
        + " " + "23:59:59";
    return currentdate;
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

