/**
 * Created by dell on 2017/5/26.
 */

var dicData = [
    {
        code_type:'0000',
        code_name:'0',
        code_value:'男',
        sort_index:0,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0000',
        code_name:'1',
        code_value:'女',
        sort_index:1,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0001',
        code_name:'0',
        code_value:'禁用',
        sort_index:0,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0001',
        code_name:'1',
        code_value:'正常',
        sort_index:1,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0002',
        code_name:'0',
        code_value:'电警',
        sort_index:0,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0002',
        code_name:'1',
        code_value:'声光报警器',
        sort_index:1,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0002',
        code_name:'2',
        code_value:'可变限速牌',
        sort_index:2,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0002',
        code_name:'3',
        code_value:'防撞警示灯',
        sort_index:3,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0002',
        code_name:'4',
        code_value:'分流信号灯',
        sort_index:4,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0002',
        code_name:'5',
        code_value:'卡口',
        sort_index:5,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0002',
        code_name:'6',
        code_value:'气象设备',
        sort_index:6,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0002',
        code_name:'7',
        code_value:'视频设备',
        sort_index:7,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0002',
        code_name:'8',
        code_value:'分流诱导屏',
        sort_index:8,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0002',
        code_name:'9',
        code_value:'语音广播',
        sort_index:9,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0002',
        code_name:'10',
        code_value:'时间服务器',
        sort_index:10,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0002',
        code_name:'11',
        code_value:'固定点',
        sort_index:11,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0002',
        code_name:'12',
        code_value:'违停球机',
        sort_index:12,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0002',
        code_name:'13',
        code_value:'抓拍相机',
        sort_index:13,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0002',
        code_name:'14',
        code_value:'区间测速',
        sort_index:14,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0002',
        code_name:'15',
        code_value:'限距抓拍设备',
        sort_index:15,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0002',
        code_name:'17',
        code_value:'解除限速牌',
        sort_index:17,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0002',
        code_name:'18',
        code_value:'反向视频卡口',
        sort_index:18,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0002',
        code_name:'19',
        code_value:'解除限速牌视频',
        sort_index:19,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
      code_type:'0002',
      code_name:'20',
      code_value:'区间起点卡口',
      sort_index:20,
      editable:1,
      enable_flag:1,
      remark:""
    }, {
      code_type:'0002',
      code_name:'21',
      code_value:'区间终点卡口',
      sort_index:21,
      editable:1,
      enable_flag:1,
      remark:""
    }, {
        code_type:'0003',
        code_name:'0',
        code_value:'国界',
        sort_index:0,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0003',
        code_name:'1',
        code_value:'省际',
        sort_index:1,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0003',
        code_name:'2',
        code_value:'市际',
        sort_index:2,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0003',
        code_name:'3',
        code_value:'出入城',
        sort_index:3,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0003',
        code_name:'4',
        code_value:'城市道路',
        sort_index:4,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0003',
        code_name:'5',
        code_value:'公路主线',
        sort_index:5,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0003',
        code_name:'6',
        code_value:'匝道',
        sort_index:6,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0003',
        code_name:'7',
        code_value:'收费站',
        sort_index:7,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0003',
        code_name:'8',
        code_value:'路口',
        sort_index:8,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0003',
        code_name:'9',
        code_value:'服务区',
        sort_index:9,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0004',
        code_name:'0',
        code_value:'卡口',
        sort_index:0,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0004',
        code_name:'1',
        code_value:'微卡口',
        sort_index:1,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0004',
        code_name:'2',
        code_value:'电警卡口',
        sort_index:2,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0004',
        code_name:'3',
        code_value:'区间卡口',
        sort_index:3,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0004',
        code_name:'4',
        code_value:'测速卡口',
        sort_index:4,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0004',
        code_name:'5',
        code_value:'抓拍卡口',
        sort_index:5,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
      code_type:'0004',
      code_name:'6',
      code_value:'大车占道卡口',
      sort_index:6,
      editable:1,
      enable_flag:1,
      remark:""
    }, {
        code_type:'0005',
        code_name:'0',
        code_value:'直接接入',
        sort_index:0,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0005',
        code_name:'1',
        code_value:'大华平台',
        sort_index:1,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0005',
        code_name:'2',
        code_value:'海康平台',
        sort_index:2,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0005',
        code_name:'3',
        code_value:'蓝盾平台',
        sort_index:3,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0006',
        code_name:'0',
        code_value:'应急分流',
        sort_index:0,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0006',
        code_name:'1',
        code_value:'违停喊话',
        sort_index:1,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0006',
        code_name:'2',
        code_value:'限速抓拍',
        sort_index:2,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0006',
        code_name:'3',
        code_value:'防撞警示',
        sort_index:3,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0007',
        code_name:'0',
        code_value:'能见度',
        sort_index:0,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0007',
        code_name:'1',
        code_value:'路面温度',
        sort_index:1,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0007',
        code_name:'2',
        code_value:'结冰状况',
        sort_index:2,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0008',
        code_name:'0',
        code_value:'Ⅰ级',
        sort_index:0,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0008',
        code_name:'1',
        code_value:'Ⅱ级',
        sort_index:1,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0008',
        code_name:'2',
        code_value:'Ⅲ级',
        sort_index:2,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0008',
        code_name:'3',
        code_value:'Ⅳ级',
        sort_index:3,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0008',
        code_name:'4',
        code_value:'V级',
        sort_index:4,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0009',
        code_name:'0',
        code_value:'能见度',
        sort_index:0,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0009',
        code_name:'1',
        code_value:'结冰系数',
        sort_index:1,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0009',
        code_name:'2',
        code_value:'水膜厚度',
        sort_index:2,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0009',
        code_name:'3',
        code_value:'路面温度',
        sort_index:3,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0010',
        code_name:'0',
        code_value:'公路',
        sort_index:0,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0010',
        code_name:'1',
        code_value:'高速公路',
        sort_index:1,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0010',
        code_name:'2',
        code_value:'县道',
        sort_index:2,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0010',
        code_name:'3',
        code_value:'省道',
        sort_index:3,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0011',
        code_name:'0',
        code_value:'交通事故',
        sort_index:0,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0011',
        code_name:'1',
        code_value:'道路拥堵',
        sort_index:1,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0011',
        code_name:'2',
        code_value:'道路施工',
        sort_index:2,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0011',
        code_name:'3',
        code_value:'恶劣天气',
        sort_index:3,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0012',
        code_name:'0',
        code_value:'不按规定使用灯光',
        sort_index:0,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0012',
        code_name:'1',
        code_value:'超速行驶',
        sort_index:1,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0012',
        code_name:'2',
        code_value:'逆行',
        sort_index:2,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0012',
        code_name:'3',
        code_value:'违法超车',
        sort_index:3,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0012',
        code_name:'4',
        code_value:'违法掉头',
        sort_index:4,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0012',
        code_name:'5',
        code_value:'违法会车',
        sort_index:5,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0012',
        code_name:'6',
        code_value:'违法牵引',
        sort_index:6,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0012',
        code_name:'7',
        code_value:'违法停车',
        sort_index:7,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0012',
        code_name:'8',
        code_value:'超载',
        sort_index:8,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0012',
        code_name:'9',
        code_value:'其他原因',
        sort_index:9,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0013',
        code_name:'0',
        code_value:'大型汽车',
        sort_index:0,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0013',
        code_name:'1',
        code_value:'小型汽车',
        sort_index:1,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0013',
        code_name:'2',
        code_value:'警车',
        sort_index:2,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0014',
        code_name:'0',
        code_value:'60',
        sort_index:0,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0014',
        code_name:'1',
        code_value:'80',
        sort_index:1,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0014',
        code_name:'2',
        code_value:'100',
        sort_index:2,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0015',
        code_name:'0',
        code_value:'道路轮廓强化模式',
        sort_index:0,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0015',
        code_name:'1',
        code_value:'行车诱导模式',
        sort_index:1,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0015',
        code_name:'2',
        code_value:'行车警示模式',
        sort_index:2,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0016',
        code_name:'0',
        code_value:'30',
        sort_index:0,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0016',
        code_name:'1',
        code_value:'60',
        sort_index:1,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0016',
        code_name:'2',
        code_value:'90',
        sort_index:2,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0016',
        code_name:'3',
        code_value:'120',
        sort_index:3,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0017',
        code_name:'0',
        code_value:'人工预警',
        sort_index:0,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0017',
        code_name:'1',
        code_value:'气象预警',
        sort_index:1,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0018',
        code_name:'0',
        code_value:'超速行驶',
        sort_index:0,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0018',
        code_name:'1',
        code_value:'超高速行驶',
        sort_index:1,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0018',
        code_name:'2',
        code_value:'低速行驶',
        sort_index:2,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0019',
        code_name:'0',
        code_value:'闯红灯设备',
        sort_index:0,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0019',
        code_name:'1',
        code_value:'公路卡口设备',
        sort_index:1,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0019',
        code_name:'2',
        code_value:'测速设备',
        sort_index:2,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0019',
        code_name:'3',
        code_value:'移动摄像',
        sort_index:3,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0019',
        code_name:'4',
        code_value:'区间测速',
        sort_index:4,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0019',
        code_name:'5',
        code_value:'其他设备',
        sort_index:5,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0020',
        code_name:'0',
        code_value:'恶劣天气预警',
        sort_index:0,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0020',
        code_name:'1',
        code_value:'超速告警',
        sort_index:1,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0020',
        code_name:'2',
        code_value:'保距告警',
        sort_index:2,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0020',
        code_name:'3',
        code_value:'限速发布',
        sort_index:3,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0021',
        code_name:'0',
        code_value:'取消报警',
        sort_index:0,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0021',
        code_name:'1',
        code_value:'低于3000',
        sort_index:1,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0021',
        code_name:'2',
        code_value:'低于500',
        sort_index:2,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0021',
        code_name:'3',
        code_value:'低于400',
        sort_index:3,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0021',
        code_name:'4',
        code_value:'低于300',
        sort_index:4,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0021',
        code_name:'5',
        code_value:'低于200',
        sort_index:5,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0021',
        code_name:'6',
        code_value:'低于100',
        sort_index:6,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0021',
        code_name:'7',
        code_value:'低于50',
        sort_index:7,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0022',
        code_name:'0',
        code_value:'卡口设备',
        sort_index:0,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0022',
        code_name:'1',
        code_value:'电警设备',
        sort_index:1,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0022',
        code_name:'2',
        code_value:'保距抓拍设备',
        sort_index:2,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0022',
        code_name:'3',
        code_value:'区间抓拍设备',
        sort_index:3,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0023',
        code_name:'0',
        code_value:'声光报警器',
        sort_index:0,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0023',
        code_name:'1',
        code_value:'分流信号灯',
        sort_index:1,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0023',
        code_name:'2',
        code_value:'语音广播',
        sort_index:2,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0023',
        code_name:'3',
        code_value:'防撞警示灯',
        sort_index:3,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0024',
        code_name:'0',
        code_value:'无',
        sort_index:0,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0024',
        code_name:'1',
        code_value:'视频',
        sort_index:1,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0024',
        code_name:'2',
        code_value:'雷达',
        sort_index:2,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0024',
        code_name:'3',
        code_value:'地感线圈',
        sort_index:3,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0025',
        code_name:'0',
        code_value:'抓拍机直连',
        sort_index:0,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0025',
        code_name:'1',
        code_value:'工控',
        sort_index:1,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0025',
        code_name:'2',
        code_value:'终端服务器',
        sort_index:2,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0025',
        code_name:'3',
        code_value:'测速仪',
        sort_index:3,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0025',
        code_name:'4',
        code_value:'事件检测器',
        sort_index:4,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0026',
        code_name:'0',
        code_value:'自建',
        sort_index:0,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0026',
        code_name:'1',
        code_value:'电信',
        sort_index:1,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0026',
        code_name:'2',
        code_value:'联通',
        sort_index:2,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0026',
        code_name:'3',
        code_value:'移动监控服务器',
        sort_index:3,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0026',
        code_name:'4',
        code_value:'其他',
        sort_index:4,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0027',
        code_name:'0',
        code_value:'龙门架',
        sort_index:0,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0027',
        code_name:'1',
        code_value:'T型杆',
        sort_index:1,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0027',
        code_name:'2',
        code_value:'L杆',
        sort_index:2,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0027',
        code_name:'3',
        code_value:'立杆',
        sort_index:3,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0028',
        code_name:'0',
        code_value:'直行',
        sort_index:0,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0028',
        code_name:'1',
        code_value:'左转',
        sort_index:1,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0028',
        code_name:'2',
        code_value:'右转',
        sort_index:2,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0028',
        code_name:'3',
        code_value:'行车道',
        sort_index:3,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0028',
        code_name:'4',
        code_value:'应急车道',
        sort_index:4,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0029',
        code_name:'0',
        code_value:'冲红灯',
        sort_index:0,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0029',
        code_name:'1',
        code_value:'过车',
        sort_index:1,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0029',
        code_name:'2',
        code_value:'限距',
        sort_index:2,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
      code_type:'0029',
      code_name:'3',
      code_value:'大车占道',
      sort_index:3,
      editable:1,
      enable_flag:1,
      remark:""
    }, {
        code_type:'0030',
        code_name:'0',
        code_value:'枪机',
        sort_index:0,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0030',
        code_name:'1',
        code_value:'球机',
        sort_index:1,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0031',
        code_name:'0',
        code_value:'交通',
        sort_index:0,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0031',
        code_name:'1',
        code_value:'治安',
        sort_index:1,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0031',
        code_name:'2',
        code_value:'路政',
        sort_index:2,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0032',
        code_name:'1',
        code_value:'单色LED显示屏',
        sort_index:1,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0032',
        code_name:'2',
        code_value:'双基色LED显示屏',
        sort_index:2,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0032',
        code_name:'3',
        code_value:'全彩LED显示屏',
        sort_index:3,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0033',
        code_name:'0',
        code_value:'(省厅)总队',
        sort_index:0,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0033',
        code_name:'1',
        code_value:'(市局)支队',
        sort_index:1,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0033',
        code_name:'2',
        code_value:'(县局)大队',
        sort_index:2,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0033',
        code_name:'3',
        code_value:'(派出所)中队',
        sort_index:3,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0034',
        code_name:'0',
        code_value:'地市、城区',
        sort_index:0,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0034',
        code_name:'1',
        code_value:'县市或公路',
        sort_index:1,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0034',
        code_name:'2',
        code_value:'高速',
        sort_index:2,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0035',
        code_name:'01',
        code_value:'大型汽车号牌',
        sort_index:1,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0035',
        code_name:'02',
        code_value:'小型汽车号牌',
        sort_index:2,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0035',
        code_name:'03',
        code_value:'使馆汽车号牌',
        sort_index:3,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0035',
        code_name:'04',
        code_value:'领馆汽车号牌',
        sort_index:4,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0035',
        code_name:'05',
        code_value:'境外汽车号牌',
        sort_index:5,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0035',
        code_name:'06',
        code_value:'外籍汽车号牌',
        sort_index:6,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0035',
        code_name:'07',
        code_value:'两、三轮摩托车号牌',
        sort_index:7,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0035',
        code_name:'08',
        code_value:'轻便摩托车号牌',
        sort_index:8,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0035',
        code_name:'09',
        code_value:'使馆摩托车号牌',
        sort_index:9,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0035',
        code_name:'10',
        code_value:'领馆摩托车号牌',
        sort_index:10,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0035',
        code_name:'11',
        code_value:'境外摩托车号牌',
        sort_index:11,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0035',
        code_name:'12',
        code_value:'外籍摩托车号牌',
        sort_index:12,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0035',
        code_name:'13',
        code_value:'农用运输车号牌',
        sort_index:13,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0035',
        code_name:'14',
        code_value:'拖拉机号牌',
        sort_index:14,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0035',
        code_name:'15',
        code_value:'挂车号牌',
        sort_index:15,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0035',
        code_name:'16',
        code_value:'教练汽车号牌',
        sort_index:16,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0035',
        code_name:'17',
        code_value:'教练摩托车号牌',
        sort_index:17,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0035',
        code_name:'18',
        code_value:'试验汽车号牌',
        sort_index:18,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0035',
        code_name:'19',
        code_value:'试验摩托车号牌',
        sort_index:19,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0035',
        code_name:'20',
        code_value:'临时入境汽车号牌',
        sort_index:20,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0035',
        code_name:'21',
        code_value:'临时入境摩托车号牌',
        sort_index:21,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0035',
        code_name:'22',
        code_value:'临时行驶车号牌',
        sort_index:22,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0035',
        code_name:'23',
        code_value:'警用汽车号牌',
        sort_index:23,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0035',
        code_name:'24',
        code_value:'警用摩托车号牌',
        sort_index:24,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0035',
        code_name:'99',
        code_value:'其他号牌',
        sort_index:99,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0036',
        code_name:'0',
        code_value:'正常',
        sort_index:0,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0036',
        code_name:'10001',
        code_value:'相机故障',
        sort_index:10001,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0036',
        code_name:'10002',
        code_value:'车检器故障',
        sort_index:10002,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0036',
        code_name:'10003',
        code_value:'闪光灯故障',
        sort_index:10003,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0036',
        code_name:'10004',
        code_value:'存储故障',
        sort_index:10004,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0036',
        code_name:'10005',
        code_value:'电源故障',
        sort_index:10005,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0036',
        code_name:'10006',
        code_value:'传输设备故障',
        sort_index:10006,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0036',
        code_name:'10007',
        code_value:'断流',
        sort_index:10007,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0036',
        code_name:'10008',
        code_value:'破坏',
        sort_index:10008,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0036',
        code_name:'10009',
        code_value:'偷盗',
        sort_index:10009,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0036',
        code_name:'10010',
        code_value:'无违法车辆',
        sort_index:10010,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0036',
        code_name:'10011',
        code_value:'线圈故障',
        sort_index:10011,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0036',
        code_name:'10012',
        code_value:'雷达故障',
        sort_index:10012,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0036',
        code_name:'10013',
        code_value:'认证未通过',
        sort_index:10013,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0036',
        code_name:'10014',
        code_value:'GPS故障',
        sort_index:10014,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0036',
        code_name:'10015',
        code_value:'UPS电源故障',
        sort_index:10015,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0036',
        code_name:'10016',
        code_value:'能见度仪故障',
        sort_index:10016,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0036',
        code_name:'10017',
        code_value:'视频相机故障',
        sort_index:10017,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0036',
        code_name:'10018',
        code_value:'LED故障',
        sort_index:10018,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0036',
        code_name:'10019',
        code_value:'软件狗故障',
        sort_index:10019,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0036',
        code_name:'10020',
        code_value:'无过车',
        sort_index:10020,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0036',
        code_name:'10999',
        code_value:'其他主故障',
        sort_index:10999,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0037',
        code_name:'10',
        code_value:'干燥',
        sort_index:10,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0037',
        code_name:'15',
        code_value:'微湿',
        sort_index:15,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0037',
        code_name:'20',
        code_value:'潮湿',
        sort_index:20,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0037',
        code_name:'25',
        code_value:'微湿含盐',
        sort_index:25,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0037',
        code_name:'30',
        code_value:'潮湿含盐',
        sort_index:30,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0037',
        code_name:'35',
        code_value:'结冰',
        sort_index:35,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0037',
        code_name:'40',
        code_value:'积雪',
        sort_index:40,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0037',
        code_name:'45',
        code_value:'霜冻',
        sort_index:45,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0038',
        code_name:'71051',
        code_value:'违章停车',
        sort_index:71051,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0038',
        code_name:'13451',
        code_value:'违章变道',
        sort_index:13451,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0038',
        code_name:'13441',
        code_value:'违章逆行',
        sort_index:13441,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0038',
        code_name:'1303',
        code_value:'超速行驶',
        sort_index:1303,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0038',
        code_name:'10000',
        code_value:'车距过近',
        sort_index:10000,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0039',
        code_name:'40',
        code_value:'40',
        sort_index:40,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0039',
        code_name:'60',
        code_value:'60',
        sort_index:60,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0039',
        code_name:'80',
        code_value:'80',
        sort_index:80,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0039',
        code_name:'90',
        code_value:'90',
        sort_index:90,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0039',
        code_name:'100',
        code_value:'100',
        sort_index:100,
        editable:1,
        enable_flag:1,
        remark:""
    }, {
        code_type:'0039',
        code_name:'120',
        code_value:'120',
        sort_index:120,
        editable:1,
        enable_flag:1,
        remark:""
    }
];

module.exports = dicData;
