const axios = require("axios");
const cheerio = require("cheerio");
const path = require("path");
const fs = require("fs");

const INPUT_WEBSITE_URL = "https://tr.hangame.com/event/2024/01/10_blue_dragon/event.asp";
const outputDir = "./downloads/";

function queryCssUrlBywebsiteContent() {
    return new Promise(async (resolve) => {
        try {
            const { status, data } = await axios.get(INPUT_WEBSITE_URL);
            if (status === 200) {
                let result = {
                    cssUrl: '',
                    videoUrl: [],
                    imgUrl: []
                };
                const $ = cheerio.load(data);
                $('link').each((index, element) => {
                    if ($(element).attr('href').includes('event.min.css')) {
                        const cssUrl = 'https:' + $(element).attr('href');
                        result.cssUrl = cssUrl;
                    }
                });
                $('source').each((index, element) => {
                    // 输出 <video> 元素的 src 属性值
                    const videoSrc = 'https:' + $(element).attr('src');
                    result.videoUrl.push({
                        url: videoSrc,
                        imageName: videoSrc.split('/').pop(),
                        prefixDir: videoSrc.split(videoSrc.split('/').pop())[0].split('.com/')[1]
                    });
                });
                $('img').each((index, element) => {
                    // 输出 <img> 元素的 src 属性值
                    const imgSrc = $(element).attr('src');
                    result.imgUrl.push({
                        url: imgSrc,
                        imageName: imgSrc.split('/').pop(),
                        prefixDir: imgSrc.split(imgSrc.split('/').pop())[0].split('.com/')[1]
                    });
                });
                resolve(result)

            }
        } catch (error) {
            throw new Error('加载网址失败', error);
        }
    })
}

async function queryCssContent(cssUrl) {
    // 1. 获取 CSS 文件内容
    const cssResponse = await axios.get(cssUrl);
    const cssContent = cssResponse.data;

    // 2. 解析 CSS 文件内容，找到所有的 background 属性
    // const backgroundUrls = cssContent.match(/background: url\(['"]?([^'")]+)['"]?\)/gi);

    // 使用正则表达式匹配 CSS 中的 url 链接
    // const regex = /background:\s*url\(['"]?([^'"\)]+)['"]?\)/g;
    const regex = /url\(['"]?([^'"\)]+)['"]?\)/g;
    let match;
    const urls = [];

    while ((match = regex.exec(cssContent)) !== null) {
        // 去掉前面2个点 和 后面的参数
        let imageUrl = match[1].replace(/^(\.\.[/\/])+/, "").split("?")[0];
        // 去掉参数
        urls.push({
            url: cssUrl.split('css')[0] + imageUrl,
            imageName: imageUrl,
            prefixDir: cssUrl.split('com/')[1].split('css')[0]
        });
    }
    if (urls.length) {
        downloadMedia(urls);
    }
}

async function downloadMedia(urls) {
    for (const item of urls) {
        const imagePath = path.join(outputDir, item.prefixDir + item.imageName);
        console.log(imagePath);
        // 如果输出目录中不存在该文件夹，则创建
        if (!fs.existsSync(path.dirname(imagePath))) {
            // path.dirname(imagePath) => downloads\images\section02-item\ 获取目录
            fs.mkdirSync(path.dirname(imagePath), { recursive: true });
        }
        const options = {
            headers: {
                "User-Agent": "Mozilla/5.0", // 设置User-Agent头
                Accept: "*/*", // 设置Accept头
                Referer: "https://tr.hangame.com/", // 设置Referer头
            },
            responseType: "stream",
        };
        const imageResponse = await axios.get(item.url, options);
        imageResponse.data.pipe(fs.createWriteStream(imagePath));
        console.log(`Downloaded ${item.imageName}`);
    }
    console.log("All images downloaded successfully.");
}
queryCssUrlBywebsiteContent().then(async res => {
    const { cssUrl, imgUrl, videoUrl } = res;
    await queryCssContent(cssUrl);
    await downloadMedia(imgUrl);
    await downloadMedia(videoUrl);
});


