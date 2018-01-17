var express = require('express');
var router = express.Router();
var http = require('http');
var dbInt = require('../dbInt.js');
var rabbitMQ = require('../rabbitMQ_service');
var websocket=require('../websocket');


/* GET home page. */
router.get('/', function(req, res, next) {

  res.render('index', { title: '预警防控平台' });

});

// router.get('/dicInt', function(req, res, next) {
//   dbInt.dicInt();
//   res.render('dic', { title: '数据字典初始化成功' });
// });


router.post('/websocketTest1', function(req, res, next) {
  var param = req.body;
  var msg = {
    Vtype:"1",				//数据类型 1：实时气象数据
    index:param.eqId+'_'+param.upTime,	//唯一性编号
    eqId: param.eqId,			//设备编号
    eqName:param.eqName,		//设备名称
    upTime: param.upTime,		//时间
    visibility: param.visibility,			//10分钟能见度
    visibilityLevel:param.visibilityLevel,			//能见度等级，数据字典0008
    surfaceT: param.surfaceT,			//路面温度
    surfaceTLevel:param.surfaceTLevel,			//路面温度等级，数据字典0008
    waterFilmThickness: param.waterFilmThickness,		//水膜厚度
    waterFilmThicknessLevel:param.waterFilmThicknessLevel,		//水膜厚度等级，数据字典0008
    roadSituation: param.roadSituation,			//路面状况，数字具体代表的含义待定
    roadSituationLevel:param.roadSituationLevel,		//路面状况等级，数据字典0008
    level:param.level
  };
  websocket.writeRapid(msg);
  res.json({ msg: '消息发送成功' });
});
router.post('/websocketTest0', function(req, res, next) {
  var param = req.body;
  var msg = {
    Vtype:"0",				//数据类型 0：预警数据
    index:param.eqId+'_'+param.upTime,	//唯一性编号
    eqId: param.eqId,			//设备编号
    eqName:param.eqName,		//设备名称
    upTime: param.upTime,		//时间
    visibility: param.visibility,			//10分钟能见度
    visibilityLevel:param.visibilityLevel,			//能见度等级，数据字典0008
    surfaceT: param.surfaceT,			//路面温度
    surfaceTLevel:param.surfaceTLevel,			//路面温度等级，数据字典0008
    waterFilmThickness: param.waterFilmThickness,		//水膜厚度
    waterFilmThicknessLevel:param.waterFilmThicknessLevel,		//水膜厚度等级，数据字典0008
    roadSituation: param.roadSituation,			//路面状况，数字具体代表的含义待定
    roadSituationLevel:param.roadSituationLevel,		//路面状况等级，数据字典0008
    level:param.level,			//预警等级
    ps:param.ps,			//预警描述
    wSouce:param.wSouce,			//预警来源:0:人工预警,1:气象预警
    addr:param.addr
  };
  websocket.writeRapid(msg);
  res.json({ msg: '消息发送成功' });
});

router.post('/sendMsg', function(req, res, next) {
  var msg = req.body;
  websocket.writeRapid(msg);
  res.json({
    ret:1,
    msg:'发送成功'
  })
});

module.exports = router;
