/**
 * 将图片数据转为灰色
 * @param {ImageData} imgData 
 * @return ImageDatta
 */
const toGray = imgData => {
    var data = imgData.data;
    for(var i = 0,n = data.length;i < n;i += 4){
        let gray = parseInt((data[i] * 30 + data[i+1] * 59 + data[i+2] * 11) / 100);
        // let gray = parseInt((data[i] + data[i+1] + data[i+2]) / 3);
        data[i + 2] = data[i + 1] = data[i] = gray;
    };
    return imgData;
};

/**
 * 创建二维数组对象
 */
class Matrix{
    constructor(row,col,val){
        this.row = row;
        this.col = col;
        this.data = (()=>{
            let result = [];
            for(let i=0; i<col; i++){
                result.push(new Array(row).fill(val));
            };
            return result;
        })();
    }
    set(x,y,val){
        this.data[y][x] = val;
    }
    get(x,y){
        return this.data[y][x];
    }
    forEach(fun){
        const _ts = this,
            data = _ts.data;
        for(let i=0,len=data.length; i<len; i++){
            let item = data[i];
            for(let _i=0,_len=item.length; _i<_len; _i++){
                fun.call(_ts,item[_i],{x:_i,y:i});
            };
        };
    }
    diff(hash){
        const _ts = this;
        if(_ts.row !== hash.row || _ts.col !== hash.col){
            throw new Error('对比的指纹大小不一致');
        };

        // 遍历指纹得到相同树
        let same = (()=>{
            let result = 0;
            _ts.forEach((item,pos)=>{
                if(hash.get(pos.x,pos.y) === item){
                    result++;
                };
            });
            return result;
        })(),
        sum = _ts.row * _ts.col;

        // 返回结果
        return {
            same:same,
            notSame:sum - same,
            similar:same / (_ts.row * _ts.col)
        };
    }
}

class SearchImg{
    constructor(img1,img2,option){
        const _ts = this;
        option = option || {};
        _ts.option = {
            sampleSize:8,
            similarity:0.95
        };
        for(let key in option){
            _ts.option[key] = option[key];
        };
        _ts.img1 = img1;
        _ts.img2 = img2;


        let array2Size = _ts.option.sampleSize;
        _ts.hash = [
            new Matrix(array2Size,array2Size * 2,0),
            new Matrix(array2Size,array2Size * 2,0)
        ];

        _ts.domCtxObj = (()=>{
            let result = [],
                img1ScaleSize = _ts.getScaleSize(_ts.img1),
                img2ScaleSize = _ts.getScaleSize(_ts.img2);
            
            result.push(_ts.createCanvas(img1ScaleSize.w,img1ScaleSize.h));
            result.push(_ts.createCanvas(img2ScaleSize.w,img2ScaleSize.h));

            result.forEach((item,index) => {
                let width = item.dom.width,
                    height = item.dom.height,
                    img = index === 0 ? _ts.img1 : _ts.img2;
                // // 擦除画布
                // item.ctx.clearRect(0,0,width,height);
                
                // 绘制图片
                item.ctx.drawImage(img,0,0,width,height);

                // 褪色
                item.ctx.putImageData(
                    toGray(item.ctx.getImageData(0,0,width,height)),
                    0,
                    0
                );
            });
            return result;
        })();
    }

