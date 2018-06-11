(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
'use strict';

var anchor;
var keys = 'protocol hostname host pathname port search hash href'.split(' ');
function _parseURL (url) {
  if (!anchor) {
    anchor = document.createElement('a');
  }

  var result = {};

  anchor.href = url || '';

  for (var i = 0, len = keys.length; i < len; i++) {
    var key = keys[i];
    result[key] = anchor[key];
  }

  return result;
}

function _appendQueryParam (url, param, value) {
  var U = _parseURL(url);
  var regex = /\?(?:.*)$/;
  var chr = regex.test(U.search) ? '&' : '?';
  var result = U.protocol + '//' +  U.host + U.port + U.pathname + U.search + chr + param + '=' + value + U.hash;

  return result;
}

function SoundCloud (clientId) {
  if (!(this instanceof SoundCloud)) {
    return new SoundCloud(clientId);
  }

  if (!clientId) {
    console.info('SoundCloud API requires clientId, get it at https://developers.soundcloud.com');
  }

  this._events = {};

  this._clientId = clientId;
  this._baseUrl = 'https://api.soundcloud.com';

  this.playing = false;
  this.duration = 0;

  this.audio = document.createElement('audio');
}

SoundCloud.prototype.resolve = function (url, callback) {
  var resolveUrl = this._baseUrl + '/resolve.json?url=' + encodeURIComponent(url) + '&client_id=' + this._clientId;

  this._json(resolveUrl, function (data) {
    this.cleanData();

    if (Array.isArray(data)) {
      var tracks = data;
      data = {tracks: tracks};
      this._playlist = data;
    } else if (data.tracks) {
      this._playlist = data;
    } else {
      this._track = data;

      // save timings
      var U = _parseURL(url);
      this._track.stream_url += U.hash;
    }

    this.duration = data.duration && !isNaN(data.duration) ?
      data.duration / 1000 : // convert to seconds
      0; // no duration is zero

    callback(data);
  }.bind(this));
};

// deprecated
SoundCloud.prototype._jsonp = function (url, callback) {
  var target = document.getElementsByTagName('script')[0] || document.head;
  var script = document.createElement('script');
  var id = 'jsonp_callback_' + (new Date()).valueOf() + Math.floor(Math.random() * 1000);

  window[id] = function (data) {
    if (script.parentNode) {
      script.parentNode.removeChild(script);
    }
    window[id] = function () {};
    callback(data);
  };

  script.src = _appendQueryParam(url, 'callback', id);
  target.parentNode.insertBefore(script, target);
};

SoundCloud.prototype._json = function (url, callback) {
  var xhr = new XMLHttpRequest();

  xhr.open('GET', url);
  xhr.onreadystatechange = function () {
    if (xhr.readyState === 4) {
      if (xhr.status === 200) {
        var resp = {};
        try {
          resp = JSON.parse(xhr.responseText);
        } catch (err) {
          // fail silently
        }
        callback(resp);
      }
    }
  };

  xhr.send(null);
};

SoundCloud.prototype.on = function (e, fn) {
  this._events[e] = fn;
  this.audio.addEventListener(e, fn, false);
};

SoundCloud.prototype.off = function (e, fn) {
  this._events[e] = null;
  this.audio.removeEventListener(e, fn);
};

SoundCloud.prototype.unbindAll = function () {
  for (var e in this._events) {
    var fn = this._events[e];
    if (fn) {
      this.off(e, fn);
    }
  }
};

SoundCloud.prototype.preload = function (streamUrl, preloadType) {
  this._track = {stream_url: streamUrl};

  if (preloadType) {
    this.audio.preload = preloadType;
  }

  this.audio.src = this._clientId ?
    _appendQueryParam(streamUrl, 'client_id', this._clientId) :
    streamUrl;
};

SoundCloud.prototype.play = function (options) {
  options = options || {};
  var src;

  if (options.streamUrl) {
    src = options.streamUrl;
  } else if (this._playlist) {
    var length = this._playlist.tracks.length;
    if (length) {
      if (options.playlistIndex === undefined) {
        this._playlistIndex = this._playlistIndex || 0;
      } else {
        this._playlistIndex = options.playlistIndex;
      }

      // be silent if index is out of range
      if (this._playlistIndex >= length || this._playlistIndex < 0) {
        this._playlistIndex = 0;
        return;
      }
      src = this._playlist.tracks[this._playlistIndex].stream_url;
    }
  } else if (this._track) {
    src = this._track.stream_url;
  }

  if (!src) {
    throw new Error('There is no tracks to play, use `streamUrl` option or `load` method');
  }

  if (this._clientId) {
    src = _appendQueryParam(src, 'client_id', this._clientId);
  }

  if (src !== this.audio.src) {
    this.audio.src = src;
  }

  this.playing = src;

  return this.audio.play();
};

SoundCloud.prototype.pause = function () {
  this.audio.pause();
  this.playing = false;
};

SoundCloud.prototype.stop = function () {
  this.audio.pause();
  this.audio.currentTime = 0;
  this.playing = false;
};

SoundCloud.prototype.next = function (options) {
  options = options || {};
  var tracksLength = this._playlist.tracks.length;

  if (this._playlistIndex >= tracksLength - 1) {
    if (options.loop) {
      this._playlistIndex = -1;
    } else {
      return;
    }
  }

  if (this._playlist && tracksLength) {
    return this.play({playlistIndex: ++this._playlistIndex});
  }
};

SoundCloud.prototype.previous = function () {
  if (this._playlistIndex <= 0) {
    return;
  }

  if (this._playlist && this._playlist.tracks.length) {
    return this.play({playlistIndex: --this._playlistIndex});
  }
};

SoundCloud.prototype.seek = function (e) {
  if (!this.audio.readyState) {
    return false;
  }

  var percent = e.offsetX / e.target.offsetWidth || (e.layerX - e.target.offsetLeft) / e.target.offsetWidth;

  this.audio.currentTime = percent * (this.audio.duration || 0);
};

SoundCloud.prototype.cleanData = function () {
  this._track = void 0;
  this._playlist = void 0;
};

SoundCloud.prototype.setVolume = function (volumePercentage) {
  if (!this.audio.readyState) {
    return;
  }

  this.audio.volume = volumePercentage;
};

SoundCloud.prototype.setTime = function (seconds) {
  if (!this.audio.readyState) {
    return;
  }

  this.audio.currentTime = seconds;
};

module.exports = SoundCloud;

},{}],2:[function(require,module,exports){
// bundle this file using 'browserify public/player.js -o public/player-bundle.js'
// to enable html file include
const SoundCloudAudio = require('soundcloud-audio');
const player = new SoundCloudAudio('aaa60081e68b473f31821b833345485f');

var currentSong;
var songQueue = [];
var currentDuration = 0;
var currentTime = 0;

player.on('ended', function () {
    skipSong();
});

player.on('timeupdate', function () {
    var timeline = document.getElementById("timeline");
    currentTime = player.audio.currentTime;
    timeline.setAttribute("max", currentDuration);
    timeline.setAttribute("value", currentTime);
});

window.emitSkip = function () {
    socket.emit('skip song');
}
window.emitPause = function () {
    socket.emit('pause song');
}
window.emitPlay = function () {
    socket.emit('play song');
}
window.emitEnqueue = function (url) {
    socket.emit('enqueue song', {
        url: url
    });
}

window.enqueueSong = function (url) {
    songQueue.push(url);
    updateQueue();
}
window.dequeueSong = function () {
    currentSong = songQueue.shift();
    updateQueue();
}

window.playSong = function () {
    player.resolve(currentSong, function (track) {
        document.getElementById("title").innerHTML = track.title;
        document.getElementById("artist").innerHTML = track.user.username;

        var artwork_url = track.artwork_url.replace("large.jpg", "t500x500.jpg");
        document.getElementById("cover").setAttribute("src", artwork_url);

        currentDuration = track.duration * .001;

        player.play();
    });
}

window.pauseSong = function () {
    player.pause();
}

window.setTime = function (time) {
    player.setTime(time);
}

window.setVolume = function (level) {
    level = level / 100;
    player.setVolume(level);
}

window.skipSong = function () {
    currentDuration = 0;
    currentTime = 0;
    if (songQueue == 0) {
        player.pause();
        currentSong = null;
        document.getElementById("title").innerHTML = "";
        document.getElementById("artist").innerHTML = "";
        document.getElementById("cover").setAttribute("src", "");
    } else {
        dequeueSong();
        playSong();
    }
}

window.updateQueue = function () {
    // Clear
    for (var i = 0; i < 4; i++) {
        document.getElementById("queue-title" + i).innerHTML = "";
        document.getElementById("queue-artist" + i).innerHTML = "";
        document.getElementById("queue-cover" + i).setAttribute("src", "");
    }

    // Update
    if (songQueue.length > 0) {
        recurseQueue(0); // Callback to ensure correct queue order
    }
}

var recurseQueue = function (index) {
    player.resolve(songQueue[index], function (track) {
        document.getElementById("queue-title" + index).innerHTML = track.title;
        document.getElementById("queue-artist" + index).innerHTML = track.user.username;

        var artwork_url = track.artwork_url.replace("large.jpg", "t500x500.jpg");
        document.getElementById("queue-cover" + index).setAttribute("src", artwork_url);
        if (index != songQueue.length - 1) {
            recurseQueue(index + 1);
        }
    });
}
},{"soundcloud-audio":1}]},{},[2]);
