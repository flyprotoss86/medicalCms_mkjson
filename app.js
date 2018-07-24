const fs = require('fs')
const path = require('path')
const download = require('download')
const request = require('request')
const child_process = require('child_process')
const spawn = child_process.spawn
const config = require('./config')
const SyncSitesData = require('./SyncSitesData')

function getMysqlTime(dtstr){
    return Math.floor(new Date(dtstr).getTime()/1000)
}
function getDtStr(dt){
    return `${dt.getFullYear()}-${dt.getMonth()+1}-${dt.getDate()} ${dt.getHours()>9?dt.getHours():'0'+dt.getHours()}:${dt.getMinutes()>9?dt.getMinutes():'0'+dt.getMinutes()}:${dt.getSeconds()>9?dt.getSeconds():'0'+dt.getSeconds()}`
}
function mkDirSync(dir){
    let dirsubs = dir.trim('/').split('/')
    let fullDir = '/'+dirsubs[0]
    let index = 1
    if(!fs.existsSync(fullDir)){
        fs.mkdirSync(fullDir)
    }
    do{
        fullDir = path.join(fullDir, dirsubs[index++])
        if(!fs.existsSync(fullDir)){
            fs.mkdirSync(fullDir)
        }
    }
    while (index < dirsubs.length)
}
//调用系统命令递归删除目录
function rmDir(dir){
    return new Promise((resolve, reject)=>{
        const rm = spawn('rm', ['-rf', dir])
        rm.on('close', (code) => {
            if(code === 0) {
                resolve(dir)
            } else {
                reject({code, dir})
            }
        })
    })
}
//调用系统命令压缩文件夹.gar.gz
function tarDir(runDir, dirname){
    return new Promise((resolve, reject)=>{
        // console.log(`t:${targetFile} -> s:${sourceDir}`)
        child_process.exec(
`cd ${runDir}
tar -zcvf ./${dirname}.tar.gz ./${dirname}` ,
            function(err, stdout , stderr ) {
                if(!err) {
                    resolve()
                } else {
                    reject(err)
                }
            })
    })
}

errDownloadUrls = []
async function handelContent(dir, content, isCnt = true) {
    return new Promise((resolve, reject)=>{
        try{
            let reg = null
            let match = null
            // remove links
            if(isCnt) {
                reg = new RegExp('<[/]?a[^>]*>')
                while(match = reg.exec(content)){
                    content = content.replace(match[0], "")
                }
            }

            // down and replace pics
            let matchCount = 0
            let downCount = 0
            let downFiles = []
            // let errCount = 0

            if(isCnt)
                reg = new RegExp("[\"'^](http:\/\/[a-z]+\.bjyihuilian\.com/)([^\"]+)(.jpg|.png)[\"'$]")
            else
                reg = new RegExp("^(http:\/\/[a-z]+\.bjyihuilian\.com/)(.+?)(.gif|.jpeg|.jpg|.png)$")

            while(match = reg.exec(content)){
                matchCount++
                // console.log(match[0], match[2])
                content = content.replace(match[0], isCnt ? `"${match[2]}${match[3]}"` : `${match[2]}${match[3]}`)

                let fileUrl = match[1]+match[2]+match[3]
                let localFile = path.join(dir, match[2]+match[3])
                let localDir = localFile.substr(0, localFile.lastIndexOf('/'))

                // console.log(match[1]+match[2], localFile)
                // console.log(match[1]+match[2])
                mkDirSync(localDir)
                downFiles.push({fileUrl, localDir})
                // request(fileUrl).pipe(fs.createWriteStream(localFile))
            }

            // console.log(downFiles)

            downFiles.forEach(file => {
                download(file.fileUrl, file.localDir).then(() => {
                        downCount++
                        console.log(file.fileUrl)
                        // console.log(`${matchCount} - ${downCount}`)
                        if(downCount === matchCount){
                            resolve(content)
                        }
                    }, (err) => {
                        downCount++
                        errDownloadUrls.push(file.fileUrl)
                        if(downCount === matchCount){
                            resolve(content)
                        }
                        // console.log(err)
                        // reject(err)
                    }
                )
            })

            if(matchCount === 0){
                resolve(content)
            }
        } catch(err){
            console.log(err)
            reject(err)
        }

    })

}
function getUpdatedCats(siteid, lastupdatedt) {
    return new Promise((resolve, reject)=>{
        let url = config.catsUpdatedUrl.replace('@siteid@',siteid).replace('@lastupdatedt@',lastupdatedt)
        getJSON(url).then(reqData=>{
            resolve(reqData)
        }, err=>{
            reject(err)
        })
    })
}
function getUpdatedItems(siteTableName, lastupdatedt){
    return new Promise((resolve, reject)=>{
        let url = config.itemsUpdatedUrl.replace('@tab@',siteTableName).replace('@lastupdatedt@',lastupdatedt)
        getJSON(url).then(reqData=>{
            resolve(reqData)
        }, err => {
            reject(err)
        })
    })
}
function getSite(siteid){
    return new Promise((resolve, reject)=>{
        getJSON(config.siteUrl).then(reqData=>{
            let dataList=[]
            let hasData = false
            for(k in reqData){
                if(siteid == reqData[k].siteid){
                    hasData = true
                    let {siteid,name,dirname,tablename} = reqData[k]
                    resolve({siteid,name,dirname,tablename})
                    break
                }
            }
            if(!hasData)
                resolve(null)
        },err=>{
            reject(err)
        })
    })
}
function getSites(){
    return new Promise((resolve, reject)=>{
        getJSON(config.siteUrl).then(reqData=>{
            let dataList=[]
            for(k in reqData){
                let {siteid,name,dirname,tablename} = reqData[k]
                dataList.push({siteid,name,dirname,tablename})
            }
            resolve(dataList)
        },err=>{
            reject(err)
        })
    })
}
function getJSON(url){
    return new Promise((resolve,reject)=>{
        request(url, {}, (err, res, body)=>{
            // console.log(body)
            if(err) {
                reject (err)
            } else {
                try{
                    resolve(JSON.parse(body))
                } catch(e){
                    console.log(body)
                    console.log(url)
                    throw e
                }

            }
            // console.log(err)
            //  console.log(res)
            // console.log(body)
        })


        // let reqData=''
        // const req = http.request(
        //     new URL(url)
        //     , (res) => {
        //         res.setEncoding('utf8')
        //         res.on('data', (chunk) => {
        //             reqData+=chunk
        //         })
        //         res.on('end', () => {
        //             try {
        //                 reqData = JSON.parse(reqData)
        //                 // resolve({code:0, data: reqData})
        //                 resolve(reqData)
        //             } catch(err) {
        //                 console.log(url, ':', reqData)
        //                 reject({ code: -1, err})
        //             }
        //         })
        //     })
        // req.on('error', function(e){
        //     reject({ code: -1, err: e})
        // })
        // req.end()
    })
}



