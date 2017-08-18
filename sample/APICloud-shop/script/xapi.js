function $$(element) {
    return (element instanceof $_jQuery_Zepto) ? element : $(element);
}
function json_parse(data) {
    if(!data)return {};

    if(typeof(data) == 'string' ){
        data = JSON.parse(data);
    }
    return data;
}
function json_stringify(data){
    if(typeof(data) == 'string' ){
        return data;
    }
    return JSON.stringify(data);
}
function is_jquery(){
    return $.fn && $.fn.jquery;
}

var $_jQuery_Zepto = is_jquery() ? window.jQuery : window.Zepto;
var $xapi = {};
var xapi = (function($){
    "use strict";

    var api_js = document.scripts,
        __api_datas = {},  //保存api返回的数据
        __commands = {},
        __user_local_data_group_name = '__user__',  //本地用于保存用户的组名
        __root_path = api_js[api_js.length-1].src.substring(0,api_js[api_js.length-1].src.lastIndexOf("/")+1) + "../",
        api_request_count = 0; //记录页面请求接口的次数, 第一次时显示加载框;


    $xapi = $.extend({}, xapi_config);

    var $_cur_element = null;  //当前操作的element

    function _init(){

        if(xapi.render && xapi.render.init_page){
            xapi.render.init_page();
        }

        //替换@,$xapi等变量
        xapi.render.render_body();

        $(document).on('click', '[xopen]', function(){
            xapi.utils.open_window(this);
        });
        $(document).on('click', '[xjump]', function(){
            xapi.utils.jump(this);
        });
        $(document).on('click', '[xclose]', function(){
            xapi.xclose($(this).attr('xclose'));
        });

        //绑定命令
        for(var name in __commands){
            var selector = __commands[name].selector ? __commands[name].selector : '[xx-' + name + ']',
                handler = __commands[name].handler,
                bind = __commands[name].bind;

            xapi[name] = handler;

            //$('#main').xget();
            $.fn["x" + name] = (function (mname) {
                return function(api_path, option, callback) {
                    xapi[mname]($(this)[0], api_path, option, callback);
                }
            })(name);

            $(selector).each(function () {
                _apply_cmd(this, name, handler, bind, selector);
            });
        }

    }

    function _apply_cmd(elm, name, handler, bind, selector)
    {
        var $elm = $$(elm);
        
        if(!name){
            for(var name in __commands){
                if($elm.attr('xx-' + name)){
                    _apply_cmd(elm, name);
                }
            }
            return;
        }

        handler = handler||__commands[name].handler;
        selector = __commands[name].selector ? __commands[name].selector : '[xx-' + name + ']';
        
        $elm.x_uuid();
        $elm.x_comd_lab(name, selector);
        $elm.x_is_command(1);

        if(name == 'post' && !$elm.is('form')){
             if($elm.attr('x-bind') == 'disable')
                __commands[name].bind = '';
             else if(!$elm.attr('x-bind'))
                __commands[name].bind = 'click';
        }

        if(!__commands[name].bind){
            handler(elm);
        }else{
            bind = $elm.attr('x-bind') || bind;

            var uuid = $elm.x_uuid();  //设置唯一ID
            $(document).on(bind, '[_uuid="'+uuid+'"]', (function(uuid, mname){
                return function(){
                    var $e = $( '[_uuid="'+uuid+'"]' );
                    xapi[mname]($e[0]);
                    return false;
                }
            })(uuid, name));
        }
    }

    function _commands() {
        return __commands;
    }

    function _create_command(name, handler, bind, options)
    {
        if(xapi[name]){
            _debug("command:" + name + '与系统方法重名.', 'err');
            return;
        }

        options = options || {};

        if(__commands[name] && !options.override){
            _debug("command:" + name + '已被使用.', 'err');
            return;
        }

        __commands[name] = {
            handler: handler,
            bind: bind,
            selector: options.selector
        };
    }

    function _set_current_element(element){
        //$_cur_element = $$(element);
        var $elm = element ? $$(element) : '';
        $_cur_element = $elm && $elm.length ? $elm.x_uuid() : undefined;
    }
    function _get_current_element(){
        if(!$_cur_element)return null;
        var $elm = xapi.get_by_uuid($_cur_element);
        return $elm.length ? $elm : null;
        //return ($_cur_element && $_cur_element.length) ? $_cur_element : null;
    }

    function _run_callback(name, $elm, data) {
        //var name = arguments[0], $elm = arguments[1], data;
        if($elm && $elm.attr(name)){
            try{
                var func = eval($elm.attr(name));
                func(data, $elm);
            }catch (error){
                xapi.debug('x-after-render: 回调函数' + $elm.attr(name) + ' 运行失败:' + error, 'err');
                return;
            }
        }
    }

    var last_api_request = null;
    function _save_api_request(args){
        last_api_request = args;
    }
    function _retry_api_request()
    {
        if(!last_api_request)return;
        var args = [];
        for(var i in last_api_request){
            args.push("last_api_request[" + i + "]");
        }
        eval("_api_request("+args.join(',')+")");
    }

    function _api_request(api_path, method, data, callback_success, callback_fail, callback_error){
        _save_api_request(arguments);

        if(!api_path){
            return _debug('api_path不能为空', 'err');
        }

        var $cur_elm = _get_current_element(), dataType;

        //重复请求
        //alert($cur_elm.x_is_loading());
        if($cur_elm && $cur_elm.x_is_loading()){
            return _debug('请求进行中，不能重复发起请求:' + api_path, 'err');
        }

        if(data && typeof(data) == 'string' ){
            data = JSON.parse(data);
        }

        //在元素中用指定回调：<a x-success="回调函数">xxx</a>
        if($cur_elm && $cur_elm.attr('x-success')){
            callback_success = $cur_elm.attr('x-success');
        }
        if($cur_elm && $cur_elm.attr('x-fail')){
            callback_fail = $cur_elm.attr('x-fail');
        }
        if($cur_elm && $cur_elm.attr('x-error')){
            callback_error = $cur_elm.attr('x-error');
        }

        //callback_fail = callback_fail || $xapi.def_fail_handler;  //导致def_fail_handler函数中 不能使用this.
        //callback_error = callback_error || $xapi.def_error_handler;

        if(api_path.substr(0, 1) == "*") {
            if (!_is_login()) {
                xapi.goto_login();
                return false;
            } else {
                api_path = api_path.substr(1);
            }
        }

        var url;
        method = (method ? method : 'get').toLocaleLowerCase();
        if(method == 'get'){
            url = _build_api_url(api_path, data);
            data = {};
            dataType = $xapi.jsonp && (xapi.in_web || $xapi.mobile_jsonp) ? 'jsonp' : 'json';
        }else{
            url = _build_api_url(api_path);
            dataType = 'json';
        }

        var user_time_flag = '请求接口"'+api_path+'"共用时: ';
        _use_time(user_time_flag);

        if($cur_elm){
           $cur_elm.x_is_loading(1); 
        }

        api_request_count++;

        xapi.before_request($cur_elm);
        $('#note-net-error').hide();

        $.ajax({
            url: url,
            data: data,
            type: method,
            dataType: dataType,
            jsonp: dataType == 'jsonp' ? "_callback" : '',  //传递给请求处理程序或页面的，用以获得jsonp回调函数名的参数名(默认为:callback)
            timeout:10000,                                  //超时时间设置为10秒；
            success:function(data){
                _use_time(user_time_flag, true);
                _success_callback(data, $cur_elm, method, callback_success, callback_fail, callback_error);
                return true;
            },
            error: function (XMLHttpRequest,textStatus ,errorThrown) {
                //          XMLHttpRequest.readyState:
                //          0 － （未初始化）还没有调用send()方法
                //          1 － （载入）已调用send()方法，正在发送请求
                //          2 － （载入完成）send()方法执行完成，已经接收到全部响应内容
                //          3 － （交互）正在解析响应内容
                //          4 － （完成）响应内容解析完成，可以在客户端调用了
                //          XMLHttpRequest.status:
                //          textStatus: "timeout", "error", "notmodified" 和 "parsererror"。
                //          （0）null
                //          （1）timeout 超时
                //          （2）error
                //          （3）notmodified 未修改
                //          （4）parsererror 解析错误
                if($cur_elm){
                    $cur_elm.x_is_loading(0);  //不能在complete中设置，有延迟（complete执行顺序太靠后）
                }
                if(!XMLHttpRequest.status){
                    if($xapi.jsonp){
                        _debug('接口地址 或 服务器错误:' + api_path, 'err');       
                    }
                    xapi.toast('亲，网络好像不通哦.', 2, 'top');
                    //xapi.network_error();
                }else if(XMLHttpRequest.status == 401){
                    $('body').show();
                }
            },
			complete:function(event, xhr, settings){
                _debug('http_status_code: ' + (dataType == 'jsonp' ? '[jsonp无法获取状态码]' : event.status), 'res');

                xapi.after_complete(event, xhr, settings, $cur_elm);

                if(!event.status || event.status == 200){
                    return;
                }

                //接口没有返回200
                if(!callback_error){
                    $xapi.def_error_handler(event, xhr, settings, $cur_elm);
                }else if(callback_error){
                    if(typeof(callback_error) == 'string'){
                        eval("callback_error=" + callback_error + ";");
                    }
                    callback_error(event, xhr, settings, $cur_elm);
                }

                _debug('result: ' + event.responseText, 'res');
                return false;
			}
        });
    }

    function _success_callback(responseText, $cur_elm, method, callback_success, callback_fail, callback_error) {

        //发送事件
        if( $cur_elm && $cur_elm.attr('x-send-event') ){
            xapi.send_event( $cur_elm.attr('x-send-event'), $xapi.get_api_result_data(data) );
        }

        if($cur_elm){
            $cur_elm.x_is_loading(0);  //不能在complete中设置，有延迟（complete执行顺序太靠后）
        }

        try {
            var result = json_parse(responseText);
        }catch (error){
            _debug('接口返回的数据无法解析为json:' + json_stringify(responseText), 'err');
            return false;
        }

        xapi.network_error(true);
        //todo
        xapi.hide_progress();

        //接口返回200，但操作失败
        if(!$xapi.is_api_succ(result)){
            if(!callback_fail){
                $xapi.def_fail_handler(result, $cur_elm);
            }else if(callback_fail){
                if( typeof(callback_fail) == 'string'){
                    eval("callback_fail=" + callback_fail + ";");
                }
                callback_fail(result, $cur_elm);
            }

            _debug('result: ' + json_stringify(responseText), 'res');
            return false;
        }

        //接口请求成功才显示页面
        $('body').show();

        if($xapi.debug_print_succ_result || xapi.page_param('_d')){
            _debug('result: ' + json_stringify(responseText), 'res');
        }

        var data = $xapi.get_api_result_data(result);

        if($cur_elm){
            //请求次数加一
            $cur_elm.x_req_count(1);

            if(!data || !data.length){
                $cur_elm.x_nomore(1);
            }

            //保存数据到本地
            if($cur_elm.attr('x-save-local')){
                _local_data($cur_elm.attr('x-save-local'), data);
            }
        }

        if(callback_success) {
            if(callback_success && typeof(callback_success) == 'string'){
                eval("callback_success=" + callback_success + ";");
            }
            callback_success(data, $cur_elm);
        }
    }

    function _build_api_url(api_path, data) {

        //test
        if($xapi.api_base_url == 'test-data/'){
            api_path = api_path.replace('/', '-') + '.json';
        }

        if($xapi.api_base_url.indexOf('?') != -1)
            api_path = api_path.replace('?', '&');

        var url = $xapi.api_base_url + api_path;
        var access_token = _access_token();
        access_token = access_token || $xapi.access_token_test;
        if(access_token){
            url = xapi.utils.join_url(url, $xapi.access_token_name + '=' + access_token);
            //加签名
        }

        if(data){
            for(var k in data){
                url = xapi.utils.join_url(url, k + '=' + data[k]);
            }
        }

        //替换url中的@page_param
        var arr = url.match(/@page_param\.\w+/g);
        for(var i in arr){
            var qv = '';
            try{
                eval( "qv=" + arr[i].replace('@page_param', 'xapi.page_param()') );
            }catch(error){
                _debug('取得页面传值' + arr[i] + '失败:' + error, 'err');
            }
            url = url.replace(arr[i], qv || '');
        }

        console.log(url, 'req');

        return url;
    }

    function _debug(content, type){
		if(!$xapi.debug)return;

        if(typeof(content) != 'string'){
            content = JSON.stringify(content);
        }

        type = type || 'log';

        var set = {
            'req':{prefix:'Request', m:'info', color:'blue'},
            'res':{prefix:'Response', color:'purple'},
            'err':{prefix:'Error', m:'error'},
            'warning':{prefix:'Warning', m:'warn'},
            'sep':{prefix:'--------------------------------------------------------', color:'grey'},
            'log':{prefix:'Log'}
        };

        content = (set[type].color?'%c':'') + 'xapi::' + set[type].prefix + ' > ' + content;

        if(set[type].m){
            console[set[type].m](content);
        }else if(set[type].color){
            console.log(content, "color:" + set[type].color);
        }else{
            console.log(content);
        }
    }

    function _set_depth(key, end){
        //
    }
    function _use_time(flag, end){
        if(!$xapi.debug)return;

        var p = '--------------------------------------------------------';
        if(!end){
            console.time(p + flag);
        }else{
            console.timeEnd(p + flag);
        }
    }

    function _storage(key, value){
        if(!xapi.in_web){
            return xapi.platform.storage(key, value);
        }

        if(value || value === null){
            xapi.utils.cookie(key, value);
            return true;
        }else{
            return xapi.utils.cookie(key);
        }
    }

    //保存数据到本地  取得数据 key=分组.key, 如：user.username
    function _local_data(key, value, clear){
        var arr = key.split('.');

        //清除数据
        if(clear){
            if(arr.length == 1) {
                xapi.storage(arr[0], null);
            }else{
                var result = xapi.storage(arr[0]);
                if(result && typeof(result) == 'object'){
                    delete result[arr[1]];
                }
                xapi.storage(arr[0], result);
            }
            return true;
        }

        //取得数据 key=分组.key, 如：user.username
        if(!value){
            var result = xapi.storage(arr[0]);
            try{
                var obj_result = JSON.parse(result);
            }catch(err){}
            result = obj_result || result;

            if(arr.length == 1) {
                return result;
            }

            if(typeof(result) != 'object'){
                return null;
            }
            return result && result[arr[1]] ? result[arr[1]] : null;
        }

        //设置数据
        if(arr.length == 1) {
            xapi.storage(key, value);
            return true;
        }

        var data = xapi.storage(arr[0]);
        if(!data)data = {};
        if(typeof(data) != 'object'){
            _debug('已有数据格式不是object', 'err');
            return false;
        }
        data[ arr[1] ] = value;
        xapi.storage(arr[0], data);
        return true;
    }

    //返回/操作用户数据
    function _user_data(key, value, clear){
        var gname = __user_local_data_group_name;

        key = key ? (gname + "." + key) : gname;
        return _local_data(key, value, clear);
    }
    function _logout(){
        _user_data('', '', true);
    }
    function _is_login() {
        var access_token = _access_token();
        return access_token && access_token.length > 0;
    }
    function _config(name){
        if(typeof($xapi[name]) == 'function'){
            eval("var result = $xapi." + name + "();");
            return result;
        }else{
            return $xapi[name];
        }
    }
    function _access_token(access_token) {
        var name = _config('access_token_name');
        return _user_data(name, access_token);
    }

    return {
        'in_web': false,  //当前是否是web环境
        'root_path':__root_path,
        'config':_config,
        'storage': _storage,
        'local_data':_local_data,
        'access_token':_access_token,
        'user_data':_user_data,
        'logout':_logout,
        'is_login':_is_login,
        'commands':_commands,
        'create_command':_create_command,
        'apply_command': _apply_cmd,
        'api_datas':__api_datas,
        //'bolts': _bolts,
        //'create_bolt':_create_bolt,

        'api_request':_api_request,
        'retry_api_request':_retry_api_request,
        'set_current_element':_set_current_element,

        'init':_init,
        'debug':_debug,
        'set_depth': _set_depth,
        'use_time':_use_time,

        'is_show_progressed': false,

        'page_param':function(name){
            if(xapi.in_web){
                var url = window.location.search; //获取url中"?"符后的字串
                var theRequest = new Object();
                if (url.indexOf("?") != -1) {
                    var str = url.substr(1),
                        strs = str.split("&");
                    for(var i = 0; i < strs.length; i ++) {
                        theRequest[strs[i].split("=")[0]]=decodeURI(strs[i].split("=")[1]);
                    }
                }
                return name ? (theRequest[name]||'') : theRequest;
            }else{
                return xapi.platform.page_param(name);
            }
        },
        'load_more':function(param){
            return xapi.platform.load_more(param);
        },
        'fullpath':function(path){
            var dir = xapi.root_path + $xapi.html_dir;
            return dir + path.replace($xapi.html_ext, '') + $xapi.html_ext;
        },
        'xjump':function(uri, data){
            return this.open_window(uri, data, '', true);
        },
        'xopen':function(uri, data, title){
            if(uri == 'index')
                return this.xjump(uri);
            else
                return this.open_window(uri, data, title);
        },
        'xclose':function(xclose){
            if(xapi.in_web){
                history.back(-1);
            }else{
                xapi.platform.close_window( xclose );
            }
        },
        'open_window':function(uri, data, title, jump){
            /*if(data && typeof data == 'string'){
                data = xapi.utils.query_string2json(data);
            }else data = data||{};*/
            data = data || '';
            if(typeof data == 'object'){
                var arr = [];
                for(var k in data)
                    arr.push(k + "=" + data[k]);
                data = arr.join('&');
            }

            if(uri.indexOf('?') !== -1){
                data += '&' + uri.substr( uri.indexOf('?') + 1 );
                uri = uri.substr(0, uri.indexOf('?'));
                /*if(arr[1]) {
                    data = $.extend(data, xapi.utils.query_string2json(arr[1]));
                }*/
            }
            if(data.substr(0, 1) == '&')data = data.substr(1);

            if(xapi.in_web){
                location.href = xapi.fullpath(uri) + (data ? '?' + data : '');
                return;
            }

            if(jump){
                return xapi.platform.jump(uri, data);
            }else{
                return xapi.platform.open_window(uri, data, title);
            }
        },

        //前往登录页
        'goto_login': function(){
            xapi.open_window( $xapi.uris.login );
        },

        //前往会员中心页
        'goto_user_index': function () {
            xapi.xjump( $xapi.uris.user_index );
        },

        'after_login': function(data){
            //保存用户数据
            xapi.user_data('', data);
            //xapi.goto_user_index();
            xapi.xclose();
        },

        //前往首页
        'goto_home': function(){
            xapi.xjump( $xapi.uris.index);
        },

        'show_progress':function(title, modal, text){
            if(xapi.is_show_progressed || !$xapi.is_show_progress || !xapi.platform.show_progress){
                return;
            }
            xapi.is_show_progressed = true;
            console.log('###############');
            xapi.platform.show_progress(title, modal, text);
        },
        'hide_progress':function(){
            if(!xapi.platform.hide_progress){
                return;
            }
            xapi.platform.hide_progress();
        },

        'before_request': function($elm){
            if(!$elm || !$elm.x_has_attr('x-no-progress')){
                xapi.show_progress();
            }

            _run_callback('x-before-request', $elm);
        },

        'after_complete': function(event, xhr, settings, $elm){
            xapi.hide_progress();
            //_run_callback('x-after-complete', $elm, event, xhr, settings);
        },

        'after_render':function(data, $elm){
            $('body').show();
            xapi.hide_progress();
            _run_callback('x-after-render', $elm, data);
        },

        'get_by_uuid': function(uuid){
            return $('[_uuid="' + uuid + '"]');
        },

        //提示信息
        'alert': function (msg, callback) {
            if(msg) {
                xapi.platform.alert(msg, callback);
            }
        },
        'alert_err': function (msg, callback) {
            xapi.platform.alert(msg||$xapi.msg.op_fail, callback);
        },
        //操作成功提示信息
        'alert_succ': function (msg, callback) {
            xapi.platform.alert(msg, callback);
        },
        'confirm': function(msg, callback_yes, callback_no, title, buttons){
            xapi.platform.confirm(msg, callback_yes, callback_no, title, buttons);  
        },
        //表单验证失败提示信息
        'form_validator_fail_alert': function(msg, elm){
            xapi.platform.toast(msg);
        },
        'toast': function(msg, duration, position){
            xapi.platform.toast(msg, duration, position);
        },
        'toast_err': function (msg, duration, position) {
            xapi.platform.toast(msg||$xapi.msg.op_fail, duration, position);
        },
        //操作成功提示信息
        'toast_succ': function (msg, duration, position) {
            xapi.platform.toast(msg||$xapi.msg.op_succ, duration, position);
        },
        'network_error': function(hide){
            var id = 'network-error';
            var $elm = $('body').find('#' + id);
            if(hide){
                $elm.hide();
            }else if( $elm.length ){
                $elm.show();
            }else{

                $('body').append('<div id="'+id+'" onclick="apiready();">' + $xapi.network_error_show.replace('{root_path}', xapi.root_path) + '</div>')
                         .show();
            }
        },
        //发送事件
        'send_event': function(event_name, data){
            if(xapi.platform.send_event){
               xapi.platform.send_event(event_name, data); 
            }
        },
        //监听
        'add_listener': function(event_name, callback){
            if(xapi.platform.add_listener){
               xapi.platform.add_listener(event_name, callback); 
            }
        }

    };
})($_jQuery_Zepto);

