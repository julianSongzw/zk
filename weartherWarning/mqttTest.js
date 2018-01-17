/**
 * Created by zll on 2017/2/22.
 */
var config = require('./bin/config');

var mqtt = require('mqtt');
var url=config.mqttUrl;
var client;
exports.init=function(topic) {
    try {
        var options={
            username:'admin',
            password:'public123',
            keepalive:100,
            clientId:"SWS_"+Date.now()
        };
        client = mqtt.connect(url,options);
        client.on('connect', function () {
            console.log("mqtt connect success");
            // 订阅主题
            client.subscribe(topic);
        });
        client.on('message', function(tp, message) {
            //client.end();
            console.log("收到消息："+message.toString());
        });
    } catch (ex){
        console.log("init："+ex);
    }

};


