/**
     * 点击收藏商品
     */
    function collect_goods(goods_id){
        $.ajax({
            type : "GET",
            dataType: "json",
            url:"/index.php?m=Home&c=goods&a=collect_goods&goods_id="+goods_id,//+tab,
            success: function(data){
                layer.open({content:data.msg, time:2});
                if(data.status == '1'){
                    //收藏点亮
                    $('.de_font .keep').find('i').addClass('red');
                }
            }
        });
    }

    //将选择的属性添加到已选
    function sel(){
        var residuenum = parseInt($('.num').attr('residuenum'));
        var title ='';
        $('.choicsel').find('a').each(function(i,o){   //获取已选择的属性，规格
            if ($(o).hasClass('red')) {
                title += $(o).attr('title')+'&nbsp;&nbsp;';
            }
        })
        var num = $('.num').val();
        if(num > residuenum ){
            layer.open({content:'当前商品最多可购买'+residuenum+'件',time:2})
            num = residuenum;
        }
        var sel = title+'&nbsp;&nbsp;'+num+'件';
        $('.sel').html(sel);
    }

    /**
     * 加减数量
     * n 点击一次要改变多少
     * maxnum 允许的最大数量(库存)
     * number ，input的id
     */
    function altergoodsnum(n){
        var num = parseInt($('#number').val());
        var maxnum = parseInt($('#number').attr('max'));
        num += n;
        num <= 0 ? num = 1 :  num;
        if(num >= maxnum){
            $(this).addClass('no-mins');
            num = maxnum;
        }
        $('#store_count').text(maxnum-num); //更新库存数量
        $('#number').val(num)
    }
    //页面加载后执行

    function after_render(data, $elm){
        api_data = data;
        $('#slideTpshop').find('li').eq(0).remove();
        slide();

        /**
         * ajax请求购物车列表
         */
        /*var cart_cn = getCookie('cn');
        if(cart_cn == ''){
            $.ajax({
                type : "GET",
                url:"/index.php?m=Home&c=Cart&a=header_cart_list",//+tab,
                success: function(data){
                    cart_cn = getCookie('cn');
                }
            });
        }
        $('#tp_cart_info').html(cart_cn);*/

        /**
         * 查看商品详情
         */
        $('.seedeadei').click(function(){
            $('.xq_details').eq(0).hide();
            $('.xq_details').eq(1).show();
            $('body').animate({ scrollTop: 0 }, 0);
            $('.detail').find('.center').find('span').eq(1).addClass('sxp');
            $('.detail').find('.center').find('span').eq(0).removeClass('sxp');
        })

        /**
         * 评论
         */
        $('.tbv').click(function(){
            $('.xq_details').eq(0).hide();
            $('.xq_details').eq(2).show();
            $('body').animate({ scrollTop: 0 }, 0);
            $('.detail').find('.center').find('span').eq(2).addClass('sxp');
            $('.detail').find('.center').find('span').eq(0).removeClass('sxp');
            $('.gizle').show();
        })

        //点赞
        function hde(){
            setTimeout(function(){
                $('.alert').hide();
            },1200)
        }

        /**
         * 已选
         */
        $('.choise_num').click(function(){
            cover();
            $('.choose_shop_aready').show();
            $('.podee').hide();
        })

        //关闭属性选择
        $('.xxgro').click(function(){
            undercover();
            $('.choose_shop_aready').hide();
            $('.podee').show();
            sel();
        })

        /**
         * 规格选择
         */
        $('.choic-sel a').click(function(){
            //切换选择
            $(this).addClass('red').parent().siblings().find('a').removeClass('red');
        });
        $('#buy_goods_form .choicsel').each(function() {
            // 先默认每组的第一个单选按钮添加样式
            $(this).find('a').eq(0).addClass('red');
            sel();
        });

        /**
         * 顶部导航切换
         */
        $('.detail .search span').click(function(){
            $(this).addClass('sxp').siblings().removeClass('sxp');
            var a = $('.detail .search span').index(this);
            $('.xq_details').eq(a).show().siblings('.xq_details').hide();
            $('.xq_details').eq(2).show();
            if($('.detail .search span').eq(2).hasClass('sxp')){
                $('.comment_de').show();
            }else{
                $('.comment_de').hide();
            }
            if($('.detail .search span').eq(1).hasClass('sxp')){
                $('.tab-con-wrapper').hide();
                $('.comment_con').hide();
            }else{
                $('.tab-con-wrapper').show();
                $('.comment_con').show();
            }
        });

        /**
         * 内部导航切换
         */
        $('.spxq-ggcs ul li').click(function(){
            $(this).addClass('red').siblings().removeClass('red');
            var sg = $('.spxq-ggcs ul li').index(this);
            $('.sg').eq(sg).show().siblings('.sg').hide();
        });

        /**
         * 内部导航随鼠标滑动显示隐藏
         */
        var h1 = $('.detail').height();
        var h2 = $('.detail').height() + $('.spxq-ggcs').height();
        var ss = $(document).scrollTop();//上一次滚轮的高度
        $(window).scroll(function(){
            var s = $(document).scrollTop();////本次滚轮的高度
            if(s< h1){
                $('.spxq-ggcs').removeClass('po-fi');
            }if(s > h1){
                $('.spxq-ggcs').addClass('po-fi');
            }if(s > h2){
                $('.spxq-ggcs').addClass('gizle');
                if(s > ss){
                    $('.spxq-ggcs').removeClass('sabit');
                }else{
                    $('.spxq-ggcs').addClass('sabit');
                }
                ss = s;
            }
        });

        //在已选栏中显示默认选择属性，数量
        sel();

        /**
         * 更新商品价格
         */
        get_goods_price();

    }
