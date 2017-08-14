xapi.render = (function($){
    "use strict";

    var css__lp_item = '_lp_item',
        css_note_empty = '_note_empty',
        all_tpls = {};  //循环模板用后即删，在此保存所有模板

    var PARENT_DATA = {};

    function data_add_key(data, varname){
        if(!varname)return data;

        var tmp = {};
        tmp[varname] = data;
        data = tmp;
        tmp = null;
        return data;
    }

    function is_repeat_self($element){
        if($element.x_has_attr('x-target'))return false;
        return $element.x_has_attr('x-repeat-self') || $element.is('li') || $element.is('table') || $element.is('tr');
        /*
        if(!repeat_self){
            if( ( _page <= 1 ) && $el.children().length > 1){
                //xapi.debug('请指定x-repeat-self标签，或保证container下只有一个子元素', 'err');
                return;
            }
        }*/
    }

    function loop_tpl(element, $container) {
        var $element = $$(element),
            uuid = $element.x_uuid();

        var $loop_tpl = all_tpls[uuid];
        if($loop_tpl){
            return $loop_tpl;
        }

        var repeat_self = is_repeat_self($element);

        if(repeat_self){
            $loop_tpl = $element;
        }else{
            if($container.children().length == 0){
                xapi.debug('没有子元素，无法获取循环体模板', 'err')
                return false;
            }

            $loop_tpl = $container.children().first();
        }

        $loop_tpl.x_is_tpl(1);
        all_tpls[ uuid ] = $loop_tpl.clone();

        return all_tpls[ uuid ];
    }

    //渲染一个列表
    function fetch_loop(element, data, container, load_more) {
        var $element = $$(element),
            $container = container ? $$(container) : null,
            _page = $element.x_page(),
            $loop_tpl, xvar, repeat_self = is_repeat_self($element),
            parent_onlyone_child;

        if(data && !(data instanceof Array)){
            xapi.debug('render::list:非预期的数据格式', 'err');
            return false;
        }

        if($element.attr('x-repeat-self')){
            if( $element.attr('x-target') ){
                xapi.debug('render::list:不能同时指定x-target和x-repeat-self');
                return false;
            }
            if( $element.attr('x-tpl') ){
                xapi.debug('render::list:不能同时指定x-tpl和x-repeat-self');
                return false;
            }
        }

        if(!$container){
            if( $element.attr('x-target') ){
                $container = $( $element.attr('x-target') );
                if($container.length == 0){
                    xapi.debug('render::list:没找到x-target指向的元素');
                    return false;
                }
                if($container.length > 1){
                    xapi.debug('render::list:x-target指向的元素不唯一');
                    return false;
                }
            }
        }

        if( $element.attr('x-tpl') ){
            $container = $container || $element;
            if($container.html().length > 0){
                xapi.debug('render::list:设置了x-tpl后, 请保持容器为空');
                return false;
            }
            $container.append( $($element.attr('x-tpl')) );
        }

        if(!$container){
            $container = repeat_self ? $element.parent() : $element;
        }

        $loop_tpl = loop_tpl($element, $container);
        if(!$loop_tpl || !$loop_tpl.length){
            xapi.debug('render::list:请指定循环体', 'err');
            return false;
        }

        //上级命令的数据，用于替换模板中的外部变量
        PARENT_DATA = $element.x_parent_command().x_api_data();

        if(!load_more){
            _init_list($element, $container);
            if(!repeat_self && $container.children().length > 1){
                xapi.debug('非自循环请保持内部只有一个子元素', 'err')
                return false;
            }
        }

        //暂存数据
        $element.x_api_data(data, true);

        var $first_element = repeat_self ? $element : $container.children().eq(0);

        //无数据时显示提示（要先运行$loop_tpl.hide()再退出）
        if(!data || !data.length){

            if(!load_more && !$first_element.hasClass(css__lp_item)){
                repeat_self ? $first_element.empty() : $first_element.remove();
            }

            if(!$element.attr('x-psize')){
                return;
            }

            if( !load_more ){
                var note = $element.x_has_attr('x-empty') ? $element.attr('x-empty') : $xapi.msg.empty;
            }else{
                var note = $element.x_has_attr('x-nomore') ? $element.attr('x-nomore') : $xapi.msg.nomore;
            }

            if(note.substr(0, 1) == '#' || note.substr(0, 1) == '.'){
                $( note ).show();
            }else{
                var $note = $container.find('.' + css_note_empty);
                if(!$note.length){
                    $note = $("<div style='text-align:center;clear:both;'></div>");
                    $container.append($note.addClass(css_note_empty));
                }
                $note.html(note).show();
            }

            if($element.x_nomore() && load_more){
                xapi.debug('已到最后一页.', 'log');
                return false;
            }

            return;
        }

        var replace_first = !load_more && !$element.x_has_attr('x-tpl');  // && $element.x_render_count() <= 0
        xvar = $element.attr('x-var');
        if(!xvar){
            xapi.debug('xx-list:为避免数据产生冲突，请设置x-var.', 'err');
            return false;
        }

        if(repeat_self){
            replace_first = replace_first && !$element.hasClass(css__lp_item);
        }else{
            replace_first = replace_first && $element.children().length && !$element.children().eq(0).hasClass(css__lp_item);
        }

        var loop_id = $element.x_uuid();

        for(var i in data){
            if(data[i] instanceof Array){
                xapi.debug('列表渲染不支持二维数组', 'err');
                return;
                /*
                var $subelm = $container.find('[xx-list]');
                if($subelm.length){
                    fetch_loop($subelm, data[i]);
                    continue;
                }else{
                    xapi.debug('列表渲染不支持二维数组', 'err');
                    return;
                }*/
            }

            if(typeof data[i] != 'object'){
                data[i] = {index:i, val:data[i]};
            }
            data[i].__i = i;

            var $loop_item = $loop_tpl.clone();
            $loop_item.removeAttr('xx-list').removeAttr('x-psize')
                 .removeAttr('x-data').removeAttr('x-var').removeAttr('x-repeat-self').removeAttr('_x-render_count')
                 .x_is_command(0).x_uuid(true).x_is_tpl(0)
                 .addClass(css__lp_item);

            var $new_item = xapi.render.fetch_element($loop_item, data_add_key(data[i], xvar), {repl_self: true});
            if($new_item && $new_item.length){
                $new_item.attr('loop_id', loop_id).show();
                if(i == 0 && replace_first){
                    if(repeat_self){
                        $new_item.x_copy_attrs_from($element);
                        $element.replaceWith($new_item.removeClass(css__lp_item).show());
                    }else{
                        $container.children().first().replaceWith($new_item.show());
                    }
                }else{
                    if(repeat_self && $new_item.attr('id')){
                        $new_item.attr('id', $new_item.attr('id') + '-' + i);
                    }

                    if(repeat_self){
                        $("[loop_id='"+loop_id+"']").last().after($new_item);
                    }else {
                        $container.append($new_item);
                    }
                }
            }
        }

        $element.x_render_count(1);

        if( $element.attr('x-loadmore') && $element.attr('x-psize') ){
            if(!$element.x_page()){
                $element.x_page(1);
            }
            xapi.load_more($element[0]);
        }

        PARENT_DATA = {};
    }

    //重置一个列表
    function _init_list(element, container)
    {
        var $element = $$(element),
            $container = container ? $$(container) : null;

        $($element.attr('x-empty')).hide();
        $($element.attr('x-nomore')).hide();
        $element.find('.' + css_note_empty).hide();
        $element.x_nomore(0);

        ($container || $element).find('.' + css__lp_item).remove();
    }

    //渲染某个元素
    function fetch_element(element, data, option){
        var $element = $$(element);
        option = option || {};

        if(option.repl_self){
            var tname = 'div';
            if($element.is('tr'))
                tname = 'tbody';
            else if($element.is('li'))
                tname = 'ul';
            $element = $("<" + tname + ">" + $element[0].outerHTML + "</" + tname + ">");
        }

        if(!$element.length){
            xapi.debug('未找到元素');
            return false;
        }

        if($element.is('form')){
            _set_form_x($element);
        }

        if($element.attr('x-var')){
            data = data_add_key(data, $element.attr('x-var'));
        }

        //保存数据
        $element.x_api_data(data, true);

        //子循环，不能移到最后（两层循环的时候，内部的变量会被替换成同一值）
        $element.find('[xx-list]').each( function(){
            var v = $(this).attr('xx-list'), subdata = null;
            if(v.substr(0, 1) != '$'){
                return;
            }

            v = v.substr(1);
            try{
                eval("subdata=data." + v + ";");
            }catch(error){
                if($(this).parent().closest('[_x-is_command]').x_uuid() != $element.x_uuid()){
                    return;
                }
                xapi.debug("子循环data错误：" + v + " " + error, 'err');
                xapi.debug("data:" + json_stringify(data), 'err');
                xapi.debug("subdata:" + subdata, 'err');
                return;
            }
            if(!subdata)return false;

            fetch_loop(this, subdata);
            //$(this).remove();  //不能删除（非自循环会删除自身）
        } );

        //show
        $element.find('[x-show]').each(function () {
            var result = !!_expression_result($(this).attr('x-show'), data);
            $(this).removeAttr('x-show');
            if(result){
                $(this).css("display","block");
                //$(this).show();  //在css中设置了none时无效（如.orders a{display:none}）
            }else {
                $(this).css("display", "none");
            }
        });
        //checked
        $element.find('[x-checked]').each(function () {
            var result = !!_expression_result($(this).attr('x-checked'), data);
            $(this).attr('checked', result).removeAttr('x-checked');
        });
        //selected
        $element.find('[x-selected]').each(function () {
            var result = !!_expression_result($(this).attr('x-selected'), data);
            $(this).attr('selected', result).removeAttr('x-selected');
        });
        //readonly
        $element.find('[x-readonly]').each(function () {
            var result = !!_expression_result($(this).attr('x-readonly'), data);
            $(this).attr('readonly', result).removeAttr('x-readonly');
        });

        var html_changed = false;

        //替换x
        $element.find("[x]").each(function(){
            var arr = $(this).attr('x').split("::"), vname, aname;
            if(arr.length == 1)vname = arr[0];
            else{
                aname = arr[0];
                vname = arr[1];
            }
            _assign_elm_x($(this), _parse_var( vname, data ), aname);
        });

        //替换{$xxx}
        var html = $element[0].innerHTML,
            vars = html.match(/(\{\$.*?\})/g);
        if(vars && vars.length > 0){
            for(var i in vars){
                var v = vars[i].substr(1).substr(0, vars[i].length-2);
                var r = _parse_var(v, data);
                if(r !== false){
                    html = html.replace(vars[i], _parse_var(v, data));
                }
            }
            html_changed = true;
        }

        //替换@page_param.
        var arr = html.match(/@page_param\.[\w\.]+/g);
        for(var i in arr){
            try{
                var v = eval( arr[i].replace('@page_param', 'xapi.page_param()') );
                html = html.replace(arr[i], v||'');
                html_changed = true;
            }catch(error){
                xapi.debug('取得页面传值' + arr[i] + '失败:' + error, 'err');
            }
        }

        //替换@local.
        var arr = html.match(/@local\.[\w\.]+/g);
        for(var i in arr){
            try{
                var v = eval( arr[i].replace('@local.', 'xapi.local_data("') + '")' );
                html = html.replace(arr[i], v||'');
                html_changed = true;
            }catch(error){
                xapi.debug('取得页面传值' + arr[i] + '失败:' + error, 'err');
            }
        }

        //替换@user.
        var arr = html.match(/@user\.[\w\.]+/g);
        for(var i in arr){
            try{
                var v = eval( arr[i].replace('@user.', 'xapi.user_data("') + '")' );
                html = html.replace(arr[i], v||'');
                html_changed = true;
            }catch(error){
                xapi.debug('取得页面传值' + arr[i] + '失败:' + error, 'err');
            }
        }

        //替换@logined
        html = html.replace(/@logined/g, xapi.is_login() ? 1 : 0);

        //替换xopen中的$
        var exp = /[xopen|xjump]=[\'\"].*?=\$[\w\.]+.*?[\'\"]/g, res;
        while( (res = exp.exec(html)) != null){
            var arr = res[0].match(/\$[\w\.]+/g), repl = res[0];  //有多个变量
            for(var i in arr){
                var v = _parse_var(arr[i], data);
                if(v !== false){
                    repl = repl.replace(arr[i], v||'');
                }
            }
            html = html.replace(res[0], repl);
            html_changed = true;
        }

        //替换{if(...)}...{endif}
        var exp = /\{if.*?\}([\s\S]*?)\{endif\}/g, res;
        while( (res = exp.exec(html)) != null){
            var express = res[0],
                ifresults = res[1].replace(/'/g, "\\'").replace(/"/g, '\\"'),
                arr = ifresults.split('{else}');

            for(var ii in arr){
                ifresults = ifresults.replace(arr[ii], '{"' + arr[ii].replace(/[\r\n]/g, "").replace(/\ {2,}/g,"") + '"}');
            }

            express = express.replace(res[1], ifresults)
                        .replace('{if', 'if')
                        .replace(')}', ')')
                        .replace('{else}', 'else').replace('{endif}', '')
                        .replace('$', 'data.');

            html = html.replace(res[0], _expression_result(express, data)||'');
            html_changed = true;
        }

        if(html_changed){
            $element[0].innerHTML = html;
        }

        //替换<if
        $element.find('if').each(function(){
            var arr = this.innerHTML.split('&lt;:else:&gt;'),
                result = !!_expression_result($(this).attr('condition'), data),
                repl_html;

            if(result){
                repl_html = arr[0];
            }else{
                repl_html = arr[1]||'';
            }

            $(this).after(repl_html).remove();
        });

        $element.show();

        if(option.repl_self){
            $element = $( $element.html() );
        }

        $element.x_render_count(1);
        return $element;
    }

    //解析模板变量:$info.created_at 或 $info.created_at|date,yyyy-mm-dd
    function _parse_var(src_var, data, is_parent_data){
        if(!src_var)return '';
        if(!data || xapi.utils.is_empty_object(data))return false;

        var str_var = src_var;
        var i = str_var.indexOf('|'), str_func = '', val = '';
        if(i != -1){
            str_func = str_var.substr(i + 1);
            if(!isNaN(str_func)){
                str_func = "def=" + str_func;
            }else if(str_func == 'date'){
                str_func = "xapi.utils.date(###, 'yyyy-MM-dd')";
            }else if(str_func == 'datetime'){
                str_func = "xapi.utils.date(###, 'yyyy-MM-dd hh:mm:ss')";
            }

            str_var = str_var.substr(0, i);
        }
        
        str_var = _replace_expression(str_var);

        try {
            val = eval(str_var + ";");
        }catch(error){
            //xapi.debug( "val = " + str_var + "; " + ' 取得x值失败： ' + error, 'warning');
            //xapi.debug( "data:" + JSON.stringify(data) );
            return is_parent_data ? false : _parse_var(src_var, PARENT_DATA, true);
        }

        //避免替换上级命令的变量
        if(val === undefined){
            return is_parent_data ? false : _parse_var(src_var, PARENT_DATA, true);
        }

        if(val == 'null')val = '';
        if(val === 0)val = '0';

        if(!val && val !== '0'){
            //默认值
            if(str_func.substr(0, 4) == 'def='){
                eval( str_func.replace('def', 'val') + ";");
                return val;
            }
        }

        if(!str_func || !val){
            return val || '';
        }

        var express = '';
        try{
            if(str_func.indexOf('###') == -1){
                /*if(str_func.charAt(str_func.length - 1) != ')'){
                    str_func = str_func + "()";
                }*/
                express = "val = val." + str_func + ";";
            }else{
                express = "val = " + str_func.replace('###', val) + ";";
            }
            eval(express);
        }catch(error){
            xapi.debug(str_var + ' >> ' + express + ' 解析x函数报错： ' + error, 'err');
        }

        return val;
    }

    function _set_form_x(form, vkey){
        var $form = $$(form);
        if(vkey)vkey += '.';
        else vkey = '';

        $form.find('input,select,textarea').each(function () {
            if(!this.name || $(this).attr('x') !== null)return;
            $(this).attr('x', "$" + vkey + this.name.replace('[]', ''));
        });
    }

    function _assign_elm_x($elm, val, attr){
        if(val === false)return;

        val = val || ($elm.attr('x-def')||'');

        if($elm.is("select")){
            $elm[0].value = val;
            return;
        }
        if($elm.is('input[type="radio"]')){
            if($elm.val() == val)
                $elm.attr('checked', true);
            return;
        }
        if($elm.is('input[type="checkbox"]')){
            if( xapi.utils.in_array($elm.val(), val) )
                $elm.attr('checked', true);
            return;
        }

        if(!attr){
            if($elm.is('img'))attr = 'src';
            else if($elm.is('input[type="text"]') || $elm.is('input[type="hidden"]'))attr = 'value';
            else if($elm.is('input[type="password"]'))attr = 'value';
            else if($elm.is('textarea'))attr = 'text';
            else attr = 'text';
        }

        if(attr == 'value')
            return $elm.val(val);
        if(attr == 'html' || attr == 'text')
            return $elm[attr](val);

        return $elm.attr(attr, val);
    }

    //解析表达式，todo
    function _replace_expression(expression, dataname)
    {
        dataname = dataname || 'data';
        expression = expression.replace(/\$/g, dataname + '.', expression);
        expression = expression.replace(/ eq /g, ' == ').replace(/ neq /g, ' != ')
                               .replace(/ gt /g, ' > ').replace(/ lt /g, ' < ')
                               .replace(/ ne /g, ' != ').replace(/ neq /g, ' != ')
                               .replace(/ ge /g, ' >= ').replace(/ gte /g, ' >= ')
                               .replace(/ le /g, ' <= ').replace(/ lte /g, ' <= ');
        return expression;        
    }

    function _expression_result(src_expression, data, is_parent_data) {
        //xapi.debug('解析表达式："' + src_expression + '"');
        var expression = _replace_expression(src_expression);

        try{
            return eval(expression);
        }catch(error){
            if(xapi.utils.is_empty_object(PARENT_DATA)){
                //找不到数据的错误不打印（可能是子循环模块的变量）
                if((error+'').indexOf('Cannot read property') == -1){
                    xapi.debug('表达式错误："' + expression + '" ' + error, 'err');
                }
                return null;
            }else{
                return is_parent_data ? null : _expression_result(src_expression, PARENT_DATA, true);
            }
        }
    }

    function set_default(element) {
        var $element = $$(element);

        $element.find('[x]').each( function () {
            _assign_elm_x($(this), $(this).attr('x-def') || '');
        } );

        /*
        var html = $element.html(), res, change;

        var exp = /\{\$.*?\|def=[\"\'](.*?)[\"\']\}/g;
        while( (res = exp.exec(html)) != null){
            html = html.replace(res[0], res[1]);
            change = true;
        }

        if(change){
            $element.html( html );
        }
        */
    }

    return {
        'fetch_element': fetch_element,
        'fetch_loop': fetch_loop,
        'init_list': _init_list,
        'set_default': set_default,
        'loop_tpl': loop_tpl,
    };
})($_jQuery_Zepto);


$.fn.render = function(data, container, load_more){
    if(data instanceof Array){
        xapi.render.fetch_loop(this, data, container, load_more);
    }else{
        xapi.render.fetch_element(this, data);
    }
}
$.fn.render_element = function(data){
    xapi.render.fetch_element(this, data);
}
$.fn.render_loop = function(data, container){
    xapi.render.fetch_loop(this, data, container);
}
$.fn.set_default = function(){
    xapi.render.set_default(this);
}
/*
$.fn.x_tpl = function(){
    return xapi.render.loop_tpl(this);
}
*/