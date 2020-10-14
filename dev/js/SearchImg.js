(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) : 
	typeof define === 'function' && (define.cmd || define.hjs) ? define(function(require,exports,module){module.exports = factory()}) :
    (global.SearchImg = factory());
}(this, (function () { 'use strict';

    /**
     * 将图片数据转为灰色
     * @param {ImageData} imgData
     * @return ImageDatta
     */
    var toGray = function (imgData) {
        var data = imgData.data;
        for (var i = 0, n = data.length; i < n; i += 4) {
            var gray = parseInt((data[i] * 30 + data[i + 1] * 59 + data[i + 2] * 11) / 100);
            // let gray = parseInt((data[i] + data[i+1] + data[i+2]) / 3);
            data[i + 2] = data[i + 1] = data[i] = gray;
        }
        return imgData;
    };
    /**
     * 创建二维数组对象
     */
    var Matrix = /** @class */ (function () {
        function Matrix(row, col, val) {
            this.row = row;
            this.col = col;
            this.data = (function () {
                var result = [];
                for (var i = 0; i < col; i++) {
                    result.push(new Array(row).fill(val));
                }
                return result;
            })();
        }
        Matrix.prototype.set = function (x, y, val) {
            this.data[y][x] = val;
        };
        Matrix.prototype.get = function (x, y) {
            return this.data[y][x];
        };
        Matrix.prototype.forEach = function (fun) {
            var _ts = this, data = _ts.data;
            for (var i = 0, len = data.length; i < len; i++) {
                var item = data[i];
                for (var _i = 0, _len = item.length; _i < _len; _i++) {
                    fun.call(_ts, item[_i], { x: _i, y: i });
                }
            }
        };
        Matrix.prototype.diff = function (hash) {
            var _ts = this;
            if (_ts.row !== hash.row || _ts.col !== hash.col) {
                throw new Error('对比的指纹大小不一致');
            }
            // 遍历指纹得到相同树
            var same = (function () {
                var result = 0;
                _ts.forEach(function (item, pos) {
                    if (hash.get(pos.x, pos.y) === item) {
                        result++;
                    }
                });
                return result;
            })(), sum = _ts.row * _ts.col;
            // 返回结果
            return {
                same: same,
                notSame: sum - same,
                similar: same / (_ts.row * _ts.col)
            };
        };
        return Matrix;
    }());
    var SearchImg = /** @class */ (function () {
        function SearchImg(img1, img2, option) {
            var _ts = this;
            option = option || {};
            _ts.option = {
                sampleSize: 8,
                similarity: 0.95
            };
            for (var key in option) {
                _ts.option[key] = option[key];
            }
            _ts.img1 = img1;
            _ts.img2 = img2;
            var array2Size = _ts.option.sampleSize;
            _ts.hash = [
                new Matrix(array2Size, array2Size * 2, 0),
                new Matrix(array2Size, array2Size * 2, 0)
            ];
            _ts.domCtxObj = (function () {
                var result = [], img1ScaleSize = _ts.getScaleSize(_ts.img1), img2ScaleSize = _ts.getScaleSize(_ts.img2);
                result.push(_ts.createCanvas(img1ScaleSize.w, img1ScaleSize.h));
                result.push(_ts.createCanvas(img2ScaleSize.w, img2ScaleSize.h));
                result.forEach(function (item, index) {
                    var width = item.dom.width, height = item.dom.height, img = index === 0 ? _ts.img1 : _ts.img2;
                    // // 擦除画布
                    // item.ctx.clearRect(0,0,width,height);
                    // 绘制图片
                    item.ctx.drawImage(img, 0, 0, width, height);
                    // 褪色
                    item.ctx.putImageData(toGray(item.ctx.getImageData(0, 0, width, height)), 0, 0);
                });
                return result;
            })();
        }
        SearchImg.prototype.search = function () {
            var _ts = this, option = _ts.option, sampleSize = option.sampleSize, similarity = option.similarity;
            var result = [], dom1 = _ts.domCtxObj[0].dom, ctx1 = _ts.domCtxObj[0].ctx, data1, hash1, dom2 = _ts.domCtxObj[1].dom, ctx2 = _ts.domCtxObj[1].ctx, data2 = ctx2.getImageData(0, 0, dom2.width, dom2.height).data, hash2 = _ts.echoHash(data2, _ts.hash[1]);
            // 只生成一次指纹，用于调试
            // data1 = ctx1.getImageData(0,0,dom2.width,dom2.height).data;
            // hash1 = _ts.echoHash(data1,_ts.hash[0]);
            // let diff = hash1.diff(hash2);
            // console.log(diff,hash1);
            // return;
            for (var i = 0, len = dom1.width * dom1.height; i < len; i++) {
                var x = i % dom1.width, y = ~~(i / dom1.width);
                // 每行的最后几个像素不需要检查
                if (x >= (dom1.width - sampleSize) || y >= (dom1.height - sampleSize)) {
                    continue;
                }
                data1 = ctx1.getImageData(x, y, dom2.width, dom2.height).data;
                hash1 = _ts.echoHash(data1, _ts.hash[0]);
                // 得到对比结果
                var diff = hash1.diff(hash2);
                // 如果对比结果的相似度大于传入的相似度，则返回结果
                if (diff.similar > similarity) {
                    diff.x = x;
                    diff.y = y;
                    if (result.length === 0) {
                        result.push(diff);
                    }
                    else {
                        // 得到最后一个结果，用于判断本次相似度是否高于上次的结果
                        var last = result[result.length - 1];
                        // 当得到的结果偏移大于采样比，则说明是获取一个新的结果位置
                        if (Math.abs(x - last.x) >= sampleSize && Math.abs(y - last.y) >= sampleSize) {
                            result.push(diff);
                        }
                        // 对比相似度大于上次取到的相似度，则将上次的结果移除，并添加新的结果
                        else if (diff.similar > last.similar) {
                            result.pop();
                            result.push(diff);
                        }
                    }
                }
            }
            // 从获取的位置按其缩小比例还原真实坐标
            for (var i = 0, len = result.length; i < len; i++) {
                var item = result[i];
                item.x = Math.round(item.x / _ts.scaleW);
                item.y = Math.round(item.y / _ts.scaleH);
            }
            return result;
        };
        // 生成
        SearchImg.prototype.echoHash = function (data, hash) {
            var _ts = this, option = _ts.option;
            var sampleSize = option.sampleSize;
            // 创建样本指纹（均值hash算法）
            var mean = (function () {
                var result = 0;
                for (var i = 0, len = data.length; i < len; i += 4) {
                    result += data[i];
                }
                return result / (data.length / 4);
            })();
            for (var i = 0, len = data.length; i < len; i += 4) {
                var x = i / 4 % sampleSize, y = ~~(i / 4 / sampleSize);
                if (data[i] > mean) {
                    hash.set(x, y, 1);
                }
                else {
                    hash.set(x, y, 0);
                }
            }
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
        };
        SearchImg.prototype.createCanvas = function (w, h) {
            var obj = {};
            w = w || 0;
            h = h || 0;
            obj.dom = document.createElement('canvas');
            obj.dom.width = w;
            obj.dom.height = h;
            obj.ctx = obj.dom.getContext('2d');
            return obj;
        };
        /**
         * 获取缩放后的图片大小
         * @param img object
         */
        SearchImg.prototype.getScaleSize = function (img) {
            var _ts = this, option = _ts.option;
            var result = {};
            _ts.scaleW = option.sampleSize / this.img2.width,
                _ts.scaleH = option.sampleSize / this.img2.height;
            result.w = Math.round(img.width * _ts.scaleW);
            result.h = Math.round(img.height * _ts.scaleH);
            return result;
        };
        return SearchImg;
    }());

    return SearchImg;

})));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU2VhcmNoSW1nLmVzNiIsInNvdXJjZXMiOlsic3JjL2pzL1NlYXJjaEltZy5lczYiXSwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiDlsIblm77niYfmlbDmja7ovazkuLrngbDoibJcbiAqIEBwYXJhbSB7SW1hZ2VEYXRhfSBpbWdEYXRhIFxuICogQHJldHVybiBJbWFnZURhdHRhXG4gKi9cbmNvbnN0IHRvR3JheSA9IGltZ0RhdGEgPT4ge1xuICAgIHZhciBkYXRhID0gaW1nRGF0YS5kYXRhO1xuICAgIGZvcih2YXIgaSA9IDAsbiA9IGRhdGEubGVuZ3RoO2kgPCBuO2kgKz0gNCl7XG4gICAgICAgIGxldCBncmF5ID0gcGFyc2VJbnQoKGRhdGFbaV0gKiAzMCArIGRhdGFbaSsxXSAqIDU5ICsgZGF0YVtpKzJdICogMTEpIC8gMTAwKTtcbiAgICAgICAgLy8gbGV0IGdyYXkgPSBwYXJzZUludCgoZGF0YVtpXSArIGRhdGFbaSsxXSArIGRhdGFbaSsyXSkgLyAzKTtcbiAgICAgICAgZGF0YVtpICsgMl0gPSBkYXRhW2kgKyAxXSA9IGRhdGFbaV0gPSBncmF5O1xuICAgIH07XG4gICAgcmV0dXJuIGltZ0RhdGE7XG59O1xuXG4vKipcbiAqIOWIm+W7uuS6jOe7tOaVsOe7hOWvueixoVxuICovXG5jbGFzcyBNYXRyaXh7XG4gICAgY29uc3RydWN0b3Iocm93LGNvbCx2YWwpe1xuICAgICAgICB0aGlzLnJvdyA9IHJvdztcbiAgICAgICAgdGhpcy5jb2wgPSBjb2w7XG4gICAgICAgIHRoaXMuZGF0YSA9ICgoKT0+e1xuICAgICAgICAgICAgbGV0IHJlc3VsdCA9IFtdO1xuICAgICAgICAgICAgZm9yKGxldCBpPTA7IGk8Y29sOyBpKyspe1xuICAgICAgICAgICAgICAgIHJlc3VsdC5wdXNoKG5ldyBBcnJheShyb3cpLmZpbGwodmFsKSk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfSkoKTtcbiAgICB9XG4gICAgc2V0KHgseSx2YWwpe1xuICAgICAgICB0aGlzLmRhdGFbeV1beF0gPSB2YWw7XG4gICAgfVxuICAgIGdldCh4LHkpe1xuICAgICAgICByZXR1cm4gdGhpcy5kYXRhW3ldW3hdO1xuICAgIH1cbiAgICBmb3JFYWNoKGZ1bil7XG4gICAgICAgIGNvbnN0IF90cyA9IHRoaXMsXG4gICAgICAgICAgICBkYXRhID0gX3RzLmRhdGE7XG4gICAgICAgIGZvcihsZXQgaT0wLGxlbj1kYXRhLmxlbmd0aDsgaTxsZW47IGkrKyl7XG4gICAgICAgICAgICBsZXQgaXRlbSA9IGRhdGFbaV07XG4gICAgICAgICAgICBmb3IobGV0IF9pPTAsX2xlbj1pdGVtLmxlbmd0aDsgX2k8X2xlbjsgX2krKyl7XG4gICAgICAgICAgICAgICAgZnVuLmNhbGwoX3RzLGl0ZW1bX2ldLHt4Ol9pLHk6aX0pO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfTtcbiAgICB9XG4gICAgZGlmZihoYXNoKXtcbiAgICAgICAgY29uc3QgX3RzID0gdGhpcztcbiAgICAgICAgaWYoX3RzLnJvdyAhPT0gaGFzaC5yb3cgfHwgX3RzLmNvbCAhPT0gaGFzaC5jb2wpe1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCflr7nmr5TnmoTmjIfnurnlpKflsI/kuI3kuIDoh7QnKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyDpgY3ljobmjIfnurnlvpfliLDnm7jlkIzmoJFcbiAgICAgICAgbGV0IHNhbWUgPSAoKCk9PntcbiAgICAgICAgICAgIGxldCByZXN1bHQgPSAwO1xuICAgICAgICAgICAgX3RzLmZvckVhY2goKGl0ZW0scG9zKT0+e1xuICAgICAgICAgICAgICAgIGlmKGhhc2guZ2V0KHBvcy54LHBvcy55KSA9PT0gaXRlbSl7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdCsrO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgIH0pKCksXG4gICAgICAgIHN1bSA9IF90cy5yb3cgKiBfdHMuY29sO1xuXG4gICAgICAgIC8vIOi/lOWbnue7k+aenFxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgc2FtZTpzYW1lLFxuICAgICAgICAgICAgbm90U2FtZTpzdW0gLSBzYW1lLFxuICAgICAgICAgICAgc2ltaWxhcjpzYW1lIC8gKF90cy5yb3cgKiBfdHMuY29sKVxuICAgICAgICB9O1xuICAgIH1cbn1cblxuY2xhc3MgU2VhcmNoSW1ne1xuICAgIGNvbnN0cnVjdG9yKGltZzEsaW1nMixvcHRpb24pe1xuICAgICAgICBjb25zdCBfdHMgPSB0aGlzO1xuICAgICAgICBvcHRpb24gPSBvcHRpb24gfHwge307XG4gICAgICAgIF90cy5vcHRpb24gPSB7XG4gICAgICAgICAgICBzYW1wbGVTaXplOjgsXG4gICAgICAgICAgICBzaW1pbGFyaXR5OjAuOTVcbiAgICAgICAgfTtcbiAgICAgICAgZm9yKGxldCBrZXkgaW4gb3B0aW9uKXtcbiAgICAgICAgICAgIF90cy5vcHRpb25ba2V5XSA9IG9wdGlvbltrZXldO1xuICAgICAgICB9O1xuICAgICAgICBfdHMuaW1nMSA9IGltZzE7XG4gICAgICAgIF90cy5pbWcyID0gaW1nMjtcblxuXG4gICAgICAgIGxldCBhcnJheTJTaXplID0gX3RzLm9wdGlvbi5zYW1wbGVTaXplO1xuICAgICAgICBfdHMuaGFzaCA9IFtcbiAgICAgICAgICAgIG5ldyBNYXRyaXgoYXJyYXkyU2l6ZSxhcnJheTJTaXplICogMiwwKSxcbiAgICAgICAgICAgIG5ldyBNYXRyaXgoYXJyYXkyU2l6ZSxhcnJheTJTaXplICogMiwwKVxuICAgICAgICBdO1xuXG4gICAgICAgIF90cy5kb21DdHhPYmogPSAoKCk9PntcbiAgICAgICAgICAgIGxldCByZXN1bHQgPSBbXSxcbiAgICAgICAgICAgICAgICBpbWcxU2NhbGVTaXplID0gX3RzLmdldFNjYWxlU2l6ZShfdHMuaW1nMSksXG4gICAgICAgICAgICAgICAgaW1nMlNjYWxlU2l6ZSA9IF90cy5nZXRTY2FsZVNpemUoX3RzLmltZzIpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICByZXN1bHQucHVzaChfdHMuY3JlYXRlQ2FudmFzKGltZzFTY2FsZVNpemUudyxpbWcxU2NhbGVTaXplLmgpKTtcbiAgICAgICAgICAgIHJlc3VsdC5wdXNoKF90cy5jcmVhdGVDYW52YXMoaW1nMlNjYWxlU2l6ZS53LGltZzJTY2FsZVNpemUuaCkpO1xuXG4gICAgICAgICAgICByZXN1bHQuZm9yRWFjaCgoaXRlbSxpbmRleCkgPT4ge1xuICAgICAgICAgICAgICAgIGxldCB3aWR0aCA9IGl0ZW0uZG9tLndpZHRoLFxuICAgICAgICAgICAgICAgICAgICBoZWlnaHQgPSBpdGVtLmRvbS5oZWlnaHQsXG4gICAgICAgICAgICAgICAgICAgIGltZyA9IGluZGV4ID09PSAwID8gX3RzLmltZzEgOiBfdHMuaW1nMjtcbiAgICAgICAgICAgICAgICAvLyAvLyDmk6bpmaTnlLvluINcbiAgICAgICAgICAgICAgICAvLyBpdGVtLmN0eC5jbGVhclJlY3QoMCwwLHdpZHRoLGhlaWdodCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8g57uY5Yi25Zu+54mHXG4gICAgICAgICAgICAgICAgaXRlbS5jdHguZHJhd0ltYWdlKGltZywwLDAsd2lkdGgsaGVpZ2h0KTtcblxuICAgICAgICAgICAgICAgIC8vIOikquiJslxuICAgICAgICAgICAgICAgIGl0ZW0uY3R4LnB1dEltYWdlRGF0YShcbiAgICAgICAgICAgICAgICAgICAgdG9HcmF5KGl0ZW0uY3R4LmdldEltYWdlRGF0YSgwLDAsd2lkdGgsaGVpZ2h0KSksXG4gICAgICAgICAgICAgICAgICAgIDAsXG4gICAgICAgICAgICAgICAgICAgIDBcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICB9KSgpO1xuICAgIH1cblxuICAgIHNlYXJjaCgpe1xuICAgICAgICBjb25zdCBfdHMgPSB0aGlzLFxuICAgICAgICAgICAgb3B0aW9uID0gX3RzLm9wdGlvbixcbiAgICAgICAgICAgIHNhbXBsZVNpemUgPSBvcHRpb24uc2FtcGxlU2l6ZSxcbiAgICAgICAgICAgIHNpbWlsYXJpdHkgPSBvcHRpb24uc2ltaWxhcml0eTtcbiAgICAgICAgbGV0IHJlc3VsdCA9IFtdLFxuICAgICAgICAgICAgZG9tMSA9IF90cy5kb21DdHhPYmpbMF0uZG9tLFxuICAgICAgICAgICAgY3R4MSA9IF90cy5kb21DdHhPYmpbMF0uY3R4LFxuICAgICAgICAgICAgZGF0YTEsXG4gICAgICAgICAgICBoYXNoMSxcbiAgICAgICAgICAgIGRvbTIgPSBfdHMuZG9tQ3R4T2JqWzFdLmRvbSxcbiAgICAgICAgICAgIGN0eDIgPSBfdHMuZG9tQ3R4T2JqWzFdLmN0eCxcbiAgICAgICAgICAgIGRhdGEyID0gY3R4Mi5nZXRJbWFnZURhdGEoMCwwLGRvbTIud2lkdGgsZG9tMi5oZWlnaHQpLmRhdGEsXG4gICAgICAgICAgICBoYXNoMiA9IF90cy5lY2hvSGFzaChkYXRhMixfdHMuaGFzaFsxXSk7XG4gICAgICAgIFxuICAgICAgICAvLyDlj6rnlJ/miJDkuIDmrKHmjIfnurnvvIznlKjkuo7osIPor5VcbiAgICAgICAgLy8gZGF0YTEgPSBjdHgxLmdldEltYWdlRGF0YSgwLDAsZG9tMi53aWR0aCxkb20yLmhlaWdodCkuZGF0YTtcbiAgICAgICAgLy8gaGFzaDEgPSBfdHMuZWNob0hhc2goZGF0YTEsX3RzLmhhc2hbMF0pO1xuICAgICAgICAvLyBsZXQgZGlmZiA9IGhhc2gxLmRpZmYoaGFzaDIpO1xuICAgICAgICAvLyBjb25zb2xlLmxvZyhkaWZmLGhhc2gxKTtcbiAgICAgICAgLy8gcmV0dXJuO1xuXG4gICAgICAgIGZvcihsZXQgaT0wLGxlbj1kb20xLndpZHRoICogZG9tMS5oZWlnaHQ7IGk8bGVuOyBpKyspe1xuICAgICAgICAgICAgbGV0IHggPSBpICUgZG9tMS53aWR0aCxcbiAgICAgICAgICAgICAgICB5ID0gfn4oaSAvIGRvbTEud2lkdGgpO1xuXG4gICAgICAgICAgICAvLyDmr4/ooYznmoTmnIDlkI7lh6DkuKrlg4/ntKDkuI3pnIDopoHmo4Dmn6VcbiAgICAgICAgICAgIGlmKHggPj0gKGRvbTEud2lkdGggLSBzYW1wbGVTaXplKSB8fCB5ID49IChkb20xLmhlaWdodCAtIHNhbXBsZVNpemUpKXtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGRhdGExID0gY3R4MS5nZXRJbWFnZURhdGEoeCx5LGRvbTIud2lkdGgsZG9tMi5oZWlnaHQpLmRhdGE7XG4gICAgICAgICAgICBoYXNoMSA9IF90cy5lY2hvSGFzaChkYXRhMSxfdHMuaGFzaFswXSk7XG5cbiAgICAgICAgICAgIC8vIOW+l+WIsOWvueavlOe7k+aenFxuICAgICAgICAgICAgbGV0IGRpZmYgPSBoYXNoMS5kaWZmKGhhc2gyKTtcblxuICAgICAgICAgICAgLy8g5aaC5p6c5a+55q+U57uT5p6c55qE55u45Ly85bqm5aSn5LqO5Lyg5YWl55qE55u45Ly85bqm77yM5YiZ6L+U5Zue57uT5p6cXG4gICAgICAgICAgICBpZihkaWZmLnNpbWlsYXIgPiBzaW1pbGFyaXR5KXtcbiAgICAgICAgICAgICAgICBkaWZmLnggPSB4O1xuICAgICAgICAgICAgICAgIGRpZmYueSA9IHk7XG4gICAgICAgICAgICAgICAgaWYocmVzdWx0Lmxlbmd0aCA9PT0gMCl7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdC5wdXNoKGRpZmYpO1xuICAgICAgICAgICAgICAgIH1lbHNle1xuICAgICAgICAgICAgICAgICAgICAvLyDlvpfliLDmnIDlkI7kuIDkuKrnu5PmnpzvvIznlKjkuo7liKTmlq3mnKzmrKHnm7jkvLzluqbmmK/lkKbpq5jkuo7kuIrmrKHnmoTnu5PmnpxcbiAgICAgICAgICAgICAgICAgICAgbGV0IGxhc3QgPSByZXN1bHRbcmVzdWx0Lmxlbmd0aCAtIDFdO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIOW9k+W+l+WIsOeahOe7k+aenOWBj+enu+Wkp+S6jumHh+agt+avlO+8jOWImeivtOaYjuaYr+iOt+WPluS4gOS4quaWsOeahOe7k+aenOS9jee9rlxuICAgICAgICAgICAgICAgICAgICBpZihNYXRoLmFicyh4IC0gbGFzdC54KSA+PSBzYW1wbGVTaXplICYmIE1hdGguYWJzKHkgLSBsYXN0LnkpID49IHNhbXBsZVNpemUpe1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0LnB1c2goZGlmZik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgLy8g5a+55q+U55u45Ly85bqm5aSn5LqO5LiK5qyh5Y+W5Yiw55qE55u45Ly85bqm77yM5YiZ5bCG5LiK5qyh55qE57uT5p6c56e76Zmk77yM5bm25re75Yqg5paw55qE57uT5p6cXG4gICAgICAgICAgICAgICAgICAgIGVsc2UgaWYoZGlmZi5zaW1pbGFyID4gbGFzdC5zaW1pbGFyKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdC5wb3AoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdC5wdXNoKGRpZmYpO1xuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9OyAgIFxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIOS7juiOt+WPlueahOS9jee9ruaMieWFtue8qeWwj+avlOS+i+i/mOWOn+ecn+WunuWdkOagh1xuICAgICAgICBmb3IobGV0IGk9MCxsZW49cmVzdWx0Lmxlbmd0aDsgaTxsZW47IGkrKyl7XG4gICAgICAgICAgICBsZXQgaXRlbSA9IHJlc3VsdFtpXTtcbiAgICAgICAgICAgIGl0ZW0ueCA9IE1hdGgucm91bmQoaXRlbS54IC8gX3RzLnNjYWxlVyk7XG4gICAgICAgICAgICBpdGVtLnkgPSBNYXRoLnJvdW5kKGl0ZW0ueSAvIF90cy5zY2FsZUgpO1xuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuXG4gICAgLy8g55Sf5oiQXG4gICAgZWNob0hhc2goZGF0YSxoYXNoKXtcbiAgICAgICAgY29uc3QgX3RzID0gdGhpcyxcbiAgICAgICAgICAgIG9wdGlvbiA9IF90cy5vcHRpb247XG4gICAgICAgIGxldCBzYW1wbGVTaXplID0gb3B0aW9uLnNhbXBsZVNpemU7XG5cbiAgICAgICAgLy8g5Yib5bu65qC35pys5oyH57q577yI5Z2H5YC8aGFzaOeul+azle+8iVxuICAgICAgICBsZXQgbWVhbiA9ICgoKT0+e1xuICAgICAgICAgICAgbGV0IHJlc3VsdCA9IDA7XG4gICAgICAgICAgICBmb3IobGV0IGk9MCxsZW49ZGF0YS5sZW5ndGg7IGk8bGVuOyBpKz00KXtcbiAgICAgICAgICAgICAgICByZXN1bHQgKz0gZGF0YVtpXTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0IC8gKGRhdGEubGVuZ3RoIC8gNCk7XG4gICAgICAgIH0pKCk7XG5cbiAgICAgICAgZm9yKGxldCBpPTAsbGVuPWRhdGEubGVuZ3RoOyBpPGxlbjsgaSs9NCl7XG4gICAgICAgICAgICBsZXQgeCA9IGkgLyA0ICUgc2FtcGxlU2l6ZSxcbiAgICAgICAgICAgICAgICB5ID0gfn4oaSAvIDQgLyBzYW1wbGVTaXplKTtcbiAgICAgICAgICAgIGlmKGRhdGFbaV0gPiBtZWFuKXtcbiAgICAgICAgICAgICAgICBoYXNoLnNldCh4LHksMSk7XG4gICAgICAgICAgICB9ZWxzZXtcbiAgICAgICAgICAgICAgICBoYXNoLnNldCh4LHksMCk7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgLy8gLy8g5Yib5bu65qC35pys5oyH57q577yI5beu5byCaGFzaOeul+azle+8iVxuICAgICAgICAvLyBmb3IobGV0IGk9MCxsZW49ZGF0YS5sZW5ndGg7IGk8bGVuOyBpKz00KXtcbiAgICAgICAgLy8gICAgIGxldCBpdGVtID0gZGF0YVtpXSxcbiAgICAgICAgLy8gICAgICAgICB4ID0gaSAvIDQgJSAoc2FtcGxlU2l6ZSksXG4gICAgICAgIC8vICAgICAgICAgeSA9IH5+KGkgLyA0IC8gc2FtcGxlU2l6ZSk7XG4gICAgICAgIC8vICAgICAvLyDnrKww5Liq5LiO5pyA5ZCO5LiA5Liq5q+U6L6D77yM5LmL5ZCO55qE6YO96Lef5YW25YmN5LiA5Liq5q+U6L6DXG4gICAgICAgIC8vICAgICBpZih4ID09PSAwKXtcbiAgICAgICAgLy8gICAgICAgICBsZXQgcm93TGFzdEluZGV4ID0gc2FtcGxlU2l6ZSAqIDQgKiAoeSArIDEpIC0gNDtcbiAgICAgICAgLy8gICAgICAgICBoYXNoLnNldCh4LHksaXRlbSA+PSBkYXRhW3Jvd0xhc3RJbmRleF0gPyAxIDogMCk7XG4gICAgICAgIC8vICAgICB9ZWxzZXtcbiAgICAgICAgLy8gICAgICAgICBoYXNoLnNldCh4LHksaXRlbSA+PSBkYXRhW2kgLSA0XSA/IDEgOiAwKTtcbiAgICAgICAgLy8gICAgIH07XG4gICAgICAgICAgICBcbiAgICAgICAgLy8gICAgIC8vIOWinuWKoOS4gOS4que6teWQkeWvueavlOaMh+e6ue+8jOS7juesrHg9MCx5PTjlvIDlp4vorrDlvZXvvIzkvJrlop7liqDov5Dnrpfph4/pgILlvZPmj5Dpq5jnsr7luqbvvIjms6jmhI/vvJrmjIfnurnpq5jluqbpnIAgKiAy77yJXG4gICAgICAgIC8vICAgICBpZih5ID09PSAwKXtcbiAgICAgICAgLy8gICAgICAgICBsZXQgY29sTGFzdEluZGV4ID0gW3NhbXBsZVNpemUgKiBzYW1wbGVTaXplICogNF0gLSBbKHNhbXBsZVNpemUgLSB4KSAqIDRdO1xuICAgICAgICAvLyAgICAgICAgIGhhc2guc2V0KHgsc2FtcGxlU2l6ZSArIHksaXRlbSA+PSBkYXRhW2NvbExhc3RJbmRleF0gPyAxIDogMCk7XG4gICAgICAgIC8vICAgICB9ZWxzZXtcbiAgICAgICAgLy8gICAgICAgICBoYXNoLnNldCh4LHNhbXBsZVNpemUgKyB5LGl0ZW0gPj0gZGF0YVtpIC0gc2FtcGxlU2l6ZSAqIDRdID8gMSA6IDApO1xuICAgICAgICAvLyAgICAgfTtcbiAgICAgICAgLy8gfTtcbiAgICAgICAgcmV0dXJuIGhhc2g7XG4gICAgfVxuXG4gICAgY3JlYXRlQ2FudmFzKHcsaCl7XG4gICAgICAgIGxldCBvYmogPSB7fTtcbiAgICAgICAgdyA9IHcgfHwgMDtcbiAgICAgICAgaCA9IGggfHwgMDtcbiAgICAgICAgb2JqLmRvbSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpO1xuICAgICAgICBvYmouZG9tLndpZHRoID0gdztcbiAgICAgICAgb2JqLmRvbS5oZWlnaHQgPSBoO1xuICAgICAgICBvYmouY3R4ID0gb2JqLmRvbS5nZXRDb250ZXh0KCcyZCcpO1xuICAgICAgICByZXR1cm4gb2JqO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIOiOt+WPlue8qeaUvuWQjueahOWbvueJh+Wkp+Wwj1xuICAgICAqIEBwYXJhbSBpbWcgb2JqZWN0XG4gICAgICovXG4gICAgZ2V0U2NhbGVTaXplKGltZyl7XG4gICAgICAgIGNvbnN0IF90cyA9IHRoaXMsXG4gICAgICAgICAgICBvcHRpb24gPSBfdHMub3B0aW9uO1xuICAgICAgICBsZXQgcmVzdWx0ID0ge307XG4gICAgICAgIF90cy5zY2FsZVcgPSAgb3B0aW9uLnNhbXBsZVNpemUgLyB0aGlzLmltZzIud2lkdGgsXG4gICAgICAgIF90cy5zY2FsZUggPSBvcHRpb24uc2FtcGxlU2l6ZSAvIHRoaXMuaW1nMi5oZWlnaHQ7XG4gICAgICAgIHJlc3VsdC53ID0gTWF0aC5yb3VuZChpbWcud2lkdGggKiBfdHMuc2NhbGVXKTtcbiAgICAgICAgcmVzdWx0LmggPSBNYXRoLnJvdW5kKGltZy5oZWlnaHQgKiBfdHMuc2NhbGVIKTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IFNlYXJjaEltZzsiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0lBQUE7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