async function getData(siteid, lastGetTime) {
    /*
    步骤：
      清除缓存目录
      获取站点列表，找到匹配医院
      获取上次同步时间
      获取栏目列表数据
      获取内容列表数据
      加工数据
      保存本次同步时间
     */
    let site = await getSite(siteid)
    if(site){

        let siteDir = path.join(config.dataDir, site.dirname)
        //get cats
        let cats = await getUpdatedCats(siteid, getMysqlTime(lastGetTime))
        if(cats && cats.length) {
            for(let i = 0; i < cats.length; i++) {
                cats[i].items = []
                if(cats[i].image){
                    let img = cats[i].image
                    img = await handelContent(siteDir, img, false)
                    cats[i].image = img
                }
                if(cats[i].content){
                    let cnt = cats[i].content
                    try{
                      cnt = await handelContent(siteDir, cnt)
                    } catch (err) {
                        console.log(err)
                    }

                    cats[i].content = cnt
                }
            }
        }
        let items = await getUpdatedItems(site.tablename, getMysqlTime(lastGetTime))
        if(items && items.length){
            for(let i = 0; i < items.length; i++) {
                if(items[i].thumb){
                    let img = items[i].thumb
                    img = await handelContent(siteDir, img, false)
                    items[i].thumb = img
                }
                if(items[i].content){
                    let cnt = items[i].content
                    cnt = await handelContent(siteDir, cnt)
                    items[i].content = cnt
                }
            }

            for(let i = 0; i < items.length; i++) {
                let itemCat = cats.filter(c=>c.catid===items[i].catid)
                if(itemCat.length > 0) {
                    itemCat = itemCat[0]
                    itemCat.items.push(items[i])
                } else {
                    let itemCat = {catid: items[i].catid, items: [items[i]]}
                    cats.push(itemCat)
                }
            }
        }
        fs.writeFile(
            path.join(config.dataDir, site.dirname, 'data.json'),
            JSON.stringify(cats),
            (err) => {
                if (err)
                    console.log('write cats err, siteid: '+site.siteid)
                else
                    console.log(`write cats success! cats:${cats.length} items:${items && items.length}`)
            })
    }
}
async function getAllData(){
    let sites = await getSites()
    SyncSitesData.addSyncSites(sites)
    for(let i = 2; i < sites.length; i++) {
        // if(sites[i].siteid == 1)
        //     continue
        let syncSiteTime = getDtStr(new Date())
        // console.log(syncSiteTime)
        console.log(SyncSitesData.getSyncLastTime(sites[i].siteid))

        await getData(sites[i].siteid, SyncSitesData.getSyncLastTime(sites[i].siteid))
        console.log('sync finish.. siteid:'+sites[i].siteid + ' save sync time:'+syncSiteTime)

        //压缩
        console.log('压缩')
        tarDir(config.dataDir, sites[i].dirname).then(
            ()=>{
            //删除
            console.log('删除文件夹' + path.join(config.dataDir, sites[i].dirname))
            rmDir(path.join(config.dataDir, sites[i].dirname))
        },(err)=>{
                console.log('压缩出错：',err)
            })

        SyncSitesData.setSyncLastTime(sites[i].siteid, syncSiteTime)
    }
    console.log('下载出错的：')
    errDownloadUrls.forEach(url=>{
        console.log(url)
    })
}
console.clear()
SyncSitesData.init()
getAllData()

// getData(9, '2000-1-1')//上海邮电

// tar zcvf /Users/natalya/Desktop/workhis/medicalCmsTest/data/xzyy.tar.gz /Users/natalya/Desktop/workhis/medicalCmsTest/data/xzyy