/**
 * 手动运行组件，如: $('#main').x_run();
 * @param run_bind 是否运行绑定了事件的指令
 */
$.fn.x_run = function (run_bind) {
    if($(this).attr('x-bind') && !run_bind){
        return;
    }

    var commands = xapi.commands();
    for(var name in commands){
        if(commands[name].bind && !run_bind)continue;
        if($(this).x_has_attr( "xx-" + name )){
            xapi[name]($(this)[0]);
        }
    }
}

//当前元素的分页（xx-list）
$.fn.x_page = function(page){
    if(page === null){
        return $(this).removeAttr('_x-page');
    }

    if(page === undefined){
        return ($(this).attr('_x-page')||0) * 1;
    }else{
        return $(this).attr('_x-page', page);
    }
}

//元素唯一ID
$.fn.x_uuid = function(remove){
    if(remove){
        return $(this).removeAttr('_uuid');
    }

    var uuid = $(this).attr('_uuid');
    if(!uuid){
        $(this).attr('_uuid', xapi.utils.get_uuid());
    }

    return $(this).attr('_uuid');
}
$.fn.x_copy_attrs_from = function(from){
    var $this = $(this);
    $.each($$(from)[0].attributes,function(i,attrib){
        $this.attr(attrib.name, attrib.value);
    });
}

