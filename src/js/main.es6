window.onload = function(){
    let imgs = document.getElementsByTagName('img'),
        demo = document.getElementById('demo'),
        imgs = [imgs[1],imgs[2]],
        searchImg = new SearchImg(...imgs,{
            sampleSize:10,   // 默认：8，取样像素大小，取样越大越耗费性能，但匹配的精度也会越高
            similarity:0.95  // 默认：0.95，表示只返回相似度高于95%的结果（值越小返回的相似结果可能就越多）
        }),
        searchResult = searchImg.search();
    
    // 绘制搜索结果
    demo.innerHTML = '';
    imgs.forEach((item,index)=>{
        let width = item.width,
            height = item.height,
            canvasObj = searchImg.createCanvas(width,height),
            ctx = canvasObj.ctx;
        ctx.drawImage(item,0,0,width,height);

        // 在第一张图片绘制搜索到的区域
        if(index === 0){
            // 绘制遮罩层，以突出结果框
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.rect(0,0,width,height);
            ctx.fill();

            // 圈出搜索到的结果
            ctx.lineWidth = 4;
            ctx.strokeStyle = 'rgba(255,0,255,0.8)';
            searchResult.forEach(item => {
                ctx.strokeRect(item.x,item.y,imgs[1].width,imgs[1].height);
            });
        };

        demo.appendChild(canvasObj.dom);
    });
    
    console.log('搜索结果',searchResult);
    // console.log(searchImg);
};