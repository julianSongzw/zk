/**
 * Created by dell on 2017/6/23.
 */
module.exports = {
    'dbConnStr': 'mongodb://admin:hfahsoft@192.168.10.139:27017/zhoukou',//配置mongodb连接串
    'logHost':'192.168.10.139:27017',//日志host
    'pwd':'123456', //默认系统登录密码
    'logSavedDay': 7, //系统日志保存在服务器上的时间(单位：天)
    'logDeleteJob': '30 50 23 * * *', //系统日志自动删除 cron风格定时器（6个占位符从左到右分别代表：秒、分、时、日、月、周几，'*'表示通配符）
    'accessControlAllowOrigin':'*', //请求header参数
    'rabittMQUrl':'amqp://admin:public123@192.168.10.139:5672',
    'mqttUrl':'tcp://41.183.11.165:1883',
    'websocketUrl':'41.183.11.167:8020',
    'transportServerHost':'192.168.10.139',   //数据分析与传输服务host
    'transportServerPort':3300,                 //数据分析与传输服务port
    'deviceControlServerHost':'192.168.10.192',   //设备联动服务host
    'deviceControlServerPort':9007,                  //设备联动服务port
    'intervalSpeedServerHost':'41.183.11.167',    //区间设备备案host
    'intervalSpeedServerPort':9006,                    //区间设备备案port
    'port':3000,                                       //本服务端口号
    'imgUrl':'../public/img/',                      //限速牌图片路径
    'frogServerHost':'41.183.11.167',            //雾灯控制服务host
    'frogServerPort':9003,                          //雾灯控制服务port
    'screenServerHost':'41.183.11.167',            //诱导屏控制服务host
    'screenServerPort':8000,                           //诱导屏控制服务port
    'shuntLightServerHost':'41.183.11.167',            //信号灯控制服务host
    'shuntLightServerPort':9005,                           //信号灯控制服务port
    'broadcastServerHost':'41.183.11.167',            //高音喇叭控制服务host
    'broadcastServerPort':9001,                           //高音喇叭控制服务port
    'imgFtp':'41.183.11.165',                      //图片访问服务
    'overSpeedMargin':0.1,                           //超高速允许系数
	  'vioSavedDay': 15, //过车数据保存在服务器上的时间(单位：天)
    'vioDeleteJob': '30 50 23 * * *', //违法记录自动删除 cron风格定时器（6个占位符从左到右分别代表：秒、分、时、日、月、周几，'*'表示通配符）
    'localhost': '192.168.10.139',
};
