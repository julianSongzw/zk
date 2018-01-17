/**
 * Created by zll on 2016/7/28.
 * 配置文件
 */
module.exports = {
    'jwtTokenSecret': 'E201002007',//配置token加密key
    'dbConnStr': 'mongodb://admin:hfahsoft@localhost:27017/zhoukou',//配置mongodb连接串
    'logHost':'192.168.10.139:27017',//日志host
    'pwd':'123456', //默认管理系统登录密码
    'logSavedDay': 7, //系统日志保存在服务器上的时间(单位：天)
    'logDeleteJob': '30 50 23 * * *', //系统日志自动删除 cron风格定时器（6个占位符从左到右分别代表：秒、分、时、日、月、周几，'*'表示通配符）
    'accessControlAllowOrigin':'*', //请求header参数
    'rabittMQUrl':'amqp://admin:public123@192.168.10.139:5672',
    'ice2mq':'amqp://admin:public123@192.168.10.139:5672',  //ice2mq  地址
    'passingVehicleExchange':'surevy_center',        //过车数据exchange
    'violationVehicleExchange':'surevy_center',     //违法数据exchange
    'passingVehicleRouting':'ice_passing_vehicle',  //过车数据routing
    'violationVehicleRouting':'ice_violation_vehicle',  //违法数据routing
    'deviceStatusExchange':'SURVEY_CENTE', //设备状态exchange
    'deviceStatusRouting':'ah_devicestatus_key',    //设备状态routing
    'weatherInfoExchange':'amq.topic',              //气象数据的exchange
    'weatherInfoRouting':'ddd',              //气象数据的routing
    'weatherInfoQueue':'ddd',              //气象数据的queue
    'mqttUrl':'tcp://192.168.10.139:1883',
    'dataServerHost':'192.168.10.139',      //数据库服务host
    'dataServerPort':3000,                     //数据库服务post
    'manualReportDay':2,                     //人工上报离线推送天数
    'statusDelaytime':1,                     //设备状态定时推送时间  单位: 分钟
    'weatherWarningMinute':10,               //离线气象数据推送时间   单位：分钟
    'soundFilename':'weiting.wav',          //违停喊话文件名
    'passingSavedDay': 15, //过车数据保存在服务器上的时间(单位：天)
    'passingDeleteJob': '30 50 23 * * *', //违法记录自动删除 cron风格定时器（6个占位符从左到右分别代表：秒、分、时、日、月、周几，'*'表示通配符）
    'imgUrl':'./public/images/',
    'imgDeleteJob': '30 55 23 * * *', //违法记录自动删除 cron风格定时器（6个占位符从左到右分别代表：秒、分、时、日、月、周几，'*'表示通配符）
    'netCheckJob':[0,10,20,30,40,50],        //设备在线检测周期
    'metroDataSavedDay':7,              //  气象数据保存天数
    'metroDeleteJob': '30 00 00 * * 1', //气象数据自动删除 cron风格定时器（6个占位符从左到右分别代表：秒、分、时、日、月、周几，'*'表示通配符）
    'weitingVioCode':'1039',        //  违停违法代码
};