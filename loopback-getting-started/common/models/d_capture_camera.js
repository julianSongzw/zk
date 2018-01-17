/**
 * Created by dell on 2017/6/27.
 */
var config = require('../../config');
var mongodb = require('mongodb');
var ObjectID = mongodb.ObjectID;
var logs = require('../../logServer');
var co = require('co');
var thunkify = require('thunkify');
var errColMsg = {
  ret: 0,
  msg: '操作失败，数据库集合操作异常'
};
var errParamMsg = {
  ret: 0,
  msg: '操作失败，参数合法性验证'
};

module.exports = function(d_capture_camera) {
  d_capture_camera.validatesUniquenessOf('device_nbr');
  //分页查询
  d_capture_camera.list = function (data, cb) {
    var filter = {
      order:'_id DESC',
      include:['status','video'],
      where:{}
    };
    if(data.device_nbr!="undefined"&&data.device_nbr) filter.where.device_nbr = {regexp:data.device_nbr};
    if(data.device_name!="undefined"&&data.device_name) filter.where.device_name = {regexp:data.device_name};
    if(data.sys_code!="undefined"&&data.sys_code) filter.where.sys_code = data.sys_code;
    if(data.site_nbr!="undefined"&&data.site_nbr) filter.where.site_nbr = data.site_nbr;
    if(data.pageSize!="undefined"&&data.pageIndex!="undefined"&&data.pageSize&&data.pageIndex) {
      filter.limit = Number(data.pageSize);
      filter.skip = (Number(data.pageIndex) - 1) * Number(data.pageSize);
    }
    d_capture_camera.find(filter,function (err, rs) {
      if(err) cb(null,errColMsg);
      d_capture_camera.count(filter.where,function (err, count) {
        if (err) cb(null,errColMsg);
        cb(null,{
          ret:1,
          datas:rs,
          msg:'查询成功',
          count:count
        });
      });
    });
  };
  d_capture_camera.remoteMethod('list', {
    description:'抓拍相机设备分页查询',
    accepts: {arg:'data', type:'Object',required:true,http: { source: 'body' }},
    http: {path:'/list',verb:'post'},
    returns: {arg: 'res', type: 'Object',root:true,required:true}
  });

  //新增
  d_capture_camera.add = function (req, cb) {
    var data = req.body;
    var length = JSON.parse(data.video).length;
    var video;
    if(length!=0){
      video = JSON.parse(data.video)[0];
    }else {
      video = {};
    }

    delete data['video'];
    if(data.metre!="") data.address = data.road_name + data.section_code + data.mileage+ '+' + data.metre + 'm';
    else data.address = data.road_name + data.section_code + data.mileage;
    co(function *() {
      //查询4位序号
      try {
        var fi = thunkify(findIndex);
        var fvi = thunkify(findVideoIndex);
        var param = {
          org_code: data.org_code,
          c: d_capture_camera
        };
        var fiCb = yield fi(param);
        var fviCb = yield fvi(param);
        var index,videoIndex;
        if (fiCb) {
          if (fiCb.length == 0) {
            index = '130000';
          } else {
            index = '13' + ('0000' + (Number(fiCb[0].device_nbr.slice(-4)) + 1).toString()).slice(-4);
          }
        } else {
          cb(null, {
            ret: 0,
            msg: '序号出错'
          });
        }
        if (fviCb) {
          if (fviCb.length == 0) {
            videoIndex = '070000';
          } else {
            videoIndex = '07' + ('0000' + (Number(fviCb[0].device_nbr.slice(-4)) + 1).toString()).slice(-4);
          }
        } else {
          cb(null, {
            ret: 0,
            msg: '序号出错'
          });
        }
      } catch (e) {
        cb(null, {
          ret: 0,
          msg: e
        });
      }
      if (data.device_nbr == "undefined" || !data.device_nbr) {
        data.device_nbr = data.org_code + index;
        data.nbr_auto = 1;
      }
      if (video.device_nbr == "undefined" || !video.device_nbr) {
        video.device_nbr = data.org_code + videoIndex;
        video.nbr_auto = 1;
      }
      data.device_name = data.address + '抓拍相机';
      video.device_name = data.address + '视频';
      d_capture_camera.find({order: '_id DESC', where: {address: data.address}}, function (err, arr) {
        if (err) cb(null, {
          ret: 0,
          msg: err
        });
        if (arr.length == 0) {
          data.device_name = data.device_name + '001';
        } else {
          var device_name = arr[0].device_name;
          var index = Number(device_name.slice(-3)) + 1;
          data.device_name = data.device_name + ('000' + index.toString()).slice(-3);
        }
        d_capture_camera.create(data, function (err, rs) {
          if (err) cb(null, {
            ret: 0,
            err: err,
            msg: '设备编号重复'
          });
          // d_capture_camera.app.models.sys_device.create({device_nbr:data.device_nbr,device_name:data.device_name,device_type:13,sys_code:data.sys_code},function (err, a) {
          //   if (err) cb(null, {
          //     ret: 0,
          //     msg: err
          //   });
            d_capture_camera.app.models.d_status.upsertWithWhere({device_nbr: rs.device_nbr}, {
              device_nbr: rs.device_nbr,
              online_status: 1,
              fault_status: 2,
              fault_code: '',
              timeDiff: 0
            }, function (err, status) {
              if (err) cb(null, {
                ret: 0,
                msg: err
              });
              // if(length)
              d_capture_camera.app.models.d_video_camera.find({order:'_id DESC',where:{address:data.address}},function (err, arr) {
                if(err) cb(null,{
                  ret:0,
                  msg:err
                });
                if(arr.length==0){
                  video.device_name = video.device_name + '001';
                }else {
                  var device_name = arr[0].device_name;
                  var index = Number(device_name.slice(-3))+1;
                  video.device_name = video.device_name + ('000'+index.toString()).slice(-3);
                }
                video.camera_nbr = data.device_nbr;
                video.site_name = data.site_name;
                video.site_nbr = data.site_nbr;
                video.road_code = data.road_code;
                video.road_name = data.road_name;
                video.section_code = data.section_code;
                video.mileage = data.mileage;
                video.metre = data.metre;
                video.address = data.address;
                video.longitude = data.longitude;
                video.latitude = data.latitude;
                video.sys_code = data.sys_code;
                video.sys_name = data.sys_name;
                video.direction_type = data.lane_direction;
                video.org_code = data.org_code;
                video.org_name = data.org_name;
                if(length==0){
                  var user = req.query.username;
                  logs.optLog("设备备案：添加抓拍相机" + rs.device_nbr, req.headers['x-forwarded-for'] ||
                    req.connection.remoteAddress ||
                    req.socket.remoteAddress ||
                    req.connection.socket.remoteAddress, user);
                  cb(null, {
                    ret: 1,
                    id: rs.id,
                    msg: '新增成功'
                  });
                }else {
                  d_capture_camera.app.models.d_video_camera.create(video,function (err, rsV) {
                    if(err) cb(null,{
                      ret:0,
                      err:err,
                      msg:'设备编号重复'
                    });
                    //更新关联表sys_device
                    // d_capture_camera.app.models.sys_device.create({device_nbr:video.device_nbr,device_name:video.device_name,device_type:7,sys_code:video.sys_code},function (err, a) {
                    //   if (err) cb(null, {
                    //     ret: 0,
                    //     msg: err
                    //   });
                      //更新设备状态表d_status
                      d_capture_camera.app.models.d_status.upsertWithWhere({device_nbr: rsV.device_nbr}, {
                        device_nbr: rsV.device_nbr,
                        online_status: 1,
                        fault_status: 2,
                        fault_code: '',
                        timeDiff: 0
                      }, function (err, status) {
                        if (err) cb(null, {
                          ret: 0,
                          msg: err
                        });
                        var user = req.query.username;
                        logs.optLog("设备备案：添加视频设备" + rsV.device_nbr, req.headers['x-forwarded-for'] ||
                          req.connection.remoteAddress ||
                          req.socket.remoteAddress ||
                          req.connection.socket.remoteAddress, user);
                        logs.optLog("设备备案：添加抓拍相机" + rs.device_nbr, req.headers['x-forwarded-for'] ||
                          req.connection.remoteAddress ||
                          req.socket.remoteAddress ||
                          req.connection.socket.remoteAddress, user);
                        cb(null, {
                          ret: 1,
                          id: rs.id,
                          msg: '新增成功'
                        });
                      });
                    // });
                  })
                }

              });
            });
          // });
        })
      });
    });
  };
  d_capture_camera.remoteMethod('add', {
    description:'添加抓拍相机设备',
    accepts: {arg:'req', type:'Object',required:true,http: { source: 'req' }},
    http: {path:'/add',verb:'post'},
    returns: {arg: 'res', type: 'Object',root:true,required:true}
  });

  //删除
  d_capture_camera.del = function (req, cb) {
    var data = req.body;
    var arr=[];
    data.id.split(",").forEach(function(item){
      arr.push(ObjectID(item));
    });
    var where = {_id:{inq: arr}};
    var device_nbr = [];
    d_capture_camera.find({where:where},function (err, rs) {
      if (err) cb(null, err);
      for (var i = 0; i < rs.length; i++) {
        device_nbr.push(rs[i].device_nbr);
      }
      var delwhere = {device_nbr: {inq: device_nbr}};
      var videoDel = {camera_nbr:{inq: device_nbr}};
      d_capture_camera.app.models.sys_device.destroyAll(delwhere, function (err, count) {
        if (err) cb(null, err);
        d_capture_camera.destroyAll(where, function (err, info) {
          if (err) cb(null, err);
          d_capture_camera.app.models.d_video_camera.destroyAll(videoDel,function (err, count) {
            if (err) cb(null, err);
            var user = req.query.username;
            logs.optLog("设备备案：删除" + info.count + "个抓拍相机", req.headers['x-forwarded-for'] ||
              req.connection.remoteAddress ||
              req.socket.remoteAddress ||
              req.connection.socket.remoteAddress, user);
            cb(null, {
              ret: 1,
              msg: '删除成功'
            });
          });
        })
      });
    });
  };
  d_capture_camera.remoteMethod('del', {
    description:'删除抓拍相机设备',
    accepts: {arg:'req', type:'Object',required:true,http: { source: 'req' }},
    http: {path:'/delete',verb:'post'},
    returns: {arg: 'res', type: 'Object',root:true,required:true}
  });

  //修改
  d_capture_camera.up = function (req, cb) {
    var data = req.body;
    delete data['status'];
    if(data.id=="undefined"){
      cb(null,errParamMsg);
    }
    var id = data.id;
    delete data['id'];
    var length = JSON.parse(data.video).length;
    var video;
    if(length!=0){
      video = JSON.parse(data.video)[0];
    }else {
      video = {};
    }
    delete data['video'];
    delete video['id'];
    if(data.metre!="") data.address = data.road_name + data.section_code + data.mileage+ '+' + data.metre + 'm';
    else data.address = data.road_name + data.section_code + data.mileage;
    co(function *() {
      try {
        var fi = thunkify(findIndex);
        var fvi = thunkify(findVideoIndex);
        var param = {
          org_code: data.org_code,
          c: d_capture_camera
        };
        var fiCb = yield fi(param);
        var fviCb = yield fvi(param);
        var index,videoIndex;
        if (fiCb) {
          if (fiCb.length == 0) {
            index = '130000';
          } else {
            index = '13' + ('0000' + (Number(fiCb[0].device_nbr.slice(-4)) + 1).toString()).slice(-4);
          }
        } else {
          cb(null, {
            ret: 0,
            msg: '序号出错'
          });
        }
        if (fviCb) {
          if (fviCb.length == 0) {
            videoIndex = '070000';
          } else {
            videoIndex = '07' + ('0000' + (Number(fviCb[0].device_nbr.slice(-4)) + 1).toString()).slice(-4);
          }
        } else {
          cb(null, {
            ret: 0,
            msg: '序号出错'
          });
        }
      } catch (e) {
        cb(null, {
          ret: 0,
          msg: e
        });
      }
      d_capture_camera.find({
        order: '_id DESC',
        where: {_id: ObjectID(id), address: data.address}
      }, function (err, old) {
        if (err) cb(null, {
          ret: 0,
          msg: err
        });
        if (old.length == 0) {
          data.device_name = data.address + '抓拍相机';
          video.device_name = data.address + '视频';
          d_capture_camera.find({order: '_id DESC', where: {address: data.address}}, function (err, arr) {
            if (err) cb(null, {
              ret: 0,
              msg: err
            });
            if (arr.length == 0) {
              data.device_name = data.device_name + '001';
            } else {
              var device_name = arr[0].device_name;
              var index = Number(device_name.slice(-3)) + 1;
              data.device_name = data.device_name + ('000' + index.toString()).slice(-3);
            }
            d_capture_camera.replaceById(id, data, {validate: true}, function (err, rs) {
              if (err) cb(null, {
                ret: 0,
                msg: err
              });
              d_capture_camera.app.models.sys_device.updateAll({device_nbr:data.device_nbr},{device_name:data.device_name},function (err,info) {
                if (err) cb(null, {
                  ret: 0,
                  msg: err
                });
                d_capture_camera.app.models.d_video_camera.find({
                  order: '_id DESC',
                  where: {address: data.address}
                }, function (err, arr) {
                  if (err) cb(null, {
                    ret: 0,
                    msg: err
                  });
                  if (arr.length == 0) {
                    video.device_name = video.device_name + '001';
                  } else {
                    var device_name = arr[0].device_name;
                    var index = Number(device_name.slice(-3)) + 1;
                    video.device_name = video.device_name + ('000' + index.toString()).slice(-3);
                  }
                  video.camera_nbr = data.device_nbr;
                  video.site_name = data.site_name;
                  video.site_nbr = data.site_nbr;
                  video.road_code = data.road_code;
                  video.road_name = data.road_name;
                  video.section_code = data.section_code;
                  video.mileage = data.mileage;
                  video.metre = data.metre;
                  video.address = data.address;
                  video.longitude = data.longitude;
                  video.latitude = data.latitude;
                  video.sys_code = data.sys_code;
                  video.sys_name = data.sys_name;
                  video.direction_type = data.lane_direction;
                  video.org_code = data.org_code;
                  video.org_name = data.org_name;

                  if (length == 0) {
                    d_capture_camera.app.models.d_video_camera.destroyAll({camera_nbr: data.device_nbr}, function (err, count) {
                      if (err) cb(null, {
                        ret: 0,
                        msg: err
                      });
                      var user = req.query.username;
                      logs.optLog("设备备案：修改抓拍相机" + rs.device_nbr, req.headers['x-forwarded-for'] ||
                        req.connection.remoteAddress ||
                        req.socket.remoteAddress ||
                        req.connection.socket.remoteAddress, user);
                      cb(null, {
                        ret: 1,

                        msg: '修改成功'
                      });
                    });

                  } else {
                    d_capture_camera.app.models.d_video_camera.find({where: {camera_nbr: data.device_nbr}}, function (err, v) {
                      if (err) cb(null, {
                        ret: 0,
                        msg: err
                      });
                      if (v.length == 0) {
                        if (video.device_nbr == "undefined" || !video.device_nbr || video.device_nbr == "") {
                          video.device_nbr = data.org_code + videoIndex;
                          video.nbr_auto = 1;
                        }
                        d_capture_camera.app.models.d_video_camera.find({
                          order: '_id DESC',
                          where: {address: data.address}
                        }, function (err, arr) {
                          if (err) cb(null, {
                            ret: 0,
                            msg: err
                          });
                          if (arr.length == 0) {
                            video.device_name = video.device_name + '001';
                          } else {
                            var device_name = arr[0].device_name;
                            var index = Number(device_name.slice(-3)) + 1;
                            video.device_name = video.device_name + ('000' + index.toString()).slice(-3);
                          }
                          video.camera_nbr = data.device_nbr;
                          video.site_name = data.site_name;
                          video.site_nbr = data.site_nbr;
                          video.road_code = data.road_code;
                          video.road_name = data.road_name;
                          video.section_code = data.section_code;
                          video.mileage = data.mileage;
                          video.metre = data.metre;
                          video.address = data.address;
                          video.longitude = data.longitude;
                          video.latitude = data.latitude;
                          video.sys_code = data.sys_code;
                          video.sys_name = data.sys_name;
                          video.direction_type = data.lane_direction;
                          video.org_code = data.org_code;
                          video.org_name = data.org_name;

                          d_capture_camera.app.models.d_video_camera.create(video, function (err, rsV) {
                            if (err) cb(null, {
                              ret: 0,
                              err: err,
                              msg: '设备编号重复'
                            });

                              //更新设备状态表d_status
                              d_capture_camera.app.models.d_status.upsertWithWhere({device_nbr: rsV.device_nbr}, {
                                device_nbr: rsV.device_nbr,
                                online_status: 1,
                                fault_status: 2,
                                fault_code: '',
                                timeDiff: 0
                              }, function (err, status) {
                                if (err) cb(null, {
                                  ret: 0,
                                  msg: err
                                });
                                var user = req.query.username;
                                logs.optLog("设备备案：修改抓拍相机" + rs.device_nbr, req.headers['x-forwarded-for'] ||
                                  req.connection.remoteAddress ||
                                  req.socket.remoteAddress ||
                                  req.connection.socket.remoteAddress, user);
                                cb(null, {
                                  ret: 1,

                                  msg: '修改成功'
                                });
                              });

                          });
                        });
                      } else {
                        d_capture_camera.app.models.d_video_camera.updateAll({device_nbr: video.device_nbr}, video, function (err, count) {
                          if (err) cb(null, {
                            ret: 0,
                            msg: err
                          });

                            var user = req.query.username;
                            logs.optLog("设备备案：修改抓拍相机" + rs.device_nbr, req.headers['x-forwarded-for'] ||
                              req.connection.remoteAddress ||
                              req.socket.remoteAddress ||
                              req.connection.socket.remoteAddress, user);
                            cb(null, {
                              ret: 1,

                              msg: '修改成功'
                            });

                        });
                      }
                    });

                  }


                });
              });
            });
          });
        } else {
          data.device_name = old[0].device_name;

          d_capture_camera.replaceById(id, data, {validate: true}, function (err, rs) {
            if (err) cb(null, {
              ret: 0,
              msg: err
            });
            d_capture_camera.app.models.sys_device.updateAll({device_nbr:data.device_nbr},{device_name:data.device_name},function (err,info) {
              if (err) cb(null, {
                ret: 0,
                msg: err
              });
              if (length == 0) {
                d_capture_camera.app.models.d_video_camera.destroyAll({camera_nbr: data.device_nbr}, function (err, count) {
                  if (err) cb(null, {
                    ret: 0,
                    msg: err
                  });
                  var user = req.query.username;
                  logs.optLog("设备备案：修改抓拍相机" + rs.device_nbr, req.headers['x-forwarded-for'] ||
                    req.connection.remoteAddress ||
                    req.socket.remoteAddress ||
                    req.connection.socket.remoteAddress, user);
                  cb(null, {
                    ret: 1,

                    msg: '修改成功'
                  });
                });

              } else {
                d_capture_camera.app.models.d_video_camera.find({where: {camera_nbr: data.device_nbr}}, function (err, v) {
                  if (err) cb(null, {
                    ret: 0,
                    msg: err
                  });
                  if (v.length == 0) {
                    video.device_name = data.address + '视频';
                    if (video.device_nbr == "undefined" || !video.device_nbr || video.device_nbr == "") {
                      video.device_nbr = data.org_code + videoIndex;
                      video.nbr_auto = 1;
                    }
                    d_capture_camera.app.models.d_video_camera.find({
                      order: '_id DESC',
                      where: {address: data.address}
                    }, function (err, arr) {
                      if (err) cb(null, {
                        ret: 0,
                        msg: err
                      });
                      if (arr.length == 0) {
                        video.device_name = video.device_name + '001';
                      } else {
                        var device_name = arr[0].device_name;
                        var index = Number(device_name.slice(-3)) + 1;
                        video.device_name = video.device_name + ('000' + index.toString()).slice(-3);
                      }
                      video.camera_nbr = data.device_nbr;
                      video.site_name = data.site_name;
                      video.site_nbr = data.site_nbr;
                      video.road_code = data.road_code;
                      video.road_name = data.road_name;
                      video.section_code = data.section_code;
                      video.mileage = data.mileage;
                      video.metre = data.metre;
                      video.address = data.address;
                      video.longitude = data.longitude;
                      video.latitude = data.latitude;
                      video.sys_code = data.sys_code;
                      video.sys_name = data.sys_name;
                      video.direction_type = data.lane_direction;
                      video.org_code = data.org_code;
                      video.org_name = data.org_name;
                      d_capture_camera.app.models.d_video_camera.create(video, function (err, rsV) {
                        if (err) cb(null, {
                          ret: 0,
                          err: err,
                          msg: '设备编号重复'
                        });
                        //更新关联表sys_device
                        // d_capture_camera.app.models.sys_device.create({device_nbr:video.device_nbr,device_name:video.device_name,device_type:7,sys_code:video.sys_code},function (err, a) {
                        //   if (err) cb(null, {
                        //     ret: 0,
                        //     msg: err
                        //   });
                        //更新设备状态表d_status
                        d_capture_camera.app.models.d_status.upsertWithWhere({device_nbr: rsV.device_nbr}, {
                          device_nbr: rsV.device_nbr,
                          online_status: 1,
                          fault_status: 2,
                          fault_code: '',
                          timeDiff: 0
                        }, function (err, status) {
                          if (err) cb(null, {
                            ret: 0,
                            msg: err
                          });
                          var user = req.query.username;
                          logs.optLog("设备备案：修改抓拍相机" + rs.device_nbr, req.headers['x-forwarded-for'] ||
                            req.connection.remoteAddress ||
                            req.socket.remoteAddress ||
                            req.connection.socket.remoteAddress, user);
                          cb(null, {
                            ret: 1,

                            msg: '修改成功'
                          });
                        });
                      });
                    });
                  } else {
                    d_capture_camera.app.models.d_video_camera.updateAll({device_nbr: video.device_nbr}, video, function (err, count) {
                      if (err) cb(null, {
                        ret: 0,
                        msg: err
                      });
                      // d_capture_camera.app.models.sys_device.updateAll({device_nbr:video.device_nbr},{device_name:video.device_name,sys_code:video.sys_code},function (err, a) {
                      //   if (err) cb(null, {
                      //     ret: 0,
                      //     msg: err
                      //   });
                      var user = req.query.username;
                      logs.optLog("设备备案：修改抓拍相机" + rs.device_nbr, req.headers['x-forwarded-for'] ||
                        req.connection.remoteAddress ||
                        req.socket.remoteAddress ||
                        req.connection.socket.remoteAddress, user);
                      cb(null, {
                        ret: 1,

                        msg: '修改成功'
                      });
                      // });
                    });
                  }
                });

              }
            });
          })
        }
      });
    });
  };
  d_capture_camera.remoteMethod('up', {
    description:'修改抓拍相机设备',
    accepts: {arg:'req', type:'Object',required:true,http: { source: 'req' }},
    http: {path:'/updateCamera',verb:'post'},
    returns: {arg: 'res', type: 'Object',root:true,required:true}
  });
};
function findIndex(param,callback) {
  param.c.find({order:'_id DESC',where:{org_code:param.org_code,nbr_auto:1}},function (err, rs) {
    if(err) callback(err,null);
    callback(null,rs);
  })
}
function findVideoIndex(param,callback) {
  param.c.app.models.d_video_camera.find({order:'_id DESC',where:{org_code:param.org_code,nbr_auto:1}},function (err, rs) {
    if(err) callback(err,null);
    callback(null,rs);
  })
}
