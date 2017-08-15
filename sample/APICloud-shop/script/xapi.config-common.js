/**
    调用方式：$xapi.xxx();
*/
var xapi_config = {
    'debug': true,   //是否开启调试（打印log）
    'debug_print_succ_result': false,  //接口调用成功后，是否打印接口数据(可在浏览器地址栏加上参数?_d=1临时打印)

    /* 以下参数请在后端配合下设置 */
    //'api_base_url': 'http://192.168.1.55/index.php/api/',   //api的基本地址
    'api_base_url': 'http://112.74.89.244:8081/index.php?s=api/',   //api的基本地址
    //'api_base_url': 'http://tpshop.local/index.php/api/',   //api的基本地址
    'jsonp': true,                                      //PC测试用，生产环境请关闭，jsonp存在安全漏洞，请确保使用的jsonp服务安全可信（jsonp不支持post，且无法获取http状态码, 可能为您的调试带来困难）
    'sign_key': 'axfkuilsxx4349dd-fdsfxlffx',           //用于生成签名
    'access_token_name': 'access_token',                //标识登陆用户，你也可以设为id，本地存储和api请求的都使用该名称
    'access_token_test': 'xxx',      //测试用的access_token
    'url_page_name': 'p',                               //url分页参数名
    'url_psize_name': 'psize',                          //url分页大小参数名
    'html_dir': 'html/',                                //除首页外其他html文件的存放目录，请加上/
    'html_ext': '.html',

    'is_show_progress': true,                           //是否显示加载框？

    /* 通用文件路径 */
    'uris': {
        'index': 'index',   //首页
        'login': 'user/login',  //登录页
        'user_index': 'user/index'   //会员中心
    },

    /* 提示信息 */
    'msg': {
        'empty': '暂无记录.',
        'nomore': '已经见底.',
        'op_fail': '操作失败.',
        'op_succ': '操作成功.',
        'op_timeout':'请求超时.',
        'try_later':'请求失败，请稍后再试.'
    },

    /* 网络错误提示信息 */
    'network_error_show': '<div style="position:absolute;top:0;bottom:0;left:0;right:0;background:#fff;opacity:1;z-index: 10000"><img src="{root_path}image/net-error.png" style="width:100%"></div>',

    //从接口返回的json中取的数据
    'get_api_result_data': function (result) {        
        return result.data;
    },

    //接口返回错误（未返回200）的处理程序
    'def_error_handler': function(event, xhr, settings, $elm){     
        if(event.status == 200)return true;

        if(event.status == 401) {
            if(!$elm || !$elm.x_has_attr('x-not-jump')) {
                xapi.goto_login();
            }
        }else if(event.status == 404) {
            xapi.debug('无此地址', 'err');
        }else if(event.statusText == 'timeout') {
            xapi.toast_err(this.msg.op_timeout+'xxx');
        }else {
            xapi.debug(event, 'res');
            xapi.toast_err(this.msg.try_later);
        }
        return false;
    },

    //接口是否返回成功
    'is_api_succ': function(result){
        return result.error_code == '0';
    },

    //接口返回失败处理程序(返回200，但操作失败（error_code!=0）)
    'def_fail_handler': function(result, $elm){             
        if(this.is_api_succ(result)){
            return true;
        }

        if( result.error_code == '1000' ) {
            xapi.toast_err(result.error_msg);
        }else if(result.error_code == '1001' && !$elm.x_has_attr('x-not-jump')){
            xapi.goto_login();
        }else if(result.error_code == '1009'){
            xapi.debug('无此接口地址', 'err');
        }else{
            xapi.toast_err(this.msg.op_fail);
            xapi.debug(result, 'err');
        }

        return false;
    }
};

