/*
 语法 < input dta-v="require,mobile,len:5-10,eq_password/^\w+$/g"
        data-label="手机号"
        data-vmsg-comm="手机号格式错误"   //自定义一般错误信息，指定了data-label可不指定该项
        data-vmsg-require="手机号不能为空"    //自定义为空错误信息，指定了data-label和data-validator-msg-comm可不指定该项
       >

 dta-v 可选参数：
    require 必填
    mobile 数据类型，目前支持的有：mobile,email, number,int,letter_int,username,chinese,qq,phone,id_number
    len:5-10 长度, 固定5位：len(5), 最少5位:len(5-), 最多5位：len(-5), 5-10位：len(5-10)
    eq:xxx 值要 == xxx 当不为数字，将匹配<input name="xxx">的值，如没找到对应元素，则直接取该字符串, 下同
    lt:xxx 值要 < xxx
    gt:xxx 值要 > xxx
    elt:xxx 值要 <= xxx
    egt:xxx 值要 >= xxx
    /xxxx/ 正则表达式
 */
xapi.validator = (function($){
    "use strict";

    var $data_types = {
        'number': '^[0-9]+\\.{0,1}[0-9]{0,2}$',  //整数或两位的小数
        'int': '^[0-9]*$',  //数字
        'letter_int': '^[a-zA-Z0-9]*$',  //英文&数字
        'username':'^[a-zA-Z][a-zA-Z0-9_]{4,15}$',
        'chinese': '^[\\u4e00-\\u9fa5]{0,}$',
        'email': '^\\w+([-+.]\\w+)*@\\w+([-.]\\w+)*\\.\\w+([-.]\\w+)*$',
        'qq':'^[1-9][0-9]{4,}$',
        'url': '^http://([\\w-]+\\.)+[\\w-]+(/[\\w-./?%&=]*)?$',
        'phone': '^(\\(\\d{3,4}-)|\\d{3.4}-)?\\d{7,8}$',  //正确格式为："XXX-XXXXXXX"、"XXXX-XXXXXXXX"、"XXX-XXXXXXX"、"XXX-XXXXXXXX"、"XXXXXXX"和"XXXXXXXX"。
        'mobile': '^(((13[0-9]{1})|(15[0-9]{1})|(18[0-9]{1}))+\\d{8})$',
        'id_number': '^\\d{15}|\\d{18}$'  //身份证
    };

    var $labs = {
        'username': '用户名',
        'password': '密码',
        'mobile': '手机号',
        'sex': '性别'
    };

    function form(form){
        var $form = $$(form),
            pass = false,
            kname = 'data-v',
            $validators = $form.find('['+kname+']');

        $validators.each(function(){
            if(!(pass = check(this, kname))){
                return false;
            }
        });

        return pass;
    }

    function check(elm, kname) {
        var arr = ($(elm).attr(kname)).split(',');
        if(!arr.length){
            return true;
        }

        for(var i in arr){
            var t = arr[i].substr(0, 3);

            //必填
            if(arr[i] == 'require' || arr[i] == 'required'){
                if(!check_require(elm))
                    return false;
            }
            //长度
            else if(arr[i].substr(0, 4) == 'len:'){
                if(!check_length(elm, arr[i].substr(4)))
                    return false;
            }
            //比较值
            else if(t == 'eq:' || t == 'gt:' || t == 'lt:'){
                if(!check_compare(elm, arr[i].substr(0, 2), arr[i].substr(3)))
                    return false;
                //正则
            }else if(arr[i].substr(0, 1) == '/'){
                if(!check_reg(elm, arr[i]))
                    return false;
            }else {
                if (!check_dtype(elm, arr[i])) {
                    return false;
                }
            }
        }

        return true;
    }

    function check_require(elm){
        var is_empty = false;
        if($(elm).is('input[type="text"]') || $(elm).is('input[type="password"]') || $(elm).is('select')){
            is_empty = (elm.value === '');
        }else{
            var name = $(elm).attr('name');
            is_empty = $("input[name='"+name+"']:checked").length == 0;
        }

        if( is_empty ){
            show_error( elm, 'empty' );
        }

        return !is_empty;
    }

    function check_length(elm, exp_len){
        var vlen = elm.value.length,
            arr = exp_len.split('-');

        if(arr[0]){
            if(vlen < arr[0]){
                show_error( elm, 'min_len', arr[0] );
                return false;
            }
        }
        if(arr[1]){
            if(vlen > arr[1]){
                show_error( elm, 'max_len', arr[1] );
                return false;
            }
        }

        return true;
    }

    function check_compare(elm, op, cval){
        var ops = {
            "eq": "==",
            "lt": "<",
            "gt": ">",
            "elt": "<=",
            "egt": ">=",
        };

        if(!ops[op])return true;

        if(isNaN(cval)){
            var input = $('input[name="'+cval+'"]').eq(0);
            if(input.length){
                cval = input.val();
            }
        }

        cval *= 1;
        var evalue = elm.value * 1,
            express = "evalue " + ops[op] + " cval;";

        try {
            var pass = eval(express);
        }catch (err){
            xapi.debug('validator: ' + express, 'err');
            return false;
        }

        if(!pass){
            show_error( elm, op, ops[op] + cval );
        }

        return pass;
    }

    function check_reg(elm, reg)
    {
        if(elm.value) {
            var regexp = new RegExp(reg);
            if (!regexp.test(elm.value)) {
                show_error(elm, 'common');
                return false;
            }
        }

        return true;
    }

    function check_dtype(elm, dtype){
        if(!elm.value)return true;

        var handler = $data_types[dtype], pass = true;
        if(!handler){
            alert('error:: 非法的类型：' + dtype);
            return false;
        }

        if(typeof(handler) == 'function'){
            pass = handler(elm.value);
        }else{
            var regexp = new RegExp( handler );
            pass = regexp.test(elm.value);
        }

        if(!pass){
            show_error(elm, 'data_type');
        }

        return pass;
    }

    function show_error(elm, type, param){
        var errors = {
            "common":"请输入正确的$label",
            "empty":"$label不能为空",
            "data_type":"$label格式有误.",
            "compare":"$label大小有误("+param+").",
            "min_len":"$label值太短(最少"+param+"位)",
            "max_len":"$label值太长(最多"+param+"位)",
        };

        var $elm = $(elm),
            msg = $elm.attr('data-vmsg-' + type);  //对不同类型自定义的错误提示
        if(!msg){
            var label = $elm.attr('data-lab');
            if(!label && ($elm.is("input[type=checkbox]") || $elm.is("input[type=radio]"))){
                label = $('input[name="'+$elm.attr('name')+'"][data-lab]').attr('data-lab');
            }
            label = label || ($labs[elm.name] || elm.name);

            msg = (label && errors[type]) ? errors[type].replace('$label', label) : $elm.attr('data-vmsg-comm');
            if(!msg && errors[type]){
                msg = errors[type].replace('$label', elm.name);
            }

            msg = msg ? msg : label + '格式有误';
        }

        $xapi.form_validator_fail_alert(msg);
    }

    return {
        'form': form,
        'check': check
    };
})($_jQuery_Zepto);
