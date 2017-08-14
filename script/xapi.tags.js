/**
 * get api
 * 标签用法：<div xx-get="goods/info" x-data="id=101"> <!--渲染模板--></div>
 * 手动调用：xapi.get({elm:"#goods_info",api_path:"goods/info",data:"id=101"}, function(data){ ... });
            $('#xx').xget(api_path, option, callback_success);
 */
xapi.create_command('get', function(){
    "use strict";

    var params = xapi.utils.tag_args(arguments, "xx-get"),
        $elm = params.$elm, option = params.option,
        callback_success = params.callback_success, callback_fail = params.callback_fail,
        api_path = params.api_path, data = params.data;  //记录页面请求接口的次数, 第一次时显示加载框

    if(!$elm.length && !callback_success){
        xapi.debug('get:请指定element或callback', 'err');
        return false;
    }

    if(!api_path){
        xapi.debug('请指定api_path', 'err');
        return false;
    }

    //子命令不处理
    if( api_path.substr(0, 1) == '$' ){
        return false;
    }

    xapi.set_current_element($elm && $elm.length ? $elm : '');

    if(!callback_success){

        $elm.x_command_status(0); //命令开始

        //绑定事件
        if( $elm.attr('x-bind') ){
            var bind = $elm.attr('x-bind'), attr_binded = '_x-binded-get-' + bind;
            if(!$elm.attr(attr_binded)) {
                var uuid = $elm.x_uuid();  //设置唯一ID
                $(document).on(bind, '[_uuid="' + uuid + '"]', (function (uuid) {
                    return function (event) {
                        var $e = $('[_uuid="' + uuid + '"]');
                        xapi.get($e[0], {event_type: event.type});
                    }
                })(uuid));

                //标记已绑定
                $elm.attr(attr_binded, 1);
            }

            if($elm.attr('x-bind') != option.event_type){
                return false;
            }
        }

        var $container = $elm.attr('x-target') ? $($elm.attr('x-target')) : $elm;
        if( $container.length > 0 ) {
            callback_success = (function(uuid, c_uuid){
                return function (data) {
                    var $elm = xapi.get_by_uuid(uuid),
                        $container = xapi.get_by_uuid(c_uuid);

                    var comp_id = $elm.x_comd_lab(), f;
                    if(comp_id)f = '渲染"' + comp_id + '"共用时:';
                    if(f)xapi.use_time(f);
                    xapi.render.fetch_element($container, data);
                    if(f)xapi.use_time(f, true);

                    $elm.x_command_status(1); //命令结束

                    //启动嵌套子命令
                    $elm.x_find_all_command_elements().each(function(){
                        $(this).x_run();
                    });

                    xapi.after_render(data, $elm);
                }
            })($elm.x_uuid(), $container.x_uuid());
        }
    }

    xapi.api_request(api_path, 'get', data, callback_success, callback_fail);
});

/**
 * list
 * 标签用法：<div xx-list="goods/list" x-target="#container" x-data="cat_id=10"> <!--渲染模板--> </div>
 * 手动调用：xapi.list({elm:"#goods_list",api_path:"goods/index",target:"#container",data:"cat_id=10"}, function(data){ ... });
 */
