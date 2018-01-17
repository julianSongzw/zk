/**
 * Created by dell on 2017/6/9.
 */
let amqp = require('amqp');
var config = require('./bin/config');
var log4js = require('log4js');
log4js.configure("./logConfig.json");
var logInfo = log4js.getLogger('logInfos');
var co = require('co');
var thunkify = require('thunkify');
var connection = amqp.createConnection({url: config.rabittMQUrl});
var pass_vio_connection = amqp.createConnection({url: config.ice2mq});
var http = require('http');
var meteorologyInfo = {};
var websocket = require('./websocket');
var cacheDic = require('./cacheDic');
var arr1 = [];
var arr2 = [];

exports.service1Start = function () {          //预警数据mq
    try {
        logInfo.info('预警开启');
        connection.on('ready', function () {
            var exchange = connection.exchange(config.weatherInfoExchange, {type: 'direct', autoDelete: false});
            connection.queue(config.weatherInfoQueue, {durable: true, autoDelete: false}, function (queue) {
                console.log('Queue ' + queue.name + ' is open!');
                queue.bind(config.weatherInfoExchange, config.weatherInfoRouting, function () {
                    // exchange.publish("weatherInfo", weatherInf,{deliveryMode:2});
                    // return false;
                    queue.subscribe(function (message, header, deliveryInfo) {
                        if (message) {
                            // var meteo = JSON.parse(message.data.toString());
                            var meteo = message;
                            if (JSON.stringify(meteo.data) == '{}') {
                                return false;
                            }
                            else {
                                var roadSituationLevel;
                                var visibilityLevel, surfaceTLevel, waterFilmThicknessLevel;
                                var level, visibility, surfaceT, waterFilmThickness, roadSituation, iceRate;
                                var upTime = meteo.data.uploadDate;
                                var upTimeStr = upTime.substring(0, 4) + '-' + upTime.substring(4, 6) + '-' + upTime.substring(6, 8) + ' ' + upTime.substring(8, 10) + ':' + upTime.substring(10, 12) + ':' + upTime.substring(12, 14);
                                var upTimeToNumber = (new Date(upTimeStr)).valueOf();
                                var eqId = meteo.data.deviceNo;
                                if (Number(meteo.data.uploadInterval) == 1) visibility = Number(meteo.data.visibility1);
                                if (Number(meteo.data.uploadInterval) == 10) visibility = Number(meteo.data.visibility10);
                                surfaceT = Number(meteo.data.roadTem);
                                waterFilmThickness = Number(meteo.data.waterHeight);
                                roadSituation = Number(meteo.data.roadCondition);
                                iceRate = Number(meteo.data.icePecent);


                                co(function* () {

                                    //查询气象设备名称和点位信息
                                    try {
                                        var fn = thunkify(findWeatherDevice);
                                        var fsys = thunkify(findSystem);
                                        var eqName, addr, sysCode, sysName;
                                        var wheref = {
                                            device_nbr: eqId
                                        };
                                        var callback = yield fn(wheref);
                                        var fsys_callback = yield fsys(wheref);
                                        if (JSON.parse(callback).ret == 1) {
                                            eqName = JSON.parse(callback).datas[0].device_name;
                                            addr = JSON.parse(callback).datas[0].address;

                                        }
                                        if (JSON.parse(fsys_callback).ret == 1) {
                                            sysCode = JSON.parse(fsys_callback).datas[0].sys_code;
                                        }
                                    } catch (err) {
                                        logInfo.error("findWeatherDeviceName:" + err);
                                    }
                                    if (sysCode == undefined) {
                                        return false;
                                    }
                                    var ft = thunkify(findThreshold);
                                    //数据分析、推送、入库服务
                                    //能见度预警级别判定

                                    try {

                                        var ft_callback_v, ft_callback_v_0;
                                        var minValue_v, maxValue_v;
                                        var wheref = {
                                            thresholdType: '0',
                                            meterNbr: eqId
                                        };
                                        var where0 = {
                                            thresholdType: '0',
                                            meterNbr: '0'
                                        };
                                        ft_callback_v = yield ft(wheref);
                                        ft_callback_v_0 = yield ft(where0);
                                        if (ft_callback_v && ft_callback_v_0) {
                                            var vD = JSON.parse(ft_callback_v);
                                            var vD0 = JSON.parse(ft_callback_v_0);
                                            if (vD.datas.length != 0) {
                                                for (var i = 0; i < vD.datas.length; i++) {
                                                    if (visibility >= vD.datas[i].minValue && visibility < vD.datas[i].maxValue) {
                                                        visibilityLevel = vD.datas[i].level;
                                                        minValue_v = vD.datas[i].minValue;
                                                        maxValue_v = vD.datas[i].maxValue;
                                                    }
                                                }
                                            } else {
                                                for (var i = 0; i < vD0.datas.length; i++) {
                                                    if (visibility >= vD0.datas[i].minValue && visibility < vD0.datas[i].maxValue) {
                                                        visibilityLevel = vD0.datas[i].level;
                                                        minValue_v = vD0.datas[i].minValue;
                                                        maxValue_v = vD0.datas[i].maxValue;
                                                    }
                                                }

                                            }

                                            if (!visibilityLevel && visibilityLevel != 0) {
                                                visibilityLevel = 4;
                                            }
                                        } else {
                                            logInfo.error("findThreshold:error");
                                        }

                                    } catch (err) {
                                        logInfo.error("dataAnalysis:" + err);
                                    }


                                    //路面状况预警判定
                                    if (roadSituation == 35) {
                                        try {
                                            var ft_callback_r, ft_callback_r_0;
                                            var minValue_r, maxValue_r;
                                            var wheref = {
                                                thresholdType: '1',
                                                meterNbr: eqId
                                            };
                                            var where0 = {
                                                thresholdType: '1',
                                                meterNbr: '0'
                                            };
                                            ft_callback_r = yield ft(wheref);
                                            ft_callback_r_0 = yield ft(where0);
                                            if (ft_callback_r && ft_callback_v_0) {
                                                var rD = JSON.parse(ft_callback_r);
                                                var rD0 = JSON.parse(ft_callback_r_0);
                                                if (rD.datas.length != 0) {
                                                    for (var i = 0; i < rD.datas.length; i++) {
                                                        if (iceRate >= rD.datas[i].minValue && iceRate < rD.datas[i].maxValue) {
                                                            roadSituationLevel = rD.datas[i].level;
                                                            minValue_r = rD.datas[i].minValue;
                                                            maxValue_r = rD.datas[i].maxValue
                                                        }
                                                    }
                                                } else {
                                                    for (var i = 0; i < rD0.datas.length; i++) {
                                                        if (iceRate >= rD0.datas[i].minValue && iceRate < rD0.datas[i].maxValue) {
                                                            roadSituationLevel = rD0.datas[i].level;
                                                            minValue_r = rD0.datas[i].minValue;
                                                            maxValue_r = rD0.datas[i].maxValue
                                                        }
                                                    }
                                                }

                                                if (!roadSituationLevel && roadSituationLevel != 0) {
                                                    roadSituationLevel = 4;
                                                }
                                            } else {
                                                logInfo.error("findThreshold:error");
                                            }

                                        } catch (err) {
                                            logInfo.error("dataAnalysis:" + err);
                                        }
                                    } else {
                                        roadSituationLevel = 4;
                                    }
                                    //路面温度判断
                                    try {
                                        var ft_callback_t, ft_callback_t_0;
                                        var minValue_t, maxValue_t;
                                        var wheref = {
                                            thresholdType: '3',
                                            meterNbr: eqId
                                        };
                                        var where0 = {
                                            thresholdType: '3',
                                            meterNbr: '0'
                                        };
                                        ft_callback_t = yield ft(wheref);
                                        ft_callback_t_0 = yield ft(where0);
                                        if (ft_callback_t && ft_callback_t_0) {
                                            var tD = JSON.parse(ft_callback_t);
                                            var tD0 = JSON.parse(ft_callback_t_0);
                                            if (tD.datas.length != 0) {
                                                for (var i = 0; i < tD.datas.length; i++) {
                                                    if (surfaceT >= tD.datas[i].minValue && surfaceT < tD.datas[i].maxValue) {
                                                        surfaceTLevel = tD.datas[i].level;
                                                        minValue_t = tD.datas[i].minValue;
                                                        maxValue_t = tD.datas[i].maxValue
                                                    }
                                                }
                                            } else {
                                                for (var i = 0; i < tD0.datas.length; i++) {
                                                    if (surfaceT >= tD0.datas[i].minValue && surfaceT < tD0.datas[i].maxValue) {
                                                        surfaceTLevel = tD0.datas[i].level;
                                                        minValue_t = tD0.datas[i].minValue;
                                                        maxValue_t = tD0.datas[i].maxValue
                                                    }
                                                }
                                            }

                                            if (!surfaceTLevel && surfaceTLevel != 0) {
                                                surfaceTLevel = 4;
                                            }
                                        } else {
                                            logInfo.error("findThreshold:error");
                                        }

                                    } catch (err) {
                                        logInfo.error("dataAnalysis:" + err);
                                    }
                                    //水膜厚度预警判定
                                    try {
                                        var ft_callback_w, ft_callback_w_0;
                                        var minValue_w, maxValue_w;
                                        var wheref = {
                                            thresholdType: '2',
                                            meterNbr: eqId
                                        };
                                        var where0 = {
                                            thresholdType: '2',
                                            meterNbr: '0'
                                        };
                                        ft_callback_w = yield ft(wheref);
                                        ft_callback_w_0 = yield ft(wheref);
                                        if (ft_callback_w && ft_callback_w_0) {
                                            var wD = JSON.parse(ft_callback_w);
                                            var wD0 = JSON.parse(ft_callback_w_0);
                                            if (wD.datas.length != 0) {
                                                for (var i = 0; i < wD.datas.length; i++) {
                                                    if (waterFilmThickness >= wD.datas[i].minValue && waterFilmThickness < wD.datas[i].maxValue) {
                                                        waterFilmThicknessLevel = wD.datas[i].level;
                                                        minValue_w = wD.datas[i].minValue;
                                                        maxValue_w = wD.datas[i].maxValue
                                                    }
                                                }
                                            } else {
                                                for (var i = 0; i < wD0.datas.length; i++) {
                                                    if (waterFilmThickness >= wD0.datas[i].minValue && waterFilmThickness < wD0.datas[i].maxValue) {
                                                        waterFilmThicknessLevel = wD0.datas[i].level;
                                                        minValue_w = wD0.datas[i].minValue;
                                                        maxValue_w = wD0.datas[i].maxValue
                                                    }
                                                }
                                            }

                                            if (!waterFilmThicknessLevel && waterFilmThicknessLevel != 0) {
                                                waterFilmThicknessLevel = 4;
                                            }
                                        } else {
                                            logInfo.error("findThreshold:error");
                                        }

                                    } catch (err) {
                                        logInfo.error("dataAnalysis:" + err);
                                    }


                                    if (roadSituation == 35) level = Math.min.apply(null, [visibilityLevel, roadSituationLevel, waterFilmThicknessLevel, surfaceTLevel]);
                                    else level = Math.min.apply(null, [visibilityLevel, waterFilmThicknessLevel, surfaceTLevel]);

                                    var websocketMsg1 = {
                                        Vtype: "1",				//数据类型 1：实时气象数据
                                        index: eqId + '_' + upTime,	//唯一性编号
                                        eqId: eqId,			//设备编号
                                        eqName: eqName,		//设备名称
                                        upTime: upTime,		//时间
                                        visibility: visibility,			//10分钟能见度
                                        visibilityLevel: visibilityLevel,			//能见度等级，数据字典0008
                                        surfaceT: surfaceT,			//路面温度
                                        surfaceTLevel: surfaceTLevel, //路面温度等级
                                        waterFilmThickness: waterFilmThickness,		//水膜厚度
                                        waterFilmThicknessLevel: waterFilmThicknessLevel,		//水膜厚度等级，数据字典0008
                                        roadSituation: roadSituation,			//路面状况，数字具体代表的含义待定
                                        roadSituationLevel: roadSituationLevel, //路面状况等级
                                        level: level,
                                        addr: addr,
                                        sysCode: sysCode,
                                        state: 0,
                                        iceRate: iceRate,
                                        source: 1
                                    };
                                    websocket.writeRapid(websocketMsg1);
                                    //气象数据入库
                                    try {
                                        var ws = thunkify(weatherDataSave);
                                        var result;
                                        var weather = {
                                            eqId: eqId,			//设备编号
                                            eqName: eqName,		//设备名称
                                            index: eqId + '_' + upTime,	//唯一性编号
                                            upTime: upTime,		//时间
                                            visibility: visibility,			//10分钟能见度
                                            visibilityLevel: visibilityLevel,			//能见度等级，数据字典0008
                                            surfaceT: surfaceT,			//路面温度
                                            surfaceTLevel: surfaceTLevel, //路面温度等级
                                            waterFilmThickness: waterFilmThickness,		//水膜厚度
                                            waterFilmThicknessLevel: waterFilmThicknessLevel,		//水膜厚度等级，数据字典0008
                                            roadSituation: roadSituation,			//路面状况，数字具体代表的含义待定
                                            roadSituationLevel: roadSituationLevel, //路面状况等级
                                            level: level,
                                            addr: addr,
                                            sysCode: sysCode,
                                            state: 0,
                                            iceRate: iceRate,
                                            source: 1
                                        };
                                        weather.upTime = upTimeToNumber;
                                        weather.Vtype = "1";
                                        result = yield ws(weather);
                                        if (result) logInfo.info("weatherInsert:success");
                                        else logInfo.error("weatherInsert:error");
                                    } catch (err) {
                                        logInfo.error("weatherDataSave:" + err);
                                    }
                                    //检测预警信息等级是否变化，如果变化则推送预警信息并入库
                                    try {
                                        var ex = thunkify(exist);
                                        var wSave = thunkify(wSave_f);
                                        var ex_callback;
                                        var wSave_callback;
                                        var whereEx = {
                                            eqId: eqId,
                                            pageSize: 1,
                                            pageIndex: 1,
                                            state: [0, 1],
                                            delFlag: 1
                                        };
                                        ex_callback = yield ex(whereEx);
                                        if (JSON.parse(ex_callback).datas.length == 0 || JSON.parse(ex_callback).datas[0].level != level) {
                                            //发布和入库
                                            var websocketMsg2 = {
                                                Vtype: "0",			//数据类型 0：预警数据
                                                index: eqId + '_' + upTime,	//唯一性编号
                                                eqId: eqId,			//设备编号
                                                eqName: eqName,		//设备名称
                                                upTime: upTime,		//时间
                                                visibility: visibility,			//10分钟能见度
                                                visibilityLevel: visibilityLevel,			//能见度等级，数据字典0008
                                                surfaceT: surfaceT,			//路面温度
                                                surfaceTLevel: surfaceTLevel, //路面温度等级
                                                waterFilmThickness: waterFilmThickness,		//水膜厚度
                                                waterFilmThicknessLevel: waterFilmThicknessLevel,		//水膜厚度等级，数据字典0008
                                                roadSituation: roadSituation,			//路面状况，数字具体代表的含义待定
                                                roadSituationLevel: roadSituationLevel, //路面状况等级
                                                level: level,                        //预警等级
                                                ps: "",			//预警描述
                                                wSource: 1,			//预警来源:0:人工预警,1:气象预警
                                                addr: addr,
                                                state: 0,
                                                sysCode: sysCode,
                                                iceRate: iceRate,
                                                source: 1
                                            };
                                            websocket.writeRapid(websocketMsg2);
                                            var warning = {
                                                eqId: eqId,			//设备编号
                                                eqName: eqName,		//设备名称
                                                upTime: upTime,		//时间
                                                visibility: visibility,			//10分钟能见度
                                                visibilityLevel: visibilityLevel,			//能见度等级，数据字典0008
                                                surfaceT: surfaceT,			//路面温度
                                                surfaceTLevel: surfaceTLevel, //路面温度等级
                                                waterFilmThickness: waterFilmThickness,		//水膜厚度
                                                waterFilmThicknessLevel: waterFilmThicknessLevel,		//水膜厚度等级，数据字典0008
                                                roadSituation: roadSituation,			//路面状况，数字具体代表的含义待定
                                                roadSituationLevel: roadSituationLevel, //路面状况等级
                                                level: level,                        //预警等级
                                                ps: "",			//预警描述
                                                wSource: 1,			//预警来源:0:人工预警,1:气象预警
                                                addr: addr,
                                                state: 0,
                                                sysCode: sysCode,
                                                index: eqId + '_' + upTime,	//唯一性编号
                                                iceRate: iceRate,
                                                source: 1
                                            };
                                            warning.upTime = upTimeToNumber;
                                            wSave_callback = yield wSave(warning);
                                            if (wSave_callback == 'success') {
                                                logInfo.info("wSave: success");
                                            } else {
                                                logInfo.error("wSave: err");
                                            }
                                        }

                                    } catch (err) {
                                        logInfo.error("vSendMsg:" + err);
                                    }
                                });
                            }
                            // else {
                            //     return false;
                            //     //气象设备故障
                            //
                            // }
                        } else {
                            //检测气象设备是否离线
                        }
                    });
                });
            });

        });

    } catch (err) {
        logInfo.error("RM_service:" + err);
    }
};

