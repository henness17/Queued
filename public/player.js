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