//组件名：list(user/index)
$.fn.x_comd_lab = function(comp_name, selector){
    if(comp_name){
        var arr = /\[([\w\-]+)\]/.exec(selector);
        var n = arr ? arr[1] : selector; 
        var t = $(this).attr(n);
        if(t.indexOf('$') !== -1)return;  //子循环不设置comp_id
        return $(this).attr('_comd_lab', comp_name + "(" + t + ")");
    }else{
        return $(this).attr('_comd_lab');
    }
};

$.fn.x_nomore = function (nomore) {
    if(nomore === null || nomore === undefined){
        return !!(($(this).attr('_x-nomore')||0) * 1);
    }else{
        return $(this).attr('_x-nomore', nomore ? 1 : 0);
    }
}

$.fn.x_has_attr = function(attrname){
    var v = $(this).attr(attrname);
    return v || v === '' || v === 0;
}

//防止重复执行
$.fn.x_is_loading = function(set){
    if(set === null || set === undefined){
        return !!(($(this).attr('_x-is_loading')||0) * 1);
    }else{
        return $(this).attr('_x-is_loading', set ? 1 : 0);
    }
}

//命令的运行状态：-1:未运行，0:运行中，1:运行结束
$.fn.x_command_status = function(set){
    if(set === null || set === undefined){
        var status = $(this).attr('_x-command_status');
        if(status === null || status === undefined || status === ''){
            return -1;
        }else{
            return status * 1;
        }
    }else{
        return $(this).attr('_x-command_status', set ? 1 : 0);
    }
}

