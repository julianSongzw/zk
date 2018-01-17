/**
 * Created by zll on 2017/3/1.
 */
 var winston = require('winston');
require('winston-mongodb').MongoDB;
var config = require('./bin/config');
var logger = new(winston.Logger)({
    level:['error','info'],
    transports : [
        new(winston.transports.MongoDB)({
            db : config.dbConnStr,
            host : config.logHost,
            collection: 't_logs'
        })
    ]
});



exports.loginLog = function (msg,ip,user) {
logger.log('info',msg,{"ip":ip,"user":user});
};
exports.optLog = function (msg,ip,user) {
    logger.log('error',msg,{"ip":ip,"user":user});
};
