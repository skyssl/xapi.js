xapi.platform = (function($){
    "use strict";

    function set_app_frames()
    {
        if($($xapi.page_main_menu).length){
            $xapi.app_frames = [];
            $($xapi.page_main_menu).find('[xjump]').each(function(){
                $xapi.app_frames.push({
                    name: $(this).attr('xjump'),
                    url: xapi.fullpath($(this).attr('xjump')),
                });
            });
            if(!xapi.in_web){
                api.openFrameGroup({
                    name: 'group',
                    scrollEnabled: false,
                    preload : $xapi.openFrameGroup_preload||0,  //默认加载个数，0:第一个页面(首页), 1:前两个页面，2:前三个页面。。。
                    rect: {
                        x: 0,
                        y: 0,
                        w: api.winWidth,
                        h: $($xapi.page_main)[0].offsetHeight
                    }, 
                    index: 0,
                    frames: $xapi.app_frames
                }, function (ret, err) {

                });
            }
            //本地保存，这样其他窗口也可以访问
            xapi.local_data('app_frames', $xapi.app_frames);
        }else{
            $xapi.app_frames = xapi.local_data('app_frames') || [];
        }
    }

    return {
        'init': function () {
            set_app_frames();

            if(xapi.in_web){
                xapi.init();
                return;
            }

            this.set_header();

            //监听事件
            $('[x-listener]').each(function () {
                var $this = $(this);
                var listeners = $this.attr('x-listener').split(','), listener_name, listener_func, arr, xdoeds = {};
                for(var i in listeners){
                    arr = listeners[i].split(':');
                    listener_name = xapi.utils.trim(arr[0]);
                    listener_func = xapi.utils.trim(arr[1]);
                    xapi.platform.add_apiready_dos(function () {
                        xapi.add_listener(listener_name, function(ret, err){
                            if(listener_func){
                                eval(listener_func + "();");
                                return;
                            }
                            //执行xx-get,xx-list,...
                            $this.x_run();
                        });

                        /*api.addEventListener({
                            name: listener_name
                        }, function(ret, err) {
                            if(listener_func){
                                eval(listener_func + "();");
                                return;
                            }

                            //执行xx-get,xx-list,...
                            $this.x_run();
                        });*/
                    });
                }
            });

            //绑定安卓的后退按钮事件 两秒内后退按钮点击两次 关闭应用
            var backSecond = 0;
            api.addEventListener({
                name: 'keyback'
            }, function(ret, err) {
                if(api.winName != 'root'){
                    xapi.platform.close_window();
                    return;
                }

                var curSecond = new Date().getSeconds();
                if (Math.abs(curSecond - backSecond) > 2) {
                    backSecond = curSecond;
                    api.toast({
                        msg: '连续按两次退出应用',
                        duration: 2000,
                        location: 'bottom'
                    });
                } else {
                    xapi.platform.close_window('root');
                    //api.closeWidget({
                    //    id: 'A6918489928546', //这里改成自己的应用ID
                    //    retData: {name:'closeWidget'},
                    //    silent:true
                    //});
                }
            });

            this.run_apiready_dos();

            xapi.init();
        },

        "set_header": function(){
            //$api.dom('#header h5').innerHTML = title;
        },

        'is_APICloud_enable':function(){
            if(typeof api == 'undefined' || typeof os == 'undefined'){
                xapi.debug('当前模式不支持APICloud');
                return false;
            }
            return true;
        },

        'apiready_dos': [],    //要在apiready中加入操作
        'add_apiready_dos': function (func) {
            this.apiready_dos.push(func);
        },
        'run_apiready_dos': function(){  //运行apiready
            for(var i in this.apiready_dos){
                this.apiready_dos[i]();
            }
        },

        //保存数据到本地
        'storage': function(key, value){
            if( xapi.in_web ){
                xapi.debug('storage:: api未加载', 'warning');
                return;
            }

            if(value || value === null){
                $api.setStorage(key, value);
                return true;
            }else{
                return $api.getStorage(key);
            }
        },

        //获得页面间传递的参数
        'page_param': function (name) {
            try {
                var data = api.pageParam.data;
                if(!data)return name ? '' : {};
                return name ? (data[name]||'') : data;
            }catch(error){
                //xapi.debug('无此page_param:' + name, 'warning');
            }
            
            return name ? '' : {};
        },

        'send_event': function(event_name, data){
            if(xapi.in_web){
                return;
            }

            api.sendEvent({
                name: event_name,
                extra: {
                    data:data||{},
                }
            });
        },

        'add_listener': function(event_name, callback){
            if(xapi.in_web){
                return;
            }

            api.addEventListener({
                name: event_name
            }, function(ret, err) {
                callback(ret, err);
            });
        },

        'toast': function(msg, duration, position){
            if( xapi.in_web ){
                alert(msg);
                return;
            }

            api.toast({
                msg: msg,
                duration: (duration||2000),
                location: position||'middle'
            });
        },
        /* 弹出提示信息 */
        'alert': function (msg, callback, title) {
            if(!msg) return;

            if( xapi.in_web ){
                alert(msg);
                if(callback){
                    callback();
                }
                return;
            }

            api.alert({
                title: title||'',
                msg: msg,
            }, function(ret, err) {
                if(callback){
                    callback();
                }
            });
        },
        'confirm': function(msg, callback_yes, callback_no, title, buttons){
            if( xapi.in_web ){
                if(confirm(msg)){
                    if(callback_yes)callback_yes();
                }else if(callback_no){
                    callback_no();
                }
                return;
            }

            api.confirm({
                title: title||'',
                msg: msg,
                buttons: buttons||['确定', '取消']
            }, function(ret, err) { 
                if(ret.buttonIndex == 1){
                    if(callback_yes){
                       callback_yes(); 
                    }
                }else{
                    if(callback_no){
                       callback_no(); 
                    }
                }
            });
        },

        /*窗口相关*/

        'jump': function (uri, data) {
            if( xapi.in_web ){
                return;
            }

            var index = null;
            uri = uri || 'index';
            if(uri == 'index')index = 0;
            else{
                for(var i in $xapi.app_frames){
                    if(uri == $xapi.app_frames[i].name){
                        index = i;
                        break;
                    }
                }
            }

            //没在frames中找到对应的菜单项
            if(index === null){
                return xapi.xopen(uri, data);
            }

            //切换样式
            api.execScript({
                name: 'root',
                script: "$xapi.main_menu_click('" + uri + "')"
            });

            //关闭到显示root窗口
            api.closeToWin({name:'root'});

            //执行跳转
            api.execScript({
                name: 'root',
                script: "api.setFrameGroupIndex({name:'group', scroll:true, index:" + index + "});"
            });
        },

        //打开窗口
        'open_window': function(uri, data, title){
            if( !xapi.platform.is_APICloud_enable() ){
                return;
            }

            //首页使用跳转
            if(uri == 'index'){
                return xapi.xjump(uri);
            }

            if(data && typeof data == 'string'){
                data = xapi.utils.query_string2json(data);
            }

            api.openWin({
                name: uri,
                url: xapi.fullpath(uri),
                pageParam: {        //todo 写死了
                    name:uri,
                    title:title,
                    data: data ? data : {}
                },
                rect: {
                    x: 0,
                    y: 0,
                    w: 'auto',
                    h: 'auto'
                }
            });

        },

        //关闭窗口
        'close_window': function(name){
            if(xapi.in_web)return;
            if(!name && api.winName == 'root'){
                xapi.debug('不能关闭主窗口', 'err');
                return;
            }
            api.closeWin(name ? {name:name} : '');
        },

        //加载更多
        'load_more':function(param){
            if( !xapi.platform.is_APICloud_enable() ){
                xapi.debug('load_more:: 请在手机上测试load more', 'warning');
                return;
            }

            var $elm, callback;
            if(typeof param == 'function'){
                callback = param;
                $elm = $();
            }else{
                $elm = $$(param);
            }

            if($elm.attr('_load_moreed'))return;

            var uuid = $elm.x_uuid();

            api.addEventListener({
                name: 'scrolltobottom',
                extra: {
                    threshold: 10 //设置距离底部多少距离时触发，默认值为0，数字类型
                }
            }, (function(uuid, callback) {
                return function (ret, err) {
                    if(callback){
                        callback();
                    }else{
                        var $element = xapi.get_by_uuid(uuid);
                        if($element.attr('x-loadmore')){
                            $element.attr('xx-list-old', $element.attr('xx-list')).attr('xx-list', $element.attr('x-loadmore'));
                        }
                        $element.xlist({"load_more":1});
                    }
                }
            })(uuid, callback));

            $elm.attr('_load_moreed', 1);
        },

        'show_progress': function(title, modal, text){
			if(xapi.in_web){
				return;
			}

            var options = {
                title: title||'',
                modal: modal || false,
            };
            if(text)options.text = text;
            api.showProgress(options);
        },
        'hide_progress': function(){
			if(xapi.in_web){
				return;
			}
            api.hideProgress();
        },

        //选择图片
        'photo':{
            'select': function(callback){
                this.photo_select(callback);
            },
            'pick': function(callback){
                this.photo_pick(callback);
            },
            'camera': function(callback){
                this.photo_camera(callback);
            }
        },

        "photo_select": function(callback){
            api.actionSheet({
                title: '上传图片',
                cancelTitle: '取消',
                buttons: ['拍照','从手机相册选择']
            }, function(ret, err) {
                if (!ret) {
                    $xapi.toast_err(JSON.stringify(err));
                }

                if(ret.buttonIndex == 1){
                    xapi.platform.photo_camera(callback);
                }else if(ret.buttonIndex == 2){
                    xapi.platform.photo_pick(callback);
                }
            });
        },

        //选择相片
        'photo_pick': function(callback){
            api.getPicture({
                sourceType: 'library',
                encodingType: 'jpg',
                mediaValue: 'pic',
                destinationType: 'base64',
                quality: 50,
                targetWidth: 750,
                targetHeight: 750
            }, function(ret, err) {
                if (!ret) {
                    $xapi.toast_err(JSON.stringify(err));
                }else{
                    callback(ret.base64Data);
                }
            });
        },

        //拍照
        'photo_camera': function(callback){
            api.getPicture({
                sourceType: 'camera',
                encodingType: 'jpg',
                mediaValue: 'pic',
                allowEdit: false,
                destinationType: 'base64',
                quality: 90,
                saveToPhotoAlbum: true
            }, function(ret, err) {
                if (!ret) {
                    $xapi.toast_err(JSON.stringify(err));
                }else{
                    callback(ret.base64Data);
                }
            });
        },

    };
})($_jQuery_Zepto);

$(function(){
    if(xapi.navigator.is_pc()){
        xapi.in_web = true;
        apiready();
    }else{
        xapi.in_web = false;
    }
});
