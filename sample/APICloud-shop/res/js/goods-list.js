//############   点击多选确定按钮      ############
        // t 为类型  是品牌 还是 规格 还是 属性
        // btn 是点击的确定按钮用于找位置

        //确定按钮
        $(document).on('click', '.suce_ok', function(){
            undercover();
            $('.screen_wi').hide();
            $('.two-related').hide();
        });
        
        //返回按钮
        $(document).on('click', '.seac_retu', function(){
            //判断当前二级筛选状态
            if($('.suce_ok').is('.two')){
                $(".filterspec").each(function(i,o){
                    //去掉全部选择
                    $(o).find('.fr input').attr('checked',false);
                });
                $('#key').removeAttr('class');
                //显示一级筛选
                $('.screen_wi,.popcover,.one-related').show();
                $('.two-related').hide();
                $('.sx_jsxz').html('筛选');
                $('.suce_ok').removeClass('two');
            }else{
                $('.screen_wi').animate({width: '0', opacity: 'hide'}, 'normal',function(){
                    undercover();
                    $('.screen_wi').hide();
                });
            }
        });

    //筛选弹窗的品牌筛选
    function filtercriteria(criteria,id){
        $('#key').addClass(criteria).val(id);
        $('.filter').each(function(i,o){
            if($(o).attr('data-id') == id){
                $(o).show();
            }else{
                $(o).hide();
            }
        });
        $('.tow-price').hide();
        //$('.catearr').hide();
    }


    //筛选弹窗的价格筛选
    function filterprice(){
        $('.tow-price').show();
        $('.tow-price[_x-is_tpl]').hide();
        $('.filter').hide();
    }

    //筛选菜单栏切换效果
    var lb = $('.search_list_dump .lb')
    var fil = $('.fil_all_comm');
    var cs = $('.classreturn,.search_list_dump');
    var son = $('.search_list_dump .jg').siblings();
    $(function(){

        $(document).on('click', '.storenav ul li span', function(){

            $(this).parent().parent().addClass('red').siblings('li').removeClass('red')
            if(!$(this).hasClass('lb')){
                fil.hide();
                undercover();
                cs.removeClass('pore');
            }
            if(!$(this).hasClass('jg')){
                son.removeClass('bpr1');
                son.removeClass('bpr2');
            }

        });

        //综合
        $(document).on('click', '.search_list_dump .lb', function(){
            $('.fil_all_comm').show();
            cover();
            $('.classreturn,.search_list_dump').addClass('pore');
        });

        lb.html($('.on').html());

         //显示隐藏筛选弹窗
         $(document).on('click', '.search_list_dump .sx', function(){
            $('body').css('position','relative');
            $('.screen_wi').animate({width: '14.4rem', opacity: 'show'}, 'normal',function(){
                $('.screen_wi').show();
                $('.popcover').show();
                $('.one-related').show();
                cover();
            });
         });

        //  筛选顶部 筛选1-popcover
        $(document).on('click', '.popcover ul li span', function(){
            //给span添加样式，并给其子代input添加class
            $(this).addClass('ch_dg').find('input').addClass('sel');
            $(this).parent('li').siblings('li').find('span').removeClass('ch_dg')
                    .find('input').removeClass('sel');
        });

        // 一级筛选条件筛选2-one-related
        $('.one-related .myorder .order').click(function(){
            $('.two-related').show();
            $('.suce_ok').addClass('two');
            $('.tow-price,.one-related,.popcover').hide();
            $('.sx_jsxz').html($(this).find('.fl span').text());
        });

        //筛选3-two-related
        $(function(){
            $(document).on('click', '.two-related .myorder .order', function(){
                var mright = $(this).find('.fr i');
                var input = mright.find("input");
                mright.toggleClass('Mright');
                //改变复选框状态
                mright.hasClass('Mright') ? input.attr('checked',true) : input.attr('checked',false);

                //if( mright.hasClass('Mright') && $(this).parent().hasClass('btn-search') ){
                if( mright.hasClass('Mright') ){
                    $(this).closest('.myorder').siblings().find('.fr i').removeClass('Mright');
                }
            });
        })

        //切换商品排列样式
        $(document).on('click', '.listorimg', function(){
            $(this).toggleClass('orimg');
            $('#goods_list').toggleClass('addimgchan');
        });

        $(document).on('click', '.mask-filter-div', function(){
            $('.screen_wi').animate({width: '0', opacity: 'hide'}, 'normal',function(){
                listonly();                
            });
        });
    })

    function listonly(){
        $('.fil_all_comm').hide();
        $('.classreturn,.search_list_dump').removeClass('pore');

        $('.screen_wi').hide();
        undercover();
    }

    function attr_click(){
        $('.two-related').show();
        $('.suce_ok').addClass('two');
        $('.tow-price,.one-related,.popcover').hide();
        $('.sx_jsxz').html($(this).find('.fl span').text());
    }

    $('.btn-search').click(function(){
        var $li = $(this).closest('li');
        if($li.x_has_attr('data-sort-asc')){
            if($li.attr('data-sort-asc') == 'asc'){
                $li.attr('data-sort-asc', 'desc');
                $li.find('i')[0].className = 'pr  bpr1';
            }else{
                $li.attr('data-sort-asc', 'asc');
                $li.find('i')[0].className = 'pr  bpr2';
            }
        }

        $('.btn-search').parent().removeClass('red');

        if($(this).closest('.fil_all_comm').length){
            $li = $('.search_list_dump .lb').parent();
            $(this).parent().siblings().find('a').removeClass('on red');
            this.className = 'on red';
            $li.attr('x-data', $(this).attr('x-data')).addClass('red');
            $li.find('span').text(this.text);
            listonly();
        }else{
            $li.addClass('red');
            $('.fil_all_comm a').removeClass('on red');
        }
    });