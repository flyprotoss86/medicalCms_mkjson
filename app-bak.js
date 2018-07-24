const catListUrl = 'http://site.bjyihuilian.com/index.php?m=content&c=index&a=lists&catid=1412&pid='
const catListSiteUrl = 'http://site.bjyihuilian.com/index.php?m=content&c=index&a=lists&catid=1546&siteid='
const catDetailUrl = 'http://site.bjyihuilian.com/index.php?m=content&c=index&a=lists&catid=1464&cid='
const itemListUrl = 'http://site.bjyihuilian.com/index.php?m=content&c=index&a=lists&catid=1413&cid='
const itemDetailUrl = 'http://site.bjyihuilian.com/index.php?m=content&c=index&a=lists&catid=1414&cid=@cid@&iid=@id@'
const siteUrl='http://site.bjyihuilian.com/index.php?m=content&c=index&a=lists&catid=1465&tab=v9_site'

/*
栏目列表
http://site.bjyihuilian.com/index.php?m=content&c=index&a=lists&catid=1412&pid=xxx
栏目详情
http://site.bjyihuilian.com/index.php?m=content&c=index&a=lists&catid=1464&cid=xxx

内容列表
http://site.bjyihuilian.com/index.php?m=content&c=index&a=lists&catid=1413&cid=xxx
内容详细接口
http://site.bjyihuilian.com/index.php?m=content&c=index&a=lists&catid=1414&cid=xxx&iid=yyy

按表查询数据库内容
http://site.bjyihuilian.com/index.php?m=content&c=index&a=lists&catid=1465&tab=xxtable

b75 3770k
x79 4960x

步骤：
  cms后台清除不用的栏目
  生成之前指定几个关键栏目：智慧医院、医普宣教、科室设置、医生栏目、几个关键的栏目详情页面
  由root根目录往下生成完所有栏目，以及每个栏目包括的内容概要（id+title），一份json
  每个内容详情单独生成json
 */
const fs = require('fs')
const path = require('path')
const {URL} = require('url')
const http = require('http')
const { spawn } = require('child_process');

const request = require('request')
const rootDir = '/users/Natalya/Desktop/workhis/medicalCms/data/'

async function initJsonData() {
    const itemTasks = []
    let sites = await getSite()
    for(let i = 0;i < sites.length && i < 1;i++){
        let site=sites[i]
        if(site.dirname === ""){
            //影音娱乐
            site.dirname = "yyyl"
        }
        const rm = spawn('rm', ['-rf', path.join(rootDir, site.dirname)])
        rm.on('close', (code) => {
            if(code === 0) {
                fs.mkdir(path.join(rootDir, site.dirname),()=>{
                    fs.mkdir(path.join(rootDir, site.dirname, 'node'),()=>{})
                    fs.mkdir(path.join(rootDir, site.dirname, 'news'),()=>{})
                })
            }
        })

        //data
        let cats = []
        try{
            cats = await getCatsBySiteid(site.siteid)
            fs.writeFile(
                path.join(rootDir, site.dirname, 'data.json'),
                JSON.stringify(cats),
                (err) => {
                    if (err)
                        console.log('write cats err, siteid: '+site.siteid)
                })
        } catch(e){
            console.log('get cats err, siteid: '+site.siteid)
        }


        //item list
        for(let j = 0; j < cats.length ; j++) {
            let cat = cats[j]
            let items = []
            try{
                items = await getItems(cat.catid, false)
                fs.writeFile(
                    path.join(rootDir, site.dirname, `node/${cat.catid}.json`),
                    JSON.stringify(items),
                    (err) => {
                        if (err)
                            console.log('write cat items err, catid: ' + cat.catid)
                    })
            } catch(e){
                console.log('get cat items err, catid: ' + cat.catid)
            }

            //item detail
            for(let k=0; k<items.length ; k++) {
                let item = items[k]
                let itemDetail = {}
                try{
                    itemDetail = await getItemDetail(cat.catid, item.id)
                    fs.writeFile(
                        path.join(rootDir, site.dirname, `news/${item.id}.json`),
                        JSON.stringify(itemDetail),
                        (err) => {
                            if (err)
                                console.log(`write item detail err, catid:${cat.catid}/itemid:${item.id}`)
                        })
                } catch(e){
                    console.log(`get item detail err, catid:${cat.catid}/itemid:${item.id}`)
                }
            }
        }

    }
}

