function timeForLog(){
    var rightNow = new Date();
    return(`${rightNow.getDate()}/${rightNow.getMonth()+1}/${rightNow.getFullYear()} at ${rightNow.getHours()}:${rightNow.getMinutes()}:${rightNow.getSeconds()}`);
}

module.exports = timeForLog;