xapi.create_command('list', function(){
    "use strict";

    var params = xapi.utils.tag_args(arguments, 'xx-list'),
        $elm = params.$elm, option = params.option,
        callback_success = params.callback_success, callback_fail = params.callback_fail,
        api_path = params.api_path, data = params.data, array_data = params.array_data,
        target = option.target || $elm.attr('x-target');

    //如果未指定api_path, 当data
    /*if(!api_path && $elm.length && !xapi.utils.is_empty_object(array_data)){

    }*/

    if(!$elm.length && !callback_success){
        xapi.debug('list:没找到elm' + JSON.stringify(arguments), 'err');
        return false;
    }

    if(!api_path){
        xapi.debug('list:请指定api_path', 'err');
        return false;
    }

    //子循环不处理
    if( api_path.substr(0, 1) == '$' ){
        return false;
    }

    xapi.set_current_element($elm && $elm.length ? $elm : '');

    if(!callback_success){

        //父命令元素未已完成，则不执行（父命令完成后再调用.x_run()）
        if( $elm.parent().closest('[_x-command_status="0"]').length  > 0 ){
            return false;
        }

        $elm.x_command_status(0); //命令开始

        if(!option.load_more){
            $elm.x_page(0).x_req_count(0);
        }

        if( $elm.attr('x-re-req') === null && $elm.attr('x-psize') === null && $elm.x_req_count() > 0 ){
            xapi.debug('取消：重复请求', 'log');
            return false;
        }

        //绑定事件
        if( $elm.attr('x-bind') ){
            var bind = $elm.attr('x-bind'), attr_binded = '_x-binded-list-' + bind;
            if(!$elm.attr(attr_binded)) {
                var uuid = $elm.x_uuid();  //设置唯一ID
                $(document).on($elm.attr('x-bind'), '[_uuid="' + uuid + '"]', (function (uuid) {
                    return function (event) {
                        var $e = $('[_uuid="' + uuid + '"]');
                        $e.x_page(null);
                        xapi.list($e[0], {event_type: event.type});
                    }
                })(uuid));

                //标记已绑定
                $elm.attr(attr_binded, 1);
            }

            if($elm.attr('x-bind') != option.event_type){
                return false;
            }
        }

        /*if($elm.x_nomore() && option.load_more){
            xapi.debug('已到最后一页', 'log');
            return false;
        }*/

        if( $elm.attr('x-psize') ){
            data[xapi.config('url_psize_name')] = $elm.attr('x-psize');
            xapi.load_more($elm[0]);
        }

        if( $elm.x_page() ){
            data[xapi.config('url_page_name')] =  $elm.x_page() + 1;
        }

        callback_success = (function(uuid){
            return function(data){
                var $elm = xapi.get_by_uuid(uuid);

                //标计分页
                var p = $elm.x_page();
                $elm.x_page(p + 1);

                var comp_id = $elm.x_comd_lab(), f;
                if(comp_id)
                    f = '渲染"' + comp_id + '"共用时:';
                if(f)xapi.use_time(f);

                xapi.render.fetch_loop($elm, data, target, option.load_more);

                $elm.x_command_status(1); //命令结束

                xapi.after_render(data, $elm);
                
                if(f)xapi.use_time(f, true);
            }
        })($elm.x_uuid());
    }

    xapi.api_request(api_path, 'get', data, callback_success, callback_fail);
});

/**
 * post
 * 标签用法：<form xx-post="goods/list"> <!--表单元素--> </div>
 * 手动调用：xapi.post({elm:"#login_form",api_path:"public/login",target:"#container"}, function(data){ ... });
 */
xapi.create_command('post', function(){
    "use strict";

    var params = xapi.utils.tag_args(arguments, 'xx-post'),
        $elm = params.$elm, option = params.option,
        callback_success = params.callback_success, callback_fail = params.callback_fail,
        api_path = params.api_path, data = params.data,
        method = option.method || $elm.attr('method') || 'post';

    if(!api_path){
        xapi.debug('请指定api_path', 'err');
        return false;
    }

    if( $elm.is('form') ){
        if(xapi.validator && !xapi.validator.form($elm[0])){
            return false;
        }

        var arr_data = $elm.serializeArray();
        for(var i in arr_data){
            data[ arr_data[i].name ] = arr_data[i].value;
        }

        if($elm.attr('method').toLowerCase() != 'get')
            method = $elm.attr('method');
    }

    xapi.set_current_element($elm && $elm.length ? $elm : '');

    if(!callback_success){
        xapi.set_current_element($elm);
        callback_success = function(data){
            var msg = $elm.attr('x-alert-succ');
            xapi.toast_succ( msg ? msg : '操作成功.' );
        };
    }

    xapi.api_request(api_path, method, data, callback_success, callback_fail);
    return false;
}, 'submit');

xapi.create_command('photo', function(elm){
    var $elm = $$(elm),
        m = $elm.attr('xx-photo');

    if(!$xapi.photo[m]){
        xapi.debug('不支持方法：photo.' + m, 'err');
        return false;
    }

    $xapi.photo[m]((function($elm){
        return function(base64){
            if(!base64)return false;
            //$elm.attr('src', base64);return;

            var $img;
            if(!$elm.attr('x-insert')){
                if($elm.is('img'))$img = $elm;
                else $img = $elm.find('img.preview');
            }

            if(!$img || !$img.length){
                xapi.debug('没找到预览图片(img.preview)', 'err');
                return false;
            }

            $img.attr('src', base64);
        }
    })($elm));
}, 'click');

/**
 * tab
 * 标签用法：
 *
 <ul xx-tab-cont=".tab-cont"x-active-class="active">
    <li class="active">收藏的商品</li>
    <li>收藏的店铺</li>
 </ul>

 <div class="tab-cont">
    ...
 </div>
 <div class="tab-cont">
 ...
 </div>
 */
xapi.create_command('tab', function(elm){
    var $container = $(elm),
        $cont_selector = $container.attr('xx-tab'),
        $conts = $( $cont_selector );

    var active_class = $container.attr('x-active-class') ? $container.attr('x-active-class') : 'active';
    $container.children().each(function (index) {
        $(this).live('click', function(){
            $(this).addClass(active_class);
            if($conts.length <= 1){
                index = 0;
            }
            var $cont = $conts.eq(index);
            $cont.show();

            $(this).siblings().removeClass(active_class);
            $cont.siblings($cont_selector).hide();
        });
    });
});
