# xapi.js
xapi 让前端更简单

文档：  https://www.kancloud.cn/skyssl/xapi/374984

几个示例：
~~~
<div xx-get="user/index">
	头像：<img x="$hpic" />
	姓名： <span x="$name"></span> <br />
	年龄： <span x="$age"></span> <br />
	注册时间： <span x="$reg_date|xapi.utils.date(###)"></span> <br />
	电话： <span x="$mobile|'###'.substr(0,7)+'xxxx"></span> <br />
	角色列表(循环)：
		<span>
    		    <p xx-list="$roles" x-var="item">{$item.name}	
            	</p>
    </span>
</div>
~~~

~~~
<ul xx-list="goods/list" x-var="item" x-data="catid=@page_param.catid">
	<li>
    		<a href="goods_detail.html?id={$item.id}">
    			<img x="$item.thumb">
            	<span x="$item.goods_name"></span>
                ￥<span x="$item.price"></span>
            </a>
    </li>
</ul>
~~~
