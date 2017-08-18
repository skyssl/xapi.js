/**
    调用方式：$xapi.xxx();
*/
var xapi_config = {
    'debug': true,   //是否开启调试（打印log）
    'debug_print_succ_result': false,  //接口调用成功后，是否打印接口数据(可在浏览器地址栏加上参数?_d=1临时打印)

    /* 以下参数请在后端配合下设置 */
    'api_base_url': 'http://o2o.885505.com/api.php?s=',   //api的基本地址
    'jsonp': true,                                      //PC测试用，生产环境请关闭，jsonp存在安全漏洞，请确保使用的jsonp服务安全可信（jsonp不支持post，且无法获取http状态码, 可能为您的调试带来困难）
    'mobile_jsonp': true,                               //手机调试用，是否在手机端启用jsonp, 用于支持APICloud的contrl+o （jsonp为false无效）
    'sign_key': 'axfkuilsxx4349dd-fdsfxlffx',           //用于生成签名
    'access_token_test': 'xxx',      //测试用的access_token
};