exports.sendMsg = function (msg) {
    try {
        var exchange = connection.exchange('amq.topic', {type: 'direct', autoDelete: false});
        exchange.publish("weatherInfo", msg);
    } catch (err) {
        console.log(err);
    }

};

exports.rabbitMQSendMsg = function (msg) {
    try {
        var exchange = connection.exchange('amq.topic', {type: 'direct', autoDelete: false});
        exchange.publish("ddd", msg);
    } catch (err) {
        console.log(err);
    }

};

//过车数据
exports.service2Start = function () {
    pass_vio_connection.on('ready', function () {
        var exchange = pass_vio_connection.exchange(config.passingVehicleExchange, {type: 'topic', autoDelete: false});
        pass_vio_connection.queue(config.passingVehicleRouting, {durable: true, autoDelete: false}, function (queue) {
            console.log('Queue ' + queue.name + ' is open!');
            queue.bind(config.passingVehicleExchange, config.passingVehicleRouting, function () {
                // exchange.publish("weatherInfo", weatherInf,{deliveryMode:2});
                // return false;
                queue.subscribe(function (message, header, deliveryInfo) {
                    if (message) {
                        co(function* () {
                            try {
                                var data = JSON.parse(message.data.toString());
                                var passingVehicleData = {
                                    "device_nbr": data.deviceNo,
                                    "snap_nbr": data.snapNbr,
                                    "passing_time": (new Date(data.captureTime)).valueOf(),
                                    "site_nbr": data.roadCode,
                                    "drive_direction": data.driveDirection,
                                    "plate_nbr": data.plateNbr,
                                    "plate_type": data.plateType,
                                    "plate_color": data.plateColor,
                                    "vehicle_length": data.vehicleLength,
                                    "lane": data.lane,
                                    "drive_mode": data.driveMode,
                                    "vehicle_speed": data.vehicleSpeed,
                                    "vehicle_type": data.vehicleType,
                                    "gps_location_info": data.gpsLocationInfo
                                };
                                for (var i = 0; i < data.extendedProperties.length; i++) {
                                    if (data.extendedProperties[i].image_URLs) {
                                        passingVehicleData.image_URLs = data.extendedProperties[i].image_URLs;
                                    } else {
                                        passingVehicleData.image_URLs = "";
                                    }
                                }
                                var aaa = thunkify(passingVehicleSave);
                                var pC;
                                pC = yield aaa(passingVehicleData);
                                if (pC) {
                                    logInfo.info("passingSave:过车数据入库成功");
                                } else {
                                    logInfo.error("passingSave:过车数据入库失败");
                                }
                            } catch (err) {
                                logInfo.error("passingSave:" + err);
                            }
                        });

                    }
                });
            });
        });
    });
};
//违法数据入库
exports.service3Start = function () {
    pass_vio_connection.on('ready', function () {
        var exchange = pass_vio_connection.exchange(config.violationVehicleExchange, {
            type: 'topic',
            autoDelete: false
        });
        pass_vio_connection.queue(config.violationVehicleRouting, {durable: true, autoDelete: false}, function (queue) {
            console.log('Queue ' + queue.name + ' is open!');
            queue.bind(config.violationVehicleExchange, config.violationVehicleRouting, function () {
                // exchange.publish("weatherInfo", weatherInf,{deliveryMode:2});
                // return false;
                queue.subscribe(function (message, header, deliveryInfo) {
                    if (message) {
                        co(function* () {
                            var data = JSON.parse(message.data.toString());
                            //过滤白名单
                            try {
                                var wl = thunkify(whitelist);
                                var paramWhite = {
                                    plate_nbr: data.plate_nbr,
                                    plate_color: data.plate_color
                                };
                                var wl_result = yield wl(paramWhite);
                                if (wl_result) {
                                    wl_result = JSON.parse(wl_result);
                                    if (wl_result.datas.length != 0) data.whitelist = '0';
                                    else data.whitelist = '1';
                                } else {
                                    logInfo.error("查询白名单错误：");
                                    data.whitelist = '1';
                                }
                            } catch (e) {
                                logInfo.error("过滤白名单错误：" + e);
                                data.whitelist = '1';
                            }
                            try {
                                var vio = [];
                                var violationVehicleData = {
                                    "device_nbr": data.deviceNo,
                                    "snap_nbr": data.snapNbr,
                                    "passing_time": (new Date(data.captureTime)).valueOf(),
                                    "site_nbr": data.roadCode,
                                    "drive_direction": data.driveDirection,
                                    "plate_nbr": data.plateNbr,
                                    "plate_area": data.plateNbr.substring(0, 1),
                                    "plate_type": data.plateType,
                                    "plate_color": data.plateColor,
                                    "lane": data.lane,
                                    "vehicle_speed": data.vehicleSpeed,
                                    "vehicle_type": data.vehicleType,
                                    "gps_location_info": data.gpsLocationInfo,
                                    "whitelist": data.whitelist
                                    // "violation_behaviors":data.violationBehaviors
                                };
                                for (var i = 0; i < data.extendedProperties.length; i++) {
                                    if (data.extendedProperties[i].image_URLs) {
                                        violationVehicleData.image_URLs = data.extendedProperties[i].image_URLs;
                                    } else {
                                        violationVehicleData.image_URLs = "";
                                    }
                                }
                                for (var j = 0; j < data.roadSpeedLimits.length; j++) {
                                    if (data.roadSpeedLimits[j].vehicleType == data.vehicleType) {
                                        violationVehicleData.road_over_speed_limit = data.roadSpeedLimits[j].roadOverSpeedLimit;
                                        violationVehicleData.road_under_speed_limit = data.roadSpeedLimits[j].roadUnderSpeedLimit;
                                        violationVehicleData.over_speed_margin = data.roadSpeedLimits[j].overSpeedMargin;
                                        violationVehicleData.under_speed_margin = data.roadSpeedLimits[j].underSpeedMargin;
                                    }
                                }
                                for (var i = 0; i < data.violationBehaviors.length; i++) {
                                    violationVehicleData.violation_behaviors = data.violationBehaviors[i];
                                    if (data.violationBehaviors[i] != '7064' && data.violationBehaviors[i] != '1229') {

                                        if (violationVehicleData.device_nbr != "20624001"
                                            && violationVehicleData.device_nbr != "411699020010039207"
                                            && violationVehicleData.device_nbr != "20812001"
                                            && violationVehicleData.device_nbr != "411699020010039208") {
                                            vio.push(violationVehicleData);
                                        }


                                    }

                                }
                                var violationSave = thunkify(violationVehicleSave);
                                var vC;
                                vC = yield violationSave(vio);
                                if (vC) {
                                    var speedLimit = JSON.stringify(data.roadSpeedLimits);
                                    logInfo.info("violationSave:违法数据入库成功:" + data.plateNbr + " " + data.vehicleType + " " + speedLimit);
                                } else {
                                    logInfo.error("violationSave:违法数据入库失败");
                                }
                                //违停自动喊
                                for (var j = 0; j < vio.length; j++) {
                                    if (vio[j].violation_behaviors == config.weitingVioCode) {
                                        logInfo.info("vioAutoSpeaker: 违停自动喊话开始");
                                        try {
                                            var fvio = thunkify(findVioBall);
                                            var param = {
                                                device_nbr: vio[j].device_nbr
                                            };
                                            var fvio_result = yield fvio(param);
                                            if (fvio_result) {
                                                fvio_result = JSON.parse(fvio_result);
                                                logInfo.info("违停球机: " + vio[j].device_nbr + "||" + fvio_result);
                                                var sound = thunkify(userPlay);
                                                var paramb = {
                                                    host: fvio_result.datas[0].broadcast.ip,
                                                    port: fvio_result.datas[0].broadcast.port,
                                                    eqid: fvio_result.datas[0].broadcast.device_nbr,
                                                    optpersion: 'auto'
                                                };
                                                var sound_result = yield sound(paramb);
                                                sound_result = JSON.parse(sound_result);
                                                if (!sound_result || !sound_result.success) {
                                                    logInfo.error("vioAutoSpeaker: 违停自动喊话失败" + sound_result);
                                                }
                                            }
                                        } catch (e) {
                                            logInfo.error("vioAutoSpeaker: 违停自动喊话异常" + e);
                                        }

                                    }
                                }
                            } catch (err) {
                                logInfo.error("violationSave:" + err);
                            }
                        });

                    }
                });
            });
        });
    });
};

