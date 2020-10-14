/**
 * 将图片数据转为灰色
 * @param {ImageData} imgData 
 * @return ImageDatta
 */
const toGray = imgData => {
    var data = imgData.data;
    for(var i = 0,n = data.length;i < n;i += 4){
        var gray = parseInt((data[i] + data[i+1] + data[i+2]) / 3);
        data[i + 2] = data[i + 1] = data[i] = gray;
    };
    imgData.data = data;
    return imgData;
};
export default = toGray;