//完


    function switch_spec(spec)
    {
        $(spec).siblings().removeClass('hover');
        $(spec).addClass('hover');
        $(spec).siblings().children('input').prop('checked',false);
        $(spec).children('input').prop('checked',true);
        //更新商品价格
        get_goods_price();
    }

    function get_goods_price()
    {
        var goods_price = api_data.goods.shop_price; // 商品起始价
        var store_count = api_data.goods.store_count || 0; // 商品起始库存
        var spec_goods_price = api_data.spec_goods_price || {};  // 规格 对应 价格 库存表   //alert(spec_goods_price['28_100']['price']);
        // 优先显示抢购活动库存
        // 如果有属性选择项
        if(spec_goods_price != null && spec_goods_price !='')
        {
            goods_spec_arr = new Array();
            $("input[name^='goods_spec']:checked").each(function(){
                goods_spec_arr.push($(this).val());
            });
            var spec_key = goods_spec_arr.sort(sortNumber).join('_');  //排序后组合成 key
            goods_price = spec_goods_price[spec_key]['price']; // 找到对应规格的价格
            store_count = spec_goods_price[spec_key]['store_count']; // 找到对应规格的库存
        }
        var goods_num = parseInt($("#goods_num").val());
        // 库存不足的情况
        if(goods_num > store_count)
        {
            goods_num = store_count;
            alert('库存仅剩 '+store_count+' 件');
            $("#goods_num").val(goods_num);
        }
        $('#store_count').html(store_count);    //对应规格库存显示出来
        $('#number').attr('max',store_count); //对应规格最大库存
        $("#goods_price").html('<span>￥</span><span>'+goods_price+'</span>'); // 变动价格显示
        $("#price").html('￥'+goods_price+'元'); // 变动价格显示

    }
    function sortNumber(a,b)
    {
        return a - b;
    }
    //运费
    $(function(){
        $('.remain').click(function(){
            $('#balance').toggle(300);
        })
        $('#balance').on('click','a',function(){
            $('#shipping_freight').text($(this).find('span').text());
            $('#balance').toggle(300);
        })
    })

    function locationaddress(e){
        $('.container').animate({width: '14.4rem', opacity: 'show'}, 'normal',function(){
            $('.container').show();
        });
        if(!$('.container').is(":hidden")){
            $('body').css('overflow','hidden')
            cover();
            $('.mask-filter-div').css('z-index','9999');
        }
    }
    function closelocation(){
        var province_div = $('.province-list');
        var city_div = $('.city-list');
        var area_div = $('.area-list');
        if(area_div.is(":hidden") == false){
            area_div.hide();
            city_div.show();
            province_div.hide();
            return;
        }
        if(city_div.is(":hidden") == false){
            area_div.hide();
            city_div.hide();
            province_div.show();
            return;
        }
        if(province_div.is(":hidden") == false){
            area_div.hide();
            city_div.hide();
            $('.container').animate({width: '0', opacity: 'show'}, 'normal',function(){
                $('.container').hide();
            });
            undercover();
            $('.mask-filter-div').css('z-index','inherit');
            return;
        }
    }