//设备状态入库
exports.service4Start = function () {
    pass_vio_connection.on('ready', function () {
        var exchange = connection.exchange(config.deviceStatusExchange, {type: 'topic', autoDelete: false});
        connection.queue(config.deviceStatusRouting, {durable: true, autoDelete: false}, function (queue) {
            console.log('Queue ' + queue.name + ' is open!');
            queue.bind(config.deviceStatusExchange, config.deviceStatusRouting, function () {
                // exchange.publish("weatherInfo", weatherInf,{deliveryMode:2});
                // return false;
                queue.subscribe(function (message, header, deliveryInfo) {
                    if (message) {
                        co(function* () {
                            try {
                                var data = JSON.parse(message.data.toString());
                                for (var i = 0; i < data.length; i++) {
                                    var fault_status;
                                    if (data[i].falutCode == '' || !data[i].falutCode) {
                                        fault_status = 1;
                                    } else {
                                        fault_status = 0;
                                    }
                                    var status = {
                                        "device_nbr": data[i].deviceNo,
                                        "online_status": Number(data[i].deviceStatus),
                                        "fault_status": 2,
                                        "fault_code": '',
                                        "timeDiff": 0
                                    };
                                    var statusUp = thunkify(statusUpdate);
                                    var sU;
                                    sU = yield statusUp(status);
                                    if (sU) {
                                        logInfo.info("设备状态更新成功");
                                    } else {
                                        logInfo.error("设备状态更新失败");
                                    }
                                }

                            } catch (err) {
                                logInfo.error("设备状态更新失败" + err);
                            }
                        });

                    }
                });
            });
        });
    });
};

