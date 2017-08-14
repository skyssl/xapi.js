$(document).ready(function(){
    $(document).on('change', '#pay_points,#user_money', function() {
        if ($('#user_money').val() !== '' || $('#pay_points').val() !== '') {
            $('#paypwd_view').show();
        } else {
            $('#paypwd_view').hide();
        }
    });
    $(document).on('click', '.radio .che', function () {
        //选择配送方式
        $(this).addClass('check_t')
            .parent().parent().siblings('label').find('.che').removeClass('check_t');
        //选择配送方式显示到支持配送栏
        $('#postname').text($(this).attr('postname'));
    });
});


function wield(obj){
    if($.trim($(obj).prev().val()) !=''){
        xapi.toast('正在计算金额...', 2);
        ajax_order_price(); // 计算订单价钱
    }
}

$(function(){
    //显示配送弹窗
    $(document).on('click', '.takeoutps', function(){
        $('.mask-filter-div').show();
        $('.losepay').show();
    });
    //关闭选择物流
    $(document).on('click', '.turenoff', function(){
        $('.mask-filter-div').hide();
        $('.losepay').hide();
    });

    $(document).on('click', '.submits_de', function(){
        $('.mask-filter-div').hide();
        $('.losepay').hide();
    });

    //显示隐藏使用发票信息
    $(document).on('click', '.invoiceclickin', function(){
        $('#invoice').toggle(300);
    });
})