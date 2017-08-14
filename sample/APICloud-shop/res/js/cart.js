var cart = (function(){

    var _uris = {
            'add':'Cart/add',
            'delete':'Cart/delete',
            'set_quantity':'Cart/set_quantity',
            'select':'Cart/select',
    };

    function _cal_total_price() {
        //计算总价
        var total_price = 0;
        $('.orderlistshpop').each(function(){
            if( !$(this).find('input.cart_select').attr('checked') ){
                return;
            }
            var $input = $(this).find('input.input-num');
            total_price += ($input.val()||0) * 1 * ($input.attr('data-price')||0) * 1;
        });
        $('#cartsum').text(total_price.toFixed(2));
    }

    function do_select()
    {
        var data = {selected:[], unselected:[]};
        $("input.cart_select").each(function(){
            if(this.checked)data.selected.push( $(this).attr('data-id') );
            else data.unselected.push( $(this).attr('data-id') );
        });
        xapi.post(_uris.select, {data:data}, function () {
            _cal_total_price();
        });
    }

    return {
        'uris': _uris,
        'init': function(){
            if($('input.cart_select[checked]').length == $('input.cart_select').length){
                $('.alllef .che').addClass('check_t');
            }
        },
        'add': function(goods_id, num, to_cart){
            var data = {goods_id:goods_id, goods_num:num};
            if($("#buy_goods_form").length > 0){
                data = $('#buy_goods_form').serialize();
            }
            xapi.post(this.uris.add, {data:data}, function(data){
                //直接购买
                if(to_cart){
                    xapi.xopen("cart/index");
                    return;
                }

                if($('#cart_count').length) {
                    var cart_num = parseInt($('#cart_count').text()||0) + data.num;
                    $('#cart_count').html(cart_num)
                }
                xapi.toast('成功加入购物车');
                xapi.send_event('cart_add');
            });
        },
        'delete': function(ids){
            var evt = window.event || arg.callee.caller.arguments[0]; // 获取event对象
            var src = evt.srcElement || evt.target; // 获取触发事件的源对象
            var $elm = src ? $(src) : null;
            xapi.post(this.uris.delete, {data:{ids:ids}}, function(){
                if($elm){
                    $elm.closest('.orderlistshpop').remove();
                    cart.cal_total_price();
                    if(!$('.orderlistshpop').length){
                        $('#cart_empty').show();
                    }
                }
            });
        },
        'chg_quantity': function (num, cart_id, store_count) {
            var old_num = parseInt($("input[name='goods_num["+cart_id+"]']").val());
            //加减数量
            var new_num = old_num + num;
            if(new_num < 1) new_num = 1;  // 保证购买数量不能少于 1
            if(new_num > store_count) { //保证 不超过库存
                xapi.toast("库存只有 "+store_count+" 件, 你只能买 "+store_count+" 件");
                new_num = store_count; // 保证购买数量不能多余库存数量
            }
            $("input[name='goods_num["+cart_id+"]']").val(new_num);
            var data = {id:cart_id, quantity:new_num};
            var cart = this;
            xapi.post(this.uris.set_quantity, {data:data}, function () {
                cart.cal_total_price();
            }, function(result){
                xapi.toast(result.error_msg);
                $("input[name='goods_num["+cart_id+"]']").val(old_num);
            });
        },
        'cal_total_price': _cal_total_price,
        'select': function (obj) {
            var selected = 1;
            if($(obj).hasClass('check_t')){
                //改变颜色
                $(obj).removeClass('check_t');
                //取消选中
                $(obj).find('input').attr('checked',false);
                selected = 0;
            }else {
                //改变颜色
                $(obj).addClass('check_t');
                //勾选选中
                $(obj).find('input').attr('checked',true);
            }

            do_select();
        },
        'select_all': function(){
            var selected = 1;
            //取消全选
            if($('.alllef .che').hasClass('check_t')){
                $('.alllef .che').removeClass('check_t');
                $('.inner .che').removeClass('check_t');
                //全部商品取消checked
                $("input.cart_select").prop('checked',false);
                selected = 0;
            }
            //全选
            else{
                $('.alllef .che').addClass('check_t');
                $('.inner .che').addClass('check_t');
                //全部商品添加checked
                $("input.cart_select").prop('checked',true);
            }

            do_select();
        }
    };

})();