//查询气象设备
function findWeatherDevice(param, callback) {
    var opt = {
        method: "POST",
        host: config.dataServerHost,
        port: config.dataServerPort,
        path: '/api/d_visibility_meters/list',
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
                var data = Buffer.concat(body).toString();
                callback(null, data);
            });
        }
        else {
            callback('error', null)
        }
    });
    requ.write(JSON.stringify(param) + "\n");
    requ.end('');
    requ.on('error', function (e) {
        callback('Error got: ' + e.message, null);
    });
}


//气象数据入库
function weatherDataSave(param, callback) {
    var opt = {
        method: "POST",
        host: config.dataServerHost,
        port: config.dataServerPort,
        path: '/api/meteorological_data/add',
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
                var data = Buffer.concat(body).toString();
                if (JSON.parse(data).ret == 1)
                    callback(null, true);
                else callback(null, false);
            });
        }
        else {
            callback('error', null)
        }
    });
    requ.write(JSON.stringify(param) + "\n");
    requ.end('');
    requ.on('error', function (e) {
        callback('Error got: ' + e.message, null);
    });
}

//获取能见度阀值
function findThreshold(where, callback) {
    var opt = {
        method: "POST",
        host: config.dataServerHost,
        port: config.dataServerPort,
        path: '/api/s_thresholds/list',
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
                var data = Buffer.concat(body).toString();
                callback(null, data);
            });
        }
        else {
            callback('error', null)
        }
    });
    requ.write(JSON.stringify(where) + "\n");
    requ.end('');
    requ.on('error', function (e) {
        callback('Error got: ' + e.message, null);
    });

}

