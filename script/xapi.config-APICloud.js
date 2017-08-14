/**
    调用方式：$xapi.xxx();
*/

xapi_config = $.extend(xapi_config, {
	'page_main':'#main',
    'page_main_menu':'#footer_list',   //主菜单ID
    'main_menu_click': function(uri){ //主菜单点击事件，用于切换active
    	var $elm = $(this.page_main_menu).find('[xjump="' + uri + '"]');
    	$elm.addClass('active').siblings().removeClass('active');
    },
    'openFrameGroup_preload': 0, //默认预加载iframe个数，0:第一个页面(首页), 1:前两个页面，2:前三个页面。。。
});