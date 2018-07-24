const fs = require('fs')
const path = require('path')
const config = require('./config')

const syncSiteList=[]
async function init(){
    //read config file
    await readConfigFile()
}

function readConfigFile(){
    return new Promise((resolve, reject)=>{
        fs.readFile(path.join(config.dataDir, 'data.json'),(err, data)=>{
            if(err){
                console.log('read file err:', err)
                reject(err)
            }
            if(data){
                let list = JSON.parse(data.toString())
                list.forEach(m=>{
                    syncSiteList.push(m)
                })
                resolve()
            }
        })
    })

}
function writeConfigFile(fn){
    fs.writeFile(
        path.join(config.dataDir, 'data.json'),
        JSON.stringify(syncSiteList),
        (err) => {
            if (err)
                console.log('write syncSiteList err :', err)
            else {
                if(fn)
                    fn()
            }
        })
}
function getSyncSitesList(){
    return syncSiteList
}
function addSyncSites(sites){
    // console.log('before',movieList)
    sites.forEach(site=>{
        let existSites = syncSiteList.filter(o => o.siteid == site.siteid)
        if(existSites.length === 1)
            existSites[0] = Object.assign(existSites[0], site)
        else
            syncSiteList.push(JSON.parse(JSON.stringify(site)))
    })

    // console.log('after',syncSiteList)
    //save to config file
    writeConfigFile()
    return syncSiteList
}
function getSyncLastTime(siteid){
    let sites = syncSiteList.filter(o => o.siteid == siteid)
    if(sites.length === 1) {
        if(sites[0].lastupdatedt)
        // return sites[0].lastupdatedt
            return '2000-1-1'
        else
            return '2000-1-1'
    } else {
        return '2000-1-1'
    }
}
function setSyncLastTime(siteid, dtstr){
    let sites = syncSiteList.filter(o => o.siteid == siteid)
    if(sites.length === 1) {
        sites[0].lastupdatedt = dtstr
    } else {
        sites.push({siteid, lastupdatedt: dtstr})
    }
    writeConfigFile()
}

module.exports = {
    init,
    getSyncSitesList,
    addSyncSites,
    getSyncLastTime,
    setSyncLastTime
}