//检测预警是否已经发布
function exist(where, callback) {
    var opt = {
        method: "POST",
        host: config.dataServerHost,
        port: config.dataServerPort,
        path: '/api/warning_monitorings/list',
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
                var data = Buffer.concat(body).toString();
                callback(null, data);
            });
        }
        else {
            callback('error', null)
        }
    });
    requ.write(JSON.stringify(where) + "\n");
    requ.end('');
    requ.on('error', function (e) {
        callback('Error got: ' + e.message, null);
    });
}

//预警信息入库
function wSave_f(param, callback) {
    var opt = {
        method: "POST",
        host: config.dataServerHost,
        port: config.dataServerPort,
        path: '/api/warning_monitorings/add',
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
                var data = Buffer.concat(body).toString();
                callback(null, 'success');
            });
        }
        else {
            callback('error', null)
        }
    });
    requ.write(JSON.stringify(param) + "\n");
    requ.end('');
    requ.on('error', function (e) {
        callback('Error got: ' + e.message, null);
    });
}

//过车数据入库
function passingVehicleSave(param, callback) {
    var opt = {
        method: "POST",
        host: config.dataServerHost,
        port: config.dataServerPort,
        path: '/api/passing_vehicles/add',
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
                var data = Buffer.concat(body).toString();
                if (JSON.parse(data).ret == 1)
                    callback(null, true);
                else callback(null, false);
            });
        }
        else {
            callback('error', null)
        }
    });
    requ.write(JSON.stringify(param) + "\n");
    requ.end('');
    requ.on('error', function (e) {
        callback('Error got: ' + e.message, null);
    });
}

