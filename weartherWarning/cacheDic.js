/**
 * Created by zll on 2016/7/28.
 * 信息缓存
 */

var NodeCache = require( "node-cache" );
var tokenCache = new NodeCache();
var msgCache = new NodeCache();

exports.getTokenVaule=function(key){
    var temp=tokenCache.get(key);
    return temp;
};

exports.setTokenVaule=function(key,value){
    var temp=tokenCache.set(key,value);
    return temp;
};

exports.delTokenVaule=function(key){
    var temp=tokenCache.del(key);
    return temp;
};

exports.getWebsocketMsgVaule=function(key){
    var temp=msgCache.get(key);
    return temp;
};

exports.setWebsocketMsgVaule=function(key,value){
    var temp=msgCache.set(key,value);
    return temp;
};