const errlogs = []
console.clear()
initJsonData()

// getItemDetail(666,437).then(data=>{
//     console.log(data)
// },err=>{
//     console.log(err)
// })




// getCats(1364).then((data) => {
//     console.log(data)
// })
// getCatDetail(1385).then((data)=>{
//     console.log(data)
// })
// getItems(524).then(data=>{
//     console.log(data)
// })
// getItems(661).then(data=>{
//     console.log(data.length, data[0])
// })
// getItemsAll(307, data=>{
//     console.log(data.length)
// })

// getItemDetail(1323,8).then(data=>{
//     console.log(data)
// })
// getSite().then(data=>{
//     console.log(data)
// })
// getCatsBySiteid(7).then(data=>{
//     console.log(data.length, data[data.length - 2])
// })

// const lstdata=[]
// getRoot(1364 ,()=>{
//     console.log(lstdata.length)
//     console.log(JSON.stringify(lstdata))
// })


function getCats(pid) {
    return new Promise((resolve, reject)=>{
        getJSON(catListUrl+pid).then(reqData=>{
            let dataList = []
            for(k in reqData){
                let {catid,catname,image,description} = reqData[k]
                dataList.push({pid,catid,catname,image,description})
            }
            resolve(dataList)
        }, err=>{
            reject(err)
        })
    })
}
function getCatsBySiteid(siteid) {
    return new Promise((resolve, reject)=>{
        getJSON(catListSiteUrl + siteid).then(reqData=>{
            resolve(reqData)
        }, err=>{
            reject(err)
        })
    })
}
function getCatDetail(cid) {
    return new Promise((resolve, reject)=>{
        getJSON(catDetailUrl + cid).then(reqData=>{
            if(reqData.length>0){
                let {title,content,catname,image,description} = reqData[0]
                resolve({catid:cid,catname,image,description,title,content})
            } else {
                reject('no data')
            }
        },err=>{
            reject(err)
        })
    })
}
function getItems(cid, isAll = true){
    return new Promise((resolve, reject)=>{
        let url = itemListUrl + cid
        getJSON(url).then(reqData=>{
            let itemList=[]
            for(k in reqData){
                let {id,catid,title,thumb,description,updatetime} = reqData[k]
                itemList.push({id,catid,title,thumb,description,updatetime})
            }
            if(isAll)
                resolve(itemList)
            else
            // 用==，catid可能是字符串
                resolve(itemList.filter(o => o.catid == cid))
        }, err => {
            reject(err)
        })
    })
}
function getItemDetail(cid,itemid) {
    return new Promise((resolve, reject)=>{
        getJSON(itemDetailUrl.replace('@cid@',cid).replace('@id@',itemid)).then(reqData=>{
            let dataList=[]
            for(k in reqData){
                dataList.push(reqData[k])
            }
            reqData=dataList
            if(reqData.length>0){
                let {id,catid,title,thumb,description,inputtime,updatetime,content} = reqData[0]
                resolve({id,catid,title,thumb,description,inputtime,updatetime,content})
            } else {
                reject('no data')
            }
        }, err=>{
            reject(err)
        })
    })
}
function getSite(){
    return new Promise((resolve, reject)=>{
        getJSON(siteUrl).then(reqData=>{
            let dataList=[]
            for(k in reqData){
                let {siteid,name,dirname,domain} = reqData[k]
                dataList.push({siteid,name,dirname,domain})
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

// async function getRoot(rootCatId, fn) {
//     let cats = await getCats(rootCatId)
//     for(let i = 0;i < cats.length; i++){
//         let o = cats[i]
//         lstdata.push(o)
//         await getRoot(o.catid, null)
//     }
//     if(fn) {
//         fn()
//     }
// }
init
beforeCreate
created
beforeMount
mounted