//违法数据入库
function violationVehicleSave(param, callback) {
    var opt = {
        method: "POST",
        host: config.dataServerHost,
        port: config.dataServerPort,
        path: '/api/violation_vehicles/add',
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
                var data = Buffer.concat(body).toString();
                if (JSON.parse(data).ret == 1)
                    callback(null, true);
                else callback(null, false);
            });
        }
        else {
            callback('error', null)
        }
    });
    requ.write(JSON.stringify(param) + "\n");
    requ.end('');
    requ.on('error', function (e) {
        callback('Error got: ' + e.message, null);
    });
}

function statusUpdate(param, callback) {
    var opt = {
        method: "POST",
        host: config.dataServerHost,
        port: config.dataServerPort,
        path: '/api/d_statuses/update',
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
                var data = Buffer.concat(body).toString();
                if (JSON.parse(data).ret == 1)
                    callback(null, true);
                else callback(null, false);
            });
        }
        else {
            callback('error', null)
        }
    });
    requ.write(JSON.stringify(param) + "\n");
    requ.end('');
    requ.on('error', function (e) {
        callback('Error got: ' + e.message, null);
    });
}

//查询系统下的设备表
function findSystem(param, callback) {
    var opt = {
        method: "POST",
        host: config.dataServerHost,
        port: config.dataServerPort,
        path: '/api/sys_devices/list',
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
                var data = Buffer.concat(body).toString();
                if (JSON.parse(data).ret == 1)
                    callback(null, data);
                else callback(null, false);
            });
        }
        else {
            callback('error', null)
        }
    });
    requ.write(JSON.stringify(param) + "\n");
    requ.end('');
    requ.on('error', function (e) {
        callback('Error got: ' + e.message, null);
    });
}

