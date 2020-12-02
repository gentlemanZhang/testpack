/**
 * 视频播放器适配
 * 主要是做移动和pc适配，
 * 中间层基于上层业务和底层播放器之间
 */
define(function(require, exports, module) {
    var client = require('./client-test.js'),
        flashPlayer = require('./flash-player.js');

    var TYPE_PLAYER_UNSUPPORTED = -1,
        TYPE_PLAYER_PC = 0,
        TYPE_PLAYER_MOBILE = 1;

    var players = [];

    var defaults = {
        width: 600,
        height: 400,
        systemId: 1002001
    };

    var videoTpl = '<video id="{id}" class="video-js vjs-default-skin vjs-big-play-centered my-skin">' +
        '<p class="vjs-no-js">To view this video please enable JavaScript, and consider upgrading to a web browser that </p>' +
        '</video>';
    var videoId = 1;

    var _slice = Array.prototype.slice;
    //转换为真正的数组
    var toArrAy = function(obj) {
        return _slice.call(obj || []);
    };
    /**
     * 获取id
     * @return number
     */
    var getVideoId = function() {
        return videoId++;
    };

    /**
     * 上层业务的函数名字和底层移动版播放器的名字不一样,需要做相关的适配
     * 为空的就是移动播放器不支持的
     * @type {Object}
     */
    var playerHooks = {
        pause: 'pause',
        play: 'play',
        dotData: '',
        addHostData: '',
        addSpeedData: '',
        playHead: '',
        volume: 'volume',
        mute: 'muted',
        clearMedia: '',
        info: '',
        nomalScreen: function() {
            if (this.isFullScreen()) {
                return this.exitFullscreen();
            }
            return this;
        },
        getTotalTime: 'duration',
        getCurrTime: 'currentTime',
        timeFunReg: '',
        delTimeFunReg: '',
        delAllTimeFunReg: '',
        endFunReg: '',
        delEndFunReg: '',
        delAllEndFunReg: ''
    };
    var emptyFn = function() {};

    /**
     * 移动版播放器的参数和pc版的不一样，需要做适配
     *
     * @param  {Object} data
     * @return {null}
     */
    var adapterData = function(data) {
        data = data || {};
        data.width = parseInt(data.videoWidth) + 'px';
        data.height = parseInt(data.videoHeight) + 'px';
        data.poster = data.serverResponse && data.serverResponse.playerData && data.serverResponse.playerData.mobileTitles && data.serverResponse.playerData.mobileTitles;
        /*data.src=data.serverResponse.playerData.pcTitles;
        ;*/
        return data;
    };

    function init(wrapId, opts) {
        var options = $.extend(true, {}, defaults, opts);
        var currPlayer;
        if (client.isPc) {
            var flashInst = flashPlayer.init(wrapId, options);

            currPlayer = new Player('pcPlayer' + options.layId, TYPE_PLAYER_PC, flashInst);
            //players.push(currPlayer);
            return currPlayer;
        }
        //检测是否加载播放器需要的相关代码
        if (!videojs || !videojs.videoXdf) {
            console.warn('videojs is undefined,player not init');
            return currPlayer;
        }
        //移动版播放器的id需要特殊处理
        var id = 'videoid' + (+new Date()) + getVideoId();
        //处理模板
        var videoHtml = videoTpl.replace('{id}', id);
        //放入容器中
        $('#' + wrapId).append($(videoHtml));
        //初始话移动播放器
        var mPlayer = videojs.videoXdf('#' + id, adapterData(opts));
        //创建中间层实例对象
        currPlayer = new Player(id, TYPE_PLAYER_MOBILE, mPlayer);
        //players.push(currPlayer);
        return currPlayer;
    }

    /**
     * 播放器对象构造
     * @param {string} id
     * @param {number} type
     * @param {player} obj
     */
    function Player(id, type, obj) {
        this.playerId = id;
        this.playType = type;
        this.playerObj = obj;
    }

    /*
     * key flash 播放器的名字
     * val 对上层业务统一暴露的名字
     * 因此要对flash 和 移动播放器参数做适配
     */
    $.each({
            'fl_pause': 'pause',
            'fl_play': 'play',
            'fl_dotData': 'dotData',
            'fl_addHostData': 'addHostData',
            'fl_addSpeedData': 'addSpeedData',
            'fl_play_head': 'playHead',
            'fl_volume': 'volume',
            'fl_mute': 'mute',
            'fl_clearMedia': 'clearMedia',
            'fl_info': 'info',
            'fl_nomalScreen': 'nomalScreen',
            'fl_getTotalTime': 'getTotalTime',
            'fl_getCurrTime': 'getCurrTime',
            'fl_timeFunReg': 'timeFunReg',
            'fl_delTimeFunReg': 'delTimeFunReg',
            'fl_delAllTimeFunReg': 'delAllTimeFunReg',
            'fl_endFunReg': 'endFunReg',
            'fl_delEndFunReg': 'delEndFunReg',
            'fl_delAllEndFunReg': 'delAllEndFunReg',
        },
        function(key, val) {

            //这里对pc版本的播放器和移动版的播放器做适配
            //--------------------pc---------------------
            if (client.isPc) {
                Player.prototype[val] = function() {
                    var fn = this.playerObj[key];
                    // $.isFunction(fn) firefox has bug
                    if ($.isFunction(fn) || typeof fn === 'function') {
                        return fn.apply(this.playerObj, toArrAy(arguments));
                    }
                };
                return;
            }

            //--------------------移动---------------------
            //移动版播放器的名字
            var mFnVal = playerHooks[val];
            //移动端不支持的函数,赋值为emptyFn
            if (!mFnVal) {
                Player.prototype[val] = emptyFn;
                return;
            }

            //移动端支持的函数
            Player.prototype[val] = function() {
                //调用钩子上的函数
                if ($.isFunction(mFnVal)) {
                    return mFnVal.apply(this.playerObj, toArrAy(arguments));
                }
                //钩子上只是函数名字，具体需要调用播放器的函数
                var fn = this.playerObj[mFnVal];
                if ($.isFunction(fn) || typeof fn === 'function') {
                    return fn.apply(this.playerObj, toArrAy(arguments));
                }
            };
        });

    module.exports = {
        init: init,
        players: players
    };
});