    search(){
        const _ts = this,
            option = _ts.option,
            sampleSize = option.sampleSize,
            similarity = option.similarity;
        let result = [],
            dom1 = _ts.domCtxObj[0].dom,
            ctx1 = _ts.domCtxObj[0].ctx,
            data1,
            hash1,
            dom2 = _ts.domCtxObj[1].dom,
            ctx2 = _ts.domCtxObj[1].ctx,
            data2 = ctx2.getImageData(0,0,dom2.width,dom2.height).data,
            hash2 = _ts.echoHash(data2,_ts.hash[1]);
        
        // 只生成一次指纹，用于调试
        // data1 = ctx1.getImageData(0,0,dom2.width,dom2.height).data;
        // hash1 = _ts.echoHash(data1,_ts.hash[0]);
        // let diff = hash1.diff(hash2);
        // console.log(diff,hash1);
        // return;

        for(let i=0,len=dom1.width * dom1.height; i<len; i++){
            let x = i % dom1.width,
                y = ~~(i / dom1.width);

            // 每行的最后几个像素不需要检查
            if(x >= (dom1.width - sampleSize) || y >= (dom1.height - sampleSize)){
                continue;
            };

            data1 = ctx1.getImageData(x,y,dom2.width,dom2.height).data;
            hash1 = _ts.echoHash(data1,_ts.hash[0]);

            // 得到对比结果
            let diff = hash1.diff(hash2);

            // 如果对比结果的相似度大于传入的相似度，则返回结果
            if(diff.similar > similarity){
                diff.x = x;
                diff.y = y;
                if(result.length === 0){
                    result.push(diff);
                }else{
                    // 得到最后一个结果，用于判断本次相似度是否高于上次的结果
                    let last = result[result.length - 1];

                    // 当得到的结果偏移大于采样比，则说明是获取一个新的结果位置
                    if(Math.abs(x - last.x) >= sampleSize && Math.abs(y - last.y) >= sampleSize){
                        result.push(diff);
                    }
                    // 对比相似度大于上次取到的相似度，则将上次的结果移除，并添加新的结果
                    else if(diff.similar > last.similar){
                        result.pop();
                        result.push(diff);
                    };
                };
            };   
        };

        // 从获取的位置按其缩小比例还原真实坐标
        for(let i=0,len=result.length; i<len; i++){
            let item = result[i];
            item.x = Math.round(item.x / _ts.scaleW);
            item.y = Math.round(item.y / _ts.scaleH);
        };
        return result;
    }


    // 生成
    echoHash(data,hash){
        const _ts = this,
            option = _ts.option;
        let sampleSize = option.sampleSize;

        // 创建样本指纹（均值hash算法）
        let mean = (()=>{
            let result = 0;
            for(let i=0,len=data.length; i<len; i+=4){
                result += data[i];
            };
            return result / (data.length / 4);
        })();

        for(let i=0,len=data.length; i<len; i+=4){
            let x = i / 4 % sampleSize,
                y = ~~(i / 4 / sampleSize);
            if(data[i] > mean){
                hash.set(x,y,1);
            }else{
                hash.set(x,y,0);
            };
        };
        
        // // 创建样本指纹（差异hash算法）
        // for(let i=0,len=data.length; i<len; i+=4){
        //     let item = data[i],
        //         x = i / 4 % (sampleSize),
        //         y = ~~(i / 4 / sampleSize);
        //     // 第0个与最后一个比较，之后的都跟其前一个比较
        //     if(x === 0){
        //         let rowLastIndex = sampleSize * 4 * (y + 1) - 4;
        //         hash.set(x,y,item >= data[rowLastIndex] ? 1 : 0);
        //     }else{
        //         hash.set(x,y,item >= data[i - 4] ? 1 : 0);
        //     };
            
        //     // 增加一个纵向对比指纹，从第x=0,y=8开始记录，会增加运算量适当提高精度（注意：指纹高度需 * 2）
        //     if(y === 0){
        //         let colLastIndex = [sampleSize * sampleSize * 4] - [(sampleSize - x) * 4];
        //         hash.set(x,sampleSize + y,item >= data[colLastIndex] ? 1 : 0);
        //     }else{
        //         hash.set(x,sampleSize + y,item >= data[i - sampleSize * 4] ? 1 : 0);
        //     };
        // };
        return hash;
    }

    createCanvas(w,h){
        let obj = {};
        w = w || 0;
        h = h || 0;
        obj.dom = document.createElement('canvas');
        obj.dom.width = w;
        obj.dom.height = h;
        obj.ctx = obj.dom.getContext('2d');
        return obj;
    }

    /**
     * 获取缩放后的图片大小
     * @param img object
     */
    getScaleSize(img){
        const _ts = this,
            option = _ts.option;
        let result = {};
        _ts.scaleW =  option.sampleSize / this.img2.width,
        _ts.scaleH = option.sampleSize / this.img2.height;
        result.w = Math.round(img.width * _ts.scaleW);
        result.h = Math.round(img.height * _ts.scaleH);
        return result;
    }
}

export default SearchImg;