$.fn.x_req_count = function(c){
    var count = ($(this).attr('_x-req-count')||0) * 1;
    if(c === 0){
        $(this).attr('_x-req-count', 0);
        return $(this);
    }else if(c > 0){
        count+=c;
        $(this).attr('_x-req-count', count);
        return $(this);
    }else{
        return count;
    }
}

$.fn.x_render_count = function(c){
    var count = ($(this).attr('_x-render_count')||0) * 1;
    if(c === 0){
        $(this).attr('_x-render_count', 0);
        return $(this);
    }else if(c > 0){
        count+=c;
        $(this).attr('_x-render_count', count);
        return $(this);
    }else{
        return count;
    }
}

$.fn.x_is_tpl = function(set){
    if(set === null || set === undefined){
        return !!(($(this).attr('_x-is_tpl')||0) * 1);
    }else{
        if(!set){
            return $(this).removeAttr('_x-is_tpl');
        }else{
            return $(this).attr('_x-is_tpl', 1);
        }
    }
}

//标记是非为command
$.fn.x_is_command = function(set){
    if(set === null || set === undefined){
        return !!(($(this).attr('_x-is_command')||0) * 1);
    }else{
        if(!set){
            return $(this).removeAttr('_x-is_command');
        }else{
            return $(this).attr('_x-is_command', 1);
        }
    }
}
$.fn.x_parent_command = function () {
    return xapi.get_by_uuid($(this).x_uuid()).parent().closest('[_x-is_command="1"]');
}
$.fn.x_find_all_command_elements = function(){
    return $(this).find('[_x-is_command="1"]');
}
$.fn.x_find_all_tpl_elements = function(){
    return $(this).find('[_x-is_tpl="1"]');
}
$.fn.x_api_data = function (data, set) {
    if(!set && (data === null || data === undefined)){
       return xapi.api_datas[ $(this).x_uuid() ];
    }else{
        xapi.api_datas[ $(this).x_uuid() ] = data;
    }
}

