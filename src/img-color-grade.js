/**
 * 函数的实现
 */
import {
    hexToRgb
} from './lib'

export default class imgColorGrade {
    constructor(imgURL,scale) {
        this.imgURL = imgURL
        this.scale = scale

        // canvas config
        this.canvas = this.getCanvasContext()
        this.canvas = this.canvas.getContext('2d')

    }
    

    getCanvasContext(width = 100, height = 100) {
        const canvas = document.createElement('canvas')
        width = width * this.scale
        height = height * this.scale
        canvas.setAttribute('width', width)
        canvas.setAttribute('height', height)
        return canvas
    }

    // 对外提供的 API
    async getColor(colorCount = 10, ignore = []) {
        const data = await this.getImageData()
        const colors = this.getImageColorCount(data.data, ignore) || []

        if (colors.length === 0) return {}

        //  添加主色与次色属性
        return {
            dominant: colors[0],
            secondary: colors[1],
            palette: colorCount ? colors.slice(0, colorCount) : colors
        }
    }

    getImageData() {
        return new Promise((resolve, reject) => {
            this.imgObj = new Image()
            this.imgObj.src = this.imgURL

            //  错误处理
            const handleError = (error = 'The image source failed to load') => reject(new Error(error))
            this.imgObj.onerror = handleError
            this.imgObj.onabort = handleError

            //  加载完成
            this.imgObj.onload = () => {
                const {
                    width,
                    height
                } = this.imgObj
                this.canvas = this.getCanvasContext(width, height)
                this.ctx = this.canvas.getContext('2d')
                this.ctx.drawImage(this.imgObj, 0, 0, width, height)

                // resolve
                resolve(this.ctx.getImageData(0, 0, width, height))
            }
        })
    }

    getImageColorCount(data, ignore = []) {
        const colorMaps = {}
        for (let i = 0; i < data.length; i += 4) {
            const alpha = data[i + 3]

            // 透明度需要忽视
            if (alpha === 0) continue

            let colorArr = Array.from(data.subarray(i, i + 3))

            // 最后的数据
            if (colorArr.indexOf(undefined) > -1) continue

            const color = alpha && alpha !== 255 ?
                `rgba(${colorArr.join()},${alpha})` : `rgb(${colorArr.join()})`


            // hex 模式的颜色更改为 rgb
            ignore = ignore.map(v => {
                if (v.slice(0, 3) !== 'rgb') {
                    return hexToRgb(v)
                }
                return v
            })

            if (ignore.indexOf(color) > -1) continue

            colorMaps[color] ? ++colorMaps[color].count : (colorMaps[color] = {
                color,
                count: 1
            })

        }

        // 降序排序
        const counts = Object.values(colorMaps)
        return counts.sort((a, b) => b.count - a.count)
    }

    // 对外开放 API，仅为浏览器中可用
    async getRenderGradient() {
        // typeof window === 'undefined' ? global : window ;
        // 通过获取最高色与最低色，然后根据占比生成 css 渐变属性
        let arr = await this.getExtremeValue()
        return this.getCSSGradientString(arr)
    }

    // 获取颜色数据中存在最多的颜色与存在最低的颜色，即数组的首尾
    async getExtremeValue() {
        // 最高值 与 最低值，前十个数据
        const colorsObj = await this.getColor(20)
        if (colorsObj.palette.length === 0) {
            throw new Error('Failed to obtain color data.')
        }

        return [colorsObj['palette'][0], colorsObj['palette'][colorsObj['palette'].length - 1]]
    }

    // 通过数据生成颜色属性字符
    getCSSGradientString(arr) {
        const rgbaGradientValues = `${arr[0].color} 0%, ${arr[1].color} 75%`
        return `background-image: -webkit-linear-gradient(135deg, ${rgbaGradientValues});background-image: linear-gradient(135deg, ${rgbaGradientValues});`
    }

    // 数据分析函数，对调色板数据分析，折线图、柱状图、圆饼图
    // node 环境 与 浏览器环境
    // node 环境：利用 nide-chart.sj 生成控制台字符串
    // 浏览器环境：利用 chart.js 生成一个 canvas，然后用户指定输入位置即可
}