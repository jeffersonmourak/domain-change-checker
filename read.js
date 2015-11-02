var read = require('read');
var Sync = require('sync');

function read(options, callback) {
    process.nextTick(function(){
        read(options, function(er, data) {
            if(er){
                callback(null, false);
            }
            else{
                callback(null,data);
            }
        })
    })
}

// Run in a fiber
Sync(function(){

    module.exports = function(options){
        return read.sync(null, options);
    }

})