$.fn.x_html = function (html) {
    if(html) {
        $(this)[0].innerHTML = html;
        return $(this);
    }else{
        return $(this)[0].innerHTML.replace(/(^\s*)|(\s*$)/g, "");
    }
}
$.fn.x_show = function () {
    if($(this).css('display') != 'none'){
        return $(this);
    }
    var display = $(this).attr('_x-display-old')||'';
    return $(this).css('display', display);
}
$.fn.x_hide = function () {
    if($(this).css('display')) {
        $(this).attr('_x-display-old', $(this).css('display'));
    }
    return $(this).hide();
}

xapi.utils = (function($){
    "use strict";

    function join_url(base_url, add_params)
    {
        return base_url + (base_url.indexOf('?')==-1?'?':'&') + add_params;
    }

    function date(intDate, format){
        if(format) {
            format = format.replace('date', 'yyyy-MM-dd').replace('time', 'hh:mm:ss');
        }else {
            format = 'yyyy-MM-dd hh:mm:ss';
        }

        var date = new Date(intDate * 1000);
        var o = {
            "M+" : date.getMonth()+1, //month
            "d+" : date.getDate(), //day
            "h+" : date.getHours(), //hour
            "m+" : date.getMinutes(), //minute
            "s+" : date.getSeconds(), //second
            "q+" : Math.floor((date.getMonth()+3)/3), //quarter
            "S" : date.getMilliseconds() //millisecond
        }

        if(/(y+)/.test(format)) {
            format = format.replace(RegExp.$1, (date.getFullYear()+"").substr(4 - RegExp.$1.length));
        }

        for(var k in o) {
            if(new RegExp("("+ k +")").test(format)) {
                format = format.replace(RegExp.$1, RegExp.$1.length==1 ? o[k] : ("00"+ o[k]).substr((""+ o[k]).length));
            }
        }
        return format;
    }

    function query_string2json (string) {
        if(!string || typeof(string) != 'string'){
            return string||{};
        }

        var obj = {}, pairs = string.split('&'), d = decodeURIComponent, name, value;
        $.each(pairs, function (i, pair) {
            pair = pair.split('=');
            name = d(pair[0]);
            value = d(pair[1]);
            obj[name] = value;
        });
        return obj;
    }

    function _is_dom(obj) {
        if(typeof HTMLElement === 'object'){
            return obj instanceof HTMLElement;
        }else{
            return obj && typeof obj === 'object' && obj.nodeType === 1 && typeof obj.nodeName === 'string';
        }
    }

    function trim(string) {
        if(typeof string != 'string')return string;
        return string.replace(/^\s+|\s+$/gm,'');
    }

    function _tag_args(args, tagname){
        var result;

		if(args.length == 1 && xapi.utils.is_json_object(args[0])){
            result = args[0];
            if(result.success){
                result.callback_success = result.success;
                delete result.success;
            }
            if(result.fail){
                result.callback_fail = result.fail;
                delete result.fail;
            }
            if(result.error){
                result.callback_error = result.error;
                delete result.error;
            }
            if(result.elm){
                result.$elm = $$(elm);
                delete result.elm;
            }else{
                result.$elm = $();
            }
            result.option = result.option||{};

			return result;
		}

        result = {option:{}};

        for(var i in args){
            if(!args[i])continue;

            if(_is_dom(args[i]) || (typeof(args[i]) == 'string' && (
                args[i].substr(0, 1) == '#' || args[i].substr(0, 1) == '.' || args[i].substr(0, 1) == '['
            ))){
                result.$elm = $(args[i]);
            }else if(typeof args[i] == 'object'){
                result.option = args[i];
            }else if(typeof args[i] == 'function'){
                if(!result.callback_success) {
                    result.callback_success = args[i];
                }else{
                    result.callback_fail = args[i];
                }
            }else if(typeof args[i] == 'string'){
                result.api_path = args[i];
            }else if(typeof args[i] == 'array'){
                result.array_data = args[i]; //list的测试数据
            }
        }

        if(!result.$elm){
            result.$elm = result.option.elm ? $$(result.option.elm) : $(null);
        }

        result.api_path = result.api_path || result.option.api_path || result.$elm.attr(tagname);
        result.data = result.option.data || result.$elm.attr('x-data') || {};

        if(typeof result.data == 'string'){
            result.data = xapi.utils.query_string2json(result.data);
        }

        for(var t in result.data){
            result.data[t] += '';
            //页面间传递的参数
            if(result.data[t].substr(0, 12) == '@page_param.'){
                result.data[t] = xapi.page_param(result.data[t].substr(12));
            }
            //本地存储
            if(result.data[t].substr(0, 7) == '@local.'){
                result.data[t] = xapi.storage(result.data[t].substr(7));
            }
        }

        return result;
    }

    return {
        'join_url': join_url,
        'date':date,
        'query_string2json':query_string2json,
        'is_dom': _is_dom,
        'trim': trim,
        'tag_args':_tag_args,
        'in_array': function (needle, haystack) {
            if(!haystack)return false;
            var length = haystack.length;
            if(length) {
                for (var i = 0; i < length; i++) {
                    if (haystack[i] == needle) return true;
                }
            }
            return false;
        },
        'is_empty_object': function (e) {
            var t;
            for (t in e)
                return !1;

            return !0;
        },
		'is_json_object': function(obj){
			var isjson = typeof(obj) == "object" && Object.prototype.toString.call(obj).toLowerCase() == "[object object]" && !obj.length;   
			return isjson;
		},
        'get_uuid': function generateUUID() {
            var d = new Date().getTime();
            var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
              var r = (d + Math.random()*16)%16 | 0;
              d = Math.floor(d/16);
              return (c=='x' ? r : (r&0x3|0x8)).toString(16);
            });
            return uuid;
        },
        'jump': function (elm) {
            return this.open_window(elm, true);
        },
        "open_window": function(elm, jump){
            var $a = $$(elm), opener;

            var attr = jump ? 'xjump' : 'xopen';

            /*if(!$a.attr(attr)){
                $a = $a.parent(['xopen']);
            }*/
            if(!(opener = $a.attr(attr))){
                return false;
            }

            var params = opener.split(','), title = '', uri, data = '';
            if(!(uri = params.shift())){
                return false;
            }

            for(var i in params){
                if(/^[a-zA-Z_][a-zA-Z0-9_]+=/.test(params[i])){
                    data = params[i];
                }else{
                    title = params[i];
                }
            }

            if(uri.substr(0, 1) == '*'){
                if( !xapi.is_login() ){
                    return xapi.goto_login();
                }
                uri = uri.substr(1);
            }
            if(uri.substr(0, 1) == '/'){
                uri = uri.substr(1);
            }
            if(uri.indexOf('?') !== -1){
                var arr = uri.split('?');
                uri = arr[0];
                data += "&" + arr[1];
            }
            if(data.substr(0, 1) == '&')data = data.substr(1);
            
            if(!title){
                title = $a.text().replace(/\ +/g, "").replace(/[ ]/g, "").replace(/[\r\n]/g, "").substr(0, 10); //去掉空格，换行, 前10个字
            }
            //alert("uri:"+uri+", title:"+title+", data:" + data);

            if(jump){
                xapi.xjump(uri, data ? data : '');
            }else{
                xapi.xopen(uri, data ? data : '', title);
            }
        },
        'cookie': function(name, value, options){

            // 如果第二个参数存在
            if (typeof value != 'undefined') {
                options = options || {};
                if (value === null) {
                    // 设置失效时间
                    options.expires = -1;
                }
                if(typeof value == 'object'){
                    value = JSON.stringify(value);
                }
                var expires = '';
                // 如果存在事件参数项，并且类型为 number，或者具体的时间，那么分别设置事件
                if (options.expires && (typeof options.expires == 'number' || options.expires.toUTCString)) {
                    var date;
                    if (typeof options.expires == 'number') {
                        date = new Date();
                        date.setTime(date.getTime() + (options.expires * 24 * 3600 * 1000 * 15));  //保留15天
                    } else {
                        date = options.expires;
                    }
                    expires = '; expires=' + date.toUTCString();
                }
                var path = '; path=' + (options.path||'/'), // 设置路径
                    domain = options.domain ? '; domain=' + options.domain : '', // 设置域
                    secure = options.secure ? '; secure' : ''; // 只能通过https或其他安全协议才能传输

                // 把所有字符串信息都存入数组，然后调用 join() 方法转换为字符串，并写入 Cookie 信息
                var str_cookie = [name, '=', encodeURIComponent(value), expires, path, domain, secure].join('');
                xapi.debug('set cookie:' + str_cookie);
                document.cookie = str_cookie;
            } else { // 如果第二个参数不存在
                var CookieValue = null;
                if (document.cookie && document.cookie != '') {
                    var Cookies = document.cookie.split(';');
                    for (var i = 0; i < Cookies.length; i++) {
                        var Cookie = (Cookies[i] || "").replace( /^\s+|\s+$/g, "");
                        if (Cookie.substring(0, name.length + 1) == (name + '=')) {
                            CookieValue = decodeURIComponent(Cookie.substring(name.length + 1));
                            break;
                        }
                    }
                }
                return CookieValue;
            }
            
        }
    };
})($_jQuery_Zepto);