//查询违停
function findVioBall(param, callback) {
    var opt = {
        method: "POST",
        host: config.dataServerHost,
        port: config.dataServerPort,
        path: '/api/d_violation_balls/list',
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
                var data = Buffer.concat(body).toString();
                if (JSON.parse(data).ret == 1)
                    callback(null, data);
                else callback(null, false);
            });
        }
        else {
            callback('error', null)
        }
    });
    requ.write(JSON.stringify(param) + "\n");
    requ.end('');
    requ.on('error', function (e) {
        callback('Error got: ' + e.message, null);
    });
}

//自动喊话
function userPlay(param, callback) {
    var userInfo = {
        "eqid": param.eqid,
        "optperson": param.optperson
    };

    userInfo = JSON.stringify(userInfo);
    var opt = {
        method: "GET",
        host: config.broadcastServerHost,
        port: config.broadcastServerPort,
        path: '/speaker/userplay/' + param.host + '/' + param.port + '/' + config.soundFilename + '/' + config.count + '/3?userInfo=' + userInfo,
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
                var data = Buffer.concat(body).toString();
                if (JSON.parse(data).ret == 1)
                    callback(null, data);
                else callback(null, false);
            });
        }
        else {
            callback('error', null)
        }
    });
    requ.end('');
    requ.on('error', function (e) {
        callback('Error got: ' + e.message, null);
    });
}

//查询白名单
function whitelist(param, callback) {
    var opt = {
        method: "POST",
        host: config.dataServerHost,
        port: config.dataServerPort,
        path: '/api/sys_whitelists/list',
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
                var data = Buffer.concat(body).toString();
                if (JSON.parse(data).ret == 1)
                    callback(null, true);
                else callback(null, false);
            });
        }
        else {
            callback('error', null)
        }
    });
    requ.write(JSON.stringify(param) + "\n");
    requ.end('');
    requ.on('error', function (e) {
        callback('Error got: ' + e.message, null);
    });
}