//检查客户端环境
xapi.navigator = (function($){
    "use strict";

    return {
        //真实环境是否是android
        'is_android': function(){
            return this.device() == 'linux' && this.browser_type() == 'android';
        },
        //真实环境是否是ios
        'is_ios': function(){
            return (this.device() == 'iphone'||this.device() == 'ipad');
        },
        'is_pc': function(){
            return !this.is_android() && !this.is_ios();
        },

        //硬件平台
        //http://blog.csdn.net/zhangxin09/article/details/38011051
        'device': function(){
            var p = navigator.platform;
            if(p.indexOf("Win") == 0)return 'windows';
            if(p.indexOf("Mac") == 0)return 'mac';
            if((p.indexOf("X11") == 0) || (p.indexOf( "Linux") == 0 ) ) return 'linux';
            if(/iphone/gi.test(p))return 'iphone';
            if(/ipad/gi.test(p))return 'ipad';
        },

        //客户端类型（有可能是chrome模拟）
        'browser_type': function(){
            var browser = {  
                versions: function () {  
                    var u = navigator.userAgent, app = navigator.appVersion;
                    return {     //移动终端浏览器版本信息  
                        trident: u.indexOf('Trident') > -1, //IE内核  
                        presto: u.indexOf('Presto') > -1, //opera内核  
                        webKit: u.indexOf('AppleWebKit') > -1, //苹果、谷歌内核  
                        gecko: u.indexOf('Gecko') > -1 && u.indexOf('KHTML') == -1, //火狐内核  
                        mobile: !!u.match(/AppleWebKit.*Mobile.*/), //是否为移动终端  
                        ios: !!u.match(/\(i[^;]+;( U;)? CPU.+Mac OS X/), //ios终端  
                        android: u.indexOf('Android') > -1 || u.indexOf('Linux') > -1, //android终端或uc浏览器  
                        iPhone: u.indexOf('iPhone') > -1, //是否为iPhone或者QQHD浏览器  
                        iPad: u.indexOf('iPad') > -1, //是否iPad  
                        webApp: u.indexOf('Safari') == -1 //是否web应该程序，没有头部与底部  
                    };  
                }(),  
                language: (navigator.browserLanguage || navigator.language).toLowerCase()  
            }  
      
            if (browser.versions.mobile) {//判断是否是移动设备打开。browser代码在下面  
                var ua = navigator.userAgent.toLowerCase();//获取判断用的对象  
                if (ua.match(/MicroMessenger/i) == "micromessenger") {  
                    //在微信中打开
                    return 'weixin';
                    //setInterval(WeixinJSBridge.call('closeWindow'), 2000);
                }  
                if (ua.match(/WeiBo/i) == "weibo") {  
                    //在新浪微博客户端打开  
                    return 'weibo';
                }  
                if (ua.match(/QQ/i) == "qq") {  
                    //在QQ空间打开  
                    return 'qq';
                }  
                if (browser.versions.ios) {  
                    //是否在IOS浏览器打开  
                    return 'ios';
                }  
                if (browser.versions.android) {  
                    //是否在安卓浏览器打开  
                    return 'android';
                }  
            } else {
                //否则就是PC浏览器打开  
                return 'pc';
                //window.close();  
            }

        },
    };
})($_